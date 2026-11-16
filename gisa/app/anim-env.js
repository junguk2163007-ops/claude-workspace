// 3D 장면 뒤에 깔리는 배경: 최고급 오피스 빌딩의 시설(감시실, 로비, 승강기 기계실, 옥상 설비, 전기실, 데이터센터).
// 캔버스 2D로 직접 그린다. 시간 t 에 따라 화면 차트·표시등·팬이 움직인다.
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
  // 밤 도시 스카이라인(유리창 너머). x0..x1, 바닥 y, 높이 hmax, 시차 px
  const skyline = (ctx, x0, x1, yb, hmax, px, seed, t) => {
    const n = Math.round((x1 - x0) / 26);
    for (let i = 0; i < n; i++) {
      const bw = 18 + rnd(i + seed) * 34;
      const bx = x0 + (i * (x1 - x0)) / n + px * (0.4 + rnd(i + seed + 3) * 0.6);
      const bh = hmax * (0.25 + rnd(i + seed + 9) * 0.75);
      ctx.fillStyle = 'rgb(' + (18 + rnd(i) * 14) + ',' + (24 + rnd(i) * 14) + ',' + (40 + rnd(i) * 20) + ')';
      ctx.fillRect(bx, yb - bh, bw, bh);
      for (let k = 0; k < bh / 9; k++) for (let j = 0; j < bw / 8; j++) {
        if (rnd(i * 97 + k * 13 + j + seed) > 0.55) {
          ctx.fillStyle = rnd(i + k + j * 5) > 0.8 ? 'rgba(255,224,160,0.85)' : 'rgba(255,238,200,0.5)';
          ctx.fillRect(bx + 3 + j * 8, yb - bh + 5 + k * 9, 3, 4);
        }
      }
      if (rnd(i + seed + 21) > 0.82) {
        ctx.fillStyle = Math.sin(t * 2 + i) > 0 ? '#ff5252' : '#5a1a1a';
        ctx.fillRect(bx + bw / 2 - 1, yb - bh - 5, 2, 4); // 항공 장애등
      }
    }
  };
  const nightSky = (ctx, x, y, w, h) => {
    ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, '#0b1326'], [0.6, '#1c2a4a'], [1, '#3a3556']]);
    ctx.fillRect(x, y, w, h);
  };
  // 반들반들한 바닥(위쪽 빛이 비침)
  const polishedFloor = (ctx, W, H, y0, base, lightX, t) => {
    ctx.fillStyle = lin(ctx, 0, y0, 0, H, [[0, base[0]], [1, base[1]]]);
    ctx.fillRect(0, y0, W, H - y0);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, y0, W, 2);
    glow(ctx, lightX, y0 + (H - y0) * 0.35, W * 0.4, 'rgba(255,236,200,A)', 0.1 + 0.01 * Math.sin(t * 3));
  };

  // ───────── 중앙 감시실(BMS): 대형 영상벽과 야경 유리벽 ─────────
  G.anim3d.registerEnv('controlroom', (ctx, W, H, t, view) => {
    const px = (view.yaw || 0) * W * 0.03;
    const u = W / 960;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#1a2230'], [1, '#0e131b']]);
    ctx.fillRect(0, 0, W, H);
    // 유리 커튼월 + 야경
    nightSky(ctx, 0, 0, W, H * 0.5);
    skyline(ctx, 0, W, H * 0.5, H * 0.28, px, 5, t);
    ctx.strokeStyle = 'rgba(150,170,200,0.25)';
    ctx.lineWidth = 3 * u;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo((i * W) / 8, 0);
      ctx.lineTo((i * W) / 8, H * 0.5);
      ctx.stroke();
    }
    ctx.fillStyle = lin(ctx, 0, 0, W, 0, [[0, 'rgba(255,255,255,0.05)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0.04)']]);
    ctx.fillRect(0, 0, W, H * 0.5);
    // 천장 간접조명 띠
    ctx.fillStyle = lin(ctx, 0, 0, 0, 14 * u, [[0, 'rgba(255,226,170,0.9)'], [1, 'rgba(255,226,170,0)']]);
    ctx.fillRect(0, 0, W, 14 * u);
    // 대형 영상벽(3×2)
    const vx = 0.03 * W + px * 0.3;
    const vy = 0.05 * H;
    const vw = 0.5 * W;
    const vh = 0.36 * H;
    ctx.fillStyle = '#0b0f15';
    rr(ctx, vx - 6 * u, vy - 6 * u, vw + 12 * u, vh + 12 * u, 6);
    ctx.fill();
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const sw = vw / 3 - 4 * u;
      const sh = vh / 2 - 4 * u;
      const sx = vx + c * (vw / 3) + 2 * u;
      const sy = vy + r * (vh / 2) + 2 * u;
      ctx.fillStyle = '#0d2238';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = r === 0 ? '#4fd1ff' : '#7dff9b';
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const xx = sx + (k / 40) * sw;
        const yy = sy + sh * (0.55 - 0.3 * Math.sin(k * 0.3 + t * 1.2 + c * 1.7 + r * 2.1) * (0.6 + 0.4 * Math.sin(k * 0.11 + c)));
        k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(79,209,255,0.18)';
      for (let k = 0; k < 6; k++) ctx.fillRect(sx + 6 * u + k * (sw / 7), sy + sh - (6 + 14 * rnd(k + c * 7 + r * 3 + Math.floor(t))) * u, sw / 10, (6 + 14 * rnd(k + c * 7 + r * 3 + Math.floor(t))) * u);
      ctx.fillStyle = 'rgba(210,235,255,0.7)';
      ctx.font = '700 ' + 11 * u + 'px system-ui, sans-serif';
      ctx.fillText(['수전 kW', '변압기 온도', '역률 %', 'UPS', '냉동기', '비상발전기'][r * 3 + c], sx + 6 * u, sy + 14 * u);
    }
    // 바닥(대리석 느낌)과 책상 윤곽
    polishedFloor(ctx, W, H, H * 0.76, ['#1d222b', '#0a0d12'], W * 0.3, t);
    ctx.fillStyle = 'rgba(8,10,14,0.85)';
    rr(ctx, 0.04 * W, H * 0.66, 0.34 * W, 0.12 * H, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,200,255,0.5)';
    ctx.fillRect(0.06 * W, H * 0.67, 0.1 * W, 0.04 * H);
    ctx.fillRect(0.2 * W, H * 0.67, 0.12 * W, 0.04 * H);
    calm(ctx, W, H, 0.3);
  });

  // ───────── 프리미엄 로비: 대리석, 목재 루버, 펜던트 조명, 유리벽 야경 ─────────
  G.anim3d.registerEnv('lobby', (ctx, W, H, t, view) => {
    const px = (view.yaw || 0) * W * 0.03;
    const u = W / 960;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#2a2622'], [1, '#14110f']]);
    ctx.fillRect(0, 0, W, H);
    // 오른쪽: 유리벽 + 야경
    const gx = 0.52 * W;
    nightSky(ctx, gx, 0, W - gx, H * 0.7);
    skyline(ctx, gx, W, H * 0.7, H * 0.3, px, 17, t);
    ctx.strokeStyle = 'rgba(190,205,225,0.28)';
    ctx.lineWidth = 3 * u;
    for (let i = 0; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(gx + (i * (W - gx)) / 5, 0);
      ctx.lineTo(gx + (i * (W - gx)) / 5, H * 0.7);
      ctx.stroke();
    }
    // 왼쪽: 대리석 벽 + 목재 세로 루버
    ctx.fillStyle = lin(ctx, 0, 0, gx, 0, [[0, '#cfc7ba'], [1, '#b7ae9f']]);
    ctx.fillRect(0, 0, gx, H * 0.7);
    ctx.strokeStyle = 'rgba(120,108,92,0.18)';
    ctx.lineWidth = 1.5 * u;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(rnd(i) * gx, 0);
      ctx.bezierCurveTo(rnd(i + 5) * gx, H * 0.2, rnd(i + 9) * gx, H * 0.4, rnd(i + 13) * gx, H * 0.7);
      ctx.stroke();
    }
    const lx0 = 0.04 * W + px * 0.4;
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = i % 2 ? '#8a5e3b' : '#7a512f';
      ctx.fillRect(lx0 + i * 17 * u, 0.06 * H, 12 * u, 0.5 * H);
    }
    ctx.fillStyle = 'rgba(255,214,150,0.2)';
    ctx.fillRect(lx0, 0.06 * H, 14 * 17 * u, 0.5 * H);
    // 펜던트 조명
    [0.2, 0.42, 0.66, 0.86].forEach((fx, i) => {
      const x = fx * W + px * 0.5;
      ctx.strokeStyle = 'rgba(30,26,22,0.9)';
      ctx.lineWidth = 1.5 * u;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 0.12 * H + (i % 2) * 0.04 * H);
      ctx.stroke();
      glow(ctx, x, 0.14 * H + (i % 2) * 0.04 * H, 110 * u, 'rgba(255,225,170,A)', 0.55);
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(x, 0.14 * H + (i % 2) * 0.04 * H, 9 * u, 0, TAU);
      ctx.fill();
    });
    // 접수 데스크
    ctx.fillStyle = '#e6e1d8';
    rr(ctx, 0.05 * W, H * 0.62, 0.3 * W, 0.1 * H, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,200,120,0.85)';
    ctx.fillRect(0.05 * W, H * 0.62 + 0.1 * H - 4 * u, 0.3 * W, 3 * u);
    // 대리석 바닥 + 반사
    polishedFloor(ctx, W, H, H * 0.7, ['#cfc9bf', '#6f6a62'], W * 0.4, t);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 6; i++) ctx.fillRect((i * W) / 6, H * 0.7, 2 * u, H * 0.3);
    ctx.fillStyle = 'rgba(8,8,10,0.38)';
    ctx.fillRect(0, H * 0.7, W, H * 0.3);
    calm(ctx, W, H, 0.28);
  });

  // ───────── 승강기 기계실: 권상기 도르래, 와이어 로프, 제어반 ─────────
  G.anim3d.registerEnv('elevatorroom', (ctx, W, H, t, view) => {
    const px = (view.yaw || 0) * W * 0.03;
    const u = W / 960;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#3a3f46'], [0.7, '#262a30'], [1, '#14171b']]);
    ctx.fillRect(0, 0, W, H);
    // 천장 LED 라인 조명
    for (let i = 0; i < 3; i++) {
      glow(ctx, (0.18 + i * 0.32) * W, 0.04 * H, 200 * u, 'rgba(220,240,255,A)', 0.2);
      ctx.fillStyle = '#eaf4ff';
      rr(ctx, (0.08 + i * 0.32) * W, 0.02 * H, 0.2 * W, 6 * u, 3);
      ctx.fill();
    }
    // 권상기(도르래) — 천천히 회전
    const cx = 0.3 * W + px * 0.4;
    const cy = 0.26 * H;
    const R = 0.15 * H;
    ctx.fillStyle = '#4b535d';
    rr(ctx, cx - R * 1.8, cy + R * 0.7, R * 3.6, R * 0.7, 6);
    ctx.fill();
    ctx.fillStyle = '#2b4a6e';
    ctx.beginPath();
    ctx.arc(cx + R * 1.1, cy + 0.02 * H, R * 0.72, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#bcc6d2';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7a8594';
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.78, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#2f3640';
    ctx.lineWidth = 2.5 * u;
    for (let k = 0; k < 6; k++) {
      const a = t * 0.6 + (k * TAU) / 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72);
      ctx.stroke();
    }
    ctx.fillStyle = '#dfe6ee';
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.14, 0, TAU);
    ctx.fill();
    // 강철 와이어 로프(아래 승강로로 내려감)
    ctx.strokeStyle = 'rgba(200,208,218,0.85)';
    ctx.lineWidth = 2 * u;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + k * 7 * u, cy + R);
      ctx.lineTo(cx + k * 7 * u, H * 0.78);
      ctx.stroke();
    }
    // 제어반(표시등)
    const px2 = 0.58 * W - px * 0.3;
    ctx.fillStyle = '#2d3a4a';
    rr(ctx, px2, 0.1 * H, 0.2 * W, 0.5 * H, 6);
    ctx.fill();
    ctx.fillStyle = '#10171f';
    ctx.fillRect(px2 + 10 * u, 0.13 * H, 0.2 * W - 20 * u, 0.16 * H);
    ctx.fillStyle = 'rgba(120,255,160,0.9)';
    ctx.font = '700 ' + 22 * u + 'px system-ui, sans-serif';
    ctx.fillText(((Math.floor(t * 2) % 30) + 1) + ' F ▲', px2 + 20 * u, 0.23 * H);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = Math.sin(t * 2 + i * 1.3) > 0 ? ['#5ee27b', '#ffb347', '#4fd1ff', '#ff6b6b'][i % 4] : '#27313b';
      ctx.beginPath();
      ctx.arc(px2 + 22 * u + (i % 4) * 30 * u, 0.36 * H + Math.floor(i / 4) * 26 * u, 5 * u, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#c0c8d2';
    ctx.fillRect(px2 + 0.2 * W - 28 * u, 0.4 * H, 6 * u, 0.12 * H);
    // 큰 유리창 너머 도시(기계실 옆면)
    nightSky(ctx, 0.84 * W, 0.08 * H, 0.14 * W, 0.4 * H);
    skyline(ctx, 0.84 * W, 0.98 * W, 0.48 * H, 0.14 * H, px, 33, t);
    ctx.strokeStyle = '#1c2026';
    ctx.lineWidth = 4 * u;
    ctx.strokeRect(0.84 * W, 0.08 * H, 0.14 * W, 0.4 * H);
    // 바닥: 회색 에폭시 + 노란 안전선
    polishedFloor(ctx, W, H, H * 0.78, ['#3a4048', '#101316'], W * 0.4, t);
    ctx.fillStyle = '#e8b923';
    ctx.fillRect(0, H * 0.8, W, 4 * u);
    calm(ctx, W, H, 0.3);
  });

  // ───────── 옥상 설비층: 냉동기, 냉각탑 팬, 배관, 야경 ─────────
  G.anim3d.registerEnv('rooftop', (ctx, W, H, t, view) => {
    const px = (view.yaw || 0) * W * 0.03;
    const u = W / 960;
    const hz = 0.55 * H;
    ctx.fillStyle = lin(ctx, 0, 0, 0, hz, [[0, '#0d1428'], [0.6, '#3a3560'], [1, '#e0845c']]);
    ctx.fillRect(0, 0, W, hz);
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + 0.4 * rnd(i + 4)) + ')';
      ctx.fillRect(rnd(i) * W, rnd(i + 70) * hz * 0.55, 1.5 * u, 1.5 * u);
    }
    skyline(ctx, 0, W, hz, H * 0.3, px, 51, t);
    // 옥상 바닥
    ctx.fillStyle = lin(ctx, 0, hz, 0, H, [[0, '#3a3d42'], [1, '#14161a']]);
    ctx.fillRect(0, hz, W, H - hz);
    // 난간
    ctx.strokeStyle = 'rgba(210,216,224,0.7)';
    ctx.lineWidth = 2.5 * u;
    ctx.beginPath();
    ctx.moveTo(0, hz + 10 * u);
    ctx.lineTo(W, hz + 10 * u);
    ctx.stroke();
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.moveTo((i * W) / 30, hz + 10 * u);
      ctx.lineTo((i * W) / 30, hz + 34 * u);
      ctx.stroke();
    }
    // 냉동기(칠러)와 냉각 팬
    const unit = (x, w, h) => {
      ctx.fillStyle = lin(ctx, x, 0, x + w, 0, [[0, '#c9d1da'], [1, '#8a94a1']]);
      rr(ctx, x, hz - h + 36 * u, w, h, 5);
      ctx.fill();
      ctx.fillStyle = '#1c232c';
      ctx.beginPath();
      ctx.arc(x + w / 2, hz - h + 36 * u + h * 0.36, w * 0.34, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#9aa5b3';
      ctx.lineWidth = 3 * u;
      for (let k = 0; k < 4; k++) {
        const a = t * 5 + (k * TAU) / 4;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, hz - h + 36 * u + h * 0.36);
        ctx.lineTo(x + w / 2 + Math.cos(a) * w * 0.32, hz - h + 36 * u + h * 0.36 + Math.sin(a) * w * 0.32);
        ctx.stroke();
      }
      ctx.fillStyle = '#4fd1ff';
      ctx.fillRect(x + 8 * u, hz + 36 * u - 12 * u, w - 16 * u, 4 * u);
    };
    unit(0.04 * W + px * 0.3, 0.17 * W, 0.26 * H);
    unit(0.24 * W + px * 0.3, 0.17 * W, 0.22 * H);
    unit(0.72 * W - px * 0.3, 0.2 * W, 0.28 * H);
    // 배관(냉수 파랑 / 온수 빨강)
    ctx.lineWidth = 7 * u;
    ctx.strokeStyle = '#3d7ccf';
    ctx.beginPath();
    ctx.moveTo(0, hz + 52 * u);
    ctx.lineTo(W, hz + 52 * u);
    ctx.stroke();
    ctx.strokeStyle = '#c94f4f';
    ctx.beginPath();
    ctx.moveTo(0, hz + 66 * u);
    ctx.lineTo(W, hz + 66 * u);
    ctx.stroke();
    calm(ctx, W, H, 0.26);
  });

  // ───────── 고급 전기실(수변전실): 흰색 배전반, 터치 HMI, 버스덕트 ─────────
  G.anim3d.registerEnv('electricalroom', (ctx, W, H, t, view) => {
    const px = (view.yaw || 0) * W * 0.03;
    const u = W / 960;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#2a3038'], [1, '#12161b']]);
    ctx.fillRect(0, 0, W, H);
    // 천장 LED 패널
    for (let i = 0; i < 5; i++) {
      const lx = (0.04 + i * 0.2) * W + px * 0.3;
      glow(ctx, lx + 55 * u, 0.04 * H, 140 * u, 'rgba(220,240,255,A)', 0.24);
      ctx.fillStyle = '#f2f8ff';
      rr(ctx, lx, 0.02 * H, 110 * u, 7 * u, 3);
      ctx.fill();
    }
    // 버스덕트(굵은 금속 덕트)
    ctx.fillStyle = lin(ctx, 0, 0.09 * H, 0, 0.17 * H, [[0, '#9aa5b2'], [1, '#6b7683']]);
    ctx.fillRect(0, 0.09 * H, W, 0.07 * H);
    ctx.strokeStyle = 'rgba(30,36,44,0.6)';
    ctx.lineWidth = 2 * u;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.moveTo((i * W) / 14, 0.09 * H);
      ctx.lineTo((i * W) / 14, 0.16 * H);
      ctx.stroke();
    }
    ctx.fillStyle = '#e4572e';
    ctx.fillRect(0, 0.092 * H, W, 3 * u);
    // 배전반 캐비닛(흰색 + 파란 포인트 + HMI 화면)
    const base = 0.72 * H;
    for (let i = 0; i < 8; i++) {
      const cw = 0.11 * W;
      const x = 0.02 * W + i * (cw + 0.01 * W) + px * 0.4;
      const h = 0.46 * H;
      ctx.fillStyle = lin(ctx, x, 0, x + cw, 0, [[0, '#f0f3f6'], [1, '#c3cad3']]);
      rr(ctx, x, base - h, cw, h, 3);
      ctx.fill();
      ctx.fillStyle = '#1f66d1';
      ctx.fillRect(x, base - h, cw, 6 * u);
      // 터치 HMI
      ctx.fillStyle = '#0b1622';
      ctx.fillRect(x + 8 * u, base - h + 16 * u, cw - 16 * u, h * 0.2);
      ctx.strokeStyle = i % 2 ? '#4fd1ff' : '#7dff9b';
      ctx.lineWidth = 1.6 * u;
      ctx.beginPath();
      for (let k = 0; k <= 16; k++) {
        const xx = x + 10 * u + (k / 16) * (cw - 20 * u);
        const yy = base - h + 16 * u + h * 0.1 + Math.sin(k * 0.8 + t * 3 + i) * h * 0.05;
        k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
      // 문 이음선과 손잡이, 표시등
      ctx.strokeStyle = 'rgba(40,50,60,0.45)';
      ctx.lineWidth = 1.5 * u;
      ctx.strokeRect(x + 6 * u, base - h + h * 0.3, cw - 12 * u, h * 0.62);
      ctx.fillStyle = '#7b8794';
      ctx.fillRect(x + cw * 0.78, base - h * 0.5, 4 * u, h * 0.16);
      ctx.fillStyle = Math.sin(t * 1.5 + i * 1.9) > -0.3 ? '#3ddc84' : '#1c5a38';
      ctx.beginPath();
      ctx.arc(x + cw * 0.2, base - h * 0.34, 4 * u, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f4c20d';
      ctx.beginPath();
      ctx.moveTo(x + cw * 0.5, base - h * 0.26);
      ctx.lineTo(x + cw * 0.5 + 8 * u, base - h * 0.26 + 14 * u);
      ctx.lineTo(x + cw * 0.5 - 8 * u, base - h * 0.26 + 14 * u);
      ctx.closePath();
      ctx.fill();
    }
    // 에폭시 바닥(반사)
    polishedFloor(ctx, W, H, base, ['#4a5663', '#0d1014'], W * 0.5, t);
    ctx.fillStyle = 'rgba(240,248,255,0.12)';
    for (let i = 0; i < 8; i++) ctx.fillRect(0.02 * W + i * 0.12 * W + 12 * u, base, 0.08 * W, 0.26 * H);
    ctx.fillStyle = '#e8b923';
    ctx.fillRect(0, base + 0.05 * H, W, 4 * u);
    calm(ctx, W, H, 0.3);
  });

  // ───────── 데이터센터/UPS실: 서버 랙 열, 깜빡이는 LED, 케이블 트레이 ─────────
  G.anim3d.registerEnv('datacenter', (ctx, W, H, t, view) => {
    const px = (view.yaw || 0) * W * 0.03;
    const u = W / 960;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#10161f'], [1, '#080b10']]);
    ctx.fillRect(0, 0, W, H);
    // 케이블 트레이와 천장 라인 조명
    ctx.fillStyle = '#5b6573';
    ctx.fillRect(0, 0.08 * H, W, 6 * u);
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = ['#2f7bff', '#e4572e', '#f4c20d', '#2c3138'][i % 4];
      ctx.fillRect(i * (W / 36) + 2, 0.058 * H, W / 36 - 4, 7 * u);
    }
    ctx.fillStyle = 'rgba(120,190,255,0.9)';
    ctx.fillRect(0, 0.02 * H, W, 3 * u);
    glow(ctx, W / 2, 0.03 * H, W * 0.5, 'rgba(100,170,255,A)', 0.2);
    // 서버 랙 열
    const base = 0.74 * H;
    for (let i = 0; i < 13; i++) {
      const rw = 0.068 * W;
      const x = 0.01 * W + i * (rw + 0.008 * W) + px * 0.4;
      const h = 0.5 * H;
      ctx.fillStyle = '#1a2029';
      rr(ctx, x, base - h, rw, h, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,140,170,0.35)';
      ctx.lineWidth = 1.2 * u;
      ctx.strokeRect(x, base - h, rw, h);
      for (let k = 0; k < 14; k++) {
        const y = base - h + 8 * u + k * (h - 16 * u) / 14;
        ctx.fillStyle = '#10151c';
        ctx.fillRect(x + 4 * u, y, rw - 8 * u, (h - 16 * u) / 14 - 2 * u);
        for (let j = 0; j < 3; j++) {
          const on = Math.sin(t * (2 + rnd(i * 31 + k + j) * 4) + rnd(i + k * 7 + j) * 6) > 0.1;
          ctx.fillStyle = on ? (j === 0 ? '#3ddc84' : j === 1 ? '#4fd1ff' : '#ffb347') : '#1c2a33';
          ctx.fillRect(x + 8 * u + j * 8 * u, y + 3 * u, 4 * u, 3 * u);
        }
      }
      glow(ctx, x + rw / 2, base - h * 0.5, rw * 1.2, 'rgba(70,150,255,A)', 0.09);
    }
    // 레이즈드 플로어(타일 격자) + 반사
    polishedFloor(ctx, W, H, base, ['#202a36', '#080b10'], W * 0.5, t);
    ctx.strokeStyle = 'rgba(140,170,210,0.12)';
    ctx.lineWidth = 1 * u;
    for (let i = 0; i < 24; i++) {
      ctx.beginPath();
      ctx.moveTo((i * W) / 24, base);
      ctx.lineTo(W / 2 + ((i - 12) * W) / 10, H);
      ctx.stroke();
    }
    for (let j = 1; j < 5; j++) {
      ctx.beginPath();
      ctx.moveTo(0, base + (j * j * (H - base)) / 16);
      ctx.lineTo(W, base + (j * j * (H - base)) / 16);
      ctx.stroke();
    }
    calm(ctx, W, H, 0.3);
  });
})(globalThis.GISA);
