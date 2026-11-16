// 3D 장면 뒤에 깔리는 배경(실제 있을 법한 공간). 캔버스 2D로 직접 그린다.
// 장면은 env: '이름' 으로 고르고, 시간 t 에 따라 불빛이 깜빡이거나 시계 바늘이 움직인다.
(function (G) {
  'use strict';
  if (!G.anim3d || !G.anim3d.registerEnv) return;
  const TAU = Math.PI * 2;
  const rnd = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const rr = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  const lin = (ctx, x0, y0, x1, y1, stops) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  };
  const glow = (ctx, x, y, r, col, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col.replace('A', a));
    g.addColorStop(1, col.replace('A', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  // 가운데를 살짝 어둡게 해서 앞의 3D 물체가 잘 보이게
  const calm = (ctx, W, H, a) => {
    const g = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.15, W / 2, H * 0.55, W * 0.75);
    g.addColorStop(0, 'rgba(6,10,16,' + a + ')');
    g.addColorStop(1, 'rgba(6,10,16,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };

  // ───────── 전자 공작실: 구멍판 벽, 부품 서랍장, 창문, 스탠드 불빛 ─────────
  G.anim3d.registerEnv('workshop', (ctx, W, H, t, view) => {
    const px = (view.yaw || 0) * W * 0.03;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#3e4a5c'], [0.6, '#2a3240'], [1, '#1a1f27']]);
    ctx.fillRect(0, 0, W, H);
    // 구멍판과 걸려 있는 공구
    const bx = 0.02 * W + px;
    const by = 0.05 * H;
    const bw = 0.33 * W;
    const bh = 0.36 * H;
    ctx.fillStyle = '#5b4c3b';
    rr(ctx, bx, by, bw, bh, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    for (let i = 0; i < 18; i++) for (let j = 0; j < 9; j++) {
      ctx.beginPath();
      ctx.arc(bx + 12 + i * (bw - 24) / 17, by + 12 + j * (bh - 24) / 8, 1.8 * W / 960, 0, TAU);
      ctx.fill();
    }
    const u = W / 960;
    // 망치
    ctx.fillStyle = '#8a6a44';
    ctx.fillRect(bx + 40 * u, by + 30 * u, 9 * u, 92 * u);
    ctx.fillStyle = '#9aa3ad';
    rr(ctx, bx + 24 * u, by + 22 * u, 44 * u, 18 * u, 3);
    ctx.fill();
    // 니퍼(빨간 손잡이)
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 7 * u;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx + 100 * u, by + 120 * u);
    ctx.lineTo(bx + 112 * u, by + 66 * u);
    ctx.moveTo(bx + 128 * u, by + 120 * u);
    ctx.lineTo(bx + 114 * u, by + 66 * u);
    ctx.stroke();
    ctx.strokeStyle = '#b8c0c8';
    ctx.lineWidth = 5 * u;
    ctx.beginPath();
    ctx.moveTo(bx + 112 * u, by + 66 * u);
    ctx.lineTo(bx + 106 * u, by + 36 * u);
    ctx.moveTo(bx + 114 * u, by + 66 * u);
    ctx.lineTo(bx + 122 * u, by + 36 * u);
    ctx.stroke();
    // 드라이버
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 10 * u;
    ctx.beginPath();
    ctx.moveTo(bx + 160 * u, by + 100 * u);
    ctx.lineTo(bx + 160 * u, by + 60 * u);
    ctx.stroke();
    ctx.strokeStyle = '#b8c0c8';
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.moveTo(bx + 160 * u, by + 60 * u);
    ctx.lineTo(bx + 160 * u, by + 28 * u);
    ctx.stroke();
    // 전선 뭉치(구리색 원)
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = k % 2 ? '#c87533' : '#e0a060';
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.arc(bx + 232 * u, by + 76 * u, (14 + k * 5) * u, 0, TAU);
      ctx.stroke();
    }
    // 부품 서랍장
    const dx = 0.37 * W + px * 0.6;
    const dy = 0.05 * H;
    const dw = 0.27 * W;
    const dh = 0.3 * H;
    ctx.fillStyle = '#4b5463';
    rr(ctx, dx, dy, dw, dh, 5);
    ctx.fill();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
      const cw = (dw - 14 * u) / 6;
      const ch = (dh - 12 * u) / 4;
      ctx.fillStyle = '#6a7585';
      rr(ctx, dx + 7 * u + c * cw + 1.5, dy + 6 * u + r * ch + 1.5, cw - 3, ch - 3, 2);
      ctx.fill();
      ctx.fillStyle = '#c8d0da';
      ctx.fillRect(dx + 7 * u + c * cw + cw / 2 - 5 * u, dy + 6 * u + r * ch + ch / 2 - 1, 10 * u, 2.5 * u);
      ctx.fillStyle = ['#e6a23c', '#67c23a', '#409eff', '#f56c6c'][(r + c) % 4];
      ctx.fillRect(dx + 7 * u + c * cw + 4, dy + 6 * u + r * ch + 5, 8 * u, 4 * u);
    }
    // 창문
    const wx = 0.7 * W - px * 0.5;
    const wy = 0.05 * H;
    const ww = 0.26 * W;
    const wh = 0.3 * H;
    ctx.fillStyle = lin(ctx, 0, wy, 0, wy + wh, [[0, '#7fb0e6'], [1, '#bcd8f0']]);
    rr(ctx, wx, wy, ww, wh, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(wx + ww * 0.3, wy + wh * 0.35, ww * 0.16, wh * 0.08, 0, 0, TAU);
    ctx.ellipse(wx + ww * 0.55, wy + wh * 0.28, ww * 0.12, wh * 0.06, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,38,50,0.8)';
    ctx.lineWidth = 6 * u;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
    // 창에서 들어오는 햇빛
    ctx.fillStyle = 'rgba(255,238,200,0.06)';
    ctx.beginPath();
    ctx.moveTo(wx, wy + wh);
    ctx.lineTo(wx + ww, wy + wh);
    ctx.lineTo(wx + ww * 0.7, H);
    ctx.lineTo(wx - ww * 0.5, H);
    ctx.closePath();
    ctx.fill();
    // 스탠드 불빛(살짝 일렁임)
    glow(ctx, W * 0.5, H * 0.18, H * 0.7, 'rgba(255,214,150,A)', 0.2 + 0.015 * Math.sin(t * 7));
    // 작업대 앞면
    ctx.fillStyle = lin(ctx, 0, H * 0.8, 0, H, [[0, 'rgba(18,16,14,0)'], [1, 'rgba(18,16,14,0.8)']]);
    ctx.fillRect(0, H * 0.8, W, H * 0.2);
    calm(ctx, W, H, 0.3);
  });

  // ───────── 물리 실험실: 칠판, 비커 선반, 아날로그 계기 ─────────
  G.anim3d.registerEnv('lab', (ctx, W, H, t, view) => {
    const px = (view.yaw || 0) * W * 0.03;
    const u = W / 960;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#35505a'], [0.7, '#223840'], [1, '#141f24']]);
    ctx.fillRect(0, 0, W, H);
    // 벽 타일
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      ctx.beginPath();
      ctx.moveTo((i * W) / 24, 0);
      ctx.lineTo((i * W) / 24, H * 0.78);
      ctx.stroke();
    }
    for (let j = 0; j < 9; j++) {
      ctx.beginPath();
      ctx.moveTo(0, (j * H * 0.78) / 9);
      ctx.lineTo(W, (j * H * 0.78) / 9);
      ctx.stroke();
    }
    // 칠판
    const bx = 0.04 * W + px;
    const by = 0.06 * H;
    const bw = 0.52 * W;
    const bh = 0.38 * H;
    ctx.fillStyle = '#7b5a3a';
    rr(ctx, bx - 8 * u, by - 8 * u, bw + 16 * u, bh + 16 * u, 6);
    ctx.fill();
    ctx.fillStyle = lin(ctx, bx, by, bx + bw, by + bh, [[0, '#24473a'], [1, '#1b362c']]);
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(236,242,236,0.62)';
    ctx.font = 'italic 600 ' + 30 * u + 'px "Times New Roman", serif';
    ctx.textAlign = 'left';
    ctx.fillText('F = B · I · L', bx + 26 * u, by + 54 * u);
    ctx.fillText('e = −N · ΔΦ / Δt', bx + 26 * u, by + 104 * u);
    ctx.fillText('H = I / 2πr', bx + 26 * u, by + 154 * u);
    // 분필 그림: 도선과 자기장 고리
    ctx.strokeStyle = 'rgba(236,242,236,0.5)';
    ctx.lineWidth = 2.4 * u;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.ellipse(bx + bw - 90 * u, by + 96 * u, (24 + k * 20) * u, (10 + k * 8) * u, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(bx + bw - 90 * u, by + 26 * u);
    ctx.lineTo(bx + bw - 90 * u, by + 170 * u);
    ctx.stroke();
    // 분필 받침
    ctx.fillStyle = '#6a4d30';
    ctx.fillRect(bx, by + bh, bw, 7 * u);
    ctx.fillStyle = '#ecf0ec';
    ctx.fillRect(bx + 30 * u, by + bh - 4 * u, 22 * u, 5 * u);
    // 벽걸이 아날로그 계기(바늘이 천천히 흔들림)
    const mx = 0.74 * W - px * 0.5;
    const my = 0.17 * H;
    const mr = 0.075 * W;
    ctx.fillStyle = '#1a2226';
    ctx.beginPath();
    ctx.arc(mx, my, mr + 5 * u, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e9e4d3';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1.5 * u;
    for (let k = -5; k <= 5; k++) {
      const a = -Math.PI / 2 + (k * 0.2);
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(a) * mr * 0.78, my + Math.sin(a) * mr * 0.78);
      ctx.lineTo(mx + Math.cos(a) * mr * 0.95, my + Math.sin(a) * mr * 0.95);
      ctx.stroke();
    }
    const na = -Math.PI / 2 + 0.55 * Math.sin(t * 0.8);
    ctx.strokeStyle = '#b3261e';
    ctx.lineWidth = 2.4 * u;
    ctx.beginPath();
    ctx.moveTo(mx, my + mr * 0.45);
    ctx.lineTo(mx + Math.cos(na) * mr * 0.85, my + Math.sin(na) * mr * 0.85 + mr * 0.2);
    ctx.stroke();
    // 선반과 비커·플라스크
    const sx = 0.62 * W - px * 0.6;
    const sy = 0.4 * H;
    ctx.fillStyle = '#8a6a44';
    ctx.fillRect(sx, sy, 0.35 * W, 8 * u);
    const flask = (x, col, tall) => {
      ctx.fillStyle = 'rgba(200,225,235,0.25)';
      ctx.strokeStyle = 'rgba(210,235,245,0.55)';
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.moveTo(x - 9 * u, sy - 58 * u * tall);
      ctx.lineTo(x - 9 * u, sy - 36 * u * tall);
      ctx.lineTo(x - 30 * u, sy);
      ctx.lineTo(x + 30 * u, sy);
      ctx.lineTo(x + 9 * u, sy - 36 * u * tall);
      ctx.lineTo(x + 9 * u, sy - 58 * u * tall);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x - 24 * u, sy - 6 * u);
      ctx.lineTo(x - 17 * u, sy - 22 * u * tall);
      ctx.lineTo(x + 17 * u, sy - 22 * u * tall);
      ctx.lineTo(x + 24 * u, sy - 6 * u);
      ctx.fill();
    };
    flask(sx + 50 * u, 'rgba(70,170,230,0.75)', 1);
    flask(sx + 130 * u, 'rgba(110,210,120,0.75)', 0.85);
    flask(sx + 210 * u, 'rgba(240,170,70,0.75)', 1.1);
    // 바닥(타일 바닥에 비친 빛)
    ctx.fillStyle = lin(ctx, 0, H * 0.78, 0, H, [[0, '#26343a'], [1, '#0f171b']]);
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, H * 0.78, W, 3 * u);
    glow(ctx, W * 0.5, H * 0.15, H * 0.8, 'rgba(235,245,255,A)', 0.1 + 0.01 * Math.sin(t * 11));
    calm(ctx, W, H, 0.3);
  });

  // ───────── 발전소 배전반실: 배전반 캐비닛, 케이블 트레이, 안전 줄무늬 ─────────
  G.anim3d.registerEnv('powerhouse', (ctx, W, H, t, view) => {
    const px = (view.yaw || 0) * W * 0.03;
    const u = W / 960;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#2c3239'], [0.7, '#1e242a'], [1, '#12161a']]);
    ctx.fillRect(0, 0, W, H);
    // 천장 형광등
    for (let i = 0; i < 4; i++) {
      const lx = (0.1 + i * 0.24) * W + px * 0.4;
      glow(ctx, lx + 60 * u, 0.04 * H, 150 * u, 'rgba(210,235,255,A)', 0.22);
      ctx.fillStyle = '#e9f3ff';
      rr(ctx, lx, 0.02 * H, 120 * u, 8 * u, 3);
      ctx.fill();
    }
    // 케이블 트레이
    ctx.fillStyle = '#59616b';
    ctx.fillRect(0, 0.11 * H, W, 7 * u);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 5 === 0 ? '#c0392b' : i % 3 === 0 ? '#c87533' : '#16191d';
      ctx.fillRect(i * (W / 40) + 2, 0.095 * H, W / 40 - 5, 9 * u);
    }
    // 배전반 캐비닛 줄
    const base = 0.7 * H;
    for (let i = 0; i < 9; i++) {
      const cw = 0.105 * W;
      const x = 0.02 * W + i * (cw + 0.008 * W) + px * 0.5;
      const h = 0.4 * H;
      ctx.fillStyle = lin(ctx, x, 0, x + cw, 0, [[0, '#6c7886'], [0.5, '#5d6875'], [1, '#4d5662']]);
      rr(ctx, x, base - h, cw, h, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,14,18,0.6)';
      ctx.lineWidth = 2 * u;
      ctx.strokeRect(x + 6 * u, base - h + 8 * u, cw - 12 * u, h * 0.45);
      ctx.strokeRect(x + 6 * u, base - h + h * 0.55, cw - 12 * u, h * 0.38);
      // 표시등: 초록/주황이 번갈아 깜빡임
      const on = Math.sin(t * 1.6 + i * 1.7) > -0.2;
      ctx.fillStyle = on ? '#5ee27b' : '#2c5b38';
      ctx.beginPath();
      ctx.arc(x + cw * 0.28, base - h + h * 0.12, 4 * u, 0, TAU);
      ctx.fill();
      ctx.fillStyle = i % 3 === 0 && Math.sin(t * 3 + i) > 0 ? '#ffb347' : '#5e4524';
      ctx.beginPath();
      ctx.arc(x + cw * 0.5, base - h + h * 0.12, 4 * u, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#c0c8d2';
      ctx.fillRect(x + cw * 0.8, base - h * 0.42, 4 * u, h * 0.2);
      // 위험 표지
      if (i % 2 === 0) {
        ctx.fillStyle = '#f4c20d';
        ctx.beginPath();
        ctx.moveTo(x + cw * 0.5, base - h * 0.34);
        ctx.lineTo(x + cw * 0.5 + 9 * u, base - h * 0.34 + 16 * u);
        ctx.lineTo(x + cw * 0.5 - 9 * u, base - h * 0.34 + 16 * u);
        ctx.closePath();
        ctx.fill();
      }
    }
    // 바닥과 안전 줄무늬
    ctx.fillStyle = lin(ctx, 0, base, 0, H, [[0, '#2a2e33'], [1, '#101316']]);
    ctx.fillRect(0, base, W, H - base);
    for (let i = -2; i < 40; i++) {
      ctx.fillStyle = i % 2 ? '#f4c20d' : '#1b1d20';
      ctx.beginPath();
      ctx.moveTo(i * 30 * u, base + 8 * u);
      ctx.lineTo(i * 30 * u + 30 * u, base + 8 * u);
      ctx.lineTo(i * 30 * u + 18 * u, base + 20 * u);
      ctx.lineTo(i * 30 * u - 12 * u, base + 20 * u);
      ctx.closePath();
      ctx.fill();
    }
    calm(ctx, W, H, 0.32);
  });

  // ───────── 공장: 큰 창, 철골 지붕, 컨베이어, 모터 ─────────
  G.anim3d.registerEnv('factory', (ctx, W, H, t, view) => {
    const px = (view.yaw || 0) * W * 0.03;
    const u = W / 960;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#3a4148'], [0.65, '#2a3036'], [1, '#161a1e']]);
    ctx.fillRect(0, 0, W, H);
    // 큰 공장 창(하늘 + 격자)
    for (let i = 0; i < 3; i++) {
      const x = (0.06 + i * 0.32) * W + px * 0.5;
      const y = 0.1 * H;
      const w = 0.26 * W;
      const h = 0.34 * H;
      ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, '#9fbbd3'], [1, '#dbe8f2']]);
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#1f2429';
      ctx.lineWidth = 3 * u;
      for (let k = 0; k <= 4; k++) {
        ctx.beginPath();
        ctx.moveTo(x + (k * w) / 4, y);
        ctx.lineTo(x + (k * w) / 4, y + h);
        ctx.stroke();
      }
      for (let k = 0; k <= 3; k++) {
        ctx.beginPath();
        ctx.moveTo(x, y + (k * h) / 3);
        ctx.lineTo(x + w, y + (k * h) / 3);
        ctx.stroke();
      }
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,240,205,0.055)';
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w * 0.5, H);
      ctx.lineTo(x - w * 0.5, H);
      ctx.closePath();
      ctx.fill();
    }
    // 철골 트러스
    ctx.strokeStyle = 'rgba(20,24,28,0.9)';
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.moveTo(0, 0.07 * H);
    ctx.lineTo(W, 0.07 * H);
    for (let i = 0; i < 24; i++) {
      ctx.moveTo((i * W) / 24, 0.07 * H);
      ctx.lineTo(((i + 0.5) * W) / 24, 0.0);
      ctx.lineTo(((i + 1) * W) / 24, 0.07 * H);
    }
    ctx.stroke();
    // 컨베이어와 상자(천천히 이동)
    const cy = 0.62 * H;
    ctx.fillStyle = '#394148';
    ctx.fillRect(0, cy, W, 0.05 * H);
    ctx.fillStyle = '#20262b';
    ctx.fillRect(0, cy + 0.05 * H, W, 0.015 * H);
    for (let i = 0; i < 6; i++) {
      const bx = (((i / 6 + t * 0.02) % 1) * 1.1 - 0.05) * W;
      ctx.fillStyle = '#b98b4e';
      ctx.fillRect(bx, cy - 0.07 * H, 0.06 * W, 0.07 * H);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(bx, cy - 0.04 * H, 0.06 * W, 3 * u);
    }
    // 멀리 있는 전동기와 설비
    ctx.fillStyle = '#2e5a8a';
    rr(ctx, 0.08 * W + px * 0.3, cy - 0.2 * H, 0.1 * W, 0.12 * H, 5);
    ctx.fill();
    ctx.fillStyle = '#8c98a6';
    for (let i = 0; i < 5; i++) ctx.fillRect(0.08 * W + px * 0.3 + i * 0.02 * W + 4 * u, cy - 0.2 * H + 6 * u, 5 * u, 0.12 * H - 12 * u);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(0.82 * W - px * 0.3, cy - 0.27 * H, 0.1 * W, 0.19 * H);
    ctx.fillStyle = '#232a31';
    ctx.fillRect(0.835 * W - px * 0.3, cy - 0.25 * H, 0.07 * W, 0.07 * H);
    // 바닥
    ctx.fillStyle = lin(ctx, 0, 0.74 * H, 0, H, [[0, '#30353a'], [1, '#101316']]);
    ctx.fillRect(0, 0.74 * H, W, 0.26 * H);
    ctx.fillStyle = '#e1b12c';
    ctx.fillRect(0, 0.78 * H, W, 4 * u);
    calm(ctx, W, H, 0.3);
  });

  // ───────── 변전소의 해질녘: 노을, 전봇대와 전선, 철탑 ─────────
  G.anim3d.registerEnv('substation', (ctx, W, H, t, view) => {
    const px = (view.yaw || 0) * W * 0.03;
    const u = W / 960;
    const hz = 0.62 * H;
    ctx.fillStyle = lin(ctx, 0, 0, 0, hz, [[0, '#141a38'], [0.55, '#5b4470'], [0.85, '#d97b5b'], [1, '#f2b06a']]);
    ctx.fillRect(0, 0, W, hz);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.35 * rnd(i + 7) * (0.7 + 0.3 * Math.sin(t * 2 + i))) + ')';
      ctx.fillRect(rnd(i) * W, rnd(i + 99) * hz * 0.5, 1.6 * u, 1.6 * u);
    }
    glow(ctx, W * 0.22 + px, hz, W * 0.45, 'rgba(255,190,110,A)', 0.4);
    // 먼 산
    ctx.fillStyle = '#1d2233';
    ctx.beginPath();
    ctx.moveTo(0, hz);
    for (let i = 0; i <= 24; i++) ctx.lineTo((i * W) / 24, hz - (14 + 26 * Math.abs(Math.sin(i * 1.3 + 0.5))) * u);
    ctx.lineTo(W, hz);
    ctx.closePath();
    ctx.fill();
    // 도시 불빛
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = 'rgba(255,214,140,' + (0.4 + 0.4 * rnd(i + 3)) + ')';
      ctx.fillRect(rnd(i + 11) * W, hz - 2 * u - rnd(i + 41) * 8 * u, 2 * u, 2 * u);
    }
    // 땅
    ctx.fillStyle = lin(ctx, 0, hz, 0, H, [[0, '#1b2420'], [1, '#0a0e0c']]);
    ctx.fillRect(0, hz, W, H - hz);
    // 철탑(오른쪽 먼 곳)
    const tx = 0.86 * W - px * 0.6;
    ctx.strokeStyle = '#10151c';
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.moveTo(tx - 22 * u, hz);
    ctx.lineTo(tx - 4 * u, hz - 130 * u);
    ctx.lineTo(tx + 4 * u, hz - 130 * u);
    ctx.lineTo(tx + 22 * u, hz);
    ctx.moveTo(tx - 40 * u, hz - 112 * u);
    ctx.lineTo(tx + 40 * u, hz - 112 * u);
    ctx.moveTo(tx - 30 * u, hz - 88 * u);
    ctx.lineTo(tx + 30 * u, hz - 88 * u);
    for (let k = 0; k < 5; k++) {
      ctx.moveTo(tx - 20 * u + k * 2, hz - k * 24 * u);
      ctx.lineTo(tx + 20 * u - k * 2, hz - (k + 1) * 24 * u);
    }
    ctx.stroke();
    // 전봇대 줄(원근으로 점점 작아짐)과 늘어진 전선
    const poles = [];
    for (let i = 0; i < 6; i++) {
      const k = i / 5;
      poles.push({ x: (0.02 + 0.2 * i) * W - px * (0.3 + k * 0.3), h: (150 - i * 15) * u, y: hz + 0.1 * H - i * 0.014 * H });
    }
    poles.forEach((p, i) => {
      ctx.strokeStyle = '#0b0f14';
      ctx.lineWidth = Math.max(2, (7 - i) * u);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y - p.h);
      ctx.stroke();
      ctx.lineWidth = Math.max(2, (4 - i * 0.4) * u);
      ctx.beginPath();
      ctx.moveTo(p.x - 26 * u, p.y - p.h + 14 * u);
      ctx.lineTo(p.x + 26 * u, p.y - p.h + 14 * u);
      ctx.stroke();
      if (i < poles.length - 1) {
        const q = poles[i + 1];
        [-20, 0, 20].forEach((o) => {
          ctx.lineWidth = 1.4 * u;
          ctx.beginPath();
          ctx.moveTo(p.x + o * u, p.y - p.h + 14 * u);
          ctx.quadraticCurveTo((p.x + q.x) / 2 + o * u, (p.y - p.h + q.y - q.h) / 2 + 36 * u, q.x + o * 0.8 * u, q.y - q.h + 14 * u);
          ctx.stroke();
        });
      }
    });
    // 울타리
    ctx.strokeStyle = 'rgba(20,26,22,0.9)';
    ctx.lineWidth = 1.5 * u;
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      ctx.moveTo((i * W) / 60, H * 0.84);
      ctx.lineTo((i * W) / 60, H * 0.92);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, H * 0.855);
    ctx.lineTo(W, H * 0.855);
    ctx.moveTo(0, H * 0.905);
    ctx.lineTo(W, H * 0.905);
    ctx.stroke();
    calm(ctx, W, H, 0.22);
  });
})(globalThis.GISA);
