// 검색 검증: node test/search-tests.js
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

// 모든 개념은 자기 이름으로, 모든 용어는 자기 이름으로 찾아져야 한다
G.concepts.forEach((c) => {
  const r = G.search(c.name);
  ok(r.concepts.some((x) => x.c.id === c.id), '개념 이름으로 못 찾음: ' + c.name);
  ok(r.concepts[0] && r.concepts[0].c.id === c.id || r.concepts.slice(0, 3).some((x) => x.c.id === c.id), '개념 이름 검색에서 위쪽에 없음: ' + c.name);
});
G.glossary.terms.forEach((t) => {
  const r = G.search(t.name);
  ok(r.terms.some((x) => x.id === t.id), '용어 이름으로 못 찾음: ' + t.name);
});

// 대표 검색어
const ids = (q) => G.search(q).concepts.map((x) => x.c.id);
ok(ids('역률').includes('ac-power'), '"역률" → 교류 전력 개념: ' + ids('역률'));
ok(ids('슬립').includes('mc-im-slip'), '"슬립" → 유도전동기 슬립: ' + ids('슬립'));
ok(ids('변압기').some((i) => i.startsWith('mc-tr')), '"변압기" → 변압기 개념: ' + ids('변압기'));
ok(G.search('임피던스').terms[0].id === 'impedance', '"임피던스" 첫 용어');
ok(G.search('kWh').terms.some((t) => t.id === 'energy'), '"kWh" → 전력량 용어');
ok(G.search('rlc 임피던스').concepts.length >= 1, '낱말 두 개(AND)로 검색');
ok(G.search('').terms.length === 0 && G.search('   ').concepts.length === 0, '빈 검색');
ok(G.search('존재하지않는말xyz').terms.length === 0 && G.search('존재하지않는말xyz').concepts.length === 0, '없는 말');

// 문제 유형(포인트)이 같이 나온다
const r = G.search('전기요금');
const hit = r.concepts.find((x) => x.c.id === 'energy');
ok(hit && hit.points.some((p) => p.ref === 'energy-cost'), '"전기요금" → 전력량 개념 + 전기요금 문제 유형');

console.log('검색 검사 항목 ' + checks + '개');
if (failures.length) {
  console.log('\n실패 ' + failures.length + '건:');
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('✓ 검색 전부 통과');
