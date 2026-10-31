import { CONFIG } from '../config.js';
import { emit, nextId, sign } from './util.js';
import { spawnCoins } from './coins.js';

export function spawnEnemy(world, kind, side) {
  const def = CONFIG.enemies.kinds[kind];
  const x = side * (CONFIG.enemies.spawnDistance + world.rng.range(0, 60));
  world.enemies.push({
    id: nextId(world),
    kind,
    side,
    x,
    y: 0,
    vx: 0,
    w: def.w,
    h: def.h,
    hp: def.hp,
    maxHp: def.hp,
    facing: -side,
    knockV: 0,
    flash: 0,
    attackTimer: 0,
    attacking: false,
    carrying: 0,   // 도둑이 훔친 코인 수
  });
}

export function damageEnemy(world, e, dmg, fromDir) {
  e.hp -= dmg;
  e.flash = 0.12;
  e.knockV = sign(fromDir) * 70 * Math.min(1, 12 / e.w);
  emit(world, 'enemyHit', { x: e.x, y: e.y - e.h / 2, kind: e.kind });
  if (e.hp > 0) return;
  const idx = world.enemies.indexOf(e);
  if (idx >= 0) world.enemies.splice(idx, 1);
  const def = CONFIG.enemies.kinds[e.kind];
  const coins = def.coins + e.carrying;
  emit(world, 'enemyKilled', { x: e.x, y: e.y - e.h / 2, kind: e.kind, coins });
  spawnCoins(world, e.x, e.y - e.h / 2, coins);
}

// 적 앞을 막고 있는 방벽 찾기
function blockingWall(world, e, dir) {
  for (const s of world.spots) {
    if (s.kind !== 'barricade' || !s.built) continue;
    const ahead = (s.x - e.x) * dir;
    if (ahead >= 0 && ahead < e.w / 2 + 5) return s;
  }
  return null;
}

function touchingKing(world, e) {
  const king = world.king;
  return king.hurtTimer <= 0 && Math.abs(king.x - e.x) < e.w / 2 + 5 && e.y > -26;
}

// 왕과 부딪히면 코인을 하나 떨어뜨린다
function hitKing(world, e) {
  const king = world.king;
  king.hurtTimer = CONFIG.king.hurtCooldown;
  const away = sign(king.x - e.x) || 1;
  const lost = king.coins > 0;
  if (lost) {
    king.coins--;
    spawnCoins(world, king.x, -18, 1, { vx: away * 90, delay: 0.9 });
  }
  emit(world, 'kingHit', { x: king.x, y: -14, lost });
  e.knockV = -away * 140;
}

function updateGround(world, e, def, dt) {
  const king = world.king;
  const targetX = Math.abs(king.x - e.x) < CONFIG.enemies.chaseKingRadius ? king.x : 0;
  const dir = sign(targetX - e.x);
  if (dir) e.facing = dir;

  const wall = dir ? blockingWall(world, e, dir) : null;
  e.attacking = !!wall;
  e.vx = 0;
  if (wall) {
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = def.attackInterval;
      wall.hp -= def.attack;
      emit(world, 'wallHit', { x: wall.x, hp: wall.hp });
      if (wall.hp <= 0) {
        wall.built = false;
        wall.hp = 0;
        emit(world, 'wallBroken', { x: wall.x });
      }
    }
  } else if (Math.abs(targetX - e.x) > 2) {
    e.vx = dir * def.speed;
    e.x += e.vx * dt;
  }

  if (touchingKing(world, e)) hitKing(world, e);
}

// 코인 도둑: 방벽 틈으로 스며들어 땅의 코인이나 왕의 코인을 훔쳐 어둠으로 달아난다.
// 도망치기 전에 잡으면 훔친 코인까지 돌려받는다.
function updateThief(world, e, def, dt) {
  const king = world.king;
  let targetX;
  if (e.carrying > 0) {
    targetX = e.side * (CONFIG.enemies.spawnDistance + 120);
  } else {
    // 가까운 땅의 코인 → 없으면 왕
    let best = null;
    for (const c of world.coins) {
      if (c.grounded && Math.abs(c.x - e.x) < 220 && (!best || Math.abs(c.x - e.x) < Math.abs(best.x - e.x))) best = c;
    }
    targetX = best ? best.x : king.x;
  }
  const dir = sign(targetX - e.x) || e.facing;
  e.facing = dir;
  e.vx = dir * def.speed * (e.carrying ? 1.1 : 1);
  e.x += e.vx * dt;

  if (e.carrying > 0) {
    if (Math.abs(e.x) > CONFIG.enemies.spawnDistance + 100) {
      world.enemies.splice(world.enemies.indexOf(e), 1);
      emit(world, 'thiefEscaped', { x: e.x, coins: e.carrying });
    }
    return;
  }

  for (let i = 0; i < world.coins.length; i++) {
    const c = world.coins[i];
    if (c.grounded && Math.abs(c.x - e.x) < 5) {
      world.coins.splice(i, 1);
      e.carrying++;
      emit(world, 'coinStolen', { x: e.x, y: -10, fromKing: false });
      return;
    }
  }
  if (touchingKing(world, e) && king.coins > 0) {
    king.coins--;
    king.hurtTimer = CONFIG.king.hurtCooldown;
    e.carrying++;
    emit(world, 'coinStolen', { x: king.x, y: -16, fromKing: true });
  }
}

export function updateEnemies(world, dt) {
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const e = world.enemies[i];
    const def = CONFIG.enemies.kinds[e.kind];
    e.flash = Math.max(0, e.flash - dt);

    if (Math.abs(e.knockV) > 1) {
      e.x += e.knockV * dt;
      e.knockV *= Math.pow(0.002, dt);
      continue;
    }

    if (def.steals) updateThief(world, e, def, dt);
    else updateGround(world, e, def, dt);
  }
}
