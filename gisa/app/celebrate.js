// 익숙해졌을 때 축하 효과: 풍선이 떠오르고, 눌러서 터뜨릴 수 있다.
// 화면 움직임을 줄이는 설정(prefers-reduced-motion)이면 효과 없이 문구만 보여 준다(호출한 쪽의 토스트).
(function (G) {
  'use strict';
  if (typeof document === 'undefined') return;

  const COLORS = ['#e8553d', '#f2b134', '#3fae7a', '#3d8fe0', '#a867d6', '#ef6aa0'];
  const COUNT = 14;
  let layer = null;
  let timer = 0;

  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const el = (cls) => {
    const n = document.createElement('div');
    n.className = cls;
    return n;
  };

  function clear() {
    clearTimeout(timer);
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = null;
  }

  // 터진 자리에서 조각이 사방으로 튄다
  function burst(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const p = el('cele-bit');
      const a = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
      const d = 40 + Math.random() * 50;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = i % 3 === 0 ? '#ffd966' : color;
      p.style.setProperty('--dx', Math.cos(a) * d + 'px');
      p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      layer.appendChild(p);
      setTimeout(() => p.parentNode && p.parentNode.removeChild(p), 700);
    }
  }

  function finishIfEmpty() {
    if (layer && !layer.querySelector('.cele-bl')) {
      timer = setTimeout(clear, 900);
    }
  }

  // title: 큰 글씨, sub: 작은 글씨(포인트 이름)
  function play(title, sub) {
    if (reduced()) return false;
    clear();
    layer = el('cele');
    layer.setAttribute('aria-hidden', 'true');
    const card = el('cele-card');
    const t = el('cele-title');
    t.textContent = title;
    const s = el('cele-sub');
    s.textContent = sub || '';
    const hint = el('cele-hint');
    hint.textContent = '풍선을 눌러서 터뜨려 봐! 0/' + COUNT;
    card.append(t, s);
    layer.append(card, hint);
    let popped = 0;
    for (let i = 0; i < COUNT; i++) {
      const b = el('cele-bl');
      const size = 46 + Math.random() * 26;
      const color = COLORS[i % COLORS.length];
      b.style.left = 4 + (92 * (i + Math.random() * 0.6)) / COUNT + '%';
      b.style.width = size + 'px';
      b.style.height = size * 1.22 + 'px';
      b.style.background = 'radial-gradient(circle at 32% 28%, #ffffffaa 0 12%, ' + color + ' 40%)';
      b.style.setProperty('--c', color);
      b.style.animationDuration = 3.6 + Math.random() * 2.2 + 's';
      b.style.animationDelay = Math.random() * 0.9 + 's';
      b.style.setProperty('--sway', (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 26) + 'px');
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const r = b.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, color);
        b.parentNode.removeChild(b);
        popped++;
        hint.textContent = popped >= COUNT ? '전부 터뜨렸다! 🎉' : '풍선을 눌러서 터뜨려 봐! ' + popped + '/' + COUNT;
        finishIfEmpty();
      });
      b.addEventListener('animationend', () => {
        if (b.parentNode) b.parentNode.removeChild(b);
        finishIfEmpty();
      });
      layer.appendChild(b);
    }
    // 마지막 안전장치: 어떤 이유로든 9초 뒤엔 정리
    timer = setTimeout(clear, 9000);
    document.body.appendChild(layer);
    return true;
  }

  G.celebrate = { play, clear, active: () => !!layer };
})(globalThis.GISA);
