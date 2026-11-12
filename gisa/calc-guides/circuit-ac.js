// 계산기 풀이 가이드: 교류·RLC·교류 전력·공진·Y-Δ·제어(라플라스·전달함수)
(function (G) {
  'use strict';
  const g = G.guide;

  // ── 교류 기초 ──
  g('ac-rms', () => [
    { say: 'sin 앞의 X√2가 최댓값이야', expr: 'X*sqrt(2)' },
    { say: '실효값 = 최댓값 ÷ √2', expr: 'Ans/sqrt(2)' },
  ]);
  g('ac-average', () => [{ say: '평균값 = 2 × 최댓값 ÷ π', expr: '2*Vm/pi' }]);
  g('ac-period', (p) =>
    p.mode === 'f2T'
      ? [
          { say: 'T = 1 ÷ f (초)', expr: '1/f' },
          { say: 'ms로: × 1000', expr: 'Ans*1000' },
        ]
      : [
          { say: 'ms를 s로: ÷ 1000', expr: 'Tms/1000' },
          { say: 'f = 1 ÷ T', expr: '1/Ans' },
        ]
  );
  g('ac-omega', (p) => [{ say: 't 앞의 숫자가 ω = 2fπ 야. f = ω ÷ 2π', expr: 'w*pi/(2*pi)', vars: { w: 2 * p.f } }]);

  // ── RLC 임피던스 ──
  g('rlc-rl', () => [{ say: 'Z = √(R² + XL²)', expr: 'sqrt(R^2+X^2)' }]);
  g('rlc-series', () => [{ say: 'Z = √(R² + (XL − XC)²)', expr: 'sqrt(R^2+(XL-XC)^2)' }]);
  g('rlc-omega', () => [
    { say: 'XL = ωL (mH → H는 ÷ 1000)  — 결과를 A에 저장', expr: 'w*LmH/1000', store: 'A' },
    { say: 'XC = 1 ÷ (ωC) (μF → F는 ÷ 1000000)  — 결과를 B에 저장', expr: '1/(w*CuF/1000000)', store: 'B' },
    { say: 'Z = √(R² + (XL − XC)²) — A, B를 불러 써', expr: 'sqrt(R^2+($A-$B)^2)' },
  ]);
  g('rlc-current', () => [
    { say: 'Z = √(R² + X²)', expr: 'sqrt(R^2+X^2)' },
    { say: 'I = V ÷ Z', expr: 'V/Ans' },
  ]);

  // ── 교류 전력 ──
  g('acp-active', () => [{ say: 'P = V × I × cosθ', expr: 'V*I*pf' }]);
  g('acp-reactive', () => [
    { say: 'sinθ = √(1 − cos²θ)', expr: 'sqrt(1-pf^2)' },
    { say: 'Q = V × I × sinθ', expr: 'V*I*Ans' },
  ]);
  g('acp-apparent', () => [{ say: 'S = √(P² + Q²)', expr: 'sqrt(P^2+Q^2)' }]);
  g('acp-pf', () => [
    { say: 'Z = √(R² + X²)', expr: 'sqrt(R^2+X^2)' },
    { say: 'cosθ = R ÷ Z', expr: 'R/Ans' },
  ]);
  g('acp-q-from-p', () => [
    { say: '피상전력 S = P ÷ cosθ — 결과를 A에 저장', expr: 'P/pf', store: 'A' },
    { say: 'sinθ = √(1 − cos²θ)', expr: 'sqrt(1-pf^2)' },
    { say: 'Q = S × sinθ (A에 저장해 둔 S를 불러 써)', expr: '$A*Ans' },
  ]);

  // ── 직렬 공진 ──
  g('res-omega', () => [{ say: 'ω₀ = 1 ÷ √(L·C) (mH, μF를 H, F로 바꿔서)', expr: '1/sqrt(LmH/1000*CuF/1000000)' }]);
  g('res-f0', () => [
    { say: 'ω₀ = 1 ÷ √(L·C)', expr: '1/sqrt(LmH/1000*CuF/1000000)' },
    { say: 'f₀ = ω₀ ÷ 2π', expr: 'Ans/(2*pi)' },
  ]);
  g('res-current', () => [{ say: '공진이면 Z = R 이라서 I = V ÷ R', expr: 'V/R' }]);
  g('res-scale', (p) => [{ say: 'f₀ ∝ 1/√(LC): LC가 ' + (p.up ? p.a * p.b + '배' : '1/' + p.a * p.b + '배') + ' → ' + (p.up ? '1 ÷ √(' + p.a * p.b + ')' : '√(' + p.a * p.b + ')'), expr: p.up ? '1/sqrt(a*b)' : 'sqrt(a*b)' }]);
  g('res-q', () => [{ say: 'Q = (1 ÷ R) × √(L ÷ C)', expr: '1/R*sqrt((LmH/1000)/(CuF/1000000))' }]);

  // ── Y·Δ 결선 ──
  g('yd-voltage', (p) => (p.mode === 'p2l' ? [{ say: 'Y결선: VL = √3 × Vp', expr: 'sqrt(3)*Vp' }] : [{ say: 'Y결선: Vp = VL ÷ √3', expr: 'VL/sqrt(3)' }]));
  g('yd-current', (p) => (p.mode === 'p2l' ? [{ say: 'Δ결선: IL = √3 × Ip', expr: 'sqrt(3)*Ip' }] : [{ say: 'Δ결선: Ip = IL ÷ √3', expr: 'IL/sqrt(3)' }]));
  g('yd-load', (p) =>
    p.type === 'Y'
      ? [{ say: 'Y: 상전압 VL÷√3 을 Z로 나눈 게 선전류', expr: 'VL/sqrt(3)/Z' }]
      : [
          { say: 'Δ: 상전류 Ip = VL ÷ Z', expr: 'VL/Z' },
          { say: '선전류 IL = √3 × Ip', expr: 'sqrt(3)*Ans' },
        ]
  );
  g('yd-convert', (p) => (p.mode === 'D2Y' ? [{ say: 'Δ→Y: 임피던스를 3으로 나눠', expr: 'Z/3' }] : [{ say: 'Y→Δ: 임피던스에 3을 곱해', expr: 'Z*3' }]));

  // ── 제어: 라플라스·전달함수 ──
  g('lp-final', (p) =>
    p.ask === 'final'
      ? [{ say: 'sF(s)에서 s = 0 을 넣으면 b ÷ a', expr: 'b/a' }]
      : [{ say: 's → ∞ 이면 분자의 s 계수 K ÷ 분모의 s 계수 1', expr: 'K/1' }]
  );
  g('tf-feedback', () => [{ say: '부궤환: C/R = G ÷ (1 + GH)', expr: 'K/(1+K*h)' }]);
  g('tf-standard', (p) => (p.ask === 'T' ? [{ say: '분모 상수항 d로 나눠서 s 앞이 시정수: T = c ÷ d', expr: 'c/d' }] : [{ say: '분모 상수항 d로 나눠서 분자가 이득: K = b ÷ d', expr: 'b/d' }]));
})(globalThis.GISA);
