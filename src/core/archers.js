import { CONFIG } from '../config.js';
import { emit, nextId, sign, clamp } from './util.js';
import { fireArrow } from './arrows.js';

export function spawnArcher(world, x) {
  const { rng } = world;
  world.archers.push({
    id: nextId(world),
    x,
    y: 0,
    vx: 0,
    facing: rng.sign(),
    targetX: x,
    idle: rng.range(0.3, 1.2),
    cooldown: rng.range(0.2, 0.8),
    aiming: false,
  });
  emit(world, 'archerHired', { x });
}

function nearest(list, x, range) {
  let best = null;
  let bestD = range;
  for (const t of list) {
    const d = Math.abs(t.x - x);
    if (d < bestD) { best = t; bestD = d; }
  }
  return best;
}

// 적이 오는 쪽의 방벽 바로 안쪽이 지키는 자리
function guardX(world, side) {
  const cfg = CONFIG.archer;
  let wallX = null;
  for (const s of world.spots) {
    if (s.kind === 'barricade' && s.built && sign(s.x) === side) {
      if (wallX === null || Math.abs(s.x) > Math.abs(wallX)) wallX = s.x;
    }
  }
  return wallX !== null ? wallX - side * cfg.guardOffset : side * cfg.guardDefault;
}

export function updateArchers(world, dt) {
  const cfg = CONFIG.archer;
  const { rng } = world;

  // 마을 중심에 가장 가까운 적 (위협 방향 결정용)
  let threat = null;
  for (const e of world.enemies) {
    if (!threat || Math.abs(e.x) < Math.abs(threat.x)) threat = e;
  }

  world.archers.forEach((a, i) => {
    a.cooldown -= dt;
    let target = null;
    let moveTo = null;

    if (threat) {
      target = nearest(world.enemies, a.x, cfg.range);
      // 궁수마다 살짝 다른 자리에 서서 겹치지 않게
      if (!target) moveTo = guardX(world, sign(threat.x) || 1) - sign(threat.x) * (i % 4) * 7;
    } else {
      target = nearest(world.animals, a.x, cfg.range);
      if (!target) {
        a.idle -= dt;
        if (a.idle <= 0 && Math.abs(a.targetX - a.x) < 3) {
          a.targetX = clamp(a.x + rng.range(-160, 160), -cfg.huntRange, cfg.huntRange);
          a.idle = rng.range(0.8, 2.5);
        }
        moveTo = a.targetX;
      }
    }

    a.aiming = !!target;
    if (target) {
      a.vx = 0;
      a.facing = sign(target.x - a.x) || a.facing;
      if (a.cooldown <= 0) {
        fireArrow(world, a, target);
        a.cooldown = cfg.cooldown * rng.range(0.85, 1.15);
      }
    } else if (moveTo !== null && Math.abs(moveTo - a.x) > 2) {
      const dir = sign(moveTo - a.x);
      a.vx = dir * cfg.walk * (threat ? 1.8 : 1);
      a.facing = dir;
      a.x += a.vx * dt;
    } else {
      a.vx = 0;
    }
  });
}
