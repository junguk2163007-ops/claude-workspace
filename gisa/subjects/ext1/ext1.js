// 기출 빈출 보강 1차 문제 템플릿 (오리지널: 숫자만 바뀌는 계산 문제, 정답은 코드로 계산)
(function (G) {
  'use strict';
  const F = G.fmt;
  const n = F.num;
  const q = F.q;
  const T = G.defineTemplate;
  const S3 = F.SQRT3;
  const PI = Math.PI;
  const DEG = PI / 180;

  // ───────── 전력공학: 차단기 ─────────
  const RATED = [7.2, 25.8, 72.5, 170, 362]; // 정격전압 [kV]
  const KA = [8, 12.5, 16, 20, 25, 31.5, 40, 50, 63]; // 정격 차단전류 [kA]

  T({
    id: 'pw-breaker-current',
    concept: 'pw-breaker',
    gen(r) {
      const V = r.pick(RATED);
      const Ik = r.pick(KA);
      const Ps = Math.round(S3 * V * Ik);
      const I = Ps / (S3 * V);
      if (Ps < 50) return null;
      return {
        params: { V, Ps },
        text: '정격전압 ' + q(V, 'kV') + ', 정격 차단용량 ' + q(Ps, 'MVA') + '인 3상 차단기의 정격 차단전류는 약 몇 kA야?',
        formula: 'Ps = √3·V·Is  →  Is = Ps / (√3·V)',
        unit: 'kA',
        decimals: 2,
        answer: I,
        distractors: [
          { v: Ps / V, why: '3상이라 √3이 곱해져 있어야 해. Ps = √3·V·Is 인데 √3으로 나누는 걸 빼먹었어.' },
          { v: Ps / (3 * V), why: '√3 자리에 3을 넣었어. 3상 전력은 √3 × 선간전압 × 선전류야.' },
          { v: (Ps / (S3 * V)) * 1000, why: '단위가 어긋났어. MVA ÷ kV = kA 로 맞아떨어지니까 1000을 곱할 필요가 없어.' },
          { v: (Ps * S3) / V, why: '√3을 나누지 않고 곱했어. Is = Ps ÷ (√3·V)야.' },
        ],
        conclusion: 'Is = Ps / (√3·V) = ' + n(Ps) + ' ÷ (√3 × ' + n(V) + ') ≈ ' + q(I, 'kA', 2),
        steps: [
          '3상 차단기의 차단용량은 Ps = √3 × 정격전압 × 정격 차단전류야.',
          'Is에 대해 정리하면 Is = Ps ÷ (√3 × V).',
          '√3 × ' + n(V) + ' = ' + n(S3 * V, 3) + '이니까 Is = ' + n(Ps) + ' ÷ ' + n(S3 * V, 3) + ' ≈ ' + q(I, 'kA', 2) + '.',
        ],
        check: n(I, 2) + ' kA × √3 × ' + n(V) + ' kV ≈ ' + n(Ps) + ' MVA. 처음 차단용량과 같아.',
        traps: ['MVA ÷ kV = kA 로 단위가 맞아. 1000을 곱하거나 나누지 마.', '정격전압은 공칭전압이 아니라 차단기에 표시된 정격전압(공칭보다 조금 높은 값)을 써.'],
      };
    },
  });

  T({
    id: 'pw-breaker-capacity',
    concept: 'pw-breaker',
    gen(r) {
      const V = r.pick(RATED);
      const I = r.pick(KA);
      const Ps = S3 * V * I;
      if (Ps < 50) return null;
      return {
        params: { V, I },
        text: '정격전압 ' + q(V, 'kV') + ', 정격 차단전류 ' + q(I, 'kA') + '인 3상 차단기의 정격 차단용량은 약 몇 MVA야?',
        formula: 'Ps = √3·V·Is',
        unit: 'MVA',
        decimals: 1,
        answer: Ps,
        distractors: [
          { v: V * I, why: '√3을 빼먹었어. 3상 차단용량은 √3 × 전압 × 전류야.' },
          { v: 3 * V * I, why: '√3 자리에 3을 넣었어. 3상 전력에는 √3이 붙어.' },
          { v: (V * I) / S3, why: '√3을 곱하지 않고 나눴어.' },
          { v: V * I * 1000, why: 'kV × kA = MVA 라서 1000을 곱할 필요가 없어.' },
        ],
        conclusion: 'Ps = √3·V·Is = √3 × ' + n(V) + ' × ' + n(I) + ' ≈ ' + q(Ps, 'MVA', 1),
        steps: ['3상 차단용량 공식: Ps = √3 × 정격전압 × 정격 차단전류.', '√3 × ' + n(V) + ' = ' + n(S3 * V, 3) + '.', n(S3 * V, 3) + ' × ' + n(I) + ' ≈ ' + q(Ps, 'MVA', 1) + '.'],
        check: n(Ps, 1) + ' MVA ÷ (√3 × ' + n(V) + ' kV) = ' + n(Ps / (S3 * V), 2) + ' kA. 문제의 차단전류와 같아.',
        traps: ['kV × kA = MVA 로 단위가 맞아. 1000을 곱하지 마.', '3상이라는 말이 보이면 √3부터 떠올려.'],
      };
    },
  });

  // ───────── 전력공학: 중성점 접지 ─────────
  T({
    id: 'pw-petersen',
    concept: 'pw-neutral',
    gen(r) {
      const C = r.pick([0.5, 1, 1.5, 2, 3, 4, 5]);
      const f = r.pick([50, 60]);
      const w = 2 * PI * f;
      const L = 1 / (3 * w * w * C * 1e-6);
      return {
        params: { C, f },
        text: '3상 송전선의 1선당 대지 정전용량이 ' + q(C, 'μF') + '이고 주파수가 ' + q(f, 'Hz') + '야. 1선 지락 때 지락전류를 없애는 소호리액터의 인덕턴스 L은 약 몇 H야?',
        formula: 'L = 1 / (3ω²C),  ω = 2πf',
        unit: 'H',
        decimals: 2,
        answer: L,
        distractors: [
          { v: 1 / (w * w * C * 1e-6), why: '공진 조건은 ωL = 1/(3ωC)야. 세 선의 정전용량을 합친 3C를 써야 해서 분모에 3이 있어야 해.' },
          { v: 3 / (w * w * C * 1e-6), why: '3을 분자에 넣었어. 3C는 분모에 들어가서 L = 1/(3ω²C)야.' },
          { v: 1 / (3 * w * C * 1e-6), why: 'ω가 한 번만 들어갔어. L = 1/(3ω²C)는 ω가 제곱이야(이 값은 리액턴스 Ω에 가까워).' },
          { v: 1 / (3 * f * f * C * 1e-6), why: 'ω = 2πf를 빼먹고 f를 그대로 썼어.' },
        ],
        conclusion: 'L = 1/(3ω²C) = 1/(3 × ' + n(w, 1) + '² × ' + n(C) + '×10⁻⁶) ≈ ' + q(L, 'H', 2),
        steps: [
          '소호리액터는 대지 정전용량과 병렬공진시켜서 지락전류를 없애: ωL = 1/(3ωC).',
          'L에 대해 정리하면 L = 1/(3ω²C).',
          'ω = 2π × ' + n(f) + ' = ' + n(w, 2) + ' rad/s, C = ' + n(C) + ' μF = ' + n(C * 1e-6, 8) + ' F.',
          'L = 1 ÷ (3 × ' + n(w * w, 1) + ' × ' + n(C * 1e-6, 8) + ') ≈ ' + q(L, 'H', 2) + '.',
        ],
        check: '공진 확인: ωL = ' + n(w * L, 1) + ' Ω, 1/(3ωC) = ' + n(1 / (3 * w * C * 1e-6), 1) + ' Ω. 같아.',
        traps: ['C는 선 1가닥의 값이고, 공진식에는 세 선을 합친 3C가 들어가.', 'μF를 F로(×10⁻⁶) 바꾸는 걸 잊으면 값이 100만 배 어긋나.'],
      };
    },
  });

  T({
    id: 'pw-ground-current',
    concept: 'pw-neutral',
    gen(r) {
      const V = r.pick([6.6, 22.9, 66, 154]);
      const C = r.pick([0.1, 0.2, 0.3, 0.5, 1]);
      const f = r.pick([50, 60]);
      const w = 2 * PI * f;
      const Ig = 3 * w * C * 1e-6 * ((V * 1000) / S3);
      return {
        params: { V, C, f },
        text: '선간전압 ' + q(V, 'kV') + '인 3상 비접지 계통에서 1선당 대지 정전용량이 ' + q(C, 'μF') + '이야(' + n(f) + ' Hz). 1선 지락 때 흐르는 지락전류는 약 몇 A야?',
        formula: 'Ig = 3ωC·E = √3·ωC·V',
        unit: 'A',
        decimals: 2,
        answer: Ig,
        distractors: [
          { v: w * C * 1e-6 * ((V * 1000) / S3), why: '세 선의 정전용량 전류를 합친 3이 빠졌어. 지락전류는 Ig = 3ωCE야.' },
          { v: 3 * w * C * 1e-6 * V * 1000, why: 'E 자리에 선간전압 V를 넣었어. 3ωC에 곱하는 건 상전압 E = V/√3야.' },
          { v: w * C * 1e-6 * V * 1000, why: '3과 √3을 둘 다 빼먹었어. Ig = √3·ωC·V야.' },
          { v: S3 * w * C * 1e-6 * V, why: 'kV를 V로(×1000) 바꾸는 걸 빼먹었어.' },
        ],
        conclusion: 'Ig = 3ωC·E = √3 × ' + n(w, 1) + ' × ' + n(C * 1e-6, 8) + ' × ' + n(V * 1000) + ' ≈ ' + q(Ig, 'A', 2),
        steps: [
          '1선 지락이면 건전한 두 선의 충전전류가 합쳐져 흘러: Ig = 3ωC·E (E는 상전압).',
          'E = V/√3 = ' + n(V * 1000) + ' ÷ √3 = ' + n((V * 1000) / S3, 1) + ' V, ω = 2π × ' + n(f) + ' = ' + n(w, 2) + ' rad/s.',
          'Ig = 3 × ' + n(w, 2) + ' × ' + n(C * 1e-6, 8) + ' × ' + n((V * 1000) / S3, 1) + ' ≈ ' + q(Ig, 'A', 2) + '.',
        ],
        check: '√3·ωC·V 로도 계산해 보면 √3 × ' + n(w, 2) + ' × ' + n(C * 1e-6, 8) + ' × ' + n(V * 1000) + ' ≈ ' + n(S3 * w * C * 1e-6 * V * 1000, 2) + ' A. 같아.',
        traps: ['3ωCE에서 E는 상전압이야. 선간전압을 넣으면 √3배 커져.', 'kV는 V로(×1000), μF는 F로(×10⁻⁶) 바꿔서 계산해.'],
      };
    },
  });

  // ───────── 전력공학: 송전 전력·충전 ─────────
  const LINES = [
    [154, 154],
    [154, 150],
    [66, 66],
    [66, 64],
    [345, 345],
    [22.9, 22.9],
  ];

  T({
    id: 'pw-power-transfer',
    concept: 'pw-stability',
    gen(r) {
      const [Vs, Vr] = r.pick(LINES);
      const X = r.pick([5, 10, 20, 30, 40, 50, 60, 80, 100]);
      const d = r.pick([30, 60, 90]);
      const P = (Vs * Vr * Math.sin(d * DEG)) / X;
      if (P < 1) return null;
      return {
        params: { Vs, Vr, X, d },
        text: '송전단 전압 ' + q(Vs, 'kV') + ', 수전단 전압 ' + q(Vr, 'kV') + '(모두 선간전압), 선로 리액턴스 ' + q(X, 'Ω') + '인 3상 송전선에서 두 전압의 위상차가 ' + q(d, '°') + '일 때 송전 전력은 약 몇 MW야? (저항·충전용량은 무시)',
        formula: 'P = Vs·Vr·sinδ / X',
        unit: 'MW',
        decimals: 1,
        answer: P,
        distractors: [
          { v: (Vs * Vr) / X, why: 'sinδ를 빼먹었어. 위상차가 90°가 아니면 P = VsVr·sinδ/X 로 줄어들어.' },
          { v: (Vs * Vr * Math.cos(d * DEG)) / X, why: 'sin 대신 cos를 썼어. 송전 전력은 sinδ에 비례해.' },
          { v: (S3 * Vs * Vr * Math.sin(d * DEG)) / X, why: '선간전압을 이미 썼는데 √3을 또 곱했어. 이 식은 선간전압 그대로 VsVr/X 야.' },
          { v: (Vs * Vr * Math.sin(d * DEG)) / (S3 * X), why: '√3으로 나눴어. 선간전압을 쓰는 이 식에는 √3이 없어.' },
          { v: (Vs * Vr * Math.sin(d * DEG)) / X / 2, why: '식에 없는 2로 나눴어.' },
        ],
        conclusion: 'P = VsVr·sinδ/X = ' + n(Vs) + ' × ' + n(Vr) + ' × sin' + d + '° ÷ ' + n(X) + ' ≈ ' + q(P, 'MW', 1),
        steps: [
          '3상 송전 전력은 선간전압을 쓰면 P = Vs·Vr·sinδ / X [MW](kV²/Ω = MW).',
          'sin ' + d + '° = ' + n(Math.sin(d * DEG), 4) + '.',
          'P = ' + n(Vs) + ' × ' + n(Vr) + ' × ' + n(Math.sin(d * DEG), 4) + ' ÷ ' + n(X) + ' ≈ ' + q(P, 'MW', 1) + '.',
        ],
        check: 'δ = 90°일 때 최대 전력은 ' + n((Vs * Vr) / X, 1) + ' MW야. 지금 값(' + n(P, 1) + ' MW)은 그보다 작거나 같아야 해.',
        traps: ['δ가 90°이면 sinδ = 1이라서 최대 송전 전력이 VsVr/X 야.', '전압이 같으면 전압을 2배로 올릴 때 송전 전력은 4배가 돼.'],
      };
    },
  });

  T({
    id: 'pw-charging',
    concept: 'pw-stability',
    gen(r) {
      const mode = r.pick(['Qc', 'Ic']);
      const V = r.pick([22.9, 66, 154, 345]);
      const C = r.pick([0.1, 0.2, 0.3, 0.5, 1, 2]);
      const f = r.pick([50, 60]);
      const w = 2 * PI * f;
      const Qc = (w * C * 1e-6 * V * 1000 * V * 1000) / 1000; // kvar
      const Ic = w * C * 1e-6 * ((V * 1000) / S3); // A
      const head = '선간전압 ' + q(V, 'kV') + '인 3상 송전선의 1선당 대지 정전용량이 ' + q(C, 'μF') + '이야(' + n(f) + ' Hz). ';
      if (mode === 'Qc') {
        return {
          params: { mode, V, C, f },
          text: head + '이 선로의 3상 충전용량은 약 몇 kvar야?',
          formula: 'Qc = ωCV² (3상, V: 선간전압)',
          unit: 'kvar',
          decimals: 1,
          answer: Qc,
          distractors: [
            { v: Qc / 3, why: '상전압 E = V/√3을 쓰고 한 상의 값만 구했어. 3상 합은 3ωCE² = ωCV²야.' },
            { v: 3 * Qc, why: 'V² 자리에 선간전압을 넣고 3까지 곱했어. 3ωCE² 에서 E² = V²/3이라서 결국 ωCV² 야.' },
            { v: S3 * Qc, why: '전압에 √3을 잘못 곱했어. Qc = ωCV²야.' },
            { v: Qc / S3, why: '√3으로 나눴어. 3상 충전용량에는 √3이 따로 없어.' },
          ],
          conclusion: 'Qc = ωCV² = 2π × ' + n(f) + ' × ' + n(C) + '×10⁻⁶ × (' + n(V) + '×10³)² ≈ ' + q(Qc, 'kvar', 1),
          steps: ['충전용량(3상)은 Qc = 3ωC·E² 이고 E² = V²/3 이라서 Qc = ωCV².', 'ω = 2π × ' + n(f) + ' = ' + n(w, 2) + ' rad/s, V = ' + n(V * 1000) + ' V, C = ' + n(C * 1e-6, 8) + ' F.', 'Qc = ' + n(w, 2) + ' × ' + n(C * 1e-6, 8) + ' × ' + n(V * 1000) + '² ≈ ' + n(Qc * 1000, 0) + ' var ≈ ' + q(Qc, 'kvar', 1) + '.'],
          check: '충전전류 Ic = ωC·E = ' + n(Ic, 2) + ' A 이고 3·E·Ic = 3 × ' + n((V * 1000) / S3, 1) + ' × ' + n(Ic, 2) + ' ≈ ' + n(3 * ((V * 1000) / S3) * Ic / 1000, 1) + ' kvar. 같아.',
          traps: ['전압은 kV가 아니라 V로(×1000) 바꿔서 제곱해.', 'Qc = ωCV²(선간전압)과 3ωCE²(상전압)은 같은 값이야. 섞어 쓰지 마.'],
        };
      }
      return {
        params: { mode, V, C, f },
        text: head + '이 선로에 흐르는 충전전류(한 선당)는 약 몇 A야?',
        formula: 'Ic = ωC·E = ωC·V/√3',
        unit: 'A',
        decimals: 2,
        answer: Ic,
        distractors: [
          { v: S3 * Ic, why: '상전압 E = V/√3 대신 선간전압 V를 그대로 곱했어.' },
          { v: Ic / S3, why: 'V/√3을 한 번 더 나눴어. 충전전류에는 상전압 E를 한 번만 써.' },
          { v: 3 * Ic, why: '3상 합(3ωCE)을 구했어. 문제는 한 선당 충전전류야.' },
          { v: Ic * 1000, why: 'V와 kV를 섞었어. kV를 V로 바꿔 계산하면 결과는 A로 나와.' },
        ],
        conclusion: 'Ic = ωC·V/√3 = ' + n(w, 2) + ' × ' + n(C * 1e-6, 8) + ' × ' + n(V * 1000) + '/√3 ≈ ' + q(Ic, 'A', 2),
        steps: ['한 선의 충전전류는 상전압 E에 걸린 정전용량 전류: Ic = ωC·E, E = V/√3.', 'E = ' + n(V * 1000) + ' ÷ √3 = ' + n((V * 1000) / S3, 1) + ' V, ω = ' + n(w, 2) + ' rad/s.', 'Ic = ' + n(w, 2) + ' × ' + n(C * 1e-6, 8) + ' × ' + n((V * 1000) / S3, 1) + ' ≈ ' + q(Ic, 'A', 2) + '.'],
        check: '3상 충전용량 3·E·Ic = ' + n(3 * ((V * 1000) / S3) * Ic / 1000, 1) + ' kvar = ωCV² = ' + n(Qc, 1) + ' kvar. 같아.',
        traps: ['충전전류는 선간전압이 아니라 상전압 E = V/√3 에 걸려서 흘러.', 'μF는 ×10⁻⁶, kV는 ×1000 으로 바꿔서 계산해.'],
      };
    },
  });

  // ───────── 제어공학: 루스 판별 ─────────
  const poly = (co) => {
    // 4차식 s⁴ + a s³ + b s² + c s + d = 0 을 글자로
    const sup = ['⁴', '³', '²', '', ''];
    const parts = [];
    co.forEach((c, i) => {
      const deg = 4 - i;
      if (c === 0) return;
      const mag = Math.abs(c);
      const body = (mag === 1 && deg > 0 ? '' : String(mag)) + (deg > 0 ? 's' + sup[i] : '');
      parts.push((parts.length ? (c < 0 ? ' − ' : ' + ') : c < 0 ? '−' : '') + body);
    });
    return parts.join('');
  };
  // s⁴ + a s³ + b s² + c s + d 의 루스 표: 첫 열과 행 반환(첫 열에 0이 있으면 null)
  function routh4(a, b, c, d) {
    const b1 = (a * b - c) / a;
    const c1 = (b1 * c - a * d) / b1;
    if (!isFinite(b1) || !isFinite(c1) || b1 === 0 || c1 === 0) return null;
    const col = [1, a, b1, c1, d];
    let changes = 0;
    for (let i = 1; i < col.length; i++) if (col[i] * col[i - 1] < 0) changes++;
    return { b1, c1, col, changes };
  }

  T({
    id: 'cs-routh-count',
    concept: 'cs-routh',
    noCalc: true,
    gen(r) {
      const pool = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 8, 10];
      const a = r.pick(pool);
      const b = r.pick(pool);
      const c = r.pick(pool);
      const d = r.pick(pool);
      const R = routh4(a, b, c, d);
      if (!R || R.changes < 1) return null;
      const k = R.changes;
      const lab = (v) => v + '개';
      const why = (v) => v + '개는 루스 표 첫 열의 부호가 바뀐 횟수를 잘못 센 거야. +에서 −로, −에서 +로 바뀔 때마다 하나씩 세야 해.';
      return {
        params: { a, b, c, d },
        text: '특성방정식 ' + poly([1, a, b, c, d]) + ' = 0 인 계에서 s 평면의 우반면(실수부가 양수)에 있는 근은 몇 개야?',
        formula: '루스 표 첫 열의 부호가 바뀐 횟수 = 우반면 근의 수',
        unit: '개',
        label: lab,
        answer: k,
        distractors: [1, 2, 3, 4].filter((x) => x !== k).map((x) => ({ v: x, why: why(x) })),
        conclusion: '루스 표 첫 열 1, ' + n(a) + ', ' + n(R.b1, 3) + ', ' + n(R.c1, 3) + ', ' + n(d) + ' 에서 부호가 ' + k + '번 바뀌어서 우반면 근은 ' + k + '개',
        steps: [
          '루스 표를 만들어. s⁴ 행: 1, ' + n(b) + ', ' + n(d) + ' / s³ 행: ' + n(a) + ', ' + n(c) + '.',
          's² 행 첫 값 = (' + n(a) + '×' + n(b) + ' − 1×' + n(c) + ')/' + n(a) + ' = ' + n(R.b1, 3) + ', s² 행 둘째 값 = ' + n(d) + '.',
          's¹ 행 값 = (' + n(R.b1, 3) + '×' + n(c) + ' − ' + n(a) + '×' + n(d) + ')/' + n(R.b1, 3) + ' = ' + n(R.c1, 3) + ', s⁰ 행 값 = ' + n(d) + '.',
          '첫 열: 1, ' + n(a) + ', ' + n(R.b1, 3) + ', ' + n(R.c1, 3) + ', ' + n(d) + ' → 부호 변화 ' + k + '번 → 우반면 근 ' + k + '개.',
        ],
        check: '첫 열에 0이 없고 부호가 ' + k + '번 바뀌었으니 불안정 근이 ' + k + '개야(루스 판별법).',
        traps: ['계수 중 음수나 0이 있으면 이미 불안정이야. 그래도 개수는 루스 표로 세야 해.', '첫 열에 0이 나오면 특별한 경우(이 문제에는 나오지 않아)야.'],
      };
    },
  });

  T({
    id: 'cs-kmax',
    concept: 'cs-routh',
    gen(r) {
      const a = r.pick([1, 2, 3, 4, 5, 6, 8, 10]);
      const b = r.pick([1, 2, 3, 4, 5, 6, 8, 10]);
      const Kmax = a * b * (a + b);
      return {
        params: { a, b },
        text: '개루프 전달함수 G(s)H(s) = K / {s(s + ' + a + ')(s + ' + b + ')} 인 단위 부궤환 제어계가 안정하기 위한 K의 최댓값(한계값)은?',
        formula: '특성방정식 s³ + (a+b)s² + ab·s + K = 0 → K < ab(a+b)',
        unit: '',
        answer: Kmax,
        distractors: [
          { v: a * b, why: '3차식의 안정 조건 (a+b)·ab > K 에서 (a+b)를 곱하는 걸 빼먹었어.' },
          { v: a + b, why: 's² 계수만 골랐어. 조건은 s² 계수 × s 계수 > 상수항이야.' },
          { v: (a * b * (a + b)) / 2, why: '루스 표의 s¹ 행 값 (a+b)·ab − K 를 0으로 놓은 건데 2로 나눌 이유가 없어.' },
          { v: a * b * (a + b) * (a + b), why: '(a+b)를 두 번 곱했어.' },
        ],
        conclusion: 'K < ab(a+b) = ' + n(a) + '×' + n(b) + '×' + n(a + b) + ' = ' + n(Kmax),
        steps: [
          '단위 부궤환이니까 특성방정식은 1 + G(s)H(s) = 0 → s(s+' + a + ')(s+' + b + ') + K = 0.',
          '전개하면 s³ + ' + (a + b) + 's² + ' + a * b + 's + K = 0.',
          '3차식 s³ + A s² + B s + C 가 안정하려면 A·B > C 이므로 ' + (a + b) + ' × ' + a * b + ' > K.',
          '그래서 K의 한계값은 ' + n(Kmax) + '.',
        ],
        check: '루스 표 s¹ 행 첫 값 = (' + (a + b) + '×' + a * b + ' − K)/' + (a + b) + ' 이 0이 되는 K = ' + n(Kmax) + '. 같아.',
        traps: ['K가 이 값보다 커지면 불안정하고, 정확히 같으면 지속 진동(한계 안정)이야.', 'K > 0 도 조건이라서 안정 범위는 0 < K < ' + n(Kmax) + '.'],
      };
    },
  });

  // ───────── 제어공학: 2차계 응답 ─────────
  const ZETA = [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  const mp = (z) => 100 * Math.exp((-PI * z) / Math.sqrt(1 - z * z));

  T({
    id: 'cs-overshoot',
    concept: 'cs-response',
    gen(r) {
      const z = r.pick(ZETA);
      const useTf = r.chance(0.5);
      let K;
      let a;
      let text;
      if (useTf) {
        K = r.pick([4, 9, 16, 25, 36, 49, 64, 100]);
        a = 2 * z * Math.sqrt(K);
        if (!F.isNice(a, 2) || a < 0.2) return null;
        text = '폐루프 전달함수가 C(s)/R(s) = ' + K + ' / (s² + ' + n(a) + 's + ' + K + ') 인 계에 단위 계단 입력을 넣었을 때 최대 오버슈트는 약 몇 %야?';
      } else {
        text = '감쇠비 ζ = ' + n(z) + '인 2차 제어계(부족 감쇠)에 단위 계단 입력을 넣었을 때 최대 오버슈트는 약 몇 %야?';
      }
      const M = mp(z);
      return {
        params: { useTf, z, K, a },
        text,
        formula: 'Mp = exp(−πζ / √(1−ζ²)) × 100 [%],  ζ = a / (2√K)',
        unit: '%',
        decimals: 1,
        answer: M,
        distractors: [
          { v: 100 * Math.exp(-PI * z), why: '지수의 분모 √(1−ζ²)를 빼먹었어. ζ가 클수록 이 항이 중요해져.' },
          { v: 100 * (1 - z), why: '오버슈트는 (1−ζ)×100 같은 선형식이 아니라 지수함수 식으로 구해.' },
          { v: 100 * Math.exp((-PI * z) / (1 - z * z)), why: '근호 √를 씌우지 않았어. 분모는 √(1−ζ²)야.' },
          { v: 100 * Math.exp((-z) / Math.sqrt(1 - z * z)), why: '지수에 π가 빠졌어. Mp = exp(−πζ/√(1−ζ²))야.' },
        ],
        conclusion: (useTf ? 'ζ = a/(2√K) = ' + n(a) + '/(2×' + n(Math.sqrt(K)) + ') = ' + n(z) + ' → ' : '') + 'Mp = exp(−π×' + n(z) + '/√(1−' + n(z) + '²)) × 100 ≈ ' + q(M, '%', 1),
        steps: (useTf
          ? ['분모가 s² + a s + K 꼴이야: ωn = √K = ' + n(Math.sqrt(K)) + ', 2ζωn = a = ' + n(a) + '.', 'ζ = a/(2ωn) = ' + n(a) + '/(2×' + n(Math.sqrt(K)) + ') = ' + n(z) + '.']
          : ['감쇠비 ζ = ' + n(z) + '가 주어졌어(0 < ζ < 1이라 부족 감쇠).']
        ).concat(['√(1−ζ²) = √(1−' + n(z * z, 4) + ') = ' + n(Math.sqrt(1 - z * z), 4) + '.', '지수 = −π × ' + n(z) + ' ÷ ' + n(Math.sqrt(1 - z * z), 4) + ' = ' + n((-PI * z) / Math.sqrt(1 - z * z), 4) + ' → e의 이 거듭제곱 = ' + n(Math.exp((-PI * z) / Math.sqrt(1 - z * z)), 4) + '.', 'Mp = ' + n(Math.exp((-PI * z) / Math.sqrt(1 - z * z)), 4) + ' × 100 ≈ ' + q(M, '%', 1) + '.']),
        check: 'ζ가 작을수록 오버슈트가 커져. ζ = ' + n(z) + '이면 ' + n(M, 1) + ' %는 그럴듯한 크기야(ζ = 0.5 → 약 16 %, ζ = 0.7 → 약 4.6 %).',
        traps: ['ζ ≥ 1이면 오버슈트가 없어서 이 식을 쓰지 않아.', 's² + a s + K 에서 a = 2ζωn 이라서 ζ를 구할 때 2로 나눠.'],
      };
    },
  });

  T({
    id: 'cs-damping',
    concept: 'cs-response',
    gen(r) {
      const wn = r.pick([2, 4, 5, 8, 10]);
      const z = r.pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.8]);
      const K = wn * wn;
      const a = 2 * z * wn;
      if (!F.isNice(a, 2)) return null;
      return {
        params: { K, a },
        text: '폐루프 전달함수가 C(s)/R(s) = ' + K + ' / (s² + ' + n(a) + 's + ' + K + ') 인 2차 제어계의 감쇠비 ζ는?',
        formula: 'ζ = a / (2√K)  (s² + a s + K)',
        unit: '',
        decimals: 2,
        answer: z,
        distractors: [
          { v: a / wn, why: '2를 나누는 걸 빼먹었어. a = 2ζωn 이라서 ζ = a/(2ωn)이야.' },
          { v: a / (2 * K), why: 'ωn = √K인데 K를 그대로 썼어. 분모는 2√K야.' },
          { v: a / K, why: '2와 √를 모두 빼먹었어.' },
          { v: (2 * wn) / a, why: '분자와 분모를 뒤집었어.' },
        ],
        conclusion: 'ζ = a/(2√K) = ' + n(a) + '/(2×' + n(wn) + ') = ' + n(z),
        steps: ['표준형 s² + 2ζωn·s + ωn² 과 비교해.', 'ωn² = ' + K + ' → ωn = ' + n(wn) + ' rad/s.', '2ζωn = ' + n(a) + ' → ζ = ' + n(a) + ' ÷ (2 × ' + n(wn) + ') = ' + n(z) + '.'],
        check: '2 × ' + n(z) + ' × ' + n(wn) + ' = ' + n(a) + '. 분모의 s 계수와 같아.',
        traps: ['ωn² 은 상수항이야. ωn = √(상수항)을 먼저 구해.', 'ζ < 1이면 출렁이며 수렴(부족 감쇠), ζ = 1이면 임계, ζ > 1이면 진동 없음.'],
      };
    },
  });

  // ───────── 전기기기: 사이리스터 ─────────
  const E_LIST = [100, 200, 220, 380];
  const CONST = { half: Math.SQRT2 / PI, full: (2 * Math.SQRT2) / PI };

  T({
    id: 'mc-thyristor',
    concept: 'mc-thyristor',
    gen(r) {
      const type = r.pick(['half-R', 'full-R', 'full-L']);
      const E = r.pick(E_LIST);
      const al = type === 'full-L' ? r.pick([30, 60]) : r.pick([30, 60, 90, 120]);
      const c = Math.cos(al * DEG);
      const kHalf = CONST.half;
      const kFull = CONST.full;
      let Ed;
      let name;
      let fx;
      let ds;
      if (type === 'half-R') {
        Ed = (kHalf * E * (1 + c)) / 2;
        name = '단상 반파 위상제어 정류회로(저항부하)';
        fx = 'Ed = 0.45E·(1 + cosα)/2';
        ds = [
          { v: kHalf * E * (1 + c), why: '반파는 (1 + cosα)를 2로 나눠야 해. 2로 나누는 걸 빼먹었어.' },
          { v: kHalf * E * c, why: '(1 + cosα) 자리에 cosα만 썼어. 저항부하 반파는 (1 + cosα)/2야.' },
          { v: (kFull * E * (1 + c)) / 2, why: '전파 정류의 계수 0.9를 썼어. 반파는 0.45야.' },
          { v: kHalf * E, why: '제어각 α를 무시했어. α = 0°일 때만 이 값이야.' },
        ];
      } else if (type === 'full-R') {
        Ed = (kFull * E * (1 + c)) / 2;
        name = '단상 전파 위상제어 정류회로(저항부하)';
        fx = 'Ed = 0.9E·(1 + cosα)/2';
        ds = [
          { v: kFull * E * (1 + c), why: '(1 + cosα)를 2로 나누는 걸 빼먹었어.' },
          { v: kFull * E * c, why: '(1 + cosα) 자리에 cosα만 썼어. cosα만 쓰는 건 유도성 부하일 때야.' },
          { v: (kHalf * E * (1 + c)) / 2, why: '반파 정류의 계수 0.45를 썼어. 전파는 0.9야.' },
          { v: kFull * E, why: '제어각 α를 무시했어.' },
        ];
      } else {
        Ed = kFull * E * c;
        name = '인덕턴스가 매우 큰 단상 전파 위상제어 정류회로(전류가 끊어지지 않는 부하)';
        fx = 'Ed = 0.9E·cosα';
        ds = [
          { v: (kFull * E * (1 + c)) / 2, why: '저항부하 공식을 썼어. 유도성 부하(전류 연속)는 0.9E·cosα야.' },
          { v: kHalf * E * c, why: '반파 계수 0.45를 썼어. 전파는 0.9야.' },
          { v: kFull * E * (1 + c), why: '(1 + cosα) 형태는 저항부하 식이야.' },
          { v: kFull * E, why: '제어각 α를 무시했어.' },
        ];
      }
      if (Ed <= 0) return null;
      return {
        params: { type, E, alpha: al },
        text: name + '에서 교류 전원 전압의 실효값이 ' + q(E, 'V') + '이고 제어각이 ' + q(al, '°') + '일 때 평균 출력전압은 약 몇 V야?',
        formula: fx,
        unit: 'V',
        decimals: 1,
        answer: Ed,
        distractors: ds,
        conclusion: 'Ed = ' + (type === 'half-R' ? '0.45' : '0.9') + ' × ' + n(E) + (type === 'full-L' ? ' × cos' + al + '°' : ' × (1 + cos' + al + '°)/2') + ' ≈ ' + q(Ed, 'V', 1),
        steps: [
          type === 'full-L' ? '전류가 끊어지지 않는 단상 전파(브리지)는 Ed = 0.9E·cosα 야.' : '저항부하 ' + (type === 'half-R' ? '단상 반파' : '단상 전파') + '는 ' + fx + ' 야(계수 ' + (type === 'half-R' ? '0.45' : '0.9') + ').',
          'cos ' + al + '° = ' + n(c, 3) + '.',
          '계산하면 Ed ≈ ' + q(Ed, 'V', 1) + '.',
        ],
        check: 'α = 0°일 때의 출력(' + n(type === 'half-R' ? kHalf * E : kFull * E, 1) + ' V)보다 작아야 해(제어각을 늦추면 출력이 줄어). 지금 ' + n(Ed, 1) + ' V라서 맞아.',
        traps: ['α가 클수록 평균 출력이 줄어. 90°에서 저항부하 반파·전파는 절반이야.', '저항부하는 (1+cosα)/2, 유도성 부하(연속 전류)는 cosα 로 식이 달라.'],
      };
    },
  });

  // ───────── 전기기기: 단권변압기·병렬운전 ─────────
  const PAIRS = [
    [100, 110],
    [200, 220],
    [3000, 3300],
    [6000, 6600],
    [220, 380],
    [110, 220],
    [3300, 6600],
    [22900, 6600],
    [380, 220],
  ];

  T({
    id: 'mc-autotr',
    concept: 'mc-autotr',
    gen(r) {
      const [V1, V2] = r.pick(PAIRS);
      const flip = r.chance(0.5);
      const Vin = flip ? V2 : V1; // 전원측
      const Vout = flip ? V1 : V2; // 부하측
      const S = r.pick([20, 50, 100, 200, 300, 500, 1000]);
      const Vh = Math.max(Vin, Vout);
      const Vl = Math.min(Vin, Vout);
      const Sself = (S * (Vh - Vl)) / Vh;
      if (!F.isNice(Sself, 1)) return null;
      const up = Vout > Vin;
      return {
        params: { V1: Vin, V2: Vout, S },
        text: '단권변압기로 ' + q(Vin, 'V') + ' 전원을 ' + q(Vout, 'V') + '로 ' + (up ? '승압' : '강압') + '해서 ' + q(S, 'kVA') + ' 부하에 공급해. 단권변압기 자체의 용량(자기용량)은 약 몇 kVA야?',
        formula: '자기용량 = 부하용량 × (Vh − Vl) / Vh',
        unit: 'kVA',
        decimals: 1,
        answer: Sself,
        distractors: [
          { v: (S * (Vh - Vl)) / Vl, why: '분모에 낮은 쪽 전압을 썼어. 분모는 높은 쪽 전압이야.' },
          { v: (S * Vl) / Vh, why: '비율을 거꾸로 잡았어. (낮은 전압/높은 전압)은 자기용량이 아니라 나머지 "전달 용량"에 해당해.' },
          { v: (S * Vh) / (Vh - Vl), why: '분자와 분모를 뒤집었어. 자기용량은 부하용량보다 작아야 해.' },
          { v: S * (Vh - Vl) / 1000, why: '단위를 임의로 1000으로 나눴어. 비율만 곱하면 kVA 그대로야.' },
        ],
        conclusion: '자기용량 = ' + n(S) + ' × (' + n(Vh) + ' − ' + n(Vl) + ') / ' + n(Vh) + ' = ' + q(Sself, 'kVA', 1),
        steps: ['단권변압기 자기용량 / 부하용량 = (Vh − Vl) / Vh. 높은 쪽 전압이 분모야.', 'Vh = ' + n(Vh) + ' V, Vl = ' + n(Vl) + ' V → (' + n(Vh) + ' − ' + n(Vl) + ') / ' + n(Vh) + ' = ' + n((Vh - Vl) / Vh, 4) + '.', n(S) + ' × ' + n((Vh - Vl) / Vh, 4) + ' = ' + q(Sself, 'kVA', 1) + '.'],
        check: '자기용량(' + n(Sself, 1) + ' kVA)은 부하용량(' + n(S) + ' kVA)보다 작아야 하고, 두 전압이 가까울수록 훨씬 작아져. 맞아.',
        traps: ['승압이든 강압이든 분모는 높은 쪽 전압이야.', '자기용량은 항상 부하용량보다 작아(그래서 단권변압기가 경제적).'],
      };
    },
  });

  T({
    id: 'mc-tr-parallel',
    concept: 'mc-tr-parallel',
    gen(r) {
      const S1 = r.pick([50, 100, 150, 200, 300, 500]);
      const S2 = r.pick([50, 100, 150, 200, 300, 500]);
      const z1 = r.pick([3, 4, 5, 6, 8]);
      const z2 = r.pick([3, 4, 5, 6, 8]);
      const a1 = S1 / z1;
      const a2 = S2 / z2;
      if (Math.abs(a1 - a2) < 1e-9 || S1 === S2) return null;
      const P = r.pick([100, 150, 200, 300, 400, 500, 600, 800]);
      if (P > S1 + S2) return null;
      const P1 = (P * a1) / (a1 + a2);
      return {
        params: { S1, S2, z1, z2, P },
        text: '같은 전압비의 단상 변압기 두 대를 병렬운전해. A는 ' + q(S1, 'kVA') + '에 %임피던스 ' + q(z1, '%') + ', B는 ' + q(S2, 'kVA') + '에 %임피던스 ' + q(z2, '%') + '이야. 합계 ' + q(P, 'kVA') + ' 부하를 걸면 A가 분담하는 부하는 약 몇 kVA야?',
        formula: 'P₁ = P × (S₁/%Z₁) / (S₁/%Z₁ + S₂/%Z₂)',
        unit: 'kVA',
        decimals: 1,
        answer: P1,
        distractors: [
          { v: (P * S1) / (S1 + S2), why: '용량 비로만 나눴어. %임피던스가 작은 쪽이 더 많이 맡으니까 S/%Z 비로 나눠야 해.' },
          { v: (P * z2) / (z1 + z2), why: '%Z 비로만 나눴어. 용량도 함께 반영해야 해(S/%Z).' },
          { v: (P * S1 * z1) / (S1 * z1 + S2 * z2), why: '%Z를 곱했어. 분담은 %Z에 "반비례"라서 나눠야 해(S/%Z).' },
          { v: (P * a2) / (a1 + a2), why: 'A와 B를 바꿔 B의 분담을 구했어. 문제는 A의 분담이야.' },
        ],
        conclusion: 'P₁ = ' + n(P) + ' × (' + n(S1) + '/' + n(z1) + ') / (' + n(S1) + '/' + n(z1) + ' + ' + n(S2) + '/' + n(z2) + ') ≈ ' + q(P1, 'kVA', 1),
        steps: ['병렬운전 부하는 "용량 ÷ %임피던스"의 비로 나눠져.', 'A: ' + n(S1) + '/' + n(z1) + ' = ' + n(a1, 3) + ', B: ' + n(S2) + '/' + n(z2) + ' = ' + n(a2, 3) + '.', 'A의 몫 = ' + n(a1, 3) + ' / (' + n(a1, 3) + ' + ' + n(a2, 3) + ') = ' + n(a1 / (a1 + a2), 4) + '.', 'P₁ = ' + n(P) + ' × ' + n(a1 / (a1 + a2), 4) + ' ≈ ' + q(P1, 'kVA', 1) + '.'],
        check: 'A와 B의 분담을 더하면 ' + n(P1, 1) + ' + ' + n(P - P1, 1) + ' = ' + n(P) + ' kVA. 합계 부하와 같아.',
        traps: ['%임피던스가 작은 쪽이 더 많이 맡아서 먼저 과부하가 걸려.', '용량이 같아도 %Z가 다르면 부하가 불균등하게 나눠져.'],
      };
    },
  });

  // ───────── 전기자기학: 전자파 ─────────
  T({
    id: 'em-wave-impedance',
    concept: 'em-wave',
    gen(r) {
      const er = r.pick([1, 2.25, 4, 9, 16, 25, 36, 49, 64, 81]);
      const ur = r.pick([1, 1, 1, 4, 9]);
      if (er === 1 && ur === 1) return null;
      const eta0 = 120 * PI;
      const eta = eta0 * Math.sqrt(ur / er);
      return {
        params: { er, ur },
        text: '비유전율 εr = ' + n(er) + ', 비투자율 μr = ' + n(ur) + '인 매질에서 전자파의 고유임피던스는 약 몇 Ω이야? (진공의 고유임피던스는 377 Ω)',
        formula: 'η = 377·√(μr/εr)',
        unit: 'Ω',
        decimals: 1,
        answer: eta,
        distractors: [
          { v: eta0 * Math.sqrt(er / ur), why: 'μr과 εr을 거꾸로 넣었어. η = √(μ/ε)라서 μ가 분자야.' },
          { v: eta0 * (ur / er), why: '제곱근을 빼먹었어. η = 377·√(μr/εr)이야.' },
          { v: eta0 * Math.sqrt(er * ur), why: '분수가 아니라 곱의 제곱근을 썼어. 그건 속도를 줄이는 인자야(v = c/√(εrμr)).' },
          { v: eta0 / Math.sqrt(er * ur), why: '이것도 곱의 제곱근이야. 고유임피던스는 μr/εr 비율이야.' },
        ],
        conclusion: 'η = 377·√(μr/εr) = 377 × √(' + n(ur) + '/' + n(er) + ') ≈ ' + q(eta, 'Ω', 1),
        steps: ['고유임피던스 η = √(μ/ε) = √(μ₀/ε₀)·√(μr/εr) = 377·√(μr/εr).', 'μr/εr = ' + n(ur) + '/' + n(er) + ' = ' + n(ur / er, 4) + ' → √ = ' + n(Math.sqrt(ur / er), 4) + '.', '377 × ' + n(Math.sqrt(ur / er), 4) + ' ≈ ' + q(eta, 'Ω', 1) + '.'],
        check: '진공(εr = μr = 1)이면 377 Ω이고, εr이 클수록 η는 작아져야 해. 지금 ' + n(eta, 1) + ' Ω이라서 ' + (eta < eta0 ? '377보다 작아 맞아.' : '377보다 크니까 μr이 더 큰 매질이야 맞아.'),
        traps: ['μr은 분자(투자율), εr은 분모(유전율)야.', '속도 v = c/√(εrμr)은 곱, 고유임피던스는 비(μr/εr)로 달라.'],
      };
    },
  });

  T({
    id: 'em-wave-speed',
    concept: 'em-wave',
    gen(r) {
      const mode = r.pick(['v', 'lambda']);
      const er = r.pick([2.25, 4, 9, 16, 25, 36, 49, 64, 81]);
      const ur = r.pick([1, 1, 4, 9]);
      const c = 3e8;
      const v = c / Math.sqrt(er * ur);
      if (mode === 'v') {
        return {
          params: { mode, er, ur },
          text: '비유전율 εr = ' + n(er) + ', 비투자율 μr = ' + n(ur) + '인 매질 속에서 전자파의 전파 속도는 약 몇 ×10⁸ m/s야? (진공에서의 속도 c = 3×10⁸ m/s)',
          formula: 'v = c / √(εr·μr)',
          unit: '×10⁸ m/s',
          decimals: 2,
          answer: v / 1e8,
          distractors: [
            { v: (c * Math.sqrt(er * ur)) / 1e8, why: '속도는 매질에서 느려져야 해. c를 √(εrμr)로 "나눠야" 해.' },
            { v: (c / (er * ur)) / 1e8, why: '제곱근을 빼먹었어. v = c/√(εr·μr)이야.' },
            { v: (c / Math.sqrt(er / ur)) / 1e8, why: 'εr/μr의 제곱근을 썼어(고유임피던스 식과 헷갈림). 속도는 εr과 μr의 곱이야.' },
            { v: (c * Math.sqrt(ur / er)) / 1e8, why: '비율 √(μr/εr)을 곱했어. 속도에는 곱의 제곱근 √(εr·μr)이 분모로 들어가.' },
          ],
          conclusion: 'v = c/√(εrμr) = 3×10⁸ ÷ √(' + n(er) + ' × ' + n(ur) + ') ≈ ' + q(v / 1e8, '×10⁸ m/s', 2),
          steps: ['매질 속 전파 속도 v = 1/√(εμ) = c / √(εr·μr).', 'εr·μr = ' + n(er) + ' × ' + n(ur) + ' = ' + n(er * ur) + ' → √ = ' + n(Math.sqrt(er * ur), 4) + '.', 'v = 3×10⁸ ÷ ' + n(Math.sqrt(er * ur), 4) + ' ≈ ' + q(v / 1e8, '×10⁸ m/s', 2) + '.'],
          check: '진공에서 3×10⁸ m/s보다 느려야 하는데 ' + n(v / 1e8, 2) + '×10⁸ m/s 라서 맞아.',
          traps: ['매질 속에서 전파는 진공보다 항상 느려.', '속도에는 εr과 μr이 둘 다 분모에 들어가(곱의 제곱근).'],
        };
      }
      const f = r.pick([30, 60, 100, 150, 300]);
      const lam = v / (f * 1e6);
      return {
        params: { mode, er, ur, f },
        text: '비유전율 εr = ' + n(er) + ', 비투자율 μr = ' + n(ur) + '인 매질 속에서 주파수 ' + q(f, 'MHz') + '인 전자파의 파장은 약 몇 m야? (c = 3×10⁸ m/s)',
        formula: 'λ = v / f = c / (f·√(εr·μr))',
        unit: 'm',
        decimals: 3,
        answer: lam,
        distractors: [
          { v: (c * Math.sqrt(er * ur)) / (f * 1e6), why: '속도가 매질에서 느려지니까 √(εrμr)로 "나눠야" 해.' },
          { v: c / (f * 1e6), why: '진공에서의 파장이야. 매질에서는 √(εrμr)만큼 짧아져.' },
          { v: c / (er * ur) / (f * 1e6), why: '제곱근을 빼먹었어.' },
          { v: v / f, why: 'MHz를 Hz로(×10⁶) 바꾸지 않았어.' },
        ],
        conclusion: 'λ = v/f = 3×10⁸ / (√(' + n(er) + '×' + n(ur) + ') × ' + n(f) + '×10⁶) ≈ ' + q(lam, 'm', 3),
        steps: ['매질 속 속도 v = c/√(εrμr) = 3×10⁸ ÷ ' + n(Math.sqrt(er * ur), 4) + ' = ' + n(v / 1e8, 4) + '×10⁸ m/s.', '주파수 f = ' + n(f) + ' MHz = ' + n(f * 1e6) + ' Hz.', 'λ = v/f = ' + n(v, 0) + ' ÷ ' + n(f * 1e6) + ' ≈ ' + q(lam, 'm', 3) + '.'],
        check: '진공 파장 ' + n(c / (f * 1e6), 3) + ' m 보다 짧아야 해. 지금 ' + n(lam, 3) + ' m 라서 맞아.',
        traps: ['MHz는 ×10⁶ Hz로 바꿔서 나눠.', '매질에서는 파장도 √(εrμr)분의 1로 짧아져.'],
      };
    },
  });
})(globalThis.GISA);
