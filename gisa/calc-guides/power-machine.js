// 계산기 풀이 가이드: 전력공학 + 전기기기
(function (G) {
  'use strict';
  const g = G.guide;

  // ── 전압강하 ──
  g('pw-vdrop-3ph', (p) => {
    const core = 'sqrt(3)*I*(R*pf+X*sqrt(1-pf^2))';
    return p.ask === 'Vs'
      ? [
          { say: '전압강하 e = √3·I(R cosθ + X sinθ), sinθ = √(1 − cos²θ)', expr: core },
          { say: '송전단전압 = 수전단전압 + 전압강하', expr: 'Vr+Ans' },
        ]
      : [{ say: '전압강하 e = √3·I(R cosθ + X sinθ), sinθ = √(1 − cos²θ)', expr: core }];
  });
  g('pw-vdrop-rate', () => [{ say: '전압강하율 = (Vs − Vr) ÷ Vr × 100', expr: '(Vs-Vr)/Vr*100' }]);

  // ── 전력손실 ──
  g('pw-loss-3i2r', () => [{ say: 'Pℓ = 3I²R', expr: '3*I^2*R' }]);
  g('pw-loss-power', () => [{ say: 'Pℓ = P²R ÷ (V²cos²θ). kW÷kV 비를 제곱하면 W가 되니까 마지막에 ÷1000 해서 kW', expr: '(PkW/VkV)^2*R/pf^2/1000' }]);
  g('pw-loss-ratio', (p) => (p.mode === 'V' ? [{ say: '손실은 전압의 제곱에 반비례: 1 ÷ k²', expr: '1/k^2' }] : [{ say: '손실은 역률의 제곱에 반비례: (처음 역률 ÷ 나중 역률)²', expr: '(a/b)^2' }]));

  // ── %임피던스·단락 ──
  g('pw-short-current', () => [{ say: 'Is = (100 ÷ %Z) × In', expr: '100/z*In' }]);
  g('pw-short-capacity', () => [{ say: 'Ps = (100 ÷ %Z) × Pn', expr: '100/z*Pn' }]);
  g('pw-pctz-calc', () => [{ say: '%Z = P[kVA] × Z ÷ (10 × V²[kV])', expr: 'P*Z/(10*V^2)' }]);

  // ── 역률 개선 ──
  g('pw-pfc', () => [{ say: 'Qc = P (tanθ₁ − tanθ₂), 각은 cos⁻¹(역률)로 구해', expr: 'P*(tan(acos(a))-tan(acos(b)))' }]);

  // ── 이도 ──
  g('pw-sag-d', () => [{ say: 'D = W S² ÷ (8T)', expr: 'W*S^2/(8*T)' }]);
  g('pw-sag-len', () => [{ say: '전선 길이 − 경간 = 8D² ÷ (3S)', expr: '8*D^2/(3*S)' }]);

  // ── 선로정수 ──
  g('pw-gmd', () => [{ say: '등가 선간거리 = ∛(D₁·D₂·D₃)', expr: 'cbrt(D1*D2*D3)' }]);
  g('pw-line-lc', (p) =>
    p.ask === 'L'
      ? [{ say: 'L = 0.05 + 0.4605 log₁₀(D ÷ r) — D는 cm로 ×100', expr: '0.05+0.4605*log(Dm*100/rcm)' }]
      : [{ say: 'C = 0.02413 ÷ log₁₀(D ÷ r)', expr: '0.02413/log(Dm*100/rcm)' }]
  );

  // ── 발전 ──
  g('pw-hydro', () => [{ say: 'P = 9.8 × Q × H × η [kW]', expr: '9.8*Q*H*eta' }]);
  g('pw-thermal', () => [{ say: 'η = 860W ÷ (mH) × 100', expr: '860*W/(m*H)*100' }]);

  // ── 수용률·부등률·부하율 ──
  g('pw-transformer-cap', (p) => [
    { say: '설비용량 × 수용률을 전부 더해 (합성 최대수요)', expr: p.loads.map(([a, b]) => a + '*' + b).join('+') },
    { say: '변압기 용량 = 합 ÷ (부등률 × 역률)', expr: 'Ans/(div*pf)' },
  ]);
  g('pw-rates', (p) => (p.mode === 'demand' ? [{ say: '수용률 = 최대수요전력 ÷ 설비용량 × 100', expr: 'Pm/Pi*100' }] : [{ say: '부하율 = (전력량 ÷ 24) ÷ 최대전력 × 100', expr: 'Wd/24/Pm*100' }]));

  // ── 직류기 ──
  g('mc-dc-emf', () => [{ say: 'E = pZΦN ÷ (60a)', expr: 'p*Z*phi*N/(60*a)' }]);
  g('mc-dc-terminal', () => [{ say: '전압 − 전기자 전압강하 (Ia·Ra)', expr: 'V0-Ia*Ra' }]);
  g('mc-dc-torque', () => [{ say: 'T = 60P ÷ (2πN), kW는 ×1000', expr: '60*PkW*1000/(2*pi*N)' }]);
  g('mc-dc-speed', () => [
    { say: '처음 역기전력 E₁ = V − I₁Ra — A에 저장', expr: 'V-I1*Ra', store: 'A' },
    { say: '나중 역기전력 E₂ = V − I₂Ra', expr: 'V-I2*Ra' },
    { say: 'N₂ = N₁ × E₂ ÷ E₁ (자속 일정)', expr: 'N1*Ans/$A' },
  ]);

  // ── 변압기 ──
  g('mc-tr-ratio', (p) =>
    p.mode === 'Z'
      ? [{ say: '임피던스는 권수비의 제곱: Z₁ = (N₁÷N₂)² × Z₂', expr: '(N1/N2)^2*x' }]
      : [{ say: (p.mode === 'V' ? '전압' : '전류') + '은 권수 N₂ ÷ N₁ 비로 바뀌어', expr: 'x*N2/N1' }]
  );
  g('mc-tr-eff', () => [
    { say: '출력 = 부하율 × 용량 × 역률 — A에 저장', expr: 'm*S*pf', store: 'A' },
    { say: '손실 = 철손 + 부하율² × 동손', expr: 'Pi+m^2*Pc' },
    { say: '효율 = 출력 ÷ (출력 + 손실) × 100', expr: '$A/($A+Ans)*100' },
  ]);
  g('mc-tr-maxeff', () => [{ say: '최대 효율 부하율 m = √(철손 ÷ 동손), %로 ×100', expr: 'sqrt(Pi/Pc)*100' }]);
  g('mc-tr-reg', () => [{ say: 'ε ≈ p cosθ + q sinθ, sinθ = √(1 − cos²θ)', expr: 'p*pf+q*sqrt(1-pf^2)' }]);

  // ── 유도기 ──
  g('mc-im-slip', () => [
    { say: '동기속도 Ns = 120f ÷ P', expr: '120*f/P' },
    { say: '슬립 s = (Ns − N) ÷ Ns × 100', expr: '(Ans-N)/Ans*100' },
  ]);
  g('mc-im-speed', () => [
    { say: '동기속도 Ns = 120f ÷ P', expr: '120*f/P' },
    { say: 'N = Ns × (1 − s) (s는 %라서 ÷100)', expr: 'Ans*(1-s/100)' },
  ]);
  g('mc-im-power', (p) =>
    p.mode === 'P2'
      ? [{ say: '2차 입력 P₂ = 출력 ÷ (1 − s)', expr: 'x/(1-s)' }]
      : p.mode === 'Pc'
      ? [{ say: '2차 동손 = s × 2차 입력', expr: 's*x' }]
      : [{ say: '출력 = (1 − s) × 2차 입력', expr: '(1-s)*x' }]
  );
  g('mc-im-torque-v', () => [{ say: '토크는 전압의 제곱에 비례: k²', expr: 'k^2' }]);

  // ── 동기기 ──
  g('mc-sync-speed', () => [{ say: 'Ns = 120f ÷ P', expr: '120*f/P' }]);
  g('mc-sync-power', () => [{ say: 'P = 3·E·V·sinδ ÷ Xs, W를 kW로 ÷1000', expr: '3*E*V*sin(d)/Xs/1000' }]);
  g('mc-sync-scr', (p) => (p.mode === 'z' ? [{ say: '단락비 = 100 ÷ %Z', expr: '100/z' }] : [{ say: '단락비 = 무부하 정격전압 If ÷ 단락 정격전류 If', expr: 'If1/If2' }]));

  // ── 정류회로 ──
  const RECT = { h1: 'sqrt(2)/pi*E', f1: '2*sqrt(2)/pi*E', h3: '3*sqrt(6)/(2*pi)*E', f3: '3*sqrt(2)/pi*E' };
  const RECT_SAY = { h1: '단상 반파: √2/π × E', f1: '단상 전파: 2√2/π × E', h3: '3상 반파: 3√6/(2π) × E', f3: '3상 전파: 3√2/π × E' };
  g('mc-rect', (p) => [{ say: RECT_SAY[p.type], expr: RECT[p.type] }]);
})(globalThis.GISA);
