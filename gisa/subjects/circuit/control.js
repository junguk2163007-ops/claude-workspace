// 제어공학 기초: 라플라스 변환, 전달함수
(function (G) {
  'use strict';
  const F = G.fmt;
  const n = F.num;
  const T = G.defineTemplate;
  const sup = F.sup;
  const ck = F.coefStr;

  const fact = (k) => (k <= 1 ? 1 : k * fact(k - 1));
  const den = (coef, c) => F.linear(coef, c); // "0.5s + 1"

  // c / sᵉ
  function powS(c, e) {
    return { label: n(c, 4) + '/s' + (e === 1 ? '' : sup(e)), fn: (s) => c / Math.pow(s, e) };
  }

  // ───────── 라플라스 변환 ─────────
  T({
    id: 'lp-power',
    concept: 'laplace',
    gen(r) {
      const k = r.pick([2, 3]);
      const K = r.pick([1, 2, 3, 4, 5]);
      const ans = powS(K * fact(k), k + 1);
      return {
        params: { K, k },
        kind: 'expr',
        text: 'f(t) = ' + ck(K) + 't' + sup(k) + '의 라플라스 변환 F(s)는?',
        formula: 'tⁿ → n!/sⁿ⁺¹',
        answer: ans,
        distractors: [
          Object.assign(powS(K, k + 1), { why: 'n!(' + k + '! = ' + fact(k) + ')을 빠뜨렸어.' }),
          Object.assign(powS(K * fact(k), k), { why: 's의 지수를 n으로 썼어. tⁿ은 sⁿ⁺¹이야(t → 1/s²처럼 하나 더 커져).' }),
          Object.assign(powS(K * fact(k + 1), k + 1), { why: 'n! 대신 (n+1)!을 곱했어. 분자는 n!이고, n+1은 s의 지수에만 붙어.' }),
        ],
        conclusion: ck(K) + 't' + sup(k) + ' → ' + (K === 1 ? '' : n(K) + ' × ') + k + '!/s' + sup(k + 1) + ' = ' + ans.label,
        steps: [
          '변환표: tⁿ → n!/sⁿ⁺¹. 상수배(' + n(K) + ')는 그대로 앞에 남아(선형성).',
          'n = ' + k + ' → ' + k + '! = ' + fact(k) + ', s의 지수 = ' + (k + 1) + '.',
          'F(s) = ' + n(K) + ' × ' + fact(k) + '/s' + sup(k + 1) + ' = ' + ans.label + '.',
        ],
        check: '패턴 확인: 1 → 1/s, t → 1/s², t² → 2/s³, t³ → 6/s⁴. 지수가 하나씩, 분자가 n!씩 커져.',
        traps: ['tⁿ의 변환에서 "지수 + 1"과 "n!" 두 가지를 모두 챙겨야 해.'],
      };
    },
  });

  T({
    id: 'lp-exp',
    concept: 'laplace',
    gen(r) {
      const K = r.pick([1, 2, 3, 4, 5, 10]);
      const a = r.pick([1, 2, 3, 4, 5, 6]);
      const label = n(K) + '/(s + ' + a + ')';
      return {
        params: { K, a },
        kind: 'expr',
        text: 'f(t) = ' + ck(K) + 'e^(−' + (a === 1 ? '' : a) + 't)의 라플라스 변환 F(s)는?',
        formula: 'e^(−at) → 1/(s + a)',
        answer: { label, fn: (s) => K / (s + a) },
        distractors: [
          { label: n(K) + '/(s − ' + a + ')', fn: (s) => K / (s - a), why: '부호를 반대로 했어. e^(−at)의 마이너스가 분모에선 +a가 돼.' },
          { label: n(K) + '/(s + ' + a + ')²', fn: (s) => K / ((s + a) * (s + a)), why: '제곱은 t·e^(−at)의 변환이야. e^(−at)만 있으면 1/(s+a).' },
          { label: n(K) + '/s', fn: (s) => K / s, why: 'e^(−at)를 무시하고 상수 ' + n(K) + '의 변환을 했어.' },
          { label: n(K * a) + '/(s + ' + a + ')', fn: (s) => (K * a) / (s + a), why: 'a를 분자에 곱했어. 분자는 상수 ' + n(K) + '만 남아.' },
        ],
        conclusion: ck(K) + 'e^(−' + (a === 1 ? '' : a) + 't) → ' + label,
        steps: ['변환표: e^(−at) → 1/(s + a).', 'a = ' + a + ', 상수 ' + n(K) + '배 → F(s) = ' + label + '.'],
        check: '최종값으로 확인: sF(s)에 s → 0이면 0. 실제로 e^(−' + a + 't)는 시간이 지나면 0으로 줄어들어. 맞아.',
        traps: ['감쇠(−a) 지수함수는 분모가 s + a. "마이너스가 플러스로 바뀐다"를 기억해.'],
      };
    },
  });

  T({
    id: 'lp-trig',
    concept: 'laplace',
    gen(r) {
      const K = r.pick([1, 2, 3, 4, 5]);
      const w = r.pick([2, 3, 4, 5, 6, 10]);
      const w2 = w * w;
      const isSin = r.chance(0.5);
      const dPlus = 's² + ' + w2;
      const dMinus = 's² − ' + w2;
      const sinL = { label: n(K * w) + '/(' + dPlus + ')', fn: (s) => (K * w) / (s * s + w2) };
      const cosL = { label: ck(K) + 's/(' + dPlus + ')', fn: (s) => (K * s) / (s * s + w2) };
      const ans = isSin ? sinL : cosL;
      const name = isSin ? 'sin' : 'cos';
      const distractors = isSin
        ? [
            Object.assign({}, cosL, { why: 'cos의 변환(s/(s²+ω²))과 헷갈렸어. sin은 분자가 ω야.' }),
            { label: n(K * w) + '/(' + dMinus + ')', fn: (s) => (K * w) / (s * s - w2), why: '분모 부호를 −로 썼어. 삼각함수는 s² + ω²야(− 는 쌍곡선 함수).' },
            { label: n(K) + '/(' + dPlus + ')', fn: (s) => K / (s * s + w2), why: '분자의 ω(' + w + ')를 빠뜨렸어.' },
          ]
        : [
            Object.assign({}, sinL, { why: 'sin의 변환(ω/(s²+ω²))과 헷갈렸어. cos은 분자가 s야.' }),
            { label: ck(K) + 's/(' + dMinus + ')', fn: (s) => (K * s) / (s * s - w2), why: '분모 부호를 −로 썼어. 삼각함수는 s² + ω².' },
            { label: n(K) + '/(s + ' + w + ')', fn: (s) => K / (s + w), why: '지수함수 변환 1/(s+a)처럼 계산했어.' },
          ];
      return {
        params: { K, w, fn: name },
        kind: 'expr',
        text: 'f(t) = ' + ck(K) + name + ' ' + w + 't의 라플라스 변환 F(s)는?',
        formula: 'sin ωt → ω/(s² + ω²),  cos ωt → s/(s² + ω²)',
        answer: ans,
        distractors,
        conclusion: ck(K) + name + ' ' + w + 't → ' + ans.label,
        steps: [
          '변환표: ' + (isSin ? 'sin ωt → ω/(s² + ω²)' : 'cos ωt → s/(s² + ω²)') + '.',
          'ω = ' + w + ' → ω² = ' + w2 + '.',
          '상수 ' + n(K) + '배까지 곱하면 ' + ans.label + '.',
        ],
        check: '초기값으로 확인: sF(s)에서 s → ∞이면 ' + (isSin ? '0 (sin 0 = 0)' : n(K) + ' (cos 0 = 1이라 ' + n(K) + ')') + '. 맞아.',
        traps: ['"sin은 ω, cos은 s"가 분자. 분모는 둘 다 s² + ω².'],
      };
    },
  });

  T({
    id: 'lp-final',
    concept: 'laplace',
    gen(r) {
      const a = r.pick([1, 2, 3, 4, 5]);
      const m = r.pick([1, 2, 3, 4, 5, 6, 8, 10]);
      const b = a * m;
      const K = r.pick([1, 2, 3, 4, 5, 6, 8, 10]);
      const isFinal = r.chance(0.6);
      const Fs = 'F(s) = (' + den(K, b) + ') / {s(s + ' + a + ')}';
      const sF = '(' + den(K, b) + ')/(s + ' + a + ')';
      const s1 = (K + b) / (1 + a);
      const common = {
        params: { K, a, b, ask: isFinal ? 'final' : 'initial' },
        formula: '최종값 f(∞) = lim(s→0) sF(s),  초기값 f(0⁺) = lim(s→∞) sF(s)',
        unit: '',
      };
      if (isFinal) {
        return Object.assign(common, {
          text: Fs + '일 때 f(t)의 최종값 f(∞)는?',
          answer: m,
          distractors: [
            { v: K, why: 's → ∞로 보냈어. 그건 초기값 정리야. 최종값은 s → 0.' },
            { v: b, why: '분자 상수항만 보고 분모의 (s + ' + a + ')를 빠뜨렸어.' },
            { v: s1, why: 's = 1을 넣었어. 극한은 s → 0이야.' },
          ],
          conclusion: 'sF(s) = ' + sF + ' → s → 0: ' + b + '/' + a + ' = ' + n(m),
          steps: [
            '최종값 정리: f(∞) = lim(s→0) sF(s).',
            'sF(s) = s × (' + den(K, b) + ')/{s(s + ' + a + ')} = ' + sF + '. 분모의 s가 지워져.',
            's = 0 대입: ' + b + '/' + a + ' = ' + n(m) + '.',
          ],
          check: 'sF(s)의 극점은 s = −' + a + '(왼쪽 반평면)이라 최종값 정리를 써도 돼. f(t) = ' + n(m) + ' + (' + n(K - m) + ')e^(−' + a + 't)로 풀어 봐도 t → ∞에서 ' + n(m) + '.',
          traps: ['최종값 정리는 시스템이 안정할 때만(극점이 모두 왼쪽) 쓸 수 있어.', '"최종 = s → 0, 초기 = s → ∞". 시간과 s는 반대 방향으로 간다고 기억해.'],
        });
      }
      return Object.assign(common, {
        text: Fs + '일 때 f(t)의 초기값 f(0⁺)는?',
        answer: K,
        distractors: [
          { v: m, why: 's → 0으로 보냈어. 그건 최종값 정리야. 초기값은 s → ∞.' },
          { v: s1, why: 's = 1을 넣었어. 극한은 s → ∞야.' },
          { v: b, why: '분자의 상수항만 봤어. s → ∞에서는 s가 붙은 항(' + ck(K) + 's)이 주인공이야.' },
        ],
        conclusion: 'sF(s) = ' + sF + ' → s → ∞: ' + n(K) + 's/s = ' + n(K),
        steps: [
          '초기값 정리: f(0⁺) = lim(s→∞) sF(s).',
          'sF(s) = ' + sF + '.',
          's가 아주 크면 분자 ≈ ' + ck(K) + 's, 분모 ≈ s → ' + n(K) + '.',
        ],
        check: '부분분수로 풀면 f(t) = ' + n(m) + ' + (' + n(K - m) + ')e^(−' + a + 't). t = 0 → ' + n(m) + ' + ' + n(K - m) + ' = ' + n(K) + '. 맞아.',
        traps: ['F(s)가 아니라 "sF(s)"의 극한이야. s를 곱하는 걸 빠뜨리지 마.'],
      });
    },
  });

  // ───────── 전달함수 ─────────
  function tfChoices(tau, outCap, why) {
    // 1차 회로: 저역(1/(τs+1)) / 고역(τs/(τs+1))
    const low = { label: '1/(' + den(tau, 1) + ')', fn: (s) => 1 / (tau * s + 1) };
    const high = { label: n(tau, 4) + 's/(' + den(tau, 1) + ')', fn: (s) => (tau * s) / (tau * s + 1) };
    const it = 1 / tau;
    const lowWrong = { label: '1/(' + den(it, 1) + ')', fn: (s) => 1 / (it * s + 1) };
    const highWrong = { label: n(it, 4) + 's/(' + den(it, 1) + ')', fn: (s) => (it * s) / (it * s + 1) };
    if (outCap) {
      return {
        answer: low,
        distractors: [
          Object.assign({}, high, { why: why.other }),
          { label: den(tau, 1), fn: (s) => tau * s + 1, why: '입력/출력을 거꾸로 나눴어. 전달함수는 출력 ÷ 입력이야.' },
          Object.assign({}, lowWrong, { why: why.tau }),
        ],
      };
    }
    return {
      answer: high,
      distractors: [
        Object.assign({}, low, { why: why.other }),
        { label: '(' + den(tau, 1) + ')/(' + n(tau, 4) + 's)', fn: (s) => (tau * s + 1) / (tau * s), why: '입력/출력을 거꾸로 나눴어.' },
        Object.assign({}, highWrong, { why: why.tau }),
      ],
    };
  }

  T({
    id: 'tf-rc',
    concept: 'transfer',
    gen(r) {
      const RkO = r.pick([1, 2, 5, 10, 20, 50, 100]);
      const CuF = r.pick([1, 2, 5, 10, 20, 50, 100]);
      const tau = (RkO * CuF) / 1000;
      if (!F.isNice(tau, 3) || tau === 1) return null;
      const outCap = r.chance(0.5);
      const ch = tfChoices(tau, outCap, {
        other: outCap ? '출력을 R 양단으로 착각했어. 그건 고역통과 형태(τs/(τs+1))야.' : '출력을 C 양단으로 착각했어. 그건 저역통과 형태(1/(τs+1))야.',
        tau: '시정수를 1/(RC)로 착각했어. RC 회로의 시정수는 τ = RC = ' + n(tau, 4) + ' s야.',
      });
      const parts = outCap
        ? { parts: [{ type: 'R', label: 'R ' + n(RkO) + ' kΩ' }], right: { type: 'C', label: n(CuF) + ' μF', mark: 'vo' } }
        : { parts: [{ type: 'C', label: 'C ' + n(CuF) + ' μF' }], right: { type: 'R', label: n(RkO) + ' kΩ', mark: 'vo' } };
      return Object.assign(
        {
          params: { RkO, CuF, out: outCap ? 'C' : 'R' },
          kind: 'expr',
          text: 'R = ' + n(RkO) + ' kΩ, C = ' + n(CuF) + ' μF인 저항과 콘덴서를 직렬로 연결하고 입력 전압 vi를 걸었어. ' + (outCap ? 'C' : 'R') + ' 양단 전압을 출력 vo로 할 때 전달함수 Vo(s)/Vi(s)는?',
          svg: G.svg.series(Object.assign({ source: { kind: 'ac', label: 'vi' } }, parts)),
          formula: 'R → R,  C → 1/(Cs),  전압 분배: 출력 쪽 임피던스 / 전체 임피던스',
          conclusion: 'τ = RC = ' + n(tau, 4) + ' s → G(s) = ' + ch.answer.label,
          steps: [
            's 영역으로 바꾸기: R은 그대로, C는 1/(Cs).',
            outCap
              ? '전압 분배: Vo/Vi = (1/Cs) / (R + 1/Cs). 분자·분모에 Cs를 곱하면 1/(RCs + 1).'
              : '전압 분배: Vo/Vi = R / (R + 1/Cs). 분자·분모에 Cs를 곱하면 RCs/(RCs + 1).',
            'RC = ' + n(RkO * 1000) + ' Ω × ' + n(CuF / 1e6, 6) + ' F = ' + n(tau, 4) + ' s.',
            'G(s) = ' + ch.answer.label + '.',
          ],
          check: outCap
            ? 's = 0(직류)이면 G = 1: 콘덴서가 다 충전되면 입력 전압이 전부 C에 걸려. 맞아.'
            : 's = 0(직류)이면 G = 0: 콘덴서가 직류를 막아 R에는 전압이 안 걸려. 맞아.',
          traps: ['kΩ × μF = ms(10⁻³ s). 1 kΩ × 1 μF = 1 ms.', '출력이 어느 소자 양단인지에 따라 분자가 달라져. 그림에서 vo 위치를 먼저 봐.'],
        },
        ch
      );
    },
  });

  T({
    id: 'tf-rl',
    concept: 'transfer',
    gen(r) {
      const LmH = r.pick([10, 20, 50, 100, 200, 500]);
      const R = r.pick([1, 2, 5, 10, 20, 50, 100]);
      const tau = LmH / 1000 / R;
      if (!F.isNice(tau, 4) || tau === 1) return null;
      const outR = r.chance(0.5);
      const ch = tfChoices(tau, outR, {
        other: outR ? '출력을 L 양단으로 착각했어. 그건 τs/(τs+1) 형태야.' : '출력을 R 양단으로 착각했어. 그건 1/(τs+1) 형태야.',
        tau: '시정수를 R/L로 뒤집었어. RL 회로의 시정수는 τ = L/R = ' + n(tau, 4) + ' s야.',
      });
      const parts = outR
        ? { parts: [{ type: 'L', label: 'L ' + n(LmH) + ' mH' }], right: { type: 'R', label: n(R) + ' Ω', mark: 'vo' } }
        : { parts: [{ type: 'R', label: 'R ' + n(R) + ' Ω' }], right: { type: 'L', label: n(LmH) + ' mH', mark: 'vo' } };
      return Object.assign(
        {
          params: { LmH, R, out: outR ? 'R' : 'L' },
          kind: 'expr',
          text: 'R = ' + n(R) + ' Ω, L = ' + n(LmH) + ' mH인 저항과 코일을 직렬로 연결하고 입력 전압 vi를 걸었어. ' + (outR ? 'R' : 'L') + ' 양단 전압을 출력 vo로 할 때 전달함수 Vo(s)/Vi(s)는?',
          svg: G.svg.series(Object.assign({ source: { kind: 'ac', label: 'vi' } }, parts)),
          formula: 'R → R,  L → Ls,  시정수 τ = L/R',
          conclusion: 'τ = L/R = ' + n(tau, 4) + ' s → G(s) = ' + ch.answer.label,
          steps: [
            's 영역: R은 그대로, L은 Ls.',
            outR
              ? '전압 분배: Vo/Vi = R/(Ls + R). 분자·분모를 R로 나누면 1/((L/R)s + 1).'
              : '전압 분배: Vo/Vi = Ls/(Ls + R). 분자·분모를 R로 나누면 (L/R)s/((L/R)s + 1).',
            'L/R = ' + n(LmH / 1000, 4) + ' H ÷ ' + n(R) + ' Ω = ' + n(tau, 4) + ' s.',
            'G(s) = ' + ch.answer.label + '.',
          ],
          check: outR
            ? 's = 0(직류)이면 G = 1: 직류에서 코일은 그냥 전선이라 전압이 전부 R에 걸려. 맞아.'
            : 's = 0(직류)이면 G = 0: 직류에서 코일 양단 전압은 0이야. 맞아.',
          traps: ['RC는 τ = RC(곱), RL은 τ = L/R(나눗셈). 헷갈리면 "τ가 클수록 느리다"로 생각해 봐: L이 크면 느려지니까 L이 분자.'],
        },
        ch
      );
    },
  });

  T({
    id: 'tf-feedback',
    concept: 'transfer',
    gen(r) {
      const K = r.pick([2, 3, 4, 5, 9, 10, 19, 20, 99, 100]);
      const h = r.pick([0.1, 0.2, 0.25, 0.5, 1]);
      const M = K / (1 + K * h);
      if (!F.isNice(M, 3)) return null;
      return {
        params: { K, h },
        text: '전향 이득 G = ' + n(K) + ', 피드백 요소 H = ' + n(h) + '인 부궤환(마이너스 피드백) 시스템의 전체 이득 C/R은?',
        svg: G.svg.feedback({ g: 'G = ' + n(K), h: 'H = ' + n(h) }),
        formula: 'C/R = G / (1 + GH)',
        unit: '',
        decimals: 3,
        answer: M,
        distractors: [
          { v: K / (1 + h), why: '분모에 G를 빠뜨리고 1 + H로 계산했어. 분모는 1 + GH(한 바퀴 도는 이득).' },
          { v: K / (1 - K * h), why: '정궤환(플러스 피드백) 공식 G/(1 − GH)를 썼어. 그림의 합산점이 −야.' },
          { v: K, why: '피드백을 무시했어. 피드백이 있으면 전체 이득은 G보다 작아져.' },
          { v: (K * h) / (1 + K * h), why: '분자에 H까지 곱했어. 분자는 입력에서 출력으로 바로 가는 경로(G)뿐이야.' },
        ],
        conclusion: 'C/R = ' + n(K) + '/(1 + ' + n(K) + ' × ' + n(h) + ') = ' + n(K) + '/' + n(1 + K * h) + ' = ' + n(M, 3),
        steps: [
          '부궤환 공식: 전체 = G/(1 + GH).',
          'GH = ' + n(K) + ' × ' + n(h) + ' = ' + n(K * h) + ' → 분모 = ' + n(1 + K * h) + '.',
          'C/R = ' + n(K) + ' ÷ ' + n(1 + K * h) + ' = ' + n(M, 3) + '.',
        ],
        check: '피드백 신호 = C × H = ' + n(M * h, 3) + ', 오차 = 1 − ' + n(M * h, 3) + ' = ' + n(1 - M * h, 3) + ', G × 오차 = ' + n(K * (1 - M * h), 3) + ' = C. 맞아(R = 1로 둔 경우).',
        traps: ['"분자 = 직진 경로, 분모 = 1 + 한 바퀴 이득"으로 기억해.', 'GH가 아주 크면 전체 이득 ≈ 1/H가 돼. 그래서 피드백을 쓰면 G가 흔들려도 결과가 안정돼.'],
      };
    },
  });

  T({
    id: 'tf-feedback-s',
    concept: 'transfer',
    gen(r) {
      const K = r.pick([2, 3, 4, 5, 6, 8, 10]);
      const a = r.pick([1, 2, 3, 4, 5]);
      const lab = (num, c) => num + '/(' + den(1, c) + ')';
      return {
        params: { K, a },
        kind: 'expr',
        text: 'G(s) = ' + n(K) + '/(s + ' + a + '), H(s) = 1인 단위 부궤환 시스템의 폐루프 전달함수 C(s)/R(s)는?',
        svg: G.svg.feedback({ g: n(K) + '/(s+' + a + ')', h: '1' }),
        formula: 'C/R = G/(1 + GH)',
        answer: { label: lab(n(K), a + K), fn: (s) => K / (s + a + K) },
        distractors: [
          { label: lab(n(K), a - K), fn: (s) => K / (s + a - K), why: '정궤환 공식 G/(1 − G)로 계산했어. 그림의 합산점이 −라 부궤환이야.' },
          { label: lab(n(K), a), fn: (s) => K / (s + a), why: '피드백을 무시하고 G(s) 그대로 답했어.' },
          { label: '(' + den(1, a) + ')/(' + den(1, a + K) + ')', fn: (s) => (s + a) / (s + a + K), why: '오차 전달함수 E/R = 1/(1 + G)를 구했어. 출력 C/R은 분자가 G야.' },
          { label: lab(n(K), a + 1), fn: (s) => K / (s + a + 1), why: '1 + G를 "분모에 1 더하기"로 착각했어. 통분하면 (s + ' + a + ' + ' + K + ')야.' },
        ],
        conclusion: 'C/R = [' + n(K) + '/(s+' + a + ')] / [1 + ' + n(K) + '/(s+' + a + ')] = ' + lab(n(K), a + K),
        steps: [
          '부궤환: C/R = G/(1 + G·1).',
          '분자·분모에 (s + ' + a + ')를 곱해: ' + n(K) + ' / [(s + ' + a + ') + ' + n(K) + '].',
          '정리하면 ' + lab(n(K), a + K) + '.',
        ],
        check: '극점이 −' + a + '에서 −' + (a + K) + '로 왼쪽으로 옮겨 갔어. 부궤환은 응답을 빠르게 만들어. 정상상태 이득 ' + n(K) + '/' + (a + K) + '도 1보다 작아 자연스러워.',
        traps: ['분수가 겹치면 분자·분모에 G의 분모를 곱해 정리해. 그게 제일 실수가 적어.'],
      };
    },
  });

  T({
    id: 'tf-standard',
    concept: 'transfer',
    gen(r) {
      const d = r.pick([2, 4, 5, 10]);
      const Tc = r.pick([0.1, 0.2, 0.25, 0.4, 0.5, 2, 2.5, 4]);
      const K = r.pick([1, 2, 3, 4, 5, 10]);
      const c = Tc * d;
      const b = K * d;
      if (!F.isNice(c, 0) || c === d) return null;
      const askT = r.chance(0.5);
      const Gs = 'G(s) = ' + b + '/(' + den(c, d) + ')';
      const base = {
        params: { b, c, d, ask: askT ? 'T' : 'K' },
        formula: '1차 표준형 G(s) = K/(Ts + 1): 분모 상수항을 1로 맞춘 뒤 읽기',
        unit: askT ? 's' : '',
        conclusion: Gs + ' = ' + n(K) + '/(' + den(Tc, 1) + ') → ' + (askT ? '시정수 T = ' + n(Tc) + ' s' : '이득 K = ' + n(K)),
        steps: [
          '분자·분모를 분모의 상수항 ' + d + '로 나눠: ' + b + '/' + d + ' ÷ (' + c + '/' + d + ' s + 1).',
          '표준형: ' + n(K) + '/(' + den(Tc, 1) + ').',
          askT ? 's 앞의 숫자가 시정수: T = ' + n(Tc) + ' s.' : '분자가 이득(정상상태 이득): K = ' + n(K) + '.',
        ],
        check: 'G(0) = ' + b + '/' + d + ' = ' + n(K) + ' = K, 극점 s = −' + d + '/' + c + ' = −1/T → T = ' + n(Tc) + '. 맞아.',
        traps: ['표준형으로 만들기 전에 s 앞 숫자를 바로 읽으면 틀려. 상수항이 1인지 먼저 봐.'],
      };
      if (askT) {
        return Object.assign(base, {
          text: Gs + '의 시정수 T는 몇 초야?',
          answer: Tc,
          distractors: [
            { v: c, why: '표준형으로 바꾸지 않고 s 앞 숫자(' + c + ')를 그대로 읽었어.' },
            { v: d / c, why: 'c/d를 거꾸로 했어. 그건 1/T(극점의 크기)야.' },
            { v: K, why: '이득 K(= ' + b + '/' + d + ')를 시정수로 착각했어.' },
            { v: 1 / d, why: '상수항의 역수만 봤어. T = (s 계수)/(상수항).' },
          ],
        });
      }
      return Object.assign(base, {
        text: Gs + '의 정상상태 이득(직류 이득) K는?',
        answer: K,
        distractors: [
          { v: b, why: '분자를 그대로 읽었어. 분모 상수항을 1로 맞춰야 해.' },
          { v: b / c, why: 's의 계수로 나눴어. 상수항(' + d + ')으로 나눠야 해.' },
          { v: d / b, why: '나누는 순서를 거꾸로 했어.' },
        ],
      });
    },
  });
})(globalThis.GISA);
