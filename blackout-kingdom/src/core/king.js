import { CONFIG } from '../config.js';
import { clamp } from './util.js';
import { findSpotAt, canInvest, throwCoin } from './spots.js';

export function createKing() {
  return {
    x: 0,
    y: 0,
    vx: 0,
    facing: 1,
    coins: CONFIG.king.startCoins,
    investTimer: 0,
    investing: false,
    investLock: false, // 무언가 완성되면 키를 한 번 뗄 때까지 투자 멈춤 (실수로 코인 낭비 방지)
    hurtTimer: 0,
    spotId: null,
  };
}

// intent = { move: -1 | 0 | 1, invest: true/false }  (키보드든 터치든 이 모양으로 들어옴)
export function updateKing(world, dt, intent) {
  const k = world.king;
  const c = CONFIG.king;
  const half = CONFIG.world.halfWidth - 10;

  k.vx += (intent.move * c.speed - k.vx) * Math.min(1, dt * c.accel);
  if (Math.abs(k.vx) < 0.5) k.vx = 0;
  k.x = clamp(k.x + k.vx * dt, -half, half);
  if (intent.move) k.facing = intent.move;
  k.hurtTimer = Math.max(0, k.hurtTimer - dt);

  const spot = findSpotAt(world, k.x);
  k.spotId = spot ? spot.id : null;

  k.investing = false;
  if (!intent.invest) {
    k.investTimer = 0;
    k.investLock = false;
    return;
  }
  if (k.investLock) return;
  k.investTimer -= dt;
  if (spot && k.coins > 0 && canInvest(world, spot)) {
    k.investing = true;
    if (k.investTimer <= 0) {
      throwCoin(world, spot);
      k.investTimer = c.investInterval;
    }
  }
}
