// 공통 해설 틀: ① 한 줄 결론 ② 개념 카드(+비유) ③ 풀이 단계(검산 포함) ④ 함정/기억할 점
(function (G) {
  'use strict';

  function concept(id) {
    const c = G.conceptMap[id];
    if (!c) throw new Error('알 수 없는 개념: ' + id);
    return c;
  }

  // 템플릿 문제와 정적 문제가 모두 이 모양으로 나온다
  function assemble(o) {
    const c = concept(o.conceptId);
    // value(숫자 보기)·key(수식 보기)는 화면에선 안 쓰고 테스트 검산용으로 남겨 둔다
    const choices = o.choices.map((ch) => ({
      label: ch.label,
      correct: ch.correct,
      why: ch.correct ? ch.why || '정답이야. ' + o.conclusion : ch.why,
      value: typeof ch.value === 'number' ? ch.value : null,
      key: ch.key || null,
    }));
    const steps = o.steps.slice();
    if (o.check) steps.push('검산: ' + o.check);
    const traps = o.traps.slice();
    if (c.remember) traps.push(c.remember);
    return {
      key: o.key,
      source: o.source,
      templateId: o.templateId || null,
      staticId: o.staticId || null,
      seed: o.seed,
      conceptId: c.id,
      subject: c.subject,
      text: o.text,
      svg: o.svg || '',
      kind: o.kind || 'num',
      hints: { card: c.card, formula: o.formula || c.formula },
      choices,
      answerIndex: choices.findIndex((ch) => ch.correct),
      explain: {
        conclusion: o.conclusion,
        card: c.card,
        analogy: c.analogy,
        steps,
        traps,
      },
      params: o.params || null,
      answerValue: typeof o.answerValue === 'number' ? o.answerValue : null,
      minGap: o.minGap || null,
    };
  }

  G.explain = { assemble, concept };
})(globalThis.GISA);
