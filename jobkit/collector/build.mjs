// 수집기 빌드: collector/collect.ts → collector/dist/collect.cjs
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: [path.join(here, 'collect.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['playwright', 'playwright-core'],
  outfile: path.join(here, 'dist/collect.cjs'),
  logLevel: 'warning',
});
console.log('built collector');
