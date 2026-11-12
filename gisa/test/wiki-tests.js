// 용어 사전 검증: node test/wiki-tests.js
// 항목 형식, 서로 연결(related), 별칭 충돌, 예제 계산(계산기로 다시 계산), 글 속 용어 찾기 규칙.
'use strict';
const path = require('path');
const FILES = require('../files');
const ROOT = path.join(__dirname, '..');
[...FILES.engine, ...FILES.content].forEach((f) => require(path.join(ROOT, f)));
const G = globalThis.GISA;

let checks = 0;
const failures = [];
const fail = (m) => failures.push(m);
const ok = (c, m) => {
  checks++;
  if (!c) fail(m);
};

const terms = G.glossary.terms;
const conceptIds = new Set(G.concepts.map((c) => c.id));
const BAD = /undefined|NaN|\[object/;

try {
  G.glossary.build();
} catch (e) {
  fail('별칭 충돌: ' + e.message);
}

const calc = new G.Calc();
terms.forEach((t) => {
  const w = '[' + t.id + '] ';
  ok(t.name && t.name.length >= 2, w + '이름이 없음');
  ok(t.group, w + '분류(group)가 없음');
  ok(t.brief && t.brief.length >= 12, w + '한 줄 설명이 너무 짧음');
  ok(t.easy.length >= 1 && t.easy.every((s) => s.length >= 20), w + '쉬운 설명이 없거나 너무 짧음');
  ok(!t.concept || conceptIds.has(t.concept), w + '없는 개념 id: ' + t.concept);
  t.related.forEach((r) => ok(G.glossary.byId[r] && r !== t.id, w + '연결된 용어가 없음: ' + r));
  t.formulas.forEach((f) => ok(Array.isArray(f) && f.length === 2 && f[0], w + '공식 형식'));
  t.units.forEach((u) => ok(Array.isArray(u) && u.length === 2, w + '단위 형식'));
  const text = JSON.stringify(t);
  ok(!BAD.test(text), w + '글에 undefined/NaN 같은 게 섞임');
  if (t.example) {
    const e = t.example;
    ok(e.q && e.expr && typeof e.ans === 'number' && e.say, w + '예제 형식');
    try {
      calc.resetAll();
      G.calcExprKeys(e.expr, {}).concat(['=']).forEach((k) => calc.press(k));
      const got = calc.screen === 'error' ? NaN : calc.res.v.f;
      ok(Math.abs(got - e.ans) <= 1e-6 * Math.abs(e.ans) + 1e-12, w + '예제 계산이 안 맞음: ' + e.expr + ' → ' + got + ' (적은 값 ' + e.ans + ')');
    } catch (err) {
      fail(w + '예제 계산식 오류: ' + err.message);
    }
  }
});

// 모든 개념이 용어를 하나 이상 가지는지
const covered = new Set(terms.map((t) => t.concept).filter(Boolean));
const missing = [...conceptIds].filter((id) => !covered.has(id));
ok(missing.length === 0, '용어가 하나도 없는 개념: ' + missing.join(', '));

// 글 속 용어 찾기 규칙
const ids = (s, o) => G.glossary.find(s, o).map((m) => m.id);
ok(ids('역률은 0.8이야').includes('power-factor'), '조사가 붙은 용어도 찾아야 함');
ok(!ids('선간전압은 400 V').includes('voltage'), '더 긴 낱말(선간전압) 안의 "전압"은 따로 걸리면 안 됨');
ok(ids('선간전압은 400 V').includes('line-voltage'), '선간전압 용어');
ok(ids('저항 8 Ω에 48 V의 직류 전압을 걸었어').join() === 'resistance,ac-dc,voltage', '문장에서 용어 순서·종류: ' + ids('저항 8 Ω에 48 V의 직류 전압을 걸었어').join());
ok(ids('XL = ωL 이고 XC').includes('inductive-reactance') && ids('XL = ωL 이고 XC').includes('capacitive-reactance'), 'XL, XC 같은 영문 별칭');
ok(!ids('AXLE 부품').includes('inductive-reactance'), '영문 낱말 속 XL은 걸리면 안 됨');
ok(ids('전압 전압 전압', { once: true }).length === 1, 'once 옵션: 같은 용어는 한 번만');
ok(ids('유도 리액턴스를 구해').join() === 'inductive-reactance', '긴 용어가 짧은 용어(리액턴스)보다 먼저: ' + ids('유도 리액턴스를 구해').join());

console.log('용어 사전 ' + terms.length + '개, 검사 항목 ' + checks + '개');
if (failures.length) {
  console.log('\n실패 ' + failures.length + '건:');
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('✓ 용어 사전 전부 통과');
