// 계산기 풀이 가이드: 기출 보강 3차
(function (G) {
  'use strict';
  const g = G.guide;
  g('fp-t', (p) => [
    p.ask === 'A' ? { say: 'A = 1 + Z1·Y', expr: '1+Z1*Y' } : p.ask === 'D' ? { say: 'D = 1 + Z2·Y', expr: '1+Z2*Y' } : { say: 'B = Z1 + Z2 + Z1·Z2·Y', expr: 'Z1+Z2+Z1*Z2*Y' },
  ]);
  g('fp-det', () => [{ say: 'D = (1 + B·C) ÷ A', expr: '(1+B*C)/A' }]);
  g('tx-z0', (p) =>
    p.mode === 'v'
      ? [{ say: 'v = 1/√(L·C) (H/km, F/km) ÷ 10⁵ → ×10⁵ km/s', expr: '1/sqrt(L*1e-3*C*1e-6)/1e5' }]
      : [{ say: 'Z0 = √(L/C) (mH ÷ μF → ×1000)', expr: 'sqrt(L*1e-3/(C*1e-6))' }]
  );
  g('tx-gamma', (p) =>
    p.mode === 'vswr'
      ? [{ say: '반사계수 크기 |Γ| = |ZL − Z0| ÷ (ZL + Z0)', expr: 'abs(ZL-Z0)/(ZL+Z0)' }, { say: 'VSWR = (1 + |Γ|) ÷ (1 − |Γ|)', expr: '(1+Ans)/(1-Ans)' }]
      : [{ say: '|Γ| = |ZL − Z0| ÷ (ZL + Z0)', expr: 'abs(ZL-Z0)/(ZL+Z0)' }]
  );
  g('sc-slg', () => [
    { say: '상전압 Ea = V ÷ √3 (V를 V 단위로)', expr: 'V*1000/sqrt(3)' },
    { say: '지락 전류 Ig = 3·Ea ÷ (Z0 + Z1 + Z2)', expr: '3*Ans/(Z0+Z1+Z2)' },
  ]);
  g('ns-rms', (p) => [{ say: '실효값 = √(V0² + (Vm1/√2)² + (Vm3/√2)² + …)', expr: 'sqrt(V0^2+m1^2/2+m3^2/2+m5^2/2)' }]);
  g('ns-thd', () => [{ say: 'THD = √(V3² + V5²) ÷ V1 × 100', expr: 'sqrt(V3^2+V5^2)/V1*100' }]);
  g('ns-power', () => [{ say: 'P = V1·I1·cosθ1 + V3·I3·cosθ3', expr: 'V1*I1*cos(t1)+V3*I3*cos(t3)' }]);
  g('ce-kind', (p) => [
    p.kind === 0 ? { say: 'e = A ÷ (1 + Kp), Kp = K', expr: 'A/(1+K)' } : p.kind === 1 ? { say: 'Kv = K ÷ a, e = A ÷ Kv = A·a ÷ K', expr: 'A*a/K' } : { say: 'Ka = K ÷ a, e = A ÷ Ka = A·a ÷ K', expr: 'A*a/K' },
  ]);
  g('bd-db', (p) => (p.mode === 'one' ? [{ say: 'g = 20·log₁₀(이득)', expr: '20*log(g1)' }] : [{ say: 'g = 20·log₁₀(G1·G2)', expr: '20*log(g1*g2)' }]));
  g('bd-lag', () => [{ say: '감쇠 = 10·log₁₀(1 + (ω/ω0)²)', expr: '10*log(1+(w/w0)^2)' }]);
  g('di-two', () => [{ say: 'C = ε0·S ÷ (d1/εr1 + d2/εr2) (cm²→×10⁻⁴, mm→×10⁻³, F→pF ×10¹²)', expr: '8.855e-12*S*1e-4/((d1/e1+d2/e2)*1e-3)*1e12' }]);
  g('di-angle', () => [{ say: 'θ2 = tan⁻¹(tanθ1 × ε2/ε1)', expr: 'atan(tan(th1)*e2/e1)' }]);
  g('cl-loss', (p) => {
    if (p.mode === 'B') return [p.kind === 'hys' ? { say: 'Ph′ = Ph × k^1.6', expr: 'P1*k^1.6' } : { say: 'Pe′ = Pe × k²', expr: 'P1*k^2' }];
    return [p.kind === 'hys' ? { say: 'Ph′ = Ph × k^(−0.6)', expr: 'P1*k^(-0.6)' } : { say: '와류손은 변하지 않아', expr: 'P1' }];
  });
  g('so-power', () => [{ say: 'P = V·E·sinδ ÷ Xs', expr: 'V*E/Xs*sin(d)' }]);
  g('so-scr', (p) => [p.mode === 'z' ? { say: 'K = 100 ÷ %Zs', expr: '100/z' } : { say: 'K = If1 ÷ If2', expr: 'If1/If2' }]);
  g('rl-tap', () => [{ say: '탭 = 부하전류 × 배수 × 5 ÷ CT 1차 정격', expr: 'IL*k*5/I1n' }]);
  g('rl-ct', () => [{ say: 'I2 = I1 × 5 ÷ CT 1차 정격', expr: 'I1*5/I1n' }]);
  g('sg-wave', (p) => [p.refl ? { say: '|반사| = |Z2 − Z1| ÷ (Z2 + Z1) × e', expr: 'abs(Z2-Z1)/(Z2+Z1)*Ei' } : { say: '투과 = 2·Z2 ÷ (Z2 + Z1) × e', expr: '2*Z2/(Z2+Z1)*Ei' }]);
  g('sg-time', (p) => [p.cable ? { say: 't = d(m) ÷ (300 ÷ √εr)', expr: 'd*1000/(300/sqrt(er))' } : { say: 't = d(m) ÷ 300 (m/μs)', expr: 'd*1000/300' }]);
  g('wr-ratio', (p) => [{ say: '소요량 비 ' + (p.meth === '1p3w' ? '37.5 %' : p.meth === '3p3w' ? '75 %' : '1/3') + ' 를 곱해', expr: p.meth === '1p3w' ? 'W*3/8' : p.meth === '3p3w' ? 'W*3/4' : 'W/3' }]);
})(globalThis.GISA);
