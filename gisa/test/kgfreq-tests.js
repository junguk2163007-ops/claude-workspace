// 기출 빈출 별 데이터 점검: node test/kgfreq-tests.js
'use strict';
const path = require('path');
const FILES = require('../files');
const ROOT = path.join(__dirname, '..');
[...FILES.engine, ...FILES.content].forEach((f) => require(path.join(ROOT, f)));
require(path.join(ROOT, 'app/kigeum-rules.js'));
require(path.join(ROOT, 'app/kigeum-freq.js'));
const G = globalThis.GISA;
let checks = 0;
const bad = [];
const ok = (c, m) => {
  checks++;
  if (!c) bad.push(m);
};
const f = G.kgFreq;
ok(f && f.meta && f.meta.total > 1000 && f.meta.classified > 0 && f.meta.classified <= f.meta.total, '빈도표 요약');
['em', 'power', 'machine', 'circuit'].forEach((s) => {
  ok(f.subjectTotal[s] > 100, '과목 문제 수: ' + s);
  G.concepts.filter((c) => c.subject === s).forEach((c) => ok(Number.isInteger(f.c[c.id]) && f.c[c.id] >= 0, '빈도 값 없음: ' + c.id));
});
// 단락 없는 기출 주제마다 개념 설명이 있어야 함('기타'는 제외)
require(path.join(ROOT, 'app/rest-notes.js'));
Object.values(G.kgRestTopics).forEach((list) =>
  list.forEach((t) => {
    const n = G.restNotes[t.id];
    ok(n && n.lead && Array.isArray(n.points) && n.points.length >= 4 && n.points.every((x) => x.length > 10), '주제 개념 설명 없음/부족: ' + t.id);
    ok(n && n.tips && n.tips.length >= 1, '주제 시험 포인트 없음: ' + t.id);
  })
);
Object.keys(G.restNotes).forEach((id) => ok(Object.values(G.kgRestTopics).some((l) => l.some((t) => t.id === id)), '없는 주제의 설명: ' + id));
ok(f.c['cd-volt'] === undefined, '기술기준은 기출 자료가 없어서 빈도 없음');
// 규칙 파일의 개념이 실제로 있고 정규식이 유효한지
Object.keys(G.kgRules).forEach((cid) => {
  ok(!!G.conceptMap[cid], '규칙의 개념이 없음: ' + cid);
  ok(G.kgRules[cid].s.length >= 1, '강한 말이 없음: ' + cid);
});
// 분류 예: 권수비 문제는 변압기 권수비로
const t = G.kgClassify({ s: 3, q: '변압기의 권수비가 10이고 1차 전압이 6600[V]일 때 2차 전압은?', c: ['66', '660', '6.6', '6600'] });
ok(t.indexOf('mc-tr-ratio') >= 0, '권수비 문제 분류: ' + t.join(','));
const u = G.kgClassify({ s: 4, q: '서보기구에서 직접 제어되는 제어량은 주로 어느 것인가?', c: ['전압', '전류', '위치', '속도'] });
ok(u.indexOf('ohm') < 0, '"전압·전류" 같은 흔한 말만으로 옴의 법칙에 이어지면 안 됨: ' + u.join(','));
console.log('기출 빈출 별 데이터 검사 항목 ' + checks + '개');
if (bad.length) {
  bad.slice(0, 20).forEach((b) => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('✓ 기출 빈출 별 데이터 전부 통과');
