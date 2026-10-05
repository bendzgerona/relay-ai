#!/usr/bin/env bun
/**
 * scripts/patch-napi-keyring.mjs
 *
 * Programmatic, idempotent patcher that rewrites `@napi-rs/keyring` module
 * specifiers to the in-repo, passage-backed `src/secrets-backend.ts` shim and
 * strips the native addon from package.json dependencies.
 *
 * Why this exists
 * ---------------
 * relay-ai targets pure Bun (>=1.4) on Termux with no NAPI native addons.
 * `@napi-rs/keyring` ships a native keytar binding that cannot load under
 * pure Bun (and Bun.secrets relies on a D-Bus Secret Service daemon that isn't
 * running on Android/Termux). `passage` (the 1Password age-backed password
 * store) is the only secret store available here.
 *
 * Instead of hand-editing every upstream sync, this script rewrites the import
 * specifiers automatically so the build is always pure-Bun / passage-backed,
 * and removes the addon from package.json if an upstream merge re-introduces it.
 *
 * Usage
 * -----
 *   bun scripts/patch-napi-keyring.mjs apply   # rewrite specifiers + strip dep
 *   bun scripts/patch-napi-keyring.mjs check   # verify clean; exits 1 if not
 *
 * Wired into `build` (pre-step), `patch:keyring`, and `.githooks/post-merge`
 * so every build and every upstream pull self-heals.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const target = join(root, 'src', 'secrets-backend.ts');
const PKG = join(root, 'package.json');

const mode = process.argv[2] === 'check' ? 'check' : 'apply';

const PKG_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

// Match @napi-rs/keyring when it appears as a module specifier:
//   import('@napi-rs/keyring')   dynamic import
//   from '@napi-rs/keyring'     static import
//   vi.mock('@napi-rs/keyring')  vitest mock
// Deliberately does NOT match the string inside Error messages such as
//   new Error("Cannot find module '@napi-rs/keyring'")
// which is a classifier test input, not a real import.
const specifiers = [
  { re: /(import\(\s*['"])@napi-rs\/keyring/g },
  { re: /(from\s+['"])@napi-rs\/keyring/g },
  { re: /(vi\.mock\(\s*['"])@napi-rs\/keyring/g },
];

function relImport(filePath) {
  const dir = dirname(filePath);
  let rel = relative(dir, target).replace(/\.(ts|mjs|js)$/, '');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel + '.js';
}

function walkFiles(dir, acc) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    const p = join(dir, name);
    const st = statSync(p, { throwIfNoError: false });
    if (!st) continue;
    if (st.isDirectory()) walkFiles(p, acc);
    else if (st.isFile() && (p.endsWith('.ts') || p.endsWith('.mjs'))) acc.push(p);
  }
  return acc;
}

function patch(content, rel) {
  let changed = false;
  for (const { re } of specifiers) {
    const before = content;
    content = content.replace(re, (m, p1) => `${p1}${rel}`);
    if (content !== before) changed = true;
  }
  return { content, changed };
}

/** Remove @napi-rs/keyring from package.json dependency maps. Returns true if it changed anything. */
function stripNapiKeyringFromPackageJson() {
  let pkg;
  try { pkg = JSON.parse(readFileSync(PKG, 'utf8')); } catch { return false; }
  let changed = false;
  for (const section of PKG_SECTIONS) {
    if (pkg[section] && typeof pkg[section] === 'object' && '@napi-rs/keyring' in pkg[section]) {
      delete pkg[section]['@napi-rs/keyring'];
      changed = true;
    }
  }
  if (!changed) return false;
  writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log('patched: package.json — removed @napi-rs/keyring dependency');
  return true;
}

function packageJsonHasNapiKeyring() {
  let pkg;
  try { pkg = JSON.parse(readFileSync(PKG, 'utf8')); } catch { return false; }
  return PKG_SECTIONS.some(s => pkg[s] && '@napi-rs/keyring' in pkg[s]);
}

const files = [
  ...walkFiles(join(root, 'src'), []),
  ...walkFiles(join(root, 'tests'), []),
];

let dirty = 0;
const offenders = [];
for (const file of files) {
  const rel = relImport(file);
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  const { content: next, changed } = patch(content, rel);
  if (!changed) continue;
  if (mode === 'apply') {
    writeFileSync(file, next, 'utf8');
    dirty += 1;
    console.log(`patched: ${relative(root, file)} -> ${rel}`);
  } else {
    offenders.push(relative(root, file));
  }
}

if (mode === 'apply') {
  if (stripNapiKeyringFromPackageJson()) dirty += 1;
  if (dirty === 0) {
    console.log('OK: no @napi-rs/keyring specifiers to rewrite and no package.json dependency (already patched).');
  } else {
    console.log(`OK: applied ${dirty} @napi-rs/keyring patch(es).`);
  }
} else {
  if (offenders.length) {
    console.error('ERROR: @napi-rs/keyring specifiers still present:');
    for (const f of offenders) console.error(`  ${f}`);
    process.exit(1);
  }
  if (packageJsonHasNapiKeyring()) {
    console.error('ERROR: @napi-rs/keyring still declared in package.json dependencies.');
    process.exit(1);
  }
  console.log('OK: no @napi-rs/keyring specifiers remain in src/ or tests/, and package.json is clean.');
}
