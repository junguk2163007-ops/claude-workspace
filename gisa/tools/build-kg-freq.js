// 기출 빈출 빈도표 만들기: node tools/build-kg-freq.js <기출 JSON 경로>
// 가져온 기출 문제(내 보관함 JSON)를 개념에 이어 붙여서 개념마다 몇 문제가 나왔는지 세고 app/kigeum-freq.js 를 만든다.
// 결과 파일에는 문제 글이 들어가지 않고 개수만 들어간다.
'use strict';
const fs = require('fs');
const path = require('path');
const FILES = require('../files');
const ROOT = path.join(__dirname, '..');
[...FILES.engine, ...FILES.content].forEach((f) => require(path.join(ROOT, f)));
require(path.join(ROOT, 'app/kigeum-rules.js'));
const G = globalThis.GISA;

const file = process.argv[2];
if (!file) {
  console.log('사용법: node tools/build-kg-freq.js <기출 JSON 경로>');
  process.exit(1);
}
const bank = JSON.parse(fs.readFileSync(file, 'utf8'));
const SK = { 1: 'em', 2: 'power', 3: 'machine', 4: 'circuit' };
const total = {};
const count = {};
let classified = 0;
let y0 = 9999;
let y1 = 0;
bank.forEach((x) => {
  const s = SK[x.s];
  if (!s) return;
  total[s] = (total[s] || 0) + 1;
  const cids = G.kgClassify(x);
  if (cids.length) classified++;
  cids.forEach((c) => (count[c] = (count[c] || 0) + 1));
  const y = Number(String(x.exam).slice(0, 4));
  if (y) {
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
});
const c = {};
G.concepts.forEach((k) => {
  if (total[k.subject]) c[k.id] = count[k.id] || 0;
});
const body = JSON.stringify({ meta: { total: bank.length, classified, from: y0, to: y1 }, subjectTotal: total, c }, null, 2).split('\n').join('\n  ');
const out = [
  '// 기출 빈출 빈도(자동 생성: node tools/build-kg-freq.js <기출 JSON>). 개념마다 기출에서 몇 문제가 이어졌는지 개수만 담았다.',
  '(function (G) {',
  "  'use strict';",
  '  G.kgFreq = ' + body + ';',
  '})(globalThis.GISA);',
  '',
].join('\n');
fs.writeFileSync(path.join(ROOT, 'app/kigeum-freq.js'), out);
console.log('기출 ' + bank.length + '문제 중 개념에 이어진 문제 ' + classified + '개 → app/kigeum-freq.js');
