// WhatIf Studio — 2D 합성: 3D 화면 + 상단 팩트 + HUD + 대형 자막 + 훅(댓글/카운트다운) + outro
(function (WI) {
  const { clamp, E } = WI;
  const SERIF = '"Nanum Myeongjo", serif';
  const SANS = '"Noto Sans KR"';

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 공백 단위 줄바꿈 (레퍼런스 safeWrapText)
  function wrap(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return [text];
    const lines = [];
    let cur = '';
    for (const w of text.split(' ')) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  const px = v => +v.toFixed(2);

  // view: 언어가 적용된 { timeline, hook, outroTitle }
  WI.createCompositor = function (canvas, W, view, layout, scale) {
    const ctx = canvas.getContext('2d');
    const { W: CW, H: CH } = layout;
    const font = (w, size, fam) => `${w} ${px(size)}px ${fam}`;
    const tl = view.timeline;

    return function renderComposite(t) {
      W.render();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, CW, CH);

      const item = tl.find(d => t >= d.s && t < d.e) || tl[tl.length - 1];
      const sceneDur = item.e - item.s;
      const sceneElapsed = Math.max(0, t - item.s);
      const lines = item.narLines || [];
      const lineCount = lines.length ? lines.length : 1;
      const segDur = sceneDur / lineCount;
      const activeIdx = Math.min(lineCount - 1, Math.floor(sceneElapsed / segDur));
      const segElapsed = sceneElapsed - activeIdx * segDur;
      const para = lines.length ? lines[activeIdx] : '';
      const fadeIn = clamp(segElapsed / 0.32, 0, 1);
      const fadeOut = clamp((segDur - segElapsed) / 0.25, 0, 1);
      const paraAlpha = Math.min(fadeIn, fadeOut);
      const slideY = (1 - E(fadeIn)) * 10 * layout.u;
      const factAlpha = clamp(sceneElapsed / 0.4, 0, 1);

      if (item.outro) {
        const o = layout.outro;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, CW, CH);
        ctx.save();
        ctx.globalAlpha = paraAlpha;
        ctx.fillStyle = '#dfe6f5';
        ctx.font = font(700, o.size, SERIF);
        ctx.textAlign = 'center';
        wrap(ctx, para, o.wrapW).forEach((ln, i) => ctx.fillText(ln, o.cx, o.y + i * o.gap + slideY, o.maxW));
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = factAlpha;
        ctx.font = font(400, o.titleSize, SERIF);
        ctx.fillStyle = '#8f98ab';
        ctx.textAlign = 'center';
        ctx.fillText(view.outroTitle, o.cx, o.titleY, o.titleMaxW);
        ctx.restore();
        return;
      }

      ctx.drawImage(W.renderer.domElement, 0, 0, CW, CH);

      if (item.comment) {
        const c = layout.comments, h = layout.hook, hook = view.hook;
        if (t < hook.until) {
          ctx.save();
          ctx.strokeStyle = 'rgba(200, 215, 245, 0.25)';
          ctx.lineWidth = c.lw;
          hook.comments.forEach((cm, i) => {
            const y = c.ys[i];
            ctx.fillStyle = 'rgba(10, 14, 26, 0.88)';
            roundRect(ctx, c.x, y, c.w, c.h, c.r);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#c3cadb'; ctx.font = font(500, c.userSize, SANS); ctx.textAlign = 'left';
            ctx.fillText(cm.user, c.tx, y + c.userDy);
            ctx.fillStyle = '#ffffff'; ctx.font = font(700, c.textSize, SANS);
            ctx.fillText(cm.text, c.tx, y + c.textDy[i], c.textMaxW);
          });
          ctx.restore();
        }
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = h.blur * scale; // 그림자는 변환 행렬 영향 없음 → 배율 보정
        ctx.font = font(700, h.size, SERIF);
        hook.title.forEach((ln, i) => ctx.fillText(ln, h.cx, h.ys[i], h.maxW));
        const cd = hook.countdown;
        const cnt = Math.max(1, cd.from - Math.floor(t * cd.rate));
        ctx.textAlign = 'left';
        ctx.font = font(700, h.cntSize, SERIF);
        ctx.fillText(String(cnt), h.cntX, h.cntY);
        ctx.font = font(500, h.labelSize, SERIF);
        ctx.fillText(cd.label, h.cntX, h.labelY);
        ctx.restore();
        return;
      }

      if (item.fact) {
        const f = layout.fact;
        ctx.save();
        ctx.globalAlpha = factAlpha;
        ctx.textAlign = f.align;
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = f.blur * scale; // 그림자는 변환 행렬 영향 없음 → 배율 보정
        ctx.fillStyle = '#e4ecff';
        ctx.font = font(700, f.size, SERIF);
        ctx.fillText(item.fact, f.x, f.y, f.maxW);
        ctx.font = font(500, f.subSize, SERIF);
        ctx.fillStyle = '#c3cadb';
        ctx.fillText(item.sub, f.subX, f.subY, f.maxW);
        ctx.restore();
      }

      if (W.hud) {
        const hd = layout.hud;
        ctx.save();
        ctx.globalAlpha = factAlpha;
        ctx.textAlign = hd.align;
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = hd.blur * scale; // 그림자는 변환 행렬 영향 없음 → 배율 보정
        ctx.fillStyle = W.hud.color || '#ffd98a';
        ctx.font = font(700, hd.size, SERIF);
        ctx.fillText(W.hud.big, hd.x, hd.y, hd.maxW);
        ctx.fillStyle = '#c3cadb';
        ctx.font = font(500, hd.smallSize, SERIF);
        ctx.fillText(W.hud.small, hd.x, hd.smallY, hd.maxW);
        ctx.restore();
      }

      if (para) {
        const s = layout.sub;
        ctx.save();
        ctx.globalAlpha = paraAlpha;
        const grad = ctx.createRadialGradient(s.grad.x, s.grad.y, s.grad.r0, s.grad.x, s.grad.y, s.grad.r1);
        grad.addColorStop(0, 'rgba(4, 6, 12, 0.82)');
        grad.addColorStop(1, 'rgba(4, 6, 12, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(...s.rect);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.95)';
        ctx.shadowBlur = s.blur * scale; // 그림자는 변환 행렬 영향 없음 → 배율 보정
        ctx.font = font(700, s.size, SERIF);
        const wl = wrap(ctx, para, s.wrapW);
        const startY = wl.length === 1 ? s.y1 : s.y2;
        wl.forEach((ln, i) => ctx.fillText(ln, s.cx, startY + i * s.gap + slideY, s.maxW));
        ctx.restore();
      }
    };
  };
})(window.WI = window.WI || {});
