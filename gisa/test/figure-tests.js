// 개념 그림 검증: node test/figure-tests.js
// 그림마다: 개념이 실제로 있고, SVG가 짝이 맞게 닫혀 있고, 스크립트·이벤트가 없고, 제목·설명이 있는지 확인한다.
'use strict';
const path = require('path');
const FILES = require('../files');
const ROOT = path.join(__dirname, '..');
[...FILES.engine, ...FILES.content].forEach((f) => require(path.join(ROOT, f)));
const G = globalThis.GISA;

let checks = 0;
const failures = [];
const ok = (c, m) => {
  checks++;
  if (!c) failures.push(m);
};

const ids = new Set();
G.figures.list.forEach((f) => {
  const w = '[' + f.id + '] ';
  ok(!ids.has(f.id), w + 'id 중복');
  ids.add(f.id);
  ok(!!G.conceptMap[f.concept], w + '없는 개념: ' + f.concept);
  ok(f.title && f.title.length >= 4, w + '제목이 짧음');
  ok(f.caption && f.caption.length >= 30, w + '설명이 너무 짧음');
  ok(Array.isArray(f.vb) && f.vb[0] > 100 && f.vb[1] > 80, w + 'vb 형식');
  const svg = G.figures.render(f);
  ok(/^<svg /.test(svg) && /<\/svg>$/.test(svg), w + 'svg 시작/끝');
  ok(!/<script|javascript:|\son[a-z]+\s*=|<foreignObject|<image|href=/i.test(svg), w + '허용되지 않는 요소');
  ok(/role="img"/.test(svg) && /aria-label="[^"]+"/.test(svg), w + '접근성 라벨');
  ok(!/undefined|NaN|\[object/.test(svg), w + 'undefined/NaN이 섞임');
  // 태그 짝 맞추기(자기 닫는 태그와 void 요소 제외)
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let m;
  let balanced = true;
  while ((m = re.exec(svg))) {
    if (m[4] === '/') continue;
    if (m[1] === '/') {
      if (stack.pop() !== m[2]) balanced = false;
    } else stack.push(m[2]);
  }
  ok(balanced && stack.length === 0, w + '태그 짝이 안 맞음');
  // 좌표에 NaN/Infinity 없음, 글자 안 깨짐
  ok(!/="[^"]*(NaN|Infinity)[^"]*"/.test(svg), w + '좌표 이상');
});
ok(G.figures.list.length >= 20, '그림 수 부족: ' + G.figures.list.length);

console.log('개념 그림 ' + G.figures.list.length + '개, 검사 항목 ' + checks + '개');
if (failures.length) {
  failures.slice(0, 30).forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('✓ 개념 그림 전부 통과');
