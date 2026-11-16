// 3D 짧은 애니메이션 재생기. 외부 라이브러리 없이 캔버스에 직접 그리는 작은 3D 엔진이라 파일로 열어도 동작한다.
//  - G.anim3d.register(장면): { id, title, concepts:[개념 id], duration(초), captions:[{t0,t1,text}], draw(g, t, o) }
//  - g(그리기 도구): line, dot, arrow, poly, box, cyl, ring, helix, text, hud(화면 고정 글자)
//  - 단락 화면의 "▶ 3D로 보기" 버튼 → 팝업. 재생 버튼을 눌러야 움직이고, 끌어서 돌려 볼 수 있다.
(function (G) {
  'use strict';
  if (typeof document === 'undefined') return;
  const scenes = {};
  const byConcept = {};
  const envs = {}; // 장면 뒤 배경(anim-env.js)

  // ───────── 벡터 ─────────
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a) => {
    const l = len(a) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  const lerp = (a, b, k) => add(a, mul(sub(b, a), k));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = (x) => {
    const k = clamp(x, 0, 1);
    return k * k * (3 - 2 * k);
  };
  G.vec3 = { add, sub, mul, dot, cross, len, norm, lerp, clamp, ease };

  const TAU = Math.PI * 2;
  // 색: [r,g,b] 0~255
  const C = {
    wire: [210, 140, 70],
    red: [235, 90, 85],
    blue: [80, 150, 240],
    green: [90, 200, 130],
    yellow: [250, 210, 80],
    white: [235, 240, 245],
    gray: [140, 150, 165],
    dark: [60, 70, 85],
    water: [70, 160, 235],
    purple: [170, 110, 230],
  };
  G.anim3dColors = C;
  const rgba = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')';
  const shade = (c, k) => [clamp(c[0] * k, 0, 255), clamp(c[1] * k, 0, 255), clamp(c[2] * k, 0, 255)];

  // ───────── 그리기 도구 ─────────
  function makeG(canvas, view) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const f = Math.min(W, H) * 1.05;
    const cy = Math.cos(view.yaw);
    const sy = Math.sin(view.yaw);
    const cp = Math.cos(view.pitch);
    const sp = Math.sin(view.pitch);
    const items = [];
    const hud = [];
    const rot = (p) => {
      const x = p[0] * cy + p[2] * sy;
      const z0 = -p[0] * sy + p[2] * cy;
      const y = p[1] * cp - z0 * sp;
      const z = p[1] * sp + z0 * cp;
      return [x, y, z];
    };
    const ox = W / 2 + (view.sx || 0) * W; // 장면을 화면에서 옆·아래로 옮기는 값(비율)
    const oy = H / 2 + (view.sy || 0) * H;
    const proj = (p) => {
      const r = rot(p);
      const depth = view.dist - r[2];
      const s = f / Math.max(0.3, depth);
      return { x: ox + r[0] * s, y: oy - r[1] * s, z: r[2], s };
    };
    const GROUND = -1e6; // 바닥·그림자는 항상 맨 먼저 그린다
    let bias = 0; // 넓은 받침 같은 물체를 위에 놓인 물체보다 먼저 그리게 하는 값
    const light = norm([0.35, 0.55, 0.8]);
    const g = {
      W,
      H,
      ctx,
      proj,
      add,
      sub,
      mul,
      lerp,
      norm,
      cross,
      len,
      ease,
      clamp,
      C,
      line(a, b, col, w) {
        const A = proj(a);
        const B = proj(b);
        items.push({ z: (A.z + B.z) / 2, fn: () => {
          ctx.strokeStyle = rgba(col || C.white, 1);
          ctx.lineWidth = Math.max(1, (w || 0.03) * (A.s + B.s) / 2);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(A.x, A.y);
          ctx.lineTo(B.x, B.y);
          ctx.stroke();
        } });
      },
      dot(p, r, col, glow) {
        const P = proj(p);
        items.push({ z: P.z, fn: () => {
          const rr = Math.max(1.5, (r || 0.08) * P.s);
          if (glow) {
            const gr = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, rr * 3);
            gr.addColorStop(0, rgba(col, 0.55));
            gr.addColorStop(1, rgba(col, 0));
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.arc(P.x, P.y, rr * 3, 0, Math.PI * 2);
            ctx.fill();
          }
          const gr2 = ctx.createRadialGradient(P.x - rr * 0.3, P.y - rr * 0.3, rr * 0.1, P.x, P.y, rr);
          gr2.addColorStop(0, rgba(shade(col, 1.4), 1));
          gr2.addColorStop(1, rgba(shade(col, 0.75), 1));
          ctx.fillStyle = gr2;
          ctx.beginPath();
          ctx.arc(P.x, P.y, rr, 0, Math.PI * 2);
          ctx.fill();
        } });
      },
      // 바닥 위에 깔리는 면(탁자 널빤지, 그림자): 다른 물체보다 먼저 그려진다
      ground(pts, col, alpha) {
        const P = pts.map(proj);
        items.push({ z: GROUND, fn: () => {
          ctx.fillStyle = rgba(col, alpha == null ? 1 : alpha);
          ctx.beginPath();
          P.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
          ctx.closePath();
          ctx.fill();
        } });
      },
      groundLine(a, b, col, w, alpha) {
        const A = proj(a);
        const B = proj(b);
        items.push({ z: GROUND, fn: () => {
          ctx.strokeStyle = rgba(col, alpha == null ? 1 : alpha);
          ctx.lineWidth = Math.max(1, (w || 0.02) * (A.s + B.s) / 2);
          ctx.beginPath();
          ctx.moveTo(A.x, A.y);
          ctx.lineTo(B.x, B.y);
          ctx.stroke();
        } });
      },
      shadow(c, rx, rz, a) {
        const pts = [];
        for (let i = 0; i < 22; i++) pts.push([c[0] + Math.cos((i / 22) * TAU) * rx, c[1], c[2] + Math.sin((i / 22) * TAU) * rz]);
        g.ground(pts, [0, 0, 0], a == null ? 0.28 : a);
      },
      // 반투명 구(유리·빛무리)
      orb(p, r, col, alpha, glow) {
        const P = proj(p);
        items.push({ z: P.z, fn: () => {
          const rr = Math.max(2, r * P.s);
          const gr = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, rr);
          gr.addColorStop(0, rgba(col, (alpha == null ? 0.5 : alpha) * (glow ? 1 : 0.7)));
          gr.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(P.x, P.y, rr, 0, Math.PI * 2);
          ctx.fill();
        } });
      },
      // 꺾이는 전선: 점들을 이어 둥근 관으로
      tube(pts, r, col, n) {
        for (let i = 0; i + 1 < pts.length; i++) g.cyl(pts[i], pts[i + 1], r, col, 1, n || 12);
      },
      hudDraw(fn) {
        hud.push(() => fn(ctx, W, H));
      },
      setBias(b) {
        bias = b || 0;
      },
      poly(pts, col, alpha, edge) {
        const P = pts.map(proj);
        const z = P.reduce((s, q) => s + q.z, 0) / P.length + bias;
        items.push({ z, fn: () => {
          ctx.fillStyle = rgba(col, alpha == null ? 1 : alpha);
          ctx.beginPath();
          P.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
          ctx.closePath();
          ctx.fill();
          if (edge) {
            ctx.strokeStyle = rgba(shade(col, 1.35), Math.min(1, (alpha == null ? 1 : alpha) + 0.2));
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        } });
      },
      arrow(a, b, col, w) {
        g.line(a, b, col, w || 0.045);
        const d = norm(sub(b, a));
        let up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        const s = norm(cross(d, up));
        const hl = Math.min(0.28, len(sub(b, a)) * 0.45);
        const base = sub(b, mul(d, hl));
        g.poly([b, add(base, mul(s, hl * 0.4)), sub(base, mul(s, hl * 0.4))], col, 1);
        const s2 = norm(cross(d, s));
        g.poly([b, add(base, mul(s2, hl * 0.4)), sub(base, mul(s2, hl * 0.4))], shade(col, 0.85), 1);
      },
      box(c, s, col, alpha) {
        const h = [s[0] / 2, s[1] / 2, s[2] / 2];
        const v = (x, y, z) => [c[0] + x * h[0], c[1] + y * h[1], c[2] + z * h[2]];
        const faces = [
          [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], [0, 0, 1]],
          [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1], [0, 0, -1]],
          [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1], [1, 0, 0]],
          [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, 0, 0]],
          [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1], [0, 1, 0]],
          [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [0, -1, 0]],
        ];
        faces.forEach((fc) => {
          const n = fc[4];
          const k = 0.55 + 0.45 * Math.max(0, dot(norm(rot(n)), light));
          g.poly(fc.slice(0, 4).map((q) => v(q[0], q[1], q[2])), shade(col, k), alpha == null ? 1 : alpha, true);
        });
      },
      cyl(a, b, r, col, alpha, n) {
        const ax = norm(sub(b, a));
        const up = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        const u = norm(cross(ax, up));
        const v = cross(ax, u);
        const N = n || 14;
        for (let i = 0; i < N; i++) {
          const t0 = (i / N) * Math.PI * 2;
          const t1 = ((i + 1) / N) * Math.PI * 2;
          const o0 = add(mul(u, Math.cos(t0) * r), mul(v, Math.sin(t0) * r));
          const o1 = add(mul(u, Math.cos(t1) * r), mul(v, Math.sin(t1) * r));
          const nm = norm(add(o0, o1));
          const k = 0.5 + 0.5 * Math.max(0, dot(norm(rot(nm)), light));
          g.poly([add(a, o0), add(a, o1), add(b, o1), add(b, o0)], shade(col, k), alpha == null ? 1 : alpha, false);
        }
      },
      ring(c, axis, r, col, w, n, a0, a1) {
        const ax = norm(axis);
        const up = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        const u = norm(cross(ax, up));
        const v = cross(ax, u);
        const N = n || 40;
        const s0 = a0 == null ? 0 : a0;
        const s1 = a1 == null ? Math.PI * 2 : a1;
        const pt = (t) => add(c, add(mul(u, Math.cos(t) * r), mul(v, Math.sin(t) * r)));
        for (let i = 0; i < N; i++) g.line(pt(s0 + ((s1 - s0) * i) / N), pt(s0 + ((s1 - s0) * (i + 1)) / N), col, w);
        return { pt, u, v };
      },
      helix(a, b, r, turns, col, w, n) {
        const ax = norm(sub(b, a));
        const up = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        const u = norm(cross(ax, up));
        const v = cross(ax, u);
        const N = n || Math.round(turns * 18);
        let prev = null;
        for (let i = 0; i <= N; i++) {
          const k = i / N;
          const t = k * turns * Math.PI * 2;
          const p = add(lerp(a, b, k), add(mul(u, Math.cos(t) * r), mul(v, Math.sin(t) * r)));
          if (prev) g.line(prev, p, col, w || 0.05);
          prev = p;
        }
      },
      text(p, str, col, size) {
        const P = proj(p);
        items.push({ z: P.z + 0.001, fn: () => {
          ctx.font = '700 ' + Math.max(11, (size || 0.2) * P.s) + 'px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = rgba(col || C.white, 1);
          ctx.strokeStyle = 'rgba(8,12,18,0.85)';
          ctx.lineWidth = 3;
          ctx.strokeText(str, P.x, P.y);
          ctx.fillText(str, P.x, P.y);
        } });
      },
      hud(x, y, str, col, size, align) {
        hud.push(() => {
          ctx.font = '700 ' + (size || 16) + 'px system-ui, sans-serif';
          ctx.textAlign = align || 'left';
          ctx.fillStyle = rgba(col || C.white, 1);
          ctx.fillText(str, x * W, y * H);
        });
      },
      hudRect(x, y, w, h, col, alpha) {
        hud.push(() => {
          ctx.fillStyle = rgba(col, alpha == null ? 1 : alpha);
          ctx.fillRect(x * W, y * H, w * W, h * H);
        });
      },
      flush() {
        items.sort((p, q) => p.z - q.z);
        items.forEach((it) => it.fn());
        hud.forEach((fn) => fn());
      },
    };
    return g;
  }

  function renderFrame(canvas, scene, t, view) {
    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, (scene.bg && scene.bg[0]) || '#16202c');
    bg.addColorStop(1, (scene.bg && scene.bg[1]) || '#0b1118');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (scene.env && envs[scene.env]) envs[scene.env](ctx, canvas.width, canvas.height, t, view);
    const g = makeG(canvas, view);
    scene.draw(g, t, view);
    g.flush();
  }

  // ───────── 장면 등록 ─────────
  function register(sc) {
    scenes[sc.id] = sc;
    (sc.concepts || []).forEach((c) => {
      (byConcept[c] = byConcept[c] || []).push(sc.id);
    });
  }

  // ───────── 재생 팝업 ─────────
  let modal = null;
  function close() {
    if (!modal) return;
    cancelAnimationFrame(modal.raf);
    if (G.animSound) G.animSound.stop();
    document.removeEventListener('keydown', modal.onKey);
    modal.el.remove();
    document.body.classList.remove('anim-open');
    if (modal.opener && modal.opener.focus) modal.opener.focus();
    modal = null;
  }
  const pointMap = {}; // 포인트 id → { scene, mark }
  function open(cid, startId, win) {
    const ids = byConcept[cid] || [];
    if (!ids.length) return;
    close();
    const opener = document.activeElement;
    let cur = startId && scenes[startId] ? startId : ids[0];
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = document.createElement('div');
    el.className = 'anim-overlay';
    el.id = 'anim-overlay';
    const pop = document.createElement('div');
    pop.className = 'anim-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-modal', 'true');
    const head = document.createElement('div');
    head.className = 'anim-head';
    const title = document.createElement('strong');
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn small';
    closeBtn.id = 'anim-close';
    closeBtn.type = 'button';
    closeBtn.textContent = '닫기';
    head.append(title, closeBtn);
    const stage = document.createElement('div');
    stage.className = 'anim-stage';
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 600;
    canvas.id = 'anim-canvas';
    canvas.setAttribute('aria-label', '3D 설명 애니메이션');
    const big = document.createElement('button');
    big.className = 'anim-bigplay';
    big.id = 'anim-bigplay';
    big.type = 'button';
    big.setAttribute('aria-label', '재생');
    big.textContent = '▶';
    stage.append(canvas, big);
    const cap = document.createElement('div');
    cap.className = 'anim-cap';
    cap.id = 'anim-cap';
    cap.setAttribute('aria-live', 'polite');
    const bar = document.createElement('div');
    bar.className = 'anim-bar';
    const fill = document.createElement('i');
    bar.append(fill);
    const ctl = document.createElement('div');
    ctl.className = 'anim-ctl';
    const mk = (id, txt) => {
      const b = document.createElement('button');
      b.className = 'btn small';
      b.type = 'button';
      b.id = id;
      b.textContent = txt;
      return b;
    };
    const playB = mk('anim-play', '▶ 재생');
    const restartB = mk('anim-restart', '⏮ 처음부터');
    const speed = document.createElement('select');
    speed.id = 'anim-speed';
    [['1', '보통'], ['0.5', '느리게'], ['1.5', '빠르게']].forEach(([v, l]) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = l;
      speed.append(o);
    });
    const soundB = mk('anim-sound', '');
    const soundLabel = () => {
      const has = G.animSound && G.animSound.has(cur);
      const on = G.animSound && G.animSound.enabled();
      soundB.textContent = on ? '🎵 배경음악 켜짐' : '🔇 배경음악 꺼짐';
      soundB.setAttribute('aria-pressed', String(!!on));
      soundB.hidden = !G.animSound || !has;
    };
    soundB.onclick = () => {
      if (!G.animSound) return;
      G.animSound.toggle();
      G.animSound.unlock();
      soundLabel();
    };
    ctl.append(playB, restartB, soundB, speed);
    const tabs = document.createElement('div');
    tabs.className = 'anim-tabs';
    const hint = document.createElement('p');
    hint.className = 'muted small anim-hint';
    hint.textContent = '화면을 끌어서 돌려 볼 수 있어. 손가락 두 개나 휠로 가까이·멀리 볼 수 있어.';
    pop.append(head, stage, cap, bar, ctl, tabs, hint);
    el.append(pop);
    document.body.append(el);
    document.body.classList.add('anim-open');

    const view = { yaw: 0.5, pitch: 0.32, dist: 7.5 };
    const applyView = () => Object.assign(view, { yaw: 0.5, pitch: 0.32, dist: 6.2, sx: 0, sy: 0 }, scenes[cur].view || {});
    const st = { t: 0, playing: false, last: 0, speed: 1, started: false };
    let range = win && win.to > win.from ? { from: win.from, to: win.to, label: win.label || '' } : null; // 한 구간만 반복
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    modal = { el, raf: 0, opener, onKey };
    const sc = () => scenes[cur];
    const paint = () => {
      const s = sc();
      renderFrame(canvas, s, st.t, view);
      const a0 = range ? range.from : 0;
      const a1 = range ? range.to : s.duration;
      fill.style.width = (100 * clamp((st.t - a0) / (a1 - a0), 0, 1)) + '%';
      const c = (s.captions || []).find((x) => st.t >= x.t0 && st.t < x.t1) || (s.captions || [])[s.captions.length - 1];
      cap.textContent = c ? c.text : '';
    };
    const setPlaying = (v) => {
      st.playing = v;
      playB.textContent = v ? '⏸ 멈춤' : '▶ 재생';
      if (G.animSound) {
        if (v) G.animSound.unlock();
        else G.animSound.pause();
      }
      big.hidden = v || st.started;
      if (v) {
        st.started = true;
        big.hidden = true;
        st.last = performance.now();
      }
    };
    const loop = (now) => {
      if (!modal || modal.el !== el) return;
      if (st.playing) {
        const dt = Math.min(0.1, (now - st.last) / 1000) * st.speed;
        st.last = now;
        st.t += dt;
        if (range) {
          if (st.t >= range.to || st.t < range.from) st.t = range.from;
        } else if (st.t >= sc().duration) st.t = 0;
        paint();
        if (G.animSound) G.animSound.frame(cur, st.t, true);
      }
      modal.raf = requestAnimationFrame(loop);
    };
    const pick = (id) => {
      if (id !== cur) range = null; // 다른 장면으로 바꾸면 구간 제한을 푼다
      cur = id;
      if (G.animSound) G.animSound.stop();
      soundLabel();
      applyView();
      st.t = 0;
      st.started = false;
      title.textContent = '3D로 보기 · ' + sc().title + (range && range.label ? ' · ' + range.label : '');
      pop.setAttribute('aria-label', sc().title);
      tabs.textContent = '';
      if (ids.length > 1) {
        ids.forEach((i) => {
          const b = document.createElement('button');
          b.className = 'chip';
          b.type = 'button';
          b.textContent = scenes[i].title;
          b.setAttribute('aria-pressed', String(i === cur));
          b.onclick = () => pick(i);
          tabs.append(b);
        });
      }
      st.t = range ? range.from : sc().poster != null ? sc().poster : 0;
      setPlaying(false);
      big.hidden = false;
      paint();
      st.t = range ? range.from : 0;
    };
    // 조작
    closeBtn.onclick = close;
    el.addEventListener('click', (e) => {
      if (e.target === el) close();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === ' ' && e.target === document.body) e.preventDefault();
    });
    big.onclick = () => setPlaying(true);
    playB.onclick = () => setPlaying(!st.playing);
    restartB.onclick = () => {
      st.t = range ? range.from : 0;
      setPlaying(true);
      paint();
    };
    speed.onchange = () => (st.speed = Number(speed.value));
    bar.onclick = (e) => {
      const r = bar.getBoundingClientRect();
      const f = clamp((e.clientX - r.left) / r.width, 0, 0.999);
      st.t = range ? range.from + f * (range.to - range.from) : f * sc().duration;
      paint();
    };
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      view.yaw = drag.yaw + (e.clientX - drag.x) * 0.008;
      view.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.008, -1.3, 1.3);
      if (!st.playing) paint();
    });
    const up = () => (drag = null);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      view.dist = clamp(view.dist + e.deltaY * 0.004, 3.5, 14);
      if (!st.playing) paint();
    }, { passive: false });
    pick(cur);
    modal.raf = requestAnimationFrame(loop);
    closeBtn.focus();
    if (reduce) big.title = '움직임 줄이기 설정이라 자동으로 재생하지 않아. 재생을 눌러 봐.';
  }

  // 단락의 "포인트별로 풀어 보기" 카드: 그 포인트와 가장 가까운 장면·구간을 연결한다
  function mapPoint(pid, sceneId, mark) {
    pointMap[pid] = { scene: sceneId, mark: mark || null };
  }
  function pointInfo(pid, cid) {
    const ids = byConcept[cid] || [];
    if (!ids.length) return null;
    const m = pointMap[pid];
    const sceneId = m && scenes[m.scene] ? m.scene : ids[0];
    const sc = scenes[sceneId];
    const mk = m && m.mark && sc.marks ? sc.marks[m.mark] : null;
    return { scene: sceneId, label: mk ? mk.label : '', from: mk ? mk.from : 0, to: mk ? mk.to : sc.duration, mapped: !!mk };
  }
  function openPoint(pid, cid) {
    const info = pointInfo(pid, cid);
    if (!info) return;
    open(cid, info.scene, info.mapped ? { from: info.from, to: info.to, label: info.label } : null);
  }

  G.anim3d = {
    register,
    registerEnv: (name, fn) => {
      envs[name] = fn;
    },
    mapPoint,
    pointInfo,
    openPoint,
    open,
    close,
    scenesFor: (cid) => (byConcept[cid] || []).map((id) => scenes[id]),
    openScene: (id) => {
      const sc = scenes[id];
      if (sc) open((sc.concepts || [])[0], id);
    },
    has: (cid) => !!(byConcept[cid] && byConcept[cid].length),
    count: (cid) => (byConcept[cid] || []).length,
    list: () => Object.keys(scenes),
    scene: (id) => scenes[id],
    // 시험용: 장면을 한 프레임 그려서 캔버스를 돌려줌
    _render(id, t, canvas) {
      const cv = canvas || document.createElement('canvas');
      if (!canvas) {
        cv.width = 480;
        cv.height = 300;
      }
      renderFrame(cv, scenes[id], t, Object.assign({ yaw: 0.5, pitch: 0.32, dist: 6.2, sx: 0, sy: 0 }, scenes[id].view || {}));
      return cv;
    },
  };
})(globalThis.GISA);
