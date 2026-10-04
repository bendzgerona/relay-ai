// pi/launch.ts — Pi binary discovery + launch

import { execSync } from 'node:child_process';
import spawn from 'cross-spawn';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getAppPathOverride } from '../config.js';
import { findBinaryOnPath } from '../binary-lookup.js';

const isWindows = process.platform === 'win32';

const FALLBACK_PATHS = isWindows
  ? [
      join(process.env['APPDATA'] ?? homedir(), 'npm', 'pi.cmd'),
      join(process.env['APPDATA'] ?? homedir(), 'npm', 'pi'),
      join(homedir(), 'AppData', 'Roaming', 'npm', 'pi.cmd'),
    ]
  : [
      join(homedir(), '.local', 'bin', 'pi'),
      join(homedir(), '.npm', 'bin', 'pi'),
      '/usr/local/bin/pi',
      '/opt/homebrew/bin/pi',
    ];

export function findPiBinary(): string | null {
  const override = getAppPathOverride('pi');
  if (override) return existsSync(override) ? override : null;

  return findBinaryOnPath('pi', FALLBACK_PATHS);
}

export function getInstalledPiVersion(): string {
  try {
    const piPath = findPiBinary();
    if (!piPath) return '0.1.0';
    const result = execSync(`${isWindows ? `"${piPath}"` : piPath} --version`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const match = result.match(/(\d+\.\d+\.\d+)/);
    if (match) return match[1];
  } catch {
    // fallback
  }
  return '0.1.0'; // default fallback version known to work
}

export function buildPiArgs(provider: string, model: string, extraArgs: string[]): string[] {
  // Pi uses --provider and --model directly
  const args = ['--provider', provider, '--model', model, ...extraArgs];
  return args;
}

export function launchPi(
  env: NodeJS.ProcessEnv,
  provider: string,
  model: string,
  extraArgs: string[],
): Promise<number> {
  return new Promise((resolve) => {
    const piPath = findPiBinary()!;
    const args = buildPiArgs(provider, model, extraArgs);

    const child = spawn(piPath, args, {
      stdio: 'inherit',
      env,
    });

    const forward = (signal: NodeJS.Signals): void => {
      child.kill(signal);
    };

    const onSigint = () => forward('SIGINT');
    const onSigterm = () => forward('SIGTERM');
    const onSighup = () => forward('SIGHUP');
    const cleanup = () => {
      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigterm);
      process.off('SIGHUP', onSighup);
    };

    process.once('SIGINT', onSigint);
    process.once('SIGTERM', onSigterm);
    process.once('SIGHUP', onSighup);

    child.on('exit', (code) => {
      cleanup();
      resolve(code ?? 0);
    });

    child.on('error', (err) => {
      cleanup();
      resolve(1);
    });
  });
}