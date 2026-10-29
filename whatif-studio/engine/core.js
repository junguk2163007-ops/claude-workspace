// WhatIf Studio — 공통 유틸 (레퍼런스의 clamp/K/E/L/S 그대로) + 시드 고정 난수
(function (WI) {
  WI.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  WI.K = (t, a, b) => WI.clamp((t - a) / (b - a));
  WI.E = x => x * x * (3 - 2 * x);
  WI.L = (a, b, u) => a + (b - a) * u;
  WI.PI = Math.PI;
  WI.S = Math.sin;

  // mulberry32: 같은 시드 → 같은 수열. 결정적 렌더의 기반.
  WI.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  // 장면 코드는 Math.random 을 그대로 쓰고, 엔진이 시드 난수로 교체한다.
  // three.js UUID 는 별도 난수열 (build.mjs 의 three 패치) → 객체 생성 순서와 무관하게 장면 난수 고정
  WI.seedVisualRandom = function (seed) {
    Math.random = WI.mulberry32(seed);
    window.__uuidRandom = WI.mulberry32((seed ^ 0x5bd1e995) >>> 0);
  };

  WI.params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
})(window.WI = window.WI || {});
