// 기출 분석 보강(kg): 짧게 쓰는 도우미
//  G.kgFacts(개념id, [{h, list|p}])  → 그 개념의 레슨(개념 설명)에 "기출에서 자주 나오는 것" 구역을 덧붙인다
//  G.kgS(id, 개념id, {q, ok, bad:[[보기, 왜 아닌지]...], f, c, s:[...], k, t:[...]})  → 이론형 문제 한 개
(function (G) {
  'use strict';
  G.kgFacts = function (cid, sections) {
    const l = G.lessonFor(cid);
    if (!l) throw new Error('레슨 없음: ' + cid);
    sections.forEach((s) => l.sections.push(s));
  };
  G.kgS = function (id, cid, o) {
    G.defineStatic({
      id,
      concepts: [cid],
      text: o.q,
      choices: [{ label: o.ok[0], why: o.ok[1] }].concat(o.bad.map((b) => ({ label: b[0], why: b[1] }))),
      answer: 0,
      formula: o.f,
      conclusion: o.c,
      steps: o.s,
      check: o.k,
      traps: o.t,
    });
  };
})(globalThis.GISA);
