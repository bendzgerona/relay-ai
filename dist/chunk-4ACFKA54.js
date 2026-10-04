#!/data/data/com.termux/files/usr/bin/bun
import {
  findBinaryOnPath
} from "./chunk-74BCMX4U.js";
import {
  getAppPathOverride
} from "./chunk-HGNBZNEG.js";

// src/pi/launch.ts
import { execSync } from "child_process";
import spawn from "cross-spawn";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
var isWindows = process.platform === "win32";
var FALLBACK_PATHS = isWindows ? [
  join(process.env["APPDATA"] ?? homedir(), "npm", "pi.cmd"),
  join(process.env["APPDATA"] ?? homedir(), "npm", "pi"),
  join(homedir(), "AppData", "Roaming", "npm", "pi.cmd")
] : [
  join(homedir(), ".local", "bin", "pi"),
  join(homedir(), ".npm", "bin", "pi"),
  "/usr/local/bin/pi",
  "/opt/homebrew/bin/pi"
];
function findPiBinary() {
  const override = getAppPathOverride("pi");
  if (override) return existsSync(override) ? override : null;
  return findBinaryOnPath("pi", FALLBACK_PATHS);
}
function getInstalledPiVersion() {
  try {
    const piPath = findPiBinary();
    if (!piPath) return "0.1.0";
    const result = execSync(`${isWindows ? `"${piPath}"` : piPath} --version`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    const match = result.match(/(\d+\.\d+\.\d+)/);
    if (match) return match[1];
  } catch {
  }
  return "0.1.0";
}
function buildPiArgs(provider, model, extraArgs) {
  const args = ["--provider", provider, "--model", model, ...extraArgs];
  return args;
}
function launchPi(env, provider, model, extraArgs) {
  return new Promise((resolve) => {
    const piPath = findPiBinary();
    const args = buildPiArgs(provider, model, extraArgs);
    const child = spawn(piPath, args, {
      stdio: "inherit",
      env
    });
    const forward = (signal) => {
      child.kill(signal);
    };
    const onSigint = () => forward("SIGINT");
    const onSigterm = () => forward("SIGTERM");
    const onSighup = () => forward("SIGHUP");
    const cleanup = () => {
      process.off("SIGINT", onSigint);
      process.off("SIGTERM", onSigterm);
      process.off("SIGHUP", onSighup);
    };
    process.once("SIGINT", onSigint);
    process.once("SIGTERM", onSigterm);
    process.once("SIGHUP", onSighup);
    child.on("exit", (code) => {
      cleanup();
      resolve(code ?? 0);
    });
    child.on("error", (err) => {
      cleanup();
      resolve(1);
    });
  });
}

export {
  findPiBinary,
  getInstalledPiVersion,
  buildPiArgs,
  launchPi
};
//# sourceMappingURL=chunk-4ACFKA54.js.map