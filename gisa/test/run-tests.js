// 전체 검증: node test/run-tests.js
// 1) 템플릿마다 3000문제 생성 → 보기·정답·해설·재현성 검사 + 독립 검산기와 정답 비교
// 2) 개념 데이터·정적 문제은행·학습 기록 로직 검사
'use strict';
const path = require('path');
const FILES = require('../files');
const REF = require('./reference');

const ROOT = path.join(__dirname, '..');
[...FILES.engine, ...FILES.content, ...FILES.logic].forEach((f) => require(path.join(ROOT, f)));
const G = globalThis.GISA;

const PER_TEMPLATE = Number(process.env.N || 3000);
const failures = [];
let checks = 0;

function fail(where, msg) {
  if (failures.length < 60) failures.push(where + ' → ' + msg);
  else if (failures.length === 60) failures.push('… (실패가 더 있음)');
}
function ok(cond, where, msg) {
  checks++;
  if (!cond) fail(where, msg);
}
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
const BAD_TEXT = /undefined|NaN|Infinity|\[object/;

function allText(q) {
  return [
    q.text, q.svg, q.hints.card, q.hints.formula,
    q.explain.conclusion, q.explain.card, q.explain.analogy,
    ...q.explain.steps, ...q.explain.traps,
    ...q.choices.map((c) => c.label + ' ' + c.why),
  ].join('\n');
}

// 모든 문제(템플릿·정적)에 공통으로 적용하는 검사
function checkQuestion(q, where) {
  ok(Array.isArray(q.choices) && q.choices.length === 4, where, '보기가 4개가 아님');
  const labels = q.choices.map((c) => c.label);
  ok(new Set(labels).size === labels.length, where, '보기 중복: ' + labels.join(' / '));
  ok(q.choices.filter((c) => c.correct).length === 1, where, '정답 개수가 1이 아님');
  ok(q.answerIndex >= 0 && q.choices[q.answerIndex].correct, where, 'answerIndex 불일치');
  q.choices.forEach((c, i) => {
    ok(nonEmpty(c.label), where, '보기 ' + i + ' 글자 없음');
    ok(!/^0(\s|$)/.test(c.label), where, '0으로 보이는 보기: ' + c.label);
    ok(nonEmpty(c.why), where, (c.correct ? '정답' : '오답') + ' 보기 ' + i + ' 해설(why) 없음');
  });
  ok(nonEmpty(q.text), where, '문제 글 없음');
  ok(nonEmpty(q.hints.card) && nonEmpty(q.hints.formula), where, '힌트 비어 있음');
  const e = q.explain;
  ok(nonEmpty(e.conclusion), where, '한 줄 결론 없음');
  ok(nonEmpty(e.card) && nonEmpty(e.analogy), where, '개념 카드/비유 없음');
  ok(Array.isArray(e.steps) && e.steps.length >= 2 && e.steps.every(nonEmpty), where, '풀이 단계 부족');
  ok(e.steps.some((s) => s.startsWith('검산: ')), where, '검산 단계 없음');
  ok(Array.isArray(e.traps) && e.traps.length >= 1 && e.traps.every(nonEmpty), where, '함정/기억할 점 없음');
  ok(!BAD_TEXT.test(allText(q)), where, '글에 undefined/NaN/Infinity: ' + (allText(q).match(BAD_TEXT) || [''])[0]);
  ok(!!G.conceptMap[q.conceptId], where, '모르는 개념 태그');
  ok(q.subject !== 'code', where, '전기설비기술기준 문제가 들어 있음');
}

// ───────── 1. 템플릿 ─────────
const t0 = Date.now();
const perConcept = {};
for (const t of G.templateList) {
  const ref = REF[t.id];
  ok(typeof ref === 'function', t.id, '독립 검산기 없음');
  let generated = 0;
  for (let seed = 1; seed <= PER_TEMPLATE; seed++) {
    const where = t.id + '#' + seed;
    let q;
    try {
      q = G.generate(t.id, seed);
    } catch (err) {
      fail(where, '생성 예외: ' + err.message);
      continue;
    }
    generated++;
    checkQuestion(q, where);
    ok(q.key === 't:' + t.id + '#' + seed, where, '문제 키 형식');

    // 재현성: 같은 시드 → 완전히 같은 문제
    const again = G.generate(t.id, seed);
    ok(JSON.stringify(again) === JSON.stringify(q), where, '같은 시드인데 문제가 다름');
    if (seed % 97 === 0) ok(JSON.stringify(G.fromKey(q.key)) === JSON.stringify(q), where, '문제 번호로 재생성 불일치');

    const correct = q.choices[q.answerIndex];
    ok(q.explain.conclusion.includes(correct.label), where, '결론에 정답 표기가 없음: ' + correct.label);

    if (q.kind === 'expr') {
      const keys = q.choices.map((c) => c.key);
      ok(keys.every(Boolean) && new Set(keys).size === 4, where, '수식 보기 동치 중복');
      if (ref) ok(G.choices.exprKey(ref(q.params)) === correct.key, where, '검산기와 정답 수식 불일치: ' + correct.label);
    } else {
      const vals = q.choices.map((c) => c.value);
      ok(vals.every((v) => typeof v === 'number' && isFinite(v) && v > 0), where, '유한한 양수가 아닌 값: ' + vals.join(', '));
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++)
          ok(Math.abs(vals[i] - vals[j]) / Math.max(vals[i], vals[j]) >= q.minGap, where, '값이 너무 가까운 보기: ' + vals[i] + ', ' + vals[j]);
      if (ref) {
        const expect = ref(q.params);
        ok(Math.abs(expect - correct.value) <= 1e-6 * Math.max(1, Math.abs(expect)), where, '검산기 ' + expect + ' ≠ 정답 ' + correct.value);
        // 오답 보기가 우연히 정답과 같은 값이 되면 안 됨
        q.choices.forEach((c) => {
          if (!c.correct) ok(Math.abs(c.value - expect) / expect >= q.minGap, where, '오답이 정답과 같은 값: ' + c.label);
        });
      }
    }
  }
  perConcept[t.concept] = (perConcept[t.concept] || 0) + generated;
}
const genMs = Date.now() - t0;

// ───────── 2. 개념 데이터 ─────────
const ids = new Set(G.concepts.map((c) => c.id));
ok(ids.size === G.concepts.length, 'concepts', '개념 id 중복');
G.concepts.forEach((c) => {
  const w = 'concept:' + c.id;
  ok(nonEmpty(c.name) && nonEmpty(c.card) && nonEmpty(c.analogy) && nonEmpty(c.formula), w, '필수 필드 비어 있음');
  ok(G.subjects.some((s) => s.id === c.subject), w, '모르는 과목');
  ok(c.subject !== 'code', w, '전기설비기술기준 개념은 이번 단계에서 만들지 않음');
  c.prereqs.forEach((p) => ok(ids.has(p), w, '없는 선행 개념 ' + p));
  ok(G.templatesFor(c.id).length > 0, w, '계산 템플릿 없음');
  ok((perConcept[c.id] || 0) >= 3000, w, '생성 문제 수 3000 미만: ' + (perConcept[c.id] || 0));
});
// 순환 선행 관계 없음
(function () {
  const state = {};
  const visit = (id, trail) => {
    if (state[id] === 2) return;
    if (state[id] === 1) return fail('concepts', '선행 관계 순환: ' + trail.concat(id).join(' → '));
    state[id] = 1;
    G.conceptMap[id].prereqs.forEach((p) => visit(p, trail.concat(id)));
    state[id] = 2;
  };
  G.concepts.forEach((c) => visit(c.id, []));
  checks++;
})();
['em', 'power', 'machine'].forEach((sid) => ok(G.concepts.filter((c) => c.subject === sid).length >= 8, 'concepts', sid + ' 개념 8개 미만'));
G.subjects.filter((s) => s.ready).forEach((s) => ok(G.concepts.some((c) => c.subject === s.id && c.prereqs.length === 0), 'concepts', s.name + ': 처음부터 열린 개념이 없음'));
const REQUIRED = ['ohm', 'series', 'parallel', 'divider', 'power', 'energy', 'three-phase', 'ac-basics', 'rlc', 'ac-power', 'resonance', 'y-delta', 'laplace', 'transfer'];
REQUIRED.forEach((id) => ok(ids.has(id), 'concepts', '필수 개념 없음: ' + id));

// ───────── 3. 정적 문제은행 ─────────
ok(G.staticBank.length >= 5, 'static', '정적 문제가 5개 미만: ' + G.staticBank.length);
G.subjects.filter((s) => s.ready).forEach((s) => ok(G.staticBank.some((it) => G.conceptMap[it.concepts[0]].subject === s.id), 'static', s.name + ' 이론형 문제 없음'));
G.staticBank.forEach((it) => {
  ok(it.choices.length === 4 && it.answer >= 0 && it.answer < 4, 'static:' + it.id, '보기/정답 형식');
  it.concepts.forEach((c) => ok(ids.has(c), 'static:' + it.id, '없는 개념 태그 ' + c));
  for (let seed = 1; seed <= 200; seed++) {
    const q = G.buildStatic(it.id, seed);
    checkQuestion(q, 'static:' + it.id + '#' + seed);
    ok(q.choices[q.answerIndex].label === it.choices[it.answer].label, 'static:' + it.id, '섞은 뒤 정답 바뀜');
    ok(JSON.stringify(G.buildStatic(it.id, seed)) === JSON.stringify(q), 'static:' + it.id, '같은 시드 재현 실패');
    ok(JSON.stringify(G.fromKey(q.key)) === JSON.stringify(q), 'static:' + it.id, '문제 번호 재생성 실패');
  }
});

// ───────── 3-2. 배우기 레슨 ─────────
ok(G.lessons.length >= 40, 'lessons', '레슨 수 부족: ' + G.lessons.length);
G.concepts.forEach((c) => ok(G.lessons.filter((l) => l.concept === c.id).length === 1, 'lessons', '개념마다 레슨이 정확히 1개여야 함: ' + c.id));
G.lessons.forEach((l) => {
  const w = 'lesson:' + l.id;
  ok(nonEmpty(l.title) && nonEmpty(l.goal) && nonEmpty(l.part), w, '제목/목표/단원 없음');
  ok(l.concept === null || !!G.conceptMap[l.concept], w, '없는 개념');
  ok(Array.isArray(l.sections) && l.sections.length >= 1, w, '본문 없음');
  l.sections.forEach((s) => ok(nonEmpty(s.h) && ((s.p || []).length + (s.list || []).length) > 0 && (s.p || []).concat(s.list || []).every(nonEmpty), w, '빈 단락: ' + s.h));
  ok(Array.isArray(l.how) && l.how.length >= 2 && l.how.every(nonEmpty), w, '문제 푸는 순서 부족');
  ok(Array.isArray(l.points) && l.points.length >= 1, w, '시험 포인트 없음');
  ok(!BAD_TEXT.test(JSON.stringify(l)), w, '글에 undefined/NaN');
  if (l.example) {
    const tid = l.example.split('#')[0];
    ok(!!G.templates[tid] && G.templates[tid].concept === l.concept, w, '예제 템플릿이 레슨 개념과 다름: ' + l.example);
    try {
      checkQuestion(G.fromKey('t:' + l.example), w + ' 예제');
    } catch (e) {
      fail(w, '예제 생성 실패: ' + e.message);
    }
  } else ok(l.concept === null, w, '개념 레슨인데 예제가 없음');
});
ok(G.lessons[0].part.indexOf('0.') === 0, 'lessons', '첫 레슨은 0단원(시작하기)이어야 함');

// ───────── 4. 학습 기록 로직 ─────────
(function () {
  const P = G.progress;
  const st = P.emptyState();
  const fake = (cid, key) => ({ conceptId: cid, key: key || 't:x#' + Math.random() });
  ok(P.isUnlocked(st, 'ohm'), 'progress', '선행 없는 개념은 처음부터 열려야 함');
  ok(!P.isUnlocked(st, 'series'), 'progress', '직렬은 처음엔 잠겨 있어야 함');
  P.record(st, fake('ohm'), true, { day: '2026-01-01' });
  P.record(st, fake('ohm'), true, { day: '2026-01-01' });
  ok(!P.isUnlocked(st, 'series'), 'progress', '2문제만 풀었는데 열림');
  P.record(st, fake('ohm'), false, { day: '2026-01-01' });
  ok(P.isUnlocked(st, 'series'), 'progress', '3문제 66.7%인데 안 열림');
  P.record(st, fake('ohm'), false, { day: '2026-01-01' });
  ok(!P.isUnlocked(st, 'series'), 'progress', '4문제 50%인데 열려 있음');
  P.record(st, fake('ohm'), true, { day: '2026-01-01' });
  ok(P.isUnlocked(st, 'series'), 'progress', '5문제 60%인데 안 열림(60% 이상이면 열림)');
  ok(!P.isUnlocked(st, 'rlc'), 'progress', '선행 둘 중 하나만 충족했는데 열림');
  st.settings.skipOrder = true;
  ok(P.isUnlocked(st, 'transfer'), 'progress', '순서 건너뛰기 켰는데 잠김');
  st.settings.skipOrder = false;
  ok(!P.isUnlocked(st, 'resonance'), 'progress', '공진은 처음엔 잠겨 있어야 함');
  P.markLessonRead(st, G.lessonFor('resonance').id);
  ok(P.isUnlocked(st, 'resonance'), 'progress', '레슨을 읽었는데 개념이 안 열림');

  // 간격 반복: 틀림 → 1일 → 3일 → 7일 → 졸업 (새 기록으로 따로 검사)
  const st2 = P.emptyState();
  const k = 't:ohm-current#42';
  const q = fake('ohm', k);
  P.record(st2, q, false, { day: '2026-03-10' });
  ok(st2.reviews[k] && st2.reviews[k].due === '2026-03-11', 'review', '틀린 뒤 1일 뒤가 아님');
  ok(P.dueReviews(st2, '2026-03-10').length === 0 && P.dueReviews(st2, '2026-03-11').length === 1, 'review', '복습 대상 날짜 계산');
  P.record(st2, q, true, { day: '2026-03-10' });
  ok(st2.reviews[k].due === '2026-03-11', 'review', '기한 전 정답이 일정을 바꿈');
  P.record(st2, q, true, { day: '2026-03-11' });
  ok(st2.reviews[k].due === '2026-03-14', 'review', '1차 복습 정답 후 3일 뒤가 아님: ' + st2.reviews[k].due);
  P.record(st2, q, true, { day: '2026-03-14' });
  ok(st2.reviews[k].due === '2026-03-21', 'review', '2차 복습 정답 후 7일 뒤가 아님');
  P.record(st2, q, true, { day: '2026-03-21' });
  ok(!st2.reviews[k], 'review', '3차 복습 정답 후 졸업 안 됨');
  P.record(st2, q, false, { day: '2026-03-30' });
  P.record(st2, q, true, { day: '2026-03-31' });
  P.record(st2, q, false, { day: '2026-04-03' });
  ok(st2.reviews[k].stage === 0 && st2.reviews[k].due === '2026-04-04', 'review', '복습 중 틀리면 1일로 리셋');
  ok(P.addDays('2026-12-31', 1) === '2027-01-01' && P.addDays('2028-02-28', 1) === '2028-02-29', 'review', '날짜 넘김');

  // 연속 정답
  const s2 = P.emptyState();
  [true, true, true, false, true].forEach((x) => P.record(s2, fake('ohm'), x, { day: '2026-01-01' }));
  ok(s2.streak.cur === 1 && s2.streak.best === 3, 'streak', '연속 정답 계산');
  ok(s2.total.n === 5 && s2.total.c === 4 && s2.concepts.ohm.n === 5, 'stats', '정답률 집계');
  const n1 = P.normalize({ settings: { skipOrder: true }, junk: 1 });
  ok(n1.settings.skipOrder === true && n1.settings.mixStatic === true && Array.isArray(n1.history), 'storage', '저장본 정규화');
  ok(P.normalize('garbage').v === 1, 'storage', '깨진 저장본 복구');
})();

// ───────── 결과 ─────────
const totalQ = Object.values(perConcept).reduce((a, b) => a + b, 0);
console.log('템플릿 ' + G.templateList.length + '개 × ' + PER_TEMPLATE + '문제 = ' + totalQ + '문제 생성 (' + genMs + ' ms)');
console.log('개념별 생성 수:');
G.concepts.forEach((c) => console.log('  ' + c.name.padEnd(22) + ' ' + String(perConcept[c.id] || 0).padStart(6) + '문제 (템플릿 ' + G.templatesFor(c.id).length + '개)'));
console.log('정적 문제 ' + G.staticBank.length + '개 × 시드 200');
console.log('검사 항목 ' + checks.toLocaleString() + '개');
if (failures.length) {
  console.log('\n실패 ' + failures.length + '건:');
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('\n✓ 전부 통과');
