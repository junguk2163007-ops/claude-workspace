import { CONFIG } from '../config.js';
import { emit } from './util.js';
import { spawnEnemy } from './enemies.js';
import { frontLair, aliveLairCount } from './lairs.js';

// 습격: 일정 시간마다 어둠 속에서 적이 몰려온다. 몇 번째 습격인지가 곧 "단계(레벨)".
// (M4에서 낮/밤 사이클로 바뀔 예정)
export function createWaves() {
  return { timer: CONFIG.waves.firstDelay, level: 0, plan: null, queue: [] };
}

// 예산 안에서 괴물을 골라 담는다. 이번 단계에 처음 풀리는 괴물은 꼭 한 마리 넣어서 "새 얼굴"을 보여준다.
export function makePlan(world, level) {
  const { rng } = world;
  const cfg = CONFIG.waves;
  const kinds = Object.entries(CONFIG.enemies.kinds).filter(([, k]) => k.unlock <= level);
  // 소굴을 부술수록 습격이 약해짐
  const alive = aliveLairCount(world);
  let budget = (cfg.budgetBase + (level - 1) * cfg.budgetPerLevel) * (0.5 + 0.5 * alive / CONFIG.lairs.list.length);
  const picks = [];
  for (const [name, k] of kinds) {
    if (k.unlock === level && level > 1) { picks.push(name); budget -= k.cost; }
  }
  let guard = 0;
  while (budget > 0 && guard++ < 100) {
    const options = kinds.filter(([, k]) => k.cost <= Math.max(1, budget));
    const [name, k] = rng.pick(options);
    picks.push(name);
    budget -= k.cost;
  }

  // 소굴이 남아 있는 쪽에서만 온다
  const open = [-1, 1].filter((sd) => frontLair(world, sd));
  const sides = open.length === 2 ? (level >= 3 && rng.chance(0.35) ? [-1, 1] : [rng.sign()]) : open;
  if (!sides.length) return { sides: [], list: [], level };
  const list = picks.map((kind, i) => ({
    kind,
    side: sides[i % sides.length],
    delay: i * 1.1 + (CONFIG.enemies.kinds[kind].cost >= 3 ? 1.5 : 0),
  }));
  return { sides, list, level };
}

export function updateWaves(world, dt) {
  const w = world.waves;
  const cfg = CONFIG.waves;
  w.timer -= dt;

  if (aliveLairCount(world) === 0) return; // 소굴이 다 무너지면 습격 끝
  if (!w.plan && w.timer <= cfg.warnTime) {
    w.plan = makePlan(world, w.level + 1);
    const fresh = [...new Set(w.plan.list.map((q) => q.kind))].filter((k) => CONFIG.enemies.kinds[k].unlock === w.plan.level && w.plan.level > 1);
    emit(world, 'waveIncoming', { sides: w.plan.sides, count: w.plan.list.length, level: w.plan.level, fresh });
  }
  if (w.timer <= 0) {
    w.queue.push(...w.plan.list);
    w.level = w.plan.level;
    w.plan = null;
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
