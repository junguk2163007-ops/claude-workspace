// 전기설비기술기준 근거 문구 대조: node test/kec-verify.js <공식전문.txt>
// 문제에 쓴 수치마다 붙여 둔 근거 문구(quote)가 한국전기설비규정 공식 전문(공고 문서를 텍스트로 뽑은 것)에 실제로 있는지 확인한다.
// 공식 전문은 저작물이라 저장소에 넣지 않는다. 인자로 경로를 주면 대조하고, 없으면 건너뛴다.
'use strict';
const fs = require('fs');
const path = require('path');
const FILES = require('../files');
const ROOT = path.join(__dirname, '..');
[...FILES.engine, ...FILES.content].forEach((f) => require(path.join(ROOT, f)));
const G = globalThis.GISA;

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.log('공식 전문 파일이 없어서 근거 문구 대조를 건너뜀 (사용법: node test/kec-verify.js <전문.txt>)');
  process.exit(0);
}
// 공백과 눈에 안 보이는 글자 차이는 무시하고 대조
const norm = (s) => String(s).replace(/[\s​ ]+/g, '').replace(/[ㆍ·]/g, '·').replace(/\u2126/g, '\u03a9');
const text = norm(fs.readFileSync(file, 'utf8'));

const list = (G.codeQuotes || []).map((x) => ({ id: x.id, clause: x.clause, quote: x.quote }));
G.staticBank.forEach((it) => {
  if (it.src) list.push({ id: 'static:' + it.id, clause: it.src.clause, quote: it.src.quote });
});
let bad = 0;
const seen = new Set();
list.forEach((x) => {
  const k = x.quote;
  if (seen.has(k)) return;
  seen.add(k);
  if (!text.includes(norm(x.quote))) {
    bad++;
    console.log('  ✗ ' + x.id + ' (KEC ' + x.clause + ') 근거 문구를 전문에서 못 찾음: ' + x.quote);
  }
});
console.log('근거 문구 ' + seen.size + '개 대조, 못 찾은 것 ' + bad + '개');
if (bad) process.exit(1);
console.log('✓ 근거 문구가 모두 공식 전문과 일치');
