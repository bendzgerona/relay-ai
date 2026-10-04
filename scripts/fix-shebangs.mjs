// Rewrite #!/usr/bin/... shebangs in dist/ to $PREFIX after a tsup build.
//
// tsup.config.ts pins the banner to the DIRECT Termux bun path
// (#!/data/data/com.termux/files/usr/bin/bun) — this vendored build is
// Termux/Android-only and bun-only (no portability wanted), so direct exec
// and `bun dist/cli.js` both run bun with no env PATH lookup. rewriteShebangLine
// no-ops on that line (it already starts with #!$PREFIX/), so the rebuild is
// idempotent.
//
// This script is KEPT as a post-build step so a future SDK/runtime change
// (e.g. switching the banner back to /usr/bin/env style, or node for speed)
// is handled centrally — one line in tsup.config.ts + this transform, no
// one-off edits. It still catches any stray /usr/bin/... shebang tsup emits.
//
// The transform is a pure prefix replacement (same rule as termux-fix-shebang):
//   #!/usr/bin/env node  ->  #!$PREFIX/bin/env node
// It must NOT try to isolate the binary and re-append it — that turns
// "env node" into "env env node".
//
// No-ops everywhere /usr/bin/env exists, so it never affects CI, other
// platforms, or the published artifact.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PREFIX = '/data/data/com.termux/files/usr';

/**
 * Rewrite one shebang line to use $PREFIX/bin instead of /usr/bin (or /bin).
 * Returns null when the line is not a shebang or is already Termux-native,
 * so callers can skip it without touching the file.
 */
export function rewriteShebangLine(line, prefix = DEFAULT_PREFIX) {
  if (!line.startsWith('#!')) return null;
  if (line.startsWith(`#!${prefix}/`)) return null;
  const match = /^#!(.*)\/[sx]?bin\/(.*)$/.exec(line);
  if (!match) return null;
  return `#!${join(prefix, 'bin')}/${match[2]}`;
}

function main() {
  const prefix = process.env.PREFIX ?? DEFAULT_PREFIX;

  // Non-Termux (or Termux with /usr/bin/env hole-punched): nothing to do.
  if (existsSync('/usr/bin/env')) return;

  const envBin = join(prefix, 'bin', 'env');
  if (!existsSync(envBin)) {
    console.error(`fix-shebangs: neither /usr/bin/env nor ${envBin} exists; skipping`);
    return;
  }

  const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

  function* walk(dir) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const st = statSync(path);
      if (st.isDirectory()) yield* walk(path);
    // 100MB cap: large enough for every tsup chunk (largest ~5.5MB, which still
    // carries the shebang banner). Do NOT tighten it — a low cap silently drops
    // whole artifacts from the rebuild-time rewrite, which is exactly how a
    // 5.5MB chunk shipped with #!/usr/bin/env under the old 1MB cap.
    else if (st.isFile() && st.size < 100 * 1024 * 1024) yield path;
    }
  }

  let fixed = 0;
  for (const file of walk(dist)) {
    const text = readFileSync(file, 'utf8');
    const firstNewline = text.indexOf('\n');
    if (firstNewline < 0) continue;
    const firstLine = text.slice(0, firstNewline);

    const rewritten = rewriteShebangLine(firstLine, prefix);
    if (rewritten === null) continue;

    writeFileSync(file, rewritten + text.slice(firstNewline));
    console.log(`fix-shebangs: ${file}\n  ${firstLine}\n  -> ${rewritten}`);
    fixed += 1;
  }

  console.log(`fix-shebangs: ${fixed} file(s) rewritten in dist/`);
}

// Only run when executed directly, not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
