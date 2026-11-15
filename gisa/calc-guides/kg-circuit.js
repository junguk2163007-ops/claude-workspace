// 계산기 풀이 가이드: 기출 분석 보강(회로이론·제어)
(function (G) {
  'use strict';
  const g = G.guide;
  g('ba-wave', (p) => [
    p.half
      ? p.rms ? { say: '반파 정류 실효값 = Im ÷ 2', expr: 'Im/2' } : { say: '반파 정류 평균값 = Im ÷ π', expr: 'Im/pi' }
      : p.rms ? { say: '전파 정류 실효값 = Im ÷ √2', expr: 'Im/sqrt(2)' } : { say: '전파 정류 평균값 = 2·Im ÷ π', expr: '2*Im/pi' },
  ]);
  g('ba-ci', (p) => [p.isC ? { say: 'Im = ω·C·Vm (C는 μF → ×10⁻⁶)', expr: '2*pi*f*C*1e-6*Vm' } : { say: 'Im = Vm ÷ (ωL)', expr: 'Vm/(2*pi*f*L)' }]);
  g('ba-energy', () => [
    { say: '실효 전류 I = E ÷ (ωL) (L은 mH → ÷1000)', expr: 'E/(2*pi*f*LmH/1000)' },
    { say: 'W = ½·L·I²', expr: '0.5*LmH/1000*Ans^2' },
  ]);
  g('ns-rl', (p) =>
    p.askP
      ? [{ say: 'P = Σ (Vk² ÷ Zk²)·R, Zk² = R² + (k·ωL)²', expr: 'R*(V1^2/(R^2+X^2)+V3^2/(R^2+(3*X)^2)+V5^2/(R^2+(5*X)^2))' }]
      : [{ say: 'Ik = Vk ÷ √(R² + (k·ωL)²)', expr: 'Vk/sqrt(R^2+(k*X)^2)', vars: { Vk: p.k === 3 ? p.V3 : p.V5 } }]
  );
  g('ohm-cells', (p) => (p.askR ? [{ say: '합성 내부 저항 r = k·r0 ÷ m', expr: 'k*r0/m' }] : [{ say: 'I = k·E0 ÷ (k·r0/m + R)', expr: 'k*E0/(k*r0/m+R)' }]));
  g('pa-susc', (p) => [p.isL ? { say: 'BL = 1/(ωL) [S] → ×1000 = mS', expr: '1/(2*pi*f*LmH/1000)*1000' } : { say: 'BC = ωC [S] → ×1000 = mS', expr: '2*pi*f*CuF*1e-6*1000' }]);
  g('rs-vmax', (p) =>
    p.askI
      ? [{ say: '공진 전류 I = V ÷ R', expr: 'V/R' }]
      : [
          { say: 'ω0 = 1/√(LC)', expr: '1/sqrt(LmH/1000*CuF*1e-6)' },
          { say: 'VL = Q·V = (ω0L/R)·V', expr: 'Ans*LmH/1000/R*V' },
        ]
  );
  g('acp-2w', (p) => [
    p.ask === 'pf'
      ? { say: '역률 = (P1 + P2) ÷ (2√(P1² − P1P2 + P2²))', expr: '(P1+P2)/(2*sqrt(P1*P1-P1*P2+P2*P2))' }
      : p.ask === 'S'
        ? { say: '피상 전력 S = 2√(P1² − P1P2 + P2²)', expr: '2*sqrt(P1*P1-P1*P2+P2*P2)' }
        : { say: '무효 전력 Q = √3 |P2 − P1|', expr: 'sqrt(3)*abs(P2-P1)' },
  ]);
  g('acp-cplx', (p) => [p.askP ? { say: 'P = |V|²·R ÷ (R² + X²)', expr: '(a*a+b*b)*R/(R*R+X*X)' } : { say: '|S| = |V|² ÷ |Z|', expr: '(a*a+b*b)/sqrt(R*R+X*X)' }]);
  g('yd-nphase', (p) => [p.askAng ? { say: '위상차 = 90° − 180°/n', expr: '90-180/N' } : { say: '선간/상 = 2·sin(180°/n)', expr: '2*sin(180/N)' }]);
  g('rh-k3', () => [{ say: 'a·b > c 에서 K 의 한계 = c/a − d', expr: 'c/a-d' }]);
  g('rh-k2', () => [{ say: '상수항 bK − c0 > 0 → K > c0 ÷ b', expr: 'c0/b' }]);
  g('tf-dc', () => [{ say: '직류 이득 = G(0) = 분자 ÷ 분모의 상수항', expr: 'N/c' }]);
  g('tf-char', (p) => [p.askS ? { say: 's 의 계수 = p1 + p2 + 1', expr: 'p1+p2+1' } : { say: '상수항 = p1·p2 + z', expr: 'p1*p2+z' }]);
  g('bd-gain', (p) => [p.diff ? { say: 'g = 20·log₁₀(K·ω)', expr: '20*log(K*w)' } : { say: 'g = 20·log₁₀(1/(K·ω))', expr: '20*log(1/(K*w))' }]);
  g('bd-corner', () => [{ say: 'ω₀ = 1/T', expr: '1/Tt' }]);
  g('fp-image', () => [{ say: 'Z₀₁ = Z₀₂ × A/D', expr: 'Z02*A/D' }]);
  g('fp-theta', () => [{ say: 'θ = ln(√(AD) + √(BC)), BC = A² − 1', expr: 'ln(A+sqrt(A*A-1))' }]);
  g('tx-g', (p) => [p.askG ? { say: 'G = R·C ÷ L', expr: 'R*Cc/L' } : { say: 'C = L·G ÷ R (L: mH → ÷1000, F → μF ×10⁶)', expr: 'Lm/1000*Gg/Rr*1000000' }]);
  g('tx-i', () => [{ say: 'I = V ÷ Z0, Z0 = √(L/C)', expr: 'V/sqrt(Lu/Cu)' }]);
  g('ns-thdp', (p) => [p.usePct ? { say: 'THD = √(p3² + p5²) ÷ 100', expr: 'sqrt(p3^2+p5^2)/100' } : { say: 'THD = √(A2² + A3² + A4²) ÷ A1', expr: 'sqrt(A2^2+A3^2+A4^2)/A1' }]);
  g('ns-rlp', () => [{ say: 'Ik = (Vkm ÷ √2) ÷ √(R² + (k·ωL)²)', expr: 'Ak/sqrt(2)/sqrt(R^2+(k*X)^2)' }]);
  g('sc-unbal', () => [{ say: '불평형률 = 역상 ÷ 정상 × 100', expr: 'V2/V1*100' }]);
  g('tr-inv', () => [{ say: 'L = τ·R (H) → ×1000 = mH', expr: 'tau*R*1000' }]);
  g('tr-sol', () => [{ say: '인덕턴스 L = N·φ ÷ I', expr: 'N*phi/I' }, { say: '시정수 τ = L ÷ R', expr: 'Ans/R' }]);
  g('tr-phase', () => [{ say: 'α = θ = tan⁻¹(XL ÷ R)', expr: 'atan(X/R)' }]);
})(globalThis.GISA);
