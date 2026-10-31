// 화면 전용 연출: 파티클(작은 조각들), 떠오르는 글자, 화면 흔들림.
// 게임 규칙에는 아무 영향을 주지 않는다.

const rand = (a, b) => a + Math.random() * (b - a);

export function createEffects() {
  const particles = [];
  const texts = [];
  const rings = [];
  const slashes = [];

  function add(p) {
    if (particles.length > 600) return;
    particles.push({ life: 0, gravity: 0, drag: 0, size: 1.5, shape: 'rect', spin: 0, rot: 0, ...p });
  }

  const fx = {
    sparkle(x, y, n = 8, color = '#ffe27a') {
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(30, 90);
        add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: rand(0.25, 0.5), color, size: rand(1, 2), drag: 4, shape: 'star' });
      }
    },
    feathers(x, y, color = '#f4f1e8', n = 12) {
      for (let i = 0; i < n; i++) {
        add({ x, y, vx: rand(-70, 70), vy: rand(-110, -30), max: rand(0.8, 1.5), color, size: rand(1.5, 2.6), gravity: 120, drag: 3.2, shape: 'feather', spin: rand(-8, 8) });
      }
    },
    smoke(x, y, n = 10) {
      for (let i = 0; i < n; i++) {
        add({ x: x + rand(-4, 4), y: y + rand(-4, 4), vx: rand(-35, 35), vy: rand(-50, -10), max: rand(0.5, 0.9), color: i % 3 ? '#140d1f' : '#4b2d73', size: rand(3, 6), drag: 2.5, shape: 'puff' });
      }
    },
    sparks(x, y, color = '#fff6d0', n = 5) {
      for (let i = 0; i < n; i++) {
        add({ x, y, vx: rand(-80, 80), vy: rand(-90, -10), max: rand(0.15, 0.3), color, size: 1, gravity: 300, shape: 'rect' });
      }
    },
    dust(x, n = 3, dir = 0) {
      for (let i = 0; i < n; i++) {
        add({ x: x + rand(-2, 2), y: -1, vx: rand(-15, 15) - dir * 20, vy: rand(-18, -4), max: rand(0.3, 0.5), color: '#6b5a4a', size: rand(1.2, 2.4), drag: 3, shape: 'puff' });
      }
    },
    chips(x, n = 6) {
      for (let i = 0; i < n; i++) {
        add({ x, y: rand(-20, -6), vx: rand(-60, 60), vy: rand(-110, -40), max: rand(0.5, 0.9), color: i % 2 ? '#8a5a2b' : '#c48a4a', size: rand(1.2, 2.2), gravity: 400, shape: 'rect', spin: rand(-12, 12) });
      }
    },
    confetti(x, y, n = 24) {
      const colors = ['#ffd34d', '#fff1a8', '#ff9f43', '#7be0ff'];
      for (let i = 0; i < n; i++) {
        add({ x, y, vx: rand(-90, 90), vy: rand(-170, -60), max: rand(0.7, 1.2), color: colors[i % colors.length], size: rand(1.2, 2.2), gravity: 260, drag: 1.5, shape: 'rect', spin: rand(-14, 14) });
      }
    },
    ring(x, y, color = '#ffe27a', maxR = 26) {
      rings.push({ x, y, color, maxR, life: 0, max: 0.4 });
    },
    // 칼 휘두른 궤적 (초승달 모양)
    slash(x, y, facing) {
      slashes.push({ x, y, facing, life: 0, max: 0.16 });
    },
    text(x, y, str, color = '#ffe27a', size = 8) {
      texts.push({ x, y, str, color, size, life: 0, max: 0.9 });
    },

    update(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max) { particles.splice(i, 1); continue; }
        p.vy += p.gravity * dt;
        const d = Math.exp(-p.drag * dt);
        p.vx *= d; p.vy *= d;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.shape === 'feather') p.x += Math.sin(p.life * 9 + p.spin) * 12 * dt;
        p.rot += p.spin * dt;
        if (p.y > 0 && p.gravity > 0) { p.y = 0; p.vy *= -0.3; p.vx *= 0.5; }
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        t.life += dt;
        if (t.life >= t.max) texts.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.life += dt;
        if (r.life >= r.max) rings.splice(i, 1);
      }
      for (let i = slashes.length - 1; i >= 0; i--) {
        const sl = slashes[i];
        sl.life += dt;
        if (sl.life >= sl.max) slashes.splice(i, 1);
      }
    },

    // ctx는 월드 좌표로 변환된 상태
    draw(ctx) {
      for (const r of rings) {
        const p = r.life / r.max;
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2 * (1 - p) + 0.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.maxR * easeOut(p), 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const sl of slashes) {
        const p = sl.life / sl.max;
        ctx.save();
        ctx.translate(sl.x, sl.y);
        ctx.scale(sl.facing, 1);
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = '#f4f7ff';
        ctx.beginPath();
        const a0 = -1.6 + p * 0.6;
        const a1 = 1.0 + p * 0.4;
        ctx.arc(-3, 0, 9, a0, a1);
        ctx.arc(-5, 0, 7.5, a1, a0, true);
        ctx.fill();
        ctx.restore();
      }
      for (const p of particles) {
        const k = 1 - p.life / p.max;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.fillStyle = p.color;
        if (p.shape === 'puff') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.4 - k * 0.6), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'star') {
          const s = p.size * (0.5 + k);
          ctx.fillRect(p.x - s, p.y - 0.4, s * 2, 0.8);
          ctx.fillRect(p.x - 0.4, p.y - s, 0.8, s * 2);
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          const w = p.shape === 'feather' ? p.size * 1.8 : p.size;
          ctx.fillRect(-w / 2, -p.size / 2, w, p.size);
          ctx.restore();
        }
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const t of texts) {
        const p = t.life / t.max;
        const pop = p < 0.15 ? 0.6 + (p / 0.15) * 0.6 : 1.2 - Math.min(0.2, (p - 0.15));
        ctx.globalAlpha = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
        ctx.font = `bold ${t.size * pop}px system-ui, sans-serif`;
        const y = t.y - easeOut(p) * 16;
        ctx.fillStyle = '#1a1020';
        ctx.fillText(t.str, t.x + 0.6, y + 0.6);
        ctx.fillStyle = t.color;
        ctx.fillText(t.str, t.x, y);
      }
      ctx.globalAlpha = 1;
    },
  };
  return fx;
}

export const easeOut = (t) => 1 - (1 - t) * (1 - t);
