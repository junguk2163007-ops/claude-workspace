// 계산기 풀이 가이드: 기출 빈출 보강 1차
(function (G) {
  'use strict';
  const g = G.guide;

  g('pw-breaker-current', () => [{ say: '정격 차단전류 Is = Ps ÷ (√3 × V). MVA ÷ kV = kA', expr: 'Ps/(sqrt(3)*V)' }]);
  g('pw-breaker-capacity', () => [{ say: '정격 차단용량 Ps = √3 × V × Is. kV × kA = MVA', expr: 'sqrt(3)*V*I' }]);
  g('pw-petersen', () => [{ say: '소호리액터 L = 1 ÷ (3ω²C), ω = 2πf, C는 μF → F로 ÷1000000', expr: '1/(3*(2*pi*f)^2*C/1000000)' }]);
  g('pw-ground-current', () => [{ say: '지락전류 Ig = √3 × ωC × V (V는 선간전압 V로, C는 F로)', expr: 'sqrt(3)*2*pi*f*C/1000000*V*1000' }]);
  g('pw-power-transfer', () => [{ say: '송전 전력 P = Vs × Vr × sinδ ÷ X [MW]', expr: 'Vs*Vr*sin(d)/X' }]);
  g('pw-charging', (p) =>
    p.mode === 'Qc'
      ? [{ say: '3상 충전용량 Qc = ωCV² (kV·μF를 쓰면 ÷1000으로 kvar)', expr: '2*pi*f*C*V^2/1000' }]
      : [{ say: '한 선의 충전전류 Ic = ωC × V ÷ √3 (kV·μF를 쓰면 ÷1000으로 A)', expr: '2*pi*f*C*V/1000/sqrt(3)' }]
  );
  g('cs-kmax', () => [{ say: '특성방정식 s³+(a+b)s²+ab·s+K 에서 K < ab(a+b)', expr: 'a*b*(a+b)' }]);
  g('cs-overshoot', (p) =>
    p.useTf
      ? [
          { say: '분모 s² + a s + K 에서 ζ = a ÷ (2√K) — 결과를 A에 저장', expr: 'a/(2*sqrt(K))', store: 'A' },
          { say: 'Mp = exp(−πζ ÷ √(1−ζ²)) × 100 (e 거듭제곱은 SHIFT ln 키)', expr: '100*exp(-pi*$A/sqrt(1-$A^2))' },
        ]
      : [{ say: 'Mp = exp(−πζ ÷ √(1−ζ²)) × 100 (e 거듭제곱은 SHIFT ln 키)', expr: '100*exp(-pi*z/sqrt(1-z^2))' }]
  );
  g('cs-damping', () => [{ say: 'ζ = a ÷ (2√K)', expr: 'a/(2*sqrt(K))' }]);
  g('mc-thyristor', (p) =>
    p.type === 'half-R'
      ? [{ say: '단상 반파(저항): Ed = 0.45E × (1 + cosα) ÷ 2 (0.45 = √2/π)', expr: 'sqrt(2)/pi*E*(1+cos(alpha))/2' }]
      : p.type === 'full-R'
      ? [{ say: '단상 전파(저항): Ed = 0.9E × (1 + cosα) ÷ 2 (0.9 = 2√2/π)', expr: '2*sqrt(2)/pi*E*(1+cos(alpha))/2' }]
      : [{ say: '단상 전파(유도성): Ed = 0.9E × cosα', expr: '2*sqrt(2)/pi*E*cos(alpha)' }]
  );
  g('mc-autotr', (p) => [p.V2 > p.V1 ? { say: '승압: 자기용량 = 부하용량 × (V₂ − V₁) ÷ V₂', expr: 'S*(V2-V1)/V2' } : { say: '강압: 자기용량 = 부하용량 × (V₁ − V₂) ÷ V₁', expr: 'S*(V1-V2)/V1' }]);
  g('mc-tr-parallel', () => [
    { say: 'A의 S ÷ %Z — 결과를 A에 저장', expr: 'S1/z1', store: 'A' },
    { say: 'B의 S ÷ %Z — 결과를 B에 저장', expr: 'S2/z2', store: 'B' },
    { say: 'A의 분담 = 합계 × A ÷ (A + B)', expr: 'P*$A/($A+$B)' },
  ]);
  g('em-wave-impedance', () => [{ say: 'η = 377 × √(μr ÷ εr) (377 = 120π)', expr: '120*pi*sqrt(ur/er)' }]);
  g('em-wave-speed', (p) =>
    p.mode === 'v'
      ? [{ say: 'v = c ÷ √(εr·μr), c = 3×10⁸ → ×10⁸ m/s 단위로 3 ÷ √(εr·μr)', expr: '3/sqrt(er*ur)' }]
      : [
          { say: '매질 속 속도 v = c ÷ √(εr·μr)', expr: '3e8/sqrt(er*ur)' },
          { say: '파장 λ = v ÷ f (MHz는 ×10⁶ Hz)', expr: 'Ans/(f*1e6)' },
        ]
  );
})(globalThis.GISA);
