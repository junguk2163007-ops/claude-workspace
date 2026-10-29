import { CONFIG } from '../config.js';
import { emit } from './util.js';
import { spawnEnemy } from './enemies.js';

// M1용 간단한 습격: 일정 시간마다 어둠 속에서 적이 몰려온다.
// (M4에서 낮/밤 사이클로 바뀔 예정)
export function createWaves() {
  return { timer: CONFIG.waves.firstDelay, count: 0, plan: null, queue: [] };
}

function makePlan(world, n) {
  const { rng } = world;
  const sides = n >= 3 && rng.chance(0.35) ? [-1, 1] : [rng.sign()];
  const list = [];
  const small = 1 + Math.floor(n * 0.7);
  const big = n >= 2 && n % 2 === 0 ? Math.ceil(n / 3) : 0;
  for (let i = 0; i < small; i++) list.push({ kind: 'shade', side: sides[i % sides.length], delay: i * 1.2 });
  for (let i = 0; i < big; i++) list.push({ kind: 'bigShade', side: sides[i % sides.length], delay: 2 + i * 2 });
  return { sides, list };
}

export function updateWaves(world, dt) {
  const w = world.waves;
  const cfg = CONFIG.waves;
  w.timer -= dt;

  if (!w.plan && w.timer <= cfg.warnTime) {
    w.plan = makePlan(world, w.count);
    emit(world, 'waveIncoming', { sides: w.plan.sides, count: w.plan.list.length });
  }
  if (w.timer <= 0) {
    w.queue.push(...w.plan.list);
    w.plan = null;
    w.count++;
    w.timer = cfg.interval;
  }

  for (let i = w.queue.length - 1; i >= 0; i--) {
    const q = w.queue[i];
    q.delay -= dt;
    if (q.delay <= 0) {
      spawnEnemy(world, q.kind, q.side);
      w.queue.splice(i, 1);
    }
  }
}
