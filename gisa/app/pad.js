// 계산기 아래 메모판(전자패드): 마우스·터치·펜으로 공식을 손으로 쓰고, 그걸 보면서 계산기를 누르게 한다.
//  - 선(stroke)을 좌표로 저장해서 크기가 바뀌어도 다시 그리고, 새로고침해도 남는다(localStorage).
//  - 펜(검정·빨강·파랑) / 지우개 / 굵기 / 되돌리기 / 초기화. "초기화"도 되돌리기로 살릴 수 있다.
(function (G) {
  'use strict';
  if (typeof document === 'undefined') return;

  const SAVE_KEY = 'gisa-pad-v1';
  const MAX_UNDO = 60;
  const COLORS = [
    { id: 'ink', label: '검정', css: null },
    { id: 'red', label: '빨강', css: '#d6362d' },
    { id: 'blue', label: '파랑', css: '#2f6fe0' },
  ];
  const WIDTHS = { thin: 2.2, thick: 4.5 };
  const ERASE_W = 18;

  let strokes = []; // { c: 'ink'|'red'|'blue'|'erase', w, p: [[x, y], …] }
  let history = [];
  let tool = 'pen'; // pen | erase
  let color = 'ink';
  let width = 'thin';
  let cv = null;
  let ctx = null;
  let root = null;
  let drawing = null; // 지금 그리는 선
  let dpr = 1;

  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (saved && Array.isArray(saved.s)) strokes = saved.s.filter((s) => s && Array.isArray(s.p));
  } catch (e) {
    /* 저장본이 없거나 깨졌으면 빈 판 */
  }
  const persist = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ s: strokes }));
    } catch (e) {
      /* 못 저장해도 쓸 수는 있음 */
    }
  };

  const h = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const inkColor = () => (getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#17202a');
  const cssOf = (id) => (COLORS.find((c) => c.id === id) || {}).css || inkColor();

  // ───────── 그리기 ─────────
  function paintStroke(s) {
    const pts = s.p;
    if (!pts.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = s.w;
    if (s.c === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#000';
    } else {
      ctx.strokeStyle = cssOf(s.c);
      ctx.fillStyle = cssOf(s.c);
    }
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0][0], pts[0][1], s.w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2;
        const my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last[0], last[1]);
      ctx.stroke();
    }
    ctx.restore();
  }
  function redraw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    strokes.forEach(paintStroke);
    if (drawing) paintStroke(drawing);
  }
  function fit() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = window.devicePixelRatio || 1;
    const w = Math.round(r.width * dpr);
    const hgt = Math.round(r.height * dpr);
    if (cv.width !== w || cv.height !== hgt) {
      cv.width = w;
      cv.height = hgt;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  function pushHistory() {
    history.push(strokes.slice());
    if (history.length > MAX_UNDO) history.shift();
  }
  function clearAll() {
    if (!strokes.length) return;
    pushHistory();
    strokes = [];
    persist();
    redraw();
    paintButtons();
  }
  function undo() {
    if (!history.length) return;
    strokes = history.pop();
    persist();
    redraw();
    paintButtons();
  }

  function pos(e) {
    const r = cv.getBoundingClientRect();
    return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10];
  }
  function down(e) {
    if (e.button !== undefined && e.button > 0) return; // 오른쪽·가운데 버튼은 무시
    e.preventDefault();
    cv.setPointerCapture && e.pointerId !== undefined && cv.setPointerCapture(e.pointerId);
    drawing = { c: tool === 'erase' ? 'erase' : color, w: tool === 'erase' ? ERASE_W : WIDTHS[width], p: [pos(e)] };
    redraw();
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    (evs && evs.length ? evs : [e]).forEach((ev) => drawing.p.push(pos(ev)));
    redraw();
  }
  function up(e) {
    if (!drawing) return;
    e.preventDefault();
    pushHistory();
    strokes.push(drawing);
    drawing = null;
    persist();
    redraw();
    paintButtons();
  }

  // ───────── 화면 ─────────
  function paintButtons() {
    if (!root) return;
    root.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
    root.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', String(tool === 'pen' && b.dataset.color === color)));
    root.querySelectorAll('[data-width]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.width === width)));
    root.querySelector('#pad-undo').disabled = !history.length;
    root.querySelector('#pad-clear').disabled = !strokes.length;
  }

  function build() {
    const host = document.getElementById('calc');
    if (!host) return;
    root = h('section', 'memo-pad');
    root.setAttribute('aria-label', '메모판');
    const bar = h('div', 'pad-bar');
    const mk = (id, label, title, fn, attrs) => {
      const b = h('button', 'pad-btn', label);
      b.type = 'button';
      b.id = id;
      b.title = title;
      b.setAttribute('aria-label', title);
      Object.keys(attrs || {}).forEach((k) => (b.dataset[k] = attrs[k]));
      b.onclick = fn;
      return b;
    };
    const tools = h('div', 'pad-group');
    tools.append(
      mk('pad-pen', '✏️ 펜', '펜', () => { tool = 'pen'; paintButtons(); }, { tool: 'pen' }),
      mk('pad-erase', '지우개', '지우개', () => { tool = 'erase'; paintButtons(); }, { tool: 'erase' })
    );
    const cols = h('div', 'pad-group');
    COLORS.forEach((c) => {
      const b = mk('pad-color-' + c.id, '', c.label + ' 펜', () => { tool = 'pen'; color = c.id; paintButtons(); }, { color: c.id });
      b.classList.add('pad-dot');
      b.style.setProperty('--dot', c.css || 'var(--ink)');
      cols.appendChild(b);
    });
    const wid = h('div', 'pad-group');
    wid.append(
      mk('pad-thin', '가늘게', '가는 펜', () => { width = 'thin'; paintButtons(); }, { width: 'thin' }),
      mk('pad-thick', '굵게', '굵은 펜', () => { width = 'thick'; paintButtons(); }, { width: 'thick' })
    );
    const acts = h('div', 'pad-group');
    acts.append(mk('pad-undo', '↶ 되돌리기', '한 단계 되돌리기(초기화도 되돌릴 수 있어)', undo), mk('pad-clear', '초기화', '메모판 전체 지우기', clearAll));
    bar.append(tools, cols, wid, acts);

    cv = h('canvas', 'pad-canvas');
    cv.id = 'pad-canvas';
    cv.setAttribute('aria-label', '메모판 그리기 영역: 마우스나 손가락으로 공식을 써 봐');
    ctx = cv.getContext('2d');
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    const wrap = h('div', 'pad-wrap');
    wrap.appendChild(cv);
    root.append(h('div', 'pad-title', '메모판 · 공식을 먼저 써 놓고 계산기를 눌러'), bar, wrap);

    const hint = host.querySelector('.calc-hint');
    host.insertBefore(root, hint || null);

    paintButtons();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(wrap);
    window.addEventListener('resize', fit);
    // 밝게/어둡게가 바뀌면 "검정" 펜 색이 따라가도록 다시 그린다
    new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', redraw);
    }
    fit();
  }

  G.pad = {
    strokes: () => strokes.map((s) => ({ c: s.c, w: s.w, n: s.p.length })),
    undo,
    clear: clearAll,
    ink: () => {
      // 시험용: 그려진 픽셀 수
      if (!ctx) return 0;
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      return n;
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})(globalThis.GISA);
