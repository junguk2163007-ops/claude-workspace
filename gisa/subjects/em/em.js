// 전기자기학 문제 템플릿 (진공·공기 기준: 1/(4πε₀) = 9×10⁹, ε₀ = 8.855×10⁻¹² F/m)
(function (G) {
  'use strict';
  const F = G.fmt;
  const n = F.num;
  const q = F.q;
  const qs = F.qs;
  const T = G.defineTemplate;
  const PI = Math.PI;
  const K = 9e9;
  const EPS0 = 8.855e-12;
  const ratioLabel = (v) => F.ratio(v) + '배';
  const sinOf = (deg) => (deg === 90 ? 1 : deg === 30 ? 0.5 : Math.sin((deg * PI) / 180));
  const cosOf = (deg) => (deg === 90 ? 0 : Math.cos((deg * PI) / 180));

  // ───────── 쿨롱의 법칙 ─────────
  T({
    id: 'em-coulomb-force',
    concept: 'em-coulomb',
    gen(r) {
      const Q1 = r.pick([1, 2, 3, 4, 5, 6, 8, 10]);
      const Q2 = r.pick([1, 2, 3, 4, 5, 6, 8, 10]);
      const d = r.pick([0.1, 0.2, 0.3, 0.5, 1, 2, 3]);
      const Fv = (K * Q1 * 1e-6 * Q2 * 1e-6) / (d * d);
      if (!F.isNice(Fv, 4) || Fv < 0.001 || Fv > 1000) return null;
      const same = r.chance(0.5);
      const unit = (v) => qs(v, 'N');
      return {
        params: { Q1, Q2, d },
        text: '진공 중에 ' + q(Q1, 'μC') + '과 ' + (same ? '' : '−') + q(Q2, 'μC') + '의 점전하가 ' + q(d, 'm') + ' 떨어져 있어. 두 전하 사이에 작용하는 힘의 크기는?',
        formula: 'F = 9×10⁹ × Q₁Q₂ / r²',
        label: unit,
        answer: Fv,
        distractors: [
          { v: (K * Q1 * Q2 * 1e-12) / d, why: '거리를 제곱하지 않았어. 쿨롱의 힘은 거리의 "제곱"에 반비례해.' },
          { v: (K * Q1 * Q2 * 1e-6) / (d * d), why: 'μC을 C로 바꾸는 걸 한 전하에만 했어. 두 전하 모두 10⁻⁶을 곱해야 해.' },
          { v: (K * Q1 * Q2 * 1e-12) / (2 * d), why: 'r²를 2r로 계산했어. 제곱은 r × r이야.' },
          { v: (K * (Q1 + Q2) * 1e-6) / (d * d), why: '두 전하를 곱하지 않고 더했어.' },
        ],
        conclusion: 'F = 9×10⁹ × ' + n(Q1) + '×10⁻⁶ × ' + n(Q2) + '×10⁻⁶ / ' + n(d) + '² = ' + unit(Fv) + (same ? ' (같은 부호라 반발력)' : ' (다른 부호라 흡인력)'),
        steps: [
          '단위 바꾸기: ' + n(Q1) + ' μC = ' + n(Q1) + ' × 10⁻⁶ C, ' + n(Q2) + ' μC = ' + n(Q2) + ' × 10⁻⁶ C.',
          '분자: 9×10⁹ × ' + n(Q1 * Q2) + ' × 10⁻¹² = ' + n(K * Q1 * Q2 * 1e-12, 4) + '.',
          '분모: r² = ' + n(d) + '² = ' + n(d * d, 4) + ' → F = ' + n(K * Q1 * Q2 * 1e-12, 4) + ' ÷ ' + n(d * d, 4) + ' = ' + unit(Fv) + '.',
          '힘의 크기를 물었으니 부호(−)는 방향만 알려 줘: ' + (same ? '같은 부호 → 반발.' : '다른 부호 → 흡인.'),
        ],
        check: '거리를 2배로 하면 힘은 1/4이 돼야 해: ' + unit(Fv / 4) + '. 공식에 2r를 넣어도 그렇게 나와.',
        traps: ['9×10⁹ × 10⁻⁶ × 10⁻⁶ = 9×10⁻³. μC 두 개면 이 숫자를 외워 두면 빨라.', '힘의 "크기"를 물으면 마이너스 부호는 버려.'],
      };
    },
  });

  T({
    id: 'em-coulomb-ratio',
    concept: 'em-coulomb',
    gen(r) {
      const a = r.pick([1, 2, 3, 4]);
      const b = r.pick([1, 2, 3]);
      if (a === 1 && b === 1) return null;
      const ans = a / (b * b);
      const parts = [];
      if (a !== 1) parts.push('한쪽 전하를 ' + a + '배');
      if (b !== 1) parts.push('거리를 ' + b + '배');
      return {
        params: { a, b },
        text: '두 점전하 사이에서 ' + parts.join(', ') + '로 하면 작용하는 힘은 처음의 몇 배가 될까?',
        formula: 'F ∝ Q₁Q₂ / r²',
        unit: '배',
        label: ratioLabel,
        answer: ans,
        distractors: [
          { v: a / b, why: '거리를 제곱하지 않았어. 힘은 거리의 제곱에 반비례해.' },
          { v: a * b * b, why: '거리가 멀어지면 힘이 커진다고 착각했어. 멀어지면 약해져.' },
          { v: (a * a) / (b * b), why: '한쪽 전하만 바꿨는데 전하를 제곱했어. 힘은 각 전하에 그냥 비례해.' },
          { v: (b * b) / a, why: '전하와 거리의 역할을 뒤집었어.' },
        ],
        conclusion: '전하 ' + a + '배 ÷ 거리² ' + b * b + '배 = ' + ratioLabel(ans),
        steps: [
          'F ∝ Q₁Q₂/r²: 전하에 비례, 거리 제곱에 반비례.',
          '전하 변화: × ' + a + '. 거리 변화: r² → ' + b + '² = ' + b * b + '배.',
          '합치면 ' + a + ' ÷ ' + b * b + ' = ' + ratioLabel(ans) + '.',
        ],
        check: '처음 Q₁ = Q₂ = 1, r = 1이면 F ∝ 1. 바꾼 뒤 Q₁ = ' + a + ', r = ' + b + ' → ' + a + '/' + b * b + ' = ' + F.ratio(ans) + '.',
        traps: ['"거리 2배 → 힘 1/4". 거리의 제곱을 꼭 챙겨.'],
      };
    },
  });

  // ───────── 전계와 전위 ─────────
  T({
    id: 'em-point',
    concept: 'em-efield',
    gen(r) {
      const Q = r.pick([1, 2, 3, 4, 5, 8, 10, 20]);
      const d = r.pick([0.1, 0.2, 0.3, 0.5, 1, 2, 3]);
      const askE = r.chance(0.5);
      const E = (9 * Q) / (d * d);
      const V = (9 * Q) / d;
      if (!F.isNice(askE ? E : V, 2)) return null;
      const lab = (u) => (v) => qs(v, u);
      if (askE) {
        return {
          params: { Q, d, ask: 'E' },
          text: '진공 중 ' + q(Q, 'nC') + '의 점전하에서 ' + q(d, 'm') + ' 떨어진 점의 전계의 세기는?',
          formula: 'E = 9×10⁹ × Q / r²  [V/m]',
          label: lab('V/m'),
          answer: E,
          distractors: [
            { v: V, why: '거리를 한 번만 나눴어. 그건 전위(V = 9×10⁹Q/r) 공식이야. 전계는 r².' },
            { v: (K * Q) / (d * d), why: 'nC을 C로 바꾸지 않았어. ' + n(Q) + ' nC = ' + n(Q) + ' × 10⁻⁹ C야.' },
            { v: (18 * Q) / (d * d), why: '9×10⁹ 대신 18×10⁹을 썼어. 18×10⁹은 무한 직선 전하용 상수야.' },
          ],
          conclusion: 'E = 9×10⁹ × ' + n(Q) + '×10⁻⁹ / ' + n(d) + '² = ' + qs(E, 'V/m'),
          steps: [
            '9×10⁹ × 10⁻⁹ = 9라서 nC이면 E = 9Q/r²로 간단해져.',
            'E = 9 × ' + n(Q) + ' ÷ ' + n(d * d, 4) + ' = ' + qs(E, 'V/m') + '.',
          ],
          check: '이 점의 전위는 9Q/r = ' + n(V) + ' V이고, 점전하에서는 E = V/r = ' + n(V) + '/' + n(d) + ' = ' + n(E) + ' V/m. 같아.',
          traps: ['전계(V/m)는 r², 전위(V)는 r. 단위로 구분해.'],
        };
      }
      return {
        params: { Q, d, ask: 'V' },
        text: '진공 중 ' + q(Q, 'nC') + '의 점전하에서 ' + q(d, 'm') + ' 떨어진 점의 전위는?',
        formula: 'V = 9×10⁹ × Q / r  [V]',
        label: lab('V'),
        answer: V,
        distractors: [
          { v: E, why: '거리를 제곱했어. 그건 전계(E = 9×10⁹Q/r²) 공식이야.' },
          { v: (K * Q) / d, why: 'nC을 C로 바꾸지 않았어.' },
          { v: 9 * Q * d, why: '거리로 나누지 않고 곱했어. 멀어질수록 전위는 낮아져.' },
        ],
        conclusion: 'V = 9×10⁹ × ' + n(Q) + '×10⁻⁹ / ' + n(d) + ' = ' + qs(V, 'V'),
        steps: ['nC이면 9×10⁹ × 10⁻⁹ = 9 → V = 9Q/r.', 'V = 9 × ' + n(Q) + ' ÷ ' + n(d) + ' = ' + qs(V, 'V') + '.'],
        check: 'E × r = ' + n(E) + ' × ' + n(d) + ' = ' + n(V) + ' V. 점전하에서 V = E·r 관계가 맞아.',
        traps: ['전위는 크기만 있는 값(스칼라), 전계는 방향도 있는 값(벡터)이야.'],
      };
    },
  });

  T({
    id: 'em-line',
    concept: 'em-efield',
    gen(r) {
      const lam = r.pick([1, 2, 3, 4, 5, 10]);
      const d = r.pick([0.1, 0.2, 0.5, 1, 2, 3]);
      const E = (18 * lam) / d;
      if (!F.isNice(E, 2)) return null;
      return {
        params: { lam, d },
        text: '진공 중에 선전하밀도 ' + q(lam, 'nC/m') + '인 무한히 긴 직선 전하가 있어. 직선에서 ' + q(d, 'm') + ' 떨어진 점의 전계의 세기는?',
        formula: 'E = λ/(2πε₀r) = 18×10⁹ × λ / r',
        unit: 'V/m',
        answer: E,
        distractors: [
          { v: (9 * lam) / d, why: '점전하 상수(9×10⁹)를 썼어. 선전하는 1/(2πε₀) = 18×10⁹이야.' },
          { v: (18 * lam) / (d * d), why: '거리를 제곱했어. 무한 직선 전하의 전계는 r에 한 번만 반비례해.' },
          { v: (9 * lam) / (d * d), why: '점전하 공식을 그대로 썼어.' },
        ],
        conclusion: 'E = 18×10⁹ × ' + n(lam) + '×10⁻⁹ / ' + n(d) + ' = ' + q(E, 'V/m'),
        steps: [
          '무한 직선 전하는 가우스 법칙으로 원통면을 잡으면 E·2πr = λ/ε₀ → E = λ/(2πε₀r).',
          '1/(2πε₀) = 2 × 9×10⁹ = 18×10⁹.',
          'E = 18 × ' + n(lam) + ' ÷ ' + n(d) + ' = ' + q(E, 'V/m') + '.',
        ],
        check: '거리를 2배로 하면 전계는 절반(' + n(E / 2) + ' V/m)이 돼야 해. 1/r 관계가 맞아.',
        traps: ['점(1/r²), 선(1/r), 무한 평면(거리와 무관). 모양에 따라 거리 관계가 달라져.'],
      };
    },
  });

  // ───────── 정전용량과 콘덴서 ─────────
  T({
    id: 'em-cap-scale',
    concept: 'em-capacitor',
    gen(r) {
      const a = r.pick([1, 2, 3, 4]);
      const b = r.pick([1, 2, 3, 4]);
      const e = r.pick([1, 1, 2, 3, 4, 5]);
      if (a === 1 && b === 1 && e === 1) return null;
      const ans = (e * a) / b;
      const parts = [];
      if (a !== 1) parts.push('극판 면적을 ' + a + '배');
      if (b !== 1) parts.push('극판 간격을 ' + b + '배');
      const tail = e !== 1 ? (parts.length ? '로 하고, ' : '') + '극판 사이를 비유전율 ' + e + '인 유전체로 채우면' : '로 하면';
      return {
        params: { a, b, e },
        text: '공기 평행판 콘덴서에서 ' + parts.join(', ') + tail + ' 정전용량은 몇 배가 될까?',
        formula: 'C = ε₀εₛS / d',
        unit: '배',
        label: ratioLabel,
        answer: ans,
        distractors: [
          { v: (e * b) / a, why: '면적과 간격의 역할을 거꾸로 했어. 면적은 분자, 간격은 분모야.' },
          { v: e * a * b, why: '간격을 분모가 아니라 분자에 뒀어. 간격이 넓어지면 용량은 줄어.' },
          { v: a / b, why: '비유전율(εₛ)을 빠뜨렸어. 유전체를 넣으면 εₛ배가 돼.' },
          { v: (e * a) / (b * b), why: '간격을 제곱했어. C는 d에 그냥 반비례해.' },
        ],
        conclusion: 'εₛ × S배 ÷ d배 = ' + e + ' × ' + a + ' ÷ ' + b + ' = ' + ratioLabel(ans),
        steps: [
          'C = ε₀εₛS/d: εₛ와 S에 비례, d에 반비례.',
          '바뀐 값: εₛ ×' + e + ', S ×' + a + ', d ×' + b + '.',
          'C는 ' + e + ' × ' + a + ' / ' + b + ' = ' + ratioLabel(ans) + '.',
        ],
        check: '극단으로 생각해 봐: 간격을 아주 넓히면 용량은 0에 가까워져야 해. d가 분모라 맞아.',
        traps: ['공기의 비유전율은 1. 유전체를 넣는 건 εₛ배를 곱하는 거야.'],
      };
    },
  });

  T({
    id: 'em-cap-plate',
    concept: 'em-capacitor',
    gen(r) {
      const S = r.pick([0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1]);
      const dmm = r.pick([0.5, 1, 2, 4, 5]);
      const es = r.pick([1, 2, 2.5, 4, 5]);
      const pF = (EPS0 * es * S) / (dmm * 1e-3) * 1e12;
      const lab = (v) => qs(v, 'pF');
      return {
        params: { S, dmm, es },
        text: '극판 면적 ' + q(S, 'm²') + ', 간격 ' + q(dmm, 'mm') + '인 평행판 콘덴서에 비유전율 ' + n(es) + '인 유전체를 채웠어. 정전용량은 약 몇 pF야? (ε₀ = 8.855 × 10⁻¹² F/m)',
        formula: 'C = ε₀εₛS / d',
        label: lab,
        answer: pF,
        distractors: [
          { v: (EPS0 * es * S) / dmm * 1e12, why: 'mm를 m로 바꾸지 않았어. ' + n(dmm) + ' mm = ' + n(dmm / 1000, 4) + ' m야.' },
          { v: (EPS0 * S) / (dmm * 1e-3) * 1e12, why: '비유전율 ' + n(es) + '을 곱하지 않았어.' },
          { v: ((EPS0 * es * (dmm * 1e-3)) / S) * 1e12, why: '면적과 간격을 뒤집었어. C = ε₀εₛS/d.' },
        ],
        conclusion: 'C = 8.855×10⁻¹² × ' + n(es) + ' × ' + n(S) + ' / ' + n(dmm / 1000, 4) + ' ≈ ' + lab(pF),
        steps: [
          '간격을 m로: ' + n(dmm) + ' mm = ' + n(dmm / 1000, 4) + ' m.',
          'C = ε₀εₛS/d = 8.855×10⁻¹² × ' + n(es) + ' × ' + n(S) + ' ÷ ' + n(dmm / 1000, 4) + ' = ' + F.sci(pF * 1e-12) + ' F.',
          'pF(10⁻¹² F)로 바꾸면 ' + lab(pF) + '.',
        ],
        check: '공기(εₛ = 1)라면 ' + lab(pF / es) + '이고, 유전체를 넣으니 ' + n(es) + '배가 된 게 맞아.',
        traps: ['p(피코) = 10⁻¹², n(나노) = 10⁻⁹, μ(마이크로) = 10⁻⁶.'],
      };
    },
  });

  T({
    id: 'em-cap-combo',
    concept: 'em-capacitor',
    gen(r) {
      const C1 = r.pick([1, 2, 3, 4, 5, 6, 8, 10, 12, 20]);
      const C2 = r.pick([1, 2, 3, 4, 5, 6, 8, 10, 12, 20]);
      const series = r.chance(0.6);
      const ser = (C1 * C2) / (C1 + C2);
      const par = C1 + C2;
      if (series && !F.isNice(ser, 2)) return null;
      const how = series ? '직렬' : '병렬';
      return {
        params: { C1, C2, how: series ? 'series' : 'parallel' },
        text: q(C1, 'μF') + '과 ' + q(C2, 'μF') + '의 콘덴서를 ' + how + '로 연결했어. 합성 정전용량은?',
        svg: series
          ? G.svg.series({ source: { kind: 'dc', label: 'V' }, parts: [{ type: 'C', label: q(C1, 'μF') }, { type: 'C', label: q(C2, 'μF') }] })
          : G.svg.parallel({ source: { kind: 'dc', label: 'V' }, branches: [{ type: 'C', label: q(C1, 'μF') }, { type: 'C', label: q(C2, 'μF') }] }),
        formula: '콘덴서: 병렬 C₁ + C₂,  직렬 C₁C₂/(C₁ + C₂)  (저항과 반대)',
        unit: 'μF',
        answer: series ? ser : par,
        distractors: series
          ? [
              { v: par, why: '저항 직렬처럼 그냥 더했어. 콘덴서는 직렬이면 오히려 작아져(곱 나누기 합).' },
              { v: (C1 + C2) / 2, why: '평균을 냈어. 직렬 합성용량은 작은 쪽보다도 작아.' },
              { v: C1 * C2, why: '곱만 하고 합으로 나누지 않았어.' },
            ]
          : [
              { v: ser, why: '저항 병렬 공식(곱 나누기 합)을 썼어. 콘덴서는 병렬이면 그냥 더해.' },
              { v: (C1 + C2) / 2, why: '평균을 냈어. 병렬은 극판 면적이 늘어나는 것과 같아서 더해.' },
              { v: C1 * C2, why: '곱했어. 병렬은 더하기야.' },
            ],
        conclusion: series
          ? 'C = ' + n(C1) + '×' + n(C2) + '/(' + n(C1) + '+' + n(C2) + ') = ' + q(ser, 'μF')
          : 'C = ' + n(C1) + ' + ' + n(C2) + ' = ' + q(par, 'μF'),
        steps: series
          ? ['콘덴서 직렬은 저항 병렬과 같은 꼴: 1/C = 1/C₁ + 1/C₂.', '두 개면 곱 나누기 합: ' + n(C1 * C2) + ' ÷ ' + n(C1 + C2) + ' = ' + q(ser, 'μF') + '.']
          : ['콘덴서 병렬은 극판을 옆으로 이어 붙인 것과 같아(면적 증가).', '그냥 더해: ' + n(C1) + ' + ' + n(C2) + ' = ' + q(par, 'μF') + '.'],
        check: series
          ? '직렬 합성용량(' + n(ser) + ')은 작은 쪽(' + n(Math.min(C1, C2)) + ')보다 작아야 해. 맞아.'
          : '병렬 합성용량(' + n(par) + ')은 큰 쪽(' + n(Math.max(C1, C2)) + ')보다 커야 해. 맞아.',
        traps: ['"콘덴서는 저항과 반대". 직렬 ↔ 병렬 공식을 바꿔 써.'],
      };
    },
  });

  T({
    id: 'em-cap-energy',
    concept: 'em-capacitor',
    gen(r) {
      const CuF = r.pick([1, 2, 4, 5, 10, 20, 50, 100]);
      const V = r.pick([10, 20, 50, 100, 200, 500, 1000]);
      const W = 0.5 * CuF * 1e-6 * V * V;
      if (!F.isNice(W, 4) || W < 0.001) return null;
      const lab = (v) => qs(v, 'J');
      return {
        params: { CuF, V },
        text: q(CuF, 'μF') + ' 콘덴서를 ' + q(V, 'V') + '로 충전했어. 저장된 에너지는?',
        formula: 'W = ½CV²',
        label: lab,
        answer: W,
        distractors: [
          { v: CuF * 1e-6 * V * V, why: '½을 빠뜨렸어.' },
          { v: 0.5 * CuF * 1e-6 * V, why: '전압을 제곱하지 않았어.' },
          { v: 0.5 * CuF * V * V, why: 'μF를 F로 바꾸지 않았어(10⁻⁶ 빠뜨림).' },
        ],
        conclusion: 'W = ½ × ' + n(CuF) + '×10⁻⁶ × ' + n(V) + '² = ' + lab(W),
        steps: ['C = ' + n(CuF) + ' μF = ' + n(CuF) + ' × 10⁻⁶ F.', 'V² = ' + n(V * V) + '.', 'W = ½ × ' + n(CuF) + '×10⁻⁶ × ' + n(V * V) + ' = ' + lab(W) + '.'],
        check: '전하 Q = CV = ' + qs(CuF * 1e-6 * V, 'C') + ', W = ½QV = ½ × ' + qs(CuF * 1e-6 * V) + ' × ' + n(V) + ' = ' + lab(W) + '. 같아.',
        traps: ['W = ½CV² = ½QV = Q²/(2C). 주어진 값에 맞는 식을 골라.', '코일 에너지 ½LI²와 모양이 같아. 짝으로 외워.'],
      };
    },
  });

  // ───────── 전류가 만드는 자계 ─────────
  T({
    id: 'em-mag-wire',
    concept: 'em-magfield',
    gen(r) {
      const I = r.pick([1, 2, 5, 10, 20, 50, 100]);
      const d = r.pick([0.1, 0.2, 0.5, 1, 2]);
      const H = I / (2 * PI * d);
      return {
        params: { I, d },
        text: '무한히 긴 직선 도선에 ' + q(I, 'A') + '가 흘러. 도선에서 ' + q(d, 'm') + ' 떨어진 점의 자계의 세기는 약 몇 AT/m야?',
        formula: 'H = I / (2πr)',
        unit: 'AT/m',
        decimals: 3,
        answer: H,
        distractors: [
          { v: I / (2 * d), why: '원형 코일 중심 공식(I/2a)을 썼어. 직선 도선은 원둘레 2πr로 나눠.' },
          { v: I / (PI * d), why: '2를 빠뜨렸어. 원둘레는 2πr이야.' },
          { v: I / (2 * PI * d * d), why: '거리를 제곱했어. 직선 전류의 자계는 r에 한 번만 반비례해.' },
        ],
        conclusion: 'H = ' + n(I) + ' / (2π × ' + n(d) + ') ≈ ' + q(H, 'AT/m', 3),
        steps: ['앙페르 법칙: 도선을 둘러싼 원(둘레 2πr)을 따라 H × 2πr = I.', 'H = ' + n(I) + ' ÷ (2 × 3.1416 × ' + n(d) + ') ≈ ' + q(H, 'AT/m', 3) + '.'],
        check: 'H × 2πr = ' + n(H, 3) + ' × ' + n(2 * PI * d, 3) + ' ≈ ' + n(I) + ' A. 앙페르 법칙과 맞아.',
        traps: ['직선 도선: 2πr. 원형 코일 중심: 2a. 환상 솔레노이드: 2πr에 N을 곱함.'],
      };
    },
  });

  T({
    id: 'em-mag-coil',
    concept: 'em-magfield',
    gen(r) {
      const N = r.pick([1, 5, 10, 20, 50, 100]);
      const I = r.pick([1, 2, 5, 10]);
      const a = r.pick([0.05, 0.1, 0.2, 0.5]);
      const H = (N * I) / (2 * a);
      return {
        params: { N, I, a },
        text: '반지름 ' + q(a, 'm') + ', 감은 수 ' + N + '회인 원형 코일에 ' + q(I, 'A') + '가 흘러. 코일 중심의 자계의 세기는?',
        formula: 'H = NI / (2a)',
        unit: 'AT/m',
        answer: H,
        distractors: [
          { v: (N * I) / (2 * PI * a), why: '직선 도선 공식(2πr)을 썼어. 원형 코일 "중심"은 2a로 나눠.' },
          { v: I / (2 * a), why: '감은 수 N을 빠뜨렸어. 코일을 N번 감으면 N배야.' },
          { v: (N * I) / a, why: '2를 빠뜨렸어. 분모는 지름(2a)이야.' },
        ],
        conclusion: 'H = ' + N + ' × ' + n(I) + ' / (2 × ' + n(a) + ') = ' + q(H, 'AT/m'),
        steps: ['원형 코일 중심의 자계: 한 바퀴당 I/(2a), N바퀴면 NI/(2a).', 'H = ' + n(N * I) + ' ÷ ' + n(2 * a) + ' = ' + q(H, 'AT/m') + '.'],
        check: '반지름을 2배로 하면 H는 절반(' + n(H / 2) + ')이어야 해. a가 분모라 맞아.',
        traps: ['원형 코일 중심 = NI/(2a)에는 π가 없어.'],
      };
    },
  });

  T({
    id: 'em-mag-solenoid',
    concept: 'em-magfield',
    gen(r) {
      const toroid = r.chance(0.5);
      const N = r.pick([100, 200, 500, 1000, 2000]);
      const I = r.pick([0.5, 1, 2, 5]);
      if (toroid) {
        const rr = r.pick([0.05, 0.1, 0.2, 0.5]);
        const H = (N * I) / (2 * PI * rr);
        return {
          params: { kind: 'toroid', N, I, r: rr },
          text: '평균 반지름 ' + q(rr, 'm') + '인 환상 솔레노이드에 코일을 ' + N + '회 감고 ' + q(I, 'A') + '를 흘렸어. 내부 자계의 세기는 약 몇 AT/m야?',
          formula: '환상 솔레노이드 H = NI / (2πr)',
          unit: 'AT/m',
          decimals: 1,
          answer: H,
          distractors: [
            { v: (N * I) / rr, why: '2π를 빠뜨렸어. 자로의 길이는 원둘레 2πr이야.' },
            { v: (N * I) / (2 * rr), why: '원형 코일 중심 공식(NI/2a)을 썼어.' },
            { v: I / (2 * PI * rr), why: '감은 수 N을 빠뜨렸어.' },
          ],
          conclusion: 'H = ' + N + ' × ' + n(I) + ' / (2π × ' + n(rr) + ') ≈ ' + q(H, 'AT/m', 1),
          steps: ['도넛 모양 철심 안을 한 바퀴 도는 자로의 길이 = 2πr.', '앙페르 법칙: H × 2πr = NI → H = NI/(2πr).', 'H = ' + n(N * I) + ' ÷ ' + n(2 * PI * rr, 4) + ' ≈ ' + q(H, 'AT/m', 1) + '.'],
          check: 'H × 2πr ≈ ' + n(H * 2 * PI * rr) + ' = NI. 맞아.',
          traps: ['환상 솔레노이드 바깥 자계는 0이야(자속이 안에만 갇혀).'],
        };
      }
      const len = r.pick([0.1, 0.2, 0.25, 0.5, 1]);
      const H = (N * I) / len;
      return {
        params: { kind: 'long', N, I, len },
        text: '길이 ' + q(len, 'm') + '에 코일을 ' + N + '회 고르게 감은 긴 솔레노이드에 ' + q(I, 'A') + '를 흘렸어. 내부 자계의 세기는? (무한장으로 봐)',
        formula: '무한장 솔레노이드 H = nI = (N/l)·I',
        unit: 'AT/m',
        answer: H,
        distractors: [
          { v: N * I * len, why: '길이로 나눠야 하는데 곱했어. n은 "1 m당 감은 수" = N/l이야.' },
          { v: (N * I) / (2 * PI * len), why: '환상 솔레노이드 공식(2πr)을 썼어.' },
          { v: I / len, why: '감은 수 N을 빠뜨렸어.' },
        ],
        conclusion: 'n = ' + N + '/' + n(len) + ' = ' + n(N / len) + '회/m → H = ' + n(N / len) + ' × ' + n(I) + ' = ' + q(H, 'AT/m'),
        steps: ['1 m당 감은 수: n = N/l = ' + N + ' ÷ ' + n(len) + ' = ' + n(N / len) + '회/m.', 'H = nI = ' + n(N / len) + ' × ' + n(I) + ' = ' + q(H, 'AT/m') + '.'],
        check: '단위 확인: (회/m) × A = AT/m. 맞아.',
        traps: ['무한장 솔레노이드 내부 자계는 위치와 상관없이 균일하고, 외부는 0이야.'],
      };
    },
  });

  // ───────── 전자력 ─────────
  T({
    id: 'em-force-bil',
    concept: 'em-force',
    gen(r) {
      const B = r.pick([0.1, 0.2, 0.5, 1, 1.5, 2]);
      const I = r.pick([2, 5, 10, 20]);
      const l = r.pick([0.1, 0.2, 0.5, 2]);
      const th = r.pick([30, 90]);
      const Fv = B * I * l * sinOf(th);
      if (!F.isNice(Fv, 3)) return null;
      return {
        params: { B, I, l, th },
        text: '자속밀도 ' + q(B, 'T') + '인 평등 자계 속에 길이 ' + q(l, 'm') + '인 도체를 자계와 ' + th + '° 각도로 놓고 ' + q(I, 'A') + '를 흘렸어. 도체가 받는 힘은?',
        formula: 'F = BIl·sinθ',
        unit: 'N',
        decimals: 3,
        answer: Fv,
        distractors: [
          { v: B * I * l * cosOf(th), why: 'sin 대신 cos을 썼어. 자계와 직각(90°)일 때 힘이 최대니까 sinθ야.' },
          { v: B * I * l, why: '각도(sin ' + th + '°)를 빠뜨렸어.' },
          { v: (B * I) / l, why: '길이로 나눴어. 도체가 길수록 힘은 커져.' },
          { v: (I * l) / B, why: '자속밀도로 나눴어. B는 곱해야 해.' },
          { v: (B * l) / I, why: '전류로 나눴어. 전류가 클수록 힘은 커져.' },
        ],
        conclusion: 'F = ' + n(B) + ' × ' + n(I) + ' × ' + n(l) + ' × sin ' + th + '° = ' + q(Fv, 'N', 3),
        steps: ['플레밍 왼손 법칙: F = BIl sinθ.', 'sin ' + th + '° = ' + n(sinOf(th)) + '.', 'F = ' + n(B * I * l, 3) + ' × ' + n(sinOf(th)) + ' = ' + q(Fv, 'N', 3) + '.'],
        check: '직각(90°)일 때 최대값은 BIl = ' + n(B * I * l, 3) + ' N이고, 답은 이보다 크지 않아야 해. 맞아.',
        traps: ['θ는 "도체와 자계 사이" 각도야. 평행(0°)이면 힘이 0.'],
      };
    },
  });

  T({
    id: 'em-force-parallel',
    concept: 'em-force',
    gen(r) {
      const I1 = r.pick([1, 2, 5, 10, 20, 50, 100]);
      const I2 = r.pick([1, 2, 5, 10, 20, 50, 100]);
      const d = r.pick([0.01, 0.05, 0.1, 0.2, 0.5, 1]);
      const same = r.chance(0.5);
      const Fv = ((2 * I1 * I2) / d) * 1e-7;
      const lab = (v) => qs(v, 'N/m');
      return {
        params: { I1, I2, d },
        text: '진공 중 ' + q(d, 'm') + ' 떨어진 평행한 두 직선 도선에 ' + q(I1, 'A') + '와 ' + q(I2, 'A') + '가 ' + (same ? '같은' : '반대') + ' 방향으로 흘러. 도선 1 m당 작용하는 힘의 크기는?',
        formula: 'F = 2I₁I₂/r × 10⁻⁷  [N/m]',
        label: lab,
        answer: Fv,
        distractors: [
          { v: ((I1 * I2) / d) * 1e-7, why: '2를 빠뜨렸어. μ₀/(2π) = 2 × 10⁻⁷이야.' },
          { v: ((2 * I1 * I2) / (d * d)) * 1e-7, why: '거리를 제곱했어. 평행 도선 사이 힘은 r에 한 번만 반비례해.' },
          { v: (4 * PI * 1e-7 * I1 * I2) / d, why: 'μ₀(4π × 10⁻⁷)를 2π로 나누지 않았어.' },
        ],
        conclusion: 'F = 2 × ' + n(I1) + ' × ' + n(I2) + ' / ' + n(d) + ' × 10⁻⁷ = ' + lab(Fv) + (same ? ' (흡인력)' : ' (반발력)'),
        steps: [
          'F = μ₀I₁I₂/(2πr), μ₀ = 4π × 10⁻⁷ → F = 2I₁I₂/r × 10⁻⁷.',
          '2 × ' + n(I1 * I2) + ' ÷ ' + n(d) + ' = ' + n((2 * I1 * I2) / d) + ' → × 10⁻⁷ = ' + lab(Fv) + '.',
          '방향: ' + (same ? '같은 방향 전류는 서로 끌어당겨(흡인).' : '반대 방향 전류는 서로 밀어내(반발).'),
        ],
        check: '1 A, 1 A, 1 m면 2 × 10⁻⁷ N/m. 이게 예전 "1 암페어"의 정의였어. 공식 꼴이 맞아.',
        traps: ['전하는 "같은 부호 반발", 전류는 "같은 방향 흡인". 정반대라서 헷갈리기 쉬워.'],
      };
    },
  });

  // ───────── 전자유도 ─────────
  T({
    id: 'em-faraday',
    concept: 'em-induction',
    gen(r) {
      const N = r.pick([10, 20, 50, 100, 200, 500]);
      const P1 = r.pick([0, 0.01, 0.02, 0.05, 0.1]);
      const dP = r.pick([0.01, 0.02, 0.05, 0.1, 0.2]);
      const P2 = P1 + dP;
      const dt = r.pick([0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1]);
      const e = (N * dP) / dt;
      if (!F.isNice(e, 2) || e > 10000) return null;
      return {
        params: { N, dP, dt },
        text: '감은 수 ' + N + '회인 코일을 지나는 자속이 ' + q(dt, '초') + ' 동안 ' + q(P1, 'Wb') + '에서 ' + q(P2, 'Wb') + '로 고르게 늘었어. 코일에 유도되는 기전력의 크기는?',
        formula: 'e = N × ΔΦ / Δt',
        unit: 'V',
        answer: e,
        distractors: [
          { v: dP / dt, why: '감은 수 N을 빠뜨렸어.' },
          { v: N * dP * dt, why: '시간으로 나눠야 하는데 곱했어. 빨리 변할수록(Δt 작을수록) 기전력이 커.' },
          { v: (N * P2) / dt, why: '변화량(ΔΦ) 대신 나중 자속(' + n(P2) + ' Wb)을 썼어. 기전력은 "변한 만큼"으로 생겨.' },
          { v: (N * dt) / dP, why: '분자와 분모를 뒤집었어.' },
        ],
        conclusion: 'ΔΦ = ' + n(dP) + ' Wb → e = ' + N + ' × ' + n(dP) + ' / ' + n(dt) + ' = ' + q(e, 'V'),
        steps: ['자속 변화량: ΔΦ = ' + n(P2) + ' − ' + n(P1) + ' = ' + n(dP) + ' Wb.', '패러데이 법칙: e = N·ΔΦ/Δt.', 'e = ' + N + ' × ' + n(dP) + ' ÷ ' + n(dt) + ' = ' + q(e, 'V') + '.'],
        check: '단위: Wb/s = V. 그리고 같은 변화를 2배 빨리 하면 기전력도 2배(' + n(2 * e) + ' V)가 돼야 해. 맞아.',
        traps: ['기전력은 자속의 크기가 아니라 "변화율"에 비례해.', '방향은 렌츠 법칙: 자속 변화를 방해하는 쪽.'],
      };
    },
  });

  T({
    id: 'em-motional',
    concept: 'em-induction',
    gen(r) {
      const B = r.pick([0.1, 0.2, 0.5, 1, 2]);
      const l = r.pick([0.1, 0.2, 0.5, 2]);
      const v = r.pick([2, 5, 10, 20]);
      const th = r.pick([30, 90]);
      const e = B * l * v * sinOf(th);
      if (!F.isNice(e, 3)) return null;
      return {
        params: { B, l, v, th },
        text: '자속밀도 ' + q(B, 'T') + '인 평등 자계 속에서 길이 ' + q(l, 'm') + '인 도체가 자계와 ' + th + '° 방향으로 ' + q(v, 'm/s') + '로 움직여. 도체에 유도되는 기전력은?',
        formula: 'e = Blv·sinθ',
        unit: 'V',
        decimals: 3,
        answer: e,
        distractors: [
          { v: B * l * v * cosOf(th), why: 'sin 대신 cos을 썼어. 자계를 직각으로 자를 때 최대니까 sinθ야.' },
          { v: B * l * v, why: '각도(sin ' + th + '°)를 빠뜨렸어.' },
          { v: (B * l) / v, why: '속도로 나눴어. 빨리 움직일수록 기전력이 커.' },
          { v: (B * v) / l, why: '길이로 나눴어. 길이는 곱해.' },
          { v: (l * v) / B, why: '자속밀도로 나눴어. B는 곱해.' },
        ],
        conclusion: 'e = ' + n(B) + ' × ' + n(l) + ' × ' + n(v) + ' × sin ' + th + '° = ' + q(e, 'V', 3),
        steps: ['플레밍 오른손 법칙: e = Blv sinθ.', 'Blv = ' + n(B * l * v, 3) + ', sin ' + th + '° = ' + n(sinOf(th)) + '.', 'e = ' + q(e, 'V', 3) + '.'],
        check: '1초 동안 도체가 자르는 자속 = B × l × (v sinθ) = ' + n(e, 3) + ' Wb → 1초당 Wb = V. 맞아.',
        traps: ['발전기는 오른손(기전력), 전동기는 왼손(힘).'],
      };
    },
  });

  // ───────── 인덕턴스 ─────────
  T({
    id: 'em-ind-energy',
    concept: 'em-inductance',
    gen(r) {
      const LmH = r.pick([1, 2, 5, 10, 20, 50, 100, 200, 500]);
      const I = r.pick([1, 2, 3, 4, 5, 10]);
      const W = 0.5 * LmH * 1e-3 * I * I;
      const lab = (v) => qs(v, 'J');
      return {
        params: { LmH, I },
        text: '자기 인덕턴스 ' + q(LmH, 'mH') + '인 코일에 ' + q(I, 'A') + '가 흐를 때 저장되는 에너지는?',
        formula: 'W = ½LI²',
        label: lab,
        answer: W,
        distractors: [
          { v: LmH * 1e-3 * I * I, why: '½을 빠뜨렸어.' },
          { v: 0.5 * LmH * 1e-3 * I, why: '전류를 제곱하지 않았어.' },
          { v: 0.5 * LmH * I * I, why: 'mH를 H로 바꾸지 않았어.' },
        ],
        conclusion: 'W = ½ × ' + n(LmH / 1000, 4) + ' × ' + n(I) + '² = ' + lab(W),
        steps: ['L = ' + n(LmH) + ' mH = ' + n(LmH / 1000, 4) + ' H.', 'W = ½LI² = 0.5 × ' + n(LmH / 1000, 4) + ' × ' + n(I * I) + ' = ' + lab(W) + '.'],
        check: '전류를 2배로 하면 에너지는 4배(' + lab(4 * W) + ')여야 해. I²라서 맞아.',
        traps: ['코일 ½LI² ↔ 콘덴서 ½CV². L은 전류, C는 전압과 짝이야.'],
      };
    },
  });

  T({
    id: 'em-ind-self',
    concept: 'em-inductance',
    gen(r) {
      const N = r.pick([10, 20, 50, 100, 200, 500, 1000]);
      const PmWb = r.pick([0.1, 0.2, 0.5, 1, 2, 5]);
      const I = r.pick([1, 2, 4, 5, 10]);
      const LmH = (N * PmWb) / I;
      if (!F.isNice(LmH, 3)) return null;
      return {
        params: { N, PmWb, I },
        text: '감은 수 ' + N + '회인 코일에 ' + q(I, 'A') + '를 흘렸더니 코일을 지나는 자속이 ' + q(PmWb, 'mWb') + '였어. 자기 인덕턴스는 몇 mH야?',
        formula: 'L = NΦ / I',
        unit: 'mH',
        answer: LmH,
        distractors: [
          { v: PmWb / I, why: '감은 수 N을 빠뜨렸어. 자속은 N번 감긴 코일 전체와 쇄교해.' },
          { v: (N * I) / PmWb, why: '자속과 전류를 뒤집었어. L = NΦ/I.' },
          { v: N * PmWb * I, why: '전류로 나눠야 하는데 곱했어.' },
        ],
        conclusion: 'L = ' + N + ' × ' + n(PmWb) + ' mWb / ' + n(I) + ' A = ' + q(LmH, 'mH'),
        steps: ['쇄교자속 NΦ = ' + N + ' × ' + n(PmWb) + ' mWb = ' + n(N * PmWb) + ' mWb.', 'L = NΦ/I = ' + n(N * PmWb) + ' ÷ ' + n(I) + ' = ' + q(LmH, 'mH') + '.'],
        check: 'L × I = ' + n(LmH) + ' mH × ' + n(I) + ' A = ' + n(N * PmWb) + ' mWb = NΦ. 맞아.',
        traps: ['mWb를 그대로 쓰면 답도 mH로 나와. 단위를 맞춰 두면 변환이 필요 없어.'],
      };
    },
  });

  T({
    id: 'em-ind-mutual',
    concept: 'em-inductance',
    gen(r) {
      const pairs = [[1, 4], [4, 9], [2, 8], [1, 16], [9, 16], [4, 25], [1, 9], [3, 12], [16, 25]];
      const [p1, p2] = r.pick(pairs);
      const s = r.pick([1, 10]);
      const L1 = p1 * s;
      const L2 = p2 * s;
      const k = r.pick([0.2, 0.25, 0.5, 0.6, 0.8, 0.9]);
      const M = k * Math.sqrt(L1 * L2);
      return {
        params: { L1, L2, k },
        text: '자기 인덕턴스가 ' + q(L1, 'mH') + ', ' + q(L2, 'mH') + '인 두 코일의 결합계수가 ' + n(k) + '야. 상호 인덕턴스 M은?',
        formula: 'M = k√(L₁L₂)',
        unit: 'mH',
        answer: M,
        distractors: [
          { v: k * L1 * L2, why: '√를 빠뜨렸어.' },
          { v: Math.sqrt(L1 * L2) / k, why: '결합계수로 나눴어. k는 0~1이라 곱하면 M이 작아지는 게 맞아.' },
          { v: (k * (L1 + L2)) / 2, why: '두 인덕턴스의 평균을 썼어. 기하평균 √(L₁L₂)이야.' },
          { v: Math.sqrt(L1 * L2), why: '결합계수를 빠뜨렸어. 그건 완전 결합(k = 1)일 때야.' },
        ],
        conclusion: 'M = ' + n(k) + ' × √(' + n(L1) + ' × ' + n(L2) + ') = ' + n(k) + ' × ' + n(Math.sqrt(L1 * L2)) + ' = ' + q(M, 'mH'),
        steps: ['√(L₁L₂) = √' + n(L1 * L2) + ' = ' + n(Math.sqrt(L1 * L2)) + ' mH.', 'M = k × √(L₁L₂) = ' + n(k) + ' × ' + n(Math.sqrt(L1 * L2)) + ' = ' + q(M, 'mH') + '.'],
        check: 'M은 완전 결합값 ' + n(Math.sqrt(L1 * L2)) + ' mH보다 작아야 해(k < 1). 맞아.',
        traps: ['결합계수 k = M/√(L₁L₂). 거꾸로 묻는 문제도 같은 식이야.'],
      };
    },
  });

  T({
    id: 'em-ind-series',
    concept: 'em-inductance',
    gen(r) {
      const L1 = r.pick([10, 20, 30, 40, 50, 80, 100]);
      const L2 = r.pick([10, 20, 30, 40, 50, 80, 100]);
      const M = r.pick([2, 4, 5, 8, 10, 15, 20, 25]);
      if (M > Math.sqrt(L1 * L2) * 0.95) return null;
      const aid = r.chance(0.5);
      const ans = L1 + L2 + (aid ? 2 : -2) * M;
      return {
        params: { L1, L2, M, aid },
        text: q(L1, 'mH') + '와 ' + q(L2, 'mH') + ' 코일을 ' + (aid ? '가동 결합(자속이 같은 방향)' : '차동 결합(자속이 반대 방향)') + '으로 직렬 연결했어. 상호 인덕턴스가 ' + q(M, 'mH') + '일 때 합성 인덕턴스는?',
        formula: '가동 L₁ + L₂ + 2M,  차동 L₁ + L₂ − 2M',
        unit: 'mH',
        answer: ans,
        distractors: [
          { v: L1 + L2 + (aid ? -2 : 2) * M, why: (aid ? '차동' : '가동') + ' 결합 공식을 썼어. 자속이 ' + (aid ? '같은' : '반대') + ' 방향이면 ' + (aid ? '+2M' : '−2M') + '이야.' },
          { v: L1 + L2 + (aid ? 1 : -1) * M, why: '2를 빠뜨렸어. 서로가 서로에게 M씩 주고받아서 2M이야.' },
          { v: L1 + L2, why: '상호 인덕턴스를 무시했어.' },
        ],
        conclusion: 'L = ' + n(L1) + ' + ' + n(L2) + (aid ? ' + ' : ' − ') + '2 × ' + n(M) + ' = ' + q(ans, 'mH'),
        steps: [
          aid ? '가동 결합: 두 코일의 자속이 서로 도와 → +2M.' : '차동 결합: 두 코일의 자속이 서로 상쇄 → −2M.',
          'L = ' + n(L1 + L2) + (aid ? ' + ' : ' − ') + n(2 * M) + ' = ' + q(ans, 'mH') + '.',
        ],
        check: '가동과 차동의 차이는 4M = ' + n(4 * M) + ' mH. (가동 ' + n(L1 + L2 + 2 * M) + ') − (차동 ' + n(L1 + L2 - 2 * M) + ') = ' + n(4 * M) + '. 맞아.',
        traps: ['가동 − 차동 = 4M. 그래서 두 값을 재면 M = (가동 − 차동)/4로 구할 수 있어.'],
      };
    },
  });

  // ───────── 자기회로 ─────────
  T({
    id: 'em-mc-flux',
    concept: 'em-magcircuit',
    gen(r) {
      const N = r.pick([100, 200, 500, 1000]);
      const I = r.pick([0.5, 1, 2, 5]);
      const Rm = r.pick([1e5, 2e5, 5e5, 1e6, 2e6, 5e6]);
      const mWb = ((N * I) / Rm) * 1000;
      const lab = (v) => qs(v, 'mWb');
      return {
        params: { N, I, Rm },
        text: '자기저항이 ' + F.sci(Rm) + ' AT/Wb인 철심에 코일을 ' + N + '회 감고 ' + q(I, 'A') + '를 흘렸어. 철심의 자속은 몇 mWb야?',
        formula: 'Φ = NI / Rm',
        label: lab,
        answer: mWb,
        distractors: [
          { v: N * I * Rm * 1000, why: '자기저항으로 나눠야 하는데 곱했어. 저항이 크면 자속은 줄어.' },
          { v: (Rm / (N * I)) * 1000, why: '분자와 분모를 뒤집었어.' },
          { v: (I / Rm) * 1000, why: '감은 수 N을 빠뜨렸어. 기자력은 NI야.' },
        ],
        conclusion: 'Φ = ' + n(N * I) + ' AT ÷ ' + F.sci(Rm) + ' = ' + lab(mWb),
        steps: ['기자력 F = NI = ' + N + ' × ' + n(I) + ' = ' + n(N * I) + ' AT.', '자기회로 옴의 법칙: Φ = F/Rm = ' + n(N * I) + ' ÷ ' + F.sci(Rm) + ' = ' + F.sci(mWb / 1000) + ' Wb = ' + lab(mWb) + '.'],
        check: 'Φ × Rm = ' + F.sci(mWb / 1000) + ' × ' + F.sci(Rm) + ' = ' + n(N * I) + ' AT = NI. 맞아.',
        traps: ['전압 ↔ 기자력, 전류 ↔ 자속, 저항 ↔ 자기저항. 전기회로로 바꿔 생각해.'],
      };
    },
  });

  T({
    id: 'em-mc-scale',
    concept: 'em-magcircuit',
    gen(r) {
      const a = r.pick([1, 2, 3, 4]);
      const b = r.pick([1, 2, 3, 4]);
      const c = r.pick([1, 2, 5, 10]);
      if (a === 1 && b === 1 && c === 1) return null;
      const ans = a / (b * c);
      const parts = [];
      if (a !== 1) parts.push('자로의 길이를 ' + a + '배');
      if (b !== 1) parts.push('단면적을 ' + b + '배');
      if (c !== 1) parts.push('비투자율을 ' + c + '배');
      return {
        params: { a, b, c },
        text: '자기회로에서 ' + parts.join(', ') + '로 하면 자기저항은 몇 배가 될까?',
        formula: 'Rm = l / (μS) = l / (μ₀μₛS)',
        unit: '배',
        label: ratioLabel,
        answer: ans,
        distractors: [
          { v: (b * c) / a, why: '길이와 단면적·투자율의 역할을 뒤집었어. 길이는 분자, 나머지는 분모야.' },
          { v: a * b * c, why: '전부 곱했어. 단면적과 투자율이 커지면 자기저항은 줄어.' },
          { v: a / b, why: '투자율 변화를 빠뜨렸어.' },
          { v: (a * c) / b, why: '투자율을 분자에 뒀어. 투자율이 크면 자속이 잘 통해서 저항이 줄어.' },
        ],
        conclusion: 'Rm ∝ l/(μS) → ' + a + ' ÷ (' + b + ' × ' + c + ') = ' + ratioLabel(ans),
        steps: ['Rm = l/(μS): 길이에 비례, 투자율·단면적에 반비례.', '길이 ×' + a + ', 단면적 ×' + b + ', 비투자율 ×' + c + '.', 'Rm은 ' + a + '/(' + b + '×' + c + ') = ' + ratioLabel(ans) + '.'],
        check: '전기저항 R = ρl/S와 꼴이 같아: 길면 커지고, 굵으면 작아져. 맞아.',
        traps: ['자기저항이 1/k배가 되면 같은 기자력에서 자속은 k배가 돼.'],
      };
    },
  });
})(globalThis.GISA);
