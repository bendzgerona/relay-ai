#!/data/data/com.termux/files/usr/bin/bun

// src/binary-lookup.ts
import { execFileSync } from "child_process";
import { existsSync } from "fs";
function findBinaryOnPath(name, fallbackPaths, options = {}) {
  const isWindows = options.isWindows ?? process.platform === "win32";
  const exists = options.exists ?? existsSync;
  const runWhich = options.runWhich ?? ((binary, win) => execFileSync(win ? "where.exe" : "which", [binary], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }));
  try {
    const lines = runWhich(name, isWindows).trim().split("\n").map((line) => line.trim()).filter(Boolean);
    const path = (isWindows ? lines.find((line) => line.toLowerCase().endsWith(".cmd")) : null) ?? lines[0];
    if (path && (!options.verifyWhichResult || exists(path))) return path;
  } catch {
  }
  for (const path of fallbackPaths) {
    if (exists(path)) return path;
  }
  return null;
}

export {
  findBinaryOnPath
};
//# sourceMappingURL=chunk-74BCMX4U.js.map