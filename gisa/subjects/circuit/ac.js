// 회로이론 확장: 교류 기초, RLC 임피던스, 교류 전력, 직렬 공진, Y·Δ 결선
(function (G) {
  'use strict';
  const F = G.fmt;
  const n = F.num;
  const q = F.q;
  const T = G.defineTemplate;
  const S2 = F.SQRT2;
  const S3 = F.SQRT3;
  const PI = Math.PI;

  // 피타고라스 직각삼각형 (R, X, Z)
  const TRIPLES = [
    [3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17],
    [9, 12, 15], [12, 9, 15], [12, 16, 20], [16, 12, 20], [7, 24, 25], [24, 7, 25], [15, 20, 25], [20, 15, 25],
    [20, 21, 29], [21, 20, 29], [30, 40, 50], [40, 30, 50],
  ];

  // ───────── 교류 기초 ─────────
  T({
    id: 'ac-rms',
    concept: 'ac-basics',
    gen(r) {
      const isV = r.chance(0.6);
      const X = isV ? r.pick([50, 100, 110, 200, 220, 380]) : r.pick([2, 5, 10, 20, 50]);
      const unit = isV ? 'V' : 'A';
      const sym = isV ? 'v' : 'i';
      const w = r.pick(['120π', '100π', '377']);
      const max = X * S2;
      return {
        params: { X },
        text: (isV ? '전압' : '전류') + ' ' + sym + ' = ' + n(X) + '√2 sin(' + w + 't) [' + unit + ']의 실효값은?',
        formula: '실효값 = 최댓값 / √2',
        unit,
        answer: X,
        distractors: [
          { v: max, why: '최댓값(' + n(X) + '√2 ≈ ' + n(max, 1) + ')을 그대로 답했어. sin 앞의 숫자는 최댓값이야.' },
          { v: (2 * max) / PI, why: '평균값(2 × 최댓값/π)을 구했어. 실효값은 최댓값/√2야.' },
          { v: X / S2, why: '이미 √2로 나눈 값(' + n(X) + ')을 한 번 더 √2로 나눴어. 최댓값은 ' + n(X) + '√2야.' },
        ],
        conclusion: '최댓값 ' + n(X) + '√2 ÷ √2 = 실효값 ' + q(X, unit),
        steps: [
          'sin 앞의 ' + n(X) + '√2가 최댓값 ' + (isV ? 'Vm' : 'Im') + '이야.',
          '실효값 = 최댓값/√2 = ' + n(X) + '√2/√2 = ' + q(X, unit) + '.',
          '시험에서 "√2"가 붙어 나오면 대개 실효값이 깔끔하게 떨어지도록 만든 거야.',
        ],
        check: '실효값 × √2 = ' + n(X) + ' × 1.414 ≈ ' + n(max, 1) + ' = 최댓값. 맞아.',
        traps: ['괄호 안(' + w + ')은 각주파수 ω야. 실효값과는 상관없어.', '평균값(0.637배)과 실효값(0.707배)을 헷갈리지 마. 실효값이 더 커.'],
      };
    },
  });

  T({
    id: 'ac-average',
    concept: 'ac-basics',
    gen(r) {
      const Vm = r.pick([100, 150, 200, 300, 400, 500]);
      const avg = (2 * Vm) / PI;
      return {
        params: { Vm },
        text: '최댓값이 ' + q(Vm, 'V') + '인 정현파 교류 전압의 평균값(반주기 평균)은 약 몇 V야?',
        formula: '평균값 = 2 × 최댓값 / π ≈ 0.637 × 최댓값',
        unit: 'V',
        decimals: 2,
        answer: avg,
        distractors: [
          { v: Vm / S2, why: '실효값(최댓값/√2)을 구했어. 평균값은 2/π배야.' },
          { v: Vm / 2, why: '그냥 절반으로 잡았어. 사인파는 봉우리가 둥글어서 평균이 절반보다 커(약 0.637배).' },
          { v: (Vm * PI) / 2, why: '2/π를 거꾸로 π/2로 곱했어. 평균값은 최댓값보다 커질 수 없어.' },
        ],
        conclusion: '평균값 = 2 × ' + n(Vm) + '/π ≈ ' + q(avg, 'V', 2),
        steps: [
          '정현파의 평균값은 반주기(0~π) 동안의 평균이야. 한 주기 전체를 평균하면 +와 −가 상쇄돼 0이 되거든.',
          '공식: 평균값 = 2Vm/π.',
          '2 × ' + n(Vm) + ' ÷ 3.1416 ≈ ' + q(avg, 'V', 2) + '.',
        ],
        check: '평균값(≈0.637Vm) < 실효값(≈0.707Vm) < 최댓값 순서가 맞는지 봐: ' + n(avg, 1) + ' < ' + n(Vm / S2, 1) + ' < ' + n(Vm) + '. 맞아.',
        traps: ['정현파: 평균값 0.637Vm, 실효값 0.707Vm. 숫자 크기 순서를 외워 두면 보기에서 바로 걸러져.'],
      };
    },
  });

  T({
    id: 'ac-period',
    concept: 'ac-basics',
    gen(r) {
      if (r.chance(0.5)) {
        const f = r.pick([50, 60, 100, 125, 200, 250, 400, 500, 1000]);
        const Tms = 1000 / f;
        return {
          params: { mode: 'f2T', f },
          text: '주파수 ' + q(f, 'Hz') + '인 교류의 주기는 몇 ms야?',
          formula: 'T = 1/f  (s → ms는 ×1000)',
          unit: 'ms',
          decimals: 3,
          answer: Tms,
          distractors: [
            { v: 1 / f, why: '1/f로 구한 건 초(s) 단위야. ms로 바꾸려면 1000을 곱해야 해.' },
            { v: 1000 / (2 * f), why: '반주기를 구했어. 주기는 한 번 완전히 왕복하는 시간이야.' },
            { v: (2 * PI * 1000) / f, why: 'T = 2π/ω 공식에 ω 대신 f를 넣었어. f로는 T = 1/f면 돼.' },
          ],
          conclusion: 'T = 1/' + n(f) + ' s = ' + q(Tms, 'ms', 3),
          steps: ['주기는 주파수의 역수: T = 1/f.', 'T = 1/' + n(f) + ' = ' + n(1 / f, 6) + ' s.', 'ms로: × 1000 = ' + q(Tms, 'ms', 3) + '.'],
          check: n(Tms, 3) + ' ms × ' + n(f) + ' = 1000 ms = 1초. 1초에 ' + n(f) + '번 반복이 맞아.',
          traps: ['f(Hz) = 1초에 몇 번, T(s) = 한 번에 몇 초. 서로 역수야.'],
        };
      }
      const Tms = r.pick([1, 2, 4, 5, 10, 20, 25, 50]);
      const f = 1000 / Tms;
      return {
        params: { mode: 'T2f', Tms },
        text: '주기가 ' + q(Tms, 'ms') + '인 교류의 주파수는?',
        formula: 'f = 1/T  (ms → s로 먼저 바꾸기)',
        unit: 'Hz',
        answer: f,
        distractors: [
          { v: 1 / Tms, why: 'ms를 초로 바꾸지 않았어. ' + n(Tms) + ' ms = ' + n(Tms / 1000, 3) + ' s야.' },
          { v: (2 * PI * 1000) / Tms, why: '2π를 곱해서 각주파수 ω를 구했어. 주파수 f는 그냥 1/T야.' },
          { v: 1000 / (2 * Tms), why: '주기를 반으로 나눠서 계산했어.' },
        ],
        conclusion: 'f = 1/' + n(Tms / 1000, 3) + ' s = ' + q(f, 'Hz'),
        steps: ['단위부터: ' + n(Tms) + ' ms = ' + n(Tms / 1000, 3) + ' s.', 'f = 1/T = 1 ÷ ' + n(Tms / 1000, 3) + ' = ' + q(f, 'Hz') + '.'],
        check: n(f) + ' Hz × ' + n(Tms / 1000, 3) + ' s = 1. 역수 관계가 맞아.',
        traps: ['ms(밀리초)는 1/1000초. 단위를 안 바꾸면 1000배 차이가 나.'],
      };
    },
  });

  T({
    id: 'ac-omega',
    concept: 'ac-basics',
    gen(r) {
      const f = r.pick([25, 50, 60, 100, 200, 400, 500]);
      const Vm = r.pick([100, 141, 200, 311]);
      return {
        params: { f },
        text: 'v = ' + n(Vm) + ' sin(' + 2 * f + 'πt) [V]인 교류 전압의 주파수 f는?',
        formula: 'ω = 2πf  →  f = ω / 2π',
        unit: 'Hz',
        answer: f,
        distractors: [
          { v: 2 * PI * f, why: 'ω(' + 2 * f + 'π ≈ ' + n(2 * PI * f, 1) + ')를 그대로 주파수로 답했어. 괄호 안 t의 계수는 각주파수 ω야.' },
          { v: 2 * f, why: 'π만 지우고 2로 나누는 걸 잊었어. f = ω/(2π).' },
          { v: PI * f, why: '2로만 나누고 π로 나누는 걸 잊었어.' },
        ],
        conclusion: 'f = ω/2π = ' + 2 * f + 'π/2π = ' + q(f, 'Hz'),
        steps: [
          'sin(ωt) 꼴에서 t 앞의 숫자가 각주파수 ω야: ω = ' + 2 * f + 'π rad/s.',
          'ω = 2πf → f = ω/(2π) = ' + 2 * f + 'π/(2π) = ' + q(f, 'Hz') + '.',
        ],
        check: '2π × ' + n(f) + ' = ' + 2 * f + 'π. 식의 ω와 같아.',
        traps: ['sin 앞 숫자(' + n(Vm) + ')는 최댓값이라 주파수와 상관없어.', '120π rad/s → 60 Hz, 100π rad/s → 50 Hz는 자주 나오니 외워 둬.'],
      };
    },
  });

  // ───────── R-L-C 직렬 임피던스 ─────────
  function pickTriple(r, maxZ) {
    for (let i = 0; i < 20; i++) {
      const t = r.pick(TRIPLES);
      const k = r.pick([1, 2, 5, 10]);
      if (t[2] * k <= (maxZ || 500)) return [t[0] * k, t[1] * k, t[2] * k];
    }
    return [3, 4, 5];
  }

  T({
    id: 'rlc-rl',
    concept: 'rlc',
    gen(r) {
      const [R, X, Z] = pickTriple(r);
      return {
        params: { R, X },
        text: '저항 R = ' + q(R, 'Ω') + ', 유도 리액턴스 XL = ' + q(X, 'Ω') + '인 R-L 직렬회로의 임피던스 Z는?',
        svg: G.svg.series({ source: { kind: 'ac', label: 'V' }, parts: [{ type: 'R', label: 'R ' + q(R, 'Ω') }, { type: 'L', label: 'XL ' + q(X, 'Ω') }] }),
        formula: 'Z = √(R² + XL²)',
        unit: 'Ω',
        answer: Z,
        distractors: [
          { v: R + X, why: 'R과 XL을 그냥 더했어. 둘은 서로 직각(90°) 방향이라 피타고라스로 합쳐야 해.' },
          { v: R * R + X * X, why: '제곱해서 더한 뒤 √를 씌우지 않았어.' },
          { v: (R * X) / Z, why: '병렬 공식처럼 계산했어. 직렬은 √(R² + X²)이야.' },
          { v: Math.abs(R - X), why: '두 값을 뺐어. 뺄셈은 XL과 XC 사이에서만 해.' },
        ],
        conclusion: 'Z = √(' + n(R) + '² + ' + n(X) + '²) = √' + n(R * R + X * X) + ' = ' + q(Z, 'Ω'),
        steps: [
          'R과 XL은 방향이 90° 달라서 직각삼각형의 두 변처럼 생각해.',
          'R² + XL² = ' + n(R * R) + ' + ' + n(X * X) + ' = ' + n(R * R + X * X) + '.',
          'Z = √' + n(R * R + X * X) + ' = ' + q(Z, 'Ω') + '.',
        ],
        check: '직각삼각형 ' + n(R) + '-' + n(X) + '-' + n(Z) + ': ' + n(Z) + '² = ' + n(Z * Z) + ' = ' + n(R * R) + ' + ' + n(X * X) + '. 맞아.',
        traps: ['3-4-5, 6-8-10, 5-12-13 같은 직각삼각형 조합을 외워 두면 계산이 거의 필요 없어.', 'Z는 R보다도, X보다도 커야 해. 둘 중 작은 값이 나오면 틀린 거야.'],
      };
    },
  });

  T({
    id: 'rlc-series',
    concept: 'rlc',
    gen(r) {
      const [R, X, Z] = pickTriple(r, 200);
      const XC = r.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30]);
      const big = XC + X;
      const inductive = r.chance(0.5);
      const XL = inductive ? big : XC;
      const XCv = inductive ? XC : big;
      return {
        params: { R, XL, XC: XCv },
        text: 'R = ' + q(R, 'Ω') + ', XL = ' + q(XL, 'Ω') + ', XC = ' + q(XCv, 'Ω') + '인 R-L-C 직렬회로의 임피던스 Z는?',
        svg: G.svg.series({
          source: { kind: 'ac', label: 'V' },
          parts: [{ type: 'R', label: 'R ' + q(R, 'Ω') }, { type: 'L', label: 'XL ' + q(XL, 'Ω') }, { type: 'C', label: 'XC ' + q(XCv, 'Ω') }],
        }),
        formula: 'Z = √(R² + (XL − XC)²)',
        unit: 'Ω',
        answer: Z,
        distractors: [
          { v: Math.sqrt(R * R + (XL + XCv) * (XL + XCv)), why: 'XL과 XC를 더했어. 둘은 서로 반대 방향이라 빼야 해.' },
          { v: R + XL + XCv, why: '세 값을 그냥 다 더했어. 저항과 리액턴스는 직각, XL과 XC는 반대 방향이야.' },
          { v: Math.sqrt(R * R + XL * XL), why: 'XC를 빠뜨렸어. 콘덴서 리액턴스는 XL을 상쇄해.' },
          { v: R + Math.abs(XL - XCv), why: '리액턴스 차이(' + n(Math.abs(XL - XCv)) + ')를 R에 그냥 더했어. 피타고라스로 합쳐야 해.' },
        ],
        conclusion: 'Z = √(' + n(R) + '² + (' + n(XL) + ' − ' + n(XCv) + ')²) = ' + q(Z, 'Ω'),
        steps: [
          '먼저 리액턴스끼리 정리: XL − XC = ' + n(XL) + ' − ' + n(XCv) + ' = ' + n(XL - XCv) + ' Ω' + (XL < XCv ? ' (음수면 용량성. 제곱하면 부호는 사라져)' : ' (양수면 유도성)') + '.',
          'Z = √(R² + X²) = √(' + n(R * R) + ' + ' + n(X * X) + ') = ' + q(Z, 'Ω') + '.',
        ],
        check: n(Z) + '² = ' + n(Z * Z) + ', ' + n(R) + '² + ' + n(X) + '² = ' + n(R * R + X * X) + '. 같아.',
        traps: ['XL과 XC는 "빼고", 그 결과와 R은 "피타고라스". 순서를 지키면 안 틀려.'],
      };
    },
  });

  T({
    id: 'rlc-omega',
    concept: 'rlc',
    gen(r) {
      const [R, X, Z] = pickTriple(r, 200);
      const w = r.pick([100, 200, 250, 400, 500, 1000, 2000]);
      const XC = r.pick([2, 4, 5, 8, 10, 20, 25, 40, 50]);
      const inductive = r.chance(0.5);
      const XL = inductive ? XC + X : XC;
      const XCv = inductive ? XC : XC + X;
      const LmH = (1000 * XL) / w;
      const CuF = 1e6 / (w * XCv);
      if (!F.isNice(LmH, 2) || !F.isNice(CuF, 2)) return null;
      return {
        params: { R, LmH, CuF, w },
        text: 'R = ' + q(R, 'Ω') + ', L = ' + q(LmH, 'mH') + ', C = ' + q(CuF, 'μF') + '인 R-L-C 직렬회로에 각주파수 ω = ' + n(w) + ' rad/s의 교류를 걸었어. 임피던스 Z는?',
        svg: G.svg.series({
          source: { kind: 'ac', label: 'ω=' + n(w) },
          parts: [{ type: 'R', label: q(R, 'Ω') }, { type: 'L', label: q(LmH, 'mH') }, { type: 'C', label: q(CuF, 'μF') }],
        }),
        formula: 'XL = ωL,  XC = 1/(ωC),  Z = √(R² + (XL − XC)²)',
        unit: 'Ω',
        answer: Z,
        distractors: [
          { v: Math.sqrt(R * R + (XL + XCv) * (XL + XCv)), why: 'XL과 XC를 더했어. 둘은 반대 방향이라 빼야 해.' },
          { v: Math.sqrt(R * R + XL * XL), why: 'XC를 빠뜨렸어(콘덴서 무시).' },
          { v: R + Math.abs(XL - XCv), why: 'R과 리액턴스를 그냥 더했어. 피타고라스로 합쳐야 해.' },
          { v: Math.sqrt(R * R + (w * LmH - XCv) * (w * LmH - XCv)), why: 'mH를 H로 바꾸지 않아서 XL이 1000배로 커졌어.' },
        ],
        conclusion: 'XL = ' + n(XL) + ' Ω, XC = ' + n(XCv) + ' Ω → Z = √(' + n(R) + '² + ' + n(X) + '²) = ' + q(Z, 'Ω'),
        steps: [
          'XL = ωL = ' + n(w) + ' × ' + n(LmH / 1000, 6) + ' H = ' + n(XL) + ' Ω.',
          'XC = 1/(ωC) = 1 ÷ (' + n(w) + ' × ' + n(CuF / 1e6, 8) + ' F) = ' + n(XCv) + ' Ω.',
          'XL − XC = ' + n(XL - XCv) + ' Ω.',
          'Z = √(' + n(R * R) + ' + ' + n(X * X) + ') = ' + q(Z, 'Ω') + '.',
        ],
        check: 'XC 다시 보기: ω × C × XC = ' + n(w) + ' × ' + n(CuF / 1e6, 8) + ' × ' + n(XCv) + ' = 1. 맞아.',
        traps: ['mH는 ×10⁻³, μF는 ×10⁻⁶. 단위 변환이 이 유형 오답의 대부분이야.', 'XL은 ω에 비례, XC는 ω에 반비례해.'],
      };
    },
  });

  T({
    id: 'rlc-current',
    concept: 'rlc',
    gen(r) {
      const [R, X, Z] = pickTriple(r, 100);
      const I = r.pick([2, 4, 5, 10, 20]);
      const V = I * Z;
      if (V > 1000) return null;
      return {
        params: { V, R, X },
        text: 'R = ' + q(R, 'Ω') + ', XL = ' + q(X, 'Ω') + '인 R-L 직렬회로에 ' + q(V, 'V') + ' 교류 전압을 걸었어. 흐르는 전류는?',
        svg: G.svg.series({ source: { kind: 'ac', label: q(V, 'V') }, parts: [{ type: 'R', label: 'R ' + q(R, 'Ω') }, { type: 'L', label: 'XL ' + q(X, 'Ω') }] }),
        formula: 'I = V / Z,  Z = √(R² + X²)',
        unit: 'A',
        answer: I,
        distractors: [
          { v: V / (R + X), why: 'R과 X를 그냥 더해서 나눴어. Z = √(R² + X²)야.' },
          { v: V / R, why: '리액턴스를 무시하고 저항만으로 나눴어.' },
          { v: V / X, why: '저항을 무시하고 리액턴스만으로 나눴어.' },
        ],
        conclusion: 'Z = ' + n(Z) + ' Ω → I = ' + n(V) + ' ÷ ' + n(Z) + ' = ' + q(I, 'A'),
        steps: ['임피던스부터: Z = √(' + n(R) + '² + ' + n(X) + '²) = ' + q(Z, 'Ω') + '.', '교류 옴의 법칙: I = V/Z = ' + n(V) + ' ÷ ' + n(Z) + ' = ' + q(I, 'A') + '.'],
        check: 'R 전압 ' + n(I * R) + ' V, L 전압 ' + n(I * X) + ' V → √(' + n(I * R) + '² + ' + n(I * X) + '²) = ' + n(V) + ' V. 전원 전압과 같아.',
        traps: ['교류에서 각 소자 전압을 그냥 더하면 전원 전압보다 커져. 위상이 달라서 피타고라스로 더해야 해.'],
      };
    },
  });

  // ───────── 유효·무효·피상전력과 역률 ─────────
  const PF = [
    [0.6, 0.8],
    [0.8, 0.6],
  ];

  T({
    id: 'acp-active',
    concept: 'ac-power',
    gen(r) {
      const V = r.pick([100, 200, 220]);
      const I = r.pick([5, 10, 20, 25, 50]);
      const [c, s] = r.pick(PF);
      const P = V * I * c;
      return {
        params: { V, I, pf: c },
        text: '전압 ' + q(V, 'V') + ', 전류 ' + q(I, 'A') + ', 역률 ' + n(c) + '인 단상 부하의 유효전력은?',
        formula: 'P = V × I × cosθ',
        unit: 'W',
        answer: P,
        distractors: [
          { v: V * I, why: '역률을 빠뜨렸어. V × I는 피상전력 [VA]이야.' },
          { v: V * I * s, why: 'cosθ 대신 sinθ(' + n(s) + ')를 곱했어. 그건 무효전력 [var]이야.' },
          { v: (V * I) / c, why: '역률로 나눴어. 유효전력은 피상전력보다 작아야 하니까 곱해야 해.' },
        ],
        conclusion: 'P = ' + n(V) + ' × ' + n(I) + ' × ' + n(c) + ' = ' + q(P, 'W'),
        steps: ['피상전력 S = VI = ' + n(V * I) + ' VA.', '유효전력은 그중 역률만큼: P = S × cosθ = ' + n(V * I) + ' × ' + n(c) + ' = ' + q(P, 'W') + '.'],
        check: '무효전력 Q = ' + n(V * I * s) + ' var. √(P² + Q²) = √(' + n(P) + '² + ' + n(V * I * s) + '²) = ' + n(V * I) + ' = S. 맞아.',
        traps: ['단위로 구분해: P [W], Q [var], S [VA].'],
      };
    },
  });

  T({
    id: 'acp-reactive',
    concept: 'ac-power',
    gen(r) {
      const V = r.pick([100, 200, 220]);
      const I = r.pick([5, 10, 20, 25, 50]);
      const [c, s] = r.pick(PF);
      const Q = V * I * s;
      return {
        params: { V, I, pf: c },
        text: '전압 ' + q(V, 'V') + ', 전류 ' + q(I, 'A') + ', 역률 ' + n(c) + '(지상)인 부하의 무효전력은?',
        formula: 'Q = V × I × sinθ,  sinθ = √(1 − cos²θ)',
        unit: 'var',
        answer: Q,
        distractors: [
          { v: V * I * c, why: 'cosθ를 곱했어. 그건 유효전력 P야.' },
          { v: V * I, why: 'V × I 그대로 답했어. 그건 피상전력 S야.' },
          { v: V * I * (1 - c), why: 'sinθ = 1 − cosθ로 착각했어. sinθ는 √(1 − cos²θ)로 구해(= ' + n(s) + ').' },
        ],
        conclusion: 'sinθ = ' + n(s) + ' → Q = ' + n(V) + ' × ' + n(I) + ' × ' + n(s) + ' = ' + q(Q, 'var'),
        steps: [
          'sinθ = √(1 − ' + n(c) + '²) = √' + n(1 - c * c) + ' = ' + n(s) + '.',
          'Q = VI sinθ = ' + n(V * I) + ' × ' + n(s) + ' = ' + q(Q, 'var') + '.',
        ],
        check: 'cos² + sin² = ' + n(c * c) + ' + ' + n(s * s) + ' = 1. 맞아.',
        traps: ['역률 0.8 ↔ sin 0.6, 역률 0.6 ↔ sin 0.8. 3-4-5 직각삼각형이야.'],
      };
    },
  });

  T({
    id: 'acp-apparent',
    concept: 'ac-power',
    gen(r) {
      const [a, b, c] = r.pick(TRIPLES.slice(0, 8));
      const k = r.pick([1, 2, 3, 5, 10]);
      const P = a * k;
      const Q = b * k;
      const S = c * k;
      return {
        params: { P, Q },
        text: '유효전력 ' + q(P, 'kW') + ', 무효전력 ' + q(Q, 'kvar') + '인 부하의 피상전력은?',
        formula: 'S = √(P² + Q²)',
        unit: 'kVA',
        answer: S,
        distractors: [
          { v: P + Q, why: 'P와 Q를 그냥 더했어. 두 전력은 직각 관계라 피타고라스로 합쳐.' },
          { v: Math.sqrt(Math.abs(P * P - Q * Q)), why: '제곱끼리 뺐어. 피상전력은 제곱을 "더한" 뒤 √야.' },
          { v: Math.abs(P - Q), why: '두 값을 뺐어. 피상전력은 둘보다 커야 해.' },
        ],
        conclusion: 'S = √(' + n(P) + '² + ' + n(Q) + '²) = ' + q(S, 'kVA'),
        steps: ['전력 삼각형: 밑변 P, 높이 Q, 빗변 S.', 'S = √(' + n(P * P) + ' + ' + n(Q * Q) + ') = √' + n(P * P + Q * Q) + ' = ' + q(S, 'kVA') + '.'],
        check: '역률 = P/S = ' + n(P) + '/' + n(S) + ' = ' + n(P / S, 3) + '. 0과 1 사이라 자연스러워.',
        traps: ['피상전력은 항상 P와 Q보다 커. 보기에서 둘보다 작은 값은 바로 지워.'],
      };
    },
  });

  T({
    id: 'acp-pf',
    concept: 'ac-power',
    gen(r) {
      const [R, X, Z] = pickTriple(r);
      return {
        params: { R, X },
        text: 'R = ' + q(R, 'Ω') + ', XL = ' + q(X, 'Ω') + '인 R-L 직렬회로의 역률(cosθ)은?',
        svg: G.svg.series({ source: { kind: 'ac', label: 'V' }, parts: [{ type: 'R', label: 'R ' + q(R, 'Ω') }, { type: 'L', label: 'XL ' + q(X, 'Ω') }] }),
        formula: 'cosθ = R / Z,  Z = √(R² + X²)',
        unit: '',
        decimals: 3,
        answer: R / Z,
        distractors: [
          { v: X / Z, why: 'X/Z는 sinθ(무효율)야. 역률은 R/Z.' },
          { v: R / X, why: 'R/X는 역률이 아니라 tanθ의 역수야. 분모는 Z여야 해.' },
          { v: Z / R, why: 'R/Z를 거꾸로 했어. 역률은 1보다 클 수 없어.' },
          { v: X / R, why: 'X/R은 tanθ야. 역률은 R/Z.' },
        ],
        conclusion: 'Z = ' + n(Z) + ' Ω → cosθ = R/Z = ' + n(R) + '/' + n(Z) + ' = ' + n(R / Z, 3),
        steps: ['Z = √(' + n(R) + '² + ' + n(X) + '²) = ' + q(Z, 'Ω') + '.', '역률 = 저항/임피던스 = ' + n(R) + ' ÷ ' + n(Z) + ' = ' + n(R / Z, 3) + '.'],
        check: 'cos²θ + sin²θ = (' + n(R) + '/' + n(Z) + ')² + (' + n(X) + '/' + n(Z) + ')² = 1. 맞아.',
        traps: ['역률은 0~1 사이 값. 1보다 큰 보기는 무조건 오답이야.', '"역률 = 유효 / 전체": 전력에선 P/S, 임피던스에선 R/Z.'],
      };
    },
  });

  T({
    id: 'acp-q-from-p',
    concept: 'ac-power',
    gen(r) {
      const [c, s] = r.pick(PF);
      const k = r.pick([1, 2, 3, 5, 10, 20]);
      const P = (c === 0.8 ? 4 : 3) * k;
      const Q = (P * s) / c;
      return {
        params: { P, pf: c },
        text: '유효전력 ' + q(P, 'kW') + ', 역률 ' + n(c) + '(지상)인 부하의 무효전력은?',
        formula: 'S = P / cosθ,  Q = S × sinθ  (= P × tanθ)',
        unit: 'kvar',
        answer: Q,
        distractors: [
          { v: P / c, why: '피상전력 S = P/cosθ까지만 구했어. 여기서 sinθ를 곱해야 Q야.' },
          { v: P * s, why: 'P에 바로 sinθ를 곱했어. sinθ는 피상전력 S에 곱해야 해.' },
          { v: (P * c) / s, why: 'tanθ를 뒤집어서(cos/sin) 곱했어. tanθ = sinθ/cosθ야.' },
        ],
        conclusion: 'S = ' + n(P) + '/' + n(c) + ' = ' + n(P / c) + ' kVA → Q = ' + n(P / c) + ' × ' + n(s) + ' = ' + q(Q, 'kvar'),
        steps: [
          '피상전력: S = P/cosθ = ' + n(P) + ' ÷ ' + n(c) + ' = ' + q(P / c, 'kVA') + '.',
          'sinθ = √(1 − ' + n(c) + '²) = ' + n(s) + '.',
          'Q = S × sinθ = ' + n(P / c) + ' × ' + n(s) + ' = ' + q(Q, 'kvar') + '.',
        ],
        check: '√(P² + Q²) = √(' + n(P) + '² + ' + n(Q) + '²) = ' + n(P / c) + ' = S. 맞아.',
        traps: ['P에 sinθ를 바로 곱하는 실수가 많아. sin과 cos는 둘 다 S(빗변)를 기준으로 한 비율이야.'],
      };
    },
  });

  // ───────── 직렬 공진 ─────────
  function lcPair(r) {
    // ω₀ = 1/√(LC)가 딱 떨어지게 L(mH), C(μF)를 고른다
    const w0 = r.pick([100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000]);
    const LmH = r.pick([1, 2, 4, 5, 10, 20, 25, 40, 50, 100, 200]);
    const CuF = 1e6 / (w0 * w0 * (LmH / 1000));
    if (!F.isNice(CuF, 3) || CuF < 0.01 || CuF > 5000) return null;
    return { w0, LmH, CuF };
  }

  T({
    id: 'res-omega',
    concept: 'resonance',
    gen(r) {
      const p = lcPair(r);
      if (!p) return null;
      const L = p.LmH / 1000;
      const C = p.CuF / 1e6;
      return {
        params: { LmH: p.LmH, CuF: p.CuF },
        text: 'L = ' + q(p.LmH, 'mH') + ', C = ' + q(p.CuF, 'μF') + '인 R-L-C 직렬회로의 공진 각주파수 ω₀는?',
        svg: G.svg.series({ source: { kind: 'ac', label: 'ω₀ = ?' }, parts: [{ type: 'R', label: 'R' }, { type: 'L', label: q(p.LmH, 'mH') }, { type: 'C', label: q(p.CuF, 'μF') }] }),
        formula: 'ω₀ = 1/√(LC)',
        unit: 'rad/s',
        answer: p.w0,
        distractors: [
          { v: 1 / (L * C), why: '√를 빠뜨렸어. ω₀ = 1/√(LC).' },
          { v: p.w0 / (2 * PI), why: '2π로 나눠서 공진 주파수 f₀(Hz)를 구했어. 문제는 각주파수 ω₀야.' },
          { v: 2 * PI * p.w0, why: '2π를 곱했어. ω₀ = 1/√(LC)에는 2π가 없어.' },
        ],
        conclusion: 'ω₀ = 1/√(' + n(L, 6) + ' × ' + n(C, 9) + ') = ' + q(p.w0, 'rad/s'),
        steps: [
          '단위 바꾸기: L = ' + n(L, 6) + ' H, C = ' + n(C, 9) + ' F.',
          'LC = ' + F.sci(L * C) + ' → √(LC) = ' + F.sci(Math.sqrt(L * C)) + '.',
          'ω₀ = 1/√(LC) = ' + q(p.w0, 'rad/s') + '.',
        ],
        check: 'ω₀L = ' + n(p.w0 * L) + ' Ω, 1/(ω₀C) = ' + n(1 / (p.w0 * C)) + ' Ω. 둘이 같으니 공진 조건(XL = XC)이 맞아.',
        traps: ['ω₀ = 1/√(LC) [rad/s], f₀ = 1/(2π√(LC)) [Hz]. 무엇을 묻는지 단위로 확인해.'],
      };
    },
  });

  T({
    id: 'res-f0',
    concept: 'resonance',
    gen(r) {
      const p = lcPair(r);
      if (!p) return null;
      const L = p.LmH / 1000;
      const C = p.CuF / 1e6;
      const f0 = p.w0 / (2 * PI);
      return {
        params: { LmH: p.LmH, CuF: p.CuF },
        text: 'L = ' + q(p.LmH, 'mH') + ', C = ' + q(p.CuF, 'μF') + '인 R-L-C 직렬회로의 공진 주파수 f₀는 약 몇 Hz야?',
        svg: G.svg.series({ source: { kind: 'ac', label: 'f₀ = ?' }, parts: [{ type: 'R', label: 'R' }, { type: 'L', label: q(p.LmH, 'mH') }, { type: 'C', label: q(p.CuF, 'μF') }] }),
        formula: 'f₀ = 1 / (2π√(LC))',
        unit: 'Hz',
        decimals: 1,
        answer: f0,
        distractors: [
          { v: p.w0, why: '2π로 나누지 않았어. 그건 각주파수 ω₀ [rad/s]야.' },
          { v: 1 / (2 * PI * L * C), why: '√를 빠뜨렸어.' },
          { v: (2 * PI) / Math.sqrt(L * C), why: '2π를 분모가 아니라 분자에 뒀어.' },
        ],
        conclusion: 'ω₀ = ' + n(p.w0) + ' rad/s → f₀ = ' + n(p.w0) + '/2π ≈ ' + q(f0, 'Hz', 1),
        steps: [
          '먼저 ω₀ = 1/√(LC) = ' + q(p.w0, 'rad/s') + '.',
          'f₀ = ω₀/(2π) = ' + n(p.w0) + ' ÷ 6.2832 ≈ ' + q(f0, 'Hz', 1) + '.',
        ],
        check: 'XL = 2πf₀L = ' + n(2 * PI * f0 * L) + ' Ω, XC = 1/(2πf₀C) = ' + n(1 / (2 * PI * f0 * C)) + ' Ω. 같아.',
        traps: ['ω와 f 사이에는 항상 2π. ω = 2πf.'],
      };
    },
  });

  T({
    id: 'res-current',
    concept: 'resonance',
    gen(r) {
      const R = r.pick([2, 4, 5, 10, 20, 25, 50]);
      const I = r.pick([1, 2, 4, 5, 10]);
      const V = R * I;
      const X = r.pick([5, 10, 20, 30, 40, 50]);
      if (V > 500) return null;
      return {
        params: { V, R, X },
        text: 'R = ' + q(R, 'Ω') + ', XL = ' + q(X, 'Ω') + ', XC = ' + q(X, 'Ω') + '인 R-L-C 직렬회로에 ' + q(V, 'V') + '를 걸었어. 흐르는 전류는?',
        svg: G.svg.series({
          source: { kind: 'ac', label: q(V, 'V') },
          parts: [{ type: 'R', label: 'R ' + q(R, 'Ω') }, { type: 'L', label: 'XL ' + q(X, 'Ω') }, { type: 'C', label: 'XC ' + q(X, 'Ω') }],
        }),
        formula: 'XL = XC(공진) → Z = R,  I = V/R',
        unit: 'A',
        answer: I,
        distractors: [
          { v: V / Math.sqrt(R * R + X * X), why: 'XL만 보고 XC가 상쇄하는 걸 놓쳤어.' },
          { v: V / (R + 2 * X), why: 'R, XL, XC를 전부 그냥 더했어.' },
          { v: V / Math.sqrt(R * R + 4 * X * X), why: 'XL과 XC를 더했어. 둘은 빼야 해.' },
        ],
        conclusion: 'XL = XC라 공진 → Z = R = ' + n(R) + ' Ω, I = ' + n(V) + '/' + n(R) + ' = ' + q(I, 'A'),
        steps: [
          'XL = XC = ' + n(X) + ' Ω이니까 공진 상태야.',
          'XL − XC = 0 → Z = √(R² + 0) = R = ' + q(R, 'Ω') + '.',
          'I = V/R = ' + n(V) + ' ÷ ' + n(R) + ' = ' + q(I, 'A') + '. 이게 이 회로에서 가능한 가장 큰 전류야.',
        ],
        check: 'L 전압 = C 전압 = ' + n(I * X) + ' V로 크기가 같고 방향이 반대라 서로 지워져. 남는 건 R 전압 ' + n(V) + ' V = 전원 전압.',
        traps: ['공진이면 리액턴스는 잊어. 회로가 저항 R 하나인 것처럼 행동해.', '공진 때 L, C 각각의 전압은 전원 전압보다 클 수도 있어(이게 Q배 확대).'],
      };
    },
  });

  T({
    id: 'res-scale',
    concept: 'resonance',
    gen(r) {
      const pairs = [[4, 1], [1, 4], [2, 2], [9, 1], [1, 9], [3, 3], [16, 1], [1, 16], [4, 4], [2, 8], [8, 2]];
      const [a, b] = r.pick(pairs);
      const up = r.chance(0.6);
      const ab = a * b;
      const ans = up ? 1 / Math.sqrt(ab) : Math.sqrt(ab);
      const label = (v) => F.ratio(v) + '배';
      const lPart = a === 1 ? 'L은 그대로 두고' : up ? 'L을 ' + a + '배로 하고' : 'L을 1/' + a + '로 줄이고';
      const cPart = b === 1 ? 'C는 그대로 두면' : up ? 'C를 ' + b + '배로 하면' : 'C를 1/' + b + '로 줄이면';
      const text = 'R-L-C 직렬회로에서 ' + lPart + ', ' + cPart + ' 공진 주파수는 몇 배가 될까?';
      return {
        params: { a, b, up },
        text,
        formula: 'f₀ = 1/(2π√(LC))  →  f₀ ∝ 1/√(LC)',
        unit: '배',
        label,
        answer: ans,
        distractors: [
          { v: up ? 1 / ab : ab, why: '√를 빠뜨렸어. f₀는 LC의 "제곱근"에 반비례해.' },
          { v: up ? Math.sqrt(ab) : 1 / Math.sqrt(ab), why: '방향을 거꾸로 했어. LC가 ' + (up ? '커지면 f₀는 작아져' : '작아지면 f₀는 커져') + '(반비례).' },
          { v: up ? ab : 1 / ab, why: '반비례도 √도 놓쳤어.' },
        ],
        conclusion: 'LC가 ' + (up ? ab + '배' : '1/' + ab) + ' → f₀는 1/√(' + (up ? ab : '1/' + ab) + ') = ' + label(ans),
        steps: [
          'f₀ = 1/(2π√(LC))라서 f₀는 √(LC)에 반비례해.',
          'LC의 변화: ' + (up ? a + ' × ' + b + ' = ' + ab + '배' : '(1/' + a + ') × (1/' + b + ') = 1/' + ab + '배') + '.',
          '√(LC)는 ' + (up ? F.ratio(Math.sqrt(ab)) + '배' : '1/' + F.ratio(Math.sqrt(ab)) + '배') + ' → f₀는 그 역수인 ' + label(ans) + '.',
        ],
        check: '숫자로: L = C = 1이면 f₀ ∝ 1. 바꾼 뒤 LC = ' + (up ? ab : '1/' + ab) + ' → 1/√(LC) = ' + F.ratio(ans) + '.',
        traps: ['L과 C 중 무엇을 바꿨는지는 상관없어. 곱 LC가 몇 배인지만 보면 돼.'],
      };
    },
  });

  T({
    id: 'res-q',
    concept: 'resonance',
    gen(r) {
      const s = r.pick([10, 20, 50, 100, 200, 500]);
      const CuF = r.pick([0.1, 0.4, 1, 2, 4, 10, 25, 100]);
      const LmH = (s * s * CuF) / 1000;
      if (!F.isNice(LmH, 3) || LmH < 0.1 || LmH > 1000) return null;
      const R = r.pick([1, 2, 4, 5, 10, 20, 25, 50]);
      const Q = s / R;
      if (!F.isNice(Q, 2)) return null;
      return {
        params: { R, LmH, CuF },
        text: 'R = ' + q(R, 'Ω') + ', L = ' + q(LmH, 'mH') + ', C = ' + q(CuF, 'μF') + '인 R-L-C 직렬 공진회로의 선택도(첨예도) Q는?',
        svg: G.svg.series({ source: { kind: 'ac', label: 'V' }, parts: [{ type: 'R', label: q(R, 'Ω') }, { type: 'L', label: q(LmH, 'mH') }, { type: 'C', label: q(CuF, 'μF') }] }),
        formula: 'Q = (1/R)·√(L/C)',
        unit: '',
        answer: Q,
        distractors: [
          { v: R * Math.sqrt((CuF / 1e6) / (LmH / 1000)), why: 'L과 C, R의 위치를 모두 뒤집었어. Q = (1/R)√(L/C).' },
          { v: s, why: 'R로 나누는 걸 빠뜨렸어.' },
          { v: (s * s) / R, why: '√를 빠뜨렸어(L/C 그대로).' },
        ],
        conclusion: '√(L/C) = ' + n(s) + ' → Q = ' + n(s) + '/' + n(R) + ' = ' + n(Q),
        steps: [
          'L/C = ' + n(LmH / 1000, 6) + ' ÷ ' + n(CuF / 1e6, 8) + ' = ' + n(s * s) + '.',
          '√(L/C) = ' + n(s) + ' Ω.',
          'Q = ' + n(s) + ' ÷ ' + n(R) + ' = ' + n(Q) + '.',
        ],
        check: 'Q = ω₀L/R로도 확인: ω₀ = ' + n(1 / Math.sqrt((LmH / 1000) * (CuF / 1e6))) + ' rad/s, ω₀L = ' + n(s) + ' Ω → ' + n(s) + '/' + n(R) + ' = ' + n(Q) + '.',
        traps: ['Q가 크면 공진 곡선이 뾰족해(선택성이 좋아). R이 작을수록 Q가 커.'],
      };
    },
  });

  // ───────── Y결선·Δ결선 ─────────
  T({
    id: 'yd-voltage',
    concept: 'y-delta',
    gen(r) {
      if (r.chance(0.5)) {
        const Vp = r.pick([100, 110, 127, 200, 220, 230, 254]);
        const VL = S3 * Vp;
        return {
          params: { mode: 'p2l', Vp },
          text: 'Y결선 3상 평형 회로에서 상전압이 ' + q(Vp, 'V') + '야. 선간전압은 약 몇 V야?',
          svg: G.svg.threePhase({ type: 'Y', label: '상전압 ' + q(Vp, 'V') }),
          formula: 'Y결선: VL = √3 × Vp',
          unit: 'V',
          decimals: 1,
          answer: VL,
          distractors: [
            { v: Vp, why: '선간전압 = 상전압은 Δ결선일 때야. Y결선은 √3배.' },
            { v: Vp / S3, why: '√3을 곱해야 하는데 나눴어. 선간전압이 상전압보다 커.' },
            { v: 3 * Vp, why: '√3 대신 3을 곱했어.' },
          ],
          conclusion: 'VL = √3 × ' + n(Vp) + ' ≈ ' + q(VL, 'V', 1),
          steps: ['Y결선은 전선 두 가닥 사이에 상(부하) 두 개가 걸쳐 있어.', '두 상전압이 120° 엇갈려 있어서 합치면 √3배: VL = √3 × ' + n(Vp) + ' ≈ ' + q(VL, 'V', 1) + '.'],
          check: n(VL, 1) + ' ÷ 1.732 ≈ ' + n(Vp) + ' V. 맞아.',
          traps: ['Y는 전압에 √3, Δ는 전류에 √3.', '우리나라 배전 220/380 V가 바로 Y결선의 상전압/선간전압이야(220 × √3 ≈ 381).'],
        };
      }
      const VL = r.pick([200, 380, 400, 440, 3300, 6600, 22900]);
      const Vp = VL / S3;
      return {
        params: { mode: 'l2p', VL },
        text: 'Y결선 3상 평형 회로의 선간전압이 ' + q(VL, 'V') + '야. 상전압은 약 몇 V야?',
        svg: G.svg.threePhase({ type: 'Y', label: '선간전압 ' + q(VL, 'V') }),
        formula: 'Y결선: Vp = VL / √3',
        unit: 'V',
        decimals: 1,
        answer: Vp,
        distractors: [
          { v: VL, why: '선간전압 = 상전압은 Δ결선이야. Y결선은 상전압이 √3배 작아.' },
          { v: VL * S3, why: '√3으로 나눠야 하는데 곱했어.' },
          { v: VL / 3, why: '√3 대신 3으로 나눴어.' },
        ],
        conclusion: 'Vp = ' + n(VL) + '/√3 ≈ ' + q(Vp, 'V', 1),
        steps: ['Y결선: 선간전압 = √3 × 상전압.', '거꾸로 상전압 = 선간전압 ÷ √3 = ' + n(VL) + ' ÷ 1.732 ≈ ' + q(Vp, 'V', 1) + '.'],
        check: n(Vp, 1) + ' × 1.732 ≈ ' + n(VL) + ' V.',
        traps: ['상전압은 항상 선간전압보다 작거나(Y) 같아(Δ). 더 큰 값은 오답이야.'],
      };
    },
  });

  T({
    id: 'yd-current',
    concept: 'y-delta',
    gen(r) {
      if (r.chance(0.5)) {
        const Ip = r.pick([5, 10, 15, 20, 30, 50, 100]);
        const IL = S3 * Ip;
        return {
          params: { mode: 'p2l', Ip },
          text: 'Δ결선 3상 평형 부하의 상전류가 ' + q(Ip, 'A') + '야. 선전류는 약 몇 A야?',
          svg: G.svg.threePhase({ type: 'D', label: '상전류 ' + q(Ip, 'A') }),
          formula: 'Δ결선: IL = √3 × Ip',
          unit: 'A',
          decimals: 1,
          answer: IL,
          distractors: [
            { v: Ip, why: '선전류 = 상전류는 Y결선이야. Δ결선은 √3배.' },
            { v: Ip / S3, why: '√3을 곱해야 하는데 나눴어.' },
            { v: 3 * Ip, why: '√3 대신 3을 곱했어.' },
          ],
          conclusion: 'IL = √3 × ' + n(Ip) + ' ≈ ' + q(IL, 'A', 1),
          steps: ['Δ결선의 꼭짓점(전선)에는 두 상의 전류가 만나.', '두 전류가 120° 엇갈려 있어서 합치면 √3배: IL = √3 × ' + n(Ip) + ' ≈ ' + q(IL, 'A', 1) + '.'],
          check: n(IL, 1) + ' ÷ 1.732 ≈ ' + n(Ip) + ' A.',
          traps: ['Δ는 전압이 같고 전류가 √3배. Y는 그 반대야.'],
        };
      }
      const IL = r.pick([10, 17.32, 20, 30, 34.64, 50, 100]);
      const Ip = IL / S3;
      return {
        params: { mode: 'l2p', IL },
        text: 'Δ결선 3상 평형 부하의 선전류가 ' + q(IL, 'A') + '야. 상전류는 약 몇 A야?',
        svg: G.svg.threePhase({ type: 'D', label: '선전류 ' + q(IL, 'A') }),
        formula: 'Δ결선: Ip = IL / √3',
        unit: 'A',
        decimals: 2,
        answer: Ip,
        distractors: [
          { v: IL, why: '선전류 = 상전류는 Y결선이야.' },
          { v: IL * S3, why: '√3으로 나눠야 하는데 곱했어. 상전류가 선전류보다 작아.' },
          { v: IL / 3, why: '√3 대신 3으로 나눴어.' },
        ],
        conclusion: 'Ip = ' + n(IL) + '/√3 ≈ ' + q(Ip, 'A', 2),
        steps: ['Δ결선: 선전류 = √3 × 상전류.', '상전류 = ' + n(IL) + ' ÷ 1.732 ≈ ' + q(Ip, 'A', 2) + '.'],
        check: n(Ip, 2) + ' × 1.732 ≈ ' + n(IL) + ' A.',
        traps: ['17.32 = 10√3, 34.64 = 20√3처럼 √3이 숨은 숫자를 알아보면 계산이 빨라져.'],
      };
    },
  });

  T({
    id: 'yd-load',
    concept: 'y-delta',
    gen(r) {
      const VL = r.pick([200, 220, 380, 400]);
      const Z = r.pick([5, 10, 20, 22, 38, 40, 50]);
      const isY = r.chance(0.5);
      const IL = isY ? VL / (S3 * Z) : (S3 * VL) / Z;
      if (isY) {
        return {
          params: { type: 'Y', VL, Z },
          text: '선간전압 ' + q(VL, 'V') + '인 3상 전원에 한 상의 임피던스가 ' + q(Z, 'Ω') + '인 평형 부하를 Y결선했어. 선전류는 약 몇 A야?',
          svg: G.svg.threePhase({ type: 'Y', label: '각 상 ' + q(Z, 'Ω') }),
          formula: 'Y: Vp = VL/√3,  IL = Ip = Vp/Z',
          unit: 'A',
          decimals: 2,
          answer: IL,
          distractors: [
            { v: VL / Z, why: '선간전압을 그대로 한 상에 걸었어. Y결선의 상전압은 VL/√3이야.' },
            { v: (S3 * VL) / Z, why: 'Δ결선처럼 √3을 곱했어.' },
            { v: VL / (3 * Z), why: '√3 대신 3으로 나눴어.' },
          ],
          conclusion: 'Vp = ' + n(VL) + '/√3 ≈ ' + n(VL / S3, 1) + ' V → IL = ' + n(VL / S3, 1) + '/' + n(Z) + ' ≈ ' + q(IL, 'A', 2),
          steps: [
            'Y결선 상전압: ' + n(VL) + ' ÷ √3 ≈ ' + n(VL / S3, 1) + ' V.',
            '상전류 = 상전압/Z = ' + n(VL / S3, 1) + ' ÷ ' + n(Z) + ' ≈ ' + n(IL, 2) + ' A.',
            'Y결선은 선전류 = 상전류 → ' + q(IL, 'A', 2) + '.',
          ],
          check: '3상 피상전력 √3 × ' + n(VL) + ' × ' + n(IL, 2) + ' ≈ ' + n(S3 * VL * IL, 0) + ' VA = 3 × (상전압²/Z) = ' + n((3 * (VL / S3) * (VL / S3)) / Z, 0) + ' VA. 같아.',
          traps: ['결선 문제는 "한 상"으로 바꿔서 옴의 법칙을 쓰고, 마지막에 선 값으로 되돌리는 순서로 풀어.'],
        };
      }
      return {
        params: { type: 'D', VL, Z },
        text: '선간전압 ' + q(VL, 'V') + '인 3상 전원에 한 상의 임피던스가 ' + q(Z, 'Ω') + '인 평형 부하를 Δ결선했어. 선전류는 약 몇 A야?',
        svg: G.svg.threePhase({ type: 'D', label: '각 상 ' + q(Z, 'Ω') }),
        formula: 'Δ: Vp = VL,  Ip = VL/Z,  IL = √3 × Ip',
        unit: 'A',
        decimals: 2,
        answer: IL,
        distractors: [
          { v: VL / Z, why: '상전류에서 멈췄어. Δ결선 선전류는 상전류의 √3배야.' },
          { v: VL / (S3 * Z), why: 'Y결선처럼 상전압을 VL/√3로 잡았어. Δ결선은 상전압 = 선간전압.' },
          { v: (3 * VL) / Z, why: '√3 대신 3을 곱했어.' },
        ],
        conclusion: 'Ip = ' + n(VL) + '/' + n(Z) + ' = ' + n(VL / Z) + ' A → IL = √3 × ' + n(VL / Z) + ' ≈ ' + q(IL, 'A', 2),
        steps: [
          'Δ결선은 한 상에 선간전압이 그대로 걸려: Vp = ' + q(VL, 'V') + '.',
          '상전류 Ip = ' + n(VL) + ' ÷ ' + n(Z) + ' = ' + q(VL / Z, 'A') + '.',
          '선전류 IL = √3 × Ip ≈ ' + q(IL, 'A', 2) + '.',
        ],
        check: '같은 부하를 Y로 바꾼 등가(Z/3 = ' + n(Z / 3) + ' Ω)로 풀어도: (' + n(VL) + '/√3) ÷ ' + n(Z / 3) + ' ≈ ' + n(IL, 2) + ' A.',
        traps: ['같은 부하라도 Δ결선 선전류는 Y결선의 3배야.'],
      };
    },
  });

  T({
    id: 'yd-convert',
    concept: 'y-delta',
    gen(r) {
      const toY = r.chance(0.5);
      if (toY) {
        const Z = 3 * r.pick([2, 3, 4, 5, 10, 15, 20, 30]);
        return {
          params: { mode: 'D2Y', Z },
          text: '각 상의 임피던스가 ' + q(Z, 'Ω') + '인 Δ결선 평형 부하를, 똑같이 동작하는 Y결선으로 바꾸면 한 상의 임피던스는?',
          svg: G.svg.threePhase({ type: 'D', label: '각 상 ' + q(Z, 'Ω') }),
          formula: 'ZY = ZΔ / 3',
          unit: 'Ω',
          answer: Z / 3,
          distractors: [
            { v: 3 * Z, why: '방향을 거꾸로 했어. Δ → Y는 1/3, Y → Δ가 3배야.' },
            { v: Z / S3, why: '√3으로 나눴어. 임피던스 변환은 √3이 아니라 3이야.' },
            { v: Z, why: '결선만 바뀌고 값은 같다고 생각했어.' },
          ],
          conclusion: 'ZY = ' + n(Z) + '/3 = ' + q(Z / 3, 'Ω'),
          steps: ['평형 부하에서 Δ → Y 변환은 임피던스를 1/3로.', n(Z) + ' ÷ 3 = ' + q(Z / 3, 'Ω') + '.'],
          check: '선간전압 V를 걸었을 때 선전류: Δ는 √3·V/' + n(Z) + ', Y는 (V/√3)/' + n(Z / 3) + ' = √3·V/' + n(Z) + '. 같아.',
          traps: ['Δ가 Y보다 3배 "커" 보여야 같은 전류가 흘러. 삼각형(Δ) 쪽 숫자가 커.'],
        };
      }
      const Z = r.pick([2, 3, 4, 5, 10, 15, 20, 30]);
      return {
        params: { mode: 'Y2D', Z },
        text: '각 상의 임피던스가 ' + q(Z, 'Ω') + '인 Y결선 평형 부하를, 똑같이 동작하는 Δ결선으로 바꾸면 한 상의 임피던스는?',
        svg: G.svg.threePhase({ type: 'Y', label: '각 상 ' + q(Z, 'Ω') }),
        formula: 'ZΔ = 3 × ZY',
        unit: 'Ω',
        answer: 3 * Z,
        distractors: [
          { v: Z / 3, why: '방향을 거꾸로 했어. Y → Δ는 3배.' },
          { v: S3 * Z, why: '√3을 곱했어. 임피던스 변환은 3배야.' },
          { v: Z, why: '값이 그대로라고 생각했어.' },
        ],
        conclusion: 'ZΔ = 3 × ' + n(Z) + ' = ' + q(3 * Z, 'Ω'),
        steps: ['평형 부하에서 Y → Δ 변환은 임피던스를 3배로.', '3 × ' + n(Z) + ' = ' + q(3 * Z, 'Ω') + '.'],
        check: '다시 Δ → Y로 되돌리면 ' + n(3 * Z) + '/3 = ' + n(Z) + ' Ω.',
        traps: ['"Δ는 크다(3배), Y는 작다(1/3)"로 기억해.'],
      };
    },
  });
})(globalThis.GISA);
