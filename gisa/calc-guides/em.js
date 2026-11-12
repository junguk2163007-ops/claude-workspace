// 계산기 풀이 가이드: 전기자기학
(function (G) {
  'use strict';
  const g = G.guide;

  // ── 쿨롱의 법칙 ──
  g('em-coulomb-force', () => [{ say: 'F = 9×10⁹ × Q₁Q₂ ÷ r² (μC는 ×10⁻⁶)', expr: '9e9*Q1*1e-6*Q2*1e-6/d^2' }]);
  g('em-coulomb-ratio', () => [{ say: 'F ∝ Q ÷ r²: 전하 a배, 거리 b배 → a ÷ b²', expr: 'a/b^2' }]);

  // ── 전계와 전위 ──
  g('em-point', (p) =>
    p.ask === 'E'
      ? [{ say: 'nC이면 9×10⁹ × 10⁻⁹ = 9 → E = 9Q ÷ r²', expr: '9*Q/d^2' }]
      : [{ say: 'nC이면 V = 9Q ÷ r', expr: '9*Q/d' }]
  );
  g('em-line', () => [{ say: 'E = 18×10⁹ × λ ÷ r (λ는 nC/m라서 18λ ÷ r)', expr: '18*lam/d' }]);

  // ── 정전용량과 콘덴서 ──
  g('em-cap-scale', () => [{ say: 'C ∝ 유전율 × 면적 ÷ 간격', expr: 'e*a/b' }]);
  g('em-cap-plate', () => [{ say: 'C = ε₀·εs·S ÷ d (mm는 ×10⁻³), pF로 바꾸려고 ×10¹²', expr: '8.855e-12*es*S/(dmm*1e-3)*1e12' }]);
  g('em-cap-combo', (p) => (p.how === 'series' ? [{ say: '콘덴서 직렬: 곱 ÷ 합', expr: 'C1*C2/(C1+C2)' }] : [{ say: '콘덴서 병렬: 그냥 더해', expr: 'C1+C2' }]));
  g('em-cap-energy', () => [{ say: 'W = ½CV² (μF는 ×10⁻⁶)', expr: '0.5*CuF*1e-6*V^2' }]);

  // ── 전류가 만드는 자계 ──
  g('em-mag-wire', () => [{ say: 'H = I ÷ (2πr)', expr: 'I/(2*pi*d)' }]);
  g('em-mag-coil', () => [{ say: 'H = NI ÷ (2a)', expr: 'N*I/(2*a)' }]);
  g('em-mag-solenoid', (p) => (p.kind === 'toroid' ? [{ say: '환상 솔레노이드: H = NI ÷ (2πr)', expr: 'N*I/(2*pi*r)' }] : [{ say: '무한장 솔레노이드: H = NI ÷ l', expr: 'N*I/len' }]));

  // ── 전자력 ──
  g('em-force-bil', () => [{ say: 'F = B I l sinθ', expr: 'B*I*l*sin(th)' }]);
  g('em-force-parallel', () => [{ say: 'F = 2 I₁ I₂ ÷ r × 10⁻⁷', expr: '2*I1*I2/d*1e-7' }]);

  // ── 전자유도 ──
  g('em-faraday', () => [{ say: 'e = N × ΔΦ ÷ Δt', expr: 'N*dP/dt' }]);
  g('em-motional', () => [{ say: 'e = B l v sinθ', expr: 'B*l*v*sin(th)' }]);

  // ── 인덕턴스 ──
  g('em-ind-energy', () => [{ say: 'W = ½LI² (mH는 ÷ 1000)', expr: '0.5*LmH/1000*I^2' }]);
  g('em-ind-self', () => [{ say: 'L = NΦ ÷ I (Φ가 mWb니까 L도 mH)', expr: 'N*PmWb/I' }]);
  g('em-ind-mutual', () => [{ say: 'M = k × √(L₁L₂)', expr: 'k*sqrt(L1*L2)' }]);
  g('em-ind-series', (p) => [p.aid ? { say: '가동 결합: L₁ + L₂ + 2M', expr: 'L1+L2+2*M' } : { say: '차동 결합: L₁ + L₂ − 2M', expr: 'L1+L2-2*M' }]);

  // ── 자기회로 ──
  g('em-mc-flux', () => [{ say: 'Φ = NI ÷ Rm, Wb를 mWb로 ×1000', expr: 'N*I/Rm*1000' }]);
  g('em-mc-scale', () => [{ say: 'Rm ∝ 길이 ÷ (투자율 × 단면적)', expr: 'a/(b*c)' }]);
})(globalThis.GISA);
