// 기초 수학 도구 문제 템플릿
(function (G) {
  'use strict';
  const F = G.fmt;
  const n = F.num;
  const T = G.defineTemplate;
  const ratioLabel = (v) => F.ratio(v) + '배';

  // ───────── 단위와 접두어 ─────────
  const PREFIX = { G: 9, M: 6, k: 3, '': 0, m: -3, μ: -6, n: -9, p: -12 };
  const QTY = [
    { unit: 'Ω', name: '저항', prefixes: ['M', 'k', ''] },
    { unit: 'A', name: '전류', prefixes: ['k', '', 'm', 'μ'] },
    { unit: 'V', name: '전압', prefixes: ['k', '', 'm'] },
    { unit: 'W', name: '전력', prefixes: ['M', 'k', ''] },
    { unit: 'F', name: '정전용량', prefixes: ['', 'm', 'μ', 'n', 'p'] },
    { unit: 'H', name: '인덕턴스', prefixes: ['', 'm', 'μ'] },
  ];
  const pname = { G: '기가', M: '메가', k: '킬로', '': '(접두어 없음)', m: '밀리', μ: '마이크로', n: '나노', p: '피코' };

  T({
    id: 'base-prefix',
    concept: 'base-units',
    gen(r) {
      const Q = r.pick(QTY);
      const from = r.pick(Q.prefixes);
      const to = r.pick(Q.prefixes);
      if (from === to || Math.abs(PREFIX[from] - PREFIX[to]) > 6) return null;
      const v = r.pick([1, 1.5, 2, 2.2, 3.3, 4.7, 5, 10, 25, 47, 100, 250, 500]);
      const diff = PREFIX[from] - PREFIX[to];
      const ans = v * Math.pow(10, diff);
      const u = to + Q.unit;
      const lab = (x) => F.qs(x, u);
      const sup = (k) => '10' + F.sup(k);
      return {
        params: { v, from, to },
        text: Q.name + ' ' + n(v) + ' ' + from + Q.unit + ' → ' + u + ' 단위로 바꾸면?',
        formula: [from, to].map((x) => (x ? pname[x] + '(' + x + ') = ' + sup(PREFIX[x]) : '접두어 없음 = 10⁰')).join(',  '),
        label: lab,
        answer: ans,
        distractors: [
          { v: v * Math.pow(10, -diff), why: '방향을 거꾸로 했어. ' + (diff > 0 ? '큰 단위에서 작은 단위로 가면 숫자가 커져야 해.' : '작은 단위에서 큰 단위로 가면 숫자가 작아져야 해.') },
          { v: v * Math.pow(10, diff - 3), why: '자릿수를 1000배(10³) 덜 옮겼어. 두 접두어 사이는 10' + F.sup(Math.abs(diff)) + '배 차이야.' },
          { v: v * Math.pow(10, diff + 3), why: '자릿수를 1000배(10³) 더 옮겼어. 두 접두어 사이는 10' + F.sup(Math.abs(diff)) + '배 차이야.' },
        ],
        conclusion: n(v) + ' ' + from + Q.unit + ' = ' + n(v) + ' × ' + sup(diff) + ' ' + u + (lab(ans) === n(v) + ' × ' + sup(diff) + ' ' + u ? '' : ' = ' + lab(ans)),
        steps: [
          from + Q.unit + '의 ' + (from ? from + ' = ' + sup(PREFIX[from]) : '접두어 없음 = 10⁰') + ', ' + u + '의 ' + (to ? to + ' = ' + sup(PREFIX[to]) : '접두어 없음 = 10⁰') + '.',
          '차이: 10^(' + PREFIX[from] + ' − (' + PREFIX[to] + ')) = ' + sup(diff) + '.',
          n(v) + ' × ' + sup(diff) + ' = ' + lab(ans) + '.',
        ],
        check: '거꾸로: ' + lab(ans) + ' × ' + sup(-diff) + ' = ' + n(v) + ' ' + from + Q.unit + '. 처음 값으로 돌아와.',
        traps: ['k와 m 사이는 10⁶, μ와 p 사이도 10⁶. 한 칸이 아니라 1000배씩 두 칸이야.'],
      };
    },
  });

  // ───────── 직각삼각형·sin·cos ─────────
  const TRI = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];

  T({
    id: 'base-trig',
    concept: 'base-trig',
    gen(r) {
      const [a0, b0, c] = r.pick(TRI);
      const swap = r.chance(0.5);
      const a = swap ? b0 : a0; // 밑변
      const b = swap ? a0 : b0; // 높이
      const askTan = r.chance(0.4);
      const cos = a / c;
      const sin = b / c;
      const tan = b / a;
      const ans = askTan ? tan : sin;
      return {
        params: { a, b, c, ask: askTan ? 'tan' : 'sin' },
        text: '직각삼각형에서 cosθ = ' + a + '/' + c + '일 때 ' + (askTan ? 'tanθ' : 'sinθ') + '는? (θ는 0°~90°)',
        formula: 'sinθ = √(1 − cos²θ),  tanθ = sinθ / cosθ',
        unit: '',
        decimals: 4,
        answer: ans,
        distractors: [
          { v: 1 - cos, why: 'sinθ = 1 − cosθ로 착각했어. cos²θ + sin²θ = 1이라서 제곱으로 따져야 해.' },
          { v: askTan ? a / b : cos, why: askTan ? 'tan을 뒤집었어(밑변/높이). tan = 높이/밑변.' : 'cos 값을 그대로 썼어.' },
          { v: c / a, why: 'cos을 뒤집었어(빗변/밑변). 그건 1/cosθ야.' },
          { v: askTan ? sin : tan, why: askTan ? 'sin을 구하고 멈췄어. tan = sin/cos.' : 'tan(높이/밑변)을 구했어. sin은 높이/빗변.' },
        ],
        conclusion: '밑변 ' + a + ', 빗변 ' + c + ' → 높이 √(' + c + '² − ' + a + '²) = ' + b + ' → ' + (askTan ? 'tanθ = ' + b + '/' + a + ' = ' : 'sinθ = ' + b + '/' + c + ' = ') + n(ans, 4),
        steps: [
          'cosθ = 밑변/빗변이니까 밑변 ' + a + ', 빗변 ' + c + '인 직각삼각형을 그려.',
          '피타고라스: 높이 = √(' + c * c + ' − ' + a * a + ') = √' + b * b + ' = ' + b + '.',
          askTan ? 'tanθ = 높이/밑변 = ' + b + '/' + a + ' = ' + n(tan, 4) + '.' : 'sinθ = 높이/빗변 = ' + b + '/' + c + ' = ' + n(sin, 4) + '.',
        ],
        check: 'cos² + sin² = (' + a + '/' + c + ')² + (' + b + '/' + c + ')² = (' + a * a + ' + ' + b * b + ')/' + c * c + ' = 1. 맞아.',
        traps: ['역률 cosθ가 주어지면 sinθ를 이렇게 구해. 전기기사에서 제일 자주 쓰는 계산이야.'],
      };
    },
  });

  T({
    id: 'base-pythag',
    concept: 'base-trig',
    gen(r) {
      const [a0, b0, c0] = r.pick(TRI);
      const k = r.pick([1, 2, 3, 10]);
      const [a, b, c] = [a0 * k, b0 * k, c0 * k];
      const askHyp = r.chance(0.6);
      if (askHyp) {
        return {
          params: { a, b, ask: 'c' },
          text: '직각을 끼고 있는 두 변의 길이가 ' + n(a) + ', ' + n(b) + '인 직각삼각형의 빗변 길이는?',
          formula: '빗변 = √(밑변² + 높이²)',
          unit: '',
          answer: c,
          distractors: [
            { v: a + b, why: '두 변을 그냥 더했어. 빗변은 두 변의 합보다 항상 짧아.' },
            { v: a * a + b * b, why: '제곱을 더한 뒤 √를 씌우지 않았어.' },
            { v: Math.sqrt(Math.abs(b * b - a * a)), why: '제곱끼리 뺐어. 빗변은 제곱을 "더해서" 구해.' },
          ],
          conclusion: '√(' + n(a) + '² + ' + n(b) + '²) = √' + n(c * c) + ' = ' + n(c),
          steps: [n(a) + '² = ' + n(a * a) + ', ' + n(b) + '² = ' + n(b * b) + '.', '더하면 ' + n(c * c) + '.', '√' + n(c * c) + ' = ' + n(c) + '.'],
          check: n(c) + ' × ' + n(c) + ' = ' + n(c * c) + '. 맞아.',
          traps: ['임피던스 Z = √(R² + X²), 피상전력 S = √(P² + Q²) 모두 이 계산이야.'],
        };
      }
      return {
        params: { a, c, ask: 'b' },
        text: '빗변이 ' + n(c) + ', 한 변이 ' + n(a) + '인 직각삼각형의 나머지 한 변은?',
        formula: '나머지 변 = √(빗변² − 한 변²)',
        unit: '',
        answer: b,
        distractors: [
          { v: c - a, why: '길이를 그냥 뺐어. 제곱끼리 빼고 √를 씌워야 해.' },
          { v: Math.sqrt(c * c + a * a), why: '제곱을 더했어. 빗변을 알 땐 빼야 해.' },
          { v: c * c - a * a, why: '√를 씌우지 않았어.' },
        ],
        conclusion: '√(' + n(c) + '² − ' + n(a) + '²) = √' + n(b * b) + ' = ' + n(b),
        steps: [n(c) + '² − ' + n(a) + '² = ' + n(c * c) + ' − ' + n(a * a) + ' = ' + n(b * b) + '.', '√' + n(b * b) + ' = ' + n(b) + '.'],
        check: n(a) + '² + ' + n(b) + '² = ' + n(a * a + b * b) + ' = ' + n(c) + '². 맞아.',
        traps: ['피상전력과 유효전력을 알 때 무효전력 Q = √(S² − P²)를 이렇게 구해.'],
      };
    },
  });

  // ───────── 비례·반비례 ─────────
  T({
    id: 'base-ratio',
    concept: 'base-ratio',
    gen(r) {
      const pa = r.pick([1, 2]);
      const pb = r.pick([1, 2]);
      const m = r.pick([2, 3, 4]);
      const k = r.pick([1, 2, 3]);
      const ans = Math.pow(m, pa) / Math.pow(k, pb);
      const exp = (p) => (p === 2 ? '²' : '');
      const formula = 'A = B' + exp(pa) + ' / C' + exp(pb);
      return {
        params: { pa, pb, m, k },
        text: formula + ' 관계에서 B를 ' + m + '배' + (k === 1 ? '로 하고 C는 그대로 두면' : ', C를 ' + k + '배로 하면') + ' A는 처음의 몇 배가 될까?',
        formula: 'B가 m배, C가 n배 → A는 m' + exp(pa) + ' / n' + exp(pb) + '배',
        unit: '배',
        label: ratioLabel,
        answer: ans,
        distractors: [
          { v: m / k, why: '제곱을 무시했어. 제곱이 붙은 값은 배수도 제곱으로 들어가.' },
          { v: Math.pow(m, pa) * Math.pow(k, pb), why: 'C가 분모에 있는 걸 놓쳤어. 분모가 커지면 A는 작아져.' },
          { v: Math.pow(k, pb) / Math.pow(m, pa), why: '분자와 분모를 뒤집었어.' },
          { v: Math.pow(m / k, 2), why: '둘 다 제곱으로 처리했어. 공식에 제곱이 붙은 값만 제곱해.' },
        ],
        conclusion: 'B' + exp(pa) + ' → ' + m + exp(pa) + ' = ' + Math.pow(m, pa) + '배, C' + exp(pb) + ' → ' + k + exp(pb) + ' = ' + Math.pow(k, pb) + '배 → A는 ' + ratioLabel(ans),
        steps: [
          '분자 B' + exp(pa) + ': B가 ' + m + '배 → ' + Math.pow(m, pa) + '배.',
          '분모 C' + exp(pb) + ': C가 ' + k + '배 → ' + Math.pow(k, pb) + '배.',
          'A = 분자 배수 ÷ 분모 배수 = ' + Math.pow(m, pa) + ' ÷ ' + Math.pow(k, pb) + ' = ' + ratioLabel(ans) + '.',
        ],
        check: '숫자로: 처음 B = C = 1 → A = 1. 바꾼 뒤 B = ' + m + ', C = ' + k + ' → A = ' + Math.pow(m, pa) + '/' + Math.pow(k, pb) + ' = ' + F.ratio(ans) + '.',
        traps: ['전력 P = V²/R, 쿨롱 힘 F ∝ Q₁Q₂/r², 선로 손실 ∝ 1/V². 이 문제 모양이 과목마다 계속 나와.'],
      };
    },
  });

  G.defineStatic({
    id: 'st-base-ampere',
    concepts: ['base-units'],
    text: '1 A(암페어)의 뜻으로 옳은 것은?',
    choices: [
      { label: '1초 동안 1 C의 전하가 지나가는 전류', why: '정답이야. 전류는 "1초당 지나가는 전하량"이라 1 A = 1 C/s.' },
      { label: '1 V의 전압이 걸린 상태', why: '전압은 전류와 다른 양이야. 전압은 전기를 미는 힘이야.' },
      { label: '1초 동안 1 J의 에너지를 쓰는 것', why: '그건 1 W(와트), 전력의 정의야.' },
      { label: '1 Ω의 저항에 저장된 전하량', why: '저항은 전하를 저장하지 않아. 전하를 저장하는 건 콘덴서야.' },
    ],
    answer: 0,
    formula: 'I = Q/t  (1 A = 1 C/s)',
    conclusion: '1 A는 1초에 1 C(쿨롬)의 전하가 지나가는 전류야.',
    steps: ['전하는 전기의 "양"이고 단위는 C(쿨롬)이야.', '전류는 그 전하가 얼마나 빨리 지나가는지, 즉 1초당 지나가는 양이야.', '그래서 I = Q/t, 1 A = 1 C ÷ 1 s.'],
    check: '2 A가 3초 동안 흐르면 지나간 전하는 2 × 3 = 6 C. 정의대로 계산돼.',
    traps: ['1 W = 1 J/s(전력), 1 A = 1 C/s(전류). 둘 다 "1초당"이라 헷갈리기 쉬워.'],
  });
})(globalThis.GISA);
