import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/pi/launch.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  minify: false,
  sourcemap: true,
  banner: {
    js: '#!/data/data/com.termux/files/usr/bin/bun',
  },
  external: [
    'ws',
    /^@ai-sdk\//,
    '@openrouter/ai-sdk-provider',
    'gitlab-ai-provider',
    'open',
  ],
});
