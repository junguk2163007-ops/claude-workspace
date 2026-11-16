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
    view: { yaw: 0.14, pitch: 0.68, dist: 7.7, sx: -0.03, sy: 0.12 },
    poster: 4,
    title: '옴의 법칙: 전원장치와 저항으로 보기',
    concepts: ['ohm', 'series', 'parallel', 'divider'],
    duration: 32,
    captions: [
      { t0: 0, t1: 8, text: '전원장치(전압 V)가 전하를 밀어 주고, 방열 저항(R)이 그 흐름을 방해해. 그 결과 회로에 흐르는 양이 전류 I 이고 클램프 전류계로 잴 수 있어. 지금은 6 V, 3 Ω 이라 2 A. 오른쪽 위 물탱크는 같은 상황을 물로 바꿔 본 거야.' },
      { t0: 8, t1: 16, text: '전원장치 다이얼을 돌려 전압을 2배로 올리면(6 V → 12 V), 저항은 그대로인데 전류도 2배(2 A → 4 A)가 돼. 물탱크 물높이를 올리면 물이 더 세게 흐르는 것과 같아. (전류 ∝ 전압)' },
      { t0: 16, t1: 24, text: '저항을 3 Ω → 6 Ω 짜리로 바꿔 저항이 2배가 되면 전류는 절반(4 A → 2 A)이 돼. 관이 좁아지면 물이 덜 흐르는 것과 같아. (전류 ∝ 1/저항)' },
      { t0: 24, t1: 32, text: '그래서 I = V ÷ R. 처음(6 V, 3 Ω)과 지금(12 V, 6 Ω)은 전압도 저항도 2배씩이라서 전류가 똑같이 2 A 야.' },
    ],
    draw(g, t) {
      const V = stepv(t, VALS_V);
      const R = stepv(t, VALS_R);
      const I = V / R;
      const spin = travel(t) * 0.028; // 전하가 돈 바퀴 수

      // ── 작업대: 밝은 라미네이트 위에 초록 정전기 방지 매트 ──
      const TW = 4.9;
      const TD = 3.4;
      g.ground([[-TW, 0, -TD], [TW, 0, -TD], [TW, 0, TD], [-TW, 0, TD]], [168, 174, 182], 1);
      g.ground([[-TW, 0, TD], [TW, 0, TD], [TW, -0.35, TD], [-TW, -0.35, TD]], [96, 102, 110], 1);
      g.ground([[-4.3, 0, -2.5], [4.3, 0, -2.5], [4.3, 0, 2.6], [-4.3, 0, 2.6]], [54, 94, 82], 1);
      for (let x = -4; x <= 4; x += 0.5) g.groundLine([x, 0, -2.5], [x, 0, 2.6], [200, 230, 215], x % 2 === 0 ? 0.02 : 0.01, x % 2 === 0 ? 0.35 : 0.18);
      for (let z = -2; z <= 2.5; z += 0.5) g.groundLine([-4.3, 0, z], [4.3, 0, z], [200, 230, 215], 0.01, 0.18);

      // ── 직류 전원장치(뒤쪽): 전압 다이얼, 전압·전류 표시창, 출력 단자 ──
      const BZ = -1.65;
      const FZ = 1.5; // 앞쪽(부하) 줄
      const fz = BZ + 0.56; // 전면 패널 면
      g.shadow([0, 0, BZ], 1.8, 0.75, 0.32);
      g.setBias(-1.2);
      g.box([0, 0.5, BZ], [3.2, 1.0, 1.1], [52, 57, 66]);
      g.box([0, 1.01, BZ], [3.2, 0.03, 1.1], [86, 92, 102]);
      g.setBias(0);
      const lcd = (x0, x1, txt, unit) => {
        g.setBias(-0.3);
        g.poly([[x0, 0.56, fz], [x1, 0.56, fz], [x1, 0.9, fz], [x0, 0.9, fz]], [8, 14, 12], 1, true);
        g.setBias(0);
        g.text([(x0 + x1) / 2 - 0.08, 0.64, fz + 0.01], txt, [120, 255, 150], 0.22);
      };
      lcd(-1.45, -0.1, V.toFixed(1), 'V');
      lcd(0.1, 1.45, I.toFixed(2), 'A');
      const knob = (kx, ang) => {
        g.cyl([kx, 0.3, fz], [kx, 0.3, fz + 0.12], 0.19, [196, 201, 210], 1, 24);
        g.cyl([kx, 0.3, fz + 0.12], [kx, 0.3, fz + 0.15], 0.14, [150, 156, 166], 1, 24);
        g.line([kx, 0.3, fz + 0.16], [kx + Math.cos(ang) * 0.15, 0.3 + Math.sin(ang) * 0.15, fz + 0.16], [30, 34, 40], 0.035);
      };
      const turn = 2.35 - ((V - 6) / 6) * 1.5; // 전압이 오르면 시계 방향으로 돌아감
      knob(-1.1, turn);
      knob(1.1, 1.9);
      const post = (px, col) => {
        g.cyl([px, 0.3, fz], [px, 0.3, fz + 0.14], 0.1, col, 1, 16);
        g.cyl([px, 0.3, fz + 0.14], [px, 0.3, fz + 0.17], 0.12, [214, 218, 224], 1, 16);
      };
      post(0.4, [200, 55, 50]);
      post(-0.4, [40, 42, 48]);
      g.text([0.4, 0.5, fz + 0.04], '+', C.red, 0.15);
      g.text([-0.4, 0.5, fz + 0.04], '−', [150, 190, 255], 0.15);
      g.dot([1.3, 0.2, fz + 0.03], 0.04, [90, 240, 120], true);

      // ── 케이블(빨강 +, 검정 −): 빨강은 오른쪽·앞으로, 검정은 왼쪽·앞으로 ──
      const Y = 0.3;
      const XR = 2.35;
      const RED = [205, 55, 50];
      const BLK = [40, 42, 48];
      const redPath = [[0.4, Y, fz + 0.17], [0.4, Y, -0.5], [XR, Y, -0.5], [XR, Y, FZ], [0.82, Y, FZ]];
      const blkPath = [[-0.4, Y, fz + 0.17], [-0.4, Y, -0.5], [-XR, Y, -0.5], [-XR, Y, FZ], [-0.82, Y, FZ]];
      [[redPath, RED], [blkPath, BLK]].forEach(([pp, col]) => {
        for (let i = 0; i + 1 < pp.length; i++) {
          g.cyl(pp[i], pp[i + 1], 0.06, col, 1, 12);
          g.groundLine([pp[i][0], 0, pp[i][2]], [pp[i + 1][0], 0, pp[i + 1][2]], [0, 0, 0], 0.12, 0.22);
          if (i > 0) g.dot(pp[i], 0.06, col, false);
        }
      });

      // ── 방열 저항(앞쪽 가운데): 알루미늄 케이스 + 냉각 핀. 전류가 크면 달아올라 주황빛 ──
      let hop = 0;
      if (t >= T[1] && t < T[1] + 1.5) hop = Math.sin(Math.PI * ((t - T[1]) / 1.5)) * 0.95;
      const big = t >= T[1] + 0.75; // 들어 올렸다가 6 Ω 짜리로 바뀜
      const heat = clamp(I / 4, 0, 1);
      g.shadow([0, 0, FZ], 1.0, 0.55, 0.32 * (1 - hop / 1.6));
      g.box([0.0, 0.16 + hop, FZ], [1.5, 0.32, 0.72], big ? [34, 52, 92] : [38, 40, 46]);
      for (let i = 0; i < 10; i++) {
        const fx = -0.63 + (i * 1.26) / 9;
        const hot = [38 + 190 * heat * 0.85, 40 + 70 * heat * 0.85, 46 - 10 * heat];
        g.box([fx, 0.5 + hop, FZ], [0.05, 0.36, 0.64], hot);
      }
      [-0.82, 0.82].forEach((x) => g.box([x, 0.2, FZ], [0.16, 0.24, 0.3], [200, 204, 212]));
      g.text([0, 0.12 + hop, FZ + 0.39], (big ? '6Ω' : '3Ω') + '  50W', [210, 216, 224], 0.12);
      if (heat > 0.3) g.orb([0, 0.6 + hop, FZ], 1.0, [255, 140, 60], 0.18 + 0.4 * heat, true);

      // ── 클램프 전류계(오른쪽): 전선을 자르지 않고 집게로 감싸서 전류를 잼 ──
      const CZ = 0.45;
      g.shadow([XR + 0.8, 0, CZ], 0.9, 0.55, 0.3);
      g.setBias(-0.8);
      g.box([XR + 0.95, 0.27, CZ], [1.2, 0.54, 0.84], [238, 192, 32]);
      g.setBias(0);
      g.box([XR + 0.95, 0.27, CZ - 0.5], [1.2, 0.5, 0.16], [36, 38, 44]); // 고무 보호대
      g.box([XR + 0.95, 0.27, CZ + 0.5], [1.2, 0.5, 0.16], [36, 38, 44]);
      g.ring([XR, Y, CZ], [0, 0, 1], 0.36, [238, 192, 32], 0.1, 40, -Math.PI / 2 + 0.28, (3 * Math.PI) / 2 - 0.28); // 집게
      g.ring([XR, Y, CZ], [0, 0, 1], 0.36, [36, 38, 44], 0.04, 40, -Math.PI / 2 + 0.28, (3 * Math.PI) / 2 - 0.28);
      g.setBias(-0.3);
      g.poly([[XR + 0.55, 0.56, CZ - 0.28], [XR + 1.35, 0.56, CZ - 0.28], [XR + 1.35, 0.56, CZ + 0.28], [XR + 0.55, 0.56, CZ + 0.28]], [10, 16, 20], 1, true);
      g.setBias(0);
      g.text([XR + 0.95, 0.62, CZ + 0.08], fmt(Math.round(I * 10) / 10) + 'A', [150, 255, 170], 0.17);
      g.cyl([XR + 1.15, 0.54, CZ + 0.28], [XR + 1.15, 0.6, CZ + 0.28], 0.1, [60, 64, 72], 1, 16);
      g.text([XR + 0.95, 1.2, CZ], 'I = ' + fmt(Math.round(I * 10) / 10) + ' A', [150, 255, 170], 0.3);
      g.text([XR + 0.95, 0.9, CZ], '클램프 전류계', C.white, 0.14);

      // ── 라벨 ──
      g.text([0, 1.95, BZ], 'V = ' + fmt(Math.round(V)) + ' V', C.yellow, 0.34);
      g.text([0, 1.6, BZ], '직류 전원장치', C.white, 0.15);
      g.text([0, 1.3, FZ], 'R = ' + fmt(Math.round(R)) + ' Ω', [255, 140, 130], 0.3);
      g.text([0, 1.02, FZ], '방열 저항', C.white, 0.15);
      g.text([XR - 0.2, 0.7, 1.05], '↓ 전류 방향', C.white, 0.14);

      // ── 전류(움직이는 전하) ──
      const path = [[0.4, Y, -0.5], [XR, Y, -0.5], [XR, Y, FZ], [-XR, Y, FZ], [-XR, Y, -0.5], [-0.4, Y, -0.5]];
      const seg = [];
      let total = 0;
      for (let i = 0; i + 1 < path.length; i++) {
        const l = G.vec3.len(G.vec3.sub(path[i + 1], path[i]));
        seg.push(l);
        total += l;
      }
      const N = 46;
      for (let i = 0; i < N; i++) {
        let d = frac(i / N + spin) * total;
        let k = 0;
        while (k < seg.length - 1 && d > seg[k]) {
          d -= seg[k];
          k++;
        }
        const p = G.vec3.lerp(path[k], path[k + 1], clamp(d / seg[k], 0, 1));
        if (k === 2 && Math.abs(p[0]) < 0.84) continue; // 저항 안은 가려짐
        g.dot([p[0], Y + 0.13, p[2]], 0.065, [255, 222, 90], true);
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
