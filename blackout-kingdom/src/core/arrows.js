import { CONFIG } from '../config.js';
import { emit, clamp } from './util.js';
import { damageAnimal } from './animals.js';
import { damageEnemy } from './enemies.js';

// 궁수 → 목표까지 포물선으로 날아가도록 처음 속도를 계산해서 화살을 쏜다.
export function fireArrow(world, archer, target) {
  const cfg = CONFIG.archer;
  const g = cfg.arrowGravity;
  const sx = archer.x + archer.facing * 5;
  const sy = -13;
  const dist = Math.abs(target.x - sx);
  const T = clamp(dist / cfg.arrowSpeed, 0.35, 1.1);
  // 움직이는 목표는 조금 앞을 노린다 + 멀수록 조금씩 빗나감
  const tx = target.x + (target.vx || 0) * T + world.rng.range(-1, 1) * cfg.spread * (dist / cfg.range);
  const ty = (target.y || 0) - target.h * 0.5 + (target.vy || 0) * T;
  world.arrows.push({
    x: sx,
    y: sy,
    vx: (tx - sx) / T,
    vy: (ty - sy - 0.5 * g * T * T) / T,
    stuck: false,
    life: 0,
    angle: 0,
  });
  emit(world, 'arrowFired', { x: sx, y: sy });
}

function hits(arrow, t) {
  const ty = t.y || 0;
  return Math.abs(arrow.x - t.x) < t.w / 2 + 1 && arrow.y > ty - t.h - 1 && arrow.y < ty + 1;
}

export function updateArrows(world, dt) {
  const g = CONFIG.archer.arrowGravity;
  const half = CONFIG.world.halfWidth + 100;

  for (let i = world.arrows.length - 1; i >= 0; i--) {
    const a = world.arrows[i];
    a.life += dt;

    if (a.stuck) {
      if (a.life > 2.5) world.arrows.splice(i, 1);
      continue;
    }

    a.vy += g * dt;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.angle = Math.atan2(a.vy, a.vx);

    let hit = null;
    for (const e of world.enemies) if (hits(a, e)) { hit = e; break; }
    if (hit) {
      world.arrows.splice(i, 1);
      emit(world, 'arrowHit', { x: a.x, y: a.y, target: 'enemy' });
      damageEnemy(world, hit, 1, a.vx);
      continue;
    }
    for (const an of world.animals) if (hits(a, an)) { hit = an; break; }
    if (hit) {
      world.arrows.splice(i, 1);
      emit(world, 'arrowHit', { x: a.x, y: a.y, target: 'animal' });
      damageAnimal(world, hit, 1);
      continue;
    }

    if (a.y >= 0) {
      a.y = 0;
      a.stuck = true;
      a.life = 0;
      emit(world, 'arrowMiss', { x: a.x });
    } else if (Math.abs(a.x) > half) {
      world.arrows.splice(i, 1);
    }
  }
}
