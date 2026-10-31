import { CONFIG } from '../config.js';
import { emit, nextId, sign } from './util.js';
import { damageEnemy } from './enemies.js';

// 검사: 방벽 바깥 맨 앞줄에서 적을 몸으로 막고 칼로 벤다.
// 체력이 다 떨어지면 죽지 않고 마을 중심으로 후퇴해 회복한 뒤 다시 나간다.

export function spawnSwordsman(world, x) {
  const cfg = CONFIG.swordsman;
  world.swordsmen.push({
    id: nextId(world),
    x,
    y: 0,
    vx: 0,
    facing: 1,
    hp: cfg.hp,
    maxHp: cfg.hp,
    state: 'guard',
    side: world.swordsmen.length % 2 ? -1 : 1, // 평소에 지키는 쪽
    attackTimer: 0,
    swing: 0,
    flash: 0,
    recover: 0,
  });
  emit(world, 'swordsmanHired', { x });
}

export function damageSwordsman(world, s, dmg) {
  if (s.state === 'downed') return;
  s.hp -= dmg;
  s.flash = 0.15;
  emit(world, 'swordsmanHit', { x: s.x, y: -10 });
  if (s.hp <= 0) {
    s.hp = 0;
    s.state = 'downed';
    s.recover = CONFIG.swordsman.recoverTime;
    emit(world, 'swordsmanDown', { x: s.x });
  }
}

// 적 바로 앞을 막아선 검사 찾기 (enemies.js에서 사용)
export function blockingSwordsman(world, e, dir) {
  for (const s of world.swordsmen) {
    if (s.state === 'downed') continue;
    const ahead = (s.x - e.x) * dir;
    if (ahead >= 0 && ahead < e.w / 2 + 6) return s;
  }
  return null;
}

// 맨 앞줄 위치: 그쪽에서 가장 바깥 방벽의 바로 바깥, 방벽이 없으면 기본 거리
function frontLine(world, side) {
  const cfg = CONFIG.swordsman;
  let wallX = null;
  for (const s of world.spots) {
    if (s.kind === 'barricade' && s.built && sign(s.x) === side) {
      if (wallX === null || Math.abs(s.x) > Math.abs(wallX)) wallX = s.x;
    }
  }
  return wallX !== null ? wallX + side * cfg.frontOffset : side * cfg.frontDefault;
}

export function updateSwordsmen(world, dt) {
  const cfg = CONFIG.swordsman;
  let left = false;
  let right = false;
  for (const e of world.enemies) {
    if (e.x < 0) left = true;
    else right = true;
  }
  const threat = left || right;
  const slots = { '-1': 0, '1': 0 };

  for (const s of world.swordsmen) {
    s.swing = Math.max(0, s.swing - dt * 4);
    s.flash = Math.max(0, s.flash - dt);
    s.attackTimer -= dt;

    if (s.state === 'downed') {
      const dx = -s.x;
      if (Math.abs(dx) > 6) {
        s.vx = sign(dx) * cfg.walk * 0.5;
        s.x += s.vx * dt;
        s.facing = sign(dx);
      } else {
        s.vx = 0;
        s.recover -= dt;
        if (s.recover <= 0) {
          s.state = 'guard';
          s.hp = s.maxHp;
          emit(world, 'swordsmanRecovered', { x: s.x });
        }
      }
      continue;
    }

    // 조용할 땐 천천히 회복
    if (!threat) s.hp = Math.min(s.maxHp, s.hp + dt * cfg.regen);

    // 칼이 닿는 적 베기 (낮게 내려온 비행 괴물도)
    let target = null;
    let best = cfg.reach;
    for (const e of world.enemies) {
      if (e.y < -26) continue;
      const d = Math.abs(e.x - s.x) - e.w / 2;
      if (d < best) { best = d; target = e; }
    }
    if (target) {
      s.vx = 0;
      s.facing = sign(target.x - s.x) || s.facing;
      if (s.attackTimer <= 0) {
        s.attackTimer = cfg.attackInterval;
        s.swing = 1;
        emit(world, 'swordSwing', { x: s.x + s.facing * 8, y: -10, facing: s.facing });
        damageEnemy(world, target, cfg.damage, s.facing);
      }
      continue;
    }

    // 맨 앞줄로 이동 (적이 한쪽에서만 오면 모두 그쪽으로)
    const side = left && !right ? -1 : right && !left ? 1 : s.side;
    const post = frontLine(world, side) - side * slots[side]++ * 7;
    const dx = post - s.x;
    if (Math.abs(dx) > 2) {
      s.vx = sign(dx) * cfg.walk * (threat ? 1.6 : 1);
      s.x += s.vx * dt;
      s.facing = sign(dx);
    } else {
      s.vx = 0;
      s.facing = side;
    }
  }
}
