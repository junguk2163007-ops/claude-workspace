import { CONFIG } from '../config.js';
import { emit, nextId, sign } from './util.js';

// 코인 n개를 (x, y)에서 위로 톡 튀어 오르게 만든다.
export function spawnCoins(world, x, y, n, opts = {}) {
  const c = CONFIG.coin;
  const { rng } = world;
  for (let i = 0; i < n; i++) {
    if (world.coins.length >= c.max) break;
    const spread = n > 1 ? (i / (n - 1) - 0.5) * 2 : rng.range(-0.6, 0.6);
    world.coins.push({
      id: nextId(world),
      x,
      y,
      vx: opts.vx ?? spread * c.popSpeedX + rng.range(-12, 12),
      vy: -rng.range(c.popSpeedY[0], c.popSpeedY[1]),
      spin: rng.range(0, Math.PI * 2),
      spinSpeed: rng.range(14, 22),
      grounded: false,
      delay: opts.delay ?? c.pickupDelay,
      age: 0,
    });
  }
  emit(world, 'coinSpawned', { x, y, count: n });
}

export function updateCoins(world, dt) {
  const c = CONFIG.coin;
  const k = CONFIG.king;
  const g = CONFIG.world.gravity;
  const king = world.king;

  for (let i = world.coins.length - 1; i >= 0; i--) {
    const coin = world.coins[i];
    coin.age += dt;
    coin.delay -= dt;

    if (!coin.grounded) {
      coin.vy += g * dt;
      coin.x += coin.vx * dt;
      coin.y += coin.vy * dt;
      coin.spin += coin.spinSpeed * dt;
      if (coin.y >= 0) {
        coin.y = 0;
        if (coin.vy > 60) {
          emit(world, 'coinBounce', { x: coin.x, strength: coin.vy });
          coin.vy = -coin.vy * c.bounce;
          coin.vx *= 0.6;
          coin.spinSpeed *= 0.6;
        } else {
          coin.grounded = true;
          coin.vx = coin.vy = 0;
        }
      }
    }

    if (coin.delay > 0) continue;
    const dx = king.x - coin.x;
    const dist = Math.abs(dx);

    // 줍기
    if (dist < k.pickupRadius && coin.y > -34) {
      world.coins.splice(i, 1);
      king.coins++;
      emit(world, 'coinCollected', { x: coin.x, y: coin.y });
      continue;
    }

    // 자석: 땅에 있는 코인이 왕 쪽으로 깡총
    if (coin.grounded && dist < k.magnetRadius) {
      coin.grounded = false;
      coin.vy = -110;
      coin.vx = sign(dx) * Math.max(60, dist * 3.2);
      coin.spinSpeed = 16;
    }
  }
}
