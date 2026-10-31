import { CONFIG } from '../config.js';
import { emit } from './util.js';
import { spawnArcher, rearmArcher } from './archers.js';
import { spawnSwordsman } from './swordsmen.js';
import { fireArrow } from './arrows.js';
import { sign } from './util.js';

// "투자 자리": 왕이 코인을 던져 넣으면 무언가가 지어지는 곳.
export function createSpot(def, id) {
  if (def.kind === 'barricade') def = { ...def, cost: CONFIG.barricade.levels[0].cost };
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
    level: 0,      // 방벽 강화 단계 (0 = 없음)
    towerCd: 0,
  };
}

// 방벽 다음 투자 비용: 다음 단계 → 최고 단계면 수리 비용 (가득 차 있으면 투자 불가)
function barricadeCost(spot) {
  const B = CONFIG.barricade;
  if (spot.level < B.levels.length) return B.levels[spot.level].cost;
  return B.repairCost;
}

function refreshCost(spot) {
  if (spot.kind === 'barricade' && spot.paid === 0 && spot.pending === 0) spot.cost = barricadeCost(spot);
}

export function barricadeInfo(spot) {
  const B = CONFIG.barricade;
  const cur = spot.level > 0 ? B.levels[spot.level - 1] : null;
  const next = B.levels[spot.level] || null;
  return { cur, next, maxed: !next };
}

// 적이 방벽을 때림
export function damageWall(world, wall, dmg) {
  wall.hp -= dmg;
  emit(world, 'wallHit', { x: wall.x, hp: wall.hp });
  if (wall.hp <= 0) {
    wall.built = false;
    wall.hp = 0;
    wall.level = 0;
    emit(world, 'wallBroken', { x: wall.x });
  }
  refreshCost(wall);
}

export function canInvest(world, spot) {
  if (spot.kind === 'barricade') {
    const maxed = spot.level >= CONFIG.barricade.levels.length;
    if (maxed && spot.hp >= spot.maxHp && spot.pending === 0) return false;
  }
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
  const tall = spot.kind === 'barricade' && spot.level >= 2;
  return { x: spot.x + (i - (spot.cost - 1) / 2) * 8, y: tall ? (spot.level >= 3 ? -72 : -52) : -48 };
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
    // 맨손 궁수를 다시 무장시키면 가격은 오르지 않음
    if (!rearmArcher(world, spot.x)) {
      spot.cost = Math.min(spot.cost + 1, spot.maxCost);
      spawnArcher(world, spot.x);
    }
  } else if (spot.kind === 'swordPost') {
    spot.hires++;
    spot.cost = Math.min(spot.cost + 1, spot.maxCost);
    spawnSwordsman(world, spot.x);
  } else if (spot.kind === 'barricade') {
    const levels = CONFIG.barricade.levels;
    const repaired = spot.level >= levels.length;
    if (!repaired) spot.level++;
    spot.built = true;
    spot.maxHp = levels[spot.level - 1].hp;
    spot.hp = spot.maxHp;
    refreshCost(spot);
    emit(world, 'spotComplete', { x: spot.x, kind: spot.kind, level: spot.level, repaired });
    return;
  }
  emit(world, 'spotComplete', { x: spot.x, kind: spot.kind });
}

// 수비탑: 탑 꼭대기에서 가까운 적에게 스스로 화살을 쏜다
export function updateTowers(world, dt) {
  const B = CONFIG.barricade;
  for (const s of world.spots) {
    if (s.kind !== 'barricade' || !s.built || !B.levels[s.level - 1].tower) continue;
    s.towerCd -= dt;
    if (s.towerCd > 0) continue;
    let target = null;
    for (const e of world.enemies) {
      const d = Math.abs(e.x - s.x);
      if (d < B.towerRange && (!target || d < Math.abs(target.x - s.x))) target = e;
    }
    if (!target) continue;
    fireArrow(world, { x: s.x, facing: sign(target.x - s.x) || 1 }, target, -38);
    s.towerCd = B.towerInterval;
  }
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
