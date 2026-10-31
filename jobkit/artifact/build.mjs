// Artifact 빌드: src → dist/{index.html, app.js, fonts/}
// 사용법: node artifact/build.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, 'dist');
fs.mkdirSync(path.join(dist, 'fonts'), { recursive: true });

await build({
  entryPoints: [path.join(here, 'src/app.tsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  loader: { '.txt': 'text' },
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: path.join(dist, 'app.js'),
  legalComments: 'none',
  charset: 'ascii', // 한글을 \u 이스케이프로: 스크립트 인코딩 문제 방지
  logLevel: 'warning',
});

// esbuild 는 정규식 리터럴 안의 한글을 그대로 둔다 → 남은 비ASCII 문자를 \uXXXX 로 바꾼다
const jsPath = path.join(dist, 'app.js');
const js = fs.readFileSync(jsPath, 'utf8').replace(/[^\x00-\x7f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
fs.writeFileSync(jsPath, js);

fs.copyFileSync(path.join(here, 'index.html'), path.join(dist, 'index.html'));
for (const f of ['kr-Regular.ttf', 'kr-Bold.ttf']) fs.copyFileSync(path.join(here, 'fonts', f), path.join(dist, 'fonts', f));
console.log('built', (fs.statSync(path.join(dist, 'app.js')).size / 1024).toFixed(0) + 'KB');
