// 규칙 코드에서 쓰는 작은 도구들. 화면(Canvas/DOM)은 절대 건드리지 않는다.

export function createRng(seed = 1) {
  let s = (seed >>> 0) || 1;
  const next = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => Math.floor(a + (b - a + 1) * next()),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}

// 규칙 쪽에서 일어난 일을 화면/소리 쪽에 알리는 "이벤트".
// 예: emit(world, 'coinCollected', { x, y }) → 화면은 반짝임, 소리는 짤랑.
export function emit(world, type, data = {}) {
  world.events.push({ type, ...data });
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

export function nextId(world) {
  return world.nextId++;
}
