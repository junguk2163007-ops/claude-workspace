import { CONFIG } from '../config.js';
import { emit, nextId, sign } from './util.js';
import { spawnCoins } from './coins.js';
import { spawnEnemy } from './enemies.js';

// 소굴: 어둠 생물이 나오는 곳. 양쪽에 2개씩.
// 습격은 그쪽에서 가장 가까운 소굴에서 나오고, 소굴을 부술수록 습격이 약해진다.
// 출정 깃발에 코인을 넣으면 검사 전원과 궁수 절반이 소굴로 쳐들어간다.
// 4개를 모두 부수면 승리.

export function createLairs(world) {
  return CONFIG.lairs.list.map((d) => ({
    id: nextId(world),
    x: d.x,
    side: sign(d.x),
    hp: d.hp,
    maxHp: d.hp,
    coins: d.coins,
    w: CONFIG.lairs.w,
    h: CONFIG.lairs.h,
    y: 0,
    vx: 0,
    alive: true,
    flash: 0,
    defendCd: 0,
    guardCd: 0,
    underAttack: 0,
  }));
}

// 그쪽에서 마을에 가장 가까운 살아있는 소굴
export function frontLair(world, side) {
  let best = null;
  for (const l of world.lairs) {
    if (l.alive && l.side === side && (!best || Math.abs(l.x) < Math.abs(best.x))) best = l;
  }
  return best;
}

export function aliveLairCount(world) {
  return world.lairs.filter((l) => l.alive).length;
}

// 적이 나오는 곳 / 도둑이 돌아가는 곳
export function lairSpawnX(world, side) {
  const l = frontLair(world, side);
  return l ? l.x : side * CONFIG.enemies.spawnDistance;
}

export function damageLair(world, lair, dmg) {
  if (!lair.alive) return;
  lair.hp -= dmg;
  lair.flash = 0.1;
  lair.underAttack = 3;
  emit(world, 'lairHit', { x: lair.x, y: -lair.h / 2 });
  if (lair.hp > 0) return;
  lair.alive = false;
  lair.hp = 0;
  world.stats.lairsDestroyed++;
  spawnCoins(world, lair.x, -lair.h / 2, lair.coins);
  emit(world, 'lairDestroyed', { x: lair.x, coins: lair.coins, remaining: aliveLairCount(world) });
}

// ───────── 출정 ─────────
export function canExpedition(world, side) {
  if (!frontLair(world, side) || world.expeditions[side]) return false;
  return world.swordsmen.some((s) => s.state !== 'downed');
}

export function startExpedition(world, side) {
  const lair = frontLair(world, side);
  if (!lair) return;
  world.expeditions[side] = { lairId: lair.id, time: 0 };
  let swords = 0;
  for (const s of world.swordsmen) {
    if (s.state === 'downed') continue;
    s.expedition = side;
    swords++;
  }
  // 궁수는 그쪽에 가까운 순서로 절반
  const armed = world.archers.filter((a) => a.armed).sort((a, b) => side * (b.x - a.x));
  const n = Math.ceil(armed.length * CONFIG.expedition.archerShare);
  for (let i = 0; i < n; i++) armed[i].expedition = side;
  emit(world, 'expeditionStart', { side, swords, archers: n, x: side * 200 });
}

function endExpedition(world, side, success) {
  world.expeditions[side] = null;
  for (const s of world.swordsmen) if (s.expedition === side) s.expedition = null;
  for (const a of world.archers) if (a.expedition === side) a.expedition = null;
  emit(world, success ? 'expeditionEnd' : 'expeditionFailed', { side });
}

export function expeditionLair(world, side) {
  const ex = world.expeditions[side];
  return ex ? world.lairs.find((l) => l.id === ex.lairId) : null;
}

export function updateLairs(world, dt) {
  const L = CONFIG.lairs;
  const king = world.king;

  for (const lair of world.lairs) {
    lair.flash = Math.max(0, lair.flash - dt);
    lair.underAttack = Math.max(0, lair.underAttack - dt);
    if (!lair.alive) continue;

    // 공격받는 중이면 수비 괴물을 뿜어냄
    lair.defendCd -= dt;
    if (lair.underAttack > 0 && lair.defendCd <= 0) {
      lair.defendCd = L.defendInterval;
      const strong = world.waves.level >= 4 && world.rng.chance(0.3);
      spawnEnemy(world, strong ? 'bigShade' : world.rng.pick(['shade', 'crawler']), lair.side);
      emit(world, 'lairSpawn', { x: lair.x });
    }
    // 왕이 혼자 가까이 오면 괴물이 튀어나옴
    lair.guardCd -= dt;
    if (Math.abs(king.x - lair.x) < L.guardRadius && lair.guardCd <= 0) {
      lair.guardCd = L.guardInterval;
      spawnEnemy(world, 'shade', lair.side);
      emit(world, 'lairSpawn', { x: lair.x });
    }
  }

  // 원정 종료 조건: 소굴 파괴(성공) / 싸울 병사가 없음 또는 시간 초과(실패)
  for (const side of [-1, 1]) {
    const ex = world.expeditions[side];
    if (!ex) continue;
    ex.time += dt;
    const lair = expeditionLair(world, side);
    if (!lair || !lair.alive) { endExpedition(world, side, true); continue; }
    const fighters = world.swordsmen.some((s) => s.expedition === side && s.state !== 'downed')
      || world.archers.some((a) => a.expedition === side && a.armed);
    if (!fighters || ex.time > CONFIG.expedition.timeout) endExpedition(world, side, false);
  }

  if (!world.victory && aliveLairCount(world) === 0) {
    world.victory = { time: world.time, level: world.waves.level, ...world.stats };
    // 소굴이 모두 무너지면 남은 어둠 생물도 흩어진다
    for (const e of world.enemies) emit(world, 'enemyFaded', { x: e.x, y: e.y - e.h / 2 });
    world.enemies.length = 0;
    world.waves.queue.length = 0;
    emit(world, 'victory', world.victory);
  }
}
