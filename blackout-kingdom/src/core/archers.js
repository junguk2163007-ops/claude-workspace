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
    carry: 0,        // 주워 든 코인
    giveTimer: 0,
    coinTarget: null,
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

// 주우러 갈 코인: 왕 바로 옆 코인은 왕 몫, 다른 궁수가 노리는 코인은 양보
function pickCoin(world, a, claimed) {
  const cfg = CONFIG.archer;
  let best = null;
  for (const c of world.coins) {
    if (!c.grounded || claimed.has(c.id)) continue;
    if (Math.abs(c.x - world.king.x) < 50) continue;
    if (Math.abs(c.x) > cfg.huntRange + 150) continue;
    const d = Math.abs(c.x - a.x);
    if (d < cfg.coinSeek && (!best || d < Math.abs(best.x - a.x))) best = c;
  }
  return best;
}

// 발밑 코인 줍기
function pickUp(world, a) {
  for (let i = 0; i < world.coins.length; i++) {
    const c = world.coins[i];
    if (c.grounded && c.delay <= 0 && Math.abs(c.x - a.x) < 4) {
      world.coins.splice(i, 1);
      a.carry++;
      a.coinTarget = null;
      emit(world, 'archerPickup', { x: a.x, y: -6 });
      return;
    }
  }
}

// 왕이 가까이 오면 들고 있던 코인을 하나씩 건네줌
function deliver(world, a, dt) {
  const king = world.king;
  if (a.carry <= 0 || Math.abs(king.x - a.x) > CONFIG.archer.deliverRadius) return;
  a.giveTimer -= dt;
  if (a.giveTimer > 0) return;
  a.carry--;
  king.coins++;
  a.giveTimer = 0.09;
  emit(world, 'coinGiven', { x: a.x, y: -22 });
}

export function updateArchers(world, dt) {
  const cfg = CONFIG.archer;
  const { rng } = world;

  // 마을 중심에 가장 가까운 적 (위협 방향 결정용)
  let threat = null;
  for (const e of world.enemies) {
    if (!threat || Math.abs(e.x) < Math.abs(threat.x)) threat = e;
  }

  const claimed = new Set();
  for (const a of world.archers) if (a.coinTarget) claimed.add(a.coinTarget);

  world.archers.forEach((a, i) => {
    a.cooldown -= dt;
    deliver(world, a, dt);
    let target = null;
    let moveTo = null;

    if (threat) {
      target = nearest(world.enemies, a.x, cfg.range);
      // 궁수마다 살짝 다른 자리에 서서 겹치지 않게
      if (!target) moveTo = guardX(world, sign(threat.x) || 1) - sign(threat.x) * (i % 4) * 7;
    } else {
      target = nearest(world.animals, a.x, cfg.range);
      // 사냥감이 없으면 코인 줍기 → 많이 모았으면 마을로 돌아와 기다리기 → 아니면 어슬렁
      let coin = null;
      if (!target && a.carry < cfg.carryReturn) {
        coin = world.coins.find((c) => c.id === a.coinTarget) || pickCoin(world, a, claimed);
        a.coinTarget = coin ? coin.id : null;
        if (coin) claimed.add(coin.id);
      }
      if (coin) {
        moveTo = coin.x;
      } else if (!target && a.carry >= cfg.carryReturn && Math.abs(a.x) > 60) {
        moveTo = sign(a.x) * 40;
      } else if (!target) {
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
      a.vx = dir * cfg.walk * (threat ? 1.8 : a.coinTarget ? 1.3 : 1);
      a.facing = dir;
      a.x += a.vx * dt;
    } else {
      a.vx = 0;
    }
    if (!threat) pickUp(world, a);
  });
}
