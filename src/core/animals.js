import { CONFIG } from '../config.js';
import { emit, nextId, sign, clamp } from './util.js';
import { spawnCoins } from './coins.js';

function pickKind(rng) {
  const kinds = CONFIG.animals.kinds;
  const total = Object.values(kinds).reduce((s, k) => s + k.weight, 0);
  let r = rng.range(0, total);
  for (const [name, k] of Object.entries(kinds)) {
    r -= k.weight;
    if (r <= 0) return name;
  }
  return 'chicken';
}

export function spawnAnimal(world, { awayFromKing = false } = {}) {
  const { rng, king } = world;
  const kind = pickKind(rng);
  const def = CONFIG.animals.kinds[kind];
  let x = 0;
  for (let tries = 0; tries < 8; tries++) {
    const zone = rng.pick(CONFIG.animals.zones);
    x = rng.range(zone[0], zone[1]);
    if (!awayFromKing || Math.abs(x - king.x) > 280) break;
  }
  world.animals.push({
    id: nextId(world),
    kind,
    x,
    y: 0,
    vx: 0,
    w: def.w,
    h: def.h,
    hp: def.hp,
    facing: rng.sign(),
    state: 'idle',
    timer: rng.range(0.5, 2),
    fleeing: false,
  });
}

export function damageAnimal(world, a, dmg) {
  a.hp -= dmg;
  if (a.hp > 0) return;
  const idx = world.animals.indexOf(a);
  if (idx >= 0) world.animals.splice(idx, 1);
  const def = CONFIG.animals.kinds[a.kind];
  emit(world, 'animalKilled', { x: a.x, y: -a.h / 2, kind: a.kind, coins: def.coins });
  spawnCoins(world, a.x, -a.h / 2, def.coins);
}

export function updateAnimals(world, dt) {
  const { rng, king } = world;
  const half = CONFIG.world.halfWidth - 20;

  for (const a of world.animals) {
    const def = CONFIG.animals.kinds[a.kind];
    const dk = a.x - king.x;
    const wasFleeing = a.fleeing;
    a.fleeing = Math.abs(dk) < def.fleeRadius;

    if (a.fleeing) {
      if (!wasFleeing) emit(world, 'animalStartled', { x: a.x, kind: a.kind });
      a.vx = sign(dk || 1) * def.flee;
      a.facing = sign(a.vx);
      a.state = 'walk';
      a.timer = rng.range(0.4, 1);
    } else {
      a.timer -= dt;
      if (a.timer <= 0) {
        // 다음 행동 고르기: 가만히 / 쪼기 / 걷기
        const r = rng.next();
        if (r < 0.35) { a.state = 'idle'; a.vx = 0; }
        else if (r < 0.65) { a.state = 'peck'; a.vx = 0; }
        else {
          a.state = 'walk';
          a.facing = rng.sign();
          a.vx = a.facing * def.walk * rng.range(0.6, 1.1);
        }
        a.timer = rng.range(0.8, 2.6);
      }
    }

    a.x = clamp(a.x + a.vx * dt, -half, half);
  }

  world.animalSpawnTimer -= dt;
  if (world.animalSpawnTimer <= 0) {
    world.animalSpawnTimer = CONFIG.animals.respawnInterval;
    if (world.animals.length < CONFIG.animals.max) spawnAnimal(world, { awayFromKing: true });
  }
}
