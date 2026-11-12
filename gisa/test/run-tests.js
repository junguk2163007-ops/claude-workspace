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

// ───────── 3-3. 문제 포인트(과목별 단원) ─────────
G.templateList.forEach((t) => ok(!!G.points[t.id], 'points', '템플릿에 포인트 설명이 없음: ' + t.id));
G.staticBank.forEach((it) => ok(!!G.points['s:' + it.id], 'points', '이론형 문제에 포인트 설명이 없음: ' + it.id));
Object.keys(G.points).forEach((id) => {
  const p = G.points[id];
  const w = 'point:' + id;
  ok(id.indexOf('s:') === 0 ? !!G.staticMap[id.slice(2)] : !!G.templates[id], w, '포인트에 해당하는 문제가 없음');
  ok(nonEmpty(p.t) && nonEmpty(p.ask) && nonEmpty(p.key) && nonEmpty(p.trap), w, '포인트 필드가 비어 있음');
  ok(p.t.length <= 20, w, '포인트 이름이 너무 김: ' + p.t);
  ok(!BAD_TEXT.test(JSON.stringify(p)), w, '글에 undefined/NaN');
});
G.concepts.forEach((c) => {
  const pts = G.pointsFor(c.id);
  ok(pts.length === G.templatesFor(c.id).length + G.staticFor(c.id).filter((x) => x.concepts[0] === c.id).length && pts.length > 0, 'points', '개념의 포인트 수 불일치: ' + c.id);
  pts.forEach((pt) => {
    for (let seed = 1; seed <= 5; seed++) {
      const q = G.questionForPoint(pt, seed);
      ok(q.conceptId === c.id, 'point:' + pt.id, '포인트 문제의 개념이 다름');
      ok(G.pointId(q) === (pt.kind === 'static' ? 's:' + pt.ref : pt.ref), 'point:' + pt.id, 'pointId 불일치');
    }
  });
});


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

  // 포인트: 연속 3문제를 맞히면 익숙해짐, 틀리면 다시 0
  (function () {
    const stp = P.emptyState();
    const pq = (id, n) => G.generate(id, n);
    const fakeSt = P.emptyState();
    P.record(fakeSt, pq('ohm-current', 1), true);
    P.record(fakeSt, pq('ohm-current', 2), true);
    ok(!P.pointMastered(fakeSt, 'ohm-current'), 'points', '2연속인데 익숙해짐으로 표시됨');
    P.record(fakeSt, pq('ohm-current', 3), true);
    ok(P.pointMastered(fakeSt, 'ohm-current'), 'points', '3연속인데 익숙해짐이 아님');
    P.record(fakeSt, pq('ohm-current', 4), false);
    ok(!P.pointMastered(fakeSt, 'ohm-current') && P.pointStat(fakeSt, 'ohm-current').streak === 0, 'points', '틀렸는데 연속이 안 끊김');
    ok(P.pointStat(fakeSt, 'ohm-current').n === 4 && P.pointStat(fakeSt, 'ohm-current').c === 3, 'points', '포인트 풀이 수/정답 수');
    ok(P.pointStat(fakeSt, 'ohm-voltage').n === 0, 'points', '다른 포인트에 섞여 기록됨');
    for (let i = 1; i <= 3; i++) P.record(stp, G.buildStatic('st-base-ampere', i), true);
    ok(P.pointMastered(stp, 's:st-base-ampere'), 'points', '이론형 포인트 기록');
    const cp = P.conceptPoints(fakeSt, 'ohm');
    ok(cp.total === 3 && cp.mastered === 0, 'points', '개념 포인트 집계: ' + JSON.stringify(cp));
    for (let i = 5; i <= 7; i++) P.record(fakeSt, pq('ohm-current', i), true);
    ok(P.conceptPoints(fakeSt, 'ohm').mastered === 1, 'points', '익숙한 포인트 집계');
    ok(P.normalize(JSON.parse(JSON.stringify(fakeSt))).points['ohm-current'].streak === 3, 'storage', '포인트 기록이 저장·복원되지 않음');
    ok(P.normalize({}).points && typeof P.normalize({}).points === 'object', 'storage', '예전 저장본에 포인트 필드 보충');
  })();

  // 기기 간 합치기(동기화): 기록을 잃지 않는 게 원칙
  (function () {
    const mk = (over) => Object.assign(P.emptyState(), over);
    const view = (st) => P.canon(P.syncView(st));
    const A = mk({
      updatedAt: 1000,
      concepts: { ohm: { n: 5, c: 4 }, series: { n: 2, c: 2 } },
      points: { 'ohm-current': { n: 5, c: 4, streak: 3 } },
      total: { n: 7, c: 6 },
      streak: { cur: 3, best: 6 },
      lessons: { 'l-ohm': { t: 500 } },
      history: [{ k: 'a', cid: 'ohm', ok: true, t: 1 }, { k: 'b', cid: 'ohm', ok: true, t: 2 }],
      reviews: { k1: { k: 'k1', cid: 'ohm', stage: 0, due: '2026-01-02', u: 100 } },
    });
    const B = mk({
      updatedAt: 2000,
      concepts: { ohm: { n: 3, c: 3 }, parallel: { n: 4, c: 1 } },
      points: { 'ohm-current': { n: 3, c: 3, streak: 3 }, 'parallel-two': { n: 4, c: 1, streak: 0 } },
      total: { n: 7, c: 4 },
      streak: { cur: 1, best: 2 },
      lessons: { 'l-ohm': { t: 300 }, 'l-series': { t: 900 } },
      history: [{ k: 'b', cid: 'ohm', ok: true, t: 2 }, { k: 'c', cid: 'ohm', ok: false, t: 3 }],
      reviews: { k1: { k: 'k1', cid: 'ohm', stage: 1, due: '2026-01-05', u: 200 }, k2: { k: 'k2', cid: 'parallel', stage: 0, due: '2026-01-03', u: 150 } },
      settings: Object.assign(P.emptyState().settings, { skipOrder: true, theme: 'dark' }),
    });
    A.settings.theme = 'light';
    const M = P.merge(A, B);
    ok(M.concepts.ohm.n === 5 && M.concepts.ohm.c === 4, 'merge', '더 많이 푼 쪽의 개념 통계를 남겨야 함');
    ok(M.concepts.series.n === 2 && M.concepts.parallel.n === 4, 'merge', '한쪽에만 있는 개념도 남아야 함');
    ok(M.points['ohm-current'].n === 5 && M.points['parallel-two'].n === 4, 'merge', '포인트 통계 합치기');
    ok(M.total.n === 7 && M.total.c === 6, 'merge', '총계는 더 많이 푼 쪽(동률이면 더 많이 맞힌 쪽)');
    ok(M.streak.cur === 1 && M.streak.best === 6, 'merge', '연속 정답은 최근 쪽, 최고 기록은 최댓값');
    ok(M.lessons['l-ohm'].t === 300 && !!M.lessons['l-series'], 'merge', '읽은 레슨은 합집합(먼저 읽은 시각)');
    ok(M.history.length === 3 && M.history.map((e) => e.k).join('') === 'abc', 'merge', '풀이 기록은 중복 없이 합집합·시간순: ' + JSON.stringify(M.history));
    ok(M.reviews.k1.stage === 1 && !!M.reviews.k2, 'merge', '복습은 합집합이고 더 나중에 바뀐 쪽이 이김');
    ok(M.settings.theme === 'light' && M.settings.skipOrder === true, 'merge', '테마는 이 기기 것, 공유 설정은 더 최근 쪽');
    ok(view(P.merge(A, B)) === view(P.merge(B, A)), 'merge', '합치는 순서와 무관해야 함(공유 부분)');
    ok(view(P.merge(M, A)) === view(M) && view(P.merge(M, B)) === view(M) && view(P.merge(M, M)) === view(M), 'merge', '다시 합쳐도 결과가 그대로여야 함(멱등)');

    // 졸업(복습 완료)은 예전 복습 항목을 되살리지 않고, 나중에 다시 틀리면 되살아남
    const gradA = mk({ updatedAt: 3000, reviewDone: { k1: 300 } });
    ok(!P.merge(gradA, B).reviews.k1 && P.merge(gradA, B).reviewDone.k1 === 300, 'merge', '졸업한 복습이 되살아남');
    const reAdd = mk({ updatedAt: 4000, reviews: { k1: { k: 'k1', cid: 'ohm', stage: 0, due: '2026-02-01', u: 400 } } });
    ok(!!P.merge(gradA, reAdd).reviews.k1 && !P.merge(gradA, reAdd).reviewDone.k1, 'merge', '졸업 뒤 다시 틀린 복습이 사라짐');

    // 초기화: 초기화 이후 활동 없는 기기 기록은 버리고, 이후에 푼 기록은 남김
    const reset = P.replaceAll(P.emptyState(), 5000);
    const stale = mk({ updatedAt: 4500, total: { n: 9, c: 9 }, concepts: { ohm: { n: 9, c: 9 } } });
    const fresh = mk({ updatedAt: 6000, total: { n: 2, c: 2 }, concepts: { ohm: { n: 2, c: 2 } } });
    ok(P.merge(reset, stale).total.n === 0 && P.merge(stale, reset).total.n === 0, 'merge', '초기화 이전 기록이 되살아남');
    ok(P.merge(reset, fresh).total.n === 2 && P.merge(fresh, reset).resetAt === 5000, 'merge', '초기화 이후에 푼 기록이 사라짐');
    ok(reset.updatedAt > reset.resetAt, 'merge', '초기화한 기기 자신의 기록은 살아 있어야 함');
    const imported = P.replaceAll(mk({ total: { n: 4, c: 3 }, concepts: { ohm: { n: 4, c: 3 } } }), 7000);
    ok(P.merge(imported, stale).total.n === 4 && P.merge(imported, stale).concepts.ohm.n === 4, 'merge', '백업 가져오기 뒤 예전 기록이 섞임');

    // 예전 저장본(동기화 필드 없음)도 읽혀야 함
    const legacy = P.normalize({ v: 1, concepts: { ohm: { n: 1, c: 1 } }, total: { n: 1, c: 1 }, history: [{ k: 'x', cid: 'ohm', ok: true, t: 9 }] });
    ok(legacy.updatedAt === 0 && legacy.resetAt === 0 && typeof legacy.reviewDone === 'object', 'merge', '예전 저장본 보충');
    ok(P.merge(legacy, B).concepts.ohm.n === 3, 'merge', '예전 저장본과 합치기');
    ok(Object.keys(P.syncView(B).settings).sort().join() === 'mixStatic,skipOrder', 'merge', '서버에는 공유 설정만 올라감');
    const big = mk({ history: Array.from({ length: 400 }, (_, i) => ({ k: 'h' + i, cid: 'ohm', ok: true, t: i })) });
    const big2 = mk({ history: Array.from({ length: 400 }, (_, i) => ({ k: 'g' + i, cid: 'ohm', ok: true, t: 1000 + i })) });
    ok(P.merge(big, big2).history.length === 500, 'merge', '풀이 기록은 최근 500개까지만');
    // 실제 record()로 만든 복습·졸업이 기록되는지
    const rs = P.emptyState();
    const q = G.generate('ohm-current', 11);
    P.record(rs, q, false, { day: '2026-03-10' });
    ok(rs.reviews[q.key] && rs.reviews[q.key].u > 0, 'merge', '복습 항목에 변경 시각이 남아야 함');
    P.record(rs, q, true, { day: '2026-03-11' });
    P.record(rs, q, true, { day: '2026-03-14' });
    P.record(rs, q, true, { day: '2026-03-21' });
    ok(!rs.reviews[q.key] && rs.reviewDone[q.key] > 0, 'merge', '졸업하면 졸업 기록이 남아야 함');
  })();

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
