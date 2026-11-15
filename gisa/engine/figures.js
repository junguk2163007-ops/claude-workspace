// 개념 설명용 그림(도식·실물 일러스트). 직접 그린 SVG라서 저작권 걱정이 없고, 오프라인에서도 보이고, 다크모드에 맞춰 색이 바뀐다.
//  G.figure(conceptId, { id, title, caption, vb:[가로,세로], svg })  → 개념 설명·레슨 화면에서 G.figuresFor(conceptId)로 꺼내 그린다.
//  svg에는 안쪽 도형만 쓴다. 선은 currentColor, 강조는 class="a"(강조색 선) / "af"(강조색 채움) / "f"(옅은 채움) / "sm"(작은 글씨).
(function (G) {
  'use strict';

  const list = [];
  const byConcept = {};

  function figure(cid, f) {
    if (!f || !f.id || !f.svg || !f.title) throw new Error('그림 형식 오류: ' + cid);
    if (list.some((x) => x.id === f.id)) throw new Error('그림 id 중복: ' + f.id);
    const item = Object.assign({ concept: cid, vb: [360, 190], caption: '' }, f);
    list.push(item);
    (byConcept[cid] = byConcept[cid] || []).push(item);
  }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 완성된 <svg> 문자열
  function render(f) {
    return (
      '<svg viewBox="0 0 ' + f.vb[0] + ' ' + f.vb[1] + '" role="img" aria-label="' + esc(f.title) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<defs>' +
      '<marker id="ah-' + f.id + '" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor" stroke="none"/></marker>' +
      '<marker id="aa-' + f.id + '" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="af" stroke="none"/></marker>' +
      '</defs>' +
      f.svg.replace(/url\(#ah\)/g, 'url(#ah-' + f.id + ')').replace(/url\(#aa\)/g, 'url(#aa-' + f.id + ')') +
      '</svg>'
    );
  }

  G.figure = figure;
  G.figures = { list, byConcept, render };
  G.figuresFor = (cid) => byConcept[cid] || [];
})(globalThis.GISA);
