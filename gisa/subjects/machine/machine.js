// 전기기기 문제 템플릿
(function (G) {
  'use strict';
  const F = G.fmt;
  const n = F.num;
  const q = F.q;
  const T = G.defineTemplate;
  const PI = Math.PI;
  const S2 = F.SQRT2;
  const ratioLabel = (v) => F.ratio(v) + '배';

  // ───────── 직류기 ─────────
  T({
    id: 'mc-dc-emf',
    concept: 'mc-dc-gen',
    gen(r) {
      const p = r.pick([2, 4, 6, 8]);
      const Z = r.pick([120, 200, 240, 300, 360, 400, 500, 600, 800, 1000]);
      const phi = r.pick([0.01, 0.02, 0.025, 0.05, 0.1]);
      const N = r.pick([600, 900, 1000, 1200, 1500, 1800]);
      const wave = r.chance(0.5);
      const a = wave ? 2 : p;
      const E = (p * Z * phi * N) / (60 * a);
      if (!F.isNice(E, 1) || E < 10 || E > 2000) return null;
      return {
        params: { p, Z, phi, N, a },
        text: '극수 ' + p + ', 전기자 도체 수 ' + Z + ', 극당 자속 ' + q(phi, 'Wb') + '인 ' + (wave ? '파권' : '중권') + ' 직류 발전기가 ' + q(N, 'rpm') + '으로 돌고 있어. 유기기전력은?',
        formula: 'E = pZΦN / (60a)  (중권 a = p, 파권 a = 2)',
        unit: 'V',
        answer: E,
        distractors: [
          { v: (p * Z * phi * N) / (60 * (wave ? p : 2)), why: (wave ? '중권' : '파권') + '의 병렬회로 수를 썼어. ' + (wave ? '파권은 a = 2' : '중권은 a = p = ' + p) + '야.' },
          { v: (p * Z * phi * N) / a, why: '60을 빠뜨렸어. N이 rpm(분당)이라 초당 회전수로 바꿔야 해.' },
          { v: (p * Z * phi * N) / 60, why: '병렬회로 수 a로 나누지 않았어.' },
          { v: (Z * phi * N) / (60 * a), why: '극수 p를 빠뜨렸어.' },
        ],
        conclusion: 'E = ' + p + '×' + Z + '×' + n(phi) + '×' + N + ' / (60×' + a + ') = ' + q(E, 'V'),
        steps: [
          (wave ? '파권이라 병렬회로 수 a = 2.' : '중권이라 병렬회로 수 a = 극수 = ' + p + '.'),
          '분자: pZΦN = ' + p + ' × ' + Z + ' × ' + n(phi) + ' × ' + N + ' = ' + n(p * Z * phi * N) + '.',
          '분모: 60a = ' + 60 * a + ' → E = ' + q(E, 'V') + '.',
        ],
        check: '회전수를 2배로 하면 E도 2배(' + n(2 * E) + ' V)여야 해. E ∝ ΦN이라 맞아.',
        traps: ['중권(a = p)은 저전압 대전류, 파권(a = 2)은 고전압 소전류용이야.'],
      };
    },
  });

  T({
    id: 'mc-dc-terminal',
    concept: 'mc-dc-gen',
    gen(r) {
      const gen = r.chance(0.5);
      const V0 = r.pick([100, 110, 200, 220, 440]);
      const Ia = r.pick([10, 20, 40, 50, 100]);
      const Ra = r.pick([0.05, 0.1, 0.2, 0.25, 0.5]);
      const drop = Ia * Ra;
      if (drop >= V0 * 0.3) return null;
      const ans = V0 - drop;
      return {
        params: { gen, V0, Ia, Ra },
        text: gen
          ? '유기기전력 ' + q(V0, 'V') + ', 전기자 저항 ' + q(Ra, 'Ω') + '인 타여자 발전기에서 전기자 전류 ' + q(Ia, 'A') + '가 흘러. 단자전압은?'
          : '단자전압 ' + q(V0, 'V') + ', 전기자 저항 ' + q(Ra, 'Ω') + '인 타여자 전동기에 전기자 전류 ' + q(Ia, 'A') + '가 흘러. 역기전력은?',
        formula: gen ? '발전기 V = E − IaRa' : '전동기 E = V − IaRa',
        unit: 'V',
        answer: ans,
        distractors: [
          { v: V0 + drop, why: '전압강하를 더했어. ' + (gen ? '발전기는 만든 전압에서 내부 강하만큼 빠져서 나와.' : '전동기 역기전력은 걸어 준 전압보다 작아.') },
          { v: drop, why: '전기자 저항의 전압강하(IaRa)만 구했어.' },
          { v: V0 - Ia / Ra, why: '저항으로 나눴어. 전압강하는 전류 × 저항이야.' },
        ],
        conclusion: (gen ? 'V = ' : 'E = ') + n(V0) + ' − ' + n(Ia) + '×' + n(Ra) + ' = ' + q(ans, 'V'),
        steps: ['전기자 저항 강하: IaRa = ' + n(Ia) + ' × ' + n(Ra) + ' = ' + q(drop, 'V') + '.', (gen ? '발전기: 단자전압 = 유기기전력 − 강하' : '전동기: 역기전력 = 단자전압 − 강하') + ' = ' + n(V0) + ' − ' + n(drop) + ' = ' + q(ans, 'V') + '.'],
        check: gen ? '단자전압(' + n(ans) + ')은 유기기전력(' + n(V0) + ')보다 작아야 해. 맞아.' : '역기전력(' + n(ans) + ')은 단자전압(' + n(V0) + ')보다 작아야 전류가 들어가. 맞아.',
        traps: ['발전기: E가 크고 V가 작아. 전동기: V가 크고 E가 작아. 어느 쪽이든 큰 값 − IaRa = 작은 값.'],
      };
    },
  });

  T({
    id: 'mc-dc-torque',
    concept: 'mc-dc-motor',
    gen(r) {
      const PkW = r.pick([1, 2, 5, 10, 15, 20, 30, 50]);
      const N = r.pick([500, 600, 900, 1000, 1200, 1500, 1800, 3000]);
      const Tq = (60 * PkW * 1000) / (2 * PI * N);
      return {
        params: { PkW, N },
        text: '출력 ' + q(PkW, 'kW') + ', 회전수 ' + q(N, 'rpm') + '인 전동기의 토크는 약 몇 N·m야?',
        formula: 'T = P/ω = 60P / (2πN)',
        unit: 'N·m',
        decimals: 2,
        answer: Tq,
        distractors: [
          { v: (60 * PkW * 1000) / N, why: '2π를 빠뜨렸어. 각속도 ω = 2πN/60이야.' },
          { v: (PkW * 1000) / (2 * PI * N), why: '60을 빠뜨렸어. N이 분당 회전수라 초당으로 바꿔야 해.' },
          { v: (60 * PkW) / (2 * PI * N), why: 'kW를 W로 바꾸지 않았어.' },
        ],
        conclusion: 'T = 60 × ' + n(PkW * 1000) + ' / (2π × ' + n(N) + ') ≈ ' + q(Tq, 'N·m', 2),
        steps: ['각속도: ω = 2πN/60 = 2π × ' + n(N) + ' ÷ 60 ≈ ' + n((2 * PI * N) / 60, 2) + ' rad/s.', 'T = P/ω = ' + n(PkW * 1000) + ' ÷ ' + n((2 * PI * N) / 60, 2) + ' ≈ ' + q(Tq, 'N·m', 2) + '.'],
        check: 'T × ω ≈ ' + n(Tq, 2) + ' × ' + n((2 * PI * N) / 60, 2) + ' ≈ ' + n(PkW * 1000) + ' W. 출력과 같아.',
        traps: ['kg·m 단위로 물으면 T = 0.975 × P[W] / N[rpm]. 단위를 먼저 확인해.'],
      };
    },
  });

  T({
    id: 'mc-dc-speed',
    concept: 'mc-dc-motor',
    gen(r) {
      const V = r.pick([100, 200, 220]);
      const Ra = r.pick([0.1, 0.2, 0.25, 0.5]);
      const I1 = r.pick([20, 40, 50, 80, 100]);
      const I2 = r.pick([10, 20, 40, 50, 100, 120]);
      const N1 = r.pick([1000, 1200, 1500, 1800]);
      if (I1 === I2) return null;
      const E1 = V - I1 * Ra;
      const E2 = V - I2 * Ra;
      if (E2 <= V * 0.6 || E1 <= V * 0.6) return null;
      const N2 = (N1 * E2) / E1;
      return {
        params: { V, Ra, I1, I2, N1 },
        text: '단자전압 ' + q(V, 'V') + ', 전기자 저항 ' + q(Ra, 'Ω') + '인 분권 전동기가 전기자 전류 ' + q(I1, 'A') + '일 때 ' + q(N1, 'rpm') + '으로 돌아. 자속이 일정할 때 전기자 전류가 ' + q(I2, 'A') + '가 되면 회전수는 약 몇 rpm이야?',
        formula: 'N ∝ E = V − IaRa (자속 일정)',
        unit: 'rpm',
        decimals: 1,
        answer: N2,
        distractors: [
          { v: (N1 * E1) / E2, why: '역기전력 비를 뒤집었어. 회전수는 역기전력에 비례해.' },
          { v: (N1 * I1) / I2, why: '회전수가 전류에 반비례한다고 착각했어. 비례하는 건 역기전력이야.' },
          { v: (N1 * I2) / I1, why: '회전수가 전류에 비례한다고 착각했어.' },
        ],
        conclusion: 'E₁ = ' + n(E1) + ', E₂ = ' + n(E2) + ' → N₂ = ' + n(N1) + ' × ' + n(E2) + '/' + n(E1) + ' ≈ ' + q(N2, 'rpm', 1),
        steps: [
          '처음 역기전력 E₁ = ' + n(V) + ' − ' + n(I1) + '×' + n(Ra) + ' = ' + q(E1, 'V') + '.',
          '나중 역기전력 E₂ = ' + n(V) + ' − ' + n(I2) + '×' + n(Ra) + ' = ' + q(E2, 'V') + '.',
          '자속이 일정하면 N ∝ E: N₂ = ' + n(N1) + ' × ' + n(E2) + ' ÷ ' + n(E1) + ' ≈ ' + q(N2, 'rpm', 1) + '.',
        ],
        check: '전류가 ' + (I2 > I1 ? '늘었으니 역기전력이 줄어 속도가 약간 떨어져야 해' : '줄었으니 역기전력이 늘어 속도가 약간 올라야 해') + '. ' + n(N2, 1) + (I2 > I1 ? ' < ' : ' > ') + n(N1) + ', 맞아.',
        traps: ['분권 전동기는 부하가 변해도 속도가 거의 일정(정속도 전동기)해. 변화는 몇 % 수준이야.'],
      };
    },
  });

  // ───────── 변압기 ─────────
  T({
    id: 'mc-tr-ratio',
    concept: 'mc-tr-ratio',
    gen(r) {
      const a = r.pick([2, 5, 10, 15, 20, 30]);
      const N2 = r.pick([10, 20, 50, 100, 200]);
      const N1 = a * N2;
      const mode = r.pick(['V', 'I', 'Z']);
      if (mode === 'V') {
        const V1 = r.pick([200, 440, 1000, 3300, 6600]);
        const V2 = V1 / a;
        if (!F.isNice(V2, 2)) return null;
        return {
          params: { mode, N1, N2, x: V1 },
          text: '1차 권수 ' + N1 + '회, 2차 권수 ' + N2 + '회인 이상적인 변압기의 1차에 ' + q(V1, 'V') + '를 걸었어. 2차 전압은?',
          formula: 'V₂ = V₁ × N₂/N₁ = V₁/a',
          unit: 'V',
          answer: V2,
          distractors: [
            { v: V1 * a, why: '권수비를 곱했어. 2차 권수가 적으면 전압도 낮아져.' },
            { v: V1, why: '변압기는 전압을 권수비만큼 바꿔.' },
            { v: V1 / (a * a), why: '권수비를 제곱했어. a²은 임피던스 변환에서 써.' },
          ],
          conclusion: 'a = ' + N1 + '/' + N2 + ' = ' + a + ' → V₂ = ' + n(V1) + '/' + a + ' = ' + q(V2, 'V'),
          steps: ['권수비 a = N₁/N₂ = ' + N1 + ' ÷ ' + N2 + ' = ' + a + '.', '전압은 권수에 비례: V₂ = V₁/a = ' + n(V1) + ' ÷ ' + a + ' = ' + q(V2, 'V') + '.'],
          check: '1회당 전압이 같아야 해: ' + n(V1) + '/' + N1 + ' = ' + n(V1 / N1, 4) + ', ' + n(V2) + '/' + N2 + ' = ' + n(V2 / N2, 4) + ' V/회. 같아.',
          traps: ['감은 수가 많은 쪽이 전압이 높고 전류가 작아.'],
        };
      }
      if (mode === 'I') {
        const I2 = r.pick([10, 20, 50, 100, 200, 300]);
        const I1 = I2 / a;
        if (!F.isNice(I1, 2)) return null;
        return {
          params: { mode, N1, N2, x: I2 },
          text: '1차 권수 ' + N1 + '회, 2차 권수 ' + N2 + '회인 이상적인 변압기의 2차 전류가 ' + q(I2, 'A') + '야. 1차 전류는?',
          formula: 'I₁ = I₂ × N₂/N₁ = I₂/a',
          unit: 'A',
          answer: I1,
          distractors: [
            { v: I2 * a, why: '권수비를 곱했어. 전류는 권수에 반비례해서 권수 많은 1차 쪽 전류가 작아.' },
            { v: I2, why: '1차와 2차 전류가 같다고 생각했어.' },
            { v: I2 / (a * a), why: '권수비를 제곱했어.' },
          ],
          conclusion: 'a = ' + a + ' → I₁ = ' + n(I2) + '/' + a + ' = ' + q(I1, 'A'),
          steps: ['권수비 a = ' + N1 + '/' + N2 + ' = ' + a + '.', '전류는 권수에 반비례: I₁ = I₂/a = ' + n(I2) + ' ÷ ' + a + ' = ' + q(I1, 'A') + '.'],
          check: '암페어턴이 같아야 해: N₁I₁ = ' + N1 + '×' + n(I1) + ' = ' + n(N1 * I1) + ', N₂I₂ = ' + N2 + '×' + n(I2) + ' = ' + n(N2 * I2) + '. 같아.',
          traps: ['전력 V₁I₁ = V₂I₂가 같으니까 전압이 a배 높은 쪽은 전류가 1/a배야.'],
        };
      }
      const Z2 = r.pick([1, 2, 4, 5, 8, 10]);
      const Z1 = a * a * Z2;
      return {
        params: { mode, N1, N2, x: Z2 },
        text: '1차 권수 ' + N1 + '회, 2차 권수 ' + N2 + '회인 이상적인 변압기의 2차에 ' + q(Z2, 'Ω') + ' 부하를 연결했어. 1차 쪽에서 본 임피던스는?',
        formula: 'Z₁ = a² × Z₂',
        unit: 'Ω',
        answer: Z1,
        distractors: [
          { v: a * Z2, why: '권수비를 제곱하지 않았어. 전압은 a배, 전류는 1/a배라서 임피던스는 a²배야.' },
          { v: Z2 / (a * a), why: '방향을 거꾸로 했어. 2차를 1차로 옮기면 a²을 곱해.' },
          { v: Z2, why: '임피던스는 변압기를 거치면 a²배로 보여.' },
        ],
        conclusion: 'Z₁ = ' + a + '² × ' + n(Z2) + ' = ' + q(Z1, 'Ω'),
        steps: ['권수비 a = ' + a + '.', 'Z = V/I에서 전압 a배, 전류 1/a배 → 임피던스 a²배.', 'Z₁ = ' + a * a + ' × ' + n(Z2) + ' = ' + q(Z1, 'Ω') + '.'],
        check: '1차 V₁ = aV₂, I₁ = I₂/a → V₁/I₁ = a²·V₂/I₂ = ' + a * a + ' × ' + n(Z2) + '. 맞아.',
        traps: ['스피커 임피던스 정합(매칭)에 쓰는 원리야.'],
      };
    },
  });

  T({
    id: 'mc-tr-eff',
    concept: 'mc-tr-eff',
    gen(r) {
      const S = r.pick([10, 20, 50, 100, 200, 500]);
      const pf = r.pick([0.8, 1]);
      const Pi = r.pick([0.1, 0.2, 0.25, 0.5]) * (S / 50);
      const Pc = r.pick([1.5, 2, 3, 4]) * Pi;
      const m = r.pick([1, 1, 0.5, 0.75]);
      const out = m * S * pf;
      const eta = (out / (out + Pi + m * m * Pc)) * 100;
      const mText = m === 1 ? '전부하' : n(m * 100) + '% 부하';
      return {
        params: { S, pf, Pi, Pc, m },
        text: '용량 ' + q(S, 'kVA') + ' 변압기의 철손이 ' + q(Pi, 'kW') + ', 전부하 동손이 ' + q(Pc, 'kW') + '야. 역률 ' + n(pf) + ', ' + mText + '로 운전할 때 효율은 약 몇 %야?',
        formula: 'η = mP / (mP + Pi + m²Pc) × 100',
        unit: '%',
        decimals: 2,
        minGap: 0.003,
        answer: eta,
        distractors: [
          { v: (out / (out + Pi + m * Pc)) * 100, why: '동손에 m을 그대로 곱했어. 동손은 전류의 제곱이라 m²이야.', skip: m === 1 },
          { v: (out / (out + m * m * Pi + m * m * Pc)) * 100, why: '철손에도 m²을 곱했어. 철손은 부하와 상관없이 일정해.', skip: m === 1 },
          { v: ((m * S) / (m * S + Pi + m * m * Pc)) * 100, why: '역률을 빠뜨렸어. 출력은 kVA × 역률(kW)이야.' },
          { v: ((out - Pi - m * m * Pc) / out) * 100, why: '손실을 출력에서 뺐어. 효율 = 출력/(출력 + 손실).' },
          { v: (out / (out + Pi)) * 100, why: '동손을 빠뜨렸어.' },
          { v: (out / (out + m * m * Pc)) * 100, why: '철손을 빠뜨렸어.' },
        ].filter((d) => !d.skip),
        conclusion: 'η = ' + n(out) + ' / (' + n(out) + ' + ' + n(Pi) + ' + ' + n(m * m * Pc, 4) + ') × 100 ≈ ' + q(eta, '%', 2),
        steps: [
          '출력 = m × S × 역률 = ' + n(m) + ' × ' + n(S) + ' × ' + n(pf) + ' = ' + q(out, 'kW') + '.',
          '철손(일정) ' + q(Pi, 'kW') + ', 동손 = m² × ' + n(Pc) + ' = ' + q(m * m * Pc, 'kW', 4) + '.',
          'η = ' + n(out) + ' ÷ ' + n(out + Pi + m * m * Pc, 4) + ' × 100 ≈ ' + q(eta, '%', 2) + '.',
        ],
        check: '효율은 100%보다 조금 작아야 하고, 손실 합(' + n(Pi + m * m * Pc, 4) + ' kW)이 작을수록 100%에 가까워. ' + n(eta, 2) + '%, 맞아.',
        traps: ['"철손 일정, 동손 m²". 부하율이 주어지면 동손에만 제곱을 붙여.'],
      };
    },
  });

  T({
    id: 'mc-tr-maxeff',
    concept: 'mc-tr-eff',
    gen(r) {
      const [a, b] = r.pick([[1, 4], [1, 9], [4, 9], [9, 16], [1, 1], [9, 25], [16, 25]]);
      const k = r.pick([0.1, 0.2, 0.5, 1]);
      const Pi = a * k;
      const Pc = b * k;
      const m = Math.sqrt(a / b) * 100;
      return {
        params: { Pi, Pc },
        text: '철손 ' + q(Pi, 'kW') + ', 전부하 동손 ' + q(Pc, 'kW') + '인 변압기가 최대 효율을 내는 부하율은 전부하의 약 몇 %야?',
        formula: '최대 효율 조건: Pi = m²Pc → m = √(Pi/Pc)',
        unit: '%',
        decimals: 2,
        answer: m,
        distractors: [
          { v: (Pi / Pc) * 100, why: '√를 빠뜨렸어. 동손은 m²에 비례하니까 제곱근을 씌워야 해.' },
          { v: Math.sqrt(Pc / Pi) * 100, why: '철손과 동손을 뒤집었어.' },
          { v: (Pi / (Pi + Pc)) * 100, why: '전체 손실 중 철손 비율을 구했어.' },
        ],
        conclusion: 'm = √(' + n(Pi) + '/' + n(Pc) + ') = ' + n(m / 100, 4) + ' → ' + q(m, '%', 2),
        steps: ['최대 효율은 "철손 = 동손"일 때.', '부하율 m에서 동손 = m²Pc → m² × ' + n(Pc) + ' = ' + n(Pi) + '.', 'm = √(' + n(Pi / Pc, 4) + ') = ' + n(m / 100, 4) + ' → ' + q(m, '%', 2) + '.'],
        check: '이 부하율에서 동손 = ' + n((m / 100) ** 2 * Pc, 4) + ' kW = 철손 ' + n(Pi) + ' kW. 같아.',
        traps: ['철손이 동손보다 작게 설계된 변압기는 전부하보다 가벼운 부하에서 효율이 최대야.'],
      };
    },
  });

  T({
    id: 'mc-tr-reg',
    concept: 'mc-tr-reg',
    gen(r) {
      const p = r.pick([1, 1.5, 2, 2.5, 3, 4]);
      const qx = r.pick([2, 3, 4, 5, 6, 8]);
      const [c, s] = r.pick([[0.8, 0.6], [0.6, 0.8]]);
      const e = p * c + qx * s;
      return {
        params: { p, q: qx, pf: c },
        text: '%저항강하 ' + q(p, '%') + ', %리액턴스강하 ' + q(qx, '%') + '인 변압기를 역률 ' + n(c) + '(지상)로 운전할 때 전압변동률은?',
        formula: 'ε ≈ p cosθ + q sinθ',
        unit: '%',
        answer: e,
        distractors: [
          { v: p * s + qx * c, why: 'p와 q에 붙는 cos·sin을 바꿨어. 저항(p)은 cos과 짝이야.' },
          { v: p + qx, why: '역률을 반영하지 않고 그냥 더했어.' },
          { v: Math.sqrt(p * p + qx * qx), why: '%임피던스(√(p²+q²))를 구했어. 그건 역률이 최악일 때의 최대 전압변동률이야.' },
          { v: Math.abs(p * c - qx * s), why: '진상 역률 공식(p cosθ − q sinθ)을 썼어. 지상이면 +야.' },
        ],
        conclusion: 'ε = ' + n(p) + '×' + n(c) + ' + ' + n(qx) + '×' + n(s) + ' = ' + q(e, '%'),
        steps: ['sinθ = √(1 − ' + n(c) + '²) = ' + n(s) + '.', 'p cosθ = ' + n(p * c) + ', q sinθ = ' + n(qx * s) + '.', 'ε = ' + n(p * c) + ' + ' + n(qx * s) + ' = ' + q(e, '%') + '.'],
        check: '전압변동률은 %Z(√(p²+q²) = ' + n(Math.sqrt(p * p + qx * qx)) + '%)보다 클 수 없어. ' + n(e) + ' ≤ ' + n(Math.sqrt(p * p + qx * qx)) + ', 맞아.',
        traps: ['지상(뒤진) 역률: +, 진상(앞선) 역률: −. 진상이면 변동률이 음수가 될 수도 있어.'],
      };
    },
  });

  // ───────── 유도기·동기기 ─────────
  T({
    id: 'mc-im-slip',
    concept: 'mc-im-slip',
    gen(r) {
      const f = r.pick([50, 60]);
      const P = r.pick([2, 4, 6, 8, 10, 12]);
      const s = r.pick([2, 3, 4, 5, 6]);
      const Ns = (120 * f) / P;
      const N = Ns * (1 - s / 100);
      if (!F.isNice(N, 1)) return null;
      return {
        params: { f, P, N },
        text: f + ' Hz, ' + P + '극 3상 유도전동기가 ' + q(N, 'rpm') + '으로 돌고 있어. 슬립은 몇 %야?',
        formula: 'Ns = 120f/P,  s = (Ns − N)/Ns × 100',
        unit: '%',
        answer: s,
        distractors: [
          { v: ((Ns - N) / N) * 100, why: '실제 회전수 N으로 나눴어. 슬립의 기준(분모)은 동기속도 Ns야.' },
          { v: (N / Ns) * 100, why: '회전수 비율(1 − s)을 구했어.' },
          { v: s / 100, why: '100을 곱하지 않았어(%로 안 바꿈).' },
        ],
        conclusion: 'Ns = 120×' + f + '/' + P + ' = ' + n(Ns) + ' rpm → s = (' + n(Ns) + ' − ' + n(N) + ')/' + n(Ns) + ' = ' + q(s, '%'),
        steps: ['동기속도: Ns = 120 × ' + f + ' ÷ ' + P + ' = ' + q(Ns, 'rpm') + '.', '뒤처진 속도: ' + n(Ns) + ' − ' + n(N) + ' = ' + q(Ns - N, 'rpm') + '.', 's = ' + n(Ns - N) + ' ÷ ' + n(Ns) + ' × 100 = ' + q(s, '%') + '.'],
        check: 'N = (1 − s)Ns = ' + n(1 - s / 100) + ' × ' + n(Ns) + ' = ' + n(N) + ' rpm. 문제와 같아.',
        traps: ['보통 운전 중 유도전동기 슬립은 2~5% 정도야.'],
      };
    },
  });

  T({
    id: 'mc-im-speed',
    concept: 'mc-im-slip',
    gen(r) {
      const f = r.pick([50, 60]);
      const P = r.pick([2, 4, 6, 8]);
      const s = r.pick([2, 3, 4, 5]);
      const Ns = (120 * f) / P;
      const N = Ns * (1 - s / 100);
      if (!F.isNice(N, 1)) return null;
      return {
        params: { f, P, s },
        text: f + ' Hz, ' + P + '극 3상 유도전동기의 슬립이 ' + q(s, '%') + '야. 회전수는?',
        formula: 'N = (1 − s) × 120f/P',
        unit: 'rpm',
        answer: N,
        distractors: [
          { v: Ns, why: '동기속도를 그대로 답했어. 유도전동기는 슬립만큼 느려.' },
          { v: Ns * (1 + s / 100), why: '슬립을 더했어. 전동기는 동기속도보다 느리게 돌아.' },
          { v: ((60 * f) / P) * (1 - s / 100), why: '120 대신 60을 썼어. Ns = 120f/P(P는 극수).' },
          { v: Ns * (s / 100), why: '뒤처진 속도(sNs)만 구했어.' },
        ],
        conclusion: 'Ns = ' + n(Ns) + ' rpm → N = (1 − ' + n(s / 100) + ') × ' + n(Ns) + ' = ' + q(N, 'rpm'),
        steps: ['Ns = 120 × ' + f + ' ÷ ' + P + ' = ' + q(Ns, 'rpm') + '.', 'N = (1 − s)Ns = ' + n(1 - s / 100) + ' × ' + n(Ns) + ' = ' + q(N, 'rpm') + '.'],
        check: '(Ns − N)/Ns = ' + n(Ns - N) + '/' + n(Ns) + ' = ' + n(s / 100) + '. 주어진 슬립과 같아.',
        traps: ['60 Hz 4극이면 1800 rpm, 6극이면 1200 rpm. 자주 나오니 외워 둬.'],
      };
    },
  });

  T({
    id: 'mc-im-power',
    concept: 'mc-im-power',
    gen(r) {
      const s = r.pick([0.02, 0.03, 0.04, 0.05, 0.1]);
      const mode = r.pick(['Po', 'Pc', 'P2']);
      if (mode === 'P2') {
        const P2 = r.pick([10, 20, 25, 50, 100]);
        const Po = P2 * (1 - s);
        return {
          params: { mode, s, x: Po },
          text: '슬립 ' + n(s * 100) + '%로 운전하는 유도전동기의 기계적 출력이 ' + q(Po, 'kW') + '야. 2차 입력은?',
          formula: 'P₂ : Po = 1 : (1 − s) → P₂ = Po/(1 − s)',
          unit: 'kW',
          answer: P2,
          distractors: [
            { v: Po * (1 - s), why: '(1 − s)를 나눠야 하는데 곱했어. 2차 입력은 출력보다 커야 해.' },
            { v: Po / s, why: 's로 나눴어. P₂ = Pc₂/s일 때 쓰는 꼴이야.' },
            { v: Po * s, why: '2차 동손 비율(s)을 곱했어.' },
          ],
          conclusion: 'P₂ = ' + n(Po) + ' / (1 − ' + n(s) + ') = ' + q(P2, 'kW'),
          steps: ['P₂ : Po = 1 : (1 − s).', 'P₂ = Po ÷ (1 − s) = ' + n(Po) + ' ÷ ' + n(1 - s) + ' = ' + q(P2, 'kW') + '.'],
          check: '2차 동손 = sP₂ = ' + n(s * P2) + ' kW, P₂ − 동손 = ' + n(P2 - s * P2) + ' kW = 출력. 맞아.',
          traps: ['1 : s : (1 − s) 비례식 하나로 세 값을 모두 구할 수 있어.'],
        };
      }
      const P2 = r.pick([10, 20, 25, 50, 100]);
      if (mode === 'Pc') {
        const Pc = s * P2;
        return {
          params: { mode, s, x: P2 },
          text: '2차 입력이 ' + q(P2, 'kW') + '인 유도전동기가 슬립 ' + n(s * 100) + '%로 돌고 있어. 2차 동손은?',
          formula: 'Pc₂ = s × P₂',
          unit: 'kW',
          answer: Pc,
          distractors: [
            { v: (1 - s) * P2, why: '기계적 출력((1 − s)P₂)을 구했어.' },
            { v: P2 / s, why: 's를 곱해야 하는데 나눴어.' },
            { v: (s * P2) / (1 - s), why: '출력 기준으로 착각했어. 동손은 2차 입력 × s.' },
          ],
          conclusion: 'Pc₂ = ' + n(s) + ' × ' + n(P2) + ' = ' + q(Pc, 'kW'),
          steps: ['2차 입력 중 슬립 비율만큼이 2차 동손(열)이야.', 'Pc₂ = sP₂ = ' + n(s) + ' × ' + n(P2) + ' = ' + q(Pc, 'kW') + '.'],
          check: '출력 (1 − s)P₂ = ' + n((1 - s) * P2) + ' kW, 동손과 합치면 ' + n(P2) + ' kW = 2차 입력. 맞아.',
          traps: ['슬립이 크면(속도가 느리면) 2차 동손이 커져 전동기가 뜨거워져.'],
        };
      }
      const Po = (1 - s) * P2;
      return {
        params: { mode, s, x: P2 },
        text: '2차 입력이 ' + q(P2, 'kW') + '인 유도전동기가 슬립 ' + n(s * 100) + '%로 돌고 있어. 기계적 출력은?',
        formula: 'Po = (1 − s) × P₂',
        unit: 'kW',
        answer: Po,
        distractors: [
          { v: s * P2, why: '2차 동손(sP₂)을 구했어.' },
          { v: P2 * (1 + s), why: '슬립을 더했어. 출력은 입력보다 작아.' },
          { v: P2 / (1 - s), why: '(1 − s)로 나눴어. 출력에서 입력을 구할 때 쓰는 꼴이야.' },
        ],
        conclusion: 'Po = (1 − ' + n(s) + ') × ' + n(P2) + ' = ' + q(Po, 'kW'),
        steps: ['P₂ : Po = 1 : (1 − s).', 'Po = ' + n(1 - s) + ' × ' + n(P2) + ' = ' + q(Po, 'kW') + '.'],
        check: '2차 효율 = Po/P₂ = ' + n(1 - s) + ' = 1 − s. 맞아.',
        traps: ['2차 효율 η₂ = 1 − s = N/Ns.'],
      };
    },
  });

  T({
    id: 'mc-im-torque-v',
    concept: 'mc-im-power',
    gen(r) {
      const k = r.pick([0.5, 0.8, 0.9, 1.1, 1.2]);
      const ans = k * k;
      const label = (v) => n(v, 3) + '배';
      return {
        params: { k },
        text: '유도전동기의 공급 전압이 ' + n(k * 100) + '%로 바뀌면 같은 슬립에서의 토크는 처음의 몇 배가 될까?',
        formula: 'T ∝ V²',
        unit: '배',
        label,
        answer: ans,
        distractors: [
          { v: k, why: '토크가 전압에 그냥 비례한다고 생각했어. 전압의 제곱에 비례해.' },
          { v: 1 / (k * k), why: '반비례로 착각했어. 전압이 낮아지면 토크도 줄어.' },
          { v: Math.sqrt(k), why: '제곱근을 씌웠어. 제곱이야.' },
        ],
        conclusion: 'T ∝ V² → ' + n(k) + '² = ' + label(ans),
        steps: ['유도전동기 토크는 같은 슬립에서 공급 전압의 제곱에 비례해.', '(' + n(k) + ')² = ' + label(ans) + '.'],
        check: '전압 ' + n(k * 100) + '%면 토크는 ' + n(ans * 100, 1) + '%. ' + (k < 1 ? '전압이 조금만 떨어져도 토크는 더 많이 떨어져.' : '전압이 오르면 토크는 더 크게 올라.') + ' 제곱 관계와 맞아.',
        traps: ['그래서 기동 시 전압을 낮추는 Y-Δ 기동은 기동 토크도 1/3로 줄어.'],
      };
    },
  });

  T({
    id: 'mc-sync-speed',
    concept: 'mc-sync',
    gen(r) {
      const f = r.pick([50, 60]);
      const P = r.pick([2, 4, 6, 8, 10, 12, 16, 20]);
      const Ns = (120 * f) / P;
      return {
        params: { f, P },
        text: f + ' Hz, ' + P + '극 동기발전기의 회전수(동기속도)는?',
        formula: 'Ns = 120f / P',
        unit: 'rpm',
        answer: Ns,
        distractors: [
          { v: (60 * f) / P, why: '120 대신 60을 썼어. P가 극수(N극+S극)라 120f/P야.' },
          { v: (240 * f) / P, why: '극수 대신 극쌍수(P/2)를 넣었어.' },
          { v: (120 * P) / f, why: '주파수와 극수를 뒤집었어.' },
        ],
        conclusion: 'Ns = 120 × ' + f + ' / ' + P + ' = ' + q(Ns, 'rpm'),
        steps: ['동기속도 공식: Ns = 120f/P.', '120 × ' + f + ' = ' + 120 * f + ', ÷ ' + P + ' = ' + q(Ns, 'rpm') + '.'],
        check: '극수가 많을수록 천천히 돌아야 같은 주파수가 나와. 수력(저속)은 극수가 많고 화력(고속)은 2~4극이야. 맞아.',
        traps: ['동기기는 슬립 없이 정확히 Ns로 돌아.'],
      };
    },
  });

  T({
    id: 'mc-sync-power',
    concept: 'mc-sync',
    gen(r) {
      const E = r.pick([200, 250, 300, 400]);
      const V = r.pick([200, 220, 250]);
      const Xs = r.pick([2, 4, 5, 10, 20]);
      const d = r.pick([30, 90]);
      const sd = d === 90 ? 1 : 0.5;
      const P = (3 * E * V * sd) / Xs / 1000;
      if (!F.isNice(P, 2)) return null;
      return {
        params: { E, V, Xs, d },
        text: '1상의 유기기전력 ' + q(E, 'V') + ', 단자전압(상전압) ' + q(V, 'V') + ', 동기리액턴스 ' + q(Xs, 'Ω') + '인 3상 비돌극형 동기발전기의 부하각이 ' + d + '°야. 3상 출력은 몇 kW야?',
        formula: 'P = 3 × E·V·sinδ / Xs',
        unit: 'kW',
        answer: P,
        distractors: [
          { v: (E * V * sd) / Xs / 1000, why: '1상 출력만 구했어. 3상이면 3배.' },
          { v: (3 * E * V) / Xs / 1000, why: 'sinδ를 빠뜨렸어.', skip: d === 90 },
          { v: (3 * E * V * (d === 90 ? 0 : Math.cos((d * PI) / 180))) / Xs / 1000, why: 'sin 대신 cos을 썼어.' },
          { v: (Math.sqrt(3) * E * V * sd) / Xs / 1000, why: '3 대신 √3을 곱했어. 상전압으로 계산할 땐 3배야.' },
          { v: (3 * E * V * sd * Xs) / 1000, why: '동기리액턴스로 나눠야 하는데 곱했어.' },
        ].filter((x) => !x.skip),
        conclusion: 'P = 3 × ' + n(E) + ' × ' + n(V) + ' × sin ' + d + '° / ' + n(Xs) + ' = ' + q(P, 'kW'),
        steps: ['1상 출력 = EV sinδ / Xs = ' + n(E) + '×' + n(V) + '×' + n(sd) + ' ÷ ' + n(Xs) + ' = ' + n(P * 1000 / 3) + ' W.', '3상이니까 × 3 = ' + n(P * 1000) + ' W = ' + q(P, 'kW') + '.'],
        check: '최대 출력은 δ = 90°일 때 ' + n((3 * E * V) / Xs / 1000) + ' kW. 답은 이보다 크지 않아야 해. 맞아.',
        traps: ['비돌극형은 δ = 90°에서 최대, 돌극형은 90°보다 작은 각에서 최대야.'],
      };
    },
  });

  T({
    id: 'mc-sync-scr',
    concept: 'mc-sync',
    gen(r) {
      if (r.chance(0.5)) {
        const z = r.pick([50, 62.5, 80, 100, 125, 160, 200]);
        const Ks = 100 / z;
        return {
          params: { mode: 'z', z },
          text: '%동기임피던스가 ' + q(z, '%') + '인 동기발전기의 단락비는?',
          formula: 'Ks = 100 / %Zs',
          unit: '',
          decimals: 3,
          answer: Ks,
          distractors: [
            { v: z / 100, why: '뒤집었어. 단락비는 %Zs에 반비례해.' },
            { v: 1 / z, why: '100을 빠뜨렸어. %를 단위법으로 바꾸면 ' + n(z / 100) + '이야.' },
            { v: (100 / z) * Math.sqrt(3), why: '√3을 곱했어. 단락비에는 √3이 없어.' },
          ],
          conclusion: 'Ks = 100 / ' + n(z) + ' = ' + n(Ks, 3),
          steps: ['단락비는 단위법 동기임피던스의 역수: Ks = 1/Zs[pu] = 100/%Zs.', '100 ÷ ' + n(z) + ' = ' + n(Ks, 3) + '.'],
          check: n(Ks, 3) + ' × ' + n(z) + ' = 100. 맞아.',
          traps: ['수차 발전기(저속)는 단락비가 크고(0.9~1.2), 터빈 발전기(고속)는 작아(0.6~1.0).'],
        };
      }
      const If2 = r.pick([100, 120, 150, 200, 250]);
      const Ks = r.pick([0.6, 0.8, 1, 1.2, 1.5]);
      const If1 = If2 * Ks;
      return {
        params: { mode: 'if', If1, If2 },
        text: '어떤 동기발전기에서 무부하로 정격전압을 내는 데 필요한 계자전류가 ' + q(If1, 'A') + ', 3상 단락 시 정격전류를 흘리는 데 필요한 계자전류가 ' + q(If2, 'A') + '야. 단락비는?',
        formula: 'Ks = If(무부하 정격전압) / If(단락 정격전류)',
        unit: '',
        decimals: 3,
        answer: Ks,
        distractors: [
          { v: If2 / If1, why: '분자와 분모를 뒤집었어. 무부하 쪽 계자전류가 분자야.' },
          { v: (If1 / If2) * 100, why: '%로 바꿔 버렸어. 단락비는 그냥 비율(배수)이야.' },
          { v: If1 - If2 > 0 ? (If1 - If2) / If2 : (If2 - If1) / If2, why: '두 계자전류의 차이를 비율로 구했어.' },
        ],
        conclusion: 'Ks = ' + n(If1) + ' / ' + n(If2) + ' = ' + n(Ks, 3),
        steps: ['단락비 = 무부하 정격전압용 계자전류 ÷ 단락 정격전류용 계자전류.', n(If1) + ' ÷ ' + n(If2) + ' = ' + n(Ks, 3) + '.'],
        check: '%Zs = 100/Ks = ' + n(100 / Ks, 1) + '%. 단락비가 클수록 %Zs가 작아. 맞아.',
        traps: ['단락비가 크면 전압변동률이 작고 안정도가 좋아(대신 크고 무거워).'],
      };
    },
  });

  // ───────── 정류회로 ─────────
  const RECT = {
    h1: { name: '단상 반파', k: S2 / PI, approx: '0.45', src: '교류 전압(실효값)' },
    f1: { name: '단상 전파', k: (2 * S2) / PI, approx: '0.9', src: '교류 전압(실효값)' },
    h3: { name: '3상 반파', k: (3 * Math.sqrt(6)) / (2 * PI), approx: '1.17', src: '상전압(실효값)' },
    f3: { name: '3상 전파', k: (3 * S2) / PI, approx: '1.35', src: '선간전압(실효값)' },
  };
  T({
    id: 'mc-rect',
    concept: 'mc-rectifier',
    gen(r) {
      const type = r.pick(['h1', 'f1', 'h3', 'f3']);
      const E = r.pick([100, 200, 220, 380, 440]);
      const R = RECT[type];
      const Ed = R.k * E;
      const others = Object.keys(RECT).filter((k) => k !== type);
      return {
        params: { type, E },
        text: R.name + ' 정류회로(다이오드, 저항 부하)에 ' + R.src + ' ' + q(E, 'V') + '를 넣었어. 직류 출력 평균전압은 약 몇 V야?',
        formula: '단상 반파 0.45E, 단상 전파 0.9E, 3상 반파 1.17E, 3상 전파 1.35E',
        unit: 'V',
        decimals: 1,
        answer: Ed,
        distractors: others
          .map((k) => ({ v: RECT[k].k * E, why: RECT[k].name + '의 계수(' + RECT[k].approx + ')를 썼어. ' + R.name + '는 ' + R.approx + '이야.' }))
          .concat([
            { v: S2 * E, why: '최댓값(√2E)을 답했어. 평균전압은 그보다 작아.' },
            { v: E, why: '교류 실효값을 그대로 답했어.' },
          ]),
        conclusion: 'Ed ≈ ' + R.approx + ' × ' + n(E) + ' ≈ ' + q(Ed, 'V', 1),
        steps: [
          R.name + ' 정류의 평균전압 계수 ≈ ' + R.approx + (type === 'h1' ? ' (= √2/π).' : type === 'f1' ? ' (= 2√2/π).' : type === 'h3' ? ' (= 3√6/(2π)).' : ' (= 3√2/π).'),
          'Ed = ' + n(R.k, 4) + ' × ' + n(E) + ' ≈ ' + q(Ed, 'V', 1) + '.',
        ],
        check: '단상 전파는 반파의 정확히 2배여야 해: 0.9 = 2 × 0.45. 계수 표가 맞는지 이걸로 확인해.',
        traps: ['3상 반파는 상전압 기준, 3상 전파는 선간전압 기준이야.'],
      };
    },
  });
})(globalThis.GISA);
