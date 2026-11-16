// 3D 설명 애니메이션 장면(개념마다 20~30초). 장면은 app/anim3d.js 의 도구(g)로 그린다.
(function (G) {
  'use strict';
  if (!G.anim3d) return;
  const { clamp, ease } = G.vec3;
  const C = G.anim3dColors;
  const TAU = Math.PI * 2;
  const frac = (x) => x - Math.floor(x);
  // 구간별 값을 이어 붙인 누적 적분 (속도가 구간마다 다른 움직임용)
  const cum = (t, segs) => {
    let s = 0;
    let t0 = 0;
    for (const [dur, v] of segs) {
      const dt = clamp(t - t0, 0, dur);
      s += v * dt;
      t0 += dur;
      if (t <= t0) break;
    }
    return s;
  };
  const pick = (t, arr) => (arr.find((x) => t < x[0]) || arr[arr.length - 1])[1];

  // ───────── 2) 전류가 만드는 자계: 앙페르 오른나사 ─────────
  G.anim3d.register({
    id: 'wire-field',
    marks: { dir: { label: '자계의 방향', from: 0, to: 8 }, current: { label: '전류가 커지면', from: 8, to: 16 }, dist: { label: '거리가 멀어지면', from: 16, to: 24 } },
    view: { yaw: 0.45, pitch: 0.28, dist: 7.6 },
    title: '전류가 만드는 자계 (오른나사 법칙)',
    concepts: ['em-magfield'],
    duration: 24,
    captions: [
      { t0: 0, t1: 8, text: '전선에 전류가 위로 흐르면, 전선 둘레에 자계가 동그랗게 생겨. 오른손 엄지를 전류 방향으로 두면 네 손가락이 감기는 방향이 자계 방향이야.' },
      { t0: 8, t1: 16, text: '전류가 커지면 자계도 세져서 자력선이 더 빽빽하고 진해져. (H = I / 2πr)' },
      { t0: 16, t1: 24, text: '전선에서 멀어질수록 자계는 약해져. 거리 r 에 반비례해.' },
    ],
    draw(g, t) {
      const I = t < 8 ? 1 : 2;
      const sp = cum(t, [[8, 0.22], [8, 0.45], [8, 0.45]]);
      g.cyl([0, -2.6, 0], [0, 2.6, 0], 0.07, C.wire, 1, 12);
      for (let i = 0; i < 12; i++) g.dot([0, -2.6 + frac(i / 12 + sp) * 5.2, 0], 0.1, C.yellow, true);
      const heights = [-1.6, -0.5, 0.6, 1.7];
      const radii = t < 8 ? [0.9, 1.5, 2.1] : [0.7, 1.1, 1.5, 2.1, 2.7];
      heights.forEach((y, hi) => {
        radii.forEach((r, ri) => {
          const alpha = t >= 16 ? 1 - ri / (radii.length + 1) : 1;
          const col = [C.blue[0] * alpha + 20, C.blue[1] * alpha + 20, C.blue[2] * alpha + 20];
          g.ring([0, y, 0], [0, 1, 0], r, col, 0.012 * I + 0.012, 48);
          const th = sp * 4 + hi * 1.3 + ri * 0.8;
          g.dot([r * Math.cos(th), y, -r * Math.sin(th)], 0.075, C.white, true);
        });
      });
      g.arrow([0.28, 1.0, 0], [0.28, 2.3, 0], C.green, 0.05);
      g.text([0.9, 2.45, 0], '엄지 = 전류 I', C.green, 0.2);
      g.text([2.6, 1.0, 0], '네 손가락 = 자계 B', C.blue, 0.2);
      g.hud(0.04, 0.95, 'I = ' + (I === 1 ? '작음' : '큼'), C.white, 22);
    },
  });

  // ───────── 3) 플레밍의 왼손 법칙 ─────────
  G.anim3d.register({
    id: 'fleming-left',
    marks: { field: { label: '자계 방향', from: 0, to: 6 }, current: { label: '전류 방향', from: 6, to: 12 }, force: { label: '힘이 생기는 방향', from: 12, to: 20 }, hand: { label: '왼손 법칙', from: 20, to: 28 } },
    view: { yaw: 0.6, pitch: 0.3, dist: 6.6 },
    title: '플레밍의 왼손 법칙 (전자력)',
    concepts: ['em-force'],
    duration: 28,
    captions: [
      { t0: 0, t1: 6, text: '자석의 N극에서 S극으로 자계(자기장)가 생겨. 방향은 N → S.' },
      { t0: 6, t1: 12, text: '자계 속의 도선에 전류를 흘리면 전류 방향은 도선을 따라가.' },
      { t0: 12, t1: 20, text: '자계와 전류가 수직이면 둘 모두에 수직인 방향으로 힘이 생겨서 도선이 움직여. F = B·I·ℓ' },
      { t0: 20, t1: 28, text: '왼손 검지 = 자계 B, 중지 = 전류 I, 엄지 = 힘 F. 서로 직각으로 펴면 돼(전동기의 원리).' },
    ],
    draw(g, t) {
      g.box([-3.0, 0, 0], [1.0, 1.9, 2.4], C.red, 1);
      g.box([3.0, 0, 0], [1.0, 1.9, 2.4], C.blue, 1);
      g.text([-3.0, 1.25, 0], 'N', C.white, 0.3);
      g.text([3.0, 1.25, 0], 'S', C.white, 0.3);
      for (let zi = -1; zi <= 1; zi++) for (let yi = -1; yi <= 1; yi++) g.arrow([-2.2, yi * 0.55, zi * 0.8], [2.2, yi * 0.55, zi * 0.8], [150, 190, 250], 0.015);
      g.text([0, -1.35, 1.6], '자계 B (N → S)', C.blue, 0.2);
      const hasI = t >= 6;
      const lift = ease((t - 12) / 4) * (t < 20 ? 1 : 1) * 0.85;
      const y0 = lift;
      if (hasI) {
        g.line([0, y0, -1.9], [0, y0, 1.9], C.wire, 0.09);
        const sp = cum(t, [[6, 0], [22, 0.5]]);
        for (let i = 0; i < 9; i++) g.dot([0, y0, -1.9 + frac(i / 9 + sp) * 3.8], 0.09, C.yellow, true);
        g.text([0, y0 + 0.35, 1.9], '전류 I', C.yellow, 0.2);
      }
      if (t >= 12) {
        const a = ease((t - 12) / 2);
        g.arrow([0, y0 + 0.15, 0], [0, y0 + 0.15 + 1.3 * a, 0], C.green, 0.06);
        g.text([0.7, y0 + 0.9 * a + 0.3, 0], '힘 F', C.green, 0.22);
      }
      if (t >= 20) {
        const o = [3.2, -1.3, 1.6];
        const k = ease((t - 20) / 1.5);
        g.arrow(o, [o[0] - 1.4 * k, o[1], o[2]], C.blue, 0.045);
        g.arrow(o, [o[0], o[1], o[2] - 1.4 * k], C.yellow, 0.045);
        g.arrow(o, [o[0], o[1] + 1.4 * k, o[2]], C.green, 0.045);
        g.text([o[0] - 1.7, o[1] - 0.3, o[2]], '검지 B', C.blue, 0.17);
        g.text([o[0] + 0.1, o[1] - 0.3, o[2] - 1.6], '중지 I', C.yellow, 0.17);
        g.text([o[0] + 0.5, o[1] + 1.55, o[2]], '엄지 F', C.green, 0.17);
      }
    },
  });

  // ───────── 4) 전자 유도 ─────────
  G.anim3d.register({
    id: 'induction',
    marks: { move: { label: '자속이 변할 때', from: 0, to: 8 }, fast: { label: '더 빨리 변할 때', from: 8, to: 16 }, stop: { label: '멈췄을 때', from: 16, to: 24 } },
    view: { yaw: 0.3, pitch: 0.18, dist: 6.2 },
    title: '전자 유도 (패러데이 법칙)',
    concepts: ['em-induction', 'em-inductance'],
    duration: 24,
    captions: [
      { t0: 0, t1: 8, text: '자석을 코일 안팎으로 움직이면 코일에 지나는 자속이 바뀌고, 그 순간 전류가 흘러(검류계 바늘이 움직여).' },
      { t0: 8, t1: 16, text: '자석을 더 빠르게 움직이면 자속이 더 빨리 바뀌어서 기전력이 더 커져. (e = −N·dΦ/dt)' },
      { t0: 16, t1: 24, text: '자석이 멈추면 자속이 변하지 않으니까 전류가 흐르지 않아. 방향은 변화를 방해하는 쪽(렌츠 법칙).' },
    ],
    draw(g, t) {
      let x;
      let v;
      if (t < 8) {
        x = 2.4 * Math.sin((TAU * t) / 8);
        v = 2.4 * (TAU / 8) * Math.cos((TAU * t) / 8);
      } else if (t < 16) {
        x = 2.4 * Math.sin((TAU * (t - 8)) / 4);
        v = 2.4 * (TAU / 4) * Math.cos((TAU * (t - 8)) / 4);
      } else {
        x = 0;
        v = 0;
      }
      g.helix([-1.1, 0, 0], [1.1, 0, 0], 0.9, 7, C.wire, 0.06);
      g.box([x - 0.55, 0, 0], [1.1, 0.7, 0.7], C.red, 1);
      g.box([x + 0.55, 0, 0], [1.1, 0.7, 0.7], C.blue, 1);
      g.text([x - 0.55, 0.65, 0], 'N', C.white, 0.22);
      g.text([x + 0.55, 0.65, 0], 'S', C.white, 0.22);
      // 검류계
      const c = [0, 1.9, -0.2];
      g.ring(c, [0, 0, 1], 0.9, C.gray, 0.04, 40, 0.35, Math.PI - 0.35);
      const ang = Math.PI / 2 - clamp(v / 4, -1, 1) * 0.95;
      g.arrow(c, [c[0] + 0.78 * Math.cos(ang), c[1] + 0.78 * Math.sin(ang), c[2]], C.yellow, 0.04);
      g.dot(c, 0.07, C.white);
      g.text([0, 2.8, -0.2], '검류계(전류의 세기·방향)', C.white, 0.17);
      const cur = clamp(v / 4, -1, 1);
      if (Math.abs(cur) > 0.05) {
        for (let i = 0; i < 14; i++) {
          const ang = (i * TAU) / 14 + t * 3 * cur;
          g.dot([-1.1 + (i / 13) * 2.2, 0.9 * Math.cos(ang), 0.9 * Math.sin(ang)], 0.05 + 0.04 * Math.abs(cur), C.yellow, true);
        }
      }
      g.hud(0.04, 0.95, Math.abs(v) < 0.05 ? '자석 정지 → 전류 0' : '자석이 움직이는 중 → 전류가 흘러', C.white, 20);
    },
  });

  // ───────── 5) 3상 교류와 회전 자계 ─────────
  G.anim3d.register({
    id: 'three-phase-field',
    marks: { wave: { label: '3상 파형', from: 0, to: 8 }, coils: { label: '세 코일의 자계', from: 8, to: 16 }, rot: { label: '회전 자계', from: 16, to: 24 } },
    view: { yaw: 0.15, pitch: 0.7, dist: 6.8 },
    title: '3상 교류와 회전 자계',
    concepts: ['three-phase', 'y-delta', 'symcomp'],
    duration: 24,
    captions: [
      { t0: 0, t1: 8, text: '3상 교류는 같은 모양의 사인파 세 개가 120°씩 어긋나 있어(a, b, c 상).' },
      { t0: 8, t1: 16, text: '120° 간격으로 놓은 세 코일에 이 전류를 흘리면, 각 코일이 만드는 자계(화살표)가 시간에 따라 커졌다 작아졌다 해.' },
      { t0: 16, t1: 24, text: '세 자계를 합치면 크기가 일정한 하나의 자계가 되고, 그게 원을 그리며 돌아. 이게 회전 자계야(유도·동기 전동기의 원리).' },
    ],
    draw(g, t) {
      const w = TAU / 6;
      const cols = [C.red, C.green, C.blue];
      const names = ['a', 'b', 'c'];
      const lag = [0, TAU / 3, (2 * TAU) / 3];
      const axes = [0, 1, 2].map((k) => {
        const p = Math.PI / 2 + k * ((2 * Math.PI) / 3);
        return [Math.cos(p), 0, -Math.sin(p)];
      });
      // 파형(뒤쪽 벽)
      for (let k = 0; k < 3; k++) {
        let prev = null;
        for (let i = 0; i <= 60; i++) {
          const x = -3 + (i / 60) * 6;
          const th = ((x + 3) / 6) * TAU;
          const y = 1.5 + 0.6 * Math.sin(th - lag[k]);
          const p = [x, y, -2.6];
          if (prev) g.line(prev, p, cols[k], 0.03);
          prev = p;
        }
      }
      const cx = -3 + frac((w * t) / TAU) * 6;
      g.line([cx, 0.7, -2.6], [cx, 2.4, -2.6], C.white, 0.015);
      for (let k = 0; k < 3; k++) {
        const th = ((cx + 3) / 6) * TAU;
        g.dot([cx, 1.5 + 0.6 * Math.sin(th - lag[k]), -2.6], 0.09, cols[k], true);
      }
      // 코일 세 개와 순간 자계
      const ik = [0, 1, 2].map((k) => Math.sin(w * t - lag[k]));
      const show = t >= 8;
      let sum = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        const ax = axes[k];
        g.box([ax[0] * 2.1, 0, ax[2] * 2.1], [0.5, 0.5, 0.5], cols[k], 1);
        g.text([ax[0] * 2.55, 0.15, ax[2] * 2.55], names[k] + '상', cols[k], 0.2);
        const m = ik[k];
        if (show) g.arrow([0, 0, 0], [ax[0] * m * 1.5, 0, ax[2] * m * 1.5], cols[k], 0.035);
        sum = [sum[0] + ax[0] * m, 0, sum[2] + ax[2] * m];
      }
      g.ring([0, 0, 0], [0, 1, 0], 1.5, [90, 100, 115], 0.012, 60);
      if (t >= 16) {
        g.arrow([0, 0.05, 0], [sum[0] * 1.0, 0.05, sum[2] * 1.0], C.yellow, 0.09);
        g.text([sum[0] * 1.35, 0.4, sum[2] * 1.35], '합성 자계(회전)', C.yellow, 0.2);
      }
      g.hud(0.04, 0.95, t < 8 ? '전류 파형 (120° 차이)' : t < 16 ? '각 코일의 자계' : '합성하면 일정한 크기로 회전', C.white, 20);
    },
  });

  // ───────── 6) 유도 전동기: 슬립 ─────────
  G.anim3d.register({
    id: 'im-slip',
    marks: { start: { label: '기동 때(슬립 큼)', from: 0, to: 8 }, run: { label: '운전 중(슬립 작음)', from: 8, to: 16 }, sync: { label: '동기 속도(슬립 0)', from: 16, to: 24 } },
    view: { yaw: 0.3, pitch: 0.7, dist: 6.0 },
    title: '유도 전동기의 회전 (슬립)',
    concepts: ['mc-im-slip', 'mc-im-power'],
    duration: 24,
    captions: [
      { t0: 0, t1: 8, text: '고정자의 회전 자계(노란 화살표)가 먼저 돌고, 회전자는 그 자계를 따라 돌아가며 끌려가. 처음엔 많이 뒤처져(슬립 s = 0.5).' },
      { t0: 8, t1: 16, text: '속도가 오르면 회전자가 자계를 거의 따라잡아. 슬립 s = (Ns − N)/Ns 가 0.1 정도로 작아져.' },
      { t0: 16, t1: 24, text: '회전자가 동기 속도 Ns 와 같아지면(s = 0) 자속을 끊지 못해서 전류도 토크도 0 이 돼. 그래서 유도 전동기는 항상 동기 속도보다 조금 느려.' },
    ],
    draw(g, t) {
      const ws = 2.4;
      const s = pick(t, [[8, 0.5], [16, 0.1], [24, 0]]);
      const thS = ws * t;
      const thR = cum(t, [[8, 0.5 * ws], [8, 0.9 * ws], [8, 1.0 * ws]]);
      // 고정자
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        g.box([2.2 * Math.cos(a), 0, -2.2 * Math.sin(a)], [0.5, 0.9, 0.5], i % 2 ? C.dark : [95, 110, 130], 1);
      }
      g.ring([0, 0.5, 0], [0, 1, 0], 2.2, [90, 100, 115], 0.01, 60);
      g.arrow([0, 0.55, 0], [1.9 * Math.cos(thS), 0.55, -1.9 * Math.sin(thS)], C.yellow, 0.08);
      g.text([2.7 * Math.cos(thS), 1.0, -2.7 * Math.sin(thS)], '회전 자계', C.yellow, 0.2);
      // 회전자
      g.cyl([0, -0.35, 0], [0, 0.35, 0], 1.25, C.gray, 1, 24);
      g.line([0, 0.4, 0], [1.2 * Math.cos(thR), 0.4, -1.2 * Math.sin(thR)], C.red, 0.1);
      g.dot([1.2 * Math.cos(thR), 0.4, -1.2 * Math.sin(thR)], 0.12, C.red, true);
      g.text([0, 1.5, 0], '회전자', C.red, 0.2);
      const Ns = 1800;
      g.hud(0.04, 0.95, '동기 속도 Ns = ' + Ns + ' rpm   회전자 N = ' + Math.round(Ns * (1 - s)) + ' rpm', C.white, 20);
      g.hud(0.04, 0.89, '슬립 s = (Ns − N)/Ns = ' + s, C.yellow, 20);
    },
  });

  // ───────── 7) 변압기 ─────────
  G.anim3d.register({
    id: 'transformer',
    marks: { flux: { label: '자속이 전압을 만드는 과정', from: 0, to: 8 }, down: { label: '강압(N2 < N1)', from: 8, to: 16 }, up: { label: '승압(N2 > N1)', from: 16, to: 24 } },
    view: { yaw: 0.25, pitch: 0.15, dist: 7.2 },
    title: '변압기: 권수비와 전압',
    concepts: ['mc-tr-ratio', 'mc-tr-eff', 'mc-tr-reg'],
    duration: 24,
    captions: [
      { t0: 0, t1: 8, text: '1차 코일에 교류를 흘리면 철심 안에 계속 변하는 자속이 생겨. 그 자속이 2차 코일을 지나면서 전압을 만들어.' },
      { t0: 8, t1: 16, text: '2차 코일을 적게 감으면(N2 < N1) 전압이 낮아져. 전압의 비는 권수의 비와 같아: V2/V1 = N2/N1.' },
      { t0: 16, t1: 24, text: '2차 코일을 많이 감으면(N2 > N1) 전압이 높아져(승압). 대신 전류는 그만큼 줄어서 전력은 같아.' },
    ],
    draw(g, t) {
      const N2 = pick(t, [[8, 6], [16, 3], [24, 12]]);
      const V2 = (N2 / 6) * 100;
      // 철심
      const gray = [120, 130, 145];
      g.box([0, 1.55, 0], [5.0, 0.7, 0.8], gray, 1);
      g.box([0, -1.55, 0], [5.0, 0.7, 0.8], gray, 1);
      g.box([-2.15, 0, 0], [0.7, 2.4, 0.8], gray, 1);
      g.box([2.15, 0, 0], [0.7, 2.4, 0.8], gray, 1);
      // 코일
      g.helix([-2.15, -0.9, 0], [-2.15, 0.9, 0], 0.62, 6, C.wire, 0.07);
      g.helix([2.15, -0.9, 0], [2.15, 0.9, 0], 0.62, Math.max(2, N2 / 1.5), [90, 200, 190], 0.07);
      g.text([-2.15, 2.4, 0], '1차 코일 N1 = 600회', C.wire, 0.18);
      g.text([2.15, 2.4, 0], '2차 코일 N2 = ' + N2 * 100 + '회', [90, 200, 190], 0.18);
      // 자속 입자 (왕복)
      const off = 0.12 * (1 - Math.cos((TAU * t) / 3));
      const per = [[-2.15, -1.55], [2.15, -1.55], [2.15, 1.55], [-2.15, 1.55]];
      const lens = [4.3, 3.1, 4.3, 3.1];
      const total = 14.8;
      for (let i = 0; i < 30; i++) {
        let d = frac(i / 30 + off) * total;
        let k = 0;
        while (d > lens[k]) {
          d -= lens[k];
          k++;
        }
        const a = per[k];
        const b = per[(k + 1) % 4];
        const f = d / lens[k];
        g.dot([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0.55], 0.06, C.yellow, true);
      }
      g.text([0, 0, 0.6], '교번 자속 Φ', C.yellow, 0.2);
      // 전압 막대
      g.box([-4.0, -0.7, 0], [0.5, 1.0, 0.5], C.wire, 1);
      g.box([4.0, -1.2 + (V2 / 100) * 0.5 * 1.0, 0], [0.5, (V2 / 100) * 1.0, 0.5], [90, 200, 190], 1);
      g.text([-4.0, 0.0, 0], 'V1 = 100 V', C.wire, 0.18);
      g.text([4.0, -1.2 + (V2 / 100) * 1.0 + 0.3, 0], 'V2 = ' + V2 + ' V', [90, 200, 190], 0.18);
      g.hud(0.04, 0.95, 'V2 / V1 = N2 / N1 = ' + N2 * 100 + ' / 600 = ' + (N2 / 6).toFixed(2), C.white, 22);
    },
  });

  // ───────── 8) 콘덴서의 충전 ─────────
  G.anim3d.register({
    id: 'capacitor',
    marks: { charge: { label: '충전되는 중', from: 0, to: 10 }, full: { label: '충전이 끝났을 때', from: 10, to: 16 }, dielec: { label: '유전체를 넣으면', from: 16, to: 24 } },
    view: { yaw: 0.6, pitch: 0.15, dist: 6.6 },
    title: '콘덴서: 충전과 정전용량',
    concepts: ['em-capacitor', 'transient', 'dielectric'],
    duration: 24,
    captions: [
      { t0: 0, t1: 10, text: '전지에 연결하면 한쪽 극판엔 +전하, 다른 쪽엔 −전하가 쌓여. 처음엔 전류가 크고, 충전될수록 줄어들어(시정수 τ = RC).' },
      { t0: 10, t1: 16, text: '충전이 끝나면 전류는 0 이고, 콘덴서 전압은 전지 전압과 같아져. 직류에서 콘덴서는 끊어진 것처럼 행동해.' },
      { t0: 16, t1: 24, text: '극판 사이에 유전체를 넣으면 같은 전압에서도 전하가 더 많이 쌓여. 정전용량 C = ε·S/d 가 커지기 때문이야.' },
    ],
    draw(g, t) {
      const tau = 2.5;
      let q;
      if (t < 10) q = 1 - Math.exp(-t / tau);
      else if (t < 16) q = 1 - Math.exp(-10 / tau);
      else q = (1 - Math.exp(-10 / tau)) * (1 + ease((t - 16) / 3) * 1.0);
      const cur = t < 10 ? Math.exp(-t / tau) : t < 16 ? 0 : t < 19 ? Math.exp(-(t - 16) / 1.2) * 0.35 : 0;
      const dielec = t >= 16;
      // 극판
      g.box([-0.9, 0, 0], [0.16, 2.4, 2.4], C.red, 1);
      g.box([0.9, 0, 0], [0.16, 2.4, 2.4], C.blue, 1);
      if (dielec) g.box([0, 0, 0], [1.5, 2.2, 2.2], C.purple, 0.28);
      // 전하
      const n = Math.round(q * 16);
      for (let i = 0; i < n; i++) {
        const y = -0.9 + (i % 4) * 0.6;
        const z = -0.9 + Math.floor(i / 4) * 0.6;
        g.dot([-0.7, y, z], 0.07, C.red, true);
        g.dot([0.7, y, z], 0.07, C.blue, true);
      }
      // 전기력선
      for (let yi = -1; yi <= 1; yi++) for (let zi = -1; zi <= 1; zi++) {
        if (q * 3 > Math.abs(yi) + Math.abs(zi) * 0.5) g.arrow([-0.65, yi * 0.7, zi * 0.7], [0.65, yi * 0.7, zi * 0.7], [255, 220, 120], 0.012);
      }
      // 회로와 전지
      g.line([-0.9, 1.2, 0], [-0.9, 2.1, 0], C.wire, 0.05);
      g.line([0.9, 1.2, 0], [0.9, 2.1, 0], C.wire, 0.05);
      g.line([-0.9, 2.1, 0], [-0.3, 2.1, 0], C.wire, 0.05);
      g.line([0.3, 2.1, 0], [0.9, 2.1, 0], C.wire, 0.05);
      g.box([0, 2.1, 0], [0.5, 0.45, 0.4], C.yellow, 1);
      g.text([0, 2.7, 0], '전지', C.yellow, 0.18);
      const sp = cum(t, [[10, 0.6], [6, 0], [8, 0.2]]);
      if (cur > 0.03) {
        for (let i = 0; i < 8; i++) {
          const f = frac(i / 8 + sp);
          g.dot([-0.9, 1.2 + f * 0.9, 0], 0.07 * (0.5 + cur), C.blue, true);
          g.dot([0.9, 2.1 - f * 0.9, 0], 0.07 * (0.5 + cur), C.blue, true);
        }
      }
      // 전압 막대
      g.box([2.8, -1.2 + q * 0.9, 0], [0.4, q * 1.8, 0.4], C.green, 1);
      g.text([2.8, -1.55, 0], '전하 Q', C.green, 0.17);
      g.hud(0.04, 0.95, dielec ? '유전체를 넣음 → C 증가, Q = C·V 증가' : '전류 i 는 점점 줄고 전압 v 는 전지 전압으로', C.white, 20);
    },
  });

  // 포인트 카드의 ▶ 버튼이 여는 장면·구간 (연결 안 된 포인트는 그 개념의 첫 장면을 처음부터)
  G.anim3d.mapPoint('ohm-current', 'ohm-water', 'both');
  G.anim3d.mapPoint('ohm-voltage', 'ohm-water', 'voltage');
  G.anim3d.mapPoint('ohm-resistance', 'ohm-water', 'resistance');
  G.anim3d.mapPoint('ohm-cells', 'ohm-water', 'base');
  G.anim3d.mapPoint('s:st-kg-isrc', 'ohm-water', 'base');
  G.anim3d.mapPoint('series-total', 'ohm-water', 'resistance');
  G.anim3d.mapPoint('series-current', 'ohm-water', 'both');
  G.anim3d.mapPoint('em-mag-wire', 'wire-field', 'dir');
  G.anim3d.mapPoint('em-mag-coil', 'wire-field', 'current');
  G.anim3d.mapPoint('em-mag-solenoid', 'wire-field', 'current');
  G.anim3d.mapPoint('em-force-bil', 'fleming-left', 'force');
  G.anim3d.mapPoint('mg-force', 'fleming-left', 'force');
  G.anim3d.mapPoint('em-force-parallel', 'fleming-left', 'hand');
  G.anim3d.mapPoint('s:st-em-parallel-current', 'fleming-left', 'hand');
  G.anim3d.mapPoint('em-faraday', 'induction', 'fast');
  G.anim3d.mapPoint('em-motional', 'induction', 'move');
  G.anim3d.mapPoint('mg-emf', 'induction', 'move');
  G.anim3d.mapPoint('s:st-kg-mg7', 'induction', 'move');
  G.anim3d.mapPoint('em-ind-self', 'induction', 'fast');
  G.anim3d.mapPoint('em-ind-mutual', 'induction', 'move');
  G.anim3d.mapPoint('em-ind-energy', 'induction', 'move');
  G.anim3d.mapPoint('tp-power', 'three-phase-field', 'wave');
  G.anim3d.mapPoint('tp-current', 'three-phase-field', 'wave');
  G.anim3d.mapPoint('s:st-kg-harm-seq', 'three-phase-field', 'rot');
  G.anim3d.mapPoint('yd-voltage', 'three-phase-field', 'coils');
  G.anim3d.mapPoint('yd-current', 'three-phase-field', 'coils');
  G.anim3d.mapPoint('yd-load', 'three-phase-field', 'coils');
  G.anim3d.mapPoint('yd-convert', 'three-phase-field', 'coils');
  G.anim3d.mapPoint('yd-nphase', 'three-phase-field', 'coils');
  G.anim3d.mapPoint('sc-comp', 'three-phase-field', 'rot');
  G.anim3d.mapPoint('sc-slg', 'three-phase-field', 'coils');
  G.anim3d.mapPoint('sc-cur', 'three-phase-field', 'rot');
  G.anim3d.mapPoint('sc-unbal', 'three-phase-field', 'rot');
  G.anim3d.mapPoint('mc-im-slip', 'im-slip', 'run');
  G.anim3d.mapPoint('mc-im-speed', 'im-slip', 'run');
  G.anim3d.mapPoint('s:st-mc-slip1', 'im-slip', 'start');
  G.anim3d.mapPoint('mc-im-power', 'im-slip', 'run');
  G.anim3d.mapPoint('mc-im-torque-v', 'im-slip', 'start');
  G.anim3d.mapPoint('mc-tr-ratio', 'transformer', 'down');
  G.anim3d.mapPoint('mc-tr-eff', 'transformer', 'flux');
  G.anim3d.mapPoint('mc-tr-maxeff', 'transformer', 'flux');
  G.anim3d.mapPoint('s:st-mc-ironloss', 'transformer', 'flux');
  G.anim3d.mapPoint('mc-tr-reg', 'transformer', 'down');
  G.anim3d.mapPoint('em-cap-energy', 'capacitor', 'full');
  G.anim3d.mapPoint('cap-w', 'capacitor', 'full');
  G.anim3d.mapPoint('em-cap-plate', 'capacitor', 'dielec');
  G.anim3d.mapPoint('em-cap-scale', 'capacitor', 'dielec');
  G.anim3d.mapPoint('cap-glass', 'capacitor', 'dielec');
  G.anim3d.mapPoint('tr-tau', 'capacitor', 'charge');
  G.anim3d.mapPoint('tr-step', 'capacitor', 'charge');
  G.anim3d.mapPoint('tr-inv', 'capacitor', 'charge');
  G.anim3d.mapPoint('tr-sol', 'capacitor', 'charge');
  G.anim3d.mapPoint('s:st-tr-rc', 'capacitor', 'full');
  G.anim3d.mapPoint('s:st-kg-tr1', 'capacitor', 'charge');
  G.anim3d.mapPoint('di-two', 'capacitor', 'dielec');
  G.anim3d.mapPoint('di-angle', 'capacitor', 'dielec');
  G.anim3d.mapPoint('di-pol', 'capacitor', 'dielec');
  G.anim3d.mapPoint('s:st-di-bound', 'capacitor', 'dielec');
  G.anim3d.mapPoint('s:st-kg-dielec', 'capacitor', 'dielec');
})(globalThis.GISA);
