// 용어 사전: 전력공학 (송배전·발전·부하)
(function (G) {
  'use strict';
  const T = G.term;
  const GR = '전력공학';

  T('voltage-drop', '전압강하', {
    group: GR,
    aliases: ['전압강하율', '전압 강하', '송전단전압', '수전단전압', '송전단 전압', '수전단 전압'],
    concept: 'pw-vdrop',
    brief: '송전선의 저항·리액턴스 때문에 받는 쪽(수전단) 전압이 보내는 쪽(송전단)보다 낮아지는 정도.',
    easy: ['긴 호스로 물을 보내면 끝에서 나오는 수압이 줄어드는 것과 같아. 선로가 길고 전류가 클수록, 역률이 나쁠수록 전압이 더 떨어져.'],
    formulas: [
      ['3상: e = √3 I (R cosθ + X sinθ)  [V]', ''],
      ['Vs = Vr + e', '송전단전압 = 수전단전압 + 전압강하'],
      ['전압강하율 ε = (Vs − Vr) / Vr × 100  [%]', '수전단전압 기준'],
    ],
    exam: ['sinθ는 역률 cosθ로 √(1 − cos²θ)로 구해.', '전압강하율의 분모는 송전단이 아니라 수전단 전압(Vr)이야.'],
    pitfalls: ['분모를 Vs로 나누는 실수가 흔해. 수전단(받는 쪽) 기준이야.'],
    example: { q: 'Vs = 22880 V, Vr = 22000 V 일 때 전압강하율은?', expr: '(22880-22000)/22000*100', ans: 4, unit: '%', say: '(Vs − Vr)/Vr × 100.' },
    related: ['loss-power', 'power-factor', 'three-phase'],
  });

  T('loss-power', '전력손실', {
    group: GR,
    aliases: ['선로손실', '전력 손실', '송전손실', '송전 손실'],
    concept: 'pw-loss',
    brief: '송전선의 저항에서 열로 사라지는 전력. 3상은 Pℓ = 3I²R = P²R/(V²cos²θ).',
    easy: ['전선도 저항이 있어서 전류가 흐르면 열이 나고 그만큼 전력이 새. 같은 전력을 보낼 때 전압을 높이면 전류가 줄어서 손실이 크게 줄어. 그래서 송전은 초고압으로 해.'],
    formulas: [['Pℓ = 3 I² R', '3상'], ['I = P / (√3 V cosθ)', ''], ['Pℓ = P² R / (V² cos²θ)', '전력 P가 일정할 때']],
    exam: ['손실은 전압의 제곱에 반비례: 전압을 k배로 올리면 손실은 1/k²배.', '손실은 역률의 제곱에 반비례: 역률 0.6 → 0.8 이면 (0.6/0.8)² = 9/16 배.'],
    pitfalls: ['kW, kV 단위가 섞여 있으면 먼저 W, V로 통일해서 계산하거나 비율만 따져.'],
    example: { q: '전압을 5배로 올리면 전력손실은 몇 배?', expr: '1/5^2', ans: 0.04, unit: '배', say: '1/k².' },
    related: ['voltage-drop', 'power-factor', 'proportion'],
  });

  T('pct-impedance', '%임피던스', {
    group: GR,
    aliases: ['%Z', '퍼센트 임피던스', '%임피던스(%Z)', '% 임피던스'],
    concept: 'pw-pctz',
    brief: '정격 전류가 흐를 때 임피던스에서 생기는 전압강하가 정격 전압의 몇 %인지 나타낸 값.',
    easy: ['전압·전류·Ω 대신 "정격 대비 몇 %"로 쓰면 전압 등급이 달라도 비교하기 쉬워. 변압기나 선로의 %Z가 작을수록 단락 사고 때 큰 전류가 흘러.'],
    formulas: [['%Z = P[kVA] × Z[Ω] / (10 × V²[kV])', ''], ['%Z = I Z / E × 100', 'E: 상전압']],
    exam: ['단락전류 문제와 한 세트로 나와.'],
    example: { q: 'P = 10000 kVA, V = 20 kV, Z = 10 Ω 의 %Z는?', expr: '10000*10/(10*20^2)', ans: 25, unit: '%', say: 'PZ/(10V²).' },
    related: ['short-circuit'],
  });

  T('short-circuit', '단락전류', {
    group: GR,
    aliases: ['단락 전류', '단락용량', '단락 용량', '단락사고'],
    concept: 'pw-pctz',
    brief: '선로가 단락(합선)됐을 때 흐르는 큰 전류. Is = (100 / %Z) × In.',
    easy: ['전선끼리 붙어 버리면 저항이 거의 없어서 엄청난 전류가 흘러. %Z가 작은 기기일수록 단락전류가 더 커. 차단기 용량을 정할 때 필요한 값이야.'],
    formulas: [['Is = (100 / %Z) × In', '단락전류'], ['Ps = (100 / %Z) × Pn', '단락용량']],
    exam: ['단락전류는 정격전류의 100/%Z 배야. %Z = 5%이면 20배.'],
    example: { q: '정격전류 100 A, %Z = 2% 의 단락전류는?', expr: '100/2*100', ans: 5000, unit: 'A', say: '(100/%Z) × In.' },
    related: ['pct-impedance'],
  });

  T('pf-correction', '역률 개선', {
    group: GR,
    aliases: ['역률개선', '전력용 콘덴서', '진상 콘덴서', '병렬 콘덴서'],
    concept: 'pw-pfc',
    brief: '부하와 병렬로 콘덴서를 달아 무효전력을 줄여 역률을 높이는 것.',
    easy: ['모터 같은 부하는 코일이라 뒤지는 무효전력이 필요해. 콘덴서는 반대로 앞서는 무효전력을 만들어서 그걸 상쇄시켜 줘. 그러면 선로 전류가 줄어 손실과 전압강하가 작아져.'],
    formulas: [['Qc = P (tanθ₁ − tanθ₂)  [kVA 또는 kvar]', 'θ₁: 개선 전, θ₂: 개선 후'], ['tanθ = sinθ / cosθ', '']],
    exam: ['역률 0.6 → tan = 4/3, 역률 0.8 → tan = 3/4, 역률 1 → tan = 0.', 'P는 유효전력이라서 역률을 개선해도 변하지 않아.'],
    example: { q: 'P = 1200 kW, 역률 0.6 → 0.8 로 개선하는 콘덴서 용량은?', expr: '1200*(4/3-3/4)', ans: 700, unit: 'kVA', say: 'P(tanθ₁ − tanθ₂).' },
    related: ['power-factor', 'reactive-power', 'loss-power'],
  });

  T('sag', '이도', {
    group: GR,
    aliases: ['경간', '전선의 처짐', '이도(D)'],
    concept: 'pw-sag',
    brief: '전선이 양쪽 지지점 사이에서 늘어져 처지는 깊이 D [m].',
    easy: ['빨랫줄처럼 전선은 자기 무게 때문에 가운데가 처져. 처짐이 너무 크면 땅에 닿고, 너무 작으면 장력이 커서 끊어질 수 있어. 지지점 사이 거리를 경간이라고 해.'],
    formulas: [['D = W S² / (8 T)  [m]', 'W: 전선 단위길이 무게, S: 경간, T: 수평 장력'], ['L = S + 8D² / (3S)', '전선의 실제 길이']],
    exam: ['이도는 경간의 제곱에 비례하고 장력에 반비례해.', '전선 길이와 경간의 차는 8D²/(3S) 이야.'],
    example: { q: 'W = 0.5, S = 300, T = 1500 일 때 이도는?', expr: '0.5*300^2/(8*1500)', ans: 3.75, unit: 'm', say: 'D = WS²/(8T).' },
    related: [],
  });

  T('line-constants', '선로정수', {
    group: GR,
    aliases: ['등가 선간거리', '등가선간거리', '기하학적 평균거리', 'GMD'],
    concept: 'pw-line',
    brief: '송전선의 전기적 성질을 나타내는 값(저항 R, 인덕턴스 L, 정전용량 C, 누설 컨덕턴스 G). 선 배치의 등가 선간거리 D가 L, C에 영향을 준다.',
    easy: ['전선의 배치(선 사이 간격)와 굵기에 따라 L과 C가 달라져. 3선이 일정하지 않게 배치되어 있으면 간격의 "기하평균"으로 대표 거리를 만들어.'],
    formulas: [['D = ∛(D₁ × D₂ × D₃)', '등가 선간거리'], ['L = 0.05 + 0.4605 log₁₀(D / r)  [mH/km]', ''], ['C = 0.02413 / log₁₀(D / r)  [μF/km]', 'r: 전선 반지름']],
    exam: ['D/r이 클수록 L은 커지고 C는 작아져.'],
    example: { q: 'D₁ = 2, D₂ = 4, D₃ = 8 m 일 때 등가 선간거리는?', expr: 'cbrt(2*4*8)', ans: 4, unit: 'm', say: '∛64 = 4.' },
    related: ['inductance', 'capacitance'],
  });

  T('hydro-power', '수력발전', {
    group: GR,
    aliases: ['수력 발전', '수차'],
    concept: 'pw-gen',
    brief: '물의 높이 차(낙차)로 수차를 돌려 발전하는 방식. P = 9.8 Q H η [kW].',
    easy: ['물이 높은 곳에서 떨어질 때의 에너지를 전기로 바꿔. 유량(Q)이 많고 낙차(H)가 클수록 많이 발전해.'],
    formulas: [['P = 9.8 × Q × H × η  [kW]', 'Q: 유량 [m³/s], H: 유효낙차 [m], η: 종합 효율']],
    example: { q: 'Q = 50 m³/s, H = 100 m, η = 0.85 일 때 출력은?', expr: '9.8*50*100*0.85', ans: 41650, unit: 'kW', say: '9.8QHη.' },
    related: ['thermal-power'],
  });

  T('thermal-power', '화력발전', {
    group: GR,
    aliases: ['화력 발전', '열효율'],
    concept: 'pw-gen',
    brief: '연료를 태운 열로 증기를 만들어 터빈을 돌리는 발전. 열효율 η = 860 W / (m H) × 100 [%].',
    easy: ['연료가 가진 열 중 얼마가 전기로 바뀌었는지가 열효율이야. 1 kWh = 860 kcal 라서 발전한 전력량에 860을 곱하면 필요한 열량이 돼.'],
    formulas: [['η = 860 W / (m H) × 100  [%]', 'W: 전력량 [kWh], m: 연료 질량 [kg], H: 발열량 [kcal/kg]']],
    example: { q: 'W = 2000 kWh, m = 430 kg, H = 10000 kcal/kg 일 때 열효율은?', expr: '860*2000/(430*10000)*100', ans: 40, unit: '%', say: '860W/(mH).' },
    related: ['hydro-power', 'energy'],
  });

  T('demand-factor', '수용률', {
    group: GR,
    aliases: ['수용률(%)'],
    concept: 'pw-demand',
    brief: '설치한 설비 용량 중 실제로 동시에 쓰는 최대 수요전력의 비율.',
    easy: ['집에 가전을 다 합치면 10 kW인데 실제로 한꺼번에 쓰는 건 6 kW라면 수용률은 60%야.'],
    formulas: [['수용률 = 최대 수요전력 / 설비용량 × 100  [%]', ''], ['변압기 용량 = Σ(설비용량 × 수용률) / (부등률 × 역률)', '']],
    exam: ['수용률은 100%를 넘을 수 없어(보통 1 이하).'],
    example: { q: '설비용량 1000 kW, 최대수요 750 kW 이면 수용률은?', expr: '750/1000*100', ans: 75, unit: '%', say: '최대수요 ÷ 설비용량.' },
    related: ['diversity-factor', 'load-factor'],
  });

  T('diversity-factor', '부등률', {
    group: GR,
    aliases: ['부등률(≥1)'],
    concept: 'pw-demand',
    brief: '각 수용가의 최대 수요가 같은 시각에 나타나지 않는 정도. 부등률 = 개별 최대수요의 합 ÷ 합성 최대수요 (항상 ≥ 1).',
    easy: ['낮에 바쁜 상점과 밤에 바쁜 식당의 최대 전력은 시간이 달라서, 합쳐 보면 최대 수요가 각자 최대의 합보다 작아. 그 차이를 나타내는 값이야. 부등률이 클수록 변압기를 작게 써도 돼.'],
    formulas: [['부등률 = Σ(개별 최대수요) / 합성 최대수요', '1보다 크거나 같음']],
    related: ['demand-factor', 'load-factor'],
  });

  T('load-factor', '부하율', {
    group: GR,
    aliases: ['부하율(%)'],
    concept: 'pw-demand',
    brief: '일정 기간의 평균 전력이 최대 전력의 몇 %인지. 설비를 얼마나 꾸준히 쓰는지의 척도.',
    easy: ['부하율이 높을수록 전기를 일정하게 쓰는 거라 설비 이용이 효율적이야. 낮으면 순간적으로만 크게 쓴다는 뜻이야.'],
    formulas: [['부하율 = 평균 전력 / 최대 전력 × 100  [%]', ''], ['평균 전력 = 사용 전력량 / 시간', '하루면 전력량 ÷ 24 h']],
    example: { q: '최대전력 1000 kW, 하루 전력량 9600 kWh 이면 부하율은?', expr: '9600/24/1000*100', ans: 40, unit: '%', say: '평균 400 kW ÷ 최대 1000 kW.' },
    related: ['demand-factor', 'diversity-factor', 'energy'],
  });
})(globalThis.GISA);
