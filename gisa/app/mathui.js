// 수식 화면: 글 속의 한 줄 수식(1/√(LC), V × R₂ / (R₁ + R₂) …)을 기출 문제집처럼
// 분자 위·분모 아래 분수, 윗줄 있는 제곱근, 위첨자로 바꿔 그린다. 바꾸는 규칙은 engine/typeset.js.
(function (G) {
  'use strict';
  if (typeof document === 'undefined' || !G.typeset) return;

  // 건드리지 않는 자리: 입력칸, 그림, 계산기·AI 패널(자기 글자를 따로 그림), 이미 바꾼 수식
  // (진행 표시 "16/44", "연속 2/3", "열린 개념 17/42" 같은 화면 장식 글자도 건드리지 않는다)
  const SKIP =
    'script,style,svg,input,textarea,select,option,#calc,#side,.ai-msg,.mf,.mf-r,.mf-sup,.cele,.toast,.qid,code.expr,' +
    '.eyebrow,.stat-line,.state,.banner,.lockbar,.tabs,.tag,.chip,.streak,.lesson-no,.bar,.progress-tile,.field,.switch,.msg,.stat-sub,.nowrap,button.row,.row-head';

  const plain = (nodes) =>
    nodes
      .map((n) => {
        if (n.t === 'tx') return n.s;
        if (n.t === 'frac') return plain(n.n) + ' 나누기 ' + plain(n.d);
        if (n.t === 'sqrt') return (n.i ? '세제곱근 ' : '루트 ') + plain(n.b);
        return ' 제곱 ' + plain(n.b);
      })
      .join('');

  function build(nodes) {
    const f = document.createDocumentFragment();
    nodes.forEach((n) => f.appendChild(one(n)));
    return f;
  }
  function el(tag, cls) {
    const e = document.createElement(tag);
    e.className = cls;
    return e;
  }
  function one(n) {
    if (n.t === 'tx') return document.createTextNode(n.s);
    if (n.t === 'frac') {
      const s = el('span', 'mf');
      s.setAttribute('role', 'math');
      s.setAttribute('aria-label', plain([n]));
      const a = el('span', 'mf-n');
      a.appendChild(build(n.n));
      const b = el('span', 'mf-d');
      b.appendChild(build(n.d));
      s.append(a, b);
      return s;
    }
    if (n.t === 'sqrt') {
      const s = el('span', 'mf-r');
      s.setAttribute('role', 'math');
      s.setAttribute('aria-label', plain([n]));
      if (n.i) {
        const i = el('span', 'mf-ri');
        i.appendChild(build(n.i));
        s.appendChild(i);
      }
      const sign = el('span', 'mf-rs');
      sign.textContent = '√';
      const body = el('span', 'mf-rb');
      body.appendChild(build(n.b));
      s.append(sign, body);
      return s;
    }
    const sup = el('sup', 'mf-sup');
    sup.appendChild(build(n.b));
    return sup;
  }

  function typeset(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const targets = [];
    let n;
    while ((n = walker.nextNode())) {
      const v = n.nodeValue;
      if (!v || !/[/√∛^]/.test(v)) continue;
      const p = n.parentElement;
      if (!p || p.closest(SKIP)) continue;
      targets.push(n);
    }
    targets.forEach((tn) => {
      const nodes = G.typeset(tn.nodeValue);
      if (nodes) tn.parentNode.replaceChild(build(nodes), tn);
    });
  }

  G.mathUi = { typeset };
})(globalThis.GISA);
