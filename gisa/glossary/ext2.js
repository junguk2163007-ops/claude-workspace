// 용어 사전: 기출 보강 2차(과도현상)
(function (G) {
  'use strict';
  G.term('transient-circuit', '과도현상', {
    group: '회로이론',
    aliases: ['과도현상', '과도 현상', '과도 전류', '과도전류'],
    concept: 'transient',
    brief: '전원을 갑자기 연결하거나 끊을 때, 정상값이 되기 전까지 전류·전압이 서서히 변하는 중간 과정.',
    easy: ['코일은 전류가, 콘덴서는 전압이 갑자기 변하는 걸 싫어해서 값이 서서히 올라가. 그 속도를 정하는 숫자가 시정수 τ야. RL은 τ = L/R, RC는 τ = R×C이고, τ가 지나면 최종값의 63.2 %까지 가.'],
    formulas: [['i(t) = (V/R)(1 − e^(−t/τ))', 'RL 직렬, τ = L/R'], ['v_c(t) = V(1 − e^(−t/τ))', 'RC 직렬, τ = RC']],
    exam: ['투입 직후 코일은 끊어진 것(전류 0), 콘덴서는 단락(전압 0)처럼 행동하고, 정상상태에서는 반대야.'],
    pitfalls: ['지수에 t가 아니라 t/τ를 넣어야 해. 단위(mH, μF)도 먼저 맞춰.'],
    example: { q: 'R = 20 Ω, L = 100 mH인 RL 회로의 시정수는?', expr: '100/20', ans: 5, unit: 'ms', say: 'τ = L ÷ R = 100 mH ÷ 20 Ω = 5 ms.' },
    related: ['time-constant'],
  });
})(globalThis.GISA);
