// 수식 화면: 글 속의 한 줄 수식(1/√(LC), V × R₂ / (R₁ + R₂) …)을 기출 문제집처럼
// 분자 위·분모 아래 분수, 윗줄 있는 제곱근, 위첨자로 바꿔 그린다. 바꾸는 규칙은 engine/typeset.js.
(function (G) {
  'use strict';
  if (typeof document === 'undefined' || !G.typeset) return;

  // 건드리지 않는 자리: 입력칸, 그림, 계산기·AI 패널(자기 글자를 따로 그림), 이미 바꾼 수식
  // (진행 표시 "16/44", "연속 2/3", "열린 개념 17/42" 같은 화면 장식 글자도 건드리지 않는다)
  const SKIP =
    'script,style,svg,input,textarea,select,option,#calc,#side,.ai-msg,.mxo,.mf,.mf-r,.mf-sup,.cele,.toast,.qid,code.expr,' +
    '#update-log,.eyebrow,.stat-line,.state,.banner,.lockbar,.tabs,.tag,.chip,.streak,.lesson-no,.bar,.progress-tile,.field,.switch,.msg,.stat-sub,.nowrap,button.row,.row-head,.ex-head,.ex-result,.ex-sec,.exam-entry,.ex-confirm,#bookmark-panel,#weak-panel,#exam-history,.bm-btn,.cfig';

  const plain = (nodes) =>
    nodes
      .map((n) => {
        if (n.t === 'tx' || n.t === 'v') return n.s;
        if (n.t === 'math') return plain(n.b);
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
    if (n.t === 'v') {
      const i = el('i', 'mv');
      i.textContent = n.s;
      return i;
    }
    if (n.t === 'math') {
      const m = el('span', 'mx');
      m.appendChild(build(n.b));
      return m;
    }
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
      const s = el('span', 'mf-r' + (n.b.some((x) => x.t === 'frac') ? ' tall' : ''));
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
      if (!v || !/[/√∛^=≈∝]/.test(v)) continue;
      if (/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}/.test(v)) continue; // "11/16 16:15" 같은 날짜·시각은 분수가 아님
      const p = n.parentElement;
      if (!p || p.closest(SKIP)) continue;
      targets.push(n);
    }
    targets.forEach((tn) => {
      const nodes = G.typeset(tn.nodeValue);
      if (!nodes) return;
      // 복사할 때 원문 그대로 나오게 원래 글을 data-src 에 같이 둔다
      const w = document.createElement('span');
      w.className = 'mxo';
      w.dataset.src = tn.nodeValue;
      w.appendChild(build(nodes));
      tn.parentNode.replaceChild(w, tn);
    });
  }

  // 분수·제곱근으로 바꿔 그린 글을 드래그해 복사하면 조각마다 줄이 바뀌어 붙던 문제:
  // 원문(data-src)으로 되돌리고, 줄바꿈은 원래 문단 단위로만 남긴다
  const wrapText = (e) => {
    const t = e.textContent;
    return t.length > 1 && !/^\(.*\)$/.test(t) ? '(' + t + ')' : t;
  };
  function plainOfMath(box) {
    const q = (sel) => Array.prototype.slice.call(box.querySelectorAll(sel));
    q('.mf').forEach((e) => {
      const nn = e.querySelector('.mf-n');
      const dd = e.querySelector('.mf-d');
      e.replaceWith(document.createTextNode(wrapText(nn || { textContent: '' }) + '/' + wrapText(dd || { textContent: '' })));
    });
    q('.mf-r').forEach((e) => {
      const b = e.querySelector('.mf-rb');
      e.replaceWith(document.createTextNode('√(' + (b ? b.textContent : '') + ')'));
    });
    q('.mf-sup').forEach((e) => e.replaceWith(document.createTextNode('^' + wrapText(e))));
  }
  document.addEventListener('copy', (ev) => {
    if (ev.defaultPrevented || !ev.clipboardData) return;
    const sel = window.getSelection && window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const box = document.createElement('div');
    box.appendChild(range.cloneContents());
    if (!box.querySelector('.mxo, .mf, .mf-r, .mf-sup, .mx')) {
      // 한 수식 글 안쪽만 골랐을 때는 조각에 .mxo 가 없을 수 있어 부모를 본다
      const anc = range.commonAncestorContainer;
      const host = anc && (anc.nodeType === 1 ? anc : anc.parentElement);
      if (!host || !host.closest || !host.closest('.mxo')) return;
    }
    box.querySelectorAll('.mxo').forEach((w) => w.replaceWith(document.createTextNode(w.getAttribute('data-src') || w.textContent)));
    plainOfMath(box);
    box.style.cssText = 'position:fixed;left:-99999px;top:0;width:640px;white-space:pre-wrap';
    document.body.appendChild(box);
    const text = box.innerText.replace(/\n{3,}/g, '\n\n').trim();
    box.remove();
    if (!text) return;
    ev.clipboardData.setData('text/plain', text);
    ev.preventDefault();
  });

  G.mathUi = { typeset };
})(globalThis.GISA);
