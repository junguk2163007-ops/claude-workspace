// "계산기로 풀기" 시연: 문제의 풀이 키 순서를 왼쪽 계산기에서 한 키씩(또는 자동으로) 눌러 보여 준다.
//  - 다음에 누를 키에 고리가 깜박이고, 직접 그 키를 눌러도 되고 "다음 키" 버튼을 눌러도 돼.
//  - 시연하는 동안은 계산기를 기본 설정(MathIO · Deg · Norm1)으로 바꿔 두고, 끝내면 원래 설정과 메모리로 돌려놓는다.
(function (G) {
  'use strict';
  if (typeof document === 'undefined' || !G.calcUi) return;

  const U = G.calcUi;
  const calc = U.calc;
  const DEFAULT_SETUP = { io: 'MathO', angle: 'Deg', fmt: 'norm', n: 1, frac: 'd/c', stat: false, dot: 'Dot' };
  const SPEEDS = [
    { id: 'slow', label: '느리게', ms: 1100 },
    { id: 'normal', label: '보통', ms: 700 },
    { id: 'fast', label: '빠르게', ms: 350 },
  ];

  let demo = null; // { q, steps, flat, idx, auto, speed, snap, timer, dom }

  const h = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  function resetCalc() {
    calc.setup = Object.assign({}, DEFAULT_SETUP);
    calc.mode = 'COMP';
    calc.resetMemory();
    calc.clearScreen(true);
  }

  // 단계 목록 → 키 하나하나의 목록
  function flatten(steps) {
    const flat = [];
    steps.forEach((st, si) => st.keys.forEach((k, ki) => flat.push({ si, key: k, last: ki === st.keys.length - 1 })));
    return flat;
  }

  // 마지막 결과가 분수·근호·π 모양이면 S⇔D로 소수로 바꾸는 단계를 덧붙인다
  function withDecimalStep(steps) {
    const c = new G.Calc();
    c.setup = Object.assign({}, DEFAULT_SETUP);
    steps.forEach((st) => st.keys.forEach((k) => c.press(k)));
    const lower = c.view().lower || [];
    const exact = lower.some((n) => n.t === 'frac' || n.t === 'sqrt' || n.t === 'mix' || (n.t === 'tx' && /π/.test(n.s)));
    if (!exact) return steps;
    return steps.concat([{ say: '결과가 분수·근호·π 모양이야. S⇔D 키로 소수로 바꿔서 읽어', expr: 'S⇔D', keys: ['S<>D'] }]);
  }

  function start(q) {
    const plan = G.calcPlan(q);
    if (!plan) return false;
    return begin({ key: q.key, scope: 'question' }, plan);
  }

  // 용어 사전의 예제: 계산식 하나를 계산기에서 눌러 보여 준다
  function startExample(termId) {
    const t = G.glossary && G.glossary.byId[termId];
    if (!t || !t.example) return false;
    const e = t.example;
    const steps = [{ say: e.say, expr: e.expr, keys: G.calcExprKeys(e.expr, {}).concat(['=']) }];
    return begin({ key: 'wiki:' + termId, scope: 'wiki' }, steps);
  }

  function begin(meta, plan) {
    stop(true);
    const snap = calc.serialize();
    const steps = withDecimalStep(plan);
    demo = { key: meta.key, scope: meta.scope, steps, flat: flatten(steps), idx: 0, auto: false, speed: 'normal', snap, timer: 0, dom: null };
    resetCalc();
    U.setOpen(true);
    buildDom();
    U.paint();
    update();
    return true;
  }

  function stop(silent) {
    if (!demo) return;
    clearTimeout(demo.timer);
    const d = demo;
    demo = null;
    if (d.dom && d.dom.parentNode) d.dom.parentNode.removeChild(d.dom);
    U.markNext(null);
    calc.restore(d.snap);
    calc.clearScreen(true);
    U.paint();
    U.save();
    if (!silent) U.paintKeys();
  }

  // ───────── 진행 ─────────
  function pressNext() {
    if (!demo || demo.idx >= demo.flat.length) return false;
    const item = demo.flat[demo.idx];
    demo.idx++;
    U.press(item.key);
    U.flash(item.key);
    update();
    return true;
  }
  function finishStep() {
    if (!demo) return;
    const si = demo.idx < demo.flat.length ? demo.flat[demo.idx].si : -1;
    if (si < 0) return;
    while (demo.idx < demo.flat.length && demo.flat[demo.idx].si === si) pressNext();
  }
  function rewindTo(idx) {
    // 계산기를 처음 상태로 되돌린 뒤 idx개 키까지 다시 누른다
    clearTimeout(demo.timer);
    demo.auto = false;
    resetCalc();
    demo.idx = 0;
    while (demo.idx < idx) {
      const item = demo.flat[demo.idx++];
      U.press(item.key);
    }
    update();
  }
  function stepBack() {
    if (!demo || demo.idx <= 0) return;
    const start = (st) => demo.flat.findIndex((x) => x.si === st);
    const cur = demo.idx < demo.flat.length ? demo.flat[demo.idx].si : demo.steps.length;
    const curStart = cur < demo.steps.length ? start(cur) : demo.flat.length;
    rewindTo(demo.idx > curStart ? curStart : cur > 0 ? start(cur - 1) : 0);
  }

  function schedule() {
    clearTimeout(demo.timer);
    if (!demo.auto) return;
    if (demo.idx >= demo.flat.length) {
      demo.auto = false;
      update();
      return;
    }
    const ms = SPEEDS.find((s) => s.id === demo.speed).ms;
    const prev = demo.idx > 0 ? demo.flat[demo.idx - 1] : null;
    // 식이 끝나고 결과가 나온 뒤에는 읽을 시간을 조금 더 준다
    const wait = prev && prev.last ? ms * 2 : ms;
    demo.timer = setTimeout(() => {
      if (!demo || !demo.auto) return;
      pressNext();
      schedule();
    }, wait);
  }
  function toggleAuto() {
    if (!demo) return;
    if (demo.idx >= demo.flat.length) rewindTo(0);
    demo.auto = !demo.auto;
    update();
    schedule();
  }

  // 사용자가 계산기 키를 직접 눌렀을 때
  function onUser(id) {
    if (!demo) return false;
    const next = demo.flat[demo.idx];
    if (!next) {
      note('시연이 끝났어. "처음부터"를 누르거나 닫고 마음대로 써 봐.');
      return true;
    }
    if (id === next.key) {
      demo.auto = false;
      pressNext();
      return true;
    }
    note('지금은 ' + U.keyLabel(next.key) + ' 키를 눌러야 해.');
    U.flash(next.key, 'demo-miss');
    return true;
  }

  // ───────── 화면 ─────────
  function note(text) {
    if (!demo || !demo.dom) return;
    const n = demo.dom.querySelector('.demo-note');
    n.textContent = text;
    clearTimeout(note.t);
    note.t = setTimeout(() => {
      if (n) n.textContent = '';
    }, 2200);
  }

  function buildDom() {
    const root = U.el();
    const dom = h('section', 'demo');
    dom.setAttribute('aria-label', '계산기로 풀기');
    const head = h('div', 'demo-head');
    head.append(h('strong', null, '🖩 계산기로 풀기'));
    const close = h('button', 'btn small', '닫기');
    close.type = 'button';
    close.id = 'demo-close';
    close.onclick = () => stop();
    head.appendChild(close);
    const say = h('div', 'demo-say');
    say.id = 'demo-say';
    const nextRow = h('div', 'demo-nextrow');
    const noteEl = h('div', 'demo-note');
    noteEl.setAttribute('role', 'status');
    const ctl = h('div', 'demo-ctl');
    const mk = (id, label, fn, cls) => {
      const b = h('button', 'btn small ' + (cls || ''), label);
      b.type = 'button';
      b.id = id;
      b.onclick = fn;
      return b;
    };
    const speed = h('select', 'demo-speed');
    speed.id = 'demo-speed';
    speed.setAttribute('aria-label', '재생 속도');
    SPEEDS.forEach((s) => {
      const o = h('option', null, s.label);
      o.value = s.id;
      if (s.id === 'normal') o.selected = true;
      speed.appendChild(o);
    });
    speed.onchange = () => {
      demo.speed = speed.value;
      schedule();
    };
    ctl.append(
      mk('demo-reset', '⏮ 처음부터', () => rewindTo(0)),
      mk('demo-prev', '◀ 이전 단계', stepBack),
      mk('demo-key', '다음 키 ▶', () => {
        demo.auto = false;
        pressNext();
      }, 'primary'),
      mk('demo-step', '단계 끝까지 ⏩', () => {
        demo.auto = false;
        finishStep();
      }),
      mk('demo-auto', '▶ 자동 재생', toggleAuto, 'soft'),
      speed
    );
    dom.append(head, say, nextRow, noteEl, ctl);
    const anchor = root.querySelector('.calc-head');
    anchor.parentNode.insertBefore(dom, anchor.nextSibling);
    demo.dom = dom;
  }

  function update() {
    if (!demo || !demo.dom) return;
    const dom = demo.dom;
    const total = demo.steps.length;
    const done = demo.idx >= demo.flat.length;
    const item = done ? null : demo.flat[demo.idx];
    const si = item ? item.si : total - 1;
    const st = demo.steps[si];
    const say = dom.querySelector('.demo-say');
    say.textContent = '';
    if (done) {
      const lcd = G.cfmt && calc.view().lower ? G.cfmt.flat(calc.view().lower) : '';
      say.append(h('b', null, '끝! '), '계산기 결과는 ', h('b', null, lcd || ''), '이야. 보기에서 같은 값을 찾아봐.');
    } else {
      say.append(h('b', null, '단계 ' + (si + 1) + '/' + total + ' · '), st.say);
    }
    const row = dom.querySelector('.demo-nextrow');
    row.textContent = '';
    if (item) {
      row.append('다음에 누를 키: ');
      const k = h('span', 'demo-kbd', U.keyLabel(item.key, calc.shift));
      row.appendChild(k);
      if (calc.shift && U.shiftLabel(item.key)) row.append(' (SHIFT 기능: ' + U.shiftLabel(item.key) + ')');
      row.append('  · ' + demo.idx + '/' + demo.flat.length + ' 키');
    } else row.append(demo.idx + '/' + demo.flat.length + ' 키 완료');
    U.markNext(item ? item.key : null);
    dom.querySelector('#demo-auto').textContent = demo.auto ? '⏸ 멈춤' : '▶ 자동 재생';
    dom.querySelector('#demo-key').disabled = done;
    dom.querySelector('#demo-step').disabled = done;
    dom.querySelector('#demo-prev').disabled = demo.idx === 0;
    dom.querySelector('#demo-reset').disabled = demo.idx === 0;
  }

  G.calcDemo = {
    start,
    stop,
    active: () => !!demo,
    key: () => (demo ? demo.key : null),
    scope: () => (demo ? demo.scope : null),
    startExample,
    onUser,
    _state: () => demo,
    _next: pressNext,
  };
})(globalThis.GISA);
