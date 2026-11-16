// 옴의 법칙 3D 장면: 탁자 위에 실제 부품(건전지·저항기·전류계)으로 회로를 꾸미고,
// 오른쪽 위에는 같은 상황을 물 비유로 같이 보여 준다. 숫자는 코드로 계산해서 화면과 항상 맞는다.
(function (G) {
  'use strict';
  if (!G.anim3d) return;
  const { clamp, ease } = G.vec3;
  const C = G.anim3dColors;
  const TAU = Math.PI * 2;
  const frac = (x) => x - Math.floor(x);

  // 구간 경계(초): 8초마다 하나씩 바꾼다
  const T = [8, 16, 24];
  const TR = 1.2; // 값이 바뀌는 데 걸리는 시간
  // 단계별 값을 부드럽게 이어 주는 함수
  const stepv = (t, vals) => {
    let v = vals[0];
    for (let i = 0; i < T.length; i++) v += (vals[i + 1] - vals[i]) * ease(clamp((t - T[i]) / TR, 0, 1));
    return v;
  };
  const VALS_V = [6, 12, 12, 12];
  const VALS_R = [3, 3, 6, 6];
  // 전하가 움직인 거리(전류에 비례) 누적
  const travel = (t) => {
    let s = 0;
    let t0 = 0;
    const I = [2, 4, 2, 2];
    for (let i = 0; i < 4; i++) {
      const dt = clamp(t - t0, 0, 8);
      s += I[i] * dt;
      t0 += 8;
      if (t <= t0) break;
    }
    return s;
  };

  // 저항 색띠: 3 Ω = 주황·검정·금(×0.1), 6 Ω = 파랑·검정·금(×0.1)
  const BAND = { orange: [240, 140, 40], blue: [50, 90, 200], black: [30, 30, 34], gold: [214, 170, 60], silver: [190, 195, 200] };

  const fmt = (x) => (Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1));

  G.anim3d.register({
    id: 'ohm-water',
    marks: {
      base: { label: '전압·저항·전류란', from: 0, to: 8 },
      voltage: { label: '전압을 높이면', from: 8, to: 16 },
      resistance: { label: '저항이 커지면', from: 16, to: 24 },
      both: { label: 'I = V ÷ R', from: 24, to: 32 },
    },
    env: 'workshop',
    bg: ['#2b3442', '#0f141b'],
    view: { yaw: 0.16, pitch: 0.72, dist: 8.9, sx: -0.07, sy: 0.15 },
    poster: 4,
    title: '옴의 법칙: 실제 회로로 보기',
    concepts: ['ohm', 'series', 'parallel', 'divider'],
    duration: 32,
    captions: [
      { t0: 0, t1: 8, text: '건전지(전압 V)가 전하를 밀어 주고, 저항기(R)가 그 흐름을 방해해. 그 결과 회로에 흐르는 양이 전류 I 이고 전류계가 재 줘. 지금은 6 V, 3 Ω 이라 2 A. 오른쪽 위 물탱크는 같은 상황을 물로 바꿔 본 거야.' },
      { t0: 8, t1: 16, text: '건전지를 2개 더 직렬로 달아서 전압을 2배로 올리면(6 V → 12 V), 저항은 그대로인데 전류도 2배(2 A → 4 A)가 돼. 물탱크 물높이를 올리면 물이 더 세게 흐르는 것과 같아. (전류 ∝ 전압)' },
      { t0: 16, t1: 24, text: '저항기를 3 Ω → 6 Ω 으로 바꿔 저항이 2배가 되면 전류는 절반(4 A → 2 A)이 돼. 관이 좁아지면 물이 덜 흐르는 것과 같아. (전류 ∝ 1/저항)' },
      { t0: 24, t1: 32, text: '그래서 I = V ÷ R. 처음(6 V, 3 Ω)과 지금(12 V, 6 Ω)은 전압도 저항도 2배씩이라서 전류가 똑같이 2 A 야.' },
    ],
    draw(g, t) {
      const V = stepv(t, VALS_V);
      const R = stepv(t, VALS_R);
      const I = V / R;
      const Y = 0.48; // 전선·부품 중심 높이
      const spin = travel(t) * 0.028; // 전하가 돈 바퀴 수

      // ── 탁자 ──
      const W = 4.7;
      const D = 3.2;
      const wood = [[176, 128, 82], [168, 120, 76], [182, 134, 88], [160, 114, 72], [174, 126, 80], [166, 118, 75]];
      for (let i = 0; i < 6; i++) {
        const z0 = -D + (i * 2 * D) / 6;
        const z1 = -D + ((i + 1) * 2 * D) / 6;
        g.ground([[-W, 0, z0], [W, 0, z0], [W, 0, z1], [-W, 0, z1]], wood[i], 1);
        g.groundLine([-W, 0, z0], [W, 0, z0], [96, 64, 36], 0.012, 0.8);
        for (let k = 0; k < 3; k++) {
          const gz = z0 + ((k + 1) * (z1 - z0)) / 4;
          g.groundLine([-W + k * 0.7 + i * 0.3, 0, gz], [W - 0.6 - k * 1.1, 0, gz], [140, 98, 58], 0.008, 0.45);
        }
      }
      g.ground([[-W, 0, D], [W, 0, D], [W, -0.35, D], [-W, -0.35, D]], [112, 76, 44], 1);

      // ── 건전지 거치대(뒤쪽 가운데): 칸 4개, 처음엔 2개만 건전지 ──
      const BZ = -1.5; // 뒤쪽 전선 줄
      g.shadow([0, 0, BZ], 1.9, 0.62, 0.3);
      g.setBias(-1.2);
      g.box([0, 0.09, BZ], [3.1, 0.18, 0.95], [44, 48, 56]);
      g.setBias(0);
      const slot = (i) => -0.93 + i * 0.62; // 왼쪽 칸부터. + 는 오른쪽 끝
      for (let i = 0; i < 4; i++) {
        const x = slot(i);
        const drop = i < 2 ? 1 : ease(clamp((t - 8) / 1.0, 0, 1));
        const present = i < 2 || t >= 8;
        if (!present) continue;
        const dy = (1 - drop) * 1.7;
        if (i >= 2 && t < 9) g.cyl([x - 0.25, 0.4, BZ], [x + 0.25, 0.4, BZ], 0.2, [150, 156, 166], 1, 14); // 아직 빈 칸(금속 막대)
        const cy = Y + dy;
        g.cyl([x - 0.27, cy, BZ], [x + 0.27, cy, BZ], 0.28, [58, 112, 176], 1, 24); // 몸통
        g.cyl([x + 0.2, cy, BZ], [x + 0.27, cy, BZ], 0.286, [214, 90, 80], 1, 24); // + 쪽 빨간 띠
        g.cyl([x + 0.27, cy, BZ], [x + 0.31, cy, BZ], 0.11, [215, 218, 225], 1, 14); // + 돌기
        g.cyl([x - 0.27, cy, BZ], [x - 0.2, cy, BZ], 0.286, [60, 60, 66], 1, 24); // − 쪽 띠
      }
      g.box([-1.4, Y, BZ], [0.1, 0.34, 0.4], [200, 204, 212]); // 접촉판(−)
      g.box([1.4, Y, BZ], [0.1, 0.34, 0.4], [200, 204, 212]); // 접촉판(+)
      g.text([1.62, 1.0, BZ], '+', C.red, 0.3);
      g.text([-1.62, 1.0, BZ], '−', C.blue, 0.3);

      // ── 전선(+쪽 빨강, −쪽 검정) ──
      const RED = [200, 60, 55];
      const BLK = [46, 48, 54];
      const XR = 3.2;
      const FZ = 1.5; // 앞쪽 전선 줄
      const cu = (p, q, col) => g.cyl(p, q, 0.075, col, 1, 12);
      cu([1.4, Y, BZ], [XR, Y, BZ], RED);
      cu([XR, Y, BZ], [XR, Y, -0.45], RED);
      cu([XR, Y, 0.45], [XR, Y, FZ], BLK);
      cu([XR, Y, FZ], [0.9, Y, FZ], BLK);
      cu([-0.9, Y, FZ], [-XR, Y, FZ], BLK);
      cu([-XR, Y, FZ], [-XR, Y, BZ], BLK);
      cu([-XR, Y, BZ], [-1.4, Y, BZ], BLK);
      [[XR, BZ, RED], [XR, FZ, BLK], [-XR, FZ, BLK], [-XR, BZ, BLK]].forEach((c) => g.dot([c[0], Y, c[1]], 0.075, c[2], false));

      // ── 저항기(앞쪽 가운데): 색띠가 있는 세라믹 저항 ──
      let hop = 0;
      if (t >= T[1] && t < T[1] + 1.5) hop = Math.sin(Math.PI * ((t - T[1]) / 1.5)) * 0.95;
      const big = t >= T[1] + 0.75; // 들어 올렸다가 6 Ω 짜리로 바뀜
      const heat = clamp(I / 4, 0, 1);
      const body = [226 + 25 * heat * 0.6, 202 - 70 * heat * 0.6, 154 - 90 * heat * 0.6];
      const Ry = Y + hop;
      g.shadow([0, 0, FZ], 1.0, 0.5, 0.3 * (1 - hop / 2.2));
      g.cyl([-0.9, Y, FZ], [-0.62, Y, FZ], 0.04, [200, 204, 212], 1, 8);
      g.cyl([0.62, Y, FZ], [0.9, Y, FZ], 0.04, [200, 204, 212], 1, 8);
      g.cyl([-0.66, Ry, FZ], [0.66, Ry, FZ], 0.25, body, 1, 24);
      g.cyl([-0.7, Ry, FZ], [-0.5, Ry, FZ], 0.3, body, 1, 24);
      g.cyl([0.5, Ry, FZ], [0.7, Ry, FZ], 0.3, body, 1, 24);
      const bands = big ? [BAND.blue, BAND.black, BAND.gold] : [BAND.orange, BAND.black, BAND.gold];
      [-0.34, -0.16, 0.02].forEach((x, i) => g.cyl([x, Ry, FZ], [x + 0.08, Ry, FZ], 0.262, bands[i], 1, 24));
      g.cyl([0.34, Ry, FZ], [0.41, Ry, FZ], 0.262, BAND.gold, 1, 24);
      if (heat > 0.3) g.orb([0, Ry, FZ], 0.95, [255, 150, 70], 0.22 + 0.45 * heat, true);

      // ── 전류계(오른쪽 전선 가운데) ──
      g.shadow([XR, 0, 0], 0.6, 0.95, 0.3);
      g.box([XR, 0.48, 0], [0.9, 0.96, 1.5], [206, 210, 216]);
      g.box([XR, 0.98, 0], [0.6, 0.04, 1.2], [22, 40, 34]);
      g.text([XR, 1.5, 0], fmt(Math.round(I * 10) / 10) + ' A', [150, 255, 170], 0.36);
      g.text([XR, 1.15, 0], '전류계', C.white, 0.16);

      // ── 라벨 ──
      g.text([0, 1.7, BZ], 'V = ' + fmt(Math.round(V)) + ' V', C.yellow, 0.34);
      g.text([0, 1.35, BZ], '건전지 ' + (t >= 9 ? 4 : 2) + '개 (3V씩)', C.white, 0.16);
      g.text([0, 1.62, FZ], 'R = ' + fmt(Math.round(R)) + ' Ω', [255, 140, 130], 0.34);
      g.text([0, 1.27, FZ], '저항기', C.white, 0.16);
      g.text([-2.1, 0.8, FZ + 0.45], '← 전류의 방향 (+ → −)', C.white, 0.14);

      // ── 전류(움직이는 전하) ──
      const path = [[1.4, Y, BZ], [XR, Y, BZ], [XR, Y, FZ], [-XR, Y, FZ], [-XR, Y, BZ], [-1.4, Y, BZ]];
      const seg = [];
      let total = 0;
      for (let i = 0; i + 1 < path.length; i++) {
        const l = G.vec3.len(G.vec3.sub(path[i + 1], path[i]));
        seg.push(l);
        total += l;
      }
      const N = 40;
      for (let i = 0; i < N; i++) {
        let d = frac(i / N + spin) * total;
        let k = 0;
        while (k < seg.length - 1 && d > seg[k]) {
          d -= seg[k];
          k++;
        }
        const p = G.vec3.lerp(path[k], path[k + 1], clamp(d / seg[k], 0, 1));
        if ((k === 1 && Math.abs(p[2] - (BZ + FZ) / 2) < 0.5) || (k === 2 && Math.abs(p[0]) < 0.66)) continue; // 전류계·저항기 안은 가려짐
        g.dot([p[0], Y + 0.13, p[2]], 0.07, [255, 222, 90], true);
      }

      // ── 오른쪽 위: 같은 상황을 물로 ──
      const levelV = V;
      const narrow = 3 / R; // 좁은 정도(3 Ω = 1, 6 Ω = 0.5)
      const flow = spin * 8; // 물방울 위치
      g.hudDraw((ctx, w, h) => {
        const u = w / 960;
        const px = 0.655 * w;
        const py = 0.03 * h;
        const pw = 0.335 * w;
        const ph = 0.345 * h;
        const rr = (x, y, a, b, r) => {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + a, y, x + a, y + b, r);
          ctx.arcTo(x + a, y + b, x, y + b, r);
          ctx.arcTo(x, y + b, x, y, r);
          ctx.arcTo(x, y, x + a, y, r);
          ctx.closePath();
        };
        ctx.save();
        ctx.translate(px, py);
        ctx.fillStyle = 'rgba(10,16,24,0.72)';
        rr(0, 0, pw, ph, 10 * u);
        ctx.fill();
        ctx.strokeStyle = 'rgba(160,190,230,0.35)';
        ctx.lineWidth = 1.5 * u;
        ctx.stroke();
        ctx.scale(u * 0.93, u * 0.93);
        ctx.font = '700 17px system-ui, sans-serif';
        ctx.fillStyle = '#cfe0f5';
        ctx.textAlign = 'left';
        ctx.fillText('같은 상황을 물로 보면', 12, 24);
        // 물탱크
        const tx = 16;
        const ty = 40;
        const tw = 84;
        const th = 118;
        const wl = th * clamp(levelV / 12, 0, 1) * 0.92;
        ctx.fillStyle = 'rgba(90,170,240,0.85)';
        ctx.fillRect(tx + 3, ty + th - wl, tw - 6, wl);
        ctx.strokeStyle = '#9fb4cc';
        ctx.lineWidth = 3;
        ctx.strokeRect(tx, ty, tw, th);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(tx + tw + 5, ty + th - wl);
        ctx.lineTo(tx + tw + 14, ty + th - wl);
        ctx.stroke();
        ctx.setLineDash([]);
        // 파이프
        const py0 = ty + th - 20;
        const px0 = tx + tw;
        const px1 = 336;
        const half = 14;
        const nh = half * narrow;
        ctx.fillStyle = 'rgba(120,135,155,0.28)';
        ctx.beginPath();
        ctx.moveTo(px0, py0 - half);
        ctx.lineTo(190, py0 - half);
        ctx.lineTo(210, py0 - nh);
        ctx.lineTo(250, py0 - nh);
        ctx.lineTo(270, py0 - half);
        ctx.lineTo(px1, py0 - half);
        ctx.lineTo(px1, py0 + half);
        ctx.lineTo(270, py0 + half);
        ctx.lineTo(250, py0 + nh);
        ctx.lineTo(210, py0 + nh);
        ctx.lineTo(190, py0 + half);
        ctx.lineTo(px0, py0 + half);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#9fb4cc';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,120,110,0.9)';
        ctx.fillRect(210, py0 - nh - 3, 40, 3);
        ctx.fillRect(210, py0 + nh, 40, 3);
        // 물방울
        for (let i = 0; i < 12; i++) {
          const x = px0 + 4 + frac(i / 12 + flow * 0.05) * (px1 - px0 - 8);
          const inNarrow = x > 205 && x < 255;
          const yy = py0 + Math.sin(i * 2.1) * (inNarrow ? nh * 0.55 : half * 0.55);
          ctx.fillStyle = '#7cc4ff';
          ctx.beginPath();
          ctx.arc(x, yy, inNarrow ? 3.4 : 4.4, 0, TAU);
          ctx.fill();
        }
        // 이름표
        ctx.font = '700 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd166';
        ctx.fillText('전압 = 물높이', tx + tw / 2 + 6, ty + th + 22);
        ctx.fillStyle = '#ff9a90';
        ctx.fillText('저항 = 좁은 관', 230, ty + th + 22);
        ctx.fillStyle = '#8fe3a8';
        ctx.fillText('전류 = 흐르는 양', 292, py0 - half - 10);
        ctx.restore();

        // ── 맨 아래: 식 ──
        const bh = 0.12 * h;
        const by = h - bh - 0.025 * h;
        ctx.fillStyle = 'rgba(8,12,18,0.78)';
        rr(0.04 * w, by, 0.92 * w, bh, 12 * u);
        ctx.fill();
        const segs = [
          { k: 'V', s: 'V = ' + fmt(Math.round(V)) + ' V', c: '#ffd166', ch: [8, 16] },
          { k: 'op', s: '÷', c: '#e8eef6' },
          { k: 'R', s: 'R = ' + fmt(Math.round(R)) + ' Ω', c: '#ff9a90', ch: [16, 24] },
          { k: 'op', s: '=', c: '#e8eef6' },
          { k: 'I', s: 'I = ' + fmt(Math.round(I * 10) / 10) + ' A', c: '#8fe3a8', ch: [8, 24] },
        ];
        const fs = 30 * u;
        ctx.font = '800 ' + fs + 'px system-ui, sans-serif';
        const gap = 22 * u;
        const widths = segs.map((sg) => ctx.measureText(sg.s).width);
        const totalW = widths.reduce((a, b) => a + b, 0) + gap * (segs.length - 1);
        let x = w / 2 - totalW / 2;
        const ty2 = by + bh / 2 + fs * 0.35;
        segs.forEach((sg, i) => {
          ctx.fillStyle = sg.c;
          ctx.textAlign = 'left';
          ctx.fillText(sg.s, x, ty2);
          // 방금 바뀐 값은 테두리로 표시하고 몇 배가 됐는지 위에 적어 준다
          if (sg.ch) {
            const t0 = i === 4 ? (t >= 16 && t < 24 ? 16 : 8) : sg.ch[0];
            const age = t - t0;
            const on = sg.k === 'I' ? (t >= 8 && t < 12) || (t >= 16 && t < 20) : age >= 0 && age < 4;
            if (on) {
              ctx.strokeStyle = sg.c;
              ctx.lineWidth = 2.5 * u;
              rr(x - 8 * u, by + 6 * u, widths[i] + 16 * u, bh - 12 * u, 8 * u);
              ctx.stroke();
              const tag = sg.k === 'V' ? '×2' : sg.k === 'R' ? '×2' : t < 16 ? '×2' : '÷2';
              ctx.font = '800 ' + 22 * u + 'px system-ui, sans-serif';
              ctx.fillStyle = sg.c;
              ctx.textAlign = 'center';
              ctx.fillText(tag, x + widths[i] / 2, by - 8 * u);
              ctx.font = '800 ' + fs + 'px system-ui, sans-serif';
            }
          }
          x += widths[i] + gap;
        });
      });
    },
  });
})(globalThis.GISA);
