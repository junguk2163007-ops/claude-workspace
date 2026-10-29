// 빌드: node build.js → dist/index.html (더블클릭으로 열리는 단일 파일)
//                       dist/artifact.html (claude.ai 아티팩트로 올릴 때 쓰는 본문 조각)
'use strict';
const fs = require('fs');
const path = require('path');
const FILES = require('./files');

const ROOT = __dirname;
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const TITLE = '전기기사 필기 연습장';
const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">';

const jsFiles = [...FILES.engine, ...FILES.content, ...FILES.logic, ...FILES.app];
const js = jsFiles
  .map((f) => '/* ── ' + f + ' ── */\n' + read(f))
  .join('\n')
  .replace(/<\/script/gi, '<\\/script');
const css = read(FILES.style);

const body =
  '<header class="appbar" id="bar"></header>\n' +
  '<main><div class="wrap" id="view"></div></main>\n' +
  '<noscript><p style="padding:16px">자바스크립트를 켜야 문제가 나와.</p></noscript>\n' +
  '<script>\n' + js + '\n</script>\n';

const index =
  '<!doctype html>\n<html lang="ko">\n<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
  '<meta name="apple-mobile-web-app-title" content="전기기사">\n' +
  '<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">\n' +
  '<meta name="theme-color" content="#161d24" media="(prefers-color-scheme: dark)">\n' +
  '<title>' + TITLE + '</title>\n' + FONTS + '\n<style>\n' + css + '\n</style>\n</head>\n<body>\n' + body + '</body>\n</html>\n';

const artifact =
  '<title>' + TITLE + '</title>\n' +
  '<meta name="claude:viewport-fit-sides" content="cover">\n' +
  FONTS + '\n<style>\n' + css + '\n</style>\n' + body;

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/index.html'), index);
fs.writeFileSync(path.join(ROOT, 'dist/artifact.html'), artifact);
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
console.log('dist/index.html    ' + kb(index) + '  (JS 파일 ' + jsFiles.length + '개 + CSS 합침)');
console.log('dist/artifact.html ' + kb(artifact));
