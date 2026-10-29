// 전력공학 문제 템플릿
(function (G) {
  'use strict';
  const F = G.fmt;
  const n = F.num;
  const q = F.q;
  const T = G.defineTemplate;
  const S3 = F.SQRT3;
  const ratioLabel = (v) => F.ratio(v) + '배';
  const PF = [[0.8, 0.6], [0.6, 0.8]];
  const TAN = { 0.6: 4 / 3, 0.8: 0.75, 1: 0 };
  const SIN = { 0.6: 0.8, 0.8: 0.6, 1: 0 };

  // ───────── 전압강하 ─────────
  T({
    id: 'pw-vdrop-3ph',
    concept: 'pw-vdrop',
    gen(r) {
      const I = r.pick([10, 20, 50, 100, 200]);
      const R = r.pick([0.5, 1, 2, 3, 4, 5]);
      const X = r.pick([1, 2, 3, 4, 5, 8]);
      const [c, s] = r.pick(PF);
      const e = S3 * I * (R * c + X * s);
      const askVs = r.chance(0.4);
      const Vr = r.pick([3300, 6600, 22000]);
      if (e > Vr * 0.2) return null;
      const core = R * c + X * s;
      const base = {
        params: { I, R, X, pf: c, Vr, ask: askVs ? 'Vs' : 'e' },
        formula: '3상 e = √3·I·(R cosθ + X sinθ)',
        unit: 'V',
        decimals: 1,
        steps: [
          'sinθ = √(1 − ' + n(c) + '²) = ' + n(s) + '.',
          'R cosθ + X sinθ = ' + n(R) + '×' + n(c) + ' + ' + n(X) + '×' + n(s) + ' = ' + n(core) + ' Ω.',
          'e = √3 × ' + n(I) + ' × ' + n(core) + ' ≈ ' + q(e, 'V', 1) + '.',
        ],
        traps: ['3상은 √3, 단상 2선식은 2. 이 계수만 바꿔 쓰면 같은 꼴이야.', 'R에는 cos, X에는 sin. 짝을 바꾸면 틀려.'],
      };
      if (!askVs) {
        return Object.assign(base, {
          text: '3상 3선식 선로에서 한 선의 저항 ' + q(R, 'Ω') + ', 리액턴스 ' + q(X, 'Ω') + '이고, 역률 ' + n(c) + '(지상)로 전류 ' + q(I, 'A') + '를 보내. 선로의 전압강하는 약 몇 V야?',
          answer: e,
          distractors: [
            { v: S3 * I * (R * s + X * c), why: 'R에 sin, X에 cos을 곱했어. 저항은 유효분(cos)과 짝이야.' },
            { v: I * core, why: '√3을 빠뜨렸어. 그건 한 선(상) 기준 값이야.' },
            { v: 2 * I * core, why: '단상 2선식 계수(2)를 썼어. 3상은 √3.' },
            { v: S3 * I * Math.sqrt(R * R + X * X), why: '역률을 무시하고 임피던스 크기 전체를 곱했어.' },
          ],
          conclusion: 'e = √3 × ' + n(I) + ' × (' + n(R) + '×' + n(c) + ' + ' + n(X) + '×' + n(s) + ') ≈ ' + q(e, 'V', 1),
          check: '역률 1이었다면 √3 × ' + n(I) + ' × ' + n(R) + ' = ' + n(S3 * I * R, 1) + ' V. 지상 역률이면 X 몫이 더해져 커지는 게 맞아.',
        });
      }
      const Vs = Vr + e;
      return Object.assign(base, {
        text: '3상 3선식 선로의 수전단 선간전압이 ' + q(Vr, 'V') + '야. 한 선의 저항 ' + q(R, 'Ω') + ', 리액턴스 ' + q(X, 'Ω') + ', 부하 전류 ' + q(I, 'A') + ', 역률 ' + n(c) + '(지상)일 때 송전단 선간전압은 약 몇 V야?',
        answer: Vs,
        distractors: [
          { v: Vr - e, why: '전압강하를 뺐어. 송전단이 수전단보다 높아야 해(Vs = Vr + e).' },
          { v: Vr + I * core, why: '전압강하에서 √3을 빠뜨렸어.' },
          { v: Vr + 2 * I * core, why: '단상 2선식 계수(2)를 썼어.' },
          { v: Vr + S3 * I * (R * s + X * c), why: 'R과 X에 붙는 cos·sin을 바꿨어.' },
        ],
        conclusion: 'Vs = ' + n(Vr) + ' + √3 × ' + n(I) + ' × ' + n(core) + ' ≈ ' + q(Vs, 'V', 1),
        steps: base.steps.concat(['송전단 전압 = 수전단 + 강하 = ' + n(Vr) + ' + ' + n(e, 1) + ' ≈ ' + q(Vs, 'V', 1) + '.']),
        check: '전압강하율 = ' + n(e, 1) + '/' + n(Vr) + ' × 100 ≈ ' + n((e / Vr) * 100) + '%. 보통 몇 % 수준이라 자연스러워.',
      });
    },
  });

  T({
    id: 'pw-vdrop-rate',
    concept: 'pw-vdrop',
    gen(r) {
      const Vr = r.pick([3000, 6000, 10000, 20000, 22000, 60000]);
      const pct = r.pick([2, 2.5, 4, 5, 8, 10, 12.5]);
      const Vs = Vr * (1 + pct / 100);
      if (!F.isNice(Vs, 0)) return null;
      return {
        params: { Vs, Vr },
        text: '송전단 전압이 ' + q(Vs, 'V') + ', 수전단 전압이 ' + q(Vr, 'V') + '인 선로의 전압강하율은?',
        formula: 'ε = (Vs − Vr) / Vr × 100 [%]',
        unit: '%',
        answer: pct,
        distractors: [
          { v: ((Vs - Vr) / Vs) * 100, why: '송전단 전압으로 나눴어. 전압강하율의 기준(분모)은 수전단 전압이야.' },
          { v: (Vs / Vr) * 100, why: '빼지 않고 비율만 구했어.' },
          { v: (Vs - Vr) / Vr, why: '100을 곱하지 않았어(%로 안 바꿈).' },
        ],
        conclusion: 'ε = (' + n(Vs) + ' − ' + n(Vr) + ') / ' + n(Vr) + ' × 100 = ' + q(pct, '%'),
        steps: ['전압강하 = ' + n(Vs) + ' − ' + n(Vr) + ' = ' + q(Vs - Vr, 'V') + '.', '수전단 기준 비율: ' + n(Vs - Vr) + ' ÷ ' + n(Vr) + ' = ' + n(pct / 100, 4) + ' → ' + q(pct, '%') + '.'],
        check: n(Vr) + ' × (1 + ' + n(pct / 100, 4) + ') = ' + n(Vs) + ' V. 송전단 전압과 같아.',
        traps: ['전압변동률은 (무부하 수전단 − 전부하 수전단)/전부하 수전단 × 100. 강하율과 이름이 비슷하니 분자를 잘 봐.'],
      };
    },
  });

  // ───────── 전력손실 ─────────
  T({
    id: 'pw-loss-3i2r',
    concept: 'pw-loss',
    gen(r) {
      const I = r.pick([10, 20, 30, 50, 100, 200]);
      const R = r.pick([0.1, 0.2, 0.5, 1, 2, 5]);
      const P = 3 * I * I * R;
      if (!F.isNice(P, 1)) return null;
      return {
        params: { I, R },
        text: '3상 3선식 선로에서 한 선의 저항이 ' + q(R, 'Ω') + '이고 선전류가 ' + q(I, 'A') + '야. 선로 전체의 전력손실은?',
        formula: 'Pℓ = 3I²R',
        unit: 'W',
        answer: P,
        distractors: [
          { v: I * I * R, why: '한 선의 손실만 구했어. 선이 3가닥이니 3배야.' },
          { v: S3 * I * I * R, why: '√3을 곱했어. 손실은 선마다 I²R씩, 3선이면 3I²R.' },
          { v: 3 * I * R, why: '전류를 제곱하지 않았어. 그건 전압강하 꼴이야.' },
          { v: 2 * I * I * R, why: '단상 2선식처럼 2배 했어.' },
        ],
        conclusion: 'Pℓ = 3 × ' + n(I) + '² × ' + n(R) + ' = ' + q(P, 'W'),
        steps: ['한 선의 손실: I²R = ' + n(I * I) + ' × ' + n(R) + ' = ' + q(I * I * R, 'W') + '.', '3선이니까 × 3 = ' + q(P, 'W') + '.'],
        check: '전류를 2배로 하면 손실은 4배(' + q(4 * P, 'W') + ')여야 해. I²라서 맞아.',
        traps: ['손실은 "선의 개수 × I²R". 단상 2선 2I²R, 3상 3선 3I²R.'],
      };
    },
  });

  T({
    id: 'pw-loss-power',
    concept: 'pw-loss',
    gen(r) {
      const PkW = r.pick([1000, 2000, 3000, 5000, 10000]);
      const VkV = r.pick([10, 20, 30, 50]);
      const pf = r.pick([0.8, 0.9, 1]);
      const R = r.pick([1, 2, 5, 10]);
      const loss = ((PkW * 1e3) ** 2 * R) / ((VkV * 1e3) ** 2 * pf * pf) / 1e3;
      if (loss < 1 || loss > PkW * 0.3) return null;
      return {
        params: { PkW, VkV, pf, R },
        text: '선간전압 ' + q(VkV, 'kV') + ', 역률 ' + n(pf) + '로 ' + q(PkW, 'kW') + '를 보내는 3상 3선식 선로가 있어. 한 선의 저항이 ' + q(R, 'Ω') + '일 때 선로 손실은 약 몇 kW야?',
        formula: 'Pℓ = P²R / (V²cos²θ)  (= 3I²R)',
        unit: 'kW',
        decimals: 2,
        answer: loss,
        distractors: [
          { v: ((PkW * 1e3) ** 2 * R) / (VkV * 1e3) ** 2 / 1e3, why: '역률을 빠뜨렸어(역률 1로 계산).' },
          { v: ((PkW * 1e3) ** 2 * R) / ((VkV * 1e3) ** 2 * pf) / 1e3, why: '역률을 제곱하지 않았어. 전류가 1/cosθ배라서 손실은 1/cos²θ배야.' },
          { v: (3 * (PkW * 1e3) ** 2 * R) / ((VkV * 1e3) ** 2 * pf * pf) / 1e3, why: '3을 한 번 더 곱했어. I = P/(√3V cosθ)를 3I²R에 넣으면 3이 약분돼.' },
          { v: (PkW * 1e3 * R) / (VkV * 1e3 * pf) / 1e3, why: '제곱을 모두 빠뜨렸어.' },
        ],
        conclusion: 'Pℓ = (' + n(PkW) + '×10³)² × ' + n(R) + ' / ((' + n(VkV) + '×10³)² × ' + n(pf) + '²) ≈ ' + q(loss, 'kW', 2),
        steps: [
          '선전류: I = P/(√3·V·cosθ) = ' + n(PkW * 1e3) + ' ÷ (√3 × ' + n(VkV * 1e3) + ' × ' + n(pf) + ') ≈ ' + q((PkW * 1e3) / (S3 * VkV * 1e3 * pf), 'A', 2) + '.',
          '손실: 3I²R ≈ 3 × ' + n((PkW * 1e3) / (S3 * VkV * 1e3 * pf), 2) + '² × ' + n(R) + ' ≈ ' + n(loss * 1e3, 1) + ' W.',
          'kW로: ≈ ' + q(loss, 'kW', 2) + '.',
        ],
        check: '공식 P²R/(V²cos²θ)로 바로 계산해도 같은 값. 손실률 ' + n((loss / PkW) * 100) + '%로 상식적인 범위야.',
        traps: ['단위를 W와 V로 맞춰서 계산하고 마지막에 kW로 바꿔.', '손실 ∝ 1/V², ∝ 1/cos²θ.'],
      };
    },
  });

  T({
    id: 'pw-loss-ratio',
    concept: 'pw-loss',
    gen(r) {
      if (r.chance(0.5)) {
        const k = r.pick([2, 3, 4, 5, 10]);
        return {
          params: { mode: 'V', k },
          text: '같은 전력을 같은 선로로 보낼 때 송전 전압을 ' + k + '배로 올리면 선로 손실은 몇 배가 될까? (역률 일정)',
          formula: 'Pℓ = P²R / (V²cos²θ) → Pℓ ∝ 1/V²',
          unit: '배',
          label: ratioLabel,
          answer: 1 / (k * k),
          distractors: [
            { v: 1 / k, why: '제곱을 빠뜨렸어. 전류가 1/' + k + '이고 손실은 전류의 제곱이니까 1/' + k * k + '.' },
            { v: k * k, why: '전압이 오르면 손실도 커진다고 착각했어. 같은 전력이면 전류가 줄어서 손실이 줄어.' },
            { v: k, why: '전압에 비례한다고 착각했어.' },
          ],
          conclusion: '손실 ∝ 1/V² → 1/' + k + '² = ' + ratioLabel(1 / (k * k)),
          steps: ['같은 전력 P = √3VI cosθ에서 V가 ' + k + '배면 I는 1/' + k + '배.', '손실 3I²R은 전류의 제곱 → (1/' + k + ')² = 1/' + k * k + '.'],
          check: '공식 P²R/(V²cos²θ)에서 V만 ' + k + '배 → 분모 ' + k * k + '배. 맞아.',
          traps: ['전압강하율은 1/V², 전압강하(V 단위)는 1/V. 비슷해 보여도 달라.'],
        };
      }
      const [a, b] = r.pick([[0.6, 0.8], [0.8, 1], [0.6, 1]]);
      const ans = (a / b) ** 2;
      return {
        params: { mode: 'pf', a, b },
        text: '같은 전력·같은 전압으로 송전할 때 역률을 ' + n(a) + '에서 ' + n(b) + '로 개선하면 선로 손실은 몇 배가 될까?',
        formula: 'Pℓ ∝ 1/cos²θ',
        unit: '배',
        label: (v) => n(v, 4) + '배',
        answer: ans,
        distractors: [
          { v: a / b, why: '제곱을 빠뜨렸어.' },
          { v: (b / a) ** 2, why: '뒤집었어. 역률이 좋아지면 전류가 줄어 손실도 줄어야 해.' },
          { v: b / a, why: '뒤집고 제곱도 빠뜨렸어.' },
        ],
        conclusion: '(' + n(a) + '/' + n(b) + ')² = ' + n(ans, 4) + '배',
        steps: ['손실 ∝ 1/cos²θ.', '개선 후/개선 전 = (1/' + n(b) + '²) ÷ (1/' + n(a) + '²) = (' + n(a) + '/' + n(b) + ')² = ' + n(ans, 4) + '.'],
        check: '역률이 좋아졌으니 1보다 작아야 해. ' + n(ans, 4) + ' < 1, 맞아.',
        traps: ['역률 개선 효과: 전류 감소 → 손실 감소, 전압강하 감소, 설비 여유 증가.'],
      };
    },
  });

  // ───────── %임피던스·단락 ─────────
  T({
    id: 'pw-short-current',
    concept: 'pw-pctz',
    gen(r) {
      const In = r.pick([100, 200, 300, 500, 1000]);
      const z = r.pick([2, 4, 5, 8, 10, 12.5, 20, 25]);
      const Is = (100 / z) * In;
      return {
        params: { In, z },
        text: '정격전류 ' + q(In, 'A') + ', %임피던스 ' + q(z, '%') + '인 변압기 2차 측에서 3상 단락이 났어. 단락전류는?',
        formula: 'Is = (100 / %Z) × In',
        unit: 'A',
        answer: Is,
        distractors: [
          { v: (In * z) / 100, why: '%Z를 곱하고 100으로 나눴어. 반대야. %Z가 작을수록 단락전류가 커.' },
          { v: In / z, why: '100을 빠뜨렸어. %를 비율로 바꾸면 ' + n(z) + '% = ' + n(z / 100) + '.' },
          { v: (100 / z) * In / S3, why: '√3으로 한 번 더 나눴어. In이 이미 선전류라 필요 없어.' },
        ],
        conclusion: 'Is = 100/' + n(z) + ' × ' + n(In) + ' = ' + q(Is, 'A'),
        steps: ['%Z = ' + n(z) + '%는 정격전류일 때 임피던스 전압이 정격의 ' + n(z) + '%라는 뜻.', '단락하면 전압 100%가 전부 임피던스에 걸리니까 전류는 100/' + n(z) + ' = ' + n(100 / z) + '배.', 'Is = ' + n(100 / z) + ' × ' + n(In) + ' = ' + q(Is, 'A') + '.'],
        check: n(Is) + ' × ' + n(z / 100) + ' = ' + n(In) + ' A. 거꾸로 정격전류가 나와.',
        traps: ['단락전류·단락용량 = 정격값 × 100/%Z.'],
      };
    },
  });

  T({
    id: 'pw-short-capacity',
    concept: 'pw-pctz',
    gen(r) {
      const Pn = r.pick([5, 10, 20, 30, 50, 100]);
      const z = r.pick([4, 5, 8, 10, 12.5, 20]);
      const Ps = (100 / z) * Pn;
      return {
        params: { Pn, z },
        text: '기준 용량 ' + q(Pn, 'MVA') + ' 기준으로 %임피던스가 ' + q(z, '%') + '인 지점의 단락용량은?',
        formula: 'Ps = (100 / %Z) × Pn',
        unit: 'MVA',
        answer: Ps,
        distractors: [
          { v: (Pn * z) / 100, why: '%Z를 곱했어. 단락용량은 %Z에 반비례해.' },
          { v: Pn / z, why: '100을 빠뜨렸어.' },
          { v: (S3 * 100 * Pn) / z, why: '√3을 곱했어. 용량(MVA)끼리는 √3이 필요 없어.' },
        ],
        conclusion: 'Ps = 100/' + n(z) + ' × ' + n(Pn) + ' = ' + q(Ps, 'MVA'),
        steps: ['단락용량 = 기준 용량 × 100/%Z.', n(Pn) + ' × ' + n(100 / z) + ' = ' + q(Ps, 'MVA') + '.'],
        check: '%Z가 100%라면 단락용량 = 기준 용량. ' + n(z) + '%는 그보다 ' + n(100 / z) + '배 커야 해. 맞아.',
        traps: ['차단기 정격 차단용량은 이 단락용량보다 커야 해.'],
      };
    },
  });

  T({
    id: 'pw-pctz-calc',
    concept: 'pw-pctz',
    gen(r) {
      const P = r.pick([1000, 2000, 5000, 10000, 20000]);
      const V = r.pick([10, 20, 30]);
      const Z = r.pick([0.5, 1, 2, 4, 5, 10]);
      const pz = (P * Z) / (10 * V * V);
      if (!F.isNice(pz, 2) || pz < 0.5 || pz > 50) return null;
      return {
        params: { P, V, Z },
        text: '정격 ' + q(P, 'kVA') + ', 정격 선간전압 ' + q(V, 'kV') + '인 3상 선로의 한 상 임피던스가 ' + q(Z, 'Ω') + '이야. %임피던스는?',
        formula: '%Z = P[kVA] × Z[Ω] / (10 × V²[kV])',
        unit: '%',
        answer: pz,
        distractors: [
          { v: (P * Z) / (V * V), why: '분모의 10을 빠뜨렸어.' },
          { v: (P * Z) / (10 * V), why: '전압을 제곱하지 않았어.' },
          { v: (10 * V * V) / (P * Z), why: '분자와 분모를 뒤집었어.' },
        ],
        conclusion: '%Z = ' + n(P) + ' × ' + n(Z) + ' / (10 × ' + n(V) + '²) = ' + q(pz, '%'),
        steps: ['단위 그대로(kVA, Ω, kV) 공식에 넣으면 돼.', '분자: ' + n(P * Z) + ', 분모: 10 × ' + n(V * V) + ' = ' + n(10 * V * V) + '.', '%Z = ' + n(P * Z) + ' ÷ ' + n(10 * V * V) + ' = ' + q(pz, '%') + '.'],
        check: '정격전류 In = ' + n(P) + '/(√3 × ' + n(V) + ') ≈ ' + n(P / (S3 * V), 1) + ' A, 상전압 ≈ ' + n((V * 1000) / S3, 0) + ' V → In·Z/E × 100 ≈ ' + n(((P / (S3 * V)) * Z) / ((V * 1000) / S3) * 100) + '%. 같아.',
        traps: ['이 공식은 kVA·kV 단위 전용이야. MVA나 V를 넣으면 숫자가 틀어져.'],
      };
    },
  });

  // ───────── 역률 개선 ─────────
  T({
    id: 'pw-pfc',
    concept: 'pw-pfc',
    gen(r) {
      const [a, b] = r.pick([[0.6, 0.8], [0.6, 1], [0.8, 1]]);
      const P = r.pick([120, 240, 360, 480, 600, 1200]);
      const Qc = P * (TAN[a] - TAN[b]);
      return {
        params: { P, a, b },
        text: '역률 ' + n(a) + '(지상)로 ' + q(P, 'kW') + '를 쓰는 부하의 역률을 ' + n(b) + '로 개선하려면 전력용 콘덴서가 몇 kVA 필요할까?',
        formula: 'Qc = P(tanθ₁ − tanθ₂)',
        unit: 'kVA',
        answer: Qc,
        distractors: [
          { v: P * (SIN[a] - SIN[b]), why: 'tan 대신 sin의 차를 곱했어. P(유효전력)에 곱하는 건 tanθ야.' },
          { v: P * TAN[a], why: '개선 후에도 남는 무효전력(P·tanθ₂)을 빼지 않았어.' },
          { v: P / a - P / b, why: '피상전력의 차를 구했어. 콘덴서가 줄이는 건 무효전력이야.' },
          { v: P * (TAN[a] + TAN[b]), why: '두 tan을 더했어. 개선 전에서 개선 후를 빼야 해.' },
        ],
        conclusion: 'Qc = ' + n(P) + ' × (' + n(TAN[a], 4) + ' − ' + n(TAN[b], 4) + ') = ' + q(Qc, 'kVA'),
        steps: [
          '개선 전 tanθ₁ = sin/cos = ' + n(SIN[a]) + '/' + n(a) + ' = ' + n(TAN[a], 4) + ' → 무효전력 ' + n(P * TAN[a]) + ' kvar.',
          '개선 후 tanθ₂ = ' + n(TAN[b], 4) + ' → 무효전력 ' + n(P * TAN[b]) + ' kvar.',
          '콘덴서가 상쇄할 몫: ' + n(P * TAN[a]) + ' − ' + n(P * TAN[b]) + ' = ' + q(Qc, 'kVA') + '.',
        ],
        check: '개선 후 피상전력 = √(' + n(P) + '² + ' + n(P * TAN[b]) + '²) = ' + n(P / b) + ' kVA → 역률 ' + n(P) + '/' + n(P / b) + ' = ' + n(b) + '. 목표와 같아.',
        traps: ['역률을 1로 만들려면 무효전력을 전부(P·tanθ₁) 상쇄해야 해.'],
      };
    },
  });

  // ───────── 이도 ─────────
  T({
    id: 'pw-sag-d',
    concept: 'pw-sag',
    gen(r) {
      const W = r.pick([0.5, 1, 1.5, 2, 2.5]);
      const S = r.pick([100, 150, 200, 250, 300, 400]);
      const Tn = r.pick([500, 800, 1000, 1250, 1500, 2000, 2500]);
      const D = (W * S * S) / (8 * Tn);
      if (!F.isNice(D, 2) || D > 20) return null;
      return {
        params: { W, S, T: Tn },
        text: '경간 ' + q(S, 'm') + '에서 전선 1 m당 무게가 ' + q(W, 'kg') + ', 수평장력이 ' + q(Tn, 'kg') + '이야. 이도(처진 깊이)는?',
        formula: 'D = WS² / (8T)',
        unit: 'm',
        answer: D,
        distractors: [
          { v: (W * S) / (8 * Tn), why: '경간을 제곱하지 않았어.' },
          { v: (W * S * S) / Tn, why: '8로 나누는 걸 빠뜨렸어.' },
          { v: (W * S * S) / (2 * Tn), why: '8 대신 2로 나눴어.' },
          { v: (8 * W * S * S) / Tn, why: '8을 나눠야 하는데 곱했어.' },
        ],
        conclusion: 'D = ' + n(W) + ' × ' + n(S) + '² / (8 × ' + n(Tn) + ') = ' + q(D, 'm'),
        steps: ['분자: W × S² = ' + n(W) + ' × ' + n(S * S) + ' = ' + n(W * S * S) + '.', '분모: 8T = ' + n(8 * Tn) + '.', 'D = ' + n(W * S * S) + ' ÷ ' + n(8 * Tn) + ' = ' + q(D, 'm') + '.'],
        check: '실제 전선 길이는 S + 8D²/(3S) = ' + n(S) + ' + ' + n((8 * D * D) / (3 * S), 3) + ' m. 경간보다 아주 조금 길어서 자연스러워.',
        traps: ['이도가 너무 크면 전선이 땅·나무에 닿고, 너무 작으면 장력이 커져 끊어질 위험이 있어.'],
      };
    },
  });

  T({
    id: 'pw-sag-len',
    concept: 'pw-sag',
    gen(r) {
      const S = r.pick([100, 150, 200, 300, 400]);
      const D = r.pick([1, 1.5, 2, 2.5, 3, 4, 5]);
      const extra = (8 * D * D) / (3 * S);
      return {
        params: { S, D },
        text: '경간 ' + q(S, 'm') + ', 이도 ' + q(D, 'm') + '인 전선의 실제 길이는 경간보다 약 몇 m 길까?',
        formula: 'L = S + 8D²/(3S)  →  L − S = 8D²/(3S)',
        unit: 'm',
        decimals: 4,
        answer: extra,
        distractors: [
          { v: (8 * D) / (3 * S), why: '이도를 제곱하지 않았어.' },
          { v: (3 * D * D) / (8 * S), why: '8과 3의 위치를 바꿨어.' },
          { v: (8 * D * D) / S, why: '3으로 나누는 걸 빠뜨렸어.' },
        ],
        conclusion: 'L − S = 8 × ' + n(D) + '² / (3 × ' + n(S) + ') ≈ ' + q(extra, 'm', 4),
        steps: ['실제 길이 L = S + 8D²/(3S). 늘어난 길이는 8D²/(3S).', '8 × ' + n(D * D) + ' = ' + n(8 * D * D) + ', 3 × ' + n(S) + ' = ' + n(3 * S) + '.', n(8 * D * D) + ' ÷ ' + n(3 * S) + ' ≈ ' + q(extra, 'm', 4) + '.'],
        check: '경간 ' + n(S) + ' m에 비해 아주 작은 값(수 cm~수십 cm)이 맞아. 처짐은 길이를 조금만 늘려도 크게 생겨.',
        traps: ['이도 D는 길이 차이의 제곱근에 비례해서, 전선이 조금만 늘어나도 이도는 꽤 커져.'],
      };
    },
  });

  // ───────── 선로정수 ─────────
  T({
    id: 'pw-gmd',
    concept: 'pw-line',
    gen(r) {
      const sets = [[1, 2, 4, 2], [1, 1, 8, 2], [1, 3, 9, 3], [2, 4, 8, 4], [1, 4, 16, 4], [2, 2, 2, 2], [1, 8, 27, 6], [3, 3, 24, 6]];
      const [d1, d2, d3, g] = r.pick(sets);
      const k = r.pick([0.5, 1, 2]);
      const D1 = d1 * k;
      const D2 = d2 * k;
      const D3 = d3 * k;
      const D = g * k;
      if (D3 > 16) return null;
      return {
        params: { D1, D2, D3 },
        text: '3상 선로의 선간거리가 각각 ' + q(D1, 'm') + ', ' + q(D2, 'm') + ', ' + q(D3, 'm') + '야. 등가선간거리는?',
        formula: 'D = ∛(D₁·D₂·D₃)',
        unit: 'm',
        answer: D,
        distractors: [
          { v: (D1 + D2 + D3) / 3, why: '산술평균을 냈어. 등가선간거리는 기하평균(세제곱근)이야.' },
          { v: Math.sqrt(D1 * D2 * D3), why: '세제곱근 대신 제곱근을 씌웠어.' },
          { v: (D1 * D2 * D3) / 3, why: '곱을 3으로 나눴어. 3제곱근을 씌워야 해.' },
        ],
        conclusion: 'D = ∛(' + n(D1) + '×' + n(D2) + '×' + n(D3) + ') = ∛' + n(D1 * D2 * D3) + ' = ' + q(D, 'm'),
        steps: ['곱: ' + n(D1) + ' × ' + n(D2) + ' × ' + n(D3) + ' = ' + n(D1 * D2 * D3) + '.', '세제곱근: ' + n(D) + ' × ' + n(D) + ' × ' + n(D) + ' = ' + n(D1 * D2 * D3) + ' → D = ' + q(D, 'm') + '.'],
        check: '기하평균은 가장 짧은 거리(' + n(Math.min(D1, D2, D3)) + ')와 가장 긴 거리(' + n(Math.max(D1, D2, D3)) + ') 사이에 있어야 해. 맞아.',
        traps: ['정삼각형 배치면 D = 한 변 길이, 일직선 등간격(D, D, 2D) 배치면 D·∛2.'],
      };
    },
  });

  T({
    id: 'pw-line-lc',
    concept: 'pw-line',
    gen(r) {
      const combos = [[1, 1], [2, 2], [0.5, 0.5], [5, 5], [1, 0.1], [2, 0.2], [5, 0.5]];
      const [Dm, rcm] = r.pick(combos);
      const ratio = (Dm * 100) / rcm;
      const lg = Math.log10(ratio);
      const askL = r.chance(0.5);
      if (askL) {
        const L = 0.05 + 0.4605 * lg;
        return {
          params: { Dm, rcm, ask: 'L' },
          text: '등가선간거리 ' + q(Dm, 'm') + ', 전선 반지름 ' + q(rcm, 'cm') + '인 3상 선로의 1선당 작용 인덕턴스는 약 몇 mH/km야?',
          formula: 'L = 0.05 + 0.4605 log₁₀(D/r)  [mH/km]',
          unit: 'mH/km',
          decimals: 4,
          answer: L,
          distractors: [
            { v: 0.4605 * lg, why: '전선 내부 인덕턴스 0.05를 빠뜨렸어.' },
            { v: 0.05 + 0.4605 * Math.log(ratio), why: '상용로그(log₁₀) 대신 자연로그(ln)를 썼어.' },
            { v: 0.05 + 0.4605 * Math.log10(Dm / rcm), why: 'cm를 m로 맞추지 않고 숫자 그대로 나눴어. D/r = ' + n(ratio) + '이야.' },
          ],
          conclusion: 'D/r = ' + n(ratio) + ' → L = 0.05 + 0.4605 × ' + n(lg) + ' ≈ ' + q(L, 'mH/km', 4),
          steps: ['단위 맞추기: D = ' + n(Dm * 100) + ' cm, r = ' + n(rcm) + ' cm → D/r = ' + n(ratio) + '.', 'log₁₀' + n(ratio) + ' = ' + n(lg) + '.', 'L = 0.05 + 0.4605 × ' + n(lg) + ' = ' + q(L, 'mH/km', 4) + '.'],
          check: '거꾸로 풀기: (' + n(L, 4) + ' − 0.05) ÷ 0.4605 = ' + n((L - 0.05) / 0.4605) + ' = log₁₀(D/r) → D/r = ' + n(ratio) + '. 맞아.',
          traps: ['0.05는 전선 "내부" 인덕턴스, 0.4605 log 항은 "외부" 인덕턴스야.'],
        };
      }
      const C = 0.02413 / lg;
      return {
        params: { Dm, rcm, ask: 'C' },
        text: '등가선간거리 ' + q(Dm, 'm') + ', 전선 반지름 ' + q(rcm, 'cm') + '인 3상 선로의 1선당 작용 정전용량은 약 몇 μF/km야?',
        formula: 'C = 0.02413 / log₁₀(D/r)  [μF/km]',
        unit: 'μF/km',
        decimals: 5,
        answer: C,
        distractors: [
          { v: 0.02413 * lg, why: 'log로 나눠야 하는데 곱했어. 선간거리가 멀수록 용량은 작아져.' },
          { v: 0.02413 / Math.log(ratio), why: '상용로그 대신 자연로그를 썼어.' },
          { v: 0.2413 / lg, why: '계수를 0.2413으로 잘못 기억했어. 0.02413이야.' },
        ],
        conclusion: 'D/r = ' + n(ratio) + ' → C = 0.02413 / ' + n(lg) + ' ≈ ' + q(C, 'μF/km', 5),
        steps: ['D/r = ' + n(Dm * 100) + ' cm ÷ ' + n(rcm) + ' cm = ' + n(ratio) + '.', 'log₁₀' + n(ratio) + ' = ' + n(lg) + '.', 'C = 0.02413 ÷ ' + n(lg) + ' ≈ ' + q(C, 'μF/km', 5) + '.'],
        check: 'D/r가 10배 커지면 log가 1 늘어서 C는 작아져. 거리가 멀면 콘덴서 극판이 멀어진 것과 같아. 맞아.',
        traps: ['L은 log에 비례, C는 log에 반비례.'],
      };
    },
  });

  // ───────── 발전 ─────────
  T({
    id: 'pw-hydro',
    concept: 'pw-gen',
    gen(r) {
      const Q = r.pick([5, 10, 20, 25, 50, 100]);
      const H = r.pick([10, 20, 30, 50, 100]);
      const eta = r.pick([0.8, 0.85, 0.9]);
      const P = 9.8 * Q * H * eta;
      return {
        params: { Q, H, eta },
        text: '유량 ' + q(Q, 'm³/s') + ', 유효낙차 ' + q(H, 'm') + ', 종합 효율 ' + n(eta * 100) + '%인 수력 발전소의 출력은 몇 kW야?',
        formula: 'P = 9.8 × Q × H × η  [kW]',
        unit: 'kW',
        decimals: 1,
        answer: P,
        distractors: [
          { v: 9.8 * Q * H, why: '효율을 빠뜨렸어. 그건 이론 출력이야.' },
          { v: Q * H * eta, why: '9.8(중력가속도)을 빠뜨렸어.' },
          { v: (9.8 * Q * H) / eta, why: '효율로 나눴어. 실제 출력은 이론 출력보다 작아야 하니까 곱해.' },
        ],
        conclusion: 'P = 9.8 × ' + n(Q) + ' × ' + n(H) + ' × ' + n(eta) + ' = ' + q(P, 'kW', 1),
        steps: ['이론 출력: 9.8QH = 9.8 × ' + n(Q) + ' × ' + n(H) + ' = ' + q(9.8 * Q * H, 'kW', 1) + '.', '효율 반영: × ' + n(eta) + ' = ' + q(P, 'kW', 1) + '.'],
        check: '물 1 m³ = 1000 kg, 1초에 H m 떨어지면 1000 × 9.8 × H J/s = 9.8H kW. 공식의 9.8이 여기서 나와.',
        traps: ['유효낙차 = 총낙차 − 손실낙차. 문제에 총낙차가 나오면 손실을 빼고 써.'],
      };
    },
  });

  T({
    id: 'pw-thermal',
    concept: 'pw-gen',
    gen(r) {
      const W = r.pick([1000, 2000, 5000, 10000]);
      const H = r.pick([5000, 6000, 7000, 8600, 10000]);
      const eta = r.pick([25, 30, 35, 40]);
      const m = (860 * W) / ((eta / 100) * H);
      if (!F.isNice(m, 1)) return null;
      return {
        params: { W, m, H },
        text: '발열량 ' + q(H, 'kcal/kg') + '인 연료 ' + q(m, 'kg') + '을 태워 ' + q(W, 'kWh') + '를 발전했어. 발전소의 열효율은?',
        formula: 'η = 860W / (mH) × 100 [%]',
        unit: '%',
        answer: eta,
        distractors: [
          { v: eta / 100, why: '100을 곱하지 않았어(%로 안 바꿈).' },
          { v: (W / (m * H)) * 100, why: '860을 빠뜨렸어. 전력량(kWh)을 열량(kcal)으로 바꾸는 숫자야.' },
          { v: ((m * H) / (860 * W)) * 100, why: '분자와 분모를 뒤집었어. 효율은 "나온 것 ÷ 넣은 것".' },
        ],
        conclusion: 'η = 860 × ' + n(W) + ' / (' + n(m) + ' × ' + n(H) + ') × 100 = ' + q(eta, '%'),
        steps: ['나온 에너지: ' + n(W) + ' kWh × 860 = ' + n(860 * W) + ' kcal.', '넣은 에너지: ' + n(m) + ' kg × ' + n(H) + ' = ' + n(m * H) + ' kcal.', 'η = ' + n(860 * W) + ' ÷ ' + n(m * H) + ' × 100 = ' + q(eta, '%') + '.'],
        check: '화력 발전 효율은 보통 30~40%대. ' + n(eta) + '%면 자연스러워.',
        traps: ['1 kWh = 860 kcal. 이 숫자가 화력 효율 문제의 핵심이야.'],
      };
    },
  });

  // ───────── 수용률·부등률·부하율 ─────────
  T({
    id: 'pw-transformer-cap',
    concept: 'pw-demand',
    gen(r) {
      const k = r.pick([2, 3]);
      const loads = [];
      for (let i = 0; i < k; i++) loads.push([r.pick([50, 100, 150, 200, 300]), r.pick([0.4, 0.5, 0.6, 0.7, 0.8])]);
      const div = r.pick([1.1, 1.2, 1.25, 1.5]);
      const pf = r.pick([0.8, 0.9]);
      const sum = loads.reduce((a, [p, d]) => a + p * d, 0);
      const inst = loads.reduce((a, [p]) => a + p, 0);
      const kva = sum / (div * pf);
      return {
        params: { loads, div, pf },
        text:
          '설비용량과 수용률이 ' + loads.map(([p, d]) => n(p) + ' kW(' + n(d * 100) + '%)').join(', ') + '인 부하들에 전기를 공급할 변압기 용량은 약 몇 kVA야? (부등률 ' + n(div) + ', 역률 ' + n(pf) + ')',
        formula: '변압기 용량 = Σ(설비용량 × 수용률) / (부등률 × 역률)',
        unit: 'kVA',
        decimals: 1,
        answer: kva,
        distractors: [
          { v: (sum * div) / pf, why: '부등률을 곱했어. 최대가 겹치지 않는 만큼 줄여 주는 값이라 나눠야 해.' },
          { v: sum / div, why: '역률로 나누지 않았어. 그건 kW 값이야.' },
          { v: inst / (div * pf), why: '수용률을 곱하지 않았어.' },
          { v: sum / pf, why: '부등률을 빠뜨렸어.' },
        ],
        conclusion: 'Σ = ' + n(sum) + ' kW → ' + n(sum) + ' / (' + n(div) + ' × ' + n(pf) + ') ≈ ' + q(kva, 'kVA', 1),
        steps: [
          '각 부하의 최대전력 = 설비 × 수용률: ' + loads.map(([p, d]) => n(p) + '×' + n(d) + '=' + n(p * d)).join(', ') + ' → 합 ' + n(sum) + ' kW.',
          '최대가 동시에 오지 않으니 부등률로 나눠: ' + n(sum) + ' ÷ ' + n(div) + ' = ' + n(sum / div, 2) + ' kW(합성 최대전력).',
          'kVA로: ÷ 역률 ' + n(pf) + ' ≈ ' + q(kva, 'kVA', 1) + '.',
        ],
        check: '합성 최대전력(' + n(sum / div, 1) + ' kW)은 설비 합계(' + n(inst) + ' kW)보다 작아야 해. 맞아.',
        traps: ['수용률은 곱하고, 부등률과 역률은 나눠.'],
      };
    },
  });

  T({
    id: 'pw-rates',
    concept: 'pw-demand',
    gen(r) {
      if (r.chance(0.5)) {
        const Pi = r.pick([100, 200, 250, 400, 500, 1000]);
        const d = r.pick([40, 50, 60, 70, 75, 80]);
        const Pm = (Pi * d) / 100;
        return {
          params: { mode: 'demand', Pi, Pm },
          text: '설비용량 ' + q(Pi, 'kW') + '인 공장의 최대수용전력이 ' + q(Pm, 'kW') + '야. 수용률은?',
          formula: '수용률 = 최대수용전력 / 설비용량 × 100',
          unit: '%',
          answer: d,
          distractors: [
            { v: (Pi / Pm) * 100, why: '분자와 분모를 뒤집었어. 수용률은 100%를 넘지 않는 게 보통이야.' },
            { v: d / 100, why: '100을 곱하지 않았어.' },
            { v: ((Pi - Pm) / Pi) * 100, why: '안 쓰는 비율을 구했어.' },
          ],
          conclusion: '수용률 = ' + n(Pm) + ' / ' + n(Pi) + ' × 100 = ' + q(d, '%'),
          steps: ['수용률 = 실제로 가장 많이 쓴 전력 ÷ 설치된 전체 용량.', n(Pm) + ' ÷ ' + n(Pi) + ' = ' + n(d / 100) + ' → ' + q(d, '%') + '.'],
          check: n(Pi) + ' × ' + n(d / 100) + ' = ' + n(Pm) + ' kW. 최대수용전력과 같아.',
          traps: ['수용률·부하율은 1(100%) 이하, 부등률은 1 이상이야.'],
        };
      }
      const Pm = r.pick([100, 200, 250, 400, 500, 1000]);
      const lf = r.pick([40, 50, 60, 75, 80]);
      const Wd = ((Pm * lf) / 100) * 24;
      return {
        params: { mode: 'load', Pm, Wd },
        text: '하루 사용 전력량이 ' + q(Wd, 'kWh') + ', 하루 최대전력이 ' + q(Pm, 'kW') + '인 수용가의 일 부하율은?',
        formula: '부하율 = 평균전력 / 최대전력 × 100,  평균전력 = 전력량 / 24h',
        unit: '%',
        answer: lf,
        distractors: [
          { v: (Wd / Pm) * 100, why: '24시간으로 나누지 않았어. 전력량(kWh)을 평균전력(kW)으로 바꿔야 해.' },
          { v: (Pm / (Wd / 24)) * 100, why: '분자와 분모를 뒤집었어.' },
          { v: lf / 100, why: '100을 곱하지 않았어.' },
        ],
        conclusion: '평균 ' + n(Wd / 24) + ' kW → 부하율 = ' + n(Wd / 24) + ' / ' + n(Pm) + ' × 100 = ' + q(lf, '%'),
        steps: ['평균전력 = ' + n(Wd) + ' kWh ÷ 24 h = ' + q(Wd / 24, 'kW') + '.', '부하율 = ' + n(Wd / 24) + ' ÷ ' + n(Pm) + ' × 100 = ' + q(lf, '%') + '.'],
        check: n(Pm) + ' kW × ' + n(lf / 100) + ' × 24 h = ' + n(Wd) + ' kWh. 맞아.',
        traps: ['부하율이 높을수록 설비를 고르게 잘 쓰는 거야.'],
      };
    },
  });
})(globalThis.GISA);
