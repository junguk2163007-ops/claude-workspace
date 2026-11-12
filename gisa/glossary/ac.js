// 용어 사전: 교류 회로 (교류 기초·RLC·교류 전력·공진·3상 결선)
(function (G) {
  'use strict';
  const T = G.term;
  const GR = '교류회로';

  T('ac-dc', '교류와 직류', {
    group: GR,
    aliases: ['교류', '직류', 'AC', 'DC'],
    concept: 'ac-basics',
    brief: '직류(DC)는 방향·크기가 일정한 전기, 교류(AC)는 시간에 따라 방향과 크기가 주기적으로 바뀌는 전기.',
    easy: ['건전지는 직류야. 콘센트에서 나오는 전기는 교류인데, 한국은 1초에 60번 방향이 바뀌어(60 Hz). 교류는 변압기로 전압을 쉽게 바꿀 수 있어서 송전에 쓰여.'],
    formulas: [['v = Vm sin(ωt + θ)', '정현파 교류 전압의 순간값']],
    exam: ['교류에서 "전압 220 V"라고 하면 보통 실효값이야.', '교류 회로에서는 저항 R 말고도 코일·콘덴서 때문에 임피던스 Z가 생겨.'],
    related: ['frequency', 'rms-value', 'impedance'],
  });

  T('frequency', '주파수와 주기', {
    group: GR,
    aliases: ['주파수', '주기', '주파수(f)'],
    concept: 'ac-basics',
    brief: '주파수 f는 1초에 반복되는 횟수(Hz), 주기 T는 한 번 반복하는 데 걸리는 시간(s). 서로 역수.',
    easy: ['그네가 1초에 몇 번 왕복하는지가 주파수, 한 번 왕복하는 데 걸리는 시간이 주기야.'],
    formulas: [['T = 1 / f,   f = 1 / T', ''], ['ω = 2π f', '각주파수와의 관계']],
    units: [['Hz', '헤르츠 (1/초)'], ['ms', '밀리초 = 10⁻³ s']],
    exam: ['60 Hz의 주기는 1/60 s ≈ 16.7 ms, 50 Hz는 20 ms.', 'ms를 s로 바꾸는 단위 변환을 빠뜨리지 마.'],
    example: { q: '125 Hz의 주기는 몇 ms?', expr: '1/125*1000', ans: 8, unit: 'ms', say: 'T = 1/f = 0.008 s = 8 ms.' },
    related: ['angular-frequency', 'ac-dc'],
  });

  T('angular-frequency', '각주파수', {
    group: GR,
    aliases: ['각속도', 'ω'],
    concept: 'ac-basics',
    brief: '교류가 1초에 몇 rad만큼 돌아가는지를 나타내는 값. ω = 2πf, 단위 rad/s.',
    easy: ['교류는 원 위를 도는 점의 높이로 그릴 수 있어. 한 바퀴가 2π rad이니까 1초에 f바퀴 돌면 ω = 2πf 야. sin(ωt)에서 t 앞에 붙은 숫자가 바로 이 ω야.'],
    formulas: [['ω = 2π f', ''], ['f = ω / (2π)', 'sin(377t)이면 f = 377/(2π) = 60 Hz']],
    exam: ['v = Vm sin(120πt)처럼 주어지면 ω = 120π → f = 60 Hz.', 'XL = ωL, XC = 1/(ωC) 계산에 ω가 바로 들어가.'],
    example: { q: 'v = 100 sin(400πt)의 주파수는?', expr: '400*pi/(2*pi)', ans: 200, unit: 'Hz', say: 'f = ω/(2π).' },
    related: ['frequency', 'reactance', 'phase'],
  });

  T('phase', '위상', {
    group: GR,
    aliases: ['위상차', '위상각'],
    concept: 'ac-basics',
    brief: '교류 파형이 기준보다 얼마나 앞서거나 뒤처졌는지를 각도로 나타낸 것.',
    easy: ['달리기에서 한 사람이 다른 사람보다 몇 걸음 앞서 있는지를 각도로 말하는 거야. 전압과 전류의 위상차가 클수록 역률(cosθ)이 나빠져.'],
    formulas: [['v = Vm sin(ωt + θ)', 'θ가 위상']],
    exam: ['코일(L)에서는 전류가 전압보다 90° 뒤지고, 콘덴서(C)에서는 전류가 전압보다 90° 앞서. 저항은 위상차가 없어.', '3상은 각 상이 120°씩 위상차가 나.'],
    related: ['reactance', 'power-factor', 'three-phase'],
  });

  T('peak-value', '최댓값', {
    group: GR,
    aliases: ['최대값', '순시 최댓값', '진폭'],
    concept: 'ac-basics',
    brief: '교류 파형이 가장 크게 올라갔을 때의 값(Vm, Im).',
    easy: ['사인파의 맨 꼭대기 높이야. 그런데 교류의 "크기"는 보통 이 최댓값이 아니라 같은 열을 내는 직류 값인 실효값으로 말해.'],
    formulas: [['Vm = √2 × V(실효값)', ''], ['v = Vm sin(ωt)', '']],
    exam: ['v = 100√2 sin ωt 이면 최댓값은 100√2, 실효값은 100 V 야.'],
    related: ['rms-value', 'average-value'],
  });

  T('rms-value', '실효값', {
    group: GR,
    aliases: ['실효 값', 'RMS', '실효전압', '실효전류'],
    concept: 'ac-basics',
    brief: '같은 저항에서 같은 열을 내는 직류의 크기. 정현파의 실효값 = 최댓값 ÷ √2.',
    easy: ['교류는 계속 크기가 바뀌니까 "평균 크기"를 하나로 정해야 편해. 저항에서 열이 나는 정도가 같은 직류 값으로 정한 게 실효값이야. 콘센트의 220 V가 바로 이거야.'],
    formulas: [['V = Vm / √2 ≈ 0.707 Vm', '정현파'], ['Vm = √2 V ≈ 1.414 V', '']],
    exam: ['"√2 sin"이 붙은 식은 √2 앞의 숫자가 실효값이야. 예: 100√2 sin ωt → 100 V.', '전압계·전류계가 가리키는 값은 보통 실효값이야.'],
    pitfalls: ['평균값(2Vm/π)과 섞지 마. 평균값은 반주기 기준이고 실효값과는 다른 값이야.'],
    example: { q: 'v = 100√2 sin ωt 의 실효값은?', expr: '100*sqrt(2)/sqrt(2)', ans: 100, unit: 'V', say: '최댓값 ÷ √2.' },
    related: ['peak-value', 'average-value', 'ac-dc'],
  });

  T('average-value', '평균값', {
    group: GR,
    aliases: ['평균 값'],
    concept: 'ac-basics',
    brief: '정현파 반주기 동안의 평균. 평균값 = 2 × 최댓값 ÷ π ≈ 0.637 × 최댓값.',
    easy: ['사인파 전체를 평균하면 +와 −가 상쇄돼 0이 돼. 그래서 평균값은 + 쪽 반주기만 평균한 값으로 정의해. 정류 회로의 직류 출력(평균값)을 구할 때 이 값이 쓰여.'],
    formulas: [['Vav = 2 Vm / π ≈ 0.637 Vm', '정현파 반주기']],
    exam: ['정류회로의 출력 전압(직류 평균값) 계수와 연결돼: 단상 전파 정류의 평균값은 0.9 × 실효값.'],
    example: { q: '최댓값 100 V 정현파의 평균값은?', expr: '2*100/pi', ans: 63.66197723675813, unit: 'V', say: '2Vm/π.' },
    related: ['rms-value', 'rectifier'],
  });

  T('reactance', '리액턴스', {
    group: GR,
    aliases: ['리액턴스(X)'],
    concept: 'rlc',
    brief: '코일(L)이나 콘덴서(C)가 교류의 흐름을 방해하는 정도. 단위는 Ω. 전력은 소비하지 않는다.',
    easy: ['저항처럼 전류를 방해하지만, 에너지를 열로 버리지 않고 자기장·전기장에 저장했다가 되돌려 줘. 그래서 전압과 전류의 타이밍(위상)이 90° 어긋나.'],
    formulas: [['XL = ωL = 2πfL', '유도 리액턴스'], ['XC = 1 / (ωC)', '용량 리액턴스']],
    exam: ['주파수가 높아지면 XL은 커지고 XC는 작아져.'],
    pitfalls: ['XL과 XC는 서로 반대 성질이라 직렬에서는 (XL − XC)로 빼서 합쳐.'],
    related: ['inductive-reactance', 'capacitive-reactance', 'impedance'],
  });

  T('inductive-reactance', '유도 리액턴스', {
    group: GR,
    aliases: ['XL', '유도성 리액턴스'],
    concept: 'rlc',
    brief: '코일의 리액턴스 XL = ωL = 2πfL. 주파수가 높을수록 커진다.',
    easy: ['코일은 전류가 변하는 걸 싫어해서, 빨리 변하는(주파수 높은) 교류일수록 더 크게 막아. 직류(주파수 0)에서는 XL = 0이라 그냥 도선처럼 보여.'],
    formulas: [['XL = ωL = 2π f L', 'L은 인덕턴스 [H]']],
    exam: ['L이 mH로 주어지면 ÷1000 해서 H로 바꾸고 계산해.', '코일에서는 전류가 전압보다 90° 뒤져(지상).'],
    example: { q: 'ω = 250 rad/s, L = 200 mH 일 때 XL은?', expr: '250*200/1000', ans: 50, unit: 'Ω', say: 'XL = ωL.' },
    related: ['reactance', 'capacitive-reactance', 'inductance'],
  });

  T('capacitive-reactance', '용량 리액턴스', {
    group: GR,
    aliases: ['XC', '용량성 리액턴스'],
    concept: 'rlc',
    brief: '콘덴서의 리액턴스 XC = 1/(ωC). 주파수가 높을수록 작아진다.',
    easy: ['콘덴서는 직류는 막고(XC가 무한대) 주파수가 높은 교류는 잘 통과시켜. 그래서 주파수가 올라가면 XC는 작아져.'],
    formulas: [['XC = 1 / (ωC) = 1 / (2π f C)', 'C는 정전용량 [F]']],
    exam: ['C가 μF로 주어지면 ×10⁻⁶ 해서 F로 바꿔. 단위 변환 실수가 가장 흔해.', '콘덴서에서는 전류가 전압보다 90° 앞서(진상).'],
    example: { q: 'ω = 250 rad/s, C = 50 μF 일 때 XC는?', expr: '1/(250*50/1000000)', ans: 80, unit: 'Ω', say: 'XC = 1/(ωC).' },
    related: ['reactance', 'inductive-reactance', 'capacitance'],
  });

  T('impedance', '임피던스', {
    group: GR,
    aliases: ['Z', '교류 저항'],
    concept: 'rlc',
    brief: '교류 회로 전체가 전류를 방해하는 정도(R과 리액턴스를 합친 값). 단위 Ω.',
    easy: ['교류 회로의 "전체 저항"이야. R과 X는 방향이 90° 달라서 단순히 더하지 않고, 직각삼각형의 두 변처럼 피타고라스로 합쳐.'],
    formulas: [['Z = √(R² + X²)', 'R-L 직렬'], ['Z = √(R² + (XL − XC)²)', 'R-L-C 직렬'], ['I = V / Z', '교류 옴의 법칙']],
    exam: ['교류의 "옴의 법칙"은 I = V/Z 야. 이때 V, I는 실효값.', 'XL과 XC는 먼저 빼서 (XL − XC)로 만든 뒤 제곱해.', '(R, X, Z)가 (3, 4, 5), (6, 8, 10), (5, 12, 13)이면 계산기 없이 풀려.'],
    pitfalls: ['Z = R + XL + XC 처럼 그냥 더하면 틀려. 반드시 피타고라스(제곱의 합의 제곱근)로 합쳐.'],
    example: { q: 'R = 12 Ω, XL = 41 Ω, XC = 25 Ω 인 직렬회로의 Z는?', expr: 'sqrt(12^2+(41-25)^2)', ans: 20, unit: 'Ω', say: 'XL − XC = 16 → √(144 + 256) = 20.' },
    related: ['reactance', 'pythagoras', 'power-factor', 'resonance'],
  });

  T('power-factor', '역률', {
    group: GR,
    aliases: ['cosθ', '역률(cosθ)', '역율'],
    concept: 'ac-power',
    brief: '공급한 전력(피상전력) 중 실제로 일하는 전력(유효전력)의 비율. 역률 = cosθ = P/S.',
    easy: ['전기를 100 보냈는데 그중 얼마나 진짜 일(열, 회전)을 하는지의 비율이야. 나머지는 코일·콘덴서가 주고받기만 하는 무효분이라 선로만 힘들게 해. 역률이 1에 가까울수록 좋아.'],
    formulas: [['cosθ = P / S = R / Z', ''], ['P = V I cosθ', '유효전력']],
    exam: ['R-L 직렬의 역률은 저항/임피던스(R/Z). 예: R = 24, X = 18, Z = 30 → 0.8.', '역률이 낮으면 같은 전력을 보내는데 전류가 많이 흘러 선로 손실과 전압강하가 커져. 그래서 역률 개선을 해.'],
    pitfalls: ['"지상 역률 0.8"은 코일(모터) 때문에 전류가 뒤지는 경우야. 진상은 콘덴서 때문에 전류가 앞서는 경우.'],
    example: { q: 'R = 24 Ω, X = 18 Ω 인 R-L 직렬회로의 역률은?', expr: '24/sqrt(24^2+18^2)', ans: 0.8, unit: '', say: 'cosθ = R/Z = 24/30.' },
    related: ['active-power', 'apparent-power', 'power-triangle', 'pf-correction'],
  });

  T('active-power', '유효전력', {
    group: GR,
    aliases: ['유효 전력'],
    concept: 'ac-power',
    brief: '실제로 일(열, 회전)로 바뀌는 전력 P = VI cosθ. 단위 W.',
    easy: ['저항에서 소비되는 진짜 전력이야. 전기요금으로 계산되는 것도 이 유효전력의 시간 누적(kWh)이야.'],
    formulas: [['P = V I cosθ', '단상'], ['P = √3 V I cosθ', '3상'], ['P = I² R', '']],
    units: [['W', '와트'], ['kW', '킬로와트']],
    related: ['reactive-power', 'apparent-power', 'power-factor', 'power'],
  });

  T('reactive-power', '무효전력', {
    group: GR,
    aliases: ['무효 전력', 'var'],
    concept: 'ac-power',
    brief: '코일·콘덴서가 전원과 주고받기만 하고 일은 하지 않는 전력 Q = VI sinθ. 단위 var.',
    easy: ['에너지를 소비하지는 않지만 선로에 전류를 흘리게 하는 "왕복 전력"이야. 모터 같은 코일 부하는 자기장을 만들려고 이 무효전력이 필요해.'],
    formulas: [['Q = V I sinθ', '단상'], ['Q = √3 V I sinθ', '3상'], ['sinθ = √(1 − cos²θ)', '역률로 sinθ 구하기']],
    units: [['var', '바 (무효전력)'], ['kvar', '킬로바']],
    exam: ['역률 0.8이면 sinθ = 0.6 → 무효전력 = 피상전력 × 0.6.', '역률 개선은 이 무효전력을 콘덴서로 상쇄시키는 거야.'],
    example: { q: '220 V, 25 A, 역률 0.8 (지상) 부하의 무효전력은?', expr: '220*25*sqrt(1-0.8^2)', ans: 3300, unit: 'var', say: 'Q = VI sinθ, sinθ = 0.6.' },
    related: ['active-power', 'apparent-power', 'power-triangle', 'pf-correction'],
  });

  T('apparent-power', '피상전력', {
    group: GR,
    aliases: ['피상 전력', 'VA'],
    concept: 'ac-power',
    brief: '전압 × 전류로 구한 겉보기 전력 S = VI. 단위 VA. 변압기·발전기 용량의 기준.',
    easy: ['일을 하든 안 하든 전원이 감당해야 하는 전체 크기야. 변압기 용량이 kVA로 표시되는 이유가 이거야.'],
    formulas: [['S = V I', '단상'], ['S = √3 V I', '3상'], ['S = √(P² + Q²)', '전력 삼각형']],
    units: [['VA', '볼트암페어'], ['kVA', '킬로볼트암페어']],
    related: ['active-power', 'reactive-power', 'power-triangle'],
  });

  T('power-triangle', '전력 삼각형', {
    group: GR,
    aliases: ['전력삼각형'],
    concept: 'ac-power',
    brief: '유효전력 P(밑변), 무효전력 Q(높이), 피상전력 S(빗변)가 이루는 직각삼각형.',
    easy: ['P, Q, S의 관계를 한 장에 그린 그림이야. 피타고라스를 그대로 쓸 수 있고, 밑변과 빗변 사이의 각 θ가 역률각이야.'],
    formulas: [['S² = P² + Q²', ''], ['cosθ = P / S,  sinθ = Q / S,  tanθ = Q / P', '']],
    exam: ['P, Q 중 둘을 알면 S를 구할 수 있어. (P, Q, S) = (3, 4, 5)꼴이 자주 나와.'],
    example: { q: 'P = 15 kW, Q = 20 kvar 일 때 S는?', expr: 'sqrt(15^2+20^2)', ans: 25, unit: 'kVA', say: '225 + 400 = 625 → √625.' },
    related: ['pythagoras', 'active-power', 'reactive-power', 'apparent-power'],
  });

  T('resonance', '직렬 공진', {
    group: GR,
    aliases: ['공진', '직렬공진', '공진주파수', '공진 주파수'],
    concept: 'resonance',
    brief: 'XL = XC가 되어 리액턴스가 서로 상쇄되는 상태. 임피던스가 최소(Z = R), 전류가 최대가 된다.',
    easy: ['그네를 밀 때 타이밍이 딱 맞으면 크게 흔들리는 것처럼, 특정 주파수에서 코일과 콘덴서의 방해가 서로 지워져. 그러면 저항만 남아서 전류가 가장 많이 흘러.'],
    formulas: [['ω₀ = 1 / √(LC)', '공진 각주파수'], ['f₀ = 1 / (2π√(LC))', '공진 주파수'], ['공진 시: Z = R,  I = V / R,  역률 = 1', '']],
    exam: ['공진 때는 전압과 전류가 같은 위상(역률 1)이야.', 'L이나 C를 키우면 공진 주파수는 낮아져: f₀ ∝ 1/√(LC).'],
    pitfalls: ['L(mH)·C(μF)를 H, F로 바꾸지 않고 넣으면 100만 배 차이가 나. 단위부터 정리해.'],
    example: { q: 'L = 40 mH, C = 2500 μF 일 때 공진 각주파수는?', expr: '1/sqrt(40/1000*2500/1000000)', ans: 100, unit: 'rad/s', say: 'LC = 10⁻⁴ → √ = 0.01 → 1/0.01.' },
    related: ['q-factor', 'impedance', 'inductance', 'capacitance'],
  });

  T('q-factor', '선택도 Q', {
    group: GR,
    aliases: ['선택도', '첨예도', 'Q값', 'Q 값'],
    concept: 'resonance',
    brief: '공진 회로가 특정 주파수를 얼마나 뾰족하게 골라내는지의 척도. 직렬 Q = (1/R)√(L/C).',
    easy: ['라디오가 방송국을 골라 잡는 능력과 같아. Q가 클수록 원하는 주파수만 날카롭게 선택해. 저항이 작을수록 Q가 커져.'],
    formulas: [['Q = ω₀ L / R = (1 / R) √(L / C)', '직렬 공진']],
    example: { q: 'R = 10 Ω, L = 25 mH, C = 0.1 μF 일 때 Q는?', expr: '1/10*sqrt((25/1000)/(0.1/1000000))', ans: 50, unit: '', say: '√(L/C) = 500 → ÷ 10.' },
    related: ['resonance', 'reactance'],
  });

  T('line-voltage', '선간전압과 상전압', {
    group: GR,
    aliases: ['선간전압', '상전압', '선전류', '상전류', '선간 전압', '선 전류'],
    concept: 'y-delta',
    brief: '선간전압·선전류는 전선(선) 사이/속에서 재는 값, 상전압·상전류는 부하 한 개(한 상)에 걸리는 값.',
    easy: ['3상 부하는 3개의 덩어리(상)로 이루어져 있어. 부하 덩어리 하나에 걸리는 전압이 상전압, 바깥 전선 두 가닥 사이의 전압이 선간전압이야. 결선(Y/Δ)에 따라 둘의 관계가 달라져.'],
    formulas: [['Y결선: VL = √3 Vp,  IL = Ip', ''], ['Δ결선: VL = Vp,  IL = √3 Ip', '']],
    exam: ['문제에서 "전압 380 V"처럼 그냥 말하면 선간전압이야.'],
    related: ['y-connection', 'delta-connection', 'three-phase'],
  });

  T('y-connection', 'Y결선', {
    group: GR,
    aliases: ['Y 결선', '성형 결선', 'Y결선(스타)', '스타결선'],
    concept: 'y-delta',
    brief: '3상 부하의 한쪽 끝을 한 점(중성점)에 모으는 결선. VL = √3 Vp, IL = Ip.',
    easy: ['알파벳 Y처럼 세 부하의 한 끝이 가운데 점에서 만나. 전선 두 가닥 사이에는 부하 두 개가 직렬로 걸려 있지만 위상이 120° 달라서 전압이 2배가 아니라 √3배가 돼.'],
    formulas: [['VL = √3 Vp', '선간전압이 상전압의 √3배'], ['IL = Ip', '선전류 = 상전류'], ['ZY = ZΔ / 3', 'Δ → Y 변환(평형)']],
    exam: ['선간전압 VL이 주어지면 상전압은 VL/√3 이야. 상전류 = 상전압/Z.'],
    example: { q: 'Y결선에서 상전압 110 V 이면 선간전압은?', expr: 'sqrt(3)*110', ans: 190.5255888325765, unit: 'V', say: 'VL = √3 Vp.' },
    related: ['delta-connection', 'line-voltage', 'three-phase'],
  });

  T('delta-connection', 'Δ결선', {
    group: GR,
    aliases: ['델타결선', 'Δ 결선', '델타 결선', '△결선', '환상 결선'],
    concept: 'y-delta',
    brief: '3상 부하를 삼각형 모양으로 이어 각 상에 선간전압이 그대로 걸리는 결선. VL = Vp, IL = √3 Ip.',
    easy: ['부하 세 개가 삼각형 변을 이루고, 꼭짓점에 전선이 달려. 각 상이 전선 두 가닥 사이에 직접 걸려서 상전압이 선간전압과 같아. 전선으로 흐르는 전류는 두 상의 전류가 합쳐진 거라 √3배야.'],
    formulas: [['VL = Vp', ''], ['IL = √3 Ip', '선전류가 상전류의 √3배'], ['ZΔ = 3 ZY', 'Y → Δ 변환(평형)']],
    exam: ['Δ결선 부하: 상전류 Ip = VL/Z, 선전류 IL = √3 Ip.'],
    example: { q: '선간전압 200 V, 상 임피던스 40 Ω 인 Δ결선의 선전류는?', expr: 'sqrt(3)*200/40', ans: 8.660254037844386, unit: 'A', say: 'Ip = 200/40 = 5 A → IL = √3 × 5.' },
    related: ['y-connection', 'line-voltage', 'three-phase'],
  });
})(globalThis.GISA);
