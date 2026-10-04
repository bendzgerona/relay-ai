// src/secrets-backend.ts
import { spawnSync } from "child_process";
function passageRun(args, input) {
  try {
    const r = spawnSync("passage", args, {
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"]
    });
    return { ok: r.status === 0, out: (r.stdout ?? "").trim() };
  } catch {
    return { ok: false, out: "" };
  }
}
function passageAvailable() {
  return passageRun(["version"]).ok || passageRun(["list"]).ok;
}
function tryPassage(service, account) {
  if (!passageAvailable()) return null;
  const name = `${service}/${account}`;
  return {
    backend: "passage",
    getPassword: async () => {
      const r = passageRun(["show", name]);
      return r.ok && r.out ? r.out : null;
    },
    setPassword: async (password) => {
      const r = passageRun(["insert", "--force", "--echo", name], password);
      if (!r.ok) throw new Error(`passage insert failed for ${name}`);
    },
    deletePassword: async () => {
      passageRun(["rm", "--force", name]);
    }
  };
}
async function openEntry(service, account) {
  return tryPassage(service, account);
}
async function isSecretStoreAvailable() {
  const probe = await openEntry("relay-ai-probe", "probe");
  if (!probe) return false;
  try {
    await probe.getPassword();
    return true;
  } catch {
    return false;
  }
}
export {
  isSecretStoreAvailable,
  openEntry
};
//# sourceMappingURL=secrets-backend-2HS745UB.js.map