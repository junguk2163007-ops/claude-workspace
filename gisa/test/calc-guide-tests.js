// "계산기로 풀기" 검증: node test/calc-guide-tests.js
// 숫자로 답하는 모든 템플릿에 가이드가 있는지, 가이드의 키 순서를 실제 계산기에 눌렀을 때
// 오류 없이 문제의 정답값이 나오는지 문제마다 확인한다.
'use strict';
const path = require('path');
const FILES = require('../files');
const ROOT = path.join(__dirname, '..');
[...FILES.engine, ...FILES.content].forEach((f) => require(path.join(ROOT, f)));
const G = globalThis.GISA;

const PER = Number(process.env.NG || 600);
let checks = 0;
const failures = [];
const fail = (m) => {
  if (failures.length < 40) failures.push(m);
  else if (failures.length === 40) failures.push('… (실패가 더 있음)');
};

const missing = [];
const calc = new G.Calc();
let totalKeys = 0;

G.templateList.forEach((t) => {
  const probe = G.generate(t.id, 1);
  if (probe.answerValue === null || probe.answerValue === undefined) return; // 식으로 답하는 문제는 계산기 대상이 아님
  if (!G.calcGuides[t.id]) {
    missing.push(t.id);
    return;
  }
  let maxSteps = 0;
  for (let seed = 1; seed <= PER; seed++) {
    const q = G.generate(t.id, seed);
    let steps;
    try {
      steps = G.calcPlan(q);
    } catch (e) {
      fail(t.id + '#' + seed + ' 가이드 오류: ' + e.message);
      break;
    }
    checks++;
    if (!steps) {
      fail(t.id + '#' + seed + ' 가이드가 비어 있음');
      break;
    }
    maxSteps = Math.max(maxSteps, steps.length);
    calc.resetAll();
    let bad = null;
    steps.forEach((st, i) => {
      if (bad) return;
      if (!st.say || !st.expr) bad = '단계 ' + (i + 1) + '에 설명이나 식이 없음';
      st.keys.forEach((k) => {
        calc.press(k);
        totalKeys++;
      });
      if (calc.screen === 'error') bad = '단계 ' + (i + 1) + ' (' + st.expr + ') 계산기 오류: ' + calc.err.kind;
    });
    if (!bad) {
      const got = calc.res && calc.res.v ? calc.res.v.f : NaN;
      const want = q.answerValue;
      const tol = Math.max(1e-9 * Math.abs(want), 1e-15);
      if (!(Math.abs(got - want) <= tol)) bad = '결과 ' + got + ' ≠ 정답 ' + want + ' (' + steps.map((s) => s.expr).join(' → ') + ')';
    }
    if (bad) {
      fail(t.id + '#' + seed + ' ' + bad);
      break;
    }
  }
});

if (missing.length) fail('가이드가 없는 템플릿 ' + missing.length + '개: ' + missing.join(', '));

console.log('계산기 가이드 검사 ' + checks + '문제, 눌러 본 키 ' + totalKeys.toLocaleString() + '개');
if (failures.length) {
  console.log('\n실패 ' + failures.length + '건:');
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('✓ 계산기 가이드 전부 통과');
