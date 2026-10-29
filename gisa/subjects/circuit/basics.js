// 회로이론 기초 7개 개념의 문제 템플릿
// 각 템플릿 gen(rng)는 초안을 돌려주고, 숫자가 마음에 안 들면 null을 돌려 다시 뽑게 한다.
(function (G) {
  'use strict';
  const F = G.fmt;
  const n = F.num;
  const q = F.q;
  const T = G.defineTemplate;
  const S3 = F.SQRT3;

  const sumOf = (a) => a.reduce((x, y) => x + y, 0);
  const parOf = (a) => 1 / a.reduce((x, y) => x + 1 / y, 0);
  const rName = (i) => 'R' + '₁₂₃₄'[i];

  // ───────── 옴의 법칙 ─────────
  T({
    id: 'ohm-current',
    concept: 'ohm',
    gen(r) {
      const I = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]);
      const R = r.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50]);
      const V = I * R;
      if (V > 500 || !F.isNice(V, 0)) return null;
      return {
        params: { V, R },
        text: '저항 ' + q(R, 'Ω') + '에 ' + q(V, 'V') + '의 직류 전압을 걸었어. 저항에 흐르는 전류 I는?',
        svg: G.svg.series({ source: { kind: 'dc', label: q(V, 'V') }, parts: [{ type: 'R', label: q(R, 'Ω') }] }),
        formula: 'I = V / R',
        unit: 'A',
        answer: I,
        distractors: [
          { v: V * R, why: 'V와 R을 곱했어(' + n(V) + ' × ' + n(R) + '). 전류는 전압을 저항으로 "나눠야" 해.' },
          { v: R / V, why: '나누는 순서를 거꾸로 했어(R ÷ V). 저항이 클수록 전류는 작아져야 하니까 R이 분모에 가야 해.' },
          { v: (V * V) / R, why: 'V²/R은 전력(W) 공식이야. 전류가 아니라 전력을 구해 버렸어.' },
        ],
        conclusion: 'I = V/R = ' + n(V) + ' ÷ ' + n(R) + ' = ' + q(I, 'A'),
        steps: [
          '옴의 법칙 V = I × R을 전류에 대해 정리하면 I = V ÷ R이야.',
          '값 넣기: I = ' + n(V) + ' V ÷ ' + n(R) + ' Ω = ' + q(I, 'A') + '.',
        ],
        check: n(I) + ' A × ' + n(R) + ' Ω = ' + n(V) + ' V. 처음 걸어 준 전압과 같으니까 맞아.',
        traps: [
          '"저항이 크면 전류가 줄어든다"를 떠올리면 R이 분모라는 게 자연스럽게 나와.',
          'V-I-R 삼각형: V를 위, I와 R을 아래에 두고 구하려는 걸 손으로 가리면 남은 게 공식이야.',
        ],
      };
    },
  });

  T({
    id: 'ohm-voltage',
    concept: 'ohm',
    gen(r) {
      const I = r.pick([0.2, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 8, 10]);
      const R = r.pick([2, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100]);
      const V = I * R;
      if (!F.isNice(V, 0)) return null;
      return {
        params: { I, R },
        text: '저항 ' + q(R, 'Ω') + '에 전류 ' + q(I, 'A') + '가 흐르고 있어. 저항 양 끝에 걸린 전압 V는?',
        svg: G.svg.series({ source: { kind: 'dc', label: 'V = ?' }, parts: [{ type: 'R', label: q(R, 'Ω') }] }),
        formula: 'V = I × R',
        unit: 'V',
        answer: V,
        distractors: [
          { v: I / R, why: 'I를 R로 나눴어. 전압은 전류와 저항을 "곱한" 값이야.' },
          { v: R / I, why: 'R을 I로 나눴어. 이건 공식 어디에도 없는 계산이야. V = I × R을 다시 떠올려.' },
          { v: I * I * R, why: 'I²R은 전력(W) 공식이야. 전압이 아니라 전력을 구했어.' },
        ],
        conclusion: 'V = I × R = ' + n(I) + ' × ' + n(R) + ' = ' + q(V, 'V'),
        steps: ['옴의 법칙: V = I × R.', '값 넣기: V = ' + n(I) + ' A × ' + n(R) + ' Ω = ' + q(V, 'V') + '.'],
        check: n(V) + ' V ÷ ' + n(R) + ' Ω = ' + n(I) + ' A. 문제의 전류와 같아.',
        traps: ['전압은 "전류 × 저항". 전류가 같을 때 저항이 클수록 그 저항에 걸리는 전압이 커져.'],
      };
    },
  });

  T({
    id: 'ohm-resistance',
    concept: 'ohm',
    gen(r) {
      const V = r.pick([1.5, 3, 5, 6, 9, 10, 12, 15, 20, 24, 30, 48, 100]);
      const ImA = r.pick([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50]);
      const R = V / (ImA / 1000);
      if (!F.isNice(R, 0) || R < 50) return null;
      return {
        params: { V, ImA },
        text: '어떤 저항에 ' + q(V, 'V') + '를 걸었더니 ' + q(ImA, 'mA') + '의 전류가 흘렀어. 이 저항값은 몇 Ω이야?',
        svg: G.svg.series({ source: { kind: 'dc', label: q(V, 'V') }, parts: [{ type: 'R', label: 'R = ?' }] }),
        formula: 'R = V / I  (mA → A로 먼저 바꾸기)',
        unit: 'Ω',
        answer: R,
        distractors: [
          { v: V / ImA, why: 'mA 값을 A로 바꾸지 않고 그대로 넣었어. ' + n(ImA) + ' mA = ' + n(ImA / 1000) + ' A야.' },
          { v: V / (ImA * 1000), why: 'mA → A로 바꿀 때 1000으로 나눠야 하는데 1000을 곱해 버렸어.' },
          { v: V * ImA, why: 'V와 I를 곱했어. V × I는 전력 공식(P = VI)이야.' },
          { v: ImA / V, why: '전류를 전압으로 나눴어(I ÷ V). 저항은 전압 ÷ 전류야.' },
        ],
        conclusion: 'R = V/I = ' + n(V) + ' V ÷ ' + n(ImA / 1000) + ' A = ' + q(R, 'Ω') + (R >= 1000 ? ' (= ' + q(R / 1000, 'kΩ') + ')' : ''),
        steps: [
          '먼저 단위 맞추기: ' + n(ImA) + ' mA = ' + n(ImA) + ' ÷ 1000 = ' + n(ImA / 1000) + ' A.',
          '옴의 법칙을 저항에 대해 정리: R = V ÷ I.',
          'R = ' + n(V) + ' ÷ ' + n(ImA / 1000) + ' = ' + q(R, 'Ω') + '.',
        ],
        check: n(R) + ' Ω × ' + n(ImA / 1000) + ' A = ' + n(V) + ' V. 걸어 준 전압과 같아.',
        traps: [
          'mA, kΩ처럼 접두어가 붙으면 반드시 기본 단위로 바꾸고 계산해. 시험 오답 보기에 "단위 안 바꾼 값"이 꼭 들어 있어.',
          '작은 전류(mA)가 흐른다는 건 저항이 크다는 뜻이야. 답이 몇 Ω밖에 안 나오면 의심해 봐.',
        ],
      };
    },
  });

  // ───────── 직렬 회로 ─────────
  const R_SMALL = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];

  T({
    id: 'series-total',
    concept: 'series',
    gen(r) {
      const Rs = [r.pick(R_SMALL), r.pick(R_SMALL), r.pick(R_SMALL)];
      const Rt = sumOf(Rs);
      const list = Rs.map((x, i) => rName(i) + ' = ' + q(x, 'Ω')).join(', ');
      return {
        params: { Rs },
        text: list + '인 저항 세 개를 직렬로 연결했어. 합성저항은?',
        svg: G.svg.series({ source: { kind: 'dc', label: 'V' }, parts: Rs.map((x, i) => ({ type: 'R', label: rName(i) + ' ' + q(x, 'Ω') })) }),
        formula: 'R = R₁ + R₂ + R₃',
        unit: 'Ω',
        answer: Rt,
        distractors: [
          { v: parOf(Rs), why: '병렬 공식(역수의 합의 역수)으로 계산했어. 한 줄로 이어진 건 직렬이라 그냥 더해.' },
          { v: Rs.reduce((x, y) => x + 1 / y, 0), why: '역수(1/R)를 더했어. 그건 병렬 계산 중간값이고, 직렬은 저항값 자체를 더해.' },
          { v: Rs[0] + Rs[1], why: rName(2) + ' 하나를 빠뜨리고 두 개만 더했어. 직렬은 연결된 저항을 전부 더해야 해.' },
        ],
        conclusion: 'R = ' + Rs.map((x) => n(x)).join(' + ') + ' = ' + q(Rt, 'Ω'),
        steps: [
          '세 저항이 한 줄로 이어져 있으니 직렬이야. 전류가 지나갈 길이 하나뿐이지.',
          '직렬 합성저항은 전부 더해: R = ' + Rs.map((x) => n(x)).join(' + ') + ' = ' + q(Rt, 'Ω') + '.',
        ],
        check: '직렬 합성저항(' + n(Rt) + ' Ω)은 가장 큰 저항(' + n(Math.max.apply(null, Rs)) + ' Ω)보다 커야 해. 맞지.',
        traps: ['직렬 = 그냥 더하기, 병렬 = 역수 더해서 다시 뒤집기. 이 둘을 바꿔 쓰는 실수가 가장 흔해.'],
      };
    },
  });

  T({
    id: 'series-current',
    concept: 'series',
    gen(r) {
      const k = r.pick([2, 3]);
      const Rs = [];
      for (let i = 0; i < k; i++) Rs.push(r.pick(R_SMALL));
      const I = r.pick([0.5, 1, 2, 2.5, 3, 4, 5]);
      const Rt = sumOf(Rs);
      const V = I * Rt;
      if (V > 600 || !F.isNice(V, 0)) return null;
      const list = Rs.map((x, i) => rName(i) + ' = ' + q(x, 'Ω')).join(', ');
      return {
        params: { V, Rs },
        text: list + '인 저항을 직렬로 연결하고 ' + q(V, 'V') + ' 전원을 걸었어. 회로에 흐르는 전류는?',
        svg: G.svg.series({ source: { kind: 'dc', label: q(V, 'V') }, parts: Rs.map((x, i) => ({ type: 'R', label: rName(i) + ' ' + q(x, 'Ω') })) }),
        formula: 'I = V / (R₁ + R₂ + …)',
        unit: 'A',
        answer: I,
        distractors: [
          { v: V / parOf(Rs), why: '저항을 병렬로 착각해서 합성저항을 작게 잡았어. 한 줄로 이어졌으니 직렬이야.' },
          { v: V / Rs[0], why: rName(0) + ' 하나만 보고 계산했어. 직렬이면 전원은 모든 저항을 합친 값을 상대해.' },
          { v: Rt / V, why: '합성저항을 전압으로 나눴어(R ÷ V). 전류는 V ÷ R이야.' },
          { v: V * Rt, why: '전압과 합성저항을 곱했어. 전류는 나눠서 구해.' },
        ],
        conclusion: 'I = V/(합성저항) = ' + n(V) + ' ÷ ' + n(Rt) + ' = ' + q(I, 'A'),
        steps: [
          '직렬이니까 합성저항부터: R = ' + Rs.map((x) => n(x)).join(' + ') + ' = ' + q(Rt, 'Ω') + '.',
          '옴의 법칙: I = V ÷ R = ' + n(V) + ' ÷ ' + n(Rt) + ' = ' + q(I, 'A') + '.',
          '직렬이라 이 전류가 모든 저항에 똑같이 흘러.',
        ],
        check: '각 저항 전압의 합: ' + Rs.map((x) => n(I * x)).join(' + ') + ' = ' + n(V) + ' V. 전원 전압과 같아.',
        traps: ['직렬 회로의 전류는 어디서 재도 같아. 저항마다 다른 건 전압이야.'],
      };
    },
  });

  // ───────── 병렬 회로 ─────────
  const R_PAR = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 60];

  T({
    id: 'parallel-two',
    concept: 'parallel',
    gen(r) {
      const R1 = r.pick(R_PAR);
      const R2 = r.pick(R_PAR);
      const Rt = (R1 * R2) / (R1 + R2);
      if (!F.isNice(Rt, 1)) return null;
      return {
        params: { R1, R2 },
        text: 'R₁ = ' + q(R1, 'Ω') + ', R₂ = ' + q(R2, 'Ω') + '인 저항 두 개를 병렬로 연결했어. 합성저항은?',
        svg: G.svg.parallel({
          source: { kind: 'dc', label: 'V' },
          branches: [{ type: 'R', label: 'R₁ ' + q(R1, 'Ω') }, { type: 'R', label: 'R₂ ' + q(R2, 'Ω') }],
        }),
        formula: 'R = R₁R₂ / (R₁ + R₂)  (곱 나누기 합)',
        unit: 'Ω',
        answer: Rt,
        distractors: [
          { v: R1 + R2, why: '그냥 더했어. 그건 직렬 공식이야. 나란히 붙은 병렬은 합성저항이 오히려 작아져.' },
          { v: (R1 + R2) / (R1 * R2), why: '1/R₁ + 1/R₂까지만 계산하고 다시 뒤집지 않았어. 병렬은 역수 합을 한 번 더 뒤집어야 해.' },
          { v: (R1 + R2) / 2, why: '두 저항의 평균을 냈어. 병렬 합성저항은 평균이 아니라 작은 저항보다도 작아.' },
          { v: R1 * R2, why: '곱만 하고 합으로 나누지 않았어. "곱 나누기 합"이야.' },
        ],
        conclusion: 'R = R₁R₂/(R₁+R₂) = ' + n(R1 * R2) + ' ÷ ' + n(R1 + R2) + ' = ' + q(Rt, 'Ω'),
        steps: [
          '나란히 연결됐으니 병렬이야. 두 개일 때는 "곱 나누기 합" 공식을 써.',
          '곱: ' + n(R1) + ' × ' + n(R2) + ' = ' + n(R1 * R2) + ', 합: ' + n(R1) + ' + ' + n(R2) + ' = ' + n(R1 + R2) + '.',
          'R = ' + n(R1 * R2) + ' ÷ ' + n(R1 + R2) + ' = ' + q(Rt, 'Ω') + '.',
        ],
        check: '역수로 확인: 1/' + n(R1) + ' + 1/' + n(R2) + ' = ' + n(1 / R1 + 1 / R2, 4) + ' → 뒤집으면 ' + n(Rt) + ' Ω. 작은 저항(' + n(Math.min(R1, R2)) + ' Ω)보다 작으니까 맞아.',
        traps: [
          '"곱 나누기 합"은 저항이 딱 두 개일 때만 쓸 수 있어.',
          '같은 저항 두 개를 병렬로 하면 절반이 돼(예: 10 Ω ∥ 10 Ω = 5 Ω).',
        ],
      };
    },
  });

  T({
    id: 'parallel-three',
    concept: 'parallel',
    gen(r) {
      const Rs = [r.pick(R_PAR), r.pick(R_PAR), r.pick(R_PAR)];
      const Rt = parOf(Rs);
      if (!F.isNice(Rt, 1)) return null;
      const prod = Rs[0] * Rs[1] * Rs[2];
      const recip = Rs.reduce((x, y) => x + 1 / y, 0);
      return {
        params: { Rs },
        text: Rs.map((x, i) => rName(i) + ' = ' + q(x, 'Ω')).join(', ') + '인 저항 세 개를 모두 병렬로 연결했어. 합성저항은?',
        svg: G.svg.parallel({ source: { kind: 'dc', label: 'V' }, branches: Rs.map((x, i) => ({ type: 'R', label: rName(i) + ' ' + q(x, 'Ω') })) }),
        formula: '1/R = 1/R₁ + 1/R₂ + 1/R₃',
        unit: 'Ω',
        answer: Rt,
        distractors: [
          { v: sumOf(Rs), why: '전부 더했어. 그건 직렬이야. 병렬은 역수를 더해.' },
          { v: recip, why: '역수의 합(1/R₁ + 1/R₂ + 1/R₃)까지만 하고 다시 뒤집지 않았어.' },
          { v: prod / sumOf(Rs), why: '"곱 나누기 합"을 세 개에 그대로 썼어. 그 공식은 저항이 두 개일 때만 맞아.' },
        ],
        conclusion: '1/R = ' + Rs.map((x) => '1/' + n(x)).join(' + ') + ' → R = ' + q(Rt, 'Ω'),
        steps: [
          '세 개 병렬이니까 역수로 계산해: 1/R = ' + Rs.map((x) => '1/' + n(x)).join(' + ') + '.',
          '더하면 1/R = ' + n(recip, 4) + '.',
          '뒤집기: R = 1 ÷ ' + n(recip, 4) + ' = ' + q(Rt, 'Ω') + '.',
        ],
        check: '두 단계로 나눠도 같아: 먼저 두 개를 합치고 그 결과를 세 번째와 다시 "곱 나누기 합" → ' + n(Rt) + ' Ω.',
        traps: ['저항 세 개 이상의 병렬은 "역수 더하기 → 뒤집기" 또는 두 개씩 차례로 합쳐야 해.'],
      };
    },
  });

  T({
    id: 'parallel-current',
    concept: 'parallel',
    gen(r) {
      const R1 = r.pick(R_PAR);
      const R2 = r.pick(R_PAR);
      const V = r.pick([6, 12, 24, 30, 48, 60, 100, 120]);
      const I1 = V / R1;
      const I2 = V / R2;
      if (!F.isNice(I1, 2) || !F.isNice(I2, 2)) return null;
      const I = I1 + I2;
      const Rt = (R1 * R2) / (R1 + R2);
      return {
        params: { V, R1, R2 },
        text: q(V, 'V') + ' 전원에 R₁ = ' + q(R1, 'Ω') + ', R₂ = ' + q(R2, 'Ω') + '인 저항 두 개를 병렬로 연결했어. 전원에서 나오는 전체 전류 I는?',
        svg: G.svg.parallel({
          source: { kind: 'dc', label: q(V, 'V') },
          branches: [{ type: 'R', label: 'R₁ ' + q(R1, 'Ω') }, { type: 'R', label: 'R₂ ' + q(R2, 'Ω') }],
          currentLabel: 'I',
        }),
        formula: 'I = V/R₁ + V/R₂  (병렬은 각 갈래 전압이 V로 같음)',
        unit: 'A',
        answer: I,
        distractors: [
          { v: V / (R1 + R2), why: '두 저항을 더해서 나눴어. 그건 직렬일 때 전류야.' },
          { v: I1, why: 'R₁ 갈래 전류만 구했어. 전체 전류는 두 갈래 전류를 더한 값이야.' },
          { v: V * Rt, why: '전압에 합성저항을 곱했어. 전류는 전압 ÷ 저항이야.' },
          { v: I2, why: 'R₂ 갈래 전류만 구했어. 두 갈래를 더해야 해.' },
        ],
        conclusion: 'I = ' + n(V) + '/' + n(R1) + ' + ' + n(V) + '/' + n(R2) + ' = ' + n(I1) + ' + ' + n(I2) + ' = ' + q(I, 'A'),
        steps: [
          '병렬이라 두 저항 모두 전원 전압 ' + q(V, 'V') + '를 그대로 받아.',
          'R₁ 갈래: ' + n(V) + ' ÷ ' + n(R1) + ' = ' + q(I1, 'A') + ', R₂ 갈래: ' + n(V) + ' ÷ ' + n(R2) + ' = ' + q(I2, 'A') + '.',
          '전체 전류 = 갈래 전류의 합 = ' + q(I, 'A') + '.',
        ],
        check: '합성저항 ' + n(Rt) + ' Ω으로 구해도 ' + n(V) + ' ÷ ' + n(Rt) + ' = ' + n(I) + ' A. 같아.',
        traps: ['병렬: 전압은 같고 전류는 나뉘어. 직렬: 전류는 같고 전압이 나뉘어. 이 대칭을 기억해.'],
      };
    },
  });

  // ───────── 전압 분배 ─────────
  T({
    id: 'divider-two',
    concept: 'divider',
    gen(r) {
      const R1 = r.pick(R_SMALL);
      const R2 = r.pick(R_SMALL);
      if (R1 === R2) return null;
      const I = r.pick([0.5, 1, 2, 2.5, 3, 4, 5]);
      const V = I * (R1 + R2);
      if (V > 400 || !F.isNice(V, 0)) return null;
      const V2 = I * R2;
      const V1 = I * R1;
      return {
        params: { V, R1, R2 },
        text: 'R₁ = ' + q(R1, 'Ω') + ', R₂ = ' + q(R2, 'Ω') + '인 저항 두 개를 직렬로 연결하고 ' + q(V, 'V') + '를 걸었어. R₂ 양 끝 전압 V₂는?',
        svg: G.svg.series({
          source: { kind: 'dc', label: q(V, 'V') },
          parts: [{ type: 'R', label: 'R₁ ' + q(R1, 'Ω') }, { type: 'R', label: 'R₂ ' + q(R2, 'Ω'), mark: 'V₂ = ?' }],
        }),
        formula: 'V₂ = V × R₂ / (R₁ + R₂)',
        unit: 'V',
        answer: V2,
        distractors: [
          { v: V1, why: '분자에 R₁을 넣었어. 그건 R₁에 걸리는 전압 V₁이야. 구하는 저항(R₂)이 분자에 와.' },
          { v: V / 2, why: '반반 나눈다고 생각했어. 저항이 다르면 큰 저항이 더 많이 가져가.' },
          { v: (V * R2) / R1, why: '합(R₁ + R₂) 대신 R₁로만 나눴어. 분모는 전체 저항이야.' },
          { v: V, why: '전체 전압을 그대로 답했어. 직렬이면 전압이 저항들에 나뉘어.' },
        ],
        conclusion: 'V₂ = ' + n(V) + ' × ' + n(R2) + '/(' + n(R1) + ' + ' + n(R2) + ') = ' + q(V2, 'V'),
        steps: [
          '직렬이니까 전압을 저항 비율대로 나눠 가져.',
          'R₂의 몫 = R₂/(R₁ + R₂) = ' + n(R2) + '/' + n(R1 + R2) + '.',
          'V₂ = ' + n(V) + ' × ' + n(R2) + '/' + n(R1 + R2) + ' = ' + q(V2, 'V') + '.',
        ],
        check: '전류로 확인: I = ' + n(V) + ' ÷ ' + n(R1 + R2) + ' = ' + n(I) + ' A, V₂ = ' + n(I) + ' × ' + n(R2) + ' = ' + n(V2) + ' V. 그리고 V₁ + V₂ = ' + n(V1) + ' + ' + n(V2) + ' = ' + n(V) + ' V.',
        traps: ['나눠 가진 전압을 다 더하면 전원 전압이 돼야 해. 이걸로 검산하면 실수를 거의 다 잡아.'],
      };
    },
  });

  T({
    id: 'divider-three',
    concept: 'divider',
    gen(r) {
      const Rs = [r.pick(R_SMALL), r.pick(R_SMALL), r.pick(R_SMALL)];
      const I = r.pick([0.5, 1, 2, 2.5, 4, 5]);
      const Rt = sumOf(Rs);
      const V = I * Rt;
      if (V > 600 || !F.isNice(V, 0)) return null;
      const V2 = I * Rs[1];
      return {
        params: { V, Rs },
        text: Rs.map((x, i) => rName(i) + ' = ' + q(x, 'Ω')).join(', ') + '인 저항 세 개를 직렬로 연결하고 ' + q(V, 'V') + '를 걸었어. R₂에 걸리는 전압은?',
        svg: G.svg.series({
          source: { kind: 'dc', label: q(V, 'V') },
          parts: Rs.map((x, i) => ({ type: 'R', label: rName(i) + ' ' + q(x, 'Ω'), mark: i === 1 ? 'V₂ = ?' : '' })),
        }),
        formula: 'V₂ = V × R₂ / (R₁ + R₂ + R₃)',
        unit: 'V',
        answer: V2,
        distractors: [
          { v: (V * Rs[1]) / (Rs[0] + Rs[1]), why: '분모에서 R₃를 빠뜨렸어. 분모는 직렬로 연결된 전체 저항이야.' },
          { v: V / 3, why: '세 저항이 똑같이 나눠 갖는다고 생각했어. 전압은 저항 크기에 비례해서 나뉘어.' },
          { v: V - V2, why: 'R₂를 뺀 나머지 두 저항(R₁, R₃)의 전압 합을 구했어.' },
        ],
        conclusion: 'V₂ = ' + n(V) + ' × ' + n(Rs[1]) + '/' + n(Rt) + ' = ' + q(V2, 'V'),
        steps: [
          '전체 저항: ' + Rs.map((x) => n(x)).join(' + ') + ' = ' + q(Rt, 'Ω') + '.',
          'R₂의 몫 = ' + n(Rs[1]) + '/' + n(Rt) + '.',
          'V₂ = ' + n(V) + ' × ' + n(Rs[1]) + '/' + n(Rt) + ' = ' + q(V2, 'V') + '.',
        ],
        check: '전류 I = ' + n(V) + ' ÷ ' + n(Rt) + ' = ' + n(I) + ' A, 각 전압 ' + Rs.map((x) => n(I * x)).join(' + ') + ' = ' + n(V) + ' V.',
        traps: ['저항이 몇 개든 분모는 "직렬 전체 저항", 분자는 "구하는 저항"이야.'],
      };
    },
  });

  // ───────── 전력 ─────────
  T({
    id: 'power-i2r',
    concept: 'power',
    gen(r) {
      const I = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 10]);
      const R = r.pick([2, 4, 5, 8, 10, 12, 20, 25, 50, 100]);
      const P = I * I * R;
      if (!F.isNice(P, 1) || P > 5000) return null;
      return {
        params: { I, R },
        text: '저항 ' + q(R, 'Ω') + '에 전류 ' + q(I, 'A') + '가 흘러. 이 저항에서 소비되는 전력은?',
        svg: G.svg.series({ source: { kind: 'dc', label: 'I = ' + q(I, 'A') }, parts: [{ type: 'R', label: q(R, 'Ω') }] }),
        formula: 'P = I²R',
        unit: 'W',
        answer: P,
        distractors: [
          { v: I * R, why: '제곱을 빠뜨렸어. I × R은 전압(V)이야. 전력은 I² × R.' },
          { v: (I * R) * (I * R), why: 'R까지 제곱했어. 제곱은 전류에만 붙어: P = I² × R.' },
          { v: (I * I) / R, why: 'I²를 R로 나눴어. 저항은 곱해야 해.' },
        ],
        conclusion: 'P = I²R = ' + n(I) + '² × ' + n(R) + ' = ' + q(P, 'W'),
        steps: [
          '전류와 저항이 주어졌으니 P = I²R을 골라.',
          'I² = ' + n(I) + ' × ' + n(I) + ' = ' + n(I * I) + '.',
          'P = ' + n(I * I) + ' × ' + n(R) + ' = ' + q(P, 'W') + '.',
        ],
        check: 'V = IR = ' + n(I * R) + ' V이고 P = VI = ' + n(I * R) + ' × ' + n(I) + ' = ' + n(P) + ' W. 같아.',
        traps: ['주어진 두 값으로 바로 쓸 수 있는 식을 골라: (I, R) → I²R, (V, R) → V²/R, (V, I) → VI.'],
      };
    },
  });

  T({
    id: 'power-v2r',
    concept: 'power',
    gen(r) {
      const V = r.pick([6, 10, 12, 20, 24, 30, 50, 100, 110, 200, 220]);
      const R = r.pick([2, 4, 5, 10, 20, 25, 40, 50, 100, 200]);
      const P = (V * V) / R;
      if (!F.isNice(P, 1) || P > 20000) return null;
      return {
        params: { V, R },
        text: '저항 ' + q(R, 'Ω') + '에 ' + q(V, 'V') + '를 걸었어. 소비전력은?',
        svg: G.svg.series({ source: { kind: 'dc', label: q(V, 'V') }, parts: [{ type: 'R', label: q(R, 'Ω') }] }),
        formula: 'P = V²/R',
        unit: 'W',
        answer: P,
        distractors: [
          { v: V / R, why: '제곱을 빠뜨렸어. V/R은 전류(A)야.' },
          { v: V * V * R, why: '나눠야 할 R을 곱했어. 저항이 크면 같은 전압에서 전력은 작아져.' },
          { v: (V * V) / (R * R), why: 'R까지 제곱했어. 제곱은 전압에만 붙어.' },
        ],
        conclusion: 'P = V²/R = ' + n(V) + '² ÷ ' + n(R) + ' = ' + q(P, 'W'),
        steps: ['전압과 저항이 주어졌으니 P = V²/R.', 'V² = ' + n(V * V) + '.', 'P = ' + n(V * V) + ' ÷ ' + n(R) + ' = ' + q(P, 'W') + '.'],
        check: 'I = V/R = ' + n(V / R) + ' A, P = VI = ' + n(V) + ' × ' + n(V / R) + ' = ' + n(P) + ' W.',
        traps: ['전압이 일정한 회로(콘센트처럼)에서는 저항이 작을수록 전력이 커. 그래서 전열기는 저항이 작아.'],
      };
    },
  });

  T({
    id: 'power-ratio',
    concept: 'power',
    gen(r) {
      const mode = r.pick(['V', 'I', 'R-constV', 'R-constI']);
      const k = r.pick([2, 3, 4, 5, 10]);
      const label = (v) => F.ratio(v) + '배';
      let text;
      let ans;
      let ds;
      let steps;
      let check;
      if (mode === 'V' || mode === 'I') {
        const what = mode === 'V' ? '전압' : '전류';
        const f = mode === 'V' ? 'P = V²/R' : 'P = I²R';
        text = '같은 저항에 걸리는 ' + what + '을 ' + k + '배로 하면 소비전력은 몇 배가 될까?';
        ans = k * k;
        ds = [
          { v: k, why: '전력이 ' + what + '에 그냥 비례한다고 생각했어. ' + f + '라서 제곱으로 늘어나.' },
          { v: 2 * k, why: '제곱을 "2를 곱한다"로 착각했어. ' + k + '의 제곱은 ' + k + ' × ' + k + '야.' },
          { v: 1 / (k * k), why: '반비례로 착각했어. ' + what + '이 커지면 전력도 커져.' },
          { v: 1 / k, why: '반비례에다 제곱까지 빠뜨렸어.' },
        ];
        steps = ['저항이 그대로니까 ' + f + '를 써.', what + '이 ' + k + '배면 ' + (mode === 'V' ? 'V²' : 'I²') + '은 ' + k + '² = ' + k * k + '배.', '그래서 전력은 ' + k * k + '배.'];
        check = '숫자로 확인: R = 1, ' + what + ' 1 → 전력 1. ' + what + ' ' + k + ' → 전력 ' + k * k + '.';
      } else if (mode === 'R-constV') {
        text = '전압은 그대로 두고 저항만 ' + k + '배로 바꾸면 소비전력은 몇 배가 될까?';
        ans = 1 / k;
        ds = [
          { v: k, why: 'P = I²R을 썼는데, 저항이 바뀌면 전류도 바뀌어서 그 식은 바로 못 써. 전압이 일정하면 P = V²/R.' },
          { v: 1 / (k * k), why: 'R까지 제곱했어. P = V²/R에서 제곱은 V에만 붙어.' },
          { v: k * k, why: '전력이 저항의 제곱에 비례한다고 착각했어.' },
        ];
        steps = ['전압이 일정하니까 P = V²/R을 써.', 'V는 그대로, R이 ' + k + '배 → P는 1/' + k + '배.'];
        check = '전류로 확인: R이 ' + k + '배면 I는 1/' + k + '배, P = VI도 1/' + k + '배.';
      } else {
        text = '전류는 그대로 유지하면서 저항만 ' + k + '배로 바꾸면 소비전력은 몇 배가 될까?';
        ans = k;
        ds = [
          { v: 1 / k, why: 'P = V²/R을 썼는데, 전류가 일정하면 전압이 바뀌어. 전류가 일정할 땐 P = I²R.' },
          { v: k * k, why: 'R을 제곱했어. P = I²R에서 제곱은 I에만 붙어.' },
          { v: 1 / (k * k), why: '반비례에 제곱까지 붙였어. 전류가 일정하면 전력은 R에 그냥 비례해.' },
        ];
        steps = ['전류가 일정하니까 P = I²R을 써.', 'I는 그대로, R이 ' + k + '배 → P도 ' + k + '배.'];
        check = '전압으로 확인: V = IR도 ' + k + '배, P = VI = ' + k + '배.';
      }
      return {
        params: { mode, k },
        text,
        formula: 'P = VI = I²R = V²/R (변하지 않는 값이 들어간 식을 골라)',
        unit: '배',
        label,
        answer: ans,
        distractors: ds,
        conclusion: '소비전력은 ' + label(ans) + '로 바뀌어.',
        steps,
        check,
        traps: ['"무엇이 일정한가"를 먼저 확인해. 전압 일정 → V²/R, 전류 일정 → I²R.'],
      };
    },
  });

  // ───────── 전력량·요금 ─────────
  const P_LIST = [40, 50, 60, 100, 200, 400, 500, 800, 1000, 1200, 1500, 2000, 2500, 3000];

  T({
    id: 'energy-kwh',
    concept: 'energy',
    gen(r) {
      const P = r.pick(P_LIST);
      const h = r.pick([0.5, 2, 3, 4, 5, 6, 8, 10]);
      const days = r.pick([5, 10, 15, 20, 30]);
      const E = (P * h * days) / 1000;
      if (!F.isNice(E, 2)) return null;
      return {
        params: { P, h, days },
        text: q(P, 'W') + ' 전기기기를 하루에 ' + n(h) + '시간씩 ' + days + '일 동안 썼어. 사용한 전력량은 몇 kWh야?',
        formula: '전력량[kWh] = P[kW] × 하루 사용시간[h] × 일수',
        unit: 'kWh',
        answer: E,
        distractors: [
          { v: P * h * days, why: 'W를 kW로 바꾸지 않았어. ' + n(P) + ' W = ' + n(P / 1000) + ' kW야. 이 값은 Wh 단위야.' },
          { v: (P * h) / 1000, why: '하루치만 계산했어. ' + days + '일을 곱해야 해.' },
          { v: (P * h * days * 3600) / 1000, why: '시간을 초로 바꿔 3600을 곱했어. kWh는 시간(h) 단위 그대로 써.' },
          { v: (P * days) / 1000, why: '하루 사용 시간(' + n(h) + '시간)을 빠뜨렸어.' },
        ],
        conclusion: n(P / 1000) + ' kW × ' + n(h) + ' h × ' + days + '일 = ' + q(E, 'kWh'),
        steps: [
          'W → kW: ' + n(P) + ' ÷ 1000 = ' + n(P / 1000) + ' kW.',
          '하루 전력량: ' + n(P / 1000) + ' × ' + n(h) + ' = ' + n((P * h) / 1000) + ' kWh.',
          days + '일치: ' + n((P * h) / 1000) + ' × ' + days + ' = ' + q(E, 'kWh') + '.',
        ],
        check: 'Wh로 계산해도: ' + n(P) + ' × ' + n(h) + ' × ' + days + ' = ' + n(P * h * days) + ' Wh = ' + n(E) + ' kWh.',
        traps: ['전력(W)과 전력량(Wh, kWh)은 다른 거야. 전력량에는 "시간"이 반드시 곱해져 있어.'],
      };
    },
  });

  T({
    id: 'energy-cost',
    concept: 'energy',
    gen(r) {
      const P = r.pick(P_LIST);
      const h = r.pick([1, 2, 3, 4, 5, 6, 8]);
      const days = r.pick([10, 20, 30]);
      const price = r.pick([100, 120, 150, 200, 250]);
      const E = (P * h * days) / 1000;
      const cost = E * price;
      if (!F.isNice(E, 2) || !F.isNice(cost, 0) || h === 1) return null;
      return {
        params: { P, h, days, price },
        text:
          q(P, 'W') + ' 기기를 하루 ' + h + '시간씩 ' + days + '일 썼어. 1 kWh당 요금이 ' + n(price) +
          '원으로 일정하다고 할 때 전기요금은? (기본요금·누진제는 생각하지 마)',
        formula: '요금 = P[kW] × 시간[h] × 일수 × 단가[원/kWh]',
        unit: '원',
        decimals: 0,
        answer: cost,
        distractors: [
          { v: P * h * days * price, why: 'W를 kW로 바꾸지 않아서 1000배가 됐어.' },
          { v: ((P * h) / 1000) * price, why: '하루치 요금만 구했어. ' + days + '일을 곱해야 해.' },
          { v: ((P * days) / 1000) * price, why: '하루 사용시간(' + h + '시간)을 곱하지 않았어.' },
          { v: (P / 1000) * price, why: '전력(kW)에 단가를 곱했어. 요금은 전력량(kWh)으로 매겨.' },
        ],
        conclusion: '전력량 ' + q(E, 'kWh') + ' × ' + n(price) + '원 = ' + q(cost, '원', 0),
        steps: [
          '전력량부터: ' + n(P / 1000) + ' kW × ' + h + ' h × ' + days + '일 = ' + q(E, 'kWh') + '.',
          '요금 = ' + n(E) + ' × ' + n(price) + ' = ' + q(cost, '원', 0) + '.',
        ],
        check: '하루 요금 ' + n(((P * h) / 1000) * price, 0) + '원 × ' + days + '일 = ' + n(cost, 0) + '원.',
        traps: [
          '요금은 전력(kW)이 아니라 전력량(kWh)에 단가를 곱해.',
          '실제 가정용 요금은 기본요금과 누진 구간이 있지만, 문제에서 "단가 일정"이라고 하면 그대로 곱하면 돼.',
        ],
      };
    },
  });

  T({
    id: 'energy-joule',
    concept: 'energy',
    gen(r) {
      const W = r.pick([0.5, 1, 2, 2.5, 4, 5, 10, 20, 50]);
      const MJ = 3.6 * W;
      return {
        params: { W },
        text: q(W, 'kWh') + '의 전력량을 열량으로 바꾸면 몇 MJ(메가줄)이야?',
        formula: '1 kWh = 1000 W × 3600 s = 3.6 × 10⁶ J = 3.6 MJ',
        unit: 'MJ',
        answer: MJ,
        distractors: [
          { v: 3600 * W, why: '1 kWh = 3600 kJ인데 kJ를 MJ로 착각했어. 3600 kJ = 3.6 MJ야.' },
          { v: 0.06 * W, why: '1시간을 60초로 계산했어. 1시간 = 3600초야.' },
          { v: 0.0036 * W, why: 'k(1000배)를 빠뜨리고 Wh로 계산했어.' },
        ],
        conclusion: n(W) + ' kWh × 3.6 MJ/kWh = ' + q(MJ, 'MJ'),
        steps: [
          '1 kWh = 1000 W로 1시간(3600초) 쓴 에너지 = 1000 × 3600 = 3,600,000 J = 3.6 MJ.',
          n(W) + ' kWh = ' + n(W) + ' × 3.6 = ' + q(MJ, 'MJ') + '.',
        ],
        check: '거꾸로: ' + n(MJ) + ' MJ ÷ 3.6 = ' + n(W) + ' kWh.',
        traps: ['J(줄) = W × 초(s). kWh = kW × 시간(h). 시간 단위가 다르다는 게 핵심이야.'],
      };
    },
  });

  // ───────── 3상 전력 ─────────
  T({
    id: 'tp-power',
    concept: 'three-phase',
    gen(r) {
      const V = r.pick([200, 220, 380, 400, 440, 3300, 6600]);
      const I = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 100]);
      const pf = r.pick([0.6, 0.7, 0.8, 0.9]);
      const PkW = (S3 * V * I * pf) / 1000;
      const sin = Math.sqrt(1 - pf * pf);
      const dec = PkW >= 100 ? 1 : 2;
      return {
        params: { V, I, pf },
        text: '선간전압 ' + q(V, 'V') + ', 선전류 ' + q(I, 'A') + ', 역률 ' + n(pf) + '인 3상 평형 부하의 소비전력(유효전력)은 약 몇 kW야?',
        formula: 'P = √3 × V × I × cosθ',
        unit: 'kW',
        decimals: dec,
        answer: PkW,
        distractors: [
          { v: (V * I * pf) / 1000, why: '√3을 빠뜨렸어. 그건 단상 전력 공식이야.' },
          { v: (3 * V * I * pf) / 1000, why: '√3 대신 3을 곱했어. 선간전압·선전류로 계산할 땐 √3이야(3은 상전압·상전류일 때).' },
          { v: (S3 * V * I) / 1000, why: '역률을 빠뜨렸어. 그건 피상전력(kVA)이야.' },
          { v: (S3 * V * I * sin) / 1000, why: 'cosθ 대신 sinθ(' + n(sin) + ')를 곱했어. 그건 무효전력이야.' },
        ],
        conclusion: 'P = √3 × ' + n(V) + ' × ' + n(I) + ' × ' + n(pf) + ' ≈ ' + q(PkW, 'kW', dec),
        steps: [
          '3상 유효전력: P = √3 × 선간전압 × 선전류 × 역률.',
          '√3 × ' + n(V) + ' × ' + n(I) + ' = ' + n(S3 * V * I, 1) + ' VA (피상전력).',
          '역률을 곱하면 ' + n(S3 * V * I, 1) + ' × ' + n(pf) + ' = ' + n(PkW * 1000, 1) + ' W ≈ ' + q(PkW, 'kW', dec) + '.',
        ],
        check: '한 상씩 보면(Y 기준): 상전압 ' + n(V / S3, 1) + ' V × ' + n(I) + ' A × ' + n(pf) + ' × 3상 = ' + n(PkW * 1000, 1) + ' W. 같아.',
        traps: ['√3 ≈ 1.732. "√3 빠뜨림"과 "3을 곱함"이 단골 오답이야.', '역률을 곱하기 전 값(√3VI)은 피상전력 [VA]야.'],
      };
    },
  });

  T({
    id: 'tp-current',
    concept: 'three-phase',
    gen(r) {
      const PkW = r.pick([10, 15, 20, 30, 50, 60, 100]);
      const V = r.pick([380, 400, 440, 3300, 6600]);
      const pf = r.pick([0.8, 0.9]);
      const I = (PkW * 1000) / (S3 * V * pf);
      const dec = I >= 10 ? 1 : 2;
      return {
        params: { PkW, V, pf },
        text: '선간전압 ' + q(V, 'V') + ', 역률 ' + n(pf) + '로 ' + q(PkW, 'kW') + '를 소비하는 3상 평형 부하가 있어. 선전류는 약 몇 A야?',
        formula: 'I = P / (√3 × V × cosθ)',
        unit: 'A',
        decimals: dec,
        answer: I,
        distractors: [
          { v: (PkW * 1000) / (V * pf), why: '√3을 빠뜨렸어. 단상 공식으로 계산한 값이야.' },
          { v: (PkW * 1000) / (S3 * V), why: '역률로 나누는 걸 빠뜨렸어.' },
          { v: (PkW * 1000 * pf) / (S3 * V), why: '역률을 나눠야 하는데 곱했어. 역률이 낮을수록 같은 전력에 전류는 더 커져.' },
          { v: (PkW * 1000) / (3 * V * pf), why: '√3 대신 3으로 나눴어.' },
        ],
        conclusion: 'I = ' + n(PkW * 1000) + ' ÷ (√3 × ' + n(V) + ' × ' + n(pf) + ') ≈ ' + q(I, 'A', dec),
        steps: [
          'P = √3 V I cosθ를 I에 대해 정리: I = P ÷ (√3 V cosθ).',
          '분모: √3 × ' + n(V) + ' × ' + n(pf) + ' = ' + n(S3 * V * pf, 1) + '.',
          'I = ' + n(PkW * 1000) + ' ÷ ' + n(S3 * V * pf, 1) + ' ≈ ' + q(I, 'A', dec) + '.',
        ],
        check: '다시 넣기: √3 × ' + n(V) + ' × ' + n(I, dec) + ' × ' + n(pf) + ' ≈ ' + n((S3 * V * I * pf) / 1000, 1) + ' kW.',
        traps: ['kW는 W로(×1000) 바꾸고 계산해.', '역률이 나빠지면(작아지면) 같은 일을 하는 데 전류가 더 많이 필요해.'],
      };
    },
  });
})(globalThis.GISA);
