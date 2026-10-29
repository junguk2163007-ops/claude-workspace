// WhatIf Studio — 레이아웃 프로필 (portrait 9:16 / landscape 16:9)
// 모든 좌표는 논리 캔버스(W×H) 기준. portrait 720×1280 값은 레퍼런스와 동일하다.
// 글자 크기·그림자·여백은 u = min(W,H)/720 로 스케일.
(function (WI) {
  WI.RATIOS = {
    '9x16': { W: 720, H: 1280, exportScale: 1.5, profile: 'portrait' },
    '16x9': { W: 1280, H: 720, exportScale: 1.5, profile: 'landscape' },
  };
  WI.ratioKey = r => (r || '9x16').replace(':', 'x');

  WI.makeLayout = function (W, H) {
    const u = Math.min(W, H) / 720;
    const cx = W / 2;
    if (H >= W) {
      // portrait: 상단 팩트, 상단 1/4 대형 자막, 중앙 HUD (레퍼런스 배치)
      return {
        profile: 'portrait', W, H, u,
        fact: { x: 50 * u, y: 165 * u, size: 52 * u, maxW: 620 * u, align: 'left',
                subX: 52 * u, subY: 205 * u, subSize: 21 * u, blur: 14 * u },
        hud: { x: cx, y: 430 * u, size: 40 * u, maxW: 640 * u, align: 'center',
               smallY: 468 * u, smallSize: 20 * u, blur: 12 * u },
        sub: { cx, y1: 292 * u, y2: 272 * u, gap: 44 * u, size: 36 * u, wrapW: 600 * u, maxW: 620 * u,
               grad: { x: cx, y: 285 * u, r0: 10 * u, r1: 240 * u }, rect: [40 * u, 220 * u, 640 * u, 115 * u], blur: 12 * u },
        comments: { x: 50 * u, ys: [85 * u, 200 * u], w: 620 * u, h: 100 * u, r: 16 * u, lw: 2 * u,
                    tx: 80 * u, userDy: 35 * u, textDy: [73 * u, 72 * u], userSize: 18 * u, textSize: 24 * u, textMaxW: 560 * u },
        hook: { cx, ys: [800 * u, 860 * u], size: 44 * u, maxW: 600 * u, blur: 12 * u,
                cntX: 72 * u, cntY: 990 * u, cntSize: 88 * u, labelY: 1030 * u, labelSize: 24 * u },
        outro: { cx, y: 610 * u, gap: 46 * u, size: 36 * u, wrapW: 600 * u, maxW: 640 * u,
                 titleY: 720 * u, titleSize: 22 * u, titleMaxW: 600 * u },
      };
    }
    // landscape: 좌상단 팩트, 하단 1/5 중앙 자막(폭 넓게), 우상단 HUD. 안전 여백 5%.
    const mx = W * 0.05, my = H * 0.05;
    const subY = H * 0.8;
    return {
      profile: 'landscape', W, H, u,
      fact: { x: mx, y: my + 56 * u, size: 52 * u, maxW: W * 0.5, align: 'left',
              subX: mx + 2 * u, subY: my + 94 * u, subSize: 21 * u, blur: 14 * u },
      hud: { x: W - mx, y: my + 48 * u, size: 40 * u, maxW: W * 0.4, align: 'right',
             smallY: my + 84 * u, smallSize: 20 * u, blur: 12 * u },
      sub: { cx, y1: subY + 12 * u, y2: subY - 10 * u, gap: 44 * u, size: 38 * u, wrapW: W * 0.78, maxW: W * 0.8,
             grad: { x: cx, y: subY, r0: 10 * u, r1: W * 0.36 }, rect: [W * 0.1, subY - 62 * u, W * 0.8, 120 * u], blur: 12 * u },
      comments: { x: mx, ys: [my + 10 * u, my + 125 * u], w: 600 * u, h: 100 * u, r: 16 * u, lw: 2 * u,
                  tx: mx + 30 * u, userDy: 35 * u, textDy: [73 * u, 72 * u], userSize: 18 * u, textSize: 24 * u, textMaxW: 540 * u },
      hook: { cx, ys: [H * 0.6, H * 0.6 + 60 * u], size: 44 * u, maxW: W * 0.7, blur: 12 * u,
              cntX: W - mx - 230 * u, cntY: H - my - 70 * u, cntSize: 88 * u, labelY: H - my - 30 * u, labelSize: 24 * u },
      outro: { cx, y: H / 2 - 30 * u, gap: 46 * u, size: 36 * u, wrapW: W * 0.7, maxW: W * 0.8,
               titleY: H / 2 + 80 * u, titleSize: 22 * u, titleMaxW: W * 0.7 },
    };
  };
})(window.WI = window.WI || {});
