// 익숙해졌을 때 축하 효과: 🎉 파티 폭죽처럼 작은 색종이가 그 자리(anchor)에서만 터진다.
// 화면 움직임을 줄이는 설정(prefers-reduced-motion)이면 효과 없이 false를 돌려주고, 호출한 쪽이 짧은 알림만 띄운다.
(function (G) {
  'use strict';
  if (typeof document === 'undefined') return;

  const COLORS = ['#e8553d', '#f2b134', '#3fae7a', '#3d8fe0', '#a867d6', '#ef6aa0'];
  const PER_CANNON = 14;
  let layer = null;
  let timer = 0;

  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const rnd = (a, b) => a + Math.random() * (b - a);

  function clear() {
    clearTimeout(timer);
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = null;
  }

  // 한 방향으로 쏘아 올렸다가 중력으로 떨어지는 색종이
  function cannon(x, y, dir) {
    for (let i = 0; i < PER_CANNON; i++) {
      const p = document.createElement('span');
      p.className = 'cele-bit' + (i % 3 === 0 ? ' round' : '');
      const size = rnd(5, 9);
      p.style.width = size + 'px';
      p.style.height = (i % 3 === 0 ? size : size * 1.7) + 'px';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = COLORS[(i + (dir > 0 ? 0 : 3)) % COLORS.length];
      layer.appendChild(p);
      const dx = dir * rnd(18, 90);
      const up = rnd(40, 95);
      const fall = rnd(20, 70);
      const rot = rnd(-540, 540);
      const dur = rnd(900, 1500);
      if (p.animate) {
        p.animate(
          [
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: 'translate(' + dx * 0.65 + 'px,' + -up + 'px) rotate(' + rot * 0.5 + 'deg)', opacity: 1, offset: 0.4 },
            { transform: 'translate(' + dx + 'px,' + fall + 'px) rotate(' + rot + 'deg)', opacity: 0 },
          ],
          { duration: dur, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }
        );
      }
    }
  }

  // title: 작은 글씨 배지, sub: 포인트 이름, anchor: 폭죽이 터질 요소(없으면 화면 가운데 위쪽)
  function play(title, sub, anchor) {
    if (reduced()) return false;
    clear();
    layer = document.createElement('div');
    layer.className = 'cele';
    layer.setAttribute('aria-hidden', 'true');
    const sx = window.pageXOffset || 0;
    const sy = window.pageYOffset || 0;
    let r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
    if (!r) r = { left: window.innerWidth * 0.2, right: window.innerWidth * 0.8, top: window.innerHeight * 0.4, width: window.innerWidth * 0.6 };
    const top = r.top + sy;
    const badge = document.createElement('div');
    badge.className = 'cele-badge';
    const b1 = document.createElement('strong');
    b1.textContent = '🎉 ' + title;
    badge.appendChild(b1);
    if (sub) {
      const b2 = document.createElement('span');
      b2.textContent = sub;
      badge.appendChild(b2);
    }
    badge.style.left = r.left + sx + r.width / 2 + 'px';
    badge.style.top = top - 6 + 'px';
    layer.appendChild(badge);
    cannon(r.left + sx + 6, top + 4, 1);
    cannon(r.right + sx - 6, top + 4, -1);
    document.body.appendChild(layer);
    timer = setTimeout(clear, 2600);
    return true;
  }

  G.celebrate = { play, clear, active: () => !!layer };
})(globalThis.GISA);
