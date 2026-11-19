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
// 매일 자동 수집(클라우드)이 패키지 설치 없이 바로 돌릴 수 있게 커밋용 사본도 만든다 (개인정보 없음)
import fs from 'node:fs';
fs.mkdirSync(path.join(here, 'bin'), { recursive: true });
fs.copyFileSync(path.join(here, 'dist/collect.cjs'), path.join(here, 'bin/collect.cjs'));
console.log('built collector');
