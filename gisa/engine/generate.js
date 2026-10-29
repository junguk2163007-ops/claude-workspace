// 템플릿 등록과 문제 생성. 문제 키 = "t:<템플릿>#<시드>" 이면 언제든 같은 문제를 다시 만든다.
(function (G) {
  'use strict';

  const MAX_TRIES = 80;

  function defineTemplate(t) {
    if (!t.id || !t.concept || typeof t.gen !== 'function') throw new Error('템플릿 형식 오류: ' + t.id);
    if (G.templates[t.id]) throw new Error('템플릿 id 중복: ' + t.id);
    G.templates[t.id] = t;
    G.templateList.push(t);
  }

  function generate(templateId, seed) {
    const t = G.templates[templateId];
    if (!t) throw new Error('없는 템플릿: ' + templateId);
    const rng = G.rng.create(seed, templateId);
    for (let i = 0; i < MAX_TRIES; i++) {
      const d = t.gen(rng);
      if (!d) continue;
      const choices = G.choices.build(rng, d);
      if (!choices) continue;
      return G.explain.assemble({
        key: 't:' + templateId + '#' + seed,
        source: 'template',
        templateId,
        seed,
        conceptId: t.concept,
        text: d.text,
        svg: d.svg,
        kind: d.kind,
        formula: d.formula,
        choices,
        conclusion: d.conclusion,
        steps: d.steps,
        check: d.check,
        traps: d.traps,
        params: d.params,
        answerValue: d.kind === 'expr' ? null : d.answer,
        minGap: d.minGap || G.choices.MIN_REL_GAP,
      });
    }
    throw new Error('문제 생성 실패: ' + templateId + '#' + seed);
  }

  function templatesFor(conceptId) {
    return G.templateList.filter((t) => t.concept === conceptId);
  }

  // "t:ohm-current#123" 또는 "s:st-rms-meter#45"
  function fromKey(key) {
    const m = /^([ts]):([a-z0-9-]+)#(\d+)$/.exec(String(key).trim());
    if (!m) throw new Error('문제 번호 형식이 달라: ' + key);
    const seed = Number(m[3]);
    return m[1] === 't' ? generate(m[2], seed) : G.buildStatic(m[2], seed);
  }

  G.defineTemplate = defineTemplate;
  G.generate = generate;
  G.templatesFor = templatesFor;
  G.fromKey = fromKey;
})(globalThis.GISA);
