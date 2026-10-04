// src/secrets-backend.ts — vendored secret store for the Termux/Android build.
//
// bun-only runtime, no fallback chain: secrets go straight to the `passage`
// CLI (age file store, daemon-free). passage is an APT/pkg package
// (`pkg install passage`) — not npm — and is the only secret store on Termux,
// which has no OS keychain / Secret Service daemon. Entries live at
// `<service>/<account>` (e.g. `relay-ai/provider:groq`,
// `relay-ai-server-password/server-password`).

import { spawnSync } from "node:child_process";

export type SecretBackendKind = "passage";

export interface SecretEntry {
  readonly backend: SecretBackendKind;
  getPassword(): Promise<string | null>;
  setPassword(password: string): Promise<void>;
  deletePassword(): Promise<void>;
}

function passageRun(args: string[], input?: string): { ok: boolean; out: string } {
  try {
    const r = spawnSync("passage", args, {
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return { ok: r.status === 0, out: (r.stdout as string ?? "").trim() };
  } catch {
    return { ok: false, out: "" };
  }
}

function passageAvailable(): boolean {
  return passageRun(["version"]).ok || passageRun(["list"]).ok;
}

function tryPassage(service: string, account: string): SecretEntry | null {
  if (!passageAvailable()) return null;
  const name = `${service}/${account}`;
  return {
    backend: "passage",
    getPassword: async () => {
      const r = passageRun(["show", name]);
      return r.ok && r.out ? r.out : null;
    },
    setPassword: async (password: string) => {
      const r = passageRun(["insert", "--force", "--echo", name], password);
      if (!r.ok) throw new Error(`passage insert failed for ${name}`);
    },
    deletePassword: async () => {
      passageRun(["rm", "--force", name]); // best-effort: absent entries are fine
    },
  };
}

/** passage is the only store on Termux; null means the `passage` CLI is missing. */
export async function openEntry(service: string, account: string): Promise<SecretEntry | null> {
  return tryPassage(service, account);
}

/** True when the passage CLI answers (used for capability diagnostics). */
export async function isSecretStoreAvailable(): Promise<boolean> {
  const probe = await openEntry("relay-ai-probe", "probe");
  if (!probe) return false;
  try {
    await probe.getPassword();
    return true;
  } catch {
    return false;
  }
}
