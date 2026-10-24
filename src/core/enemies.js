import { CONFIG } from '../config.js';
import { emit, nextId, sign } from './util.js';
import { spawnCoins } from './coins.js';

export function spawnEnemy(world, kind, side) {
  const def = CONFIG.enemies.kinds[kind];
  const x = side * (CONFIG.enemies.spawnDistance + world.rng.range(0, 60));
  world.enemies.push({
    id: nextId(world),
    kind,
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
  });
}

export function damageEnemy(world, e, dmg, fromVx) {
  e.hp -= dmg;
  e.flash = 0.12;
  e.knockV = sign(fromVx) * 70;
  emit(world, 'enemyHit', { x: e.x, y: -e.h / 2, kind: e.kind });
  if (e.hp > 0) return;
  const idx = world.enemies.indexOf(e);
  if (idx >= 0) world.enemies.splice(idx, 1);
  const def = CONFIG.enemies.kinds[e.kind];
  emit(world, 'enemyKilled', { x: e.x, y: -e.h / 2, kind: e.kind, coins: def.coins });
  spawnCoins(world, e.x, -e.h / 2, def.coins);
}

// 적과 중심 사이에 서 있는 방벽 찾기
function blockingWall(world, e, dir) {
  for (const s of world.spots) {
    if (s.kind !== 'barricade' || !s.built) continue;
    const ahead = (s.x - e.x) * dir;
    if (ahead >= 0 && ahead < e.w / 2 + 5) return s;
  }
  return null;
}

export function updateEnemies(world, dt) {
  const king = world.king;
  const kc = CONFIG.king;

  for (const e of world.enemies) {
    const def = CONFIG.enemies.kinds[e.kind];
    e.flash = Math.max(0, e.flash - dt);

    if (Math.abs(e.knockV) > 1) {
      e.x += e.knockV * dt;
      e.knockV *= Math.pow(0.002, dt);
      continue;
    }

    const targetX = Math.abs(king.x - e.x) < CONFIG.enemies.chaseKingRadius ? king.x : 0;
    const dir = sign(targetX - e.x);
    if (dir) e.facing = dir;

    const wall = dir ? blockingWall(world, e, dir) : null;
    e.attacking = !!wall;
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
      e.x += dir * def.speed * dt;
    }

    // 왕과 부딪히면 코인을 하나 떨어뜨린다
    if (king.hurtTimer <= 0 && Math.abs(king.x - e.x) < e.w / 2 + 5) {
      king.hurtTimer = kc.hurtCooldown;
      const away = sign(king.x - e.x) || 1;
      const lost = king.coins > 0;
      if (lost) {
        king.coins--;
        spawnCoins(world, king.x, -18, 1, { vx: away * 90, delay: 0.9 });
      }
      emit(world, 'kingHit', { x: king.x, y: -14, lost });
      e.knockV = -away * 140;
    }
  }
}
