// 용어 사전: 제어공학 (라플라스 변환·전달함수)
(function (G) {
  'use strict';
  const T = G.term;
  const GR = '제어공학';

  T('laplace', '라플라스 변환', {
    group: GR,
    aliases: ['라플라스', '라플라스변환', 'L 변환'],
    concept: 'laplace',
    brief: '시간 t의 함수 f(t)를 복소수 s의 함수 F(s)로 바꿔서, 미분·적분 문제를 곱셈·나눗셈으로 풀게 해 주는 도구.',
    easy: ['미분방정식은 풀기 어렵지만 s로 바꾸면 그냥 대수(분수·곱셈) 문제가 돼. 풀고 나서 다시 시간 함수로 되돌리면 돼. 시험에서는 "자주 나오는 변환 표"를 외우는 게 거의 전부야.'],
    formulas: [
      ['L[1] = 1/s  (단위 계단)', ''],
      ['L[t] = 1/s²,   L[tⁿ] = n! / sⁿ⁺¹', '예: L[t³] = 6/s⁴'],
      ['L[e^(−at)] = 1/(s + a)', ''],
      ['L[sin ωt] = ω / (s² + ω²)', ''],
      ['L[cos ωt] = s / (s² + ω²)', ''],
      ['L[df/dt] = sF(s) − f(0)', '미분은 s를 곱하는 것'],
    ],
    exam: ['sin이면 분자가 ω(숫자), cos이면 분자가 s야. 분모는 둘 다 s² + ω².', '상수 K가 앞에 붙으면 변환 결과에도 그대로 K가 곱해져.'],
    pitfalls: ['e^(−at)의 변환은 1/(s + a)야. 부호를 헷갈려서 1/(s − a)로 쓰지 마(지수가 +at일 때만 1/(s − a)).'],
    related: ['initial-final-value', 'transfer-function'],
  });

  T('initial-final-value', '초기값·최종값 정리', {
    group: GR,
    aliases: ['초기값 정리', '최종값 정리', '초기값', '최종값'],
    concept: 'laplace',
    brief: 'F(s)만 알면 f(t)를 구하지 않고도 처음 값 f(0⁺)와 충분히 시간이 지난 뒤의 값 f(∞)를 구하는 방법.',
    easy: ['s는 시간과 반대 방향으로 대응해. s가 아주 크다는 건 "시작하는 순간", s가 0에 가깝다는 건 "아주 먼 미래"를 보는 거야. 그래서 sF(s)에 s → ∞ 또는 s → 0을 넣어.'],
    formulas: [['초기값: f(0⁺) = lim(s→∞) s F(s)', ''], ['최종값: f(∞) = lim(s→0) s F(s)', '']],
    exam: ['s를 곱한 뒤 분모의 s가 약분되면 s = 0을 대입해서 최종값을 구해.', '최종값 정리는 시간이 지나면 값이 한 곳으로 수렴할 때만 쓸 수 있어.'],
    pitfalls: ['sF(s)로 만들기 전에 F(s)에 바로 s를 대입하면 안 돼. 먼저 s를 곱해.'],
    example: { q: 'F(s) = (4s + 16)/{s(s + 2)} 의 최종값은? (sF(s) = (4s+16)/(s+2) 에 s = 0)', expr: '16/2', ans: 8, unit: '', say: 's = 0 대입: 16/2.' },
    related: ['laplace', 'transfer-function'],
  });

  T('transfer-function', '전달함수', {
    group: GR,
    aliases: ['전달 함수', 'G(s)'],
    concept: 'transfer',
    brief: '입력 R(s)과 출력 C(s)의 비 G(s) = C(s)/R(s). 시스템이 신호를 어떻게 바꾸는지를 s의 식으로 나타낸 것.',
    easy: ['회로나 기계를 "블랙박스"로 보고, 넣은 것 대비 나오는 것의 비율을 식 하나로 쓴 거야. 모든 초기 조건은 0이라고 가정해.'],
    formulas: [
      ['G(s) = C(s) / R(s)', ''],
      ['저항 R, 코일 Ls, 콘덴서 1/(Cs)', 'RLC 회로를 s 영역에서 쓰는 법(임피던스)'],
      ['RC 회로, C 양단 출력: 1/(RCs + 1)', '저역통과'],
      ['RC 회로, R 양단 출력: RCs/(RCs + 1)', '고역통과'],
    ],
    exam: ['전압 분배처럼 (출력 쪽 임피던스) ÷ (전체 임피던스)로 구해.'],
    related: ['laplace', 'time-constant', 'feedback', 'standard-form'],
  });

  T('standard-form', '1차 표준형', {
    group: GR,
    aliases: ['표준형', '1차계', '1차 지연 요소'],
    concept: 'transfer',
    brief: 'G(s) = K / (Ts + 1) 꼴. K는 정상상태 이득, T는 시정수.',
    easy: ['분모의 상수항을 1로 맞춰 놓으면 분자가 이득 K, s 앞의 숫자가 시정수 T로 바로 읽혀. 분자·분모를 분모의 상수항으로 나누면 돼.'],
    formulas: [['G(s) = b / (c s + d) = (b/d) / ((c/d) s + 1)', 'K = b/d,  T = c/d']],
    example: { q: 'G(s) = 100/(40s + 10) 의 정상상태 이득 K는?', expr: '100/10', ans: 10, unit: '', say: '분모 상수항 10으로 나눠.' },
    related: ['time-constant', 'transfer-function'],
  });

  T('time-constant', '시정수', {
    group: GR,
    aliases: ['시정수 T', '시정수(τ)'],
    concept: 'transfer',
    brief: '1차 시스템이 최종값의 약 63.2%에 도달하는 데 걸리는 시간. RC 회로는 τ = RC, RL 회로는 τ = L/R.',
    easy: ['"얼마나 빨리 반응하나"를 나타내는 숫자야. 시정수가 작을수록 빨리 따라가고, 클수록 느려. 보통 시정수의 4~5배 시간이 지나면 거의 끝난 걸로 봐.'],
    formulas: [['RC 회로: τ = R C', ''], ['RL 회로: τ = L / R', ''], ['1차 시스템 계단응답: 1 − e^(−t/τ)', 't = τ 에서 1 − e⁻¹ ≈ 0.632']],
    exam: ['G(s) = K/(Ts + 1)에서 T가 시정수야.'],
    related: ['standard-form', 'transfer-function'],
  });

  T('feedback', '되먹임(피드백)', {
    group: GR,
    aliases: ['피드백', '궤환', '부궤환', '폐루프', '되먹임'],
    concept: 'transfer',
    brief: '출력의 일부를 입력 쪽으로 되돌려 보내 제어하는 구조. 부궤환(−)이면 전체 전달함수 = G / (1 + GH).',
    easy: ['에어컨이 현재 온도를 재서 목표와 비교한 뒤 세기를 조절하는 것과 같아. 출력(C)을 H를 거쳐 입력(R)에서 빼 주는 게 부궤환이야.'],
    formulas: [['C / R = G / (1 + G H)', '부(−)궤환'], ['C / R = G / (1 − G H)', '정(+)궤환(참고)']],
    exam: ['H = 1이면 "단위 궤환"이라 C/R = G/(1 + G).', 'GH를 먼저 곱한 뒤 1을 더해서 분모를 만들어.'],
    example: { q: 'G = 10, H = 0.1 인 부궤환의 전체 이득은?', expr: '10/(1+10*0.1)', ans: 5, unit: '', say: 'GH = 1 → 10/(1 + 1).' },
    related: ['transfer-function'],
  });
})(globalThis.GISA);
