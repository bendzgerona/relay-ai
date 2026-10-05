// src/secrets-backend.ts — vendored secret store for the pure-Bun/Termux build.
//
// relay-ai targets Bun (>=1.4) with no NAPI native addons. @napi-rs/keyring
// ships a native keytar binding that cannot load under pure Bun, and Bun.secrets
// relies on a D-Bus Secret Service daemon that isn't running on Android/Termux.
// `passage` (the 1Password age-backed password-store, `pkg install passage`)
// is the only secret store available here.
//
// The `Entry` class below mirrors @napi-rs/keyring's *synchronous* API
// (new Entry(service, account).getPassword/setPassword/deletePassword), so a
// specifier rewrite from `@napi-rs/keyring` to `./secrets-backend.js` is the
// only change required to swap the backend. `scripts/patch-napi-keyring.mjs`
// applies that rewrite automatically after every upstream sync.

import { spawnSync } from 'node:child_process';

export type SecretBackendKind = 'passage';

interface SpawnResult {
  ok: boolean;
  out: string;
  err: string;
}

function passageRun(args: string[], input?: string): SpawnResult {
  try {
    const r = spawnSync('passage', args, {
      input,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      ok: r.status === 0,
      out: (r.stdout ?? '').trim(),
      err: (r.stderr ?? '').trim(),
    };
  } catch (e) {
    return { ok: false, out: '', err: e instanceof Error ? e.message : String(e) };
  }
}

export function isSecretStoreAvailable(): boolean {
  return passageRun(['version']).ok || passageRun(['list']).ok;
}

/** @napi-rs/keyring-compatible Entry — backed by the passage CLI. */
export class Entry {
  readonly service: string;
  readonly account: string;

  constructor(service: string, account: string) {
    this.service = service;
    this.account = account;
  }

  /** passage stores entries as `<service>/<account>` path segments. */
  private get name(): string {
    return `${this.service}/${this.account}`;
  }

  /** @returns the secret, or null when the entry does not exist. */
  getPassword(): string | null {
    if (!isSecretStoreAvailable()) {
      throw new Error('passage secret store not available');
    }
    const r = passageRun(['show', this.name]);
    if (!r.ok || !r.out) return null;
    return r.out;
  }

  setPassword(password: string): void {
    if (!isSecretStoreAvailable()) {
      throw new Error('passage secret store not available');
    }
    const r = passageRun(['insert', '--force', '--echo', this.name], password);
    if (!r.ok) {
      throw new Error(`passage insert failed for ${this.name}${r.err ? `: ${r.err}` : ''}`);
    }
  }

  deletePassword(): void {
    if (!isSecretStoreAvailable()) {
      throw new Error('passage secret store not available');
    }
    // Best-effort: `--force` suppresses errors for absent entries.
    passageRun(['rm', '--force', this.name]);
  }
}
