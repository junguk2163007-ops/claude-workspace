// 시드 기반 난수. 같은 (시드, 소금) 조합이면 어느 기기에서든 같은 수열이 나온다.
(function (G) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function create(seed, salt) {
    const next = mulberry32(((seed >>> 0) ^ hashString(salt || '')) >>> 0);
    return {
      next,
      int(min, max) {
        return min + Math.floor(next() * (max - min + 1));
      },
      pick(arr) {
        return arr[Math.floor(next() * arr.length)];
      },
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          const tmp = a[i];
          a[i] = a[j];
          a[j] = tmp;
        }
        return a;
      },
      chance(p) {
        return next() < p;
      },
    };
  }

  // 사람이 손으로 옮겨 적기 쉬운 1~999999 범위
  function newSeed() {
    return 1 + Math.floor(Math.random() * 999999);
  }

  G.rng = { create, hashString, newSeed };
})(globalThis.GISA);
