// 정적 문제은행: 숫자 템플릿으로 만들기 어려운 이론형 문제
// 형식: { id, concepts:[태그...], text, choices:[{label, why}] (정답은 answer 인덱스), answer,
//        conclusion, steps:[...], check, traps:[...] }
(function (G) {
  'use strict';

  function defineStatic(item) {
    if (G.staticMap[item.id]) throw new Error('정적 문제 id 중복: ' + item.id);
    if (!/^[a-z0-9-]+$/.test(item.id)) throw new Error('정적 문제 id 형식 오류: ' + item.id);
    G.staticBank.push(item);
    G.staticMap[item.id] = item;
  }

  // 시드는 보기 순서만 섞는다(같은 시드 → 같은 순서)
  function buildStatic(id, seed) {
    const it = G.staticMap[id];
    if (!it) throw new Error('없는 정적 문제: ' + id);
    const rng = G.rng.create(seed, 'static:' + id);
    const choices = rng.shuffle(
      it.choices.map((c, i) => ({ label: c.label, correct: i === it.answer, why: c.why }))
    );
    return G.explain.assemble({
      key: 's:' + id + '#' + seed,
      source: 'static',
      staticId: id,
      seed,
      conceptId: it.concepts[0],
      text: it.text,
      svg: it.svg,
      kind: 'text',
      formula: it.formula,
      choices,
      conclusion: it.conclusion,
      steps: it.steps,
      check: it.check,
      traps: it.traps,
    });
  }

  function staticFor(conceptId) {
    return G.staticBank.filter((it) => it.concepts.indexOf(conceptId) !== -1);
  }

  G.defineStatic = defineStatic;
  G.buildStatic = buildStatic;
  G.staticFor = staticFor;
})(globalThis.GISA);
