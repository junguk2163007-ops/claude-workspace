// 기출 분석 보강 — 전기자기학: 단락 설명에 없던 기출 유형을 템플릿·이론형으로 채운다. 오리지널 문제, 정답은 코드로 계산.
(function (G) {
  'use strict';
  const F = G.fmt;
  const n = F.num;
  const q = F.q;
  const T = G.defineTemplate;
  const S = G.kgS;
  const K9 = 9e9;
  const EPS0 = 8.855e-12;
  const MU0 = 4 * Math.PI * 1e-7;
  const SQ3 = Math.sqrt(3);
  const rad = (d) => (d * Math.PI) / 180;

  // ───────── 쿨롱·전위·영상 ─────────
  T({
    id: 'cb-eps',
    concept: 'em-coulomb',
    gen(r) {
      const er = r.pick([2, 2.5, 4, 5, 8]);
      const F0 = r.pick([1, 2, 5, 10]);
      const F1 = F0 / er;
      return {
        params: { F0, F1, er },
        text: '공기 중에서 두 점전하 사이에 ' + q(F0, 'N') + '의 힘이 작용했어. 두 전하를 그대로 두고 액체 유전체 속에 넣었더니 힘이 ' + q(F1, 'N', 4) + '로 줄었어. 이 액체의 비유전율은?',
        formula: 'F ∝ 1/ε  →  εr = F공기 / F유전체',
        unit: '',
        decimals: 4,
        answer: er,
        distractors: [
          { v: F1 / F0, why: '거꾸로 나눴어. 힘이 줄어든 비 F공기/F유전체 가 비유전율이야(1보다 커야 해).' },
          { v: F0 - F1, why: '뺐어. 쿨롱 힘은 유전율에 반비례하니까 비(나눗셈)로 구해.' },
          { v: (F0 / F1) ** 2, why: '제곱했어. 힘은 ε 에 1차로 반비례해(거리에 대해서만 제곱).' },
          { v: F0 * F1, why: '곱했어. 비는 나눗셈이야.' },
        ],
        conclusion: 'εr = ' + n(F0) + ' ÷ ' + n(F1, 4) + ' = ' + q(er, '', 4),
        steps: ['쿨롱 힘 F = Q1Q2/(4πεr²) 이라서 ε 가 εr배가 되면 힘은 1/εr배.', '공기 중 힘 ÷ 유전체 속 힘 = εr.', n(F0) + ' ÷ ' + n(F1, 4) + ' = ' + q(er, '', 4) + '.'],
        check: n(F0) + ' ÷ ' + n(er) + ' = ' + n(F1, 4) + ' N 로 맞아.',
        traps: ['매질이 바뀌면 힘이 비유전율 배만큼 줄어든다(거리·전하는 그대로).'],
      };
    },
  });

  T({
    id: 'cb-pot',
    concept: 'em-coulomb',
    gen(r) {
      const A = r.pick([5, 8, 10, 12, 20]);
      const B = r.pick([5, 10, 15]);
      const rs = r.pick([[0.5, 2, 1], [0.5, 2, 4], [1, 2, 4], [0.5, 1, 2], [1, 4, 2], [2, 4, 1]]);
      const V = (x) => A / x + B;
      const [r1, r2, r3] = rs;
      const v3 = V(r3);
      return {
        params: { A, B, r1, r2, r3 },
        text: '공기 중 원점의 점전하에서 ' + q(r1, 'm') + ', ' + q(r2, 'm') + ' 떨어진 곳의 전위가 각각 ' + q(V(r1), 'V') + ', ' + q(V(r2), 'V') + ' 야. (전위의 기준점이 무한원이 아닐 수 있어.) ' + q(r3, 'm') + ' 떨어진 곳의 전위는?',
        formula: 'V(r) = A/r + B  (점전하 전위 + 기준점에 따른 상수 B)',
        unit: 'V',
        decimals: 3,
        answer: v3,
        distractors: [
          { v: (V(r1) * r1) / r3, why: 'B(기준 전위)를 0 으로 놓았어. 두 지점의 값으로 A 와 B 를 모두 구해야 해.' },
          { v: (V(r2) * r2) / r3, why: 'B(기준 전위)를 0 으로 놓았어(다른 점으로 풀어도 값이 다르게 나와서 이상하다는 신호야).' },
          { v: (V(r1) + V(r2)) / 2, why: '두 값의 평균이야. 전위는 1/r 로 변해서 평균으로 구할 수 없어.' },
          { v: A / r3, why: '상수 B 를 빼먹었어.' },
        ],
        conclusion: 'A = ' + n(A) + ', B = ' + n(B) + ' → V(' + n(r3) + ' m) = ' + q(v3, 'V', 3),
        steps: ['V = A/r + B 로 놓고 두 점의 값으로 연립: A/' + n(r1) + ' + B = ' + n(V(r1)) + ', A/' + n(r2) + ' + B = ' + n(V(r2)) + '.', '빼면 A(1/' + n(r1) + ' − 1/' + n(r2) + ') = ' + n(V(r1) - V(r2)) + ' → A = ' + n(A) + ', B = ' + n(B) + '.', 'V(' + n(r3) + ') = ' + n(A) + '/' + n(r3) + ' + ' + n(B) + ' = ' + q(v3, 'V', 3) + '.'],
        check: '주어진 두 지점의 값이 식과 일치하는지 대입해 봐.',
        traps: ['기준점이 무한원이 아니면 V = kQ/r + 상수 꼴이야.'],
      };
    },
  });

  T({
    id: 'cb-sq',
    concept: 'em-coulomb',
    gen(r) {
      const R = r.pick([0.5, 1, 2, 3]);
      const Qn = r.pick([1, 2, 5, 10]); // nC
      const V = (4 * K9 * Qn * 1e-9) / R;
      return {
        params: { R, Qn },
        text: '한 변의 길이가 ' + n(R) + '√2 m 인 정사각형의 네 꼭짓점에 각각 +' + q(Qn, 'nC') + ' 의 점전하가 있어. 정사각형 중심의 전위는? (무한원 기준)',
        formula: 'V = Σ kQ/r = 4kQ/R   (R: 중심에서 꼭짓점까지 거리 = 한 변 ÷ √2)',
        unit: 'V',
        decimals: 3,
        answer: V,
        distractors: [
          { v: (K9 * Qn * 1e-9) / R, why: '전하 하나만 계산했어. 4개의 전위를 모두 더해야 해(전위는 스칼라 합).' },
          { v: (4 * K9 * Qn * 1e-9) / (R * Math.SQRT2), why: '꼭짓점까지 거리를 한 변 길이의 ÷√2 가 아닌 다른 값으로 잡았어. 한 변이 ' + n(R) + '√2 이면 중심까지는 ' + n(R) + ' m 야.' },
          { v: 0, why: '전하가 모두 + 라서 상쇄되지 않아. 전위는 스칼라라 그냥 더해(벡터인 전계만 상쇄).' },
          { v: (4 * K9 * Qn * 1e-9) / (R * R), why: '전위는 거리에 반비례(1/r)이야. 1/r² 은 전계(힘)야.' },
        ].filter((x) => x.v > 0),
        conclusion: 'R = 변 ÷ √2 = ' + n(R) + ' m → V = 4 × 9×10⁹ × ' + n(Qn) + '×10⁻⁹ ÷ ' + n(R) + ' = ' + q(V, 'V', 3),
        steps: ['정사각형 중심에서 꼭짓점까지 거리 R = 변 ÷ √2 = ' + n(R) + ' m.', '전위는 스칼라라서 하나의 전위 kQ/R 를 4배.', 'V = 4 × ' + n((K9 * Qn * 1e-9) / R, 4) + ' = ' + q(V, 'V', 3) + '.'],
        check: '전계는 대칭이라 중심에서 0 이지만 전위는 0 이 아니야.',
        traps: ['전위는 더하기(스칼라), 전계는 벡터합이라 대칭이면 상쇄.'],
      };
    },
  });

  T({
    id: 'cb-tri',
    concept: 'em-coulomb',
    gen(r) {
      const Qu = r.pick([1, 2, 3, 4]);
      const a = r.pick([0.05, 0.1, 0.2, 0.5]);
      const F1 = (K9 * (Qu * 1e-6) ** 2) / (a * a);
      const Ft = SQ3 * F1;
      return {
        params: { Qu, a },
        text: '진공 중 한 변이 ' + q(a, 'm') + ' 인 정삼각형의 세 꼭짓점에 각각 ' + q(Qu, 'μC') + ' 의 점전하가 있어. 한 꼭짓점의 전하가 받는 힘의 크기는?',
        formula: 'F = √3 · kQ²/a²   (이웃한 두 전하의 힘을 60°로 합성)',
        unit: 'N',
        decimals: 3,
        answer: Ft,
        distractors: [
          { v: F1, why: '전하 하나가 주는 힘만 구했어. 두 전하의 힘을 벡터로 합성해야 해.' },
          { v: 2 * F1, why: '크기를 그냥 더했어. 두 힘은 60° 를 이루니까 √3 배(2cos30° = √3)로 합쳐져.' },
          { v: F1 * Math.sqrt(2), why: '직각(90°)으로 합성했어. 정삼각형의 두 힘 사이는 60° 야.' },
          { v: F1 / 2, why: '합성 계수를 잘못 잡았어. 합력은 2F·cos30° = √3 F.' },
        ],
        conclusion: 'F₀ = kQ²/a² = ' + n(F1, 4) + ' N → F = √3·F₀ = ' + q(Ft, 'N', 3),
        steps: ['이웃한 전하 하나가 주는 힘 F₀ = 9×10⁹ × (' + n(Qu) + '×10⁻⁶)² ÷ ' + n(a) + '² = ' + n(F1, 4) + ' N.', '두 힘 사이의 각이 60° 라서 합력은 2F₀cos30° = √3·F₀.', '= ' + q(Ft, 'N', 3) + ' (방향은 두 변의 이등분선 바깥쪽).'],
        check: '합력은 F₀ 보다 크고 2F₀ 보다 작아.',
        traps: ['정삼각형: √3 배, 직각 배치: √2 배 로 외워 두면 편해.'],
      };
    },
  });

  T({
    id: 'cb-wpair',
    concept: 'em-coulomb',
    gen(r) {
      const q1 = r.pick([1, 2, 5, 10]);
      const q2 = r.pick([2, 3, 4, 5, 20]);
      const d = r.pick([0.5, 1, 2, 5]);
      const W = (K9 * q1 * q2 * 1e-18) / d;
      return {
        params: { q1, q2, d },
        text: '공기 중에 ' + q(q1, 'nC') + ' 과 ' + q(q2, 'nC') + ' 의 두 점전하가 ' + q(d, 'm') + ' 떨어져 있을 때 이 계의 정전 에너지는 몇 nJ 야?',
        formula: 'W = Q1·Q2 / (4πε₀ d) = 9×10⁹·Q1Q2/d',
        unit: 'nJ',
        decimals: 3,
        answer: W * 1e9,
        distractors: [
          { v: ((K9 * q1 * q2 * 1e-18) / (d * d)) * 1e9, why: '거리를 제곱했어. 에너지(전위)는 1/d, 힘은 1/d² 야.' },
          { v: (W * 1e9) / 2, why: '½ 를 곱했어. 두 점전하 사이의 상호 에너지는 kQ1Q2/d 그대로야(½ 는 연속 분포를 쓸 때).' },
          { v: W, why: '단위(J → nJ) 변환을 안 했어.' },
          { v: W * 1e9 * 2, why: '두 전하의 전위 에너지를 각각 더했어(이중 계산). 상호 에너지는 한 번만 세.' },
          { v: W * 1e9 * d, why: '거리로 나누지 않고 곱했어. 전위는 거리에 반비례.' },
        ],
        conclusion: 'W = 9×10⁹ × ' + n(q1) + '×10⁻⁹ × ' + n(q2) + '×10⁻⁹ ÷ ' + n(d) + ' = ' + q(W * 1e9, 'nJ', 3),
        steps: ['한 전하가 만드는 전위 V = kQ1/d = ' + n((K9 * q1 * 1e-9) / d, 4) + ' V.', '다른 전하를 그 전위에 두는 데 든 일 = Q2·V.', '= ' + q(W * 1e9, 'nJ', 3) + '.'],
        check: '전하의 곱이 nC×nC = 10⁻¹⁸ 이라서 에너지는 nJ(10⁻⁹) 단위가 돼.',
        traps: ['점전하 두 개의 상호 에너지: W = kQ1Q2/d (거리의 1제곱 반비례).'],
      };
    },
  });

  T({
    id: 'cb-img',
    concept: 'em-coulomb',
    gen(r) {
      const work = r.chance(0.5);
      if (work) {
        const Qu = r.pick([1, 2, 5, 10]);
        const d = r.pick([0.5, 1, 2, 5]);
        const W = (2.25e9 * (Qu * 1e-6) ** 2) / d;
        return {
          params: { work: true, Qu, d },
          text: '무한 접지 평면 도체 앞 ' + q(d, 'm') + ' 거리에 ' + q(Qu, 'μC') + ' 의 점전하가 있어. 이 전하를 무한원까지 옮기는 데 필요한 일은 몇 J 야?',
          formula: 'W = Q²/(16πε₀ d) = 2.25×10⁹ · Q²/d',
          unit: 'J',
          decimals: 5,
          answer: W,
          distractors: [
            { v: W * 4, why: '영상 전하까지 거리 2d 를 쓰고도 ¼ 를 곱하지 않았어. 힘은 Q²/(4πε₀(2d)²)이고 이를 적분하면 Q²/(16πε₀d).' },
            { v: W * 2, why: '식을 2배로 잡았어. 영상법에서는 전하가 움직이면 영상도 같이 움직여서 에너지는 ½ 이 붙어 Q²/(16πε₀d) 가 돼.' },
            { v: W / 2, why: '계수를 틀렸어. Q²/(16πε₀d) = 2.25×10⁹·Q²/d.' },
            { v: (9e9 * (Qu * 1e-6) ** 2) / d, why: 'k=9×10⁹ 를 그대로 썼어. 영상법 일은 k/4 = 2.25×10⁹.' },
          ],
          conclusion: 'W = 2.25×10⁹ × (' + n(Qu) + '×10⁻⁶)² ÷ ' + n(d) + ' = ' + q(W, 'J', 5),
          steps: ['접지 평면 → 영상 전하 −Q 가 반대편 같은 거리에.', '거리 x 일 때 힘 F = Q²/(4πε₀(2x)²). 무한원까지 적분하면 W = Q²/(16πε₀ d).', '= 2.25×10⁹ × Q²/d = ' + q(W, 'J', 5) + '.'],
          check: '힘의 적분이라 에너지는 d 에 반비례(1/d).',
          traps: ['영상 전하까지 거리는 2d, 일은 Q²/(16πε₀d) = k·Q²/(4d).'],
        };
      }
      const a = r.pick([0.01, 0.02, 0.05]);
      const d = r.pick([0.1, 0.2, 0.5]);
      const Qu = r.pick([5, 10, 20]);
      const Qi = (a / d) * Qu;
      return {
        params: { work: false, a, d, Qu },
        text: '반지름 ' + q(a, 'm') + ' 의 구도체를 접지시키고 중심에서 ' + q(d, 'm') + ' 떨어진 곳에 ' + q(Qu, 'μC') + ' 의 점전하를 놓았어. 구도체에 유도되는 총 전하(영상 전하)의 크기는 몇 μC 야?',
        formula: "Q' = (a/d)·Q   (부호는 반대)",
        unit: 'μC',
        decimals: 4,
        answer: Qi,
        distractors: [
          { v: Qu, why: '평면 도체의 영상 전하(−Q) 와 혼동했어. 구도체는 크기가 (a/d) 배로 줄어.' },
          { v: (d / a) * Qu, why: 'a/d 를 거꾸로 썼어. 구도체 안쪽으로 작아지는 비(a/d < 1)야.' },
          { v: ((a / d) ** 2) * Qu, why: '제곱했어. 영상 전하는 1차로 a/d.' },
          { v: (a / (d - a)) * Qu, why: '표면까지 거리 d − a 를 썼어. 중심까지의 거리 d 를 써야 해.' },
        ],
        conclusion: "|Q'| = (" + n(a) + '/' + n(d) + ') × ' + n(Qu) + ' = ' + q(Qi, 'μC', 4),
        steps: ['접지 구도체 + 점전하의 영상 전하는 구 중심에서 a²/d 위치에 Q′ = −aQ/d.', '크기 = (' + n(a) + '/' + n(d) + ') × ' + n(Qu) + ' = ' + q(Qi, 'μC', 4) + '.', '구에 유도되는 총 전하가 이 영상 전하와 같아.'],
        check: 'Q′ 의 크기는 Q 보다 작아(구가 점전하에서 멀수록 더 작아져).',
        traps: ['무한 평면: 영상 −Q(같은 거리), 접지 구: −aQ/d(중심에서 a²/d).'],
      };
    },
  });

  // ───────── 로렌츠 힘 ─────────
  T({
    id: 'lz-force',
    concept: 'em-coulomb',
    noCalc: true,
    gen(r) {
      const rv = () => [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)];
      const E = rv();
      const B = rv();
      const v = rv();
      const qq = r.pick([0.2, 0.5, 1, 2]);
      const mode = r.pick(['E', 'B', 'EB']);
      const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const vB = cross(v, B);
      const Ft = {
        E: E.map((x) => qq * x),
        B: vB.map((x) => qq * x),
        EB: E.map((x, i) => qq * (x + vB[i])),
      }[mode];
      const mag = Math.hypot(Ft[0], Ft[1], Ft[2]);
      if (mag < 0.5) return this.gen(r);
      const vec = (a, u) => '(' + a.map((x, i) => (x < 0 ? '−' : i ? '+' : '') + n(Math.abs(x)) + u[i]).join('') + ')';
      const ex = ['aₓ', 'a_y', 'a_z'];
      const wrong1 = Math.hypot(...E.map((x, i) => qq * (x + vB[i] * 0)));
      const alt = {
        E: Math.hypot(...E.map((x, i) => qq * (x + vB[i]))),
        B: Math.hypot(...E.map((x) => qq * x)),
        EB: Math.hypot(...E.map((x) => qq * x)) + Math.hypot(...vB.map((x) => qq * x)),
      }[mode];
      return {
        params: { qq, E, B, v, mode },
        text: qq + ' C 의 점전하가 ' + (mode !== 'B' ? '전계 E = ' + vec(E, ex).replace(/^\(|\)$/g, '') + ' V/m ' : '') + (mode !== 'E' ? (mode === 'EB' ? '및 ' : '') + '자속밀도 B = ' + vec(B, ex).replace(/^\(|\)$/g, '') + ' Wb/m² ' : '') + '속에서 속도 v = ' + vec(v, ex).replace(/^\(|\)$/g, '') + ' m/s 로 움직여. 이 전하가 받는 힘의 크기는 약 몇 N 이야?',
        formula: mode === 'E' ? 'F = q·E  (속도와 무관)' : mode === 'B' ? 'F = q·(v × B)' : 'F = q·(E + v × B)',
        unit: 'N',
        decimals: 3,
        answer: mag,
        distractors: [
          { v: alt, why: mode === 'E' ? '속도에 의한 자기력까지 더했어. 자계가 없으면 힘은 q·E 뿐이야.' : mode === 'B' ? '전계 항 q·E 를 넣었어. 자계만 있으면 힘은 q(v × B) 뿐이야.' : '크기끼리 더했어. 벡터 합을 구한 뒤 크기를 구해야 해.' },
          { v: Math.hypot(...v.map((x, i) => qq * x * (B[i] || 1))), why: 'v 와 B 를 성분끼리 곱했어(내적 꼴). 자기력은 외적 v × B 야.' },
          { v: mag * 2, why: '계산이 2배로 틀어졌어. 외적/합 각 성분을 다시 확인해.' },
          { v: mag / qq, why: '전하량 q 를 곱하지 않았어. 힘 = q × (…).' },
        ],
        conclusion: 'F = ' + vec(Ft.map((x) => Math.round(x * 1000) / 1000), ex) + ' N → |F| = ' + q(mag, 'N', 3),
        steps: [mode !== 'E' ? 'v × B = ' + vec(vB, ex) + ' (외적: 성분 (vyBz − vzBy, vzBx − vxBz, vxBy − vyBx)).' : '자계가 없으니 자기력은 0, 전기력 q·E 만.', mode === 'B' ? 'F = q·(v × B).' : mode === 'E' ? 'F = q·E.' : 'F = q(E + v × B) (성분끼리 더하기).', '크기 = √(Fx² + Fy² + Fz²) = ' + q(mag, 'N', 3) + '.'],
        check: '전기력은 속도와 무관하고, 자기력은 v 와 B 에 모두 수직이야.',
        traps: ['로렌츠 힘 F = q(E + v × B). 외적의 성분 순서(i, j, k)를 주의해.'],
      };
    },
  });

  // ───────── 전계·전위 ─────────
  T({
    id: 'ef-rho',
    concept: 'em-efield',
    gen(r) {
      const a = r.pick([2, 3, 4, 5, 6]);
      const b = r.pick([1, 2, 3]);
      const y0 = r.pick([-3, -2, -1, 1, 2, 3]);
      const lap = 2 * a * y0 + 2 * b; // ∇²V = a x² y 의 ∂²/∂x² = 2a y,  b y² 의 ∂²/∂y² = 2b
      const rho = -lap; // ρ/ε0
      if (Math.abs(rho) < 1) return this.gen(r);
      return {
        params: { a, b, y0 },
        text: '진공 중의 전위가 V = ' + n(a) + 'x²y + ' + n(b) + 'y² + z [V] 일 때 y = ' + n(y0) + ' 인 점에서 체적 전하밀도의 크기 |ρ| 는 ε₀ 의 몇 배야?',
        formula: '푸아송 방정식: ∇²V = −ρ/ε₀  →  ρ = −ε₀(∂²V/∂x² + ∂²V/∂y² + ∂²V/∂z²)',
        unit: '배',
        decimals: 3,
        answer: Math.abs(rho),
        distractors: [
          { v: Math.abs(a * y0 + b), why: '미분을 한 번만 했어. 푸아송 방정식은 2계 도함수(∂²/∂x² 등)를 더해.' },
          { v: Math.abs(2 * a * y0), why: 'y 에 대한 2계 도함수(∂²/∂y² = 2b)를 빼먹었어.' },
          { v: Math.abs(2 * a * y0 * 0 + 2 * b), why: 'x 에 대한 2계 도함수(2a·y)를 빼먹었어.' },
          { v: Math.abs(lap) * 2, why: '2배로 계산했어. ∂²(ax²y)/∂x² = 2a·y 에서 그치는 거야.' },
        ],
        conclusion: '∇²V = 2·' + n(a) + '·' + n(y0) + ' + 2·' + n(b) + ' = ' + n(lap) + ' → ρ = −ε₀·(' + n(lap) + ') = ' + n(rho) + 'ε₀ → 크기 ' + q(Math.abs(rho), '배', 3),
        steps: ['∂²V/∂x² = 2a·y = ' + n(2 * a * y0) + ', ∂²V/∂y² = 2b = ' + n(2 * b) + ', ∂²V/∂z² = 0.', '∇²V = ' + n(lap) + '.', 'ρ = −ε₀∇²V = ' + n(rho) + ' ε₀ (크기 ' + n(Math.abs(rho)) + '배).'],
        check: '부호는 ∇²V 가 양수이면 ρ 가 음수야(−ε₀ 가 붙으니까).',
        traps: ['ρ = −ε₀∇²V (푸아송). 일차 도함수가 아니라 이차 도함수의 합.'],
      };
    },
  });

  T({
    id: 'ef-plates',
    concept: 'em-efield',
    gen(r) {
      const mode = r.pick(['V', 'f1', 'f2']);
      if (mode === 'V') {
        const s = r.pick([1, 2, 4, 5]);
        const d = r.pick([1, 2, 3, 4]);
        const V = (s * d) / EPS0;
        return {
          params: { mode, s, d },
          text: '진공 중 ' + q(d, 'm') + ' 간격의 두 무한 평행 평면 도체에 각각 +' + q(s, 'C/m²') + ', −' + q(s, 'C/m²') + ' 의 전하를 주었어. 두 도체 사이의 전위차는 약 몇 V 야? (ε₀ = 8.855×10⁻¹² F/m)',
          formula: 'E = σ/ε₀ (판 사이 일정),   V = E·d = σd/ε₀',
          unit: 'V',
          decimals: 4,
          answer: V,
          distractors: [
            { v: V / 2, why: '단일 무한 평면의 전계(σ/2ε₀)를 썼어. 두 도체 사이에서는 두 판의 전계가 같은 방향으로 더해져 σ/ε₀.' },
            { v: V * 4, why: '4πε₀ 형태를 섞었어. 평행판 사이 전계는 σ/ε₀ 로 계수가 없어.' },
            { v: s / EPS0, why: '간격 d 를 곱하지 않았어. 전위차 = 전계 × 거리.' },
            { v: (s * d) * K9 * 4 * Math.PI, why: '4πk 를 써서 ε₀ 로 표현했는데 값이 달라. 1/ε₀ = 4π × 9×10⁹ 의 근사값 차이를 확인해(이 문제는 ε₀ = 8.855×10⁻¹² 를 써).' },
          ].filter((x) => Math.abs(x.v - V) / V > 0.02),
          conclusion: 'V = σd/ε₀ = ' + n(s) + ' × ' + n(d) + ' ÷ 8.855×10⁻¹² = ' + q(V, 'V', 4),
          steps: ['두 평행 도체 사이의 전계 E = σ/ε₀ = ' + n(s / EPS0, 4) + ' V/m.', '전위차 V = E·d = ' + q(V, 'V', 4) + '.', '(바깥쪽은 전계가 상쇄돼 0).'],
          check: '유한 평행판 콘덴서의 V = Qd/(ε₀S) 와 같은 식이야(σ = Q/S).',
          traps: ['무한 평판 하나: σ/2ε₀, 서로 반대 부호 두 판 사이: σ/ε₀.'],
        };
      }
      if (mode === 'f1') {
        const sg = r.pick([1, 2, 3, 5]);
        const f = ((sg * 1e-6) ** 2) / (2 * EPS0);
        return {
          params: { mode, sg },
          text: '무한히 넓은 평행판 도체 사이에 일정한 전계를 걸었더니 도체 표면에 ' + q(sg, 'μC/m²') + ' 의 전하 밀도가 생겼어. 판의 단위 면적에 작용하는 힘은 몇 N/m² 야?',
          formula: 'f = σ²/(2ε₀) = ½ε₀E²  [N/m²]',
          unit: 'N/m²',
          decimals: 4,
          answer: f,
          distractors: [
            { v: f * 2, why: '½ 를 빼먹었어. 정전 응력은 σ²/(2ε₀).' },
            { v: (sg * 1e-6) / EPS0, why: '이건 전계 E = σ/ε₀ 야. 단위 면적당 힘은 ½·σ·E.' },
            { v: f / 2, why: '식을 σ²/(4ε₀) 로 잘못 외웠어. ½ε₀E² = σ²/(2ε₀).' },
            { v: (sg * 1e-6) ** 2 * K9, why: 'k = 9×10⁹ 를 그대로 곱했어. ε₀ 로 나누는 식이야.' },
          ],
          conclusion: 'f = σ²/(2ε₀) = (' + n(sg) + '×10⁻⁶)² ÷ (2×8.855×10⁻¹²) = ' + q(f, 'N/m²', 4),
          steps: ['E = σ/ε₀ = ' + n((sg * 1e-6) / EPS0, 1) + ' V/m.', '표면이 받는 힘 = ½·σ·E = ½·ε₀·E² (단위 면적).', '= ' + q(f, 'N/m²', 4) + '.'],
          check: 'σ·E 에 ½ 가 붙는 이유는 도체 표면의 전계가 자기 자신이 만든 전계를 빼야 하기 때문이야.',
          traps: ['단위 면적당 흡인력: f = ½εE² = σ²/2ε = D²/2ε = ½ED.'],
        };
      }
      const Sc = r.pick([50, 100, 200]);
      const dc = r.pick([0.25, 0.5, 1]);
      const Vv = r.pick([500, 1000, 2000]);
      const E = Vv / (dc / 100);
      const f = 0.5 * EPS0 * E * E;
      return {
        params: { mode, Sc, dc, Vv },
        text: '면적 ' + q(Sc, 'cm²') + ' 인 금속판 두 장을 ' + q(dc, 'cm') + ' 간격으로 평행하게 놓고 ' + q(Vv, 'V') + ' 를 걸었어. 단위 면적당 작용하는 흡인력은 몇 N/m² 야?',
        formula: 'E = V/d,   f = ½ε₀E²',
        unit: 'N/m²',
        decimals: 4,
        answer: f,
        distractors: [
          { v: f * 2, why: '½ 를 빼먹었어. f = ½ε₀E².' },
          { v: (0.5 * EPS0 * Vv ** 2) / (dc / 100), why: '전계를 V/d 로 구하지 않았어(d 를 한 번만 나눔). E = V/d 를 제곱해야 해.' },
          { v: f * (Sc * 1e-4), why: '면적을 곱했어. 문제는 "단위 면적당" 힘이야.' },
          { v: 0.5 * EPS0 * Vv * Vv * (dc / 100), why: 'd 를 나누지 않고 곱했어. E = V ÷ d.' },
        ],
        conclusion: 'E = ' + n(Vv) + ' ÷ ' + n(dc / 100, 4) + ' = ' + n(E, 1) + ' V/m → f = ½ε₀E² = ' + q(f, 'N/m²', 4),
        steps: ['d = ' + n(dc) + ' cm = ' + n(dc / 100, 4) + ' m 로 바꿔서 E = V/d = ' + n(E, 1) + ' V/m.', 'f = ½·ε₀·E² = ½ × 8.855×10⁻¹² × (' + n(E, 1) + ')².', '= ' + q(f, 'N/m²', 4) + '.'],
        check: '면적은 단위 면적당 힘이라서 계산에 안 들어가(전체 힘은 f × S).',
        traps: ['단위 면적당 힘: ½ε₀E². 전체 힘 = f × S.'],
      };
    },
  });

  T({
    id: 'ef-move',
    concept: 'em-efield',
    gen(r) {
      const E = r.pick([30, 40, 50, 60]);
      const V0 = r.pick([50, 60, 80, 100]);
      const dcm = r.pick([50, 60, 70, 80, 100]);
      const V = V0 - (E * dcm) / 100;
      if (V <= 1) return this.gen(r);
      return {
        params: { E, V0, dcm },
        text: q(E, 'V/m') + ' 의 균일한 전계 안에서 전위가 ' + q(V0, 'V') + ' 인 점에 있던 1 C 의 전하를 전계 방향으로 ' + q(dcm, 'cm') + ' 이동시켰어. 이동한 점의 전위는 몇 V 야?',
        formula: '전계 방향으로 가면 전위가 내려감: V = V₀ − E·d',
        unit: 'V',
        decimals: 3,
        answer: V,
        distractors: [
          { v: V0 + (E * dcm) / 100, why: '전계 방향으로 갈수록 전위는 낮아져(전계는 전위가 높은 곳에서 낮은 곳을 향해). 더하면 안 돼.' },
          { v: V0 - E * dcm, why: 'cm 를 m 로 바꾸지 않았어. ' + n(dcm) + ' cm = ' + n(dcm / 100) + ' m.' },
          { v: (E * dcm) / 100, why: '전위 변화량만 구했어. 처음 전위 ' + n(V0) + ' V 에서 빼야 해.' },
          { v: V0 - E, why: '거리 d 를 곱하지 않았어. 전위 변화 = E × d.' },
        ],
        conclusion: 'V = ' + n(V0) + ' − ' + n(E) + ' × ' + n(dcm / 100) + ' = ' + q(V, 'V', 3),
        steps: ['E = −∇V 라서 전계 방향으로 d 만큼 가면 전위가 E·d 내려가.', 'E·d = ' + n(E) + ' × ' + n(dcm / 100, 3) + ' = ' + n((E * dcm) / 100, 3) + ' V.', n(V0) + ' − ' + n((E * dcm) / 100, 3) + ' = ' + q(V, 'V', 3) + '.'],
        check: '전계와 반대 방향으로 이동했다면 같은 양만큼 올라가.',
        traps: ['"전계 방향" 이동 = 전위 감소, "전계 반대 방향" = 전위 증가. cm → m 환산 주의.'],
      };
    },
  });

  T({
    id: 'ef-spheres',
    concept: 'em-efield',
    gen(r) {
      const mode = r.pick(['V', 'loss', 'touch']);
      if (mode === 'V') {
        const a = r.pick([1, 2, 3]);
        const b = r.pick([4, 5, 6]);
        const V1 = r.pick([5, 10, 20]);
        const V2 = r.pick([10, 15, 30]);
        const Vc = (a * V1 + b * V2) / (a + b);
        return {
          params: { mode, a, b, V1, V2 },
          text: '공기 중에서 ' + q(V1, 'V') + ', ' + q(V2, 'V') + ' 로 대전된 반지름 ' + q(a, 'cm') + ', ' + q(b, 'cm') + ' 의 두 도체구를 가는 철사로 이었어. 공통 전위는 약 몇 V 야?',
          formula: 'V = (C₁V₁ + C₂V₂)/(C₁ + C₂),   C = 4πε₀a ∝ 반지름',
          unit: 'V',
          decimals: 3,
          answer: Vc,
          distractors: [
            { v: (V1 + V2) / 2, why: '단순 평균이야. 두 구의 정전용량(반지름)이 달라서 용량으로 가중 평균해야 해.' },
            { v: (b * V1 + a * V2) / (a + b), why: '가중치가 바뀌었어. 용량이 큰(반지름이 큰) 구의 전위에 더 가까워져.' },
            { v: V1 + V2, why: '전위를 더했어. 철사로 이으면 전하가 합쳐지고 전위는 하나로 같아져.' },
            { v: (a * a * V1 + b * b * V2) / (a * a + b * b), why: '반지름 제곱으로 가중했어. 도체구 정전용량은 반지름에 1차 비례.' },
          ],
          conclusion: '(' + n(a) + '×' + n(V1) + ' + ' + n(b) + '×' + n(V2) + ') ÷ (' + n(a) + ' + ' + n(b) + ') = ' + q(Vc, 'V', 3),
          steps: ['도체구의 정전용량은 반지름에 비례(C = 4πε₀a) → 비 ' + n(a) + ' : ' + n(b) + '.', '전하의 합 Q = C₁V₁ + C₂V₂ 가 보존되고 합성 용량 C₁ + C₂ 로 하나의 전위.', 'V = ' + q(Vc, 'V', 3) + '.'],
          check: '공통 전위는 두 처음 전위의 사이값이야.',
          traps: ['용량 가중 평균(반지름 비로).'],
        };
      }
      if (mode === 'loss') {
        const k = r.pick([2, 3, 4, 0.5]);
        const frac = k / (1 + k);
        return {
          params: { mode, k },
          text: '대전된 도체구 A 를 반지름이 ' + n(k) + '배인, 대전되지 않은 도체구 B 에 접속했어. A 가 처음 가지고 있던 정전 에너지 중 얼마(비율)가 손실될까?',
          formula: 'W₀ = Q²/(2C₁),  W = Q²/(2(C₁ + C₂))  →  손실 비율 = C₂/(C₁ + C₂)',
          unit: '',
          decimals: 4,
          answer: frac,
          distractors: [
            { v: 1 / (1 + k), why: '비율이 거꾸로야. 남는 에너지 비율이 C₁/(C₁ + C₂) 이고 손실은 C₂/(C₁ + C₂).' },
            { v: 1 / 2, why: '반으로 가정했어. 두 구의 용량 비로 정해져.' },
            { v: k, why: '용량 비를 그대로 답했어. 손실 비율은 C₂/(C₁ + C₂) 로 1보다 작아.' },
            { v: (k / (1 + k)) ** 2, why: '제곱했어. 에너지는 Q²/2C 라 용량의 역수에 1차 비례.' },
          ],
          conclusion: '손실 = C₂/(C₁ + C₂) = ' + n(k) + '/(1 + ' + n(k) + ') = ' + q(frac, '', 4),
          steps: ['전하 Q 는 보존되지만 합성 용량이 C₁ + C₂ 로 커져서 에너지가 Q²/2(C₁ + C₂) 로 줄어.', '남는 비율 = C₁/(C₁ + C₂) = ' + n(1 / (1 + k), 4) + '.', '손실 비율 = 1 − 남는 비율 = ' + q(frac, '', 4) + ' (철사의 열 등으로 사라짐).'],
          check: 'B 가 클수록 손실이 1 에 가까워져(대부분 사라짐).',
          traps: ['접속하면 전하는 그대로, 에너지는 반드시 줄어든다.'],
        };
      }
      const r1 = r.pick([1, 2, 3, 4]);
      const r2 = r.pick([0.5, 1, 1.5, 2]);
      const Q = r.pick([0.1, 0.15, 0.2, 0.3]);
      const gain = (Q * r2) / (r1 + r2);
      return {
        params: { mode, r1, r2, Q },
        text: 'Q = ' + q(Q, 'C') + ' 로 대전한 반지름 ' + n(r1) + ' 의 큰 도체구에 반지름 ' + n(r2) + ' 의 (대전 안 된) 작은 도체구를 접촉시켰다 뗐어. 작은 구가 가져가는 전하는 몇 C 야?',
        formula: '전하는 반지름(정전용량) 비로 나뉨:  Q₂ = Q·r₂/(r₁ + r₂)',
        unit: 'C',
        decimals: 4,
        answer: gain,
        distractors: [
          { v: (Q * r1) / (r1 + r2), why: '큰 구가 남기는 전하야. 작은 구가 가져가는 건 r₂/(r₁ + r₂).' },
          { v: Q / 2, why: '반반이라고 가정했어. 반지름 비로 나뉘어.' },
          { v: (Q * r2) / r1, why: '합 r₁ + r₂ 가 아니라 r₁ 로만 나눴어. 접촉 뒤 두 구가 같은 전위가 되는 조건(전체 용량)을 써야 해.' },
          { v: Q * (r2 / (r1 + r2)) ** 2, why: '제곱했어. 전하는 반지름 비에 1차 비례.' },
        ],
        conclusion: 'Q₂ = ' + n(Q) + ' × ' + n(r2) + '/(' + n(r1) + ' + ' + n(r2) + ') = ' + q(gain, 'C', 4),
        steps: ['접촉하면 두 구의 전위가 같아져서 Q₁/C₁ = Q₂/C₂ (C ∝ 반지름).', 'Q₁ + Q₂ = Q 이므로 Q₂ = Q·r₂/(r₁ + r₂).', '= ' + q(gain, 'C', 4) + '.'],
        check: '큰 구가 남은 전하 ' + n(Q - gain, 4) + ' C 와 합치면 Q.',
        traps: ['전하는 반지름에 비례해서 나눠 갖는다(같은 전위).'],
      };
    },
  });

  T({
    id: 'ef-sigma',
    concept: 'em-efield',
    gen(r) {
      const E = r.pick([100, 150, 200, 300, 500]);
      const sg = EPS0 * E * 1e9; // nC/m²
      return {
        params: { E },
        text: '지표면(도체로 본다)에서 지구 중심 방향으로 ' + q(E, 'V/m') + ' 의 전계가 있어. 표면의 전하 밀도의 크기는 약 몇 nC/m² 야? (ε₀ = 8.855×10⁻¹² F/m)',
        formula: '도체 표면: σ = ε₀E  (전계는 표면에 수직)',
        unit: 'nC/m²',
        decimals: 4,
        answer: sg,
        distractors: [
          { v: sg / 2, why: '무한 평판 하나의 전계 공식(σ/2ε₀)을 썼어. 도체 표면에서는 전계 E = σ/ε₀ (도체 안은 0).' },
          { v: E / EPS0 * 1e-9, why: '거꾸로 나눴어. σ = ε₀ × E.' },
          { v: sg * 4 * Math.PI, why: '4π 가 붙는 건 쿨롱 상수 쪽이야. σ = ε₀E 에는 없어.' },
          { v: sg * 1000, why: '단위가 어긋났어. ε₀E 는 C/m² 이고 nC/m² 로 바꾸려면 ×10⁹.' },
        ],
        conclusion: 'σ = ε₀E = 8.855×10⁻¹² × ' + n(E) + ' = ' + n(sg * 1e-9, 4) + ' C/m² = ' + q(sg, 'nC/m²', 4),
        steps: ['도체 표면 바로 바깥의 전계 E = σ/ε₀ (표면에 수직).', 'σ = ε₀E = ' + n(EPS0 * E, 4) + ' C/m².', 'nC/m² 로: ' + q(sg, 'nC/m²', 4) + ' (지구 중심 방향이면 음전하).'],
        check: '가우스 법칙에서 도체 표면 한 점의 전속 D = σ 와 같아.',
        traps: ['도체 표면 E = σ/ε₀, 무한 평면 전하 E = σ/(2ε₀) 를 구분.'],
      };
    },
  });

  T({
    id: 'ef-dip',
    concept: 'em-efield',
    gen(r) {
      const M = r.pick([1, 2, 5, 10]) * 1e-9; // C·m
      const th = r.pick([0, 30, 45, 60]);
      const rr = r.pick([0.5, 1, 2, 3]);
      const V = (K9 * M * Math.cos(rad(th))) / (rr * rr);
      return {
        params: { M, th, rr },
        text: '쌍극자 모멘트 M = ' + q(M * 1e9, 'nC·m') + ' 인 전기 쌍극자의 축과 ' + q(th, '°') + ' 를 이루는 방향, 중심에서 ' + q(rr, 'm') + ' 떨어진 점의 전위는 약 몇 V 야?',
        formula: 'V = M·cosθ / (4πε₀ r²) = 9×10⁹·M·cosθ / r²',
        unit: 'V',
        decimals: 4,
        answer: V,
        distractors: [
          { v: (K9 * M * Math.cos(rad(th))) / rr, why: '거리에 반비례(1/r)로 구했어. 쌍극자 전위는 1/r² (점전하는 1/r).' },
          { v: (K9 * M * Math.sin(rad(th))) / (rr * rr), why: 'cosθ 가 아니라 sinθ 를 썼어. 전위는 축 방향(θ = 0°)에서 최대인 cosθ 에 비례.' },
          { v: (K9 * M) / (rr * rr), why: 'cosθ 를 곱하지 않았어. 각도에 따라 전위가 달라져.' },
          { v: (K9 * M * Math.cos(rad(th))) / (rr ** 3), why: 'r³ 에 반비례하는 건 전계야. 전위는 r².' },
        ].filter((x) => Math.abs(x.v - V) / V > 0.01),
        conclusion: 'V = 9×10⁹ × ' + n(M, 12) + ' × cos' + n(th) + '° ÷ ' + n(rr) + '² = ' + q(V, 'V', 4),
        steps: ['쌍극자 전위 V = M·cosθ/(4πε₀r²).', '9×10⁹ × ' + n(M, 12) + ' × ' + n(Math.cos(rad(th)), 4) + ' = ' + n(K9 * M * Math.cos(rad(th)), 5) + '.', '÷ r² (' + n(rr * rr) + ') = ' + q(V, 'V', 4) + '.'],
        check: 'θ = 90° 이면 전위가 0 (적도면은 등전위 0).',
        traps: ['쌍극자: 전위 ∝ 1/r², 전계 ∝ 1/r³, 전위는 축 방향에서 최대.'],
      };
    },
  });

  T({
    id: 'ef-accel',
    concept: 'em-efield',
    gen(r) {
      const m = r.pick([1e-10, 2e-10, 5e-10]);
      const qq = r.pick([1e-8, 2e-8, 5e-8]);
      const ax = r.pick([100, 200, 300, 500]);
      const ay = r.pick([0, 100, 200, 1000]);
      const E = (m / qq) * Math.hypot(ax, ay);
      return {
        params: { m, qq, ax, ay },
        text: '질량 ' + n(m * 1e10) + '×10⁻¹⁰ kg, 전하량 ' + n(qq * 1e8) + '×10⁻⁸ C 인 입자가 전계 안에서 가속도 a = ' + n(ax) + 'aₓ + ' + n(ay) + 'a_y [m/s²] 로 움직이고 있어. 이 전계의 크기는 몇 V/m 야?',
        formula: 'q·E = m·a  →  E = m·a / q',
        unit: 'V/m',
        decimals: 4,
        answer: E,
        distractors: [
          { v: (qq / m) * Math.hypot(ax, ay), why: '거꾸로 계산했어. E = m·a/q.' },
          { v: m * Math.hypot(ax, ay), why: 'q 로 나누지 않았어. E = m·a ÷ q.' },
          { v: (m / qq) * (ax + ay), why: '가속도 성분을 그냥 더했어. 벡터 크기 √(ax² + ay²) 를 써야 해.' },
          { v: ((m / qq) * Math.hypot(ax, ay)) / 10, why: '자릿수를 틀렸어. 10⁻¹⁰ ÷ 10⁻⁸ = 10⁻².' },
        ],
        conclusion: 'E = (' + n(m * 1e10) + '×10⁻¹⁰ ÷ ' + n(qq * 1e8) + '×10⁻⁸) × √(' + n(ax) + '² + ' + n(ay) + '²) = ' + q(E, 'V/m', 4),
        steps: ['힘 = 전하 × 전계 = 질량 × 가속도.', 'E = m·a/q = ' + n(m / qq, 4) + ' × ' + n(Math.hypot(ax, ay), 3) + '.', '= ' + q(E, 'V/m', 4) + '.'],
        check: 'E 의 방향은 가속도와 같아(양전하이니까).',
        traps: ['E = ma/q (전하량 q 로 나누기), 성분은 벡터로 합성.'],
      };
    },
  });

  T({
    id: 'ef-divd',
    concept: 'em-efield',
    gen(r) {
      const a = r.pick([1, 2, 3]);
      const b = r.pick([1, 2, 3]);
      const c = r.pick([1, 2, 3]);
      const px = r.pick([1, 2, 3]);
      const py = r.pick([1, 2, 3]);
      const pz = r.pick([1, 2, 3]);
      const rho = 2 * a * px + 2 * b * py + 2 * c * pz;
      return {
        params: { a, b, c, px, py, pz },
        text: '전속밀도가 D = ' + n(a) + 'x²·aₓ + ' + n(b) + 'y²·a_y + ' + n(c) + 'z²·a_z [C/m²] 일 때 점 (' + n(px) + ', ' + n(py) + ', ' + n(pz) + ') 에서 체적 전하밀도는 몇 C/m³ 야?',
        formula: '가우스 법칙(미분형): ρ = ∇·D = ∂Dx/∂x + ∂Dy/∂y + ∂Dz/∂z',
        unit: 'C/m³',
        decimals: 3,
        answer: rho,
        distractors: [
          { v: a * px * px + b * py * py + c * pz * pz, why: '미분하지 않고 D 의 성분을 더했어. ρ 는 D 의 발산(미분)이야.' },
          { v: a * px + b * py + c * pz, why: '미분을 하다가 계수 2를 빼먹었어. ∂(ax²)/∂x = 2ax.' },
          { v: rho * 2, why: '미분을 두 번 했어. 발산은 1계 도함수의 합이야.' },
          { v: rho / 2, why: '계수 2 를 나눴어. d(x²)/dx = 2x 이니까 곱해야 해.' },
        ],
        conclusion: '∇·D = 2·' + n(a) + '·' + n(px) + ' + 2·' + n(b) + '·' + n(py) + ' + 2·' + n(c) + '·' + n(pz) + ' = ' + q(rho, 'C/m³', 3),
        steps: ['∂Dx/∂x = 2a·x = ' + n(2 * a * px) + ', ∂Dy/∂y = 2b·y = ' + n(2 * b * py) + ', ∂Dz/∂z = 2c·z = ' + n(2 * c * pz) + '.', '세 값의 합이 ρ = ∇·D.', '= ' + q(rho, 'C/m³', 3) + '.'],
        check: '작은 체적 1 mm³ 안의 전하는 ρ × 10⁻⁹ 이야.',
        traps: ['∇·D = ρ (가우스), 전위 쪽 푸아송 ∇²V = −ρ/ε₀ 와 구분.'],
      };
    },
  });

  // ───────── 콘덴서 ─────────
  T({
    id: 'cap-ser-lim',
    concept: 'em-capacitor',
    gen(r) {
      const Vr = r.pick([1000, 2000, 500]);
      const caps = r.pick([[0.01, 0.02, 0.04], [0.02, 0.04, 0.08], [0.1, 0.2, 0.4], [0.05, 0.1, 0.2]]);
      const Cs = 1 / caps.reduce((s, c) => s + 1 / c, 0);
      const Qmax = Math.min(...caps.map((c) => c * Vr)); // μF × V = μC
      const V = Qmax / Cs;
      return {
        params: { Vr, caps },
        text: '내압이 모두 ' + q(Vr, 'V') + ' 이고 정전용량이 ' + caps.map((c) => n(c) + ' μF').join(', ') + ' 인 세 콘덴서를 직렬로 이었어. 이 직렬 회로 양단에 가할 수 있는 최대 전압은 몇 V 야?',
        formula: '직렬: 전하 Q 가 같음 → Q한계 = min(Cᵢ·Vᵢ),  V전체 = Q한계 / C합성',
        unit: 'V',
        decimals: 3,
        answer: V,
        distractors: [
          { v: Vr * 3, why: '내압을 그냥 더했어. 직렬에서는 전하가 같아서 용량이 작은 콘덴서에 전압이 많이 걸려.' },
          { v: Vr, why: '내압 하나만 답했어. 용량이 큰 콘덴서는 아직 여유가 있어서 전체는 더 걸 수 있어.' },
          { v: Vr * caps.length * 0 + Vr * (1 + caps[0] / caps[1] + caps[0] / caps[2]), why: '내압 비율을 잘못 곱했어. 직렬 전압은 용량에 반비례로 나뉘니까 (Q한계)/(합성 C)로 구해야 해.' },
          { v: V / 2, why: '계산이 어긋났어. 가장 먼저 한계에 닿는 콘덴서의 Q = C·V내압 를 기준으로 해.' },
        ],
        conclusion: 'Q한계 = ' + n(Qmax) + ' μC, C합성 = ' + n(Cs, 5) + ' μF → V = ' + q(V, 'V', 3),
        steps: ['콘덴서마다 견딜 수 있는 전하 Cᵢ·Vᵢ = ' + caps.map((c) => n(c * Vr)).join(', ') + ' μC → 가장 작은 ' + n(Qmax) + ' μC 가 직렬 전체의 한계.', '합성 용량 1/C = Σ1/Cᵢ → C = ' + n(Cs, 5) + ' μF.', 'V = Q ÷ C = ' + q(V, 'V', 3) + '.'],
        check: '용량이 가장 작은 콘덴서(' + n(Math.min(...caps)) + ' μF)에 정확히 ' + n(Vr) + ' V 가 걸리는지 확인해 봐.',
        traps: ['직렬 콘덴서: 먼저 파괴되는 것은 "최대 충전 전하량(C·V내압)이 가장 작은" 것.'],
      };
    },
  });

  T({
    id: 'cap-sph',
    concept: 'em-capacitor',
    gen(r) {
      const kind = r.pick(['single', 'two', 'cyl']);
      if (kind === 'single') {
        const a = r.pick([1, 2, 3, 5, 10]);
        const C = 4 * Math.PI * EPS0 * (a / 100) * 1e12;
        return {
          params: { kind, a },
          text: '공기 중에 있는 반지름 ' + q(a, 'cm') + ' 인 고립 도체구의 정전용량은 약 몇 pF 야?',
          formula: 'C = 4πε₀a',
          unit: 'pF',
          decimals: 3,
          answer: C,
          distractors: [
            { v: C * 2, why: '지름을 반지름처럼 썼어(또는 2배). C = 4πε₀ × 반지름.' },
            { v: C * 100, why: 'cm 를 m 로 바꾸지 않았어. ' + n(a) + ' cm = ' + n(a / 100) + ' m.' },
            { v: 2 * Math.PI * EPS0 * (a / 100) * 1e12, why: '4π 가 아니라 2π 를 썼어(원통형 공식과 혼동). 구는 4πε₀a.' },
            { v: (4 * Math.PI * EPS0 * (a / 100) * 1e12) / 1000, why: '단위를 잘못 환산했어. F → pF 는 ×10¹².' },
          ],
          conclusion: 'C = 4π × 8.855×10⁻¹² × ' + n(a / 100) + ' = ' + n(C * 1e-12, 5) + ' F = ' + q(C, 'pF', 3),
          steps: ['도체구의 정전용량은 C = Q/V = 4πε₀a (다른 도체는 무한히 멀리).', 'a = ' + n(a / 100) + ' m 이므로 C = ' + n(C * 1e-12, 5) + ' F.', 'pF 로: ' + q(C, 'pF', 3) + ' (반지름 1 m 면 약 111 pF).'],
          check: '반지름 1 m 구가 약 111 pF 라는 걸 기준으로 비례해서 확인할 수 있어.',
          traps: ['지름이 주어지면 반지름(÷2)부터 구해.'],
        };
      }
      if (kind === 'two') {
        const a = r.pick([2, 3, 5]);
        const b = a * r.pick([2, 3]);
        const C = ((4 * Math.PI * EPS0 * (a / 100) * (b / 100)) / ((b - a) / 100)) * 1e12;
        return {
          params: { kind, a, b },
          text: '진공 중에서 내구의 반지름 ' + q(a, 'cm') + ', 외구(속 반지름) ' + q(b, 'cm') + ' 인 동심 구형 콘덴서의 정전용량은 약 몇 pF 야?',
          formula: 'C = 4πε₀·ab/(b − a)',
          unit: 'pF',
          decimals: 3,
          answer: C,
          distractors: [
            { v: 4 * Math.PI * EPS0 * (a / 100) * 1e12, why: '내구 하나의 고립 정전용량이야. 외구가 있으면 ab/(b − a) 로 바뀌어.' },
            { v: ((4 * Math.PI * EPS0 * (a / 100) * (b / 100)) / ((b + a) / 100)) * 1e12, why: 'b + a 로 나눴어. 두 구의 간격 b − a 로 나눠야 해.' },
            { v: ((4 * Math.PI * EPS0 * (b - a)) / 100 / (a * b / 10000)) * 1e12, why: '분자·분모를 거꾸로 썼어. C = 4πε₀ ab/(b − a).' },
            { v: C * 100, why: 'cm 를 m 로 바꾸지 않았어.' },
          ],
          conclusion: 'C = 4πε₀ × (' + n(a / 100) + ' × ' + n(b / 100) + ') ÷ ' + n((b - a) / 100) + ' = ' + q(C, 'pF', 3),
          steps: ['동심구: 전위차 V = Q/(4πε₀)·(1/a − 1/b) → C = 4πε₀·ab/(b − a).', 'a = ' + n(a / 100) + ' m, b = ' + n(b / 100) + ' m 를 대입.', '= ' + q(C, 'pF', 3) + '.'],
          check: 'b → ∞ 이면 4πε₀a (고립 도체구)와 같아져.',
          traps: ['동심구는 ab/(b − a), 반지름을 같은 배수로 키우면 용량도 같은 배수.'],
        };
      }
      const a = r.pick([0.5, 1, 2]);
      const b = a * r.pick([2, 3, 4]);
      const len = r.pick([50, 100, 200]);
      const C = ((2 * Math.PI * EPS0 * (len / 100)) / Math.log(b / a)) * 1e12;
      return {
        params: { kind, a, b, len },
        text: '반지름 ' + q(a, 'cm') + ' 와 ' + q(b, 'cm') + ' 인 동축 원통 도체(길이 ' + q(len, 'cm') + ', 사이는 진공)의 정전용량은 약 몇 pF 야?',
        formula: 'C = 2πε₀·ℓ / ln(b/a)',
        unit: 'pF',
        decimals: 3,
        answer: C,
        distractors: [
          { v: C * Math.log(b / a), why: 'ln(b/a) 로 나누지 않았어. 동축 원통은 2πε₀ℓ ÷ ln(b/a).' },
          { v: ((2 * Math.PI * EPS0 * (len / 100)) / Math.log10(b / a)) * 1e12, why: '상용로그를 썼어. 자연로그 ln 을 써.' },
          { v: ((4 * Math.PI * EPS0 * (len / 100)) / Math.log(b / a)) * 1e12, why: '4π 를 썼어(구의 공식과 혼동). 원통은 2π.' },
          { v: ((2 * Math.PI * EPS0 * (len / 100)) / ((b - a) / 100)) * 1e12, why: '간격으로 나눴어. 원통은 전계가 1/r 로 변해서 ln(b/a) 가 나와.' },
        ],
        conclusion: 'C = 2π × 8.855×10⁻¹² × ' + n(len / 100) + ' ÷ ln(' + n(b / a) + ') = ' + q(C, 'pF', 3),
        steps: ['원통 사이 전계 E = λ/(2πε₀r) 이고 V = λ/(2πε₀)·ln(b/a).', 'C = Q/V = 2πε₀ℓ/ln(b/a).', 'ℓ = ' + n(len / 100) + ' m, ln(' + n(b / a) + ') = ' + n(Math.log(b / a), 4) + ' → ' + q(C, 'pF', 3) + '.'],
        check: '길이에 비례하고 b/a 가 클수록 작아져.',
        traps: ['동축 원통: 2πε₀ℓ/ln(b/a), 동심구: 4πε₀ab/(b − a).'],
      };
    },
  });

  T({
    id: 'cap-glass',
    concept: 'em-capacitor',
    gen(r) {
      const C0 = r.pick([0.03, 0.06, 0.2, 0.3]);
      const f = r.pick([0.5, 2 / 3, 0.25]);
      const er = r.pick([4, 5, 6, 10]);
      const C = C0 / (1 - f + f / er);
      const fs = f === 0.5 ? '절반' : f === 0.25 ? '1/4' : '2/3';
      return {
        params: { C0, f, er },
        text: '정전용량 ' + q(C0, 'μF') + ' 인 평행판 공기 콘덴서의 극판 사이에 간격의 ' + fs + ' 두께인 비유전율 ' + n(er) + ' 의 유리판을 극판과 평행하게 넣었어. 정전용량은 약 몇 μF 야?',
        formula: 'C = C₀ / ((1 − f) + f/εr)   (f: 유리판 두께 ÷ 간격)',
        unit: 'μF',
        decimals: 4,
        answer: C,
        distractors: [
          { v: C0 * er, why: '전체를 유전체로 채운 경우(εr배)야. 일부만 채우면 직렬 합성으로 계산해.' },
          { v: C0 * (1 - f + f * er), why: '두께 비를 용량에 곱했어(병렬로 착각). 극판과 평행한 층은 직렬(두께/유전율 합)이야.' },
          { v: C0 / (1 - f + f * er), why: '유리 부분의 d/εr 를 d·εr 로 썼어.' },
          { v: C0 / (1 - f), why: '유리판을 빼기만 했어. 유리 부분은 f/εr 만큼 기여해.' },
        ],
        conclusion: 'C = ' + n(C0) + ' ÷ ((1 − ' + n(f, 4) + ') + ' + n(f, 4) + '/' + n(er) + ') = ' + q(C, 'μF', 4),
        steps: ['공기층(두께 (1 − f)d)과 유리층(두께 f·d)이 직렬.', 'C = ε₀S/((1 − f)d + f·d/εr) = C₀ / ((1 − f) + f/εr).', '분모 = ' + n(1 - f + f / er, 4) + ' → C = ' + q(C, 'μF', 4) + '.'],
        check: C0 + ' μF 보다 커야 하고 εr배(' + n(C0 * er, 3) + ')보다는 작아야 해.',
        traps: ['극판에 평행한 유전체 층은 직렬(d/ε 합), 수직으로 나눠 채우면 병렬(면적 합).'],
      };
    },
  });

  T({
    id: 'cap-w',
    concept: 'em-capacitor',
    gen(r) {
      const mode = r.pick(['W', 'C']);
      if (mode === 'W') {
        const Cu = r.pick([1000, 2000, 5000, 10000]);
        const V = r.pick([12, 24, 60, 100]);
        const W = 0.5 * Cu * 1e-6 * V * V;
        return {
          params: { mode, Cu, V },
          text: q(Cu, 'μF') + ' 의 콘덴서를 ' + q(V, 'V') + ' 로 충전했을 때 축적되는 에너지는 몇 J 야?',
          formula: 'W = ½CV²',
          unit: 'J',
          decimals: 4,
          answer: W,
          distractors: [
            { v: Cu * 1e-6 * V * V, why: '½ 를 빼먹었어. W = ½CV².' },
            { v: 0.5 * Cu * V * V, why: 'μF 를 F 로 바꾸지 않았어.' },
            { v: 0.5 * Cu * 1e-6 * V, why: 'V 를 제곱하지 않았어.' },
            { v: Cu * 1e-6 * V, why: '이건 전하량 Q = CV 야. 에너지는 ½QV = ½CV².' },
          ],
          conclusion: 'W = ½ × ' + n(Cu * 1e-6, 6) + ' × ' + n(V) + '² = ' + q(W, 'J', 4),
          steps: ['C = ' + n(Cu) + ' μF = ' + n(Cu * 1e-6, 6) + ' F.', 'W = ½CV² = ½ × ' + n(Cu * 1e-6, 6) + ' × ' + n(V * V) + '.', '= ' + q(W, 'J', 4) + '.'],
          check: 'W = ½QV (Q = CV = ' + n(Cu * 1e-6 * V, 5) + ' C) 로도 같아.',
          traps: ['정전 에너지 = ½CV² = ½QV = Q²/2C 세 가지 꼴을 모두 알아 둬.'],
        };
      }
      const V = r.pick([500, 1000, 2000]);
      const W = r.pick([0.5, 1, 2, 5]);
      const Cu = ((2 * W) / (V * V)) * 1e6;
      return {
        params: { mode, V, W },
        text: q(V, 'V') + ' 로 충전한 콘덴서의 정전 에너지가 ' + q(W, 'J') + ' 이다. 이 콘덴서의 정전용량은 몇 μF 야?',
        formula: 'W = ½CV²  →  C = 2W/V²',
        unit: 'μF',
        decimals: 4,
        answer: Cu,
        distractors: [
          { v: (W / (V * V)) * 1e6, why: '2 를 곱하지 않았어. C = 2W/V².' },
          { v: (2 * W) / V * 1e6, why: 'V 를 제곱하지 않았어.' },
          { v: (2 * W) / (V * V), why: 'F 를 μF 로 바꾸지 않았어(×10⁶).' },
          { v: (V * V) / (2 * W) * 1e-6, why: '식을 거꾸로 세웠어. C = 2W ÷ V².' },
        ],
        conclusion: 'C = 2 × ' + n(W) + ' ÷ ' + n(V) + '² = ' + n(Cu * 1e-6, 8) + ' F = ' + q(Cu, 'μF', 4),
        steps: ['W = ½CV² → C = 2W/V².', '2 × ' + n(W) + ' ÷ ' + n(V * V) + ' = ' + n(Cu * 1e-6, 8) + ' F.', 'μF 로: ' + q(Cu, 'μF', 4) + '.'],
        check: '½ × ' + n(Cu * 1e-6, 8) + ' × ' + n(V * V) + ' = ' + n(0.5 * Cu * 1e-6 * V * V, 4) + ' J.',
        traps: ['단위: F → μF 는 ×10⁶.'],
      };
    },
  });

  T({
    id: 'cap-pf',
    concept: 'em-capacitor',
    gen(r) {
      const S = r.pick([0.01, 0.02, 0.05]);
      const Qu = r.pick([0.5, 1, 2, 5]);
      const F1 = (Qu * 1e-6) ** 2 / (2 * EPS0 * S);
      return {
        params: { S, Qu },
        text: '면적 ' + q(S, 'm²') + ' 인 공기 중 평행판 콘덴서에 ' + q(Qu, 'μC') + ' 의 전하를 충전했어. 두 극판 사이에 작용하는 흡인력은 몇 N 이야?',
        formula: 'F = Q² / (2ε₀S)',
        unit: 'N',
        decimals: 4,
        answer: F1,
        distractors: [
          { v: F1 * 2, why: '½ 를 빼먹었어. F = Q²/(2ε₀S).' },
          { v: F1 / S, why: '면적으로 한 번 더 나눴어. F = Q²/(2ε₀S) 에서 S 는 한 번만.' },
          { v: (Qu * 1e-6) ** 2 / (2 * EPS0), why: '면적 S 로 나누지 않았어.' },
          { v: (Qu * 1e-6) / (2 * EPS0 * S), why: 'Q 를 제곱하지 않았어(이건 단위 면적당 σ/(2ε₀) 꼴).' },
        ],
        conclusion: 'F = (' + n(Qu) + '×10⁻⁶)² ÷ (2 × 8.855×10⁻¹² × ' + n(S) + ') = ' + q(F1, 'N', 4),
        steps: ['판 사이 전계 E = σ/ε₀ = Q/(ε₀S).', '단위 면적당 힘 ½ε₀E² 에 면적 S 를 곱하면 F = Q²/(2ε₀S).', '= ' + q(F1, 'N', 4) + '.'],
        check: 'F = ½·Q·E (E = Q/ε₀S) 로도 같아.',
        traps: ['전하 일정이면 F = Q²/(2ε₀S) (간격과 무관), 전압 일정이면 F = ½ε₀SV²/d².'],
      };
    },
  });

  T({
    id: 'cap-eps',
    concept: 'em-capacitor',
    gen(r) {
      const D = r.pick([2.4, 3.6, 4.8]) * 1e-7;
      const w = r.pick([3, 5.3, 8]) * 1e-3;
      const eps = (D * D) / (2 * w);
      return {
        params: { D, w },
        text: '평행판 콘덴서에 어떤 유전체를 넣었더니 전속밀도가 ' + n(D * 1e7, 3) + '×10⁻⁷ C/m² 이고 단위 체적당 정전 에너지가 ' + n(w * 1e3, 3) + '×10⁻³ J/m³ 이었어. 이 유전체의 유전율은 약 몇 pF/m 야?',
        formula: 'w = D²/(2ε)  →  ε = D²/(2w)',
        unit: 'pF/m',
        decimals: 3,
        answer: eps * 1e12,
        distractors: [
          { v: (D / (2 * w)) * 1e12, why: 'D 를 제곱하지 않았어. w = D²/2ε.' },
          { v: ((D * D) / w) * 1e12, why: '2 로 나누는 걸 빼먹었어. ε = D²/(2w).' },
          { v: ((2 * w) / (D * D)) * 1e12, why: '식을 거꾸로 세웠어. ε = D² ÷ 2w.' },
          { v: Math.sqrt((D * D) / (2 * w)) * 1e12, why: '제곱근을 씌웠어. ε = D²/(2w) 그대로.' },
        ],
        conclusion: 'ε = D²/(2w) = (' + n(D, 9) + ')² ÷ (2 × ' + n(w, 5) + ') = ' + q(eps * 1e12, 'pF/m', 3),
        steps: ['단위 체적당 에너지 w = ½·E·D = D²/(2ε).', 'ε = D²/(2w).', '= ' + q(eps * 1e12, 'pF/m', 3) + '.'],
        check: '진공 유전율 8.855×10⁻¹² 와 비교해 비유전율 = ' + n(eps / EPS0, 3) + '.',
        traps: ['w = ½ED = ½εE² = D²/2ε 세 꼴에서 주어진 값에 맞게 골라.'],
      };
    },
  });

  T({
    id: 'cap-sheets',
    concept: 'em-capacitor',
    gen(r) {
      const Scm = r.pick([4, 5, 10]);
      const Cp = r.pick([1, 2, 5]);
      const er = r.pick([2, 2.5, 3.5]);
      const t = r.pick([0.01, 0.02, 0.05]);
      const nsh = (EPS0 * er * (Scm * 1e-4)) / (Cp * 1e-12 * t * 1e-3);
      return {
        params: { Scm, Cp, er, t },
        text: '극판 면적 ' + q(Scm, 'cm²') + ', 정전용량 ' + q(Cp, 'pF') + ' 인 종이 콘덴서를 만들려고 해. 비유전율 ' + n(er) + ', 두께 ' + q(t, 'mm') + ' 의 종이를 몇 장 겹쳐야 해? (ε₀ = 8.855×10⁻¹² F/m, 개수는 소수 첫째 자리까지)',
        formula: 'C = ε₀εrS/d,  d = n·t  →  n = ε₀εrS / (C·t)',
        unit: '장',
        decimals: 1,
        answer: nsh,
        distractors: [
          { v: (EPS0 * (Scm * 1e-4)) / (Cp * 1e-12 * t * 1e-3), why: '비유전율 εr 를 곱하지 않았어.' },
          { v: nsh / er / er, why: 'εr 를 두 번 나눴어. 한 번만 곱해야 해.' },
          { v: (EPS0 * er * Scm) / (Cp * 1e-12 * t * 1e-3), why: 'cm² 를 m² 로 바꾸지 않았어(10⁻⁴).' },
          { v: nsh * 1000, why: 'mm → m 환산이 틀렸어. ' + n(t) + ' mm = ' + n(t * 1e-3, 6) + ' m.' },
        ],
        conclusion: 'n = ' + n(EPS0 * er * Scm * 1e-4, 6) + ' ÷ (' + n(Cp * 1e-12, 12) + ' × ' + n(t * 1e-3, 8) + ') = ' + q(nsh, '장', 1),
        steps: ['종이를 n장 겹치면 간격 d = n × t (모두 같은 유전체).', 'C = ε₀εrS/(n·t) → n = ε₀εrS/(C·t).', 'S = ' + n(Scm * 1e-4, 6) + ' m², t = ' + n(t * 1e-3, 8) + ' m → n = ' + q(nsh, '장', 1) + '.'],
        check: '장수는 정수이므로 실제로는 올림(예: 885.5 → 886장).',
        traps: ['겹친 종이의 두께 합이 극판 간격 d. 개수는 올림해서 답해.'],
      };
    },
  });

  T({
    id: 'cap-leak',
    concept: 'em-capacitor',
    gen(r) {
      const er = r.pick([2.2, 3, 4]);
      const rho = r.pick([1e10, 1e11, 1e12]);
      const Cu = r.pick([10, 20, 100, 200]);
      const kV = r.pick([100, 500, 1000]);
      const I = (kV * 1e3 * Cu * 1e-6) / (rho * EPS0 * er);
      return {
        params: { er, rho, Cu, kV },
        text: '비유전율 ' + n(er) + ', 고유 저항 ' + n(rho / 1e10) + '×10¹⁰ Ω·m 인 유전체를 넣은 콘덴서의 용량이 ' + q(Cu, 'μF') + ' 이야. 여기에 ' + q(kV, 'kV') + ' 를 가했을 때 흐르는 누설 전류는 몇 A 야? (ε₀ = 8.855×10⁻¹²)',
        formula: 'R·C = ρ·ε  →  R = ρε/C,   I = V/R = V·C/(ρε)',
        unit: 'A',
        decimals: 4,
        answer: I,
        distractors: [
          { v: (kV * 1e3 * Cu * 1e-6) / (rho * EPS0), why: '비유전율 εr 를 빼먹었어. ε = ε₀εr.' },
          { v: (kV * 1e3 * rho * EPS0 * er) / (Cu * 1e-6), why: '식을 거꾸로 세웠어. R = ρε/C 이고 I = V/R.' },
          { v: (kV * Cu * 1e-6) / (rho * EPS0 * er), why: 'kV 를 V 로 바꾸지 않았어(×10³).' },
          { v: (kV * 1e3 * Cu) / (rho * EPS0 * er), why: 'μF 를 F 로 바꾸지 않았어.' },
        ],
        conclusion: 'R = ρε/C = ' + n(rho) + ' × ' + n(EPS0 * er, 5) + ' ÷ ' + n(Cu * 1e-6, 6) + ' → I = V/R = ' + q(I, 'A', 4),
        steps: ['전극 모양이 달라도 저항과 정전용량의 곱은 R·C = ρ·ε 야.', 'R = ρε/C = ' + n((rho * EPS0 * er) / (Cu * 1e-6), 4) + ' Ω.', 'I = V/R = ' + q(I, 'A', 4) + '.'],
        check: 'ε = ε₀εr = ' + n(EPS0 * er, 5) + ' F/m 로 계산했는지 확인.',
        traps: ['RC = ρε 는 전극 형태와 무관(저항과 용량의 같은 구조).'],
      };
    },
  });

  T({
    id: 'cap-line',
    concept: 'em-capacitor',
    gen(r) {
      const a = r.pick([1, 2, 5]); // mm
      const D = r.pick([1, 2, 5]); // m
      const len = r.pick([1, 5, 10]); // km
      const C = ((Math.PI * EPS0 * len * 1000) / Math.log(D / (a * 1e-3))) * 1e6; // μF
      return {
        params: { a, D, len },
        text: '반지름 ' + q(a, 'mm') + ' 의 두 평행 원통 도체가 중심 간격 ' + q(D, 'm') + ' 로 진공 중에 놓여 있어. ' + q(len, 'km') + ' 당 정전용량은 약 몇 μF 야? (D ≫ a)',
        formula: 'C = πε₀ℓ / ln(D/a)',
        unit: 'μF',
        decimals: 5,
        answer: C,
        distractors: [
          { v: C / 2, why: '2πε₀ 를 썼어. 두 선 사이의 정전용량은 πε₀ℓ/ln(D/a) 야(동축 원통의 절반).' },
          { v: C * Math.log(D / (a * 1e-3)), why: 'ln(D/a) 로 나누지 않았어.' },
          { v: (Math.PI * EPS0 * len * 1000) / Math.log10(D / (a * 1e-3)) * 1e6, why: '상용로그를 썼어. 자연로그 ln.' },
          { v: C * 1000, why: 'km 를 m 로 바꾸고 F → μF 를 잘못 했어. ℓ = ' + n(len * 1000) + ' m, F → μF = ×10⁶.' },
        ],
        conclusion: 'C = π × 8.855×10⁻¹² × ' + n(len * 1000) + ' ÷ ln(' + n(D / (a * 1e-3)) + ') = ' + q(C, 'μF', 5),
        steps: ['평행 2선: C = πε₀ℓ/ln(D/a) (D: 중심 간격, a: 도체 반지름).', 'ln(' + n(D / (a * 1e-3)) + ') = ' + n(Math.log(D / (a * 1e-3)), 4) + '.', 'C = ' + q(C, 'μF', 5) + '.'],
        check: '송전선 정전용량이 km 당 수 nF(=10⁻³ μF) 정도라서 값의 자릿수가 맞아.',
        traps: ['평행 2선 π, 동축 원통 2π (ln 안은 D/a, b/a).'],
      };
    },
  });

  T({
    id: 'cap-share',
    concept: 'em-capacitor',
    gen(r) {
      const C1 = r.pick([1, 2, 3]);
      const C2 = r.pick([1, 2, 4]);
      const Q1 = r.pick([-5, -3, 4, 6, 8]);
      const Q2 = r.pick([-2, 2, 3, 5]);
      const Vc = (Q1 + Q2) / (C1 + C2);
      const Q2p = C2 * Vc;
      const mv = Q2p - Q2;
      if (Math.abs(mv) < 0.3) return this.gen(r);
      return {
        params: { C1, C2, Q1, Q2 },
        text: '정전용량이 ' + q(C1, 'μF') + ', ' + q(C2, 'μF') + ' 인 두 도체에 각각 ' + n(Q1) + ' μC, ' + n(Q2) + ' μC 의 전하를 주고 가는 철사로 이었어. 철사를 통해 첫째 도체에서 둘째 도체로 이동한 전하는 몇 μC 야? (부호 포함 크기를 물어, 이동 방향이 반대면 같은 크기)',
        formula: '합친 뒤 전위 V = (Q₁ + Q₂)/(C₁ + C₂),  이동 전하 = C₂V − Q₂',
        unit: 'μC',
        decimals: 4,
        answer: Math.abs(mv),
        distractors: [
          { v: Math.abs(Q1 + Q2), why: '전하의 합이야. 이동한 양은 둘째 도체의 전하 변화.' },
          { v: Math.abs((Q1 - Q2) / 2), why: '두 전하의 평균 차로 구했어. 용량이 다르면 전하는 용량 비로 나뉘어.' },
          { v: Math.abs(Q2p), why: '이동 후 둘째 도체의 전하야. 이동한 양은 그 변화량(Q₂′ − Q₂).' },
          { v: Math.abs((C2 * (Q1 + Q2)) / (C1 + C2) + Q2), why: '변화량에서 부호를 틀렸어. Q₂′ − Q₂ 야.' },
        ],
        conclusion: 'V = ' + n(Vc, 4) + ' V → Q₂′ = ' + n(Q2p, 4) + ' μC → 이동 |ΔQ| = ' + q(Math.abs(mv), 'μC', 4),
        steps: ['전체 전하 ' + n(Q1 + Q2) + ' μC 는 보존, 합성 용량 ' + n(C1 + C2) + ' μF → V = ' + n(Vc, 4) + ' V.', '둘째 도체의 새 전하 Q₂′ = C₂V = ' + n(Q2p, 4) + ' μC.', '변화량 Q₂′ − Q₂ = ' + n(mv, 4) + ' μC → 크기 ' + q(Math.abs(mv), 'μC', 4) + '.'],
        check: '첫째 도체는 같은 양만큼 반대로 변해: Q₁′ − Q₁ = ' + n(C1 * Vc - Q1, 4) + ' μC.',
        traps: ['연결하면 전위가 같아지고 전체 전하는 보존.'],
      };
    },
  });

  // ───────── 자계·전자력·자기회로 ─────────
  T({
    id: 'mg-force',
    concept: 'em-force',
    gen(r) {
      const B = r.pick([0.2, 0.3, 0.5, 10, 30]);
      const I = r.pick([2, 5, 10]);
      const L = r.pick([1, 2, 3]);
      const th = r.pick([30, 45, 60, 90]);
      const Fv = B * I * L * Math.sin(rad(th));
      return {
        params: { B, I, L, th },
        text: '자속밀도 ' + q(B, 'Wb/m²') + ' 의 평등 자계 안에 ' + q(I, 'A') + ' 가 흐르는 길이 ' + q(L, 'm') + ' 의 직선 도체를 자계 방향과 ' + q(th, '°') + ' 의 각으로 놓았어. 도체가 받는 힘은 약 몇 N 이야?',
        formula: 'F = B·I·ℓ·sinθ',
        unit: 'N',
        decimals: 3,
        answer: Fv,
        distractors: [
          { v: B * I * L * Math.cos(rad(th)), why: 'cosθ 를 썼어. 자계와 전류가 이루는 각 θ 에 대해 힘은 sinθ 에 비례(직각일 때 최대).' },
          { v: B * I * L, why: 'sinθ 를 곱하지 않았어. 자계와 직각이 아니면 줄어들어.' },
          { v: B * I * Math.sin(rad(th)), why: '길이 ℓ 을 곱하지 않았어.' },
          { v: (B * I * L * Math.sin(rad(th))) / 2, why: '½ 가 붙는 식이 아니야. F = BIℓ sinθ 그대로.' },
        ],
        conclusion: 'F = ' + n(B) + ' × ' + n(I) + ' × ' + n(L) + ' × sin' + n(th) + '° = ' + q(Fv, 'N', 3),
        steps: ['도체가 받는 전자력은 F = B I ℓ sinθ (플레밍 왼손).', n(B) + ' × ' + n(I) + ' × ' + n(L) + ' = ' + n(B * I * L, 3) + '.', '× sin' + n(th) + '° (' + n(Math.sin(rad(th)), 4) + ') = ' + q(Fv, 'N', 3) + '.'],
        check: 'θ = 90° 이면 최대 ' + n(B * I * L, 3) + ' N 이고 그보다 작아.',
        traps: ['각도는 자계와 도체(전류) 방향 사이의 각, 직각일 때 최대.'],
      };
    },
  });

  T({
    id: 'mg-emf',
    concept: 'em-induction',
    gen(r) {
      const mode = r.pick(['v', 'dx']);
      const B = r.pick([1, 2, 5, 10]);
      if (mode === 'v') {
        const Lcm = r.pick([10, 20, 50]);
        const v = r.pick([10, 20, 30]);
        const th = r.pick([30, 45, 60, 90]);
        const e = B * (Lcm / 100) * v * Math.sin(rad(th));
        return {
          params: { mode, B, Lcm, v, th },
          text: '자속밀도 ' + q(B, 'Wb/m²') + ' 의 자계 안에서 길이 ' + q(Lcm, 'cm') + ' 의 도체를 자계와 ' + q(th, '°') + ' 의 각으로 ' + q(v, 'm/s') + ' 로 움직일 때 도체에 유기되는 기전력은 약 몇 V 야?',
          formula: 'e = B·ℓ·v·sinθ',
          unit: 'V',
          decimals: 3,
          answer: e,
          distractors: [
            { v: B * Lcm * v * Math.sin(rad(th)), why: 'cm 를 m 로 바꾸지 않았어.' },
            { v: B * (Lcm / 100) * v * Math.cos(rad(th)), why: 'cosθ 를 썼어. θ 는 운동 방향과 자계 사이의 각이라 sinθ.' },
            { v: B * (Lcm / 100) * v, why: 'sinθ 를 빼먹었어.' },
            { v: (B * (Lcm / 100) * Math.sin(rad(th))) / v, why: '속도로 나눴어. 기전력은 속도에 비례(곱).' },
          ],
          conclusion: 'e = ' + n(B) + ' × ' + n(Lcm / 100) + ' × ' + n(v) + ' × sin' + n(th) + '° = ' + q(e, 'V', 3),
          steps: ['도체가 자속을 끊을 때 e = Bℓv sinθ.', 'ℓ = ' + n(Lcm / 100) + ' m.', n(B) + ' × ' + n(Lcm / 100) + ' × ' + n(v) + ' × ' + n(Math.sin(rad(th)), 4) + ' = ' + q(e, 'V', 3) + '.'],
          check: 'θ = 90° 일 때 최대 Bℓv.',
          traps: ['cm → m 환산, 각은 운동 방향과 자계 사이.'],
        };
      }
      const Lcm = r.pick([4, 10, 20]);
      const dx = r.pick([0.5, 1, 2]);
      const dt = r.pick([0.2, 0.4, 0.5]);
      const e = (B * (Lcm / 100) * dx) / dt;
      return {
        params: { mode, B, Lcm, dx, dt },
        text: '자속밀도 ' + q(B, 'Wb/m²') + ' 의 자계 안에 길이 ' + q(Lcm, 'cm') + ' 의 도체를 자계와 직각으로 놓고 ' + q(dt, '초') + ' 동안 ' + q(dx, 'm') + ' 씩 균일하게 이동시켰어. 유기 기전력은 몇 V 야?',
        formula: 'e = dΦ/dt = B·ℓ·(dx/dt)',
        unit: 'V',
        decimals: 4,
        answer: e,
        distractors: [
          { v: B * (Lcm / 100) * dx, why: '시간으로 나누지 않았어. 기전력 = 자속 변화 ÷ 시간.' },
          { v: (B * Lcm * dx) / dt, why: 'cm 를 m 로 바꾸지 않았어.' },
          { v: (B * (Lcm / 100) * dt) / dx, why: '속도를 거꾸로(dt/dx) 구했어. 속도 = 거리 ÷ 시간.' },
          { v: (B * dx) / dt, why: '도체 길이 ℓ 을 곱하지 않았어.' },
        ],
        conclusion: 'v = ' + n(dx / dt, 4) + ' m/s → e = ' + n(B) + ' × ' + n(Lcm / 100) + ' × ' + n(dx / dt, 4) + ' = ' + q(e, 'V', 4),
        steps: ['속도 v = ' + n(dx) + ' ÷ ' + n(dt) + ' = ' + n(dx / dt, 4) + ' m/s.', '직각으로 자르니 e = Bℓv.', '= ' + q(e, 'V', 4) + '.'],
        check: '끊은 자속 ΔΦ = B·ℓ·dx = ' + n(B * (Lcm / 100) * dx, 4) + ' Wb 를 ' + n(dt) + ' 초로 나눈 값과 같아.',
        traps: ['e = 자속 변화/시간 = Bℓv(직각).'],
      };
    },
  });

  T({
    id: 'mg-torque',
    concept: 'em-magfield',
    gen(r) {
      const mode = r.pick(['T', 'W']);
      if (mode === 'T') {
        const m = r.pick([4, 6, 7.4, 8]) * 1e-6;
        const lcm = r.pick([3, 5, 10]);
        const H = r.pick([100, 120, 150]);
        const th = r.pick([30, 45, 60]);
        const T0 = m * (lcm / 100) * H * Math.sin(rad(th));
        return {
          params: { mode, m, lcm, H, th },
          text: '자극의 세기 ' + n(m * 1e6) + '×10⁻⁶ Wb, 길이 ' + q(lcm, 'cm') + ' 인 막대자석을 ' + q(H, 'AT/m') + ' 의 평등 자계 안에 자력선과 ' + q(th, '°') + ' 로 놓았어. 자석이 받는 회전력은 몇 N·m 야?',
          formula: 'T = M·H·sinθ,   M = m·ℓ  (자기 모멘트 = 자극 세기 × 길이)',
          unit: 'N·m',
          decimals: 6,
          answer: T0,
          distractors: [
            { v: m * H * Math.sin(rad(th)), why: '자석 길이 ℓ 을 곱하지 않았어(자기 모멘트 M = mℓ).' },
            { v: m * lcm * H * Math.sin(rad(th)), why: 'cm 를 m 로 바꾸지 않았어.' },
            { v: m * (lcm / 100) * H * Math.cos(rad(th)), why: 'cosθ 를 썼어. 회전력은 sinθ.' },
            { v: m * (lcm / 100) * H, why: 'sinθ 를 빼먹었어.' },
          ],
          conclusion: 'T = (' + n(m, 8) + ' × ' + n(lcm / 100) + ') × ' + n(H) + ' × sin' + n(th) + '° = ' + q(T0, 'N·m', 6),
          steps: ['자기 모멘트 M = m·ℓ = ' + n(m * (lcm / 100), 9) + ' Wb·m.', 'T = M·H·sinθ.', '= ' + q(T0, 'N·m', 6) + '.'],
          check: 'θ = 90° 일 때 최대 MH.',
          traps: ['M[Wb·m] × H[AT/m] = [N·m] 가 되니까 단위가 맞아.'],
        };
      }
      const M = r.pick([5, 7.4, 9.8, 12]) * 1e-5;
      const H = r.pick([10.5, 12.5, 15]);
      const W = M * H;
      return {
        params: { mode, M, H },
        text: '자기 모멘트 ' + n(M * 1e5, 3) + '×10⁻⁵ Wb·m 의 막대자석을 지구 자계의 수평 성분 ' + q(H, 'AT/m') + ' 인 곳에서 자기자오면으로부터 90° 회전시키는 데 필요한 일은 몇 J 야?',
        formula: 'W = M·H·(1 − cos90°) = M·H',
        unit: 'J',
        decimals: 7,
        answer: W,
        distractors: [
          { v: W / 2, why: '½ 를 곱했어. 90° 회전 일은 MH(1 − cos90°) = MH.' },
          { v: W * 2, why: '2배로 잡았어. 일 = MH(1 − cosθ) 이고 θ = 90° 면 MH.' },
          { v: M / H, why: '나눴어. 일 = M × H.' },
          { v: M * H * H, why: 'H 를 제곱했어.' },
        ],
        conclusion: 'W = ' + n(M, 8) + ' × ' + n(H) + ' = ' + q(W, 'J', 7),
        steps: ['자석을 θ 만큼 돌릴 때 일 W = MH(1 − cosθ).', 'θ = 90° 이니까 W = MH.', n(M, 8) + ' × ' + n(H) + ' = ' + q(W, 'J', 7) + '.'],
        check: '180° 회전이면 2MH.',
        traps: ['일 W = MH(1 − cosθ), 회전력 T = MH sinθ 를 구분.'],
      };
    },
  });

  T({
    id: 'mg-ring',
    concept: 'em-magfield',
    gen(r) {
      const mode = r.pick(['B', 'Phi', 'J', 'mur']);
      const mu = r.pick([350, 500, 600, 800, 1000]);
      if (mode === 'J') {
        const H = r.pick([200, 280, 342, 3000]);
        const Jv = MU0 * (mu - 1) * H;
        return {
          params: { mode, mu, H },
          text: '비투자율 ' + n(mu) + ' 인 환상 철심 내부의 평균 자계의 세기가 ' + q(H, 'A/m') + ' 일 때 자화의 세기는 약 몇 Wb/m² 야?',
          formula: 'J = μ₀(μr − 1)H',
          unit: 'Wb/m²',
          decimals: 4,
          answer: Jv,
          distractors: [
            { v: MU0 * mu * H, why: '(μr − 1) 의 −1 을 빼먹었어(차이가 작을 땐 거의 같지만 정확하게는 μr − 1).' },
            { v: MU0 * (mu - 1), why: 'H 를 곱하지 않았어.' },
            { v: (mu - 1) * H, why: 'μ₀ 를 곱하지 않았어(단위가 A/m 로 남아).' },
            { v: MU0 * (mu - 1) * H * 2 * Math.PI, why: '2π 를 곱했어. 이런 항은 없어.' },
          ].filter((x) => Math.abs(x.v - Jv) / Jv > 0.01),
          conclusion: 'J = 4π×10⁻⁷ × (' + n(mu) + ' − 1) × ' + n(H) + ' = ' + q(Jv, 'Wb/m²', 4),
          steps: ['자화의 세기 J = B − μ₀H = μ₀(μr − 1)H.', '4π×10⁻⁷ × ' + n(mu - 1) + ' = ' + n(MU0 * (mu - 1), 7) + '.', '× H(' + n(H) + ') = ' + q(Jv, 'Wb/m²', 4) + '.'],
          check: 'B = μ₀μrH = ' + n(MU0 * mu * H, 4) + ' T 보다 약간 작아야 해(J = B − μ₀H).',
          traps: ['J = B − μ₀H = χH, χ = μ₀(μr − 1).'],
        };
      }
      if (mode === 'mur') {
        const S = r.pick([2, 4, 5]);
        const Ph = r.pick([4, 6, 8]);
        const Hh = r.pick([2000, 2800, 3000]);
        const Bb = (Ph * 1e-4) / (S * 1e-4);
        const m = Bb / (MU0 * Hh);
        return {
          params: { mode, S, Ph, Hh },
          text: '단면적 ' + q(S, 'cm²') + ' 의 철심에 ' + n(Ph) + '×10⁻⁴ Wb 의 자속을 통하게 하려면 ' + q(Hh, 'AT/m') + ' 의 자계가 필요해. 이 철심의 비투자율은 약 얼마야?',
          formula: 'B = Φ/S,   μr = B/(μ₀H)',
          unit: '',
          decimals: 2,
          answer: m,
          distractors: [
            { v: Bb / Hh, why: 'μ₀ 로 나누지 않았어. 이건 투자율 μ 이고 비투자율은 μ/μ₀.' },
            { v: (Ph * 1e-4) / (MU0 * Hh), why: '단면적으로 나누지 않았어. 자속밀도 B = Φ/S.' },
            { v: (Bb * MU0) / Hh, why: 'μ₀ 를 곱했어. μr = B/(μ₀H) (나눠야 해).' },
            { v: Bb / (MU0 * Hh) / 10, why: '단위 환산(cm² → m²)을 틀렸어. ' + n(S) + ' cm² = ' + n(S * 1e-4, 6) + ' m².' },
          ],
          conclusion: 'B = ' + n(Ph * 1e-4, 6) + ' ÷ ' + n(S * 1e-4, 6) + ' = ' + n(Bb, 4) + ' T → μr = ' + n(Bb, 4) + ' ÷ (4π×10⁻⁷ × ' + n(Hh) + ') = ' + q(m, '', 2),
          steps: ['B = Φ/S = ' + n(Bb, 4) + ' Wb/m².', 'μ = B/H = ' + n(Bb / Hh, 7) + ' H/m.', 'μr = μ/μ₀ = ' + q(m, '', 2) + '.'],
          check: 'B = μ₀μrH = ' + n(MU0 * m * Hh, 4) + ' 로 돌아와.',
          traps: ['cm² → m² (10⁻⁴), μr = B/(μ₀H).'],
        };
      }
      const N = r.pick([300, 500, 600, 1000]);
      const I = r.pick([1, 2, 5]);
      const lc = r.pick([20, 30, 40, 50]);
      const S = r.pick([5, 10, 20]);
      const Bv = (MU0 * mu * N * I) / (lc / 100);
      const Phi = Bv * S * 1e-4;
      const ans = mode === 'B' ? Bv : Phi;
      return {
        params: { mode, mu, N, I, lc, S },
        text: '비투자율 ' + n(mu) + ', 평균 자로 길이 ' + q(lc, 'cm') + ', 단면적 ' + q(S, 'cm²') + ' 인 환상 철심에 ' + n(N) + '회 감은 코일로 ' + q(I, 'A') + ' 를 흘렸어. ' + (mode === 'B' ? '철심 안의 자속밀도는 약 몇 Wb/m² 야?' : '철심을 통하는 자속은 약 몇 Wb 야?'),
        formula: 'H = N·I/ℓ,   B = μ₀μr·H,   Φ = B·S',
        unit: mode === 'B' ? 'Wb/m²' : 'Wb',
        decimals: 6,
        answer: ans,
        distractors: [
          { v: (MU0 * N * I) / (lc / 100) * (mode === 'B' ? 1 : S * 1e-4), why: '비투자율 μr 을 곱하지 않았어. 철심이면 μ₀μr.' },
          { v: ans * (lc / 100) * (mode === 'B' ? 1 : 1) * 0 + (MU0 * mu * N * I) / (2 * Math.PI * (lc / 100) / (2 * Math.PI)) / 100 * (mode === 'B' ? 1 : S * 1e-4), why: 'cm → m 환산이 어긋났어. 길이 ' + n(lc) + ' cm = ' + n(lc / 100) + ' m.' },
          { v: mode === 'B' ? Phi : Bv, why: mode === 'B' ? '이건 자속 Φ = B·S 야. 문제는 자속밀도 B.' : '이건 자속밀도 B 야. 자속은 B 에 단면적 S 를 곱해.' },
          { v: ans * 2 * Math.PI, why: '2π 를 곱했어. 환상 코일에서 NI/ℓ 로 자계를 구해(평균 길이 ℓ 이 이미 주어짐).' },
        ],
        conclusion: 'H = ' + n(N) + '×' + n(I) + ' ÷ ' + n(lc / 100) + ' = ' + n((N * I) / (lc / 100), 3) + ' AT/m → B = ' + (mode === 'B' ? q(Bv, 'Wb/m²', 6) : n(Bv, 5) + ' Wb/m²') + (mode === 'Phi' ? ' → Φ = B·S = ' + q(Phi, 'Wb', 6) : ''),
        steps: ['자계 H = NI/ℓ = ' + n((N * I) / (lc / 100), 3) + ' AT/m.', 'B = μ₀μrH = 4π×10⁻⁷ × ' + n(mu) + ' × ' + n((N * I) / (lc / 100), 3) + ' = ' + n(Bv, 5) + ' Wb/m².', mode === 'B' ? '자속밀도는 ' + q(Bv, 'Wb/m²', 6) + '.' : 'Φ = B·S = ' + n(Bv, 5) + ' × ' + n(S * 1e-4, 6) + ' = ' + q(Phi, 'Wb', 6) + '.'],
        check: '자기저항 R = ℓ/(μS) 로 Φ = NI/R 를 구해도 같아.',
        traps: ['환상 코일에서 자계는 H = NI/ℓ (ℓ: 평균 길이), cm → m 환산.'],
      };
    },
  });

  T({
    id: 'mc-rel',
    concept: 'em-magcircuit',
    gen(r) {
      const mode = r.pick(['R', 'gap', 'mmf']);
      if (mode === 'R') {
        const S = r.pick([0.5, 1, 2]);
        const l = r.pick([0.4, 0.8, 1.2]);
        const mu = r.pick([10, 20, 50]);
        const R = l / (MU0 * mu * S);
        return {
          params: { mode, S, l, mu },
          text: '단면적 ' + q(S, 'm²') + ', 길이 ' + q(l, 'm') + ', 비투자율 ' + n(mu) + ' 인 막대 철심의 자기 저항은 약 몇 AT/Wb 야?',
          formula: 'R = ℓ / (μ₀μr·S)',
          unit: 'AT/Wb',
          decimals: 1,
          answer: R,
          distractors: [
            { v: (l * mu) / (MU0 * S), why: '비투자율을 분자에 넣었어. 투자율이 클수록 자기 저항은 작아져(분모).' },
            { v: (MU0 * mu * S) / l, why: '거꾸로야. 이건 퍼미언스(자기 컨덕턴스).' },
            { v: l / (MU0 * S), why: '비투자율 μr 을 안 넣었어.' },
            { v: (l * S) / (MU0 * mu), why: 'S 를 분자에 넣었어. 단면적이 크면 자기 저항이 작아(분모).' },
          ],
          conclusion: 'R = ' + n(l) + ' ÷ (4π×10⁻⁷ × ' + n(mu) + ' × ' + n(S) + ') = ' + q(R, 'AT/Wb', 1),
          steps: ['자기 저항 R = ℓ/(μS) 이고 μ = μ₀μr.', 'μS = 4π×10⁻⁷ × ' + n(mu) + ' × ' + n(S) + ' = ' + n(MU0 * mu * S, 8) + '.', 'R = ' + n(l) + ' ÷ ' + n(MU0 * mu * S, 8) + ' = ' + q(R, 'AT/Wb', 1) + '.'],
          check: '길이에 비례, 투자율·단면적에 반비례.',
          traps: ['전기저항 R = ℓ/(σS) 와 같은 꼴(σ ↔ μ).'],
        };
      }
      if (mode === 'gap') {
        const lc = r.pick([1, 0.5, 0.8]);
        const mu = r.pick([500, 1000, 2000]);
        const gap = r.pick([0.5, 1, 2]); // mm
        const ratio = 1 + (gap * 1e-3 * mu) / lc;
        return {
          params: { mode, lc, mu, gap },
          text: '길이 ' + q(lc, 'm') + ' 인 철심(비투자율 ' + n(mu) + ')의 자기 회로에 ' + q(gap, 'mm') + ' 의 공극이 생겼어. 전체 자기 저항은 공극이 없을 때의 몇 배가 돼? (단면적은 모두 같다)',
          formula: 'R전체/R철 = 1 + (ℓg·μr)/ℓ',
          unit: '배',
          decimals: 4,
          answer: ratio,
          distractors: [
            { v: (gap * 1e-3 * mu) / lc, why: '공극 부분만의 비야. 전체는 철심 저항(1)에 공극 저항을 더해야 해.' },
            { v: 1 + (gap * 1e-3) / lc, why: '공극과 철심의 투자율 차이(μr 배)를 무시했어. 공극의 자기 저항은 철심의 μr 배 단위길이당 커.' },
            { v: 1 + (gap * mu) / lc, why: 'mm 를 m 로 바꾸지 않았어.' },
            { v: mu, why: '비투자율을 답했어. 공극 때문에 증가한 배수는 1 + ℓgμr/ℓ.' },
          ],
          conclusion: '배수 = 1 + (' + n(gap * 1e-3, 4) + ' × ' + n(mu) + ') ÷ ' + n(lc) + ' = ' + q(ratio, '배', 4),
          steps: ['철심 부분 R철 = ℓ/(μ₀μrS), 공극 부분 R공 = ℓg/(μ₀S).', 'R공/R철 = ℓg·μr/ℓ = ' + n((gap * 1e-3 * mu) / lc, 4) + '.', '전체 = R철 + R공 → ' + q(ratio, '배', 4) + '.'],
          check: '짧은 공극이라도 μr 이 크면 자기 저항이 크게 늘어.',
          traps: ['직렬 자기 저항: R전체 = R철 + R공극 (공극의 투자율 μ₀).'],
        };
      }
      const phi = r.pick([0.005, 0.01, 0.02]);
      const l = r.pick([0.6, 1]);
      const S = r.pick([10, 15, 20]);
      const mu = r.pick([500, 1000]);
      const F = (phi * l) / (MU0 * mu * S * 1e-4);
      return {
        params: { mode, phi, l, S, mu },
        text: '길이 ' + q(l, 'm') + ', 단면적 ' + q(S, 'cm²') + ' 인 무단 솔레노이드(철심 비투자율 ' + n(mu) + ')에 ' + q(phi, 'Wb') + ' 의 자속을 통하려면 기자력은 약 몇 AT 가 필요해?',
        formula: 'F = Φ·R = Φ·ℓ / (μ₀μr·S)',
        unit: 'AT',
        decimals: 1,
        answer: F,
        distractors: [
          { v: (phi * l) / (MU0 * mu * S), why: 'cm² 를 m² 로 바꾸지 않았어.' },
          { v: phi / (MU0 * mu * S * 1e-4), why: '길이 ℓ 을 곱하지 않았어(자기 저항 = ℓ/μS).' },
          { v: (phi * MU0 * mu * S * 1e-4) / l, why: '거꾸로 썼어. 기자력 = 자속 × 자기 저항.' },
          { v: (phi * l) / (MU0 * S * 1e-4), why: '비투자율을 빼먹었어.' },
        ],
        conclusion: 'F = ' + n(phi) + ' × ' + n(l) + ' ÷ (4π×10⁻⁷ × ' + n(mu) + ' × ' + n(S * 1e-4, 6) + ') = ' + q(F, 'AT', 1),
        steps: ['자기 저항 R = ℓ/(μ₀μrS) = ' + n(l / (MU0 * mu * S * 1e-4), 2) + ' AT/Wb.', '기자력 F = Φ·R (옴의 법칙에 대응).', '= ' + q(F, 'AT', 1) + '.'],
        check: 'F = NI 로부터 권수·전류를 정하면 돼.',
        traps: ['자기 회로의 옴의 법칙: F = ΦR (기자력 = 자속 × 자기 저항).'],
      };
    },
  });

  T({
    id: 'mg-w',
    concept: 'em-magfield',
    gen(r) {
      const mode = r.pick(['F', 'I', 'B']);
      if (mode === 'F') {
        const Fm = r.pick([1000, 2000, 3000]);
        const Ph = r.pick([1, 2, 5]) * 1e-3;
        const W = 0.5 * Fm * Ph;
        return {
          params: { mode, Fm, Ph },
          text: '어떤 자기 회로에 ' + q(Fm, 'AT') + ' 의 기자력을 가했더니 ' + n(Ph * 1e3) + '×10⁻³ Wb 의 자속이 통했어. 이 자기 회로에 저장된 에너지는 몇 J 야?',
          formula: 'W = ½·F·Φ  (= ½·N·I·Φ)',
          unit: 'J',
          decimals: 4,
          answer: W,
          distractors: [
            { v: Fm * Ph, why: '½ 를 빼먹었어. 저장 에너지는 ½FΦ.' },
            { v: 0.5 * Fm * Ph * Ph, why: 'Φ 를 제곱했어. W = ½FΦ = ½Φ²R.' },
            { v: 0.5 * Fm * Fm * Ph, why: '기자력을 제곱했어.' },
            { v: Fm / Ph, why: '나눴어. 에너지는 기자력 × 자속의 절반.' },
          ],
          conclusion: 'W = ½ × ' + n(Fm) + ' × ' + n(Ph, 4) + ' = ' + q(W, 'J', 4),
          steps: ['자기 회로의 저장 에너지 W = ½·F·Φ (전기 ½VQ 에 대응).', '½ × ' + n(Fm) + ' × ' + n(Ph, 4) + '.', '= ' + q(W, 'J', 4) + '.'],
          check: 'NI·Φ = Λ·I (쇄교 자속) 이므로 ½LI² 과 같은 값.',
          traps: ['W = ½ΦF = ½LI² = ½·쇄교자속·전류.'],
        };
      }
      if (mode === 'I') {
        const I = r.pick([2, 4, 5]);
        const Lam = r.pick([2, 4, 6]);
        const W = 0.5 * I * Lam;
        return {
          params: { mode, I, Lam },
          text: q(I, 'A') + ' 의 전류가 흐르는 코일과 쇄교하는 자속수가 ' + q(Lam, 'Wb') + ' 이야. 코일에 저장된 자기 에너지는 몇 J 야?',
          formula: 'W = ½·I·Λ  (Λ = N·Φ = L·I)',
          unit: 'J',
          decimals: 3,
          answer: W,
          distractors: [
            { v: I * Lam, why: '½ 를 빼먹었어.' },
            { v: 0.5 * I * I * Lam, why: '전류를 제곱했어. ½LI² 에서 L 은 Λ/I 라서 ½IΛ 이야.' },
            { v: 0.5 * Lam * Lam, why: '쇄교 자속을 제곱했어. ½IΛ.' },
            { v: Lam / I, why: '이건 인덕턴스 L = Λ/I 야.' },
          ],
          conclusion: 'W = ½ × ' + n(I) + ' × ' + n(Lam) + ' = ' + q(W, 'J', 3),
          steps: ['인덕턴스 L = Λ/I = ' + n(Lam / I, 3) + ' H.', 'W = ½LI² = ½IΛ.', '= ' + q(W, 'J', 3) + '.'],
          check: '½ × ' + n(Lam / I, 3) + ' × ' + n(I) + '² = ' + n(0.5 * (Lam / I) * I * I, 3) + ' J.',
          traps: ['쇄교 자속(Λ = NΦ)과 전류로 ½IΛ.'],
        };
      }
      const mu = r.pick([1000, 2500, 5000]);
      const Bv = r.pick([1, 2, 5]);
      const Vol = r.pick([2, 4, 10]) * 1e-6;
      const W = ((Bv * Bv) / (2 * MU0 * mu)) * Vol;
      return {
        params: { mode, mu, Bv, Vol },
        text: '비투자율 ' + n(mu) + ' 인 철심의 자속밀도가 ' + q(Bv, 'Wb/m²') + ', 철심의 부피가 ' + n(Vol * 1e6) + '×10⁻⁶ m³ 일 때 이 철심에 저장된 자기 에너지는 몇 J 야?',
        formula: 'w = B²/(2μ) [J/m³],   W = w·V',
        unit: 'J',
        decimals: 5,
        answer: W,
        distractors: [
          { v: ((Bv * Bv) / (2 * MU0)) * Vol, why: '비투자율 μr 로 나누지 않았어. μ = μ₀μr.' },
          { v: ((Bv * Bv) / (MU0 * mu)) * Vol, why: '½ 를 빼먹었어. w = B²/(2μ).' },
          { v: (Bv / (2 * MU0 * mu)) * Vol, why: 'B 를 제곱하지 않았어.' },
          { v: (Bv * Bv) / (2 * MU0 * mu), why: '부피를 곱하지 않았어(이건 에너지 밀도).' },
        ],
        conclusion: 'w = ' + n(Bv) + '² ÷ (2 × 4π×10⁻⁷ × ' + n(mu) + ') = ' + n((Bv * Bv) / (2 * MU0 * mu), 4) + ' J/m³ → W = w·V = ' + q(W, 'J', 5),
        steps: ['자기 에너지 밀도 w = B²/(2μ) = B·H/2.', 'μ = μ₀μr = ' + n(MU0 * mu, 6) + ' H/m → w = ' + n((Bv * Bv) / (2 * MU0 * mu), 4) + ' J/m³.', 'W = w × V = ' + q(W, 'J', 5) + '.'],
        check: 'w = ½μH² = ½BH 와 같아.',
        traps: ['에너지 밀도 × 부피. μ 는 μ₀μr.'],
      };
    },
  });

  T({
    id: 'ind-n',
    concept: 'em-inductance',
    gen(r) {
      const mode = r.pick(['M', 'emf', 'turns']);
      if (mode === 'M') {
        const N1 = r.pick([100, 20, 1000, 3000]);
        const N2 = r.pick([200, 80, 400, 3000, 2000].filter((x) => x !== N1));
        const L1 = r.pick([0.01, 0.005, 0.1, 4, 0.36]);
        const M = (L1 * N2) / N1;
        return {
          params: { mode, N1, N2, L1 },
          text: '같은 환상 철심에 권수 ' + n(N1) + ' 회인 A 코일과 권수 ' + n(N2) + ' 회인 B 코일이 감겨 있어(누설 자속 없음). A 코일의 자기 인덕턴스가 ' + q(L1, 'H') + ' 일 때 두 코일 사이의 상호 인덕턴스는 몇 H 야?',
          formula: 'L ∝ N²,  M = k√(L₁L₂) = L₁·(N₂/N₁)  (k = 1)',
          unit: 'H',
          decimals: 5,
          answer: M,
          distractors: [
            { v: L1 * (N2 / N1) ** 2, why: '이건 B 코일의 자기 인덕턴스 L₂ = L₁(N₂/N₁)² 야. 상호 인덕턴스는 L₁·N₂/N₁ (= √(L₁L₂)).' },
            { v: L1 * (N1 / N2), why: 'N 비를 거꾸로 썼어. M = L₁ N₂/N₁.' },
            { v: L1, why: '권수 비를 반영하지 않았어.' },
            { v: Math.sqrt(L1 * L1 * (N2 / N1)), why: '제곱근 계산이 어긋났어. L₂ = L₁(N₂/N₁)² 이고 M = √(L₁L₂) = L₁(N₂/N₁).' },
          ].filter((x) => Math.abs(x.v - M) / M > 0.01),
          conclusion: 'L₂ = L₁(N₂/N₁)² = ' + n(L1 * (N2 / N1) ** 2, 5) + ' H → M = √(L₁L₂) = ' + q(M, 'H', 5),
          steps: ['L 은 권수의 제곱에 비례 → L₂ = ' + n(L1) + ' × (' + n(N2) + '/' + n(N1) + ')² = ' + n(L1 * (N2 / N1) ** 2, 5) + ' H.', '누설 자속이 없으니 결합계수 k = 1 → M = √(L₁L₂).', '= ' + q(M, 'H', 5) + ' (= L₁·N₂/N₁).'],
          check: 'M² = L₁L₂ 가 되는지 확인.',
          traps: ['L ∝ N², M ∝ N₁N₂ 이므로 M = L₁N₂/N₁ (같은 철심, 누설 없음).'],
        };
      }
      if (mode === 'emf') {
        const L = r.pick([20, 50, 100, 200]);
        const dI = r.pick([2, 10, 50, 100]);
        const dt = r.pick([0.1, 0.2, 0.5]);
        const e = (L / 1000) * dI / dt;
        return {
          params: { mode, L, dI, dt },
          text: '자기 인덕턴스 ' + q(L, 'mH') + ' 인 코일에 ' + q(dt, 's') + ' 동안 전류가 ' + q(dI, 'A') + ' 변했어. 코일에 유기되는 기전력의 크기는 몇 V 야?',
          formula: 'e = L·ΔI/Δt',
          unit: 'V',
          decimals: 4,
          answer: e,
          distractors: [
            { v: L * dI / dt, why: 'mH 를 H 로 바꾸지 않았어.' },
            { v: (L / 1000) * dI * dt, why: '시간을 곱했어. 기전력 = L × (전류 변화율) = L·ΔI ÷ Δt.' },
            { v: (L / 1000) * dI, why: '시간으로 나누지 않았어.' },
            { v: (L / 1000) * dt / dI, why: '식을 뒤집었어. e = L·(ΔI/Δt).' },
          ],
          conclusion: 'e = ' + n(L / 1000, 4) + ' × ' + n(dI) + ' ÷ ' + n(dt) + ' = ' + q(e, 'V', 4),
          steps: ['전류 변화율 ΔI/Δt = ' + n(dI / dt, 4) + ' A/s.', 'e = L × 변화율 = ' + n(L / 1000, 4) + ' × ' + n(dI / dt, 4) + '.', '= ' + q(e, 'V', 4) + '.'],
          check: '인덕턴스 1 H, 1 A/s 변화 → 1 V 인 정의와 맞아.',
          traps: ['mH → H (÷1000), 시간으로 나누기.'],
        };
      }
      const rcm = r.pick([15, 20, 25]);
      const H = r.pick([1600, 2000, 2400]);
      const I = r.pick([5, 8, 10]);
      const N = (2 * Math.PI * (rcm / 100) * H) / I;
      return {
        params: { mode, rcm, H, I },
        text: '평균 반지름 ' + q(rcm, 'cm') + ' 인 철심 환상 솔레노이드에 ' + q(I, 'A') + ' 를 흘려 내부 자계의 세기를 ' + q(H, 'AT/m') + ' 로 만들려면 코일을 몇 회 감아야 해?',
        formula: 'H = N·I / (2πr)  →  N = 2πr·H / I',
        unit: '회',
        decimals: 1,
        answer: N,
        distractors: [
          { v: (rcm / 100) * H / I, why: '2π 를 곱하지 않았어. 평균 자로 길이는 2πr.' },
          { v: (2 * Math.PI * rcm * H) / I, why: 'cm 를 m 로 바꾸지 않았어.' },
          { v: (H * I) / (2 * Math.PI * (rcm / 100)), why: '식을 거꾸로 세웠어. N = 2πrH/I.' },
          { v: (Math.PI * (rcm / 100) * H) / I, why: '원주를 πr 로 썼어. 둘레는 2πr.' },
        ],
        conclusion: 'N = 2π × ' + n(rcm / 100) + ' × ' + n(H) + ' ÷ ' + n(I) + ' = ' + q(N, '회', 1),
        steps: ['환상 코일 내부 자계 H = NI/(2πr).', 'N = 2πr·H ÷ I.', '2π × ' + n(rcm / 100) + ' × ' + n(H) + ' ÷ ' + n(I) + ' = ' + q(N, '회', 1) + ' (정수로 올림).'],
        check: 'N·I = ' + n(N * I, 1) + ' AT = H × 평균 둘레 ' + n(2 * Math.PI * (rcm / 100) * H, 1) + '.',
        traps: ['환상 솔레노이드: H = NI/(2πr), 평균 반지름 r(cm → m).'],
      };
    },
  });

  // ───────── 전자파 ─────────
  T({
    id: 'ew-n',
    concept: 'em-wave',
    gen(r) {
      const mode = r.pick(['v', 'lam', 'eta', 'H', 'S']);
      const er = r.pick([2, 4, 5, 6, 9, 80]);
      const mr = r.pick([1, 1, 4]);
      const c = 3e8;
      if (mode === 'v') {
        const v = c / Math.sqrt(er * mr);
        return {
          params: { mode, er, mr },
          text: '비유전율 ' + n(er) + ', 비투자율 ' + n(mr) + ' 인 매질 속에서 전자파의 전파 속도는 몇 ×10⁸ m/s 야?',
          formula: 'v = 1/√(εμ) = c/√(εrμr)',
          unit: '×10⁸ m/s',
          decimals: 4,
          answer: v / 1e8,
          distractors: [
            { v: (c * Math.sqrt(er * mr)) / 1e8, why: '곱했어. 매질 속에서는 속도가 느려져서 c 를 √(εrμr) 로 나눠.' },
            { v: c / (er * mr) / 1e8, why: '제곱근을 안 씌웠어. √(εrμr).' },
            { v: c / Math.sqrt(er) / 1e8, why: '비투자율을 빼먹었어.' },
            { v: 3, why: '진공(빛)의 속도 그대로야. 매질에서는 √(εrμr) 로 나눠야 해.' },
          ].filter((x) => Math.abs(x.v - v / 1e8) / (v / 1e8) > 0.01),
          conclusion: 'v = 3×10⁸ ÷ √(' + n(er) + ' × ' + n(mr) + ') = ' + q(v / 1e8, '×10⁸ m/s', 4),
          steps: ['진공에서 c = 1/√(ε₀μ₀) = 3×10⁸ m/s.', '매질에서는 v = c/√(εrμr).', '√(' + n(er * mr) + ') = ' + n(Math.sqrt(er * mr), 4) + ' → ' + q(v / 1e8, '×10⁸ m/s', 4) + '.'],
          check: 'εr = μr = 1 이면 c 와 같아져.',
          traps: ['전파 속도는 √(εμ) 에 반비례.'],
        };
      }
      if (mode === 'lam') {
        const f = r.pick([100e6, 1e9, 300e6]);
        const lam = c / (f * Math.sqrt(er * mr));
        return {
          params: { mode, er, mr, f },
          text: '비유전율 ' + n(er) + ', 비투자율 ' + n(mr) + ' 인 매질 속에서 주파수 ' + q(f / 1e6, 'MHz') + ' 인 전자파의 파장은 몇 m 야?',
          formula: 'λ = v/f = c / (f·√(εrμr))',
          unit: 'm',
          decimals: 4,
          answer: lam,
          distractors: [
            { v: c / f, why: '매질의 영향(√(εrμr))을 무시했어. 이건 진공 중 파장이야.' },
            { v: (c * Math.sqrt(er * mr)) / f, why: '곱했어. 매질에서는 파장이 짧아져(√(εrμr) 로 나눠).' },
            { v: c / (f * er * mr), why: '제곱근을 안 씌웠어.' },
            { v: c / (f / 1e6 * Math.sqrt(er * mr)), why: 'MHz 를 Hz 로 바꾸지 않았어.' },
          ].filter((x) => Math.abs(x.v - lam) / lam > 0.01),
          conclusion: 'λ = 3×10⁸ ÷ (' + n(f) + ' × √(' + n(er * mr) + ')) = ' + q(lam, 'm', 4),
          steps: ['매질 속 속도 v = c/√(εrμr) = ' + n(c / Math.sqrt(er * mr), 3) + ' m/s.', 'λ = v/f.', '= ' + q(lam, 'm', 4) + '.'],
          check: '진공 중 파장 ' + n(c / f, 4) + ' m 보다 짧아야 해.',
          traps: ['주파수는 매질이 바뀌어도 그대로, 속도와 파장이 줄어.'],
        };
      }
      if (mode === 'eta') {
        const eta = 120 * Math.PI * Math.sqrt(mr / er);
        return {
          params: { mode, er, mr },
          text: '비유전율 ' + n(er) + ', 비투자율 ' + n(mr) + ' 인 매질에서 전자파의 고유(파동) 임피던스는 약 몇 Ω 야?',
          formula: 'η = √(μ/ε) = 120π·√(μr/εr)  (진공 ≈ 377 Ω)',
          unit: 'Ω',
          decimals: 2,
          answer: eta,
          distractors: [
            { v: 120 * Math.PI * Math.sqrt(er / mr), why: 'μr 와 εr 를 거꾸로 넣었어. η = 120π√(μr/εr).' },
            { v: 120 * Math.PI, why: '매질의 비유전율·비투자율을 반영하지 않았어(진공 값).' },
            { v: 120 * Math.PI * (mr / er), why: '제곱근을 안 씌웠어.' },
            { v: 60 * Math.PI * Math.sqrt(mr / er), why: '계수를 120π 가 아닌 60π 로 외웠어.' },
          ].filter((x) => Math.abs(x.v - eta) / eta > 0.01),
          conclusion: 'η = 120π × √(' + n(mr) + '/' + n(er) + ') = ' + q(eta, 'Ω', 2),
          steps: ['진공의 고유 임피던스는 √(μ₀/ε₀) ≈ 120π ≈ 377 Ω.', '매질에서는 √(μr/εr) 를 곱해.', '= ' + q(eta, 'Ω', 2) + '.'],
          check: 'εr 가 클수록 고유 임피던스는 작아져.',
          traps: ['고유 임피던스 = 377 × √(μr/εr) (분자가 μr).'],
        };
      }
      if (mode === 'H') {
        const Em = r.pick([3, 6, 10]);
        const eta = 120 * Math.PI * Math.sqrt(mr / er);
        const Hm = Em / eta;
        return {
          params: { mode, er, mr, Em },
          text: '최대 전계 ' + q(Em, 'V/m') + ' 의 평면 전자파가 비유전율 ' + n(er) + ', 비투자율 ' + n(mr) + ' 인 매질 속을 전파할 때 자계의 최대값은 약 몇 AT/m 야?',
          formula: 'H = E/η,   η = 120π·√(μr/εr)',
          unit: 'AT/m',
          decimals: 5,
          answer: Hm,
          distractors: [
            { v: Em / (120 * Math.PI), why: '진공의 임피던스를 썼어. 매질의 고유 임피던스 η = 120π√(μr/εr).' },
            { v: Em * eta, why: '곱했어. H = E ÷ η.' },
            { v: (Em / (120 * Math.PI)) * Math.sqrt(mr / er), why: '매질 보정을 반대로 적용했어(√(εr/μr) 배가 되어야 해).' },
            { v: Em / Math.sqrt(er), why: '임피던스를 쓰지 않았어.' },
          ].filter((x) => Math.abs(x.v - Hm) / Hm > 0.01),
          conclusion: 'η = ' + n(eta, 3) + ' Ω → H = ' + n(Em) + ' ÷ ' + n(eta, 3) + ' = ' + q(Hm, 'AT/m', 5),
          steps: ['매질의 고유 임피던스 η = 120π√(μr/εr) = ' + n(eta, 3) + ' Ω.', '평면파는 E/H = η.', 'H = E/η = ' + q(Hm, 'AT/m', 5) + '.'],
          check: '진공 중이라면 H = E/377 이고, εr 가 큰 매질일수록 같은 E 에 H 가 커져.',
          traps: ['E[V/m] ÷ η[Ω] = H[A/m].'],
        };
      }
      const P = r.pick([10, 50, 100]) * 1e3;
      const dkm = r.pick([10, 50, 100]);
      const S = P / (4 * Math.PI * (dkm * 1000) ** 2);
      return {
        params: { mode, P, dkm },
        text: '진공 중 한 점에서 ' + q(P / 1000, 'kW') + ' 의 전자파를 구면파로 사방에 균일하게 방사해. ' + q(dkm, 'km') + ' 떨어진 점의 포인팅 벡터(전력 밀도)는 몇 W/m² 야?',
        formula: 'S = P / (4π d²)',
        unit: 'W/m²',
        decimals: 9,
        answer: S,
        distractors: [
          { v: P / (2 * Math.PI * (dkm * 1000) ** 2), why: '반구(2π)로 계산했어. 사방(구면)이면 4π.' },
          { v: P / (4 * Math.PI * dkm * dkm), why: 'km 를 m 로 바꾸지 않았어.' },
          { v: P / (4 * Math.PI * (dkm * 1000)), why: '거리를 제곱하지 않았어. 면적이 d² 에 비례.' },
          { v: P * (4 * Math.PI * (dkm * 1000) ** 2), why: '곱했어. 전력 밀도 = 전력 ÷ 면적.' },
        ],
        conclusion: 'S = ' + n(P) + ' ÷ (4π × (' + n(dkm * 1000) + ')²) = ' + q(S, 'W/m²', 9),
        steps: ['거리 d 에서 구면의 넓이 4πd².', '전력 밀도 = P ÷ 넓이.', '= ' + q(S, 'W/m²', 9) + '.'],
        check: '거리가 2배가 되면 전력 밀도는 1/4.',
        traps: ['포인팅 벡터 S = E×H [W/m²], 점파원이면 S = P/(4πd²).'],
      };
    },
  });

  // ───────── 유전체: 분극 ─────────
  T({
    id: 'di-pol',
    concept: 'dielectric',
    gen(r) {
      const mode = r.pick(['P', 'chi', 'Dn']);
      if (mode === 'P') {
        const er = r.pick([2, 3, 4, 5, 8]);
        const D = r.pick([2, 4, 6]) * 1e-4;
        const P = D * (1 - 1 / er);
        return {
          params: { mode, er, D },
          text: '비유전율 ' + n(er) + ' 인 유전체 속의 전속밀도가 ' + n(D * 1e4) + '×10⁻⁴ C/m² 일 때 분극의 세기는 약 몇 C/m² 야?',
          formula: 'P = D − ε₀E = D(1 − 1/εr)',
          unit: 'C/m²',
          decimals: 8,
          answer: P,
          distractors: [
            { v: D / er, why: '이건 ε₀E (공기 몫)야. 분극 P = D − ε₀E 라서 D 에서 빼야 해.' },
            { v: D * er, why: '곱했어. P 는 D 보다 작아.' },
            { v: D * (er - 1), why: '(εr − 1) 을 D 에 곱했어. D 가 아니라 ε₀E 에 곱해야 P = ε₀(εr − 1)E.' },
            { v: D, why: '전속밀도 그대로야. 분극은 D 중 유전체 분극이 기여한 부분(D − ε₀E).' },
          ],
          conclusion: 'P = ' + n(D, 6) + ' × (1 − 1/' + n(er) + ') = ' + q(P, 'C/m²', 8),
          steps: ['D = ε₀εrE → ε₀E = D/εr.', 'P = D − ε₀E = D − D/εr.', '= ' + q(P, 'C/m²', 8) + '.'],
          check: 'P = ε₀(εr − 1)E 와 같아.',
          traps: ['P = D − ε₀E = ε₀(εr − 1)E, 분극률 χ = ε₀(εr − 1).'],
        };
      }
      if (mode === 'chi') {
        const er = r.pick([2, 3, 4, 5, 8]);
        return {
          params: { mode, er },
          text: '비유전율이 ' + n(er) + ' 인 유전체의 분극률(전기 감수율에 ε₀ 를 곱한 값)은 진공의 유전율 ε₀ 의 몇 배야?',
          formula: 'χ = ε₀(εr − 1)  →  χ/ε₀ = εr − 1',
          unit: '배',
          decimals: 3,
          answer: er - 1,
          distractors: [
            { v: er, why: '비유전율 그대로야. 분극률은 진공 몫(1)을 뺀 εr − 1.' },
            { v: er + 1, why: '더했어. 진공(1)을 뺀 값이야.' },
            { v: 1 / er, why: '역수를 취했어.' },
            { v: er * er, why: '제곱했어.' },
          ],
          conclusion: 'χ/ε₀ = ' + n(er) + ' − 1 = ' + q(er - 1, '배', 3),
          steps: ['P = χE, P = ε₀(εr − 1)E 이므로 χ = ε₀(εr − 1).', '그러니 χ/ε₀ = εr − 1.', '= ' + n(er - 1) + '배.'],
          check: '진공(εr = 1)이면 분극률 0.',
          traps: ['분극률 = ε − ε₀ = ε₀(εr − 1).'],
        };
      }
      const e1 = r.pick([1, 2, 3]);
      const e2 = r.pick([2, 4, 5, 6]);
      if (e1 === e2) return this.gen(r);
      const E1 = r.pick([5, 10, 20]);
      const D = e1 * E1;
      return {
        params: { mode, e1, e2, E1 },
        text: '비유전율 ' + n(e1) + ' 인 매질에서 경계면에 수직으로 전계 E = ' + n(E1) + ' V/m 가 비유전율 ' + n(e2) + ' 인 유전체로 입사했어. 경계에 자유 전하가 없다면 두 번째 유전체 속의 전속밀도는 ε₀ 의 몇 배(V/m 단위)야?',
        formula: '수직 입사: D₁ₙ = D₂ₙ (연속)',
        unit: '',
        decimals: 3,
        answer: D,
        distractors: [
          { v: e2 * E1, why: '두 번째 매질의 유전율을 첫 전계에 곱했어. 연속인 건 전속밀도 D(= ε₁E₁)야.' },
          { v: E1, why: '전계를 그대로 답했어. 전속밀도는 ε₀εrE.' },
          { v: (e1 * E1 * e2) / e1, why: '식이 어긋났어. D₂ = D₁ = ε₁E₁.' },
          { v: e2 * E1 * e1 / e2 * e2 / e1, why: '두 번째 매질의 전계 E₂ = ε₁E₁/ε₂ 와 D₂ 를 혼동했어. D 는 그대로 ε₁E₁.' },
        ].filter((x) => Math.abs(x.v - D) / D > 0.01),
        conclusion: 'D₂ = D₁ = ε₀·' + n(e1) + '·' + n(E1) + ' = ' + n(D) + ' ε₀ → ' + q(D, '', 3),
        steps: ['경계면에 수직인 성분에서 전속밀도 법선 성분이 연속: D₁ₙ = D₂ₙ.', 'D₁ = ε₀·εr₁·E₁ = ' + n(D) + ' ε₀.', '그래서 두 번째 매질에서도 D = ' + n(D) + ' ε₀ (이때 E₂ = D/(ε₀εr₂) = ' + n(D / e2, 4) + ' V/m).'],
        check: 'E 는 불연속(E₂ = ' + n(D / e2, 4) + ')이고 D 는 연속.',
        traps: ['수직 입사: D 연속, E 불연속. 평행(접선) 입사: E 연속.'],
      };
    },
  });

  // ───────── 이론형 ─────────
  S('st-kg-em1', 'em-efield', {
    q: '정전계에서 도체의 성질로 옳은 것은?',
    ok: ['도체 내부의 전계는 0 이고, 전하는 표면에만 분포하며 전체가 등전위다', '정답이야. 정전 평형이면 내부 전계가 0, 전하는 표면에만 있고 도체 전체가 같은 전위(등전위체)야. 도체 표면의 전계는 표면에 수직이야.'],
    bad: [['도체 표면에서 전계는 표면과 평행(접선)하다', '표면에서 전계가 접선 성분을 가지면 전하가 계속 움직여서 평형이 안 돼. 표면에 수직이야.'], ['도체 내부에도 전하가 골고루 분포한다', '정전 평형에서 내부에는 전하가 없고 표면에만 분포해(공동 안쪽 면에도 전하가 없어).'], ['도체 표면의 전위는 곡률에 따라 달라진다', '도체 전체가 등전위라서 표면 어디서나 전위가 같아(달라지는 건 전하 밀도).']],
    f: '정전 평형 도체: E내부 = 0,  전하는 표면,  등전위,  E표면 ⊥ 표면',
    c: '도체 내부 전계 0, 전하는 표면, 전체가 등전위, 표면 전계는 수직이야.',
    s: ['전계가 있으면 자유 전자가 움직이니까 정전 평형에서는 도체 내부 전계가 0.', '내부 전계 0 → 가우스 법칙으로 내부 전하 0 → 전하는 표면에만.', '내부 전계가 0 이므로 도체 안 어디서나 전위가 같아(등전위).'],
    k: '표면 전하 밀도는 곡률이 큰(뾰족한) 곳일수록 커져.',
    t: ['"대전 도체의 내부에는 전하가 존재" 라는 문장은 틀린 거야.'],
  });
  S('st-kg-em2', 'em-efield', {
    q: '전기력선의 성질로 옳지 않은 것은?',
    ok: ['전기력선은 도체 내부에 존재한다', '정답(옳지 않은 것)이야. 도체 내부 전계는 0 이라 전기력선이 존재하지 않아.'],
    bad: [['전기력선은 양전하에서 시작하여 음전하에서 끝난다', '옳은 설명이야.'], ['전기력선은 도체 표면과 직교한다', '옳은 설명이야.'], ['전기력선은 서로 교차하지 않는다(전하가 없는 곳에서)', '옳은 설명이야. 교차하면 한 점에서 전계 방향이 둘이 되니까.']],
    f: '전기력선: + 에서 시작, − 에서 끝, 도체 표면에 수직, 교차 안 함, 도체 내부엔 없음, 접선 방향 = 전계 방향, 밀도 = 전계의 세기',
    c: '전기력선은 도체 내부에 존재하지 않아.',
    s: ['전기력선은 전계의 방향을 따라 그린 선이고 양전하 → 음전하 쪽.', '도체 내부는 전계가 0 이라 선이 없어.', '표면에서는 전계가 수직이라 선도 수직으로 나가.'],
    k: '"부전하에서 시작해 정전하에서 끝난다" 는 방향이 반대인 틀린 문장.',
    t: ['"옳지 않은 것"인지 "옳은 것"인지 먼저 확인해.'],
  });
  S('st-kg-em3', 'em-efield', {
    q: '쌍극자(전기 쌍극자)에 의한 전계의 세기는 거리 r 에 대해 어떻게 변해?',
    ok: ['r³ 에 반비례한다 (전위는 r²에 반비례)', '정답이야. 점전하의 전계는 1/r², 전위는 1/r 인데, 쌍극자는 한 단계씩 더 빨리 줄어 전계는 1/r³, 전위는 1/r².'],
    bad: [['r 에 반비례한다', '그건 무한 직선 전하의 전계(1/r)야.'], ['r² 에 반비례한다', '그건 점전하의 전계야. 쌍극자는 서로 상쇄돼서 더 빨리 줄어.'], ['r 와 무관하다', '거리가 멀어질수록 약해져.']],
    f: '쌍극자: V = M cosθ/(4πε₀r²),  E = M√(1 + 3cos²θ)/(4πε₀r³)',
    c: '쌍극자의 전계는 r³ 에 반비례해.',
    s: ['점전하 쌍(+Q, −Q)이 가까이 있어서 먼 곳에서는 서로 효과가 상쇄.', '그래서 점전하(전계 1/r²)보다 한 차수 더 빨리 감소.', '전계 1/r³, 전위 1/r².'],
    k: '전계의 크기는 축 방향(θ = 0°)에서 최대, 적도 방향(θ = 90°)에서 전위는 0.',
    t: ['"쌍극자의 전위는 거리에 반비례"라는 말은 틀린 거야(r² 에 반비례).'],
  });
  S('st-kg-em4', 'em-efield', {
    q: '정전계의 성질로 옳지 않은 것은?',
    ok: ['정전계 중에서 전계의 선적분은 적분 경로에 따라 다르다', '정답(옳지 않은 것)이야. 정전계는 보존장이라 두 점 사이 선적분(전위차)은 경로와 무관해.'],
    bad: [['전위의 기울기의 음(−)이 전계이다 (E = −∇V)', '옳은 설명이야.'], ['폐곡면을 통과하는 전속은 내부 전하와 같다(가우스)', '옳은 설명이야.'], ['정전계의 회전(rot E)은 0 이다', '옳은 설명이야. 보존장이라 회전이 0.']],
    f: 'E = −∇V,  ∮E·dl = 0 (경로 무관),  ∇×E = 0,  ∮D·dS = Q,  ∇²V = −ρ/ε₀ (라플라스: ρ = 0)',
    c: '정전계의 선적분은 경로와 무관해.',
    s: ['정전계의 힘은 보존력이라서 일이 경로에 무관.', '폐경로를 한 바퀴 돌면 선적분이 0(rot E = 0).', '그래서 전위가 정의돼.'],
    k: '라플라스 방정식은 선형이라 중첩의 원리를 쓸 수 있어(비선형이 아님).',
    t: ['"라플라스 방정식은 비선형" 이라는 문장은 틀린 거야.'],
  });
  S('st-kg-em5', 'em-efield', {
    q: '대전된 도체 표면의 전하 밀도는 표면의 모양에 따라 어떻게 분포해?',
    ok: ['뾰족한(곡률이 큰) 곳일수록 커진다', '정답이야. 같은 전위에서 곡률 반지름이 작을수록 전하 밀도와 전계가 커져서 피뢰침 끝에 방전이 잘 생겨.'],
    bad: [['평평한 곳일수록 커진다', '반대야. 평평한(곡률 반지름이 큰) 곳은 작아.'], ['표면 전체가 항상 균일하다', '구 모양일 때만 균일해. 일반 도체는 모양에 따라 달라.'], ['곡률과 무관하다', '곡률에 크게 영향을 받아.']],
    f: '표면 전하 밀도 σ ∝ 1/(곡률 반지름) — 뾰족할수록 큼',
    c: '뾰족한 곳에서 전하 밀도가 커져.',
    s: ['두 도체구를 이을 때 같은 전위: Q/a 가 같으니 σ = Q/4πa² ∝ 1/a.', '반지름 a 가 작을수록(뾰족할수록) σ 가 커.', '그래서 끝이 뾰족한 곳에서 방전·코로나가 먼저 생겨.'],
    k: '정전 차폐: 도체를 완전히 둘러싸면 내외부 전계를 차단(접지 필요).',
    t: ['"곡률이 크다 = 뾰족하다 = 전하 밀도 크다".'],
  });
  S('st-kg-em6', 'em-efield', {
    q: '전속밀도 D, 전계 E, 분극의 세기 P 사이의 관계식은?',
    ok: ['D = ε₀E + P  (P = D − ε₀E)', '정답이야. 진공의 몫 ε₀E 에 유전체가 분극해서 더한 P 가 합쳐진 게 전속밀도.'],
    bad: [['D = ε₀E − P', '부호가 틀렸어. 분극이 전속을 더해서 D = ε₀E + P.'], ['P = ε₀E − D', '부호가 거꾸로야. P = D − ε₀E.'], ['D = P/ε₀E', '이런 비 형태가 아니야. 더하는 관계.']],
    f: 'D = ε₀E + P = εE,   P = ε₀(εr − 1)E',
    c: 'D = ε₀E + P 야.',
    s: ['진공이면 D = ε₀E.', '유전체에서는 분극 P 가 더해져서 D = ε₀E + P.', 'P = ε₀(εr − 1)E 를 넣으면 D = ε₀εrE.'],
    k: '전속밀도 D 의 원천은 진전하(자유 전하)만이고, 분극 전하는 E 에는 영향을 주지만 D 에는 포함되지 않아.',
    t: ['D 는 "진전하", E 는 "진전하 + 분극 전하" 가 만든 것.'],
  });
  S('st-kg-em7', 'em-coulomb', {
    q: '무한 평면 도체 앞의 점전하 Q 에 대한 영상법의 설명으로 옳은 것은?',
    ok: ['영상 전하는 −Q 이고 평면 반대쪽 같은 거리에 있으며, 점전하와 도체 사이에는 항상 흡인력이 작용한다', '정답이야. 도체 표면을 등전위(0)로 만드는 영상 전하는 부호가 반대(−Q)이고 같은 거리에 있어서 서로 끌어당겨.'],
    bad: [['영상 전하는 +Q 이고 반발력이 작용한다', '부호가 반대(−Q)여야 도체 표면이 등전위가 되고 힘은 흡인력이야.'], ['영상 전하는 −Q/2 이다', '무한 평면에서는 크기가 같은 −Q(구도체일 때만 −aQ/d).'], ['접지된 구도체와 점전하 사이에는 반발력이 작용한다', '접지 구도체도 항상 흡인력이야.']],
    f: '무한 평면: 영상 −Q (같은 거리),  접지 구: Q′ = −aQ/d (a²/d 지점),  직교하는 두 평면: 영상 3개',
    c: '영상 전하는 −Q 이고 힘은 흡인력이야.',
    s: ['도체 표면이 전위 0 이 되려면 반대 부호의 영상 전하가 필요.', '반대 부호 전하끼리는 서로 끌어당겨.', '직각으로 만나는 두 평면에서는 영상이 3개(−Q, −Q, +Q).'],
    k: '평면 도체 앞 전하를 무한원으로 옮기는 일은 Q²/(16πε₀d).',
    t: ['"접지된 도체와 점전하 사이의 힘은 항상 흡인력".'],
  });
  S('st-kg-em8', 'em-coulomb', {
    q: '점전하에 의한 전계는 쿨롱의 법칙으로 구하는데, 연속적으로 분포된 전하가 만드는 전계를 구할 때 편리하게 쓰는 것은? (대칭이 좋은 경우)',
    ok: ['가우스의 법칙(정리)', '정답이야. 대칭성이 있는 전하 분포(구, 무한 선, 무한 평면)는 가우스 법칙으로 전계를 쉽게 구해.'],
    bad: [['비오-사바르의 법칙', '전류가 만드는 자계를 구하는 법칙이야(정전계가 아니야).'], ['앙페르의 주회 법칙', '전류와 자계의 관계(정자계)야.'], ['패러데이의 전자 유도 법칙', '자속 변화가 만드는 기전력이야.']],
    f: '∮D·dS = Q (가우스) ↔ ∮H·dl = I (앙페르)',
    c: '분포 전하의 전계는 가우스 법칙으로 구해.',
    s: ['점전하는 쿨롱, 대칭 분포는 가우스.', '정전계에서 비오-사바르는 쓰지 않아(정자계용).', '진공 중 Q[C]에서 나오는 전기력선 수는 Q/ε₀.'],
    k: '정전계의 전계 세기를 구하는 데 적당하지 않은 것: 비오-사바르의 법칙.',
    t: ['전기: 쿨롱·가우스, 자기: 비오-사바르·앙페르.'],
  });
  S('st-kg-mg1', 'em-magfield', {
    q: '내부 장치나 공간을 물질로 둘러싸 외부 자계의 영향을 막는 자기 차폐에 가장 좋은 물질은?',
    ok: ['비투자율이 큰 강자성체', '정답이야. 투자율이 큰 물질이 자속을 자기 안으로 끌어들여 안쪽 공간으로 자계가 덜 들어가.'],
    bad: [['도전율이 큰 구리', '구리는 정전 차폐(전계 차폐)나 고주파 차폐에는 쓰지만 정자계 차폐에는 투자율이 커야 해.'], ['비유전율이 큰 유전체', '유전율은 전계와 관련돼. 자계 차폐와 무관해.'], ['비투자율이 1 보다 작은 물질', '반자성체는 효과가 거의 없어. 투자율이 큰 물질이 좋아.']],
    f: '자기 차폐: μr 이 큰 강자성체로 둘러쌈',
    c: '자기 차폐에는 투자율이 큰 강자성체가 좋아.',
    s: ['자속은 투자율이 큰 쪽으로 몰리는 성질이 있어.', '강자성체 껍데기 안으로 자속이 지나가 버려서 안쪽 공간의 자계가 줄어.', '그래서 차폐 재료는 비투자율이 큰 물질.'],
    k: '정전 차폐는 도체로 둘러싸고 접지하는 방식.',
    t: ['"자기 차폐 = 고투자율, 정전 차폐 = 도체(접지)".'],
  });
  S('st-kg-mg2', 'em-magfield', {
    q: '강자성체에서 자구가 외부 자계가 일정 값을 넘는 순간 갑자기 방향을 바꿔 자속밀도가 계단식으로 증가하는 현상은?',
    ok: ['바크하우젠 효과', '정답이야. B-H 곡선을 자세히 보면 매끈하지 않고 계단처럼 보이는데 이를 바크하우젠 효과라고 해.'],
    bad: [['홀 효과', '전류에 수직 자계를 걸면 기전력이 생기는 효과야.'], ['압전 효과', '기계적 힘으로 전위차가 생기는 효과야.'], ['펠티에 효과', '전류로 접합부에서 열이 흡수·방출되는 효과야.']],
    f: '바크하우젠 효과: 자구의 불연속적 회전 → B-H 곡선의 계단',
    c: '이 현상은 바크하우젠 효과야.',
    s: ['강자성체는 작은 자구(자석 영역)들로 되어 있어.', '외부 자계가 일정 이상이 되면 자구가 한꺼번에 급격히 회전.', '그래서 자속밀도가 불연속으로 변하는 걸 바크하우젠 효과라고 해.'],
    k: '히스테리시스 곡선의 면적 = 히스테리시스 손실.',
    t: ['"계단식 B-H 곡선 = 바크하우젠".'],
  });
  S('st-kg-mg3', 'em-magfield', {
    q: '다음 중 초전도체에 부합하는 조건은? (임계 온도 이하, 비투자율 μr, 비자화율 χm, 자속밀도 B)',
    ok: ['χm = −1, μr = 0, B = 0 (완전 반자성)', '정답이야. 초전도체는 마이스너 효과로 내부 자속을 밀어내서 B = 0, 따라서 μr = 0, χm = −1.'],
    bad: [['χm = 0, μr = 1, B = μ₀H', '이건 진공(비자성체)의 값이야.'], ['χm ≫ 1, μr ≫ 1', '이건 강자성체의 특징이야.'], ['χm = 1, μr = 2, B = 2μ₀H', '그런 값은 특별한 의미가 없어. 초전도체는 B = 0.']],
    f: '초전도체: B = 0,  μr = 0,  χm = −1 (마이스너 효과, 완전 반자성)',
    c: '초전도체는 완전 반자성이라 B = 0, μr = 0, χm = −1 이야.',
    s: ['μr = 1 + χm 이고 B = μ₀μrH.', '초전도체 내부에서는 자속이 밀려나서 B = 0.', 'B = 0 이려면 μr = 0, χm = −1.'],
    k: '강자성체 μr ≫ 1, 상자성체 μr ≳ 1, 반자성체 μr ≲ 1.',
    t: ['초전도 = 완전 반자성 (자속을 내보냄).'],
  });
  S('st-kg-mg4', 'em-magcircuit', {
    q: '자기 회로와 전기 회로의 대응 관계로 옳은 것은?',
    ok: ['기자력 ↔ 기전력, 자속 ↔ 전류, 자기 저항 ↔ 전기 저항, 투자율 ↔ 도전율, 자속밀도 ↔ 전류밀도', '정답이야. 자기 회로의 옴의 법칙 Φ = F/R 이 전기 회로 I = V/R 과 대응하고 투자율은 도전율, 자속밀도는 전류밀도에 대응해.'],
    bad: [['자속밀도 ↔ 전속밀도, 투자율 ↔ 유전율', '이건 틀린 대응이야. 전기회로(전류)와 비교하는 거라 자속밀도 ↔ 전류밀도, 투자율 ↔ 도전율.'], ['자기 저항 ↔ 정전 용량', '용량과 대응되는 건 없어. 자기 저항은 전기 저항에 대응.'], ['기자력 ↔ 전류, 자속 ↔ 기전력', '반대야. 기자력 ↔ 기전력, 자속 ↔ 전류.']],
    f: 'Φ = F/R ↔ I = V/R,  R = ℓ/(μS) ↔ R = ℓ/(σS)',
    c: '자기 회로는 전기 회로의 옴의 법칙과 같은 꼴로 대응돼(투자율 ↔ 도전율).',
    s: ['F = NI(기전력에 해당), Φ(전류에 해당), R(저항에 해당).', 'μ ↔ σ, B ↔ J.', '단, 자기 저항에는 줄 손실에 해당하는 손실이 없어.'],
    k: '자기 저항의 역수는 퍼미언스(자기 컨덕턴스). 기자력은 NI(권수 × 전류).',
    t: ['"자속밀도-전속밀도 대응"은 틀린 대응이야.'],
  });
  S('st-kg-mg5', 'em-magcircuit', {
    q: '자기 회로의 설명으로 틀린 것은?',
    ok: ['자기 저항에는 전기 저항의 줄 손실에 해당하는 손실이 있다', '정답(틀린 것)이야. 자기 저항에서는 자속이 흐를 때 열 손실이 생기지 않아(철손은 히스테리시스·와류에서 따로 생겨).'],
    bad: [['자기 저항은 자로의 길이에 비례한다', '옳은 설명이야(R = ℓ/μS).'], ['자기 저항은 투자율에 반비례한다', '옳은 설명이야.'], ['임의 결합점으로 유입하는 자속의 대수합은 0 이다', '옳은 설명이야(자기 회로의 키르히호프 제1법칙).']],
    f: 'R = ℓ/(μS),  ΣΦ = 0 (결합점),  ΣNI = ΣRΦ (폐회로),  기자력 F = NI',
    c: '자기 저항에는 줄 손실에 해당하는 손실이 없어.',
    s: ['전기 저항은 전류가 흐르면 열이 나지만 자속은 에너지를 소비하며 흐르는 게 아니야.', '자기 저항은 자속이 흐르기 어려운 정도만 나타내.', '철손은 교번 자속에서 따로 발생.'],
    k: '기자력의 정의: 코일의 권수 N 과 전류 I 의 곱(NI).',
    t: ['"전류 밀도와 권수의 곱"이라는 기자력 설명은 틀린 문장.'],
  });
  S('st-kg-mg6', 'em-magfield', {
    q: '막대자석(자기 모멘트 M)이 평등 자계 H 안에서 자계와 θ 의 각으로 놓여 있을 때 받는 회전력은?',
    ok: ['T = M × H, 크기 MH sinθ [N·m]', '정답이야. 자기 모멘트와 자계의 외적이라 크기는 MH sinθ 이고 θ = 90° 일 때 최대야.'],
    bad: [['T = MH cosθ', 'cos 가 아니라 sin 이야(θ = 0 일 때 회전력 0).'], ['T = M·H (내적)', '내적은 위치 에너지 꼴이고 회전력은 외적.'], ['T = M/H', '그런 식은 없어.']],
    f: 'T = M × H (|T| = MH sinθ),  위치 에너지 U = −MH cosθ',
    c: '회전력은 M × H, 크기 MH sinθ 이야.',
    s: ['자석이 자계 방향으로 정렬하려는 토크.', '정렬되면(θ = 0) 토크 0, 수직(θ = 90°)이면 최대.', '이 토크를 한 바퀴 적분하면 일 MH(1 − cosθ).'],
    k: '자극 세기 m, 길이 ℓ 이면 M = mℓ [Wb·m].',
    t: ['외적 → sinθ, 내적(에너지) → cosθ.'],
  });
  S('st-kg-mg7', 'em-induction', {
    q: '"유도 기전력의 크기는 폐회로에 쇄교하는 자속의 시간적 변화율에 비례한다"는 법칙은?',
    ok: ['노이만(패러데이)의 법칙', '정답이야. 크기를 정량적으로 나타낸 게 노이만(패러데이) 법칙(e = −dΦ/dt)이고 방향을 정한 건 렌츠의 법칙이야.'],
    bad: [['렌츠의 법칙', '렌츠의 법칙은 유도 기전력의 "방향"(자속 변화를 방해하는 쪽)을 말해.'], ['앙페르의 오른나사 법칙', '전류와 자계 방향의 관계야. 전자 유도와 가장 거리가 멀어.'], ['비오-사바르의 법칙', '전류가 만드는 자계의 세기를 구하는 법칙이야.']],
    f: 'e = −N·dΦ/dt (패러데이·노이만 = 크기, 렌츠 = 방향)',
    c: '크기 법칙은 노이만(패러데이)의 법칙이야.',
    s: ['쇄교 자속의 시간 변화가 기전력을 만들어.', '크기: e = N·dΦ/dt (노이만·패러데이).', '방향: 변화를 방해하는 쪽(렌츠).'],
    k: '정자계 가운데 자계가 일정해도 폐회로가 운동하면 유도 기전력이 생길 수 있어(운동 기전력).',
    t: ['"앙페르 오른나사 법칙"은 전자 유도 법칙이 아니야.'],
  });
  S('st-kg-ind1', 'em-inductance', {
    q: '무한 솔레노이드나 토로이드의 자기 인덕턴스에 대한 설명으로 옳은 것은?',
    ok: ['권수의 제곱 및 단면적에 비례하고 투자율에 비례한다 (단위 길이당 L = μSn²)', '정답이야. L = N²/R = μN²S/ℓ 이라 권수의 제곱, 단면적, 투자율에 비례해. 철심 길이가 커지면 단위 길이당 L(= μSn²)이 아니라 전체 L 이 줄어.'],
    bad: [['권수에 비례한다', '권수의 "제곱"에 비례해.'], ['철심의 길이에 비례한다', '권수가 같을 때 길이가 늘면 오히려 인덕턴스가 줄어(L ∝ 1/ℓ).'], ['전류에 비례한다', '인덕턴스는 전류와 무관한 구조 상수야(철심 포화 영향 제외).']],
    f: 'L = μN²S/ℓ,  무한 솔레노이드 단위 길이당 L = μSn² [H/m] (n: 단위 길이당 권수)',
    c: '자기 인덕턴스는 권수의 제곱·단면적·투자율에 비례해.',
    s: ['자속 Φ = μNIS/ℓ, 쇄교 자속 NΦ = μN²IS/ℓ.', 'L = NΦ/I = μN²S/ℓ.', '같은 인덕턴스를 유지하며 권수를 절반으로 하려면 길이를 1/4 로.'],
    k: '결합계수 k 는 0 ≤ k ≤ 1 (일반적인 결합은 0 < k < 1).',
    t: ['"N 이 1/2 이면 L 은 1/4, 길이도 1/4 이어야 L 유지"를 외워 둬.'],
  });
  S('st-kg-wave1', 'em-wave', {
    q: '자유 공간을 전파하는 평면 전자파에 대한 설명으로 옳은 것은?',
    ok: ['전계와 자계는 위상이 같고 서로 수직이며 진행 방향에도 수직인 횡파이다. 단위 면적당 전력은 E·H [W/m²]', '정답이야. 자유 공간에서 E 와 H 는 동위상이고 진행 방향에 모두 수직(횡파, TEM)이야. 포인팅 벡터 S = E × H.'],
    bad: [['전계와 자계가 진행 방향과 평행한 종파이다', '전자파는 횡파야. E, H 가 진행 방향에 수직.'], ['전계와 자계의 위상차가 90° 이다', '자유 공간에서는 동위상(도체 안에서는 위상차가 생길 수 있어).'], ['전파 속도는 유전율과 투자율의 곱의 제곱근에 비례한다', '속도는 1/√(εμ) 로 제곱근에 "반비례"해.']],
    f: 'S = E × H [W/m²],  v = 1/√(εμ),  η = E/H = √(μ/ε),  진공에서 v = c, η ≈ 377 Ω',
    c: '자유 공간 평면파: E ⊥ H ⊥ 진행 방향, 동위상, S = EH.',
    s: ['TEM 파는 E, H 가 모두 진행 방향에 수직(횡파).', '진공에서는 E 와 H 의 위상이 같아서 E/H = η = 377 Ω.', '단위 시간·단위 면적당 에너지 흐름 = E × H (포인팅 벡터).'],
    k: '진공 속도(빛)가 되려면 εs = μs = 1.',
    t: ['비 오는 날 고주파 감쇠가 큰 이유는 도전율(전도 손실).'],
  });
  S('st-kg-disp', 'em-wave', {
    q: '유전체에서 변위 전류에 대한 설명으로 옳은 것은?',
    ok: ['변위 전류는 자계를 발생시키며, 크기는 전속밀도의 시간 변화율(∂D/∂t)이다', '정답이야. 맥스웰이 앙페르 법칙에 ∂D/∂t 항을 넣어서 변위 전류도 자계를 만든다고 했어.'],
    bad: [['변위 전류는 자계를 발생시키지 않는다', '맥스웰의 핵심 가설이야. 변위 전류도 자계를 만들어.'], ['변위 전류는 전하의 이동에 의한 전류이다', '이건 전도 전류야. 변위 전류는 전속(전계)의 변화.'], ['변위 전류는 전계의 공간적 변화에 비례한다', '시간적 변화(∂D/∂t)에 비례해.']],
    f: 'iD = ∂D/∂t,  ∇×H = i + ∂D/∂t,  ∇×E = −∂B/∂t,  ∇·D = ρ,  ∇·B = 0',
    c: '변위 전류는 ∂D/∂t 이고 자계를 발생시켜.',
    s: ['전도 전류가 없는 유전체(콘덴서 사이)에서도 전계가 변하면 자계가 생겨.', '이 항이 ∂D/∂t (전속밀도의 시간적 변화).', '전계가 변하면 자계, 자계가 변하면 전계가 생겨 전자파가 전파.'],
    k: '변위 전류에 의해 생긴 전자파의 위상은 변위 전류보다 90° 늦어.',
    t: ['"자극은 단독으로 존재한다(자계는 발산)"는 맥스웰 식과 맞지 않는 틀린 설명이야(∇·B = 0).'],
  });
  S('st-kg-dielec', 'dielectric', {
    q: '서로 다른 두 유전체가 접한 경계면에 대한 설명 중 옳은 것은? (경계에 진전하 없음)',
    ok: ['경계면에서 전위는 연속이고, 전계의 접선 성분과 전속밀도의 법선 성분이 같다', '정답이야. 전위는 경계에서 끊어지지 않고, E의 접선·D의 법선 성분이 연속이야(전계와 전속밀도 "전체"가 불변이라는 말은 틀려).'],
    bad: [['경계면에서 전계와 전속밀도는 모두 불변이다', '성분별로만 연속이야. E 의 법선과 D 의 접선 성분은 바뀌어서 전기력선이 꺾여.'], ['경계면에서 전위가 불연속이다', '전위는 연속이야(전위가 끊기면 무한대 전계).'], ['전속밀도의 접선 성분이 연속이다', '연속인 건 법선 성분이야.']],
    f: '경계: V1 = V2,  E1t = E2t,  D1n = D2n,  tanθ1/tanθ2 = ε1/ε2',
    c: '경계에서 전위 연속, E 접선 연속, D 법선 연속이야.',
    s: ['폐경로 ∮E·dl = 0 → E 의 접선 성분 연속(전위도 연속).', '가우스 법칙으로 D 의 법선 성분 연속.', '결과적으로 전기력선이 굴절.'],
    k: '전기력선은 유전율이 작은 쪽에서 큰 쪽으로 들어갈 때 전속밀도가 증가(전계 선이 모이는 쪽이 아니라 ε 큰 쪽으로 몰려).',
    t: ['경계면에서 유전체가 받는 힘은 맥스웰 응력(전계가 수직이면 ε 큰 쪽으로 끌려).'],
  });

  // ───────── 개념 설명에 덧붙이는 기출 단골 정리 ─────────
  G.kgFacts('em-coulomb', [{ h: '기출에서 자주 나오는 것', list: ['매질 속에서 쿨롱 힘은 1/εr 로 줄어(공기 중 힘 ÷ 유전체 속 힘 = εr). 다른 전하가 근처에 있어도 두 전하 사이의 힘은 변하지 않아(중첩).', '전위는 스칼라(그냥 더함), 전계는 벡터. 정사각형 네 꼭짓점에 같은 전하: 중심 전위 = 4kQ/R, 전계는 0.', '정삼각형 세 꼭짓점의 같은 전하: 한 전하가 받는 힘 = √3·kQ²/a².', '영상법: 무한 평면 → −Q (같은 거리), 접지 구 → Q′ = −aQ/d. 직교 평면 두 장 → 영상 3개. 힘은 항상 흡인력. 평면 도체 앞 전하를 무한원으로 옮기는 일 = Q²/(16πε₀d).', '로렌츠 힘 F = q(E + v × B). 전계만 있으면 속도와 무관하게 F = qE.'] }]);
  G.kgFacts('em-efield', [{ h: '기출에서 자주 나오는 것', list: ['도체: 내부 전계 0, 전하는 표면에만, 전체 등전위, 표면 전계는 표면에 수직. 곡률이 큰(뾰족한) 곳의 전하 밀도가 커.', '전기력선: + 에서 시작해 − 에서 끝, 교차하지 않고 도체 표면에 수직, 도체 내부에는 없어. 밀도 = 전계의 세기. 진공 중 Q 에서 나오는 선의 수 = Q/ε₀.', '정전계는 보존장: E = −∇V, ∮E·dl = 0 (선적분은 경로 무관), ∇×E = 0, ∇·D = ρ, ∇²V = −ρ/ε₀ (라플라스 방정식은 선형).', '쌍극자: 전위 ∝ 1/r², 전계 ∝ 1/r³, 전계는 축 방향(θ = 0°)에서 최대, 전위는 V = M cosθ/(4πε₀r²).', '평행 무한 평면 ±σ: E = σ/ε₀, V = σd/ε₀, 단위 면적당 힘 σ²/(2ε₀). 도체 표면 E = σ/ε₀. 두 구를 이으면 공통 전위(용량 가중 평균), 에너지는 줄어듦.', 'D = ε₀E + P, D 의 원천은 진전하뿐. 전계 방향으로 가면 전위가 내려가(V = V₀ − E·d). 정전 차폐: 도체로 완전히 둘러싸면 내외부 전계를 차단.'] }]);
  G.kgFacts('em-capacitor', [{ h: '기출에서 자주 나오는 것', list: ['고립 도체구 C = 4πε₀a (반지름 1 m ≈ 111 pF), 동심구 C = 4πε₀ab/(b − a), 동축 원통 C = 2πε₀ℓ/ln(b/a), 평행 2선 C = πε₀ℓ/ln(D/a). 반지름·치수를 k배로 키우면 구형 콘덴서 용량도 k배.', '직렬 콘덴서의 내압: 전하는 같으므로 최대 충전 전하 C·V내압 이 가장 작은 것이 먼저 파괴돼. 전체 최대 전압 = Q한계 ÷ C합성.', '극판에 평행한 유전체 층은 직렬(d/ε 합), 일부만 유리판을 넣으면 C = C₀/((1 − f) + f/εr).', '에너지 ½CV² = ½QV = Q²/2C, 단위 체적당 w = ½εE² = D²/2ε. 평행판 흡인력 F = Q²/(2ε₀S) = ½ε₀SV²/d².', '저항과 용량의 곱 RC = ρε (누설 전류 = V·C/(ρε)). 유전체 역률 tanδ 는 인가 전압과 무관.', '전압이 같은 콘덴서에 유전체를 채우면 전하는 εr 배, 정전 에너지 밀도가 큰 재료가 유리.'] }]);
  G.kgFacts('em-magfield', [{ h: '기출에서 자주 나오는 것', list: ['전자력 F = BIℓ sinθ, 운동 기전력 e = Bℓv sinθ, 막대자석 회전력 T = MH sinθ (M = mℓ), 회전에 필요한 일 W = MH(1 − cosθ).', '환상 철심: H = NI/ℓ, B = μ₀μrH, Φ = B·S, 자화의 세기 J = B − μ₀H = μ₀(μr − 1)H(자화율 χ = μ₀(μr − 1)). 자기 에너지 밀도 w = B²/(2μ) = ½BH.', '강자성체의 3특성: 히스테리시스, 자기 포화, 바크하우젠 효과(와전류는 아님). 자화의 세기는 단위 체적당 자기 모멘트. 감자력은 자화의 세기에 비례.', '자기 차폐는 비투자율이 큰 강자성체, 영구자석 재료로 폐회로를 만들면 안 됨, 규소강판의 히스테리시스 곡선은 면적이 작은 것이 좋아. 초전도체: χm = −1, μr = 0, B = 0.', '앙페르 주회 법칙(∮H·dl = I), 비오-사바르(자계 ∝ 1/r²), 노이만·패러데이 법칙(유도 기전력의 크기), 맥스웰 식: ∇×E = −∂B/∂t, ∇·B = 0 (자극은 단독으로 존재하지 않음).'] }]);
  G.kgFacts('em-magcircuit', [{ h: '기출에서 자주 나오는 것', list: ['자기 저항 R = ℓ/(μS): 길이에 비례, 투자율·단면적에 반비례. 투자율·단면적·길이를 모두 1/2 로 하면 자기 저항은 2배.', '공극이 생기면 R전체 = R철 + R공극, 증가 배수 = 1 + ℓgμr/ℓ.', '자기 회로의 옴의 법칙 Φ = F/R, 기자력 F = NI, 저장 에너지 ½FΦ. 대응: 기자력↔기전력, 자속↔전류, 자기저항↔전기저항, 투자율↔도전율, 자속밀도↔전류밀도.', '자기 저항에는 줄 손실에 해당하는 손실이 없고, 결합점에서 자속의 대수합은 0.'] }]);
  G.kgFacts('em-inductance', [{ h: '기출에서 자주 나오는 것', list: ['L = μN²S/ℓ: 권수의 제곱·단면적에 비례. 권수를 반으로 줄이고 L 을 같게 하려면 길이를 1/4 로. 무한 솔레노이드 단위 길이당 L = μSn².', '같은 철심의 두 코일(누설 없음): L₂ = L₁(N₂/N₁)², M = √(L₁L₂) = L₁N₂/N₁, 결합계수 0 ≤ k ≤ 1. 직렬 접속 합성값 차이 L가극 − L감극 = 4M.', '유기 기전력 e = L·ΔI/Δt, 저장 에너지 W = ½LI² (전류에 대해 포물선), 코일 전류가 반이면 에너지는 1/4.', '환상 솔레노이드 내부 자계 H = NI/(2πr).'] }]);
  G.kgFacts('em-wave', [{ h: '기출에서 자주 나오는 것', list: ['전파 속도 v = c/√(εrμr) (εs = μs = 1 이면 빛의 속도), 파장 λ = v/f. 고유 임피던스 η = 120π√(μr/εr) (진공 377 Ω, εr = 4 이면 188.5 Ω, 물 εr = 80 이면 42 Ω).', '평면파 E/H = η, 단위 면적당 전력(포인팅 벡터) S = E×H = EH [W/m²]. 점파원 구면파 S = P/(4πd²).', '자유 공간에서 E 와 H 는 동위상·서로 수직인 횡파. 변위 전류(∂D/∂t)도 자계를 발생시키고, 변위 전류로 생기는 전자파 위상은 90° 늦어.', '비 오는 날 고주파 감쇠가 큰 이유는 도전율(전도 손실).'] }]);
  G.kgFacts('dielectric', [{ h: '기출에서 자주 나오는 것', list: ['분극 P = D − ε₀E = ε₀(εr − 1)E, 분극률 χ = ε₀(εr − 1) (εr = 4 이면 ε₀ 의 3배).', '경계(진전하 없음): 전위 연속, E 접선 연속, D 법선 연속. 수직 입사면 D 는 연속, E 는 불연속(E₂ = ε₁E₁/ε₂).', '경계면에서 유전체가 받는 힘(맥스웰 응력)은 경계 전하 밀도의 제곱에 비례하고 ε 가 큰 쪽으로 향해.', '전자 분극: 전자운과 핵의 상대적 변위. 압전 효과: 기계적 변형력을 가하면 결정 표면에 전위차.'] }]);
  G.kgFacts('em-force', [{ h: '기출에서 자주 나오는 것', list: ['평행 도선 사이의 힘 F = 2×10⁻⁷·I₁I₂/d [N/m]: 왕복(반대 방향) 전류는 반발, 같은 방향은 흡인, 힘은 전류의 곱(같은 전류면 제곱)에 비례. 공기 중 1 m 간격 1 A 일 때 2×10⁻⁷ N/m.', '전자력이 한 일 W = I·ΔΦ (끊은 자속 × 전류), 자계 속 하전 입자 원운동 반지름 r = mv/(qB).'] }]);
  G.kgFacts('em-induction', [{ h: '기출에서 자주 나오는 것', list: ['패러데이·노이만: 유도 기전력은 쇄교 자속의 시간 변화율에 비례(e = −N dΦ/dt), 렌츠: 방향은 변화를 방해하는 쪽. 앙페르의 오른나사 법칙은 전자 유도와 무관.', '와전류: 도체 내부 자속이 변할 때 생기는 회전 전류(자속이 변하지 않으면 안 생김), 자속 Φ = Φm sin ωt 에서 유도 기전력 최대 = ωNΦm.', '자계가 일정해도 폐회로가 운동하면 운동 기전력이 생겨.'] }]);
})(globalThis.GISA);
