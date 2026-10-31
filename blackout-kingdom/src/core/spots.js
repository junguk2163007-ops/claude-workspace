import { CONFIG } from '../config.js';
import { emit } from './util.js';
import { spawnArcher } from './archers.js';
import { spawnSwordsman } from './swordsmen.js';

// "투자 자리": 왕이 코인을 던져 넣으면 무언가가 지어지는 곳.
export function createSpot(def, id) {
  return {
    id,
    kind: def.kind,
    x: def.x,
    cost: def.cost,
    maxCost: def.maxCost ?? def.cost,
    maxHp: def.hp ?? 0,
    hp: 0,
    paid: 0,     // 슬롯에 들어간 코인
    pending: 0,  // 날아가는 중인 코인
    built: false,
    hires: 0,
  };
}

export function canInvest(world, spot) {
  if (spot.kind === 'archerPost' && world.archers.length >= CONFIG.archer.max) return false;
  if (spot.kind === 'swordPost' && world.swordsmen.length >= CONFIG.swordsman.max) return false;
  if (spot.kind === 'barricade' && spot.built) return false;
  return spot.paid + spot.pending < spot.cost;
}

export function findSpotAt(world, x) {
  let best = null;
  for (const s of world.spots) {
    const d = Math.abs(s.x - x);
    if (d < CONFIG.spotReach && (!best || d < Math.abs(best.x - x))) best = s;
  }
  return best;
}

// 슬롯 위치 (코인이 날아가 꽂히는 자리)
export function slotPos(spot, i) {
  return { x: spot.x + (i - (spot.cost - 1) / 2) * 8, y: -48 };
}

export function throwCoin(world, spot) {
  const king = world.king;
  king.coins--;
  const slot = spot.paid + spot.pending;
  spot.pending++;
  const to = slotPos(spot, slot);
  world.thrownCoins.push({
    spotId: spot.id,
    slot,
    sx: king.x, sy: -16,
    tx: to.x, ty: to.y,
    x: king.x, y: -16,
    t: 0,
    dur: 0.28,
  });
  emit(world, 'coinThrown', { x: king.x, y: -16 });
}

function completeSpot(world, spot) {
  spot.paid = 0;
  world.king.investLock = true;
  if (spot.kind === 'archerPost') {
    spot.hires++;
    spot.cost = Math.min(spot.cost + 1, spot.maxCost);
    spawnArcher(world, spot.x);
  } else if (spot.kind === 'swordPost') {
    spot.hires++;
    spot.cost = Math.min(spot.cost + 1, spot.maxCost);
    spawnSwordsman(world, spot.x);
  } else if (spot.kind === 'barricade') {
    spot.built = true;
    spot.hp = spot.maxHp;
  }
  emit(world, 'spotComplete', { x: spot.x, kind: spot.kind });
}

export function updateThrownCoins(world, dt) {
  for (let i = world.thrownCoins.length - 1; i >= 0; i--) {
    const c = world.thrownCoins[i];
    c.t += dt;
    const p = Math.min(1, c.t / c.dur);
    c.x = c.sx + (c.tx - c.sx) * p;
    c.y = c.sy + (c.ty - c.sy) * p - Math.sin(Math.PI * p) * 18;
    if (p < 1) continue;

    world.thrownCoins.splice(i, 1);
    const spot = world.spots.find((s) => s.id === c.spotId);
    spot.pending--;
    spot.paid++;
    emit(world, 'coinSlotted', { x: c.tx, y: c.ty, paid: spot.paid, cost: spot.cost });
    if (spot.paid >= spot.cost && spot.pending === 0) completeSpot(world, spot);
  }
}
