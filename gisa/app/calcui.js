// 계산기 화면: 카시오 fx-350ES PLUS 모양의 키패드와 액정을 그린다.
// 계산은 전부 G.Calc(engine/calc.js)가 하고, 여기서는 키 입력을 넘기고 화면(view)을 그리기만 한다.
(function (G) {
  'use strict';
  if (typeof document === 'undefined' || !G.Calc) return;

  const SAVE_KEY = 'gisa-calc-v1';
  const DOCK_NARROW = 1000; // 오른쪽 AI 패널이 없을 때 왼쪽에 붙이는 최소 폭
  const DOCK_WIDE = 1280; // AI 패널이 있을 때(양쪽 패널) 최소 폭
  const FLOAT_MIN = 940; // 이보다 좁으면(폰) 계산기를 숨김

  const calc = new G.Calc();
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (saved) calc.restore(saved);
  } catch (e) {
    /* 저장본이 없거나 깨져도 기본값 */
  }
  const persist = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(calc.serialize()));
    } catch (e) {
      /* 저장 못 해도 계산은 됨 */
    }
  };

  // ───────── 키 배열 (실물 사진 기준) ─────────
  // [id, 본 글자, SHIFT 글자, ALPHA 글자, 종류]
  const K = (id, main, sh, al, cls) => ({ id, main, sh: sh || '', al: al || '', cls: cls || 'fn' });
  const TOP = [
    K('SHIFT', 'SHIFT', '', '', 'shift'),
    K('ALPHA', 'ALPHA', '', '', 'alpha'),
    'PAD',
    K('MODE', 'MODE', 'SETUP'),
    K('ON', 'ON'),
    K('Abs', 'Abs'),
    K('x3', 'x³', '', ':'),
    K('x-1', 'x⁻¹', 'x!'),
    K('LOGAB', 'log▪▯'),
  ];
  const FUN = [
    K('FRAC', '▯⁄▯', '▯▯⁄▯'),
    K('SQRT', '√▪', '³√▪'),
    K('x2', 'x²'),
    K('x^', 'x▪', '▪√▯'),
    K('log', 'log', '10▪'),
    K('ln', 'ln', 'e▪'),
    K('(-)', '(−)', '', 'A'),
    K('DMS', '°′″', 'FACT', 'B'),
    K('hyp', 'hyp', '', 'C'),
    K('sin', 'sin', 'sin⁻¹', 'D'),
    K('cos', 'cos', 'cos⁻¹', 'E'),
    K('tan', 'tan', 'tan⁻¹', 'F'),
    K('RCL', 'RCL', 'STO'),
    K('ENG', 'ENG', '←'),
    K('(', '(', '%'),
    K(')', ')', ',', 'X'),
    K('S<>D', 'S⇔D', 'ab/c⇔d/c', 'Y'),
    K('M+', 'M+', 'M−', 'M'),
  ];
  const NUM = [
    K('7', '7', '', '', 'num'),
    K('8', '8', '', '', 'num'),
    K('9', '9', 'CLR', '', 'num'),
    K('DEL', 'DEL', 'INS', '', 'del'),
    K('AC', 'AC', 'OFF', '', 'del'),
    K('4', '4', '', '', 'num'),
    K('5', '5', '', '', 'num'),
    K('6', '6', '', '', 'num'),
    K('*', '×', 'nPr', '', 'num'),
    K('/', '÷', 'nCr', '', 'num'),
    K('1', '1', 'STAT', '', 'num'),
    K('2', '2', '', '', 'num'),
    K('3', '3', '', '', 'num'),
    K('+', '+', 'Pol', '', 'num'),
    K('-', '−', 'Rec', '', 'num'),
    K('0', '0', 'Rnd', '', 'num'),
    K('.', '•', 'Ran#', 'RanInt', 'num'),
    K('x10^x', '×10ˣ', 'π', 'e', 'num'),
    K('Ans', 'Ans', 'DRG▶', '', 'num'),
    K('=', '=', '', '', 'num'),
  ];

  // 물리 키보드 → 계산기 키
  const KEYMAP = {
    Enter: '=', '=': '=', Backspace: 'DEL', Delete: 'DEL', Escape: 'AC',
    '+': '+', '-': '-', '*': '*', '/': '/', x: '*', X: '*', '.': '.', ',': '.',
    '(': '(', ')': ')', ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
    s: 'sin', c: 'cos', t: 'tan', l: 'log', n: 'ln', r: 'SQRT', '^': 'x^', '!': ['SHIFT', 'x-1'], '%': ['SHIFT', '('],
    p: ['SHIFT', 'x10^x'], a: 'Ans', d: 'S<>D',
  };

  let root = null;
  let lcd = null;
  let toggle = null;
  let open = false;

  const h = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  // ───────── 액정 그리기 ─────────
  function nodesToDom(nodes) {
    const f = document.createDocumentFragment();
    nodes.forEach((n) => f.appendChild(nodeToDom(n)));
    return f;
  }
  function nodeToDom(n) {
    switch (n.t) {
      case 'tx':
        return h('span', 't', n.s);
      case 'cur':
        return h('span', 'cur');
      case 'box':
        return h('span', 'bx');
      case 'frac': {
        const s = h('span', 'fr');
        const a = h('span', 'fn');
        a.appendChild(nodesToDom(n.n));
        const b = h('span', 'fd');
        b.appendChild(nodesToDom(n.d));
        s.append(a, b);
        return s;
      }
      case 'mix': {
        const s = h('span', 'mx');
        const w = h('span', 'mw');
        w.appendChild(nodesToDom(n.w));
        s.append(w, nodeToDom({ t: 'frac', n: n.n, d: n.d }));
        return s;
      }
      case 'sqrt': {
        const s = h('span', 'rad');
        if (n.idx) {
          const i = h('span', 'ri');
          i.appendChild(nodesToDom(n.idx));
          s.appendChild(i);
        }
        s.appendChild(h('span', 'rs', '√'));
        const b = h('span', 'rb');
        b.appendChild(nodesToDom(n.b));
        s.appendChild(b);
        return s;
      }
      case 'sup': {
        const s = h('span', 'sp');
        s.appendChild(nodesToDom(n.b));
        return s;
      }
      case 'sub': {
        const s = h('span', 'sb');
        s.appendChild(nodesToDom(n.b));
        return s;
      }
      case 'abs': {
        const s = h('span', 'ab');
        s.appendChild(nodesToDom(n.b));
        return s;
      }
      default:
        return h('span');
    }
  }

  const IND = [
    ['shift', 'S', 'shift'],
    ['alpha', 'A', 'alpha'],
    ['M', 'M'],
    ['STO', 'STO'],
    ['RCL', 'RCL'],
    ['STAT', 'STAT'],
    ['deg', 'D'],
    ['rad', 'R'],
    ['gra', 'G'],
    ['FIX', 'FIX'],
    ['SCI', 'SCI'],
    ['math', 'Math'],
    ['down', '▼'],
    ['up', '▲'],
    ['disp', 'Disp'],
  ];

  function paintInd(ind, host) {
    host.textContent = '';
    IND.forEach(([k, label, cls]) => {
      let on = !!ind[k];
      if (k === 'deg') on = ind.ang === 'D';
      if (k === 'rad') on = ind.ang === 'R';
      if (k === 'gra') on = ind.ang === 'G';
      const s = h('span', 'ind' + (on ? ' on' : '') + (cls ? ' ' + cls : ''), label);
      host.appendChild(s);
    });
  }

  function paint() {
    if (!lcd) return;
    const v = calc.view();
    const screen = lcd.screen;
    const body = lcd.body;
    lcd.panel.classList.toggle('off', v.kind === 'off');
    screen.style.setProperty('--ink-a', String(Math.max(0.35, Math.min(1, 0.82 + calc.contrast * 0.06))));
    paintInd(v.ind || {}, lcd.ind);
    body.textContent = '';
    body.className = 'lcd-body ' + v.kind + (v.error ? ' err' : '');
    if (v.kind === 'off') return;
    if (v.kind === 'text') {
      v.lines.forEach((t) => body.appendChild(h('div', 'tl', t || ' ')));
      if (v.arrow) body.appendChild(h('span', 'arrow', v.arrow === 'down' ? '▼' : '▲'));
      return;
    }
    if (v.kind === 'grid') {
      const tb = h('div', 'grid');
      const head = h('div', 'gr gh');
      head.appendChild(h('span', 'gn', ''));
      v.head.forEach((t) => head.appendChild(h('span', 'gc', t)));
      tb.appendChild(head);
      v.rows.forEach((r, i) => {
        const row = h('div', 'gr');
        row.appendChild(h('span', 'gn', String(r.n)));
        r.cells.forEach((c, j) => row.appendChild(h('span', 'gc' + (i === v.sel.r && j === v.sel.c ? ' sel' : ''), c)));
        tb.appendChild(row);
      });
      body.appendChild(tb);
      body.appendChild(h('div', 'gv' + (v.editing ? ' edit' : ''), v.value));
      return;
    }
    // expr
    const up = h('div', 'l1');
    const inner = h('div', 'l1i' + (calc.overwrite ? ' ow' : ''));
    if (v.dialog) {
      body.appendChild(Object.assign(h('div', 'l0'), {}));
      body.lastChild.appendChild(nodesToDom(v.upper));
      inner.appendChild(nodesToDom(v.input));
    } else inner.appendChild(nodesToDom(v.upper));
    up.appendChild(inner);
    const lo = h('div', 'l2');
    lo.appendChild(nodesToDom(v.lower));
    body.append(up, lo);
    // 커서가 보이게 가로로 밀어 준다
    const cur = inner.querySelector('.cur');
    if (cur) {
      const need = cur.offsetLeft + cur.offsetWidth + 14 - up.clientWidth;
      up.scrollLeft = need > 0 ? need : 0;
    } else up.scrollLeft = 0;
    if (!v.lower.length) lo.textContent = ' ';
  }

  function press(id) {
    calc.press(id);
    persist();
    paint();
    paintKeys();
  }
  // 사람이 누른 키: "계산기로 풀기" 시연 중이면 시연이 먼저 받는다(다음 키와 같을 때만 진행)
  function userPress(id) {
    if (G.calcDemo && G.calcDemo.active() && G.calcDemo.onUser(id)) return;
    press(id);
  }
  function pressKeys(list) {
    (Array.isArray(list) ? list : [list]).forEach((k) => press(k));
  }

  // SHIFT/ALPHA가 눌려 있는 동안 키 글자를 강조
  function paintKeys() {
    if (!root) return;
    root.classList.toggle('sh-on', calc.shift);
    root.classList.toggle('al-on', calc.alpha);
  }

  // ───────── 키패드 ─────────
  function keyEl(k) {
    const cell = h('div', 'kc ' + k.cls);
    const lab = h('div', 'kl');
    lab.append(h('span', 'ks', k.sh), h('span', 'ka', k.al));
    const b = h('button', 'key ' + k.cls, k.main);
    b.type = 'button';
    b.tabIndex = -1;
    b.dataset.key = k.id;
    b.setAttribute('aria-label', k.id === 'x10^x' ? '×10의 x제곱' : k.main + (k.sh ? ', SHIFT ' + k.sh : ''));
    b.addEventListener('click', () => {
      userPress(k.id);
      root.focus({ preventScroll: true });
    });
    cell.append(lab, b);
    return cell;
  }
  function padEl() {
    const pad = h('div', 'pad');
    const mk = (id, glyph, cls) => {
      const b = h('button', 'pb ' + cls, glyph);
      b.type = 'button';
      b.tabIndex = -1;
      b.dataset.key = id;
      b.setAttribute('aria-label', { UP: '위', DOWN: '아래', LEFT: '왼쪽', RIGHT: '오른쪽' }[id]);
      b.addEventListener('click', () => {
        userPress(id);
        root.focus({ preventScroll: true });
      });
      return b;
    };
    pad.append(mk('UP', '▲', 'u'), mk('LEFT', '◀', 'l'), h('span', 'pc', 'REPLAY'), mk('RIGHT', '▶', 'r'), mk('DOWN', '▼', 'd'));
    return pad;
  }

  function build() {
    root = document.getElementById('calc');
    if (!root) return;
    root.textContent = '';
    root.tabIndex = 0;
    root.setAttribute('aria-label', '계산기 (카시오 fx-350ES PLUS 방식)');
    const head = h('div', 'calc-head');
    head.append(h('strong', null, '계산기'), h('span', 'calc-model', 'fx-350ES PLUS'));
    const close = h('button', 'btn small calc-close', '닫기');
    close.type = 'button';
    close.onclick = () => setOpen(false);
    head.appendChild(close);

    const panel = h('div', 'lcd-panel');
    const ind = h('div', 'lcd-ind');
    const screen = h('div', 'lcd');
    const body = h('div', 'lcd-body');
    screen.append(ind, body);
    panel.appendChild(screen);
    lcd = { panel, screen, ind, body };

    const top = h('div', 'kgrid top');
    TOP.forEach((k) => top.appendChild(k === 'PAD' ? padEl() : keyEl(k)));
    FUN.forEach((k) => top.appendChild(keyEl(k)));
    const num = h('div', 'kgrid num');
    NUM.forEach((k) => num.appendChild(keyEl(k)));
    const keys = h('div', 'keys');
    keys.append(top, num);

    const hint = h('div', 'calc-hint', '이 칸을 누르면 키보드로도 입력돼: 숫자·+−×÷·Enter·Backspace·방향키, s/c/t(삼각), l(log), n(ln), r(√), p(π)');
    root.append(head, panel, keys, hint);
    root.addEventListener('keydown', onKey);
    document.body.classList.add('has-calc');

    toggle = h('button', 'calc-toggle', '계산기');
    toggle.type = 'button';
    toggle.setAttribute('aria-label', '계산기 열기');
    toggle.onclick = () => setOpen(!open);
    document.body.appendChild(toggle);

    paint();
    paintKeys();
    layout();
    window.addEventListener('resize', layout);
    new MutationObserver(layout).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const m = KEYMAP[e.key];
    let keys = m;
    if (!keys && /^[0-9]$/.test(e.key)) keys = e.key;
    if (!keys) return;
    e.preventDefault();
    e.stopPropagation();
    (Array.isArray(keys) ? keys : [keys]).forEach(userPress);
  }

  // ───────── 배치: 넓으면 왼쪽에 붙이고, 중간 폭이면 눌러서 여는 떠 있는 패널 ─────────
  function layout() {
    if (!root) return;
    const w = window.innerWidth;
    const hasSide = document.body.classList.contains('has-side');
    const dock = w >= (hasSide ? DOCK_WIDE : DOCK_NARROW);
    const canFloat = !dock && w >= FLOAT_MIN;
    document.body.classList.toggle('calc-dock', dock);
    document.body.classList.toggle('calc-float', canFloat);
    document.body.classList.toggle('calc-open', canFloat && open);
    document.body.classList.toggle('calc-off', !dock && !canFloat);
    if (toggle) toggle.hidden = !canFloat;
  }
  function setOpen(v) {
    open = !!v;
    layout();
    if (open && root) root.focus({ preventScroll: true });
  }

  // 시연용: 키 이름 → 글자, 다음 키 표시, 눌림 효과
  const LABELS = {};
  const SHIFTS = {};
  TOP.concat(FUN, NUM).forEach((k) => {
    if (k === 'PAD') return;
    LABELS[k.id] = k.main;
    SHIFTS[k.id] = k.sh;
  });
  Object.assign(LABELS, { UP: '▲', DOWN: '▼', LEFT: '◀', RIGHT: '▶' });
  const keyLabel = (id) => LABELS[id] || id;
  const shiftLabel = (id) => SHIFTS[id] || '';
  function btn(id) {
    return root ? root.querySelector('[data-key="' + id + '"]') : null;
  }
  function markNext(id) {
    if (!root) return;
    root.querySelectorAll('.demo-next').forEach((b) => b.classList.remove('demo-next'));
    const b = id ? btn(id) : null;
    if (b) {
      b.classList.add('demo-next');
      if (b.scrollIntoView) b.scrollIntoView({ block: 'nearest' });
    }
  }
  function flash(id, cls) {
    const b = btn(id);
    if (!b) return;
    const c = cls || 'demo-hit';
    b.classList.remove(c);
    void b.offsetWidth;
    b.classList.add(c);
    setTimeout(() => b.classList.remove(c), 450);
  }

  G.calcUi = { calc, press, pressKeys, userPress, paint, paintKeys, save: persist, setOpen, layout, el: () => root, keyLabel, shiftLabel, markNext, flash };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})(globalThis.GISA);
