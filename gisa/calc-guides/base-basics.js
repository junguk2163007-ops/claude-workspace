// 계산기 풀이 가이드: 기초 수학 + 회로이론 기초(옴·직병렬·전력·전력량·3상)
// G.guide(템플릿 id, (params) => [{ say: '설명', expr: '계산식', vars: {추가 변수} }, ...])
(function (G) {
  'use strict';
  const g = G.guide;

  // ── 기초 수학 ──
  const PREFIX = { G: 9, M: 6, k: 3, '': 0, m: -3, μ: -6, n: -9, p: -12 };
  g('base-prefix', (p) => {
    const diff = PREFIX[p.from] - PREFIX[p.to];
    return [{ say: '접두어 차이만큼 10의 거듭제곱을 곱해: 10^(' + diff + ')', expr: 'v*10^(d)', vars: { d: diff } }];
  });
  g('base-trig', (p) => [
    { say: '피타고라스로 높이를 구해: √(빗변² − 밑변²)', expr: 'sqrt(c^2-a^2)' },
    p.ask === 'tan' ? { say: 'tanθ = 높이 ÷ 밑변', expr: 'Ans/a' } : { say: 'sinθ = 높이 ÷ 빗변', expr: 'Ans/c' },
  ]);
  g('base-pythag', (p) =>
    p.ask === 'c'
      ? [{ say: '빗변 = √(밑변² + 높이²)', expr: 'sqrt(a^2+b^2)' }]
      : [{ say: '나머지 변 = √(빗변² − 한 변²)', expr: 'sqrt(c^2-a^2)' }]
  );
  g('base-ratio', (p) => [{ say: 'A의 배수 = (B 배수) ÷ (C 배수)', expr: 'm' + (p.pa === 2 ? '^2' : '') + '/k' + (p.pb === 2 ? '^2' : '') }]);

  // ── 옴의 법칙 ──
  g('ohm-current', () => [{ say: 'I = V ÷ R', expr: 'V/R' }]);
  g('ohm-voltage', () => [{ say: 'V = I × R', expr: 'I*R' }]);
  g('ohm-resistance', () => [
    { say: 'mA를 A로 바꿔: ÷ 1000', expr: 'ImA/1000' },
    { say: 'R = V ÷ I (방금 구한 전류 Ans로 나눠)', expr: 'V/Ans' },
  ]);

  // ── 직렬·병렬 ──
  g('series-total', (p) => [{ say: '직렬은 전부 더해', expr: p.Rs.join('+') }]);
  g('series-current', (p) => [
    { say: '직렬 합성저항: 전부 더해', expr: p.Rs.join('+') },
    { say: 'I = V ÷ R (Ans가 합성저항)', expr: 'V/Ans' },
  ]);
  g('parallel-two', () => [{ say: '병렬 두 개: 곱 ÷ 합', expr: 'R1*R2/(R1+R2)' }]);
  g('parallel-three', (p) => [
    { say: '병렬은 역수의 합을 구해', expr: p.Rs.map((x) => '1/' + x).join('+') },
    { say: '뒤집으면 합성저항: Ans의 역수 (x⁻¹ 키)', expr: 'Ans^-1' },
  ]);
  g('parallel-current', () => [{ say: '두 갈래 전류를 각각 구해서 더해: V/R₁ + V/R₂', expr: 'V/R1+V/R2' }]);

  // ── 전압 분배 ──
  g('divider-two', () => [{ say: 'V₂ = V × R₂ ÷ (R₁ + R₂)', expr: 'V*R2/(R1+R2)' }]);
  g('divider-three', (p) => [
    { say: '전체 저항: 전부 더해', expr: p.Rs.join('+') },
    { say: 'V₂ = V × R₂ ÷ (전체 저항 Ans)', expr: 'V*' + p.Rs[1] + '/Ans' },
  ]);

  // ── 전력 ──
  g('power-i2r', () => [{ say: 'P = I² × R', expr: 'I^2*R' }]);
  g('power-v2r', () => [{ say: 'P = V² ÷ R', expr: 'V^2/R' }]);
  g('power-ratio', (p) =>
    p.mode === 'V' || p.mode === 'I'
      ? [{ say: '전력은 ' + (p.mode === 'V' ? '전압' : '전류') + '의 제곱에 비례: ' + p.k + '²', expr: 'k^2' }]
      : p.mode === 'R-constV'
      ? [{ say: '전압 일정 → P ∝ 1/R: 1 ÷ ' + p.k, expr: '1/k' }]
      : [{ say: '전류 일정 → P ∝ R: ' + p.k + '배', expr: 'k' }]
  );

  // ── 전력량·요금 ──
  g('energy-kwh', () => [
    { say: 'W를 kW로: ÷ 1000', expr: 'P/1000' },
    { say: 'kW × 하루 시간 × 일수 = kWh', expr: 'Ans*h*days' },
  ]);
  g('energy-cost', () => [
    { say: 'W를 kW로: ÷ 1000', expr: 'P/1000' },
    { say: '전력량 = kW × 시간 × 일수', expr: 'Ans*h*days' },
    { say: '요금 = 전력량 × 단가', expr: 'Ans*price' },
  ]);
  g('energy-joule', () => [{ say: '1 kWh = 3.6 MJ 이니까 3.6을 곱해', expr: 'W*3.6' }]);

  // ── 3상 전력 ──
  g('tp-power', () => [
    { say: 'P = √3 × V × I × cosθ (W 단위)', expr: 'sqrt(3)*V*I*pf' },
    { say: 'kW로 바꿔: ÷ 1000', expr: 'Ans/1000' },
  ]);
  g('tp-current', () => [
    { say: '분모부터: √3 × V × cosθ', expr: 'sqrt(3)*V*pf' },
    { say: 'I = P[W] ÷ 분모 (kW는 ×1000 해서 W로)', expr: 'PkW*1000/Ans' },
  ]);
})(globalThis.GISA);
