import { CONFIG } from '../config.js';
import { emit, nextId, sign, clamp } from './util.js';
import { fireArrow } from './arrows.js';
import { spawnCoins } from './coins.js';
import { expeditionLair } from './lairs.js';

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
    armed: true,     // 활을 잃으면 false (맨손으로 도망)
    invuln: 0,       // 맞은 직후 잠깐 무적
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

// 적에게 맞음: 처음엔 활을 잃고 맨손으로 마을로 도망, 맨손일 때 또 맞으면 사라진다.
export function hitArcher(world, a) {
  if (a.invuln > 0) return;
  if (a.carry > 0) spawnCoins(world, a.x, -16, a.carry);
  a.carry = 0;
  a.coinTarget = null;
  a.expedition = null;
  if (a.armed) {
    a.armed = false;
    a.invuln = 1.2;
    a.aiming = false;
    a.targetX = world.rng.range(-40, 40);
    emit(world, 'archerDisarmed', { x: a.x, y: -12, facing: a.facing });
  } else {
    world.archers.splice(world.archers.indexOf(a), 1);
    emit(world, 'archerLost', { x: a.x, y: -10 });
  }
}

// 궁수 깃발에 투자하면: 맨손 궁수가 있으면 그 사람이 먼저 다시 활을 든다
export function rearmArcher(world, nearX) {
  let best = null;
  for (const a of world.archers) {
    if (!a.armed && (!best || Math.abs(a.x - nearX) < Math.abs(best.x - nearX))) best = a;
  }
  if (!best) return false;
  best.armed = true;
  best.cooldown = 0.5;
  emit(world, 'archerRearmed', { x: best.x, y: -14 });
  return true;
}

// 맨손 궁수: 마을 중심 근처에서 서성이며 숨어 있음
function updateUnarmed(world, a, dt, threat) {
  a.aiming = false;
  a.idle -= dt;
  if (a.idle <= 0 && Math.abs(a.targetX - a.x) < 3) {
    a.targetX = world.rng.range(-45, 45);
    a.idle = world.rng.range(1, 3);
  }
  const dx = a.targetX - a.x;
  if (Math.abs(dx) > 2) {
    a.vx = sign(dx) * CONFIG.archer.walk * (threat ? 2 : 0.7);
    a.facing = sign(dx);
    a.x += a.vx * dt;
  } else {
    a.vx = 0;
  }
}

// 원정 중인 궁수: 소굴에서 조금 떨어져 서서 근처 적 → 소굴 순으로 쏜다
function updateExpeditionArcher(world, a, i, dt) {
  const cfg = CONFIG.archer;
  const lair = expeditionLair(world, a.expedition);
  if (!lair || !lair.alive) return false;
  const side = a.expedition;
  const post = lair.x - side * (CONFIG.expedition.archerDistance + (i % 4) * 8);
  let target = nearest(world.enemies, a.x, cfg.range);
  if (!target && Math.abs(lair.x - a.x) < cfg.range) target = lair;
  a.aiming = !!target && Math.abs(post - a.x) < 40;
  if (a.aiming) {
    a.vx = 0;
    a.facing = sign(target.x - a.x) || a.facing;
    if (a.cooldown <= 0) {
      fireArrow(world, a, target);
      a.cooldown = cfg.cooldown * world.rng.range(0.85, 1.15);
    }
  } else if (Math.abs(post - a.x) > 2) {
    const dir = sign(post - a.x);
    a.vx = dir * cfg.walk * 1.8;
    a.facing = dir;
    a.x += a.vx * dt;
  } else {
    a.vx = 0;
  }
  return true;
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
  world.stats.coinsEarned++;
  a.giveTimer = 0.09;
  emit(world, 'coinGiven', { x: a.x, y: -22 });
}

export function updateArchers(world, dt) {
  const cfg = CONFIG.archer;
  const { rng } = world;

  // 마을 중심에 가장 가까운 적 (위협 방향 결정용)
  let threat = null;
  for (const e of world.enemies) {
    if (Math.abs(e.x) > cfg.threatRange) continue;
    if (!threat || Math.abs(e.x) < Math.abs(threat.x)) threat = e;
  }

  const claimed = new Set();
  for (const a of world.archers) if (a.coinTarget) claimed.add(a.coinTarget);

  world.archers.forEach((a, i) => {
    a.cooldown -= dt;
    a.invuln = Math.max(0, a.invuln - dt);
    if (!a.armed) { updateUnarmed(world, a, dt, threat); return; }
    deliver(world, a, dt);
    if (a.expedition && updateExpeditionArcher(world, a, i, dt)) return;
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
