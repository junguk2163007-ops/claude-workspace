// 계산기 풀이 가이드: 과도현상
(function (G) {
  'use strict';
  const g = G.guide;
  g('tr-tau', (p) => [p.mode === 'rl' ? { say: 'RL 시정수 τ = L ÷ R (mH ÷ Ω = ms)', expr: 'X/R' } : { say: 'RC 시정수 τ = R × C (Ω × μF = μs → ÷1000 = ms)', expr: 'R*X/1000' }]);
  g('tr-step', (p) => [
    p.mode === 'rl' ? { say: '시정수 τ = L ÷ R (ms)', expr: 'X/R' } : { say: '시정수 τ = R × C ÷ 1000 (ms)', expr: 'R*X/1000' },
    p.mode === 'rl'
      ? { say: 'i = (V/R) × (1 − e^(−t/τ))', expr: 'V/R*(1-exp(-t/tau))', vars: { tau: p.tau } }
      : { say: 'v_c = V × (1 − e^(−t/τ))', expr: 'V*(1-exp(-t/tau))', vars: { tau: p.tau } },
  ]);
})(globalThis.GISA);
