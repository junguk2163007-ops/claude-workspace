// 계산기 아래 메모판(전자패드): 고급 샤프로 종이에 쓰듯, 가늘고 또렷한 선으로 공식을 손으로 쓴다.
//  - 샤프심 굵기(0.3 / 0.5 / 0.7 / 0.9 mm), 흑연·빨강·파랑 심, 지우개, 되돌리기, 초기화.
//  - 애플펜슬 같은 펜은 누르는 힘에 따라 선이 굵어졌다 가늘어진다(마우스·손가락은 일정한 선).
//  - 선을 좌표로 저장해서 크기가 바뀌어도 다시 그리고, 새로고침해도 남는다(localStorage).
(function (G) {
  'use strict';
  if (typeof document === 'undefined') return;

  const SAVE_KEY = 'gisa-pad-v1';
  const MAX_UNDO = 60;
  const COLORS = [
    { id: 'ink', label: '흑연심', css: null },
    { id: 'red', label: '빨간 심', css: '#c9382f' },
    { id: 'blue', label: '파란 심', css: '#2b5dc4' },
  ];
  // 샤프심 굵기(mm) → 화면 굵기(px)
  const LEADS = { '0.3': 1.1, '0.5': 1.6, '0.7': 2.3, '0.9': 3.1 };
  const ERASE_W = 16;

  const ICON = {
    pencil: '<path d="M4.5 19.5 5.6 15 16 4.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L9 18.4z"/><path d="m14 6.6 3.4 3.4"/>',
    eraser: '<path d="M8.2 19.5h10.3"/><path d="M5.3 14.7 13.6 6.4a2 2 0 0 1 2.8 0l2.4 2.4a2 2 0 0 1 0 2.8l-6.6 6.6a1.5 1.5 0 0 1-1 .4H8.7a1.5 1.5 0 0 1-1-.4l-2.4-2.4a1.5 1.5 0 0 1 0-2.1z"/><path d="m10.8 9.2 4.6 4.6"/>',
    undo: '<path d="M9 6.5 4.5 11 9 15.5"/><path d="M5 11h9.2a4.8 4.8 0 0 1 0 9.6H10"/>',
    trash: '<path d="M4.5 7h15"/><path d="M9.5 7V4.5h5V7"/><path d="M6.8 7l.9 12.5h8.6L17.2 7"/>',
  };
  const svg = (name) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + '</svg>';

  let strokes = []; // { c: 'ink'|'red'|'blue'|'erase', w, p: [[x, y, 압력?], …] }
  let history = [];
  let tool = 'pen'; // pen | erase
  let color = 'ink';
  let lead = '0.5';
  let cv = null;
  let ctx = null;
  let root = null;
  let drawing = null;
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

  // "흑연심"은 종이 위의 연필 색: 밝은 화면에선 짙은 회색, 어두운 화면에선 밝은 회색
  const inkColor = () => (getComputedStyle(document.documentElement).getPropertyValue('--pencil').trim() || '#2c3036');
  const cssOf = (id) => (COLORS.find((c) => c.id === id) || {}).css || inkColor();

  // ───────── 그리기 ─────────
  function paintStroke(s) {
    const pts = s.p;
    if (!pts.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const erase = s.c === 'erase';
    if (erase) ctx.globalCompositeOperation = 'destination-out';
    const col = erase ? '#000' : cssOf(s.c);
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    const pressured = !erase && pts.length > 2 && pts.some((q) => typeof q[2] === 'number');
    const wAt = (q) => (pressured && typeof q[2] === 'number' ? s.w * (0.45 + 1.1 * q[2]) : s.w);
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0][0], pts[0][1], wAt(pts[0]) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (!pressured) {
      ctx.lineWidth = s.w;
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
    } else {
      // 압력이 있는 선: 구간마다 굵기를 달리한다(겹쳐도 색이 진해지지 않도록 불투명하게 그림)
      let prevX = pts[0][0];
      let prevY = pts[0][1];
      for (let i = 1; i < pts.length; i++) {
        const mx = i === pts.length - 1 ? pts[i][0] : (pts[i][0] + pts[i + 1][0]) / 2;
        const my = i === pts.length - 1 ? pts[i][1] : (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.lineWidth = (wAt(pts[i - 1]) + wAt(pts[i])) / 2;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
        ctx.stroke();
        prevX = mx;
        prevY = my;
      }
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
    const q = [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10];
    if (e.pointerType === 'pen' && e.pressure > 0) q.push(Math.round(e.pressure * 100) / 100);
    return q;
  }
  function down(e) {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    if (cv.setPointerCapture && e.pointerId !== undefined) cv.setPointerCapture(e.pointerId);
    drawing = { c: tool === 'erase' ? 'erase' : color, w: tool === 'erase' ? ERASE_W : LEADS[lead], p: [pos(e)] };
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

  // 커서: 펜을 고르면 마우스 끝이 고급 샤프 모양(심 끝이 닿는 자리가 클릭 위치)이 되고,
  // 지우개를 고르면 지워지는 크기의 동그라미가 된다. 이미지 커서가 안 먹는 환경에선 십자 커서로 대신한다.
  function pencilSvg(bodyColor) {
    // 세로로 선 샤프(끝이 원점)를 그린 뒤 오른쪽으로 눕혀서 끝을 (4, 28)에 둔다. 흰 테두리를 먼저 깔아 어두운 종이에서도 보인다.
    const shapes =
      '<path d="M0 0V-4"/>' +
      '<path d="M0-4 -2.1-9.5h4.2z"/>' +
      '<rect x="-2.7" y="-15.5" width="5.4" height="6"/>' +
      '<rect x="-2.7" y="-27" width="5.4" height="11.5" rx="0.6"/>' +
      '<rect x="-1.4" y="-30" width="2.8" height="3"/>';
    const fills =
      '<path d="M0 0V-4" stroke="#222" stroke-width="1.1" fill="none"/>' +
      '<path d="M0-4 -2.1-9.5h4.2z" fill="#aeb6bf"/>' +
      '<rect x="-2.7" y="-15.5" width="5.4" height="6" fill="#3b4048"/>' +
      '<path d="M-2.7-13.4h5.4M-2.7-11.5h5.4" stroke="#7b838d" stroke-width="0.6"/>' +
      '<rect x="-2.7" y="-27" width="5.4" height="11.5" rx="0.6" fill="' + bodyColor + '"/>' +
      '<rect x="-1.4" y="-30" width="2.8" height="3" fill="#aeb6bf"/>';
    const halo = '<g stroke="#fff" stroke-width="3" stroke-linejoin="round" fill="#fff">' + shapes + '</g>';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="translate(4 28) rotate(32)">' + halo + fills + '</g></svg>';
  }
  function eraserSvg() {
    const d = ERASE_W + 4;
    const c = d / 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + d + '" height="' + d + '" viewBox="0 0 ' + d + ' ' + d + '"><circle cx="' + c + '" cy="' + c + '" r="' + ERASE_W / 2 + '" fill="rgba(255,255,255,0.35)" stroke="#fff" stroke-width="3"/><circle cx="' + c + '" cy="' + c + '" r="' + ERASE_W / 2 + '" fill="none" stroke="#333" stroke-width="1.3"/></svg>';
  }
  const uri = (svgText) => 'url("data:image/svg+xml,' + encodeURIComponent(svgText) + '")';
  function cursorCss() {
    if (tool === 'erase') return uri(eraserSvg()) + ' ' + (ERASE_W + 4) / 2 + ' ' + (ERASE_W + 4) / 2 + ', crosshair';
    return uri(pencilSvg(cssOf(color))) + ' 4 28, crosshair';
  }
  function setCursor() {
    if (cv) cv.style.cursor = cursorCss();
  }

  // ───────── 화면 ─────────
  function paintButtons() {
    if (!root) return;
    root.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
    root.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', String(tool === 'pen' && b.dataset.color === color)));
    root.querySelectorAll('[data-lead]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lead === lead)));
    root.classList.toggle('erasing', tool === 'erase');
    root.querySelector('#pad-undo').disabled = !history.length;
    root.querySelector('#pad-clear').disabled = !strokes.length;
    setCursor();
  }

  function build() {
    const host = document.getElementById('calc');
    if (!host) return;
    root = h('section', 'memo-pad');
    root.setAttribute('aria-label', '메모판');

    const mk = (id, cls, html, title, fn, attrs) => {
      const b = h('button', cls);
      b.type = 'button';
      b.id = id;
      b.innerHTML = html;
      b.title = title;
      b.setAttribute('aria-label', title);
      Object.keys(attrs || {}).forEach((k) => (b.dataset[k] = attrs[k]));
      b.onclick = fn;
      return b;
    };

    // 위쪽 줄: 제목 + 되돌리기·초기화
    const top = h('div', 'pad-top');
    const ttl = h('div', 'pad-title');
    ttl.innerHTML = '<span class="pad-mark" aria-hidden="true">' + svg('pencil') + '</span>';
    ttl.append(h('strong', null, '메모'), h('span', null, '공식을 써 놓고 누르자'));
    const acts = h('div', 'pad-acts');
    acts.append(
      mk('pad-undo', 'pad-icon', svg('undo'), '되돌리기 (초기화도 되돌릴 수 있어)', undo),
      mk('pad-clear', 'pad-icon danger', svg('trash') + '<span>초기화</span>', '메모판 전체 지우기', clearAll)
    );
    top.append(ttl, acts);

    // 도구 줄: 펜/지우개 · 심 색 · 심 굵기
    const bar = h('div', 'pad-bar');
    const seg = h('div', 'pad-seg');
    seg.append(
      mk('pad-pen', 'pad-segbtn', svg('pencil') + '<span>샤프</span>', '샤프', () => { tool = 'pen'; paintButtons(); }, { tool: 'pen' }),
      mk('pad-erase', 'pad-segbtn', svg('eraser') + '<span>지우개</span>', '지우개', () => { tool = 'erase'; paintButtons(); }, { tool: 'erase' })
    );
    const cols = h('div', 'pad-cols');
    COLORS.forEach((c) => {
      const b = mk('pad-color-' + c.id, 'pad-dot', '', c.label, () => { tool = 'pen'; color = c.id; paintButtons(); }, { color: c.id });
      b.style.setProperty('--dot', c.css || 'var(--pencil)');
      cols.appendChild(b);
    });
    const leads = h('div', 'pad-seg pad-leads');
    Object.keys(LEADS).forEach((k) => {
      leads.appendChild(mk('pad-lead-' + k.replace('.', ''), 'pad-segbtn', '<span>' + k + '</span>', '샤프심 ' + k + ' mm', () => { lead = k; if (tool === 'erase') tool = 'pen'; paintButtons(); }, { lead: k }));
    });
    leads.appendChild(h('em', 'pad-unit', 'mm'));
    bar.append(seg, cols, leads);

    cv = h('canvas', 'pad-canvas');
    cv.id = 'pad-canvas';
    cv.setAttribute('aria-label', '메모판 그리기 영역: 마우스나 펜으로 공식을 써 봐');
    ctx = cv.getContext('2d');
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    const wrap = h('div', 'pad-wrap');
    wrap.appendChild(cv);
    root.append(top, bar, wrap);

    const hint = host.querySelector('.calc-hint');
    host.insertBefore(root, hint || null);

    paintButtons();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(wrap);
    window.addEventListener('resize', fit);
    // 밝게/어둡게가 바뀌면 흑연 색이 따라가도록 다시 그린다
    new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', redraw);
    }
    fit();
  }

  G.pad = {
    cursor: () => (cv ? cv.style.cursor : ''),
    _pencilSvg: pencilSvg,
    strokes: () => strokes.map((s) => ({ c: s.c, w: s.w, n: s.p.length })),
    undo,
    clear: clearAll,
    ink: () => {
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
