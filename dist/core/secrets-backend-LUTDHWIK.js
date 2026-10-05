// src/secrets-backend.ts
import { spawnSync } from "child_process";
function passageRun(args, input) {
  try {
    const r = spawnSync("passage", args, {
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    return {
      ok: r.status === 0,
      out: (r.stdout ?? "").trim(),
      err: (r.stderr ?? "").trim()
    };
  } catch (e) {
    return { ok: false, out: "", err: e instanceof Error ? e.message : String(e) };
  }
}
function isSecretStoreAvailable() {
  return passageRun(["version"]).ok || passageRun(["list"]).ok;
}
var Entry = class {
  service;
  account;
  constructor(service, account) {
    this.service = service;
    this.account = account;
  }
  /** passage stores entries as `<service>/<account>` path segments. */
  get name() {
    return `${this.service}/${this.account}`;
  }
  /** @returns the secret, or null when the entry does not exist. */
  getPassword() {
    if (!isSecretStoreAvailable()) {
      throw new Error("passage secret store not available");
    }
    const r = passageRun(["show", this.name]);
    if (!r.ok || !r.out) return null;
    return r.out;
  }
  setPassword(password) {
    if (!isSecretStoreAvailable()) {
      throw new Error("passage secret store not available");
    }
    const r = passageRun(["insert", "--force", "--echo", this.name], password);
    if (!r.ok) {
      throw new Error(`passage insert failed for ${this.name}${r.err ? `: ${r.err}` : ""}`);
    }
  }
  deletePassword() {
    if (!isSecretStoreAvailable()) {
      throw new Error("passage secret store not available");
    }
    passageRun(["rm", "--force", this.name]);
  }
};
export {
  Entry,
  isSecretStoreAvailable
};
//# sourceMappingURL=secrets-backend-LUTDHWIK.js.map