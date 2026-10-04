import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { rewriteShebangLine } from "../scripts/fix-shebangs.mjs";

const PREFIX = process.env.PREFIX ?? "/data/data/com.termux/files/usr";
const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

describe("rewriteShebangLine", () => {
	it("rewrites /usr/bin/env to the Termux prefix", () => {
		expect(rewriteShebangLine("#!/usr/bin/env node", PREFIX)).toBe(
			`#!${PREFIX}/bin/env node`,
		);
	});

	it('does NOT duplicate env (regression: "env env node")', () => {
		const out = rewriteShebangLine("#!/usr/bin/env node", PREFIX);
		expect(out).not.toBeNull();
		expect(out).not.toContain("env env");
		expect((out ?? "").split("env").length - 1).toBe(1);
	});

	it("rewrites bare /bin/ interpreters", () => {
		expect(rewriteShebangLine("#!/bin/sh", PREFIX)).toBe(`#!${PREFIX}/bin/sh`);
		expect(rewriteShebangLine("#!/bin/bash -euo pipefail", PREFIX)).toBe(
			`#!${PREFIX}/bin/bash -euo pipefail`,
		);
	});

	it("rewrites /usr/bin/ interpreters without env", () => {
		expect(rewriteShebangLine("#!/usr/bin/node", PREFIX)).toBe(
			`#!${PREFIX}/bin/node`,
		);
	});

	it("is idempotent — an already-native shebang is left alone", () => {
		const native = `#!${PREFIX}/bin/env node`;
		expect(rewriteShebangLine(native, PREFIX)).toBeNull();
	});

	it("returns null for non-shebang lines", () => {
		expect(rewriteShebangLine('<p align="center">', PREFIX)).toBeNull();
		expect(rewriteShebangLine("", PREFIX)).toBeNull();
	});

	it("returns null for shebangs that do not target a *bin/ dir", () => {
		expect(rewriteShebangLine("#!/home/runner/tool/run.sh", PREFIX)).toBeNull();
	});

	it("rewrites a >1MB chunk carrying the banner", () => {
		// Regression: tsup writes the banner into every output chunk, and the
		// largest one is ~5.5MB. A walker capped at 1MB silently excluded it, so
		// it shipped with #!/usr/bin/env and direct execution failed on Termux.
		expect(rewriteShebangLine("#!/usr/bin/env node", PREFIX)).toBe(
			`#!${PREFIX}/bin/env node`,
		);
	});
});

describe("built CLI artifact", () => {
	it("dist/cli.js shebang resolves to an existing interpreter", () => {
		const cli = join(root, "dist", "cli.js");
		if (!existsSync(cli)) return; // not built yet — build script covers it
		const first = readFileSync(cli, "utf8").split("\n", 1)[0];
		expect(first.startsWith("#!")).toBe(true);
		const interpreter = first.slice(2).split(" ")[0];
		// On Termux /usr/bin/env does not exist; the post-build step must have
		// rewritten it. On other platforms /usr/bin/env exists natively.
		expect(existsSync(interpreter)).toBe(true);
	});

	it("every oversized dist file carrying a shebang was rewritten", () => {
		const dist = join(root, "dist");
		if (!existsSync(dist)) return;
		for (const name of readdirSync(dist)) {
			const path = join(dist, name);
			const st = statSync(path);
			if (!st.isFile() || st.size <= 1_048_576) continue;
			const first = readFileSync(path, "utf8").split("\n", 1)[0];
			if (!first.startsWith("#!")) continue;
			const interpreter = first.slice(2).split(" ")[0];
			expect(
				existsSync(interpreter),
				`${name} is >1MB, carries a shebang, and its interpreter does not exist — ` +
					`the walker size cap excluded it from the post-build rewrite`,
			).toBe(true);
		}
	});
});
