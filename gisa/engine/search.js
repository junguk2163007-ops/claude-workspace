// 검색: 궁금한 말을 치면 용어 해설, 개념(레슨·단락), 그 개념의 문제 유형(포인트)을 한꺼번에 찾아 준다.
//  G.search('역률') → { terms: [용어…], concepts: [{ c: 개념, points: [포인트…], via: '용어 이름'|null }…] }
//  - 띄어쓰기로 나눈 낱말이 전부 들어 있어야 찾는다(대소문자 무시).
//  - 개념은 이름·그룹·카드·공식·그 개념에 연결된 용어 이름으로 찾고, 이름에 들어 있으면 위로 올린다.
(function (G) {
  'use strict';

  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const tokensOf = (q) => norm(q).split(' ').filter(Boolean);
  const hasAll = (hay, toks) => toks.every((t) => hay.indexOf(t) >= 0);

  function search(query, opts) {
    const toks = tokensOf(query);
    const out = { terms: [], concepts: [] };
    if (!toks.length) return out;
    const maxPoints = (opts && opts.maxPoints) || 4;

    // 용어: 이름·별칭·한 줄 요약
    const termHits = [];
    (G.glossary ? G.glossary.terms : []).forEach((t, i) => {
      const names = norm([t.name].concat(t.aliases).join(' '));
      const hay = names + ' ' + norm(t.brief);
      if (!hasAll(hay, toks)) return;
      const score = hasAll(names, toks) ? (norm(t.name).indexOf(toks[0]) === 0 ? 4 : 3) : 1;
      termHits.push({ t, score, i });
    });
    termHits.sort((a, b) => b.score - a.score || a.i - b.i);
    out.terms = termHits.map((h) => h.t);

    // 개념
    const byConcept = {};
    termHits.forEach((h) => {
      if (h.t.concept && h.score >= 3) byConcept[h.t.concept] = byConcept[h.t.concept] || h.t.name;
    });
    const conceptHits = [];
    G.concepts.forEach((c, i) => {
      const termNames = norm((G.glossary ? G.glossary.terms : []).filter((t) => t.concept === c.id).map((t) => t.name + ' ' + t.aliases.join(' ')).join(' '));
      const nameHay = norm(c.name + ' ' + c.group);
      const hay = nameHay + ' ' + termNames + ' ' + norm(c.card + ' ' + (c.formula || '') + ' ' + (c.remember || ''));
      const pts = (G.pointsFor ? G.pointsFor(c.id) : []).filter((p) => p && hasAll(norm([p.t, p.ask, p.key].join(' ')), toks));
      const hit = hasAll(hay, toks);
      if (!hit && !pts.length) return;
      let score = 0;
      if (hasAll(nameHay, toks)) score += 4;
      else if (hasAll(termNames, toks)) score += 3;
      else if (hit) score += 1;
      if (pts.length) score += 1;
      conceptHits.push({ c, score, i, points: pts.slice(0, maxPoints), via: byConcept[c.id] || null });
    });
    conceptHits.sort((a, b) => b.score - a.score || a.i - b.i);
    out.concepts = conceptHits.map((h) => ({ c: h.c, points: h.points, via: h.via }));
    return out;
  }

  G.search = search;
})(globalThis.GISA);
