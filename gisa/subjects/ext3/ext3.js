// 기출에서 개념이 비어 있던 주제 보강 3차: 4단자망, 전송선로, 대칭좌표, 비정현파, 정상편차, 주파수응답(dB),
// 유전체 경계, 철손, 동기발전기 출력, 보호계전기, 서지, 배전 전선량. 오리지널 문제, 정답은 코드로 계산.
(function (G) {
  'use strict';
  const F = G.fmt;
  const n = F.num;
  const q = F.q;
  const T = G.defineTemplate;
  const S = G.defineStatic;
  const SQ3 = Math.sqrt(3);
  const EPS0 = 8.855e-12;
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;

  // ───────── 4단자망 ─────────
  T({
    id: 'fp-t',
    concept: 'fourport',
    gen(r) {
      const Z1 = r.pick([10, 20, 30, 40, 50, 100]);
      const Z2 = r.pick([10, 20, 30, 40, 50, 100]);
      const Y = r.pick([0.001, 0.002, 0.005, 0.01, 0.02]);
      const ask = r.pick(['A', 'B', 'D']);
      const A = 1 + Z1 * Y;
      const B = Z1 + Z2 + Z1 * Z2 * Y;
      const D = 1 + Z2 * Y;
      const ans = ask === 'A' ? A : ask === 'B' ? B : D;
      const unit = ask === 'B' ? 'Ω' : '';
      const dis =
        ask === 'A'
          ? [
              { v: Z1 * Y, why: '1을 더하는 걸 빼먹었어. 입력 쪽 직렬 Z1 뒤에 병렬 Y가 오면 A = 1 + Z1·Y 야.' },
              { v: D, why: '이건 D야(출력 쪽 직렬 Z2 기준). A는 입력 쪽 직렬 Z1을 쓰니까 1 + Z1·Y.' },
              { v: 1 + (Z1 + Z2) * Y, why: 'Z1과 Z2를 둘 다 더했어. A는 입력 쪽 직렬 임피던스 Z1만 영향을 줘.' },
              { v: 1 + Z1 / Y, why: '어드미턴스 Y를 곱해야 하는데 나눴어. A = 1 + Z1·Y 야.' },
              { v: B, why: '이건 B(Ω 단위의 임피던스 정수)야. A는 단위 없는 값이야.' },
            ]
          : ask === 'D'
            ? [
                { v: Z2 * Y, why: '1을 더하는 걸 빼먹었어. D = 1 + Z2·Y 야.' },
                { v: A, why: '이건 A야(입력 쪽 Z1 기준). D는 출력 쪽 직렬 Z2를 쓰니까 1 + Z2·Y.' },
                { v: 1 + (Z1 + Z2) * Y, why: 'Z1과 Z2를 둘 다 더했어. D는 출력 쪽 직렬 임피던스 Z2만 영향을 줘.' },
                { v: 1 + Z2 / Y, why: '어드미턴스 Y를 곱해야 하는데 나눴어. D = 1 + Z2·Y 야.' },
                { v: B, why: '이건 B(Ω 단위의 임피던스 정수)야. D는 단위 없는 값이야.' },
              ]
            : [
                { v: Z1 + Z2, why: '직렬 임피던스를 더하기만 했어. 병렬 Y 때문에 Z1·Z2·Y 항이 더 붙어.' },
                { v: Z1 * Z2 * Y, why: 'Z1·Z2·Y 항만 구했어. B = Z1 + Z2 + Z1·Z2·Y 라서 Z1 + Z2도 더해야 해.' },
                { v: Z1 + Z2 + (Z1 * Z2) / Y, why: 'Y는 곱해야 해. B = Z1 + Z2 + Z1·Z2·Y.' },
                { v: A * D, why: 'A × D 를 구했어. A·D − B·C = 1 이라서 A·D는 B가 아니야.' },
                { v: Z1 + Z2 + Y, why: 'Y(S)는 Ω으로 더할 수 없어. 곱해서 Z1·Z2·Y 항을 만들어야 해.' },
              ];
      const frm = { A: 'A = 1 + Z1·Y', B: 'B = Z1 + Z2 + Z1·Z2·Y', D: 'D = 1 + Z2·Y' }[ask];
      const calc =
        ask === 'A'
          ? '1 + ' + n(Z1) + ' × ' + n(Y, 4) + ' = ' + q(A, '', 3)
          : ask === 'D'
            ? '1 + ' + n(Z2) + ' × ' + n(Y, 4) + ' = ' + q(D, '', 3)
            : n(Z1) + ' + ' + n(Z2) + ' + ' + n(Z1) + ' × ' + n(Z2) + ' × ' + n(Y, 4) + ' = ' + q(B, 'Ω', 3);
      return {
        params: { Z1, Z2, Y, ask },
        text: '입력 쪽부터 직렬 임피던스 Z₁ = ' + q(Z1, 'Ω') + ', 병렬 어드미턴스 Y = ' + q(Y, 'S', 3) + ', 직렬 임피던스 Z₂ = ' + q(Z2, 'Ω') + ' 로 이어진 T형 4단자망이 있어. 4단자 정수 ' + ask + '는?',
        formula: 'T형: A = 1 + Z1·Y,  B = Z1 + Z2 + Z1·Z2·Y,  C = Y,  D = 1 + Z2·Y',
        unit,
        decimals: 3,
        answer: ans,
        distractors: dis,
        conclusion: ask + ' = ' + calc,
        steps: [
          '직렬 Z는 [1 Z; 0 1], 병렬 Y는 [1 0; Y 1] 이고 입력 쪽부터 순서대로 행렬을 곱해.',
          '곱하면 A = 1 + Z1·Y, B = Z1 + Z2 + Z1·Z2·Y, C = Y, D = 1 + Z2·Y.',
          frm + ' → ' + calc + '.',
        ],
        check: 'A·D − B·C = ' + n(A * D - B * Y, 4) + ' 로 1이 돼(상반 회로의 조건이야).',
        traps: ['직렬 소자는 B, 병렬 소자는 C에 들어가.', '입력 쪽 소자 순서대로 곱해야 해(Z1은 A, Z2는 D에 영향).'],
      };
    },
  });

  T({
    id: 'fp-det',
    concept: 'fourport',
    gen(r) {
      const A = r.pick([1, 1.2, 1.25, 1.5, 2, 2.5, 4, 5]);
      const B = r.pick([10, 20, 30, 50, 100, 200]);
      const C = r.pick([0.001, 0.002, 0.004, 0.005, 0.01, 0.02]);
      const D = (1 + B * C) / A;
      return {
        params: { A, B, C },
        text: '상반(가역) 회로인 4단자망의 정수가 A = ' + n(A) + ', B = ' + q(B, 'Ω') + ', C = ' + q(C, 'S', 3) + ' 일 때 D는?',
        formula: '상반 회로: A·D − B·C = 1  →  D = (1 + B·C) / A',
        unit: '',
        decimals: 4,
        answer: D,
        distractors: [
          { v: A, why: '대칭 회로라면 A = D지만, 이 문제는 대칭이라는 말이 없어. 상반 조건 AD − BC = 1을 써야 해.' },
          { v: (1 - B * C) / A, why: '부호를 잘못 넘겼어. AD − BC = 1 → AD = 1 + BC 라서 더해야 해.' },
          { v: 1 + B * C, why: 'A로 나누는 걸 빼먹었어. AD = 1 + BC 이므로 D = (1 + BC) ÷ A 야.' },
          { v: (1 + B * C) * A, why: 'A로 나눠야 하는데 곱했어. D = (1 + BC) ÷ A.' },
          { v: B * C / A, why: '1을 더하는 걸 빼먹었어. D = (1 + BC) ÷ A.' },
        ],
        conclusion: 'D = (1 + B·C) ÷ A = (1 + ' + n(B) + ' × ' + n(C, 3) + ') ÷ ' + n(A) + ' = ' + q(D, '', 4),
        steps: ['상반 회로이므로 A·D − B·C = 1.', 'D에 대해 풀면 D = (1 + B·C) ÷ A.', 'B·C = ' + n(B) + ' × ' + n(C, 3) + ' = ' + n(B * C, 4) + ' 이니까 D = ' + n(1 + B * C, 4) + ' ÷ ' + n(A) + ' = ' + q(D, '', 4) + '.'],
        check: 'A·D = ' + n(A * D, 4) + ', B·C = ' + n(B * C, 4) + ' → 차 = ' + n(A * D - B * C, 4) + ' = 1.',
        traps: ['B(Ω)와 C(S)를 곱하면 단위가 없어져서 1과 더할 수 있어.', '대칭이면 A = D가 따로 성립해(이 문제는 해당 없음).'],
      };
    },
  });

  // ───────── 분포정수 선로 ─────────
  T({
    id: 'tx-z0',
    concept: 'txline',
    gen(r) {
      const L = r.pick([0.8, 1, 1.2, 1.5, 2, 2.4]); // mH/km
      const C = r.pick([0.005, 0.008, 0.01, 0.012, 0.015, 0.02]); // μF/km
      const z0 = Math.sqrt((L * 1e-3) / (C * 1e-6));
      const v = 1 / Math.sqrt(L * 1e-3 * C * 1e-6) / 1e5; // 10^5 km/s
      const speed = r.chance(0.4);
      if (speed) {
        return {
          params: { L, C, mode: 'v' },
          text: '손실이 없는 선로의 단위 길이당 인덕턴스 L = ' + q(L, 'mH/km') + ', 정전용량 C = ' + q(C, 'μF/km') + '일 때 전파 속도는 약 몇 ×10⁵ km/s야?',
          formula: 'v = 1 / √(L·C)',
          unit: '×10⁵ km/s',
          decimals: 3,
          answer: v,
          distractors: [
            { v: Math.sqrt(L / C) / 100, why: '특성임피던스 √(L/C) 꼴을 썼어. 전파 속도는 곱 √(LC)의 역수야.' },
            { v: Math.sqrt(1e-3 * L * C * 1e-6) * 1e5, why: '역수를 취하지 않았어. v = 1/√(LC) 라서 √(LC)가 클수록 느려져.' },
            { v: v * Math.sqrt(10), why: '단위 환산을 잘못했어. mH = 10⁻³ H, μF = 10⁻⁶ F 로 바꿔서 넣어야 해.' },
            { v: v / Math.sqrt(10), why: '단위 환산을 잘못했어. mH = 10⁻³ H, μF = 10⁻⁶ F 로 바꿔서 넣어야 해.' },
            { v: v * 2, why: 'L·C에 제곱근을 씌우는 걸 빼먹었어. v = 1/√(LC).' },
          ],
          conclusion: 'v = 1/√(L·C) = ' + q(v, '×10⁵ km/s', 3),
          steps: ['단위를 H/km, F/km로 바꿔: L = ' + n(L * 1e-3, 6) + ' H/km, C = ' + n(C * 1e-6, 9) + ' F/km.', 'L·C = ' + n(L * 1e-3 * C * 1e-6, 15) + ' 이고 √(LC) = ' + n(Math.sqrt(L * 1e-3 * C * 1e-6), 8) + ' s/km.', '역수를 취하면 v = ' + q(v, '×10⁵ km/s', 3) + '.'],
          check: '빛의 속도(3×10⁵ km/s)보다 작아야 하는데 ' + n(v, 3) + ' ×10⁵ km/s 라서 맞아.',
          traps: ['전파 속도는 1/√(LC), 특성임피던스는 √(L/C)야.', 'mH·μF를 그대로 넣으면 10의 거듭제곱이 틀어져.'],
        };
      }
      return {
        params: { L, C, mode: 'z' },
        text: '손실이 없는 선로의 단위 길이당 인덕턴스 L = ' + q(L, 'mH/km') + ', 정전용량 C = ' + q(C, 'μF/km') + '일 때 특성임피던스는 약 몇 Ω이야?',
        formula: 'Z0 = √(L/C)',
        unit: 'Ω',
        decimals: 2,
        answer: z0,
        distractors: [
          { v: z0 * z0, why: '제곱근을 씌우지 않았어. Z0 = √(L/C).' },
          { v: Math.sqrt(L * C) * 1e3, why: 'L ÷ C가 아니라 L × C로 계산했어. 특성임피던스는 √(L/C)야.' },
          { v: z0 / Math.sqrt(10), why: '단위 환산을 잘못했어. mH ÷ μF = 10⁻³ ÷ 10⁻⁶ = 10³ 이라서 L/C에 1000을 곱한 뒤 제곱근을 취해.' },
          { v: z0 * Math.sqrt(10), why: '단위 환산을 잘못했어. L/C에 1000을 곱한 뒤 제곱근을 취해야 해.' },
          { v: Math.sqrt(C / L) * 1e3 / 10, why: 'C ÷ L 로 거꾸로 나눴어. 특성임피던스는 √(L/C)야.' },
        ],
        conclusion: 'Z0 = √(L/C) = √(' + n(L) + '×10⁻³ ÷ ' + n(C) + '×10⁻⁶) = ' + q(z0, 'Ω', 2),
        steps: ['무손실 선로의 특성임피던스는 Z0 = √(L/C) 이야.', 'L/C = ' + n(L) + '×10⁻³ ÷ (' + n(C) + '×10⁻⁶) = ' + n((L * 1e-3) / (C * 1e-6), 3) + ' (mH ÷ μF 는 ×1000).', '제곱근을 씌우면 ' + q(z0, 'Ω', 2) + '.'],
        check: Math.abs(z0 * z0 * C * 1e-6 - L * 1e-3) / (L * 1e-3) < 1e-6 ? 'Z0² × C = ' + n(z0 * z0 * C * 1e-6, 6) + ' = L(' + n(L * 1e-3, 6) + ' H)' : '',
        traps: ['특성임피던스는 √(L/C), 전파 속도는 1/√(LC)야.', '송전선은 수백 Ω, 케이블은 수십 Ω 정도라서 자릿수를 점검해 봐.'],
      };
    },
  });

  T({
    id: 'tx-gamma',
    concept: 'txline',
    gen(r) {
      const Z0 = r.pick([50, 75, 100, 300, 400, 600]);
      const k = r.pick([0.2, 0.25, 0.5, 2, 3, 4, 5, 8]);
      const ZL = Z0 * k;
      const gam = Math.abs((ZL - Z0) / (ZL + Z0));
      const vswr = (1 + gam) / (1 - gam);
      const askV = r.chance(0.45);
      const ans = askV ? vswr : gam;
      const hi = Math.max(k, 1 / k);
      const dis = askV
        ? [
            { v: gam, why: '반사계수 |Γ|야. 정재파비는 (1 + |Γ|) ÷ (1 − |Γ|) 로 한 번 더 계산해야 해.' },
            { v: 1 / vswr, why: '역수를 취했어. 정재파비는 1 이상이라서 (1 + |Γ|) ÷ (1 − |Γ|) 야(큰 값이 위).' },
            { v: 1 + gam, why: '분모 (1 − |Γ|)로 나누는 걸 빼먹었어.' },
            { v: (1 + gam) / (1 + gam) + gam, why: '분모를 (1 + |Γ|)로 잘못 썼어. 분모는 (1 − |Γ|)야.' },
            { v: hi * 1.5, why: '임피던스 비를 대충 곱해 봤는데 정재파비는 |Γ|에서 (1 + |Γ|) ÷ (1 − |Γ|)로 구해.' },
          ]
        : [
            { v: 1 / gam, why: '분모와 분자를 바꿨어. 반사계수는 (ZL − Z0) ÷ (ZL + Z0) 이고 항상 1 이하야.' },
            { v: ZL / Z0, why: '임피던스 비 ZL/Z0 야. 반사계수는 (ZL − Z0) ÷ (ZL + Z0).' },
            { v: Math.abs(ZL - Z0) / ZL, why: '분모가 ZL 하나가 아니라 ZL + Z0 야.' },
            { v: vswr, why: '정재파비(VSWR)를 구했어. 반사계수는 (ZL − Z0) ÷ (ZL + Z0).' },
            { v: Math.abs(ZL - Z0) / Z0, why: '분모가 Z0 하나가 아니라 ZL + Z0 야.' },
          ];
      return {
        params: { Z0, ZL, mode: askV ? 'vswr' : 'gam' },
        text: '특성임피던스 Z0 = ' + q(Z0, 'Ω') + ' 인 선로 끝에 순저항 부하 ZL = ' + q(ZL, 'Ω') + ' 를 연결했어. 이때 ' + (askV ? '정재파비(VSWR)는?' : '반사계수의 크기 |Γ|는?'),
        formula: askV ? 'Γ = (ZL − Z0)/(ZL + Z0),  VSWR = (1 + |Γ|) ÷ (1 − |Γ|)' : 'Γ = (ZL − Z0)/(ZL + Z0)',
        unit: '',
        decimals: 4,
        answer: ans,
        distractors: dis,
        conclusion: askV ? 'VSWR = (1 + ' + n(gam, 4) + ') ÷ (1 − ' + n(gam, 4) + ') = ' + q(vswr, '', 4) : '|Γ| = |' + n(ZL) + ' − ' + n(Z0) + '| ÷ (' + n(ZL) + ' + ' + n(Z0) + ') = ' + q(gam, '', 4),
        steps: askV
          ? ['반사계수 Γ = (ZL − Z0) ÷ (ZL + Z0) = (' + n(ZL) + ' − ' + n(Z0) + ') ÷ (' + n(ZL) + ' + ' + n(Z0) + ') = ' + n((ZL - Z0) / (ZL + Z0), 4) + '.', '크기만 쓰면 |Γ| = ' + n(gam, 4) + '.', 'VSWR = (1 + |Γ|) ÷ (1 − |Γ|) = ' + q(vswr, '', 4) + '.']
          : ['반사계수 Γ = (ZL − Z0) ÷ (ZL + Z0).', '(' + n(ZL) + ' − ' + n(Z0) + ') ÷ (' + n(ZL) + ' + ' + n(Z0) + ') = ' + n((ZL - Z0) / (ZL + Z0), 4) + '.', '크기는 |Γ| = ' + q(gam, '', 4) + '.'],
        check: askV ? '저항 부하는 VSWR = 큰 쪽 ÷ 작은 쪽 = ' + n(hi, 4) + ' 로도 나와.' : '0과 1 사이이고 ZL이 Z0와 같아질수록 0에 가까워져.',
        traps: ['반사계수는 항상 −1 ~ +1 사이, VSWR은 1 이상이야.', 'ZL = Z0 이면 Γ = 0, VSWR = 1(정합).'],
      };
    },
  });

  // ───────── 대칭좌표법 ─────────
  T({
    id: 'sc-comp',
    concept: 'symcomp',
    noCalc: true,
    gen(r) {
      const Ma = r.pick([60, 80, 100, 120, 150]);
      const Mb = r.pick([60, 80, 100, 120, 150]);
      const Mc = r.pick([60, 80, 100, 120, 150]);
      if (Ma === Mb && Mb === Mc) return this.gen(r);
      const which = r.pick(['0', '1', '2']);
      // a = 1∠120°.  Va = Ma∠0°, Vb = Mb∠−120°, Vc = Mc∠120° (상순은 a-b-c)
      const cx = (m, th) => [m * Math.cos(rad(th)), m * Math.sin(rad(th))];
      const add = (u, v) => [u[0] + v[0], u[1] + v[1]];
      const mag = (u) => Math.hypot(u[0], u[1]) / 3;
      const V0 = mag(add(add(cx(Ma, 0), cx(Mb, -120)), cx(Mc, 120)));
      const V1 = (Ma + Mb + Mc) / 3;
      const V2 = mag(add(add(cx(Ma, 0), cx(Mb, 120)), cx(Mc, 240)));
      const ans = which === '0' ? V0 : which === '1' ? V1 : V2;
      const name = { 0: '영상분 V0', 1: '정상분 V1', 2: '역상분 V2' }[which];
      const others = [
        { v: V0, w: '영상분 V0', k: '0' },
        { v: V1, w: '정상분 V1', k: '1' },
        { v: V2, w: '역상분 V2', k: '2' },
      ].filter((o) => o.k !== which);
      const dis = others.map((o) => ({ v: o.v, why: '이건 ' + o.w + '의 크기야. 문제에서 묻는 건 ' + name + '이고 합치는 위상 회전이 달라.' }));
      dis.push({ v: ans * 3, why: '3으로 나누는 걸 빼먹었어. 각 성분은 합을 3으로 나눠서 구해.' });
      dis.push({ v: (Ma + Mb + Mc) / 3 * (which === '1' ? 0.5 : 1.5), why: '세 상 크기의 단순 평균만 썼어. 위상(±120°)을 고려한 벡터 합으로 구해야 해.' });
      const forms = {
        0: 'V0 = (Va + Vb + Vc) / 3',
        1: 'V1 = (Va + a·Vb + a²·Vc) / 3',
        2: 'V2 = (Va + a²·Vb + a·Vc) / 3',
      };
      const stepWhich =
        which === '1'
          ? ['정상분은 위상을 맞춰 더하면 Va + a·Vb + a²·Vc = ' + n(Ma) + ' + ' + n(Mb) + ' + ' + n(Mc) + ' = ' + n(Ma + Mb + Mc) + ' (모두 같은 방향).', n(Ma + Mb + Mc) + ' ÷ 3 = ' + q(V1, 'V', 3) + '.']
          : [forms[which] + ' 를 벡터로 계산해(a = 1∠120°).', '벡터 합의 크기 ÷ 3 = ' + q(ans, 'V', 3) + '.'];
      return {
        params: { Ma, Mb, Mc, which },
        text: '불평형 3상 전압이 Va = ' + q(Ma, 'V') + '∠0°, Vb = ' + q(Mb, 'V') + '∠−120°, Vc = ' + q(Mc, 'V') + '∠120° 일 때 ' + name + '의 크기는? (상순 a-b-c, a = 1∠120°)',
        formula: forms[which],
        unit: 'V',
        decimals: 3,
        answer: ans,
        distractors: dis,
        conclusion: name + ' = ' + q(ans, 'V', 3),
        steps: ['대칭좌표 성분은 ' + forms[which] + ' 이야.', ...stepWhich],
        check: '세 상이 모두 같은 크기가 아니라서 영상분·역상분이 0이 아니야. 크기가 같으면 정상분만 남아.',
        traps: ['정상분은 크기를 평균한 값과 같고, 영상분·역상분은 불평형 정도를 나타내.', '평형 3상은 영상분·역상분이 0이야.'],
      };
    },
  });

  T({
    id: 'sc-slg',
    concept: 'symcomp',
    gen(r) {
      const V = r.pick([22.9, 66, 110, 154]); // 선간 kV
      const Z0 = r.pick([5, 8, 10, 12, 15, 20]);
      const Z1 = r.pick([4, 5, 6, 8, 10]);
      const Z2 = r.pick([4, 5, 6, 8, 10]);
      const E = (V * 1000) / SQ3;
      const Ig = (3 * E) / (Z0 + Z1 + Z2);
      const I0 = E / (Z0 + Z1 + Z2);
      return {
        params: { V, Z0, Z1, Z2 },
        text: '선간전압 ' + q(V, 'kV') + ' 인 3상 계통에서 a상이 1선 지락 사고를 일으켰어. 고장점에서 본 영상·정상·역상 임피던스가 Z0 = ' + q(Z0, 'Ω') + ', Z1 = ' + q(Z1, 'Ω') + ', Z2 = ' + q(Z2, 'Ω') + ' 일 때 지락 전류는? (고장 임피던스 0)',
        formula: 'Ig = 3·Ea / (Z0 + Z1 + Z2),  Ea = V/√3',
        unit: 'A',
        decimals: 1,
        answer: Ig,
        distractors: [
          { v: I0, why: '이건 영상 전류 I0 = Ea ÷ (Z0+Z1+Z2)야. 지락 전류는 그 3배(Ig = 3I0).' },
          { v: (3 * V * 1000) / (Z0 + Z1 + Z2), why: '선간전압을 그대로 썼어. 1선 지락은 상전압 Ea = V/√3 를 써야 해.' },
          { v: (V * 1000) / (Z0 + Z1 + Z2), why: '선간전압을 쓰고 3도 곱하지 않았어. Ig = 3·Ea ÷ ΣZ, Ea는 상전압.' },
          { v: (3 * E) / (Z1 + Z2), why: '영상 임피던스 Z0를 빼먹었어. 1선 지락은 세 임피던스가 모두 직렬로 들어가.' },
          { v: (3 * E) / (Z0 + Z1 + Z2) / SQ3, why: '상전압으로 바꾸려고 √3으로 나눴는데 이미 상전압(V/√3)을 썼어. 한 번만 나눠야 해.' },
        ],
        conclusion: 'Ig = 3 × (' + n(V) + 'k/√3) ÷ (' + n(Z0) + ' + ' + n(Z1) + ' + ' + n(Z2) + ') = ' + q(Ig, 'A', 1),
        steps: ['1선 지락에서는 I0 = I1 = I2 = Ea ÷ (Z0 + Z1 + Z2) 이야.', 'Ea = ' + n(V) + ' kV ÷ √3 = ' + n(E, 1) + ' V, 임피던스 합 = ' + n(Z0 + Z1 + Z2) + ' Ω → I0 = ' + n(I0, 2) + ' A.', '지락 전류 Ig = 3·I0 = ' + q(Ig, 'A', 1) + '.'],
        check: 'I0 × 3 = ' + n(I0 * 3, 1) + ' A 로 같아.',
        traps: ['3배를 곱하는 건 지락 전류 Ig = Ia = I0+I1+I2 = 3I0 라서야.', '1선 지락은 Ea(상전압)를 써.'],
      };
    },
  });

  // ───────── 비정현파 ─────────
  T({
    id: 'ns-rms',
    concept: 'nonsine',
    gen(r) {
      const V0 = r.pick([0, 0, 10, 20, 30, 40, 50]);
      const m1 = r.pick([100, 120, 140, 180, 200, 220]);
      const m3 = r.pick([20, 30, 40, 60, 80]);
      const m5 = r.chance(0.5) ? r.pick([10, 20, 30]) : 0;
      const rms = Math.sqrt(V0 * V0 + (m1 * m1) / 2 + (m3 * m3) / 2 + (m5 * m5) / 2);
      const wave = (V0 ? n(V0) + ' + ' : '') + n(m1) + ' sin ωt + ' + n(m3) + ' sin 3ωt' + (m5 ? ' + ' + n(m5) + ' sin 5ωt' : '');
      return {
        params: { V0, m1, m3, m5 },
        text: '전압 v(t) = ' + wave + ' [V] 의 실효값은?',
        formula: 'V = √(V0² + (Vm1/√2)² + (Vm3/√2)² + …)',
        unit: 'V',
        decimals: 3,
        answer: rms,
        distractors: [
          { v: V0 + (m1 + m3 + m5) / Math.SQRT2, why: '실효값을 그냥 더했어. 비정현파는 각 성분 실효값을 제곱해서 더한 뒤 제곱근을 취해.' },
          { v: Math.sqrt(V0 * V0 + m1 * m1 + m3 * m3 + m5 * m5), why: '최대값을 그대로 제곱해서 더했어. 교류 성분은 최대값 ÷ √2 로 실효값을 먼저 만들어야 해.' },
          { v: Math.sqrt((V0 * V0 + m1 * m1 + m3 * m3 + m5 * m5) / 2), why: '직류분까지 √2로 나눴어. 직류 성분 V0는 그대로 제곱해서 더하고 교류 성분만 ÷ 2야.' },
          { v: m1 / Math.SQRT2, why: '기본파 실효값만 구했어. 고조파와 직류분도 제곱합에 들어가야 해.' },
          { v: Math.sqrt(V0 * V0 + (m1 * m1) / 2), why: '3고조파' + (m5 ? '·5고조파' : '') + '를 빼먹었어. 모든 성분을 제곱합에 넣어야 해.' },
        ],
        conclusion: 'V = √(' + (V0 ? n(V0) + '² + ' : '') + '(' + n(m1) + '/√2)² + (' + n(m3) + '/√2)²' + (m5 ? ' + (' + n(m5) + '/√2)²' : '') + ') = ' + q(rms, 'V', 3),
        steps: ['각 성분의 실효값을 구해: ' + (V0 ? '직류 ' + n(V0) + ', ' : '') + '기본파 ' + n(m1 / Math.SQRT2, 3) + ', 3고조파 ' + n(m3 / Math.SQRT2, 3) + (m5 ? ', 5고조파 ' + n(m5 / Math.SQRT2, 3) : '') + '.', '제곱해서 더하면 ' + n(rms * rms, 3) + '.', '제곱근을 취하면 ' + q(rms, 'V', 3) + '.'],
        check: '실효값은 기본파 실효값(' + n(m1 / Math.SQRT2, 3) + ' V)보다 크고, 모든 성분을 그냥 더한 값보다 작아.',
        traps: ['직류분은 √2로 나누지 않아.', '더할 때는 실효값이 아니라 제곱을 더해(전력은 제곱이니까).'],
      };
    },
  });

  T({
    id: 'ns-thd',
    concept: 'nonsine',
    gen(r) {
      const V1 = r.pick([100, 110, 200, 220, 380]);
      const V3 = r.pick([5, 8, 10, 12, 15, 20]);
      const V5 = r.pick([3, 4, 5, 6, 8]);
      const thd = (Math.sqrt(V3 * V3 + V5 * V5) / V1) * 100;
      return {
        params: { V1, V3, V5 },
        text: '기본파 실효값 ' + q(V1, 'V') + ', 제3고조파 ' + q(V3, 'V') + ', 제5고조파 ' + q(V5, 'V') + ' 인 비정현파 전압의 왜형률(THD)은 몇 %야?',
        formula: 'THD = √(V3² + V5²) / V1 × 100 [%]',
        unit: '%',
        decimals: 3,
        answer: thd,
        distractors: [
          { v: ((V3 + V5) / V1) * 100, why: '고조파 크기를 그냥 더했어. 제곱해서 더한 뒤 제곱근을 취해야 해.' },
          { v: (Math.sqrt(V1 * V1 + V3 * V3 + V5 * V5) / V1) * 100, why: '기본파까지 포함한 전체 실효값을 분자로 썼어. 왜형률의 분자는 고조파만이야.' },
          { v: (Math.sqrt(V3 * V3 + V5 * V5) / Math.sqrt(V1 * V1 + V3 * V3 + V5 * V5)) * 100, why: '분모를 전체 실효값으로 썼어. 왜형률은 기본파 실효값으로 나눠.' },
          { v: Math.sqrt(V3 * V3 + V5 * V5) / V1, why: '100을 곱해 백분율로 바꾸지 않았어.' },
          { v: (V3 / V1) * 100, why: '제3고조파만 썼어. 제5고조파도 제곱합에 넣어야 해.' },
        ],
        conclusion: 'THD = √(' + n(V3) + '² + ' + n(V5) + '²) ÷ ' + n(V1) + ' × 100 = ' + q(thd, '%', 3),
        steps: ['고조파만의 실효값 = √(V3² + V5²) = √(' + n(V3 * V3) + ' + ' + n(V5 * V5) + ') = ' + n(Math.sqrt(V3 * V3 + V5 * V5), 4) + ' V.', '기본파 ' + n(V1) + ' V 로 나누면 ' + n(Math.sqrt(V3 * V3 + V5 * V5) / V1, 5) + '.', '백분율로 ×100 → ' + q(thd, '%', 3) + '.'],
        check: '고조파가 기본파보다 훨씬 작아서 몇 % 수준이 맞아.',
        traps: ['분자는 고조파만, 분모는 기본파야.', '기본파 이상의 전체 실효값으로 나누면 THD가 아니야.'],
      };
    },
  });

  T({
    id: 'ns-power',
    concept: 'nonsine',
    gen(r) {
      const V1 = r.pick([100, 110, 200, 220]);
      const I1 = r.pick([5, 8, 10, 12, 15]);
      const t1 = r.pick([0, 30, 60]);
      const V3 = r.pick([20, 30, 40, 60]);
      const I3 = r.pick([1, 2, 3, 4]);
      const t3 = r.pick([0, 30, 60]);
      const P = V1 * I1 * Math.cos(rad(t1)) + V3 * I3 * Math.cos(rad(t3));
      const Vr = Math.sqrt(V1 * V1 + V3 * V3);
      const Ir = Math.sqrt(I1 * I1 + I3 * I3);
      return {
        params: { V1, I1, t1, V3, I3, t3 },
        text: '비정현파 전압·전류의 실효값이 기본파 V1 = ' + q(V1, 'V') + ', I1 = ' + q(I1, 'A') + '(위상차 ' + n(t1) + '°), 제3고조파 V3 = ' + q(V3, 'V') + ', I3 = ' + q(I3, 'A') + '(위상차 ' + n(t3) + '°) 일 때 평균 전력은?',
        formula: 'P = V1·I1·cosθ1 + V3·I3·cosθ3',
        unit: 'W',
        decimals: 3,
        answer: P,
        distractors: [
          { v: V1 * I1 * Math.cos(rad(t1)), why: '기본파 전력만 구했어. 같은 주파수끼리의 전력인 제3고조파 전력도 더해야 해.' },
          { v: Vr * Ir * Math.cos(rad(t1)), why: '전체 실효값을 곱한 뒤 기본파 역률을 곱했어. 비정현파 전력은 같은 차수끼리만 곱해서 더해.' },
          { v: V1 * I1 + V3 * I3, why: 'cosθ를 곱하지 않았어(위상차 효과). 각 성분에 cosθ를 곱해야 해.' },
          { v: V1 * I3 * Math.cos(rad(t1)) + V3 * I1 * Math.cos(rad(t3)), why: '서로 다른 차수(기본파 전압 × 3고조파 전류)를 곱했어. 다른 주파수끼리는 평균 전력이 0이라 같은 차수끼리만 곱해.' },
          { v: Vr * Ir, why: '피상 전력이야. 유효 전력은 성분별 V·I·cosθ의 합이야.' },
        ],
        conclusion: 'P = ' + n(V1) + '×' + n(I1) + '×cos' + n(t1) + '° + ' + n(V3) + '×' + n(I3) + '×cos' + n(t3) + '° = ' + q(P, 'W', 3),
        steps: ['같은 주파수의 전압·전류끼리만 평균 전력이 생겨.', '기본파: ' + n(V1) + ' × ' + n(I1) + ' × cos ' + n(t1) + '° = ' + n(V1 * I1 * Math.cos(rad(t1)), 3) + ' W.', '3고조파: ' + n(V3) + ' × ' + n(I3) + ' × cos ' + n(t3) + '° = ' + n(V3 * I3 * Math.cos(rad(t3)), 3) + ' W.', '합하면 ' + q(P, 'W', 3) + '.'],
        check: '전체 피상 전력 ' + n(Vr * Ir, 2) + ' VA 보다 작아.',
        traps: ['전력은 같은 차수끼리만 더해.', '위상차 θ는 각 차수마다 따로 있어.'],
      };
    },
  });

  // ───────── 정상 편차 ─────────
  T({
    id: 'ce-kind',
    concept: 'cs-error',
    gen(r) {
      const kind = r.pick([0, 1, 2]);
      const K = r.pick([4, 5, 8, 9, 10, 19, 20, 24, 49, 50, 99, 100]);
      const a = r.pick([2, 4, 5, 10]);
      const A = r.pick([1, 2, 3, 5, 10]);
      let T1 = 1;
      let T2 = 1;
      let text;
      let ans;
      let form;
      let dis;
      let steps;
      let conc;
      let tip;
      if (kind === 0) {
        T1 = r.pick([1, 2, 5]);
        T2 = r.pick([2, 4, 10]);
        ans = A / (1 + K);
        text = '단위 부궤환 제어계의 개루프 전달함수가 G(s) = ' + n(K) + ' / {(1 + ' + n(T1) + 's)(1 + ' + n(T2) + 's)} 이다. 크기 ' + n(A) + '인 계단(위치) 입력의 정상 편차는?';
        form = 'Kp = lim G(s) = K,   e = A/(1 + Kp)';
        dis = [
          { v: A / K, why: '분모에서 1을 빼먹었어. 위치 입력 편차는 e = A/(1 + Kp)야.' },
          { v: 0, why: '0형 제어계는 원점에 적분기가 없어서 계단 입력에도 편차가 남아(0이 되는 건 1형 이상).' },
          { v: A * (1 + K), why: '분자·분모를 바꿨어. e = A ÷ (1 + Kp).' },
          { v: A / (1 + K / (T1 + T2)), why: '시정수를 섞어서 Kp를 만들었어. s → 0 에서 (1 + Ts) 항은 모두 1이 되어 Kp = K야.' },
        ];
        conc = 'e = ' + n(A) + ' ÷ (1 + ' + n(K) + ') = ' + q(ans, '', 4);
        steps = ['s = 0 을 넣으면 (1 + Ts)가 1이 되어 Kp = ' + n(K) + '.', '0형이고 계단 입력이니까 e = A ÷ (1 + Kp).', n(A) + ' ÷ ' + n(1 + K) + ' = ' + q(ans, '', 4) + '.'];
        tip = '0형은 계단 입력에 편차가 남고 램프 입력에는 무한대야.';
      } else if (kind === 1) {
        ans = (A * a) / K;
        text = '단위 부궤환 제어계의 개루프 전달함수가 G(s) = ' + n(K) + ' / {s(s + ' + n(a) + ')} 이다. 입력이 r(t) = ' + n(A) + 't (램프)일 때 정상 편차는?';
        form = 'Kv = lim s·G(s) = K/a,   e = A/Kv';
        dis = [
          { v: A / K, why: 'Kv를 K로 잘못 잡았어. s·G(s)에서 s를 약분하면 K/(s + a) → s=0 에서 K/a 야.' },
          { v: A / (1 + K / a), why: '위치 입력 공식 A/(1 + Kp)를 썼어. 램프 입력은 e = A/Kv 야(Kp가 무한대라서 계단 편차는 0).' },
          { v: (A * K) / a, why: '거꾸로 계산했어. e = A ÷ Kv = A × a ÷ K.' },
          { v: 0, why: '1형 제어계는 램프 입력에 편차가 일정하게 남아(0이 되는 건 2형 이상).' },
        ];
        conc = 'e = A/Kv = ' + n(A) + ' ÷ (' + n(K) + '/' + n(a) + ') = ' + q(ans, '', 4);
        steps = ['G(s)에 s가 하나 있어서 1형이야. Kv = lim s·G(s) = ' + n(K) + '/' + n(a) + ' = ' + n(K / a, 4) + '.', '램프 입력 편차 e = A ÷ Kv.', n(A) + ' ÷ ' + n(K / a, 4) + ' = ' + q(ans, '', 4) + '.'];
        tip = '1형은 계단 입력 편차 0, 램프 입력은 A/Kv, 포물선 입력은 무한대야.';
      } else {
        ans = (A * a) / K;
        text = '단위 부궤환 제어계의 개루프 전달함수가 G(s) = ' + n(K) + ' / {s²(s + ' + n(a) + ')} 이다. 입력이 r(t) = ' + n(A) + 't²/2 (포물선)일 때 정상 편차는?';
        form = 'Ka = lim s²·G(s) = K/a,   e = A/Ka';
        dis = [
          { v: A / K, why: 'Ka를 K로 잘못 잡았어. s²·G(s) = K/(s + a) → s=0 에서 K/a 야.' },
          { v: A / (1 + K / a), why: '위치 입력 공식을 썼어. 포물선 입력은 e = A/Ka 야.' },
          { v: (A * K) / a, why: '거꾸로 계산했어. e = A ÷ Ka = A × a ÷ K.' },
          { v: 0, why: '2형 제어계는 포물선 입력에 편차가 일정하게 남아(0이 되는 건 3형 이상).' },
        ];
        conc = 'e = A/Ka = ' + n(A) + ' ÷ (' + n(K) + '/' + n(a) + ') = ' + q(ans, '', 4);
        steps = ['G(s)에 s²이 있어서 2형이야. Ka = lim s²·G(s) = ' + n(K) + '/' + n(a) + ' = ' + n(K / a, 4) + '.', '포물선 입력 편차 e = A ÷ Ka.', n(A) + ' ÷ ' + n(K / a, 4) + ' = ' + q(ans, '', 4) + '.'];
        tip = '2형은 계단·램프 입력 편차 0, 포물선 입력은 A/Ka야.';
      }
      return {
        params: { kind, K, a, A, T1, T2 },
        text,
        formula: form,
        unit: '',
        decimals: 4,
        answer: ans,
        distractors: dis,
        conclusion: conc,
        steps,
        check: '편차가 입력 크기 ' + n(A) + '보다 작은 값이야(이득 K가 클수록 줄어들어).',
        traps: [tip, '입력 종류(계단·램프·포물선)와 제어계 형(0·1·2)을 먼저 짝지어.'],
      };
    },
  });

  // ───────── 주파수 응답(dB) ─────────
  T({
    id: 'bd-db',
    concept: 'bode',
    gen(r) {
      const mode = r.pick(['one', 'two']);
      const g1 = r.pick([2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 200, 500, 1000]);
      const g2 = r.pick([2, 5, 10, 20, 50, 100]);
      if (mode === 'one') {
        const db = 20 * Math.log10(g1);
        return {
          params: { mode, g1, g2: 1 },
          text: '전압 이득이 ' + n(g1) + '배(|G| = ' + n(g1) + ')인 증폭기의 이득은 몇 dB야?',
          formula: 'g[dB] = 20·log₁₀|G|',
          unit: 'dB',
          decimals: 3,
          answer: db,
          distractors: [
            { v: 10 * Math.log10(g1), why: '10·log는 전력비일 때 써. 전압(진폭) 이득은 20·log야.' },
            { v: g1, why: '배수를 그대로 dB로 썼어. 로그를 취한 뒤 20을 곱해야 해.' },
            { v: 20 * Math.log(g1), why: '상용로그(log₁₀)가 아니라 자연로그(ln)를 썼어.' },
            { v: Math.log10(g1), why: '20을 곱하는 걸 빼먹었어.' },
            { v: 20 * g1, why: '로그를 취하지 않고 20을 곱했어. g = 20 log₁₀ |G|.' },
          ],
          conclusion: 'g = 20·log₁₀(' + n(g1) + ') = ' + q(db, 'dB', 3),
          steps: ['전압 이득의 dB 값은 20·log₁₀|G|.', 'log₁₀(' + n(g1) + ') = ' + n(Math.log10(g1), 5) + '.', '× 20 = ' + q(db, 'dB', 3) + '.'],
          check: '10배 = 20 dB, 100배 = 40 dB, 1000배 = 60 dB 와 비교하면 맞아.',
          traps: ['전압·전류(진폭)는 20 log, 전력은 10 log야.', '10배 = 20 dB, 100배 = 40 dB를 기억해.'],
        };
      }
      const db = 20 * Math.log10(g1) + 20 * Math.log10(g2);
      return {
        params: { mode, g1, g2 },
        text: '전압 이득이 ' + n(g1) + '배인 증폭기와 ' + n(g2) + '배인 증폭기를 직렬로 이었어. 전체 이득은 몇 dB야?',
        formula: 'g[dB] = 20·log₁₀|G1·G2| = g1[dB] + g2[dB]',
        unit: 'dB',
        decimals: 3,
        answer: db,
        distractors: [
          { v: 20 * Math.log10(g1 + g2), why: '이득을 더한 뒤 로그를 취했어. 직렬 이득은 배수를 곱하거나(또는 dB를 더하거나) 해야 해.' },
          { v: 10 * Math.log10(g1 * g2), why: '10·log는 전력비일 때 써. 전압 이득은 20·log야.' },
          { v: 20 * Math.log10(g1) * Math.log10(g2), why: 'dB 값끼리 곱했어. 직렬이면 배수는 곱하고 dB는 더해.' },
          { v: g1 * g2, why: '곱한 배수를 dB 값으로 착각했어. 로그를 취하고 20을 곱해야 해.' },
          { v: 20 * Math.log10(g1), why: '앞 단 이득만 구했어. 뒤 단도 더해야 해.' },
        ],
        conclusion: 'g = 20·log₁₀(' + n(g1) + ' × ' + n(g2) + ') = ' + q(db, 'dB', 3),
        steps: ['직렬 이득은 곱이야: ' + n(g1) + ' × ' + n(g2) + ' = ' + n(g1 * g2) + '배.', 'dB로는 20·log₁₀(' + n(g1 * g2) + ') = ' + q(db, 'dB', 3) + '.', '각 단의 dB를 더해도 같아: ' + n(20 * Math.log10(g1), 3) + ' + ' + n(20 * Math.log10(g2), 3) + '.'],
        check: 'dB는 더하기라서 각 단 dB의 합과 같아.',
        traps: ['곱셈이 dB에서는 덧셈이 돼.', '전압 이득은 20 log, 전력 이득은 10 log야.'],
      };
    },
  });

  T({
    id: 'bd-lag',
    concept: 'bode',
    gen(r) {
      const w0 = r.pick([10, 20, 50, 100, 200, 500, 1000]);
      const m = r.pick([0.5, 1, 2, 3, 4, 5, 8, 10]);
      const w = w0 * m;
      const att = 10 * Math.log10(1 + m * m);
      return {
        params: { w0, m, w },
        text: '전달함수 G(s) = 1 / (1 + s/' + n(w0) + ') 인 1차 지연 요소에 각주파수 ω = ' + q(w, 'rad/s') + ' 의 정현파를 넣었어. 이득은 약 몇 dB 감소(감쇠)해?',
        formula: '|G(jω)| = 1/√(1 + (ω/ω0)²) → 감쇠 = 10·log₁₀(1 + (ω/ω0)²) [dB]',
        unit: 'dB',
        decimals: 3,
        answer: att,
        distractors: [
          { v: 20 * Math.log10(m), why: '점근선(직선 근사)의 값에 가까운 계산이야. 정확한 값은 10·log(1 + (ω/ω0)²) 로 구해야 해.' },
          { v: 20 * Math.log10(1 + m * m), why: '제곱 안의 식에 20을 썼어. 이미 제곱이 들어 있어서 10·log(1 + x²) 이야.' },
          { v: 10 * Math.log10(1 + m), why: '(ω/ω0)를 제곱하지 않았어. |G|² = 1/(1 + (ω/ω0)²) 이라서 10·log(1 + m²).' },
          { v: m, why: '주파수 비를 그대로 dB로 썼어. 로그를 취해야 해.' },
          { v: 3.0103, why: '절점 주파수(ω = ω0)에서의 −3 dB야. 이 문제의 ω는 ω0의 ' + n(m) + '배라서 값이 달라.' },
        ],
        conclusion: '감쇠 = 10·log₁₀(1 + (' + n(w) + '/' + n(w0) + ')²) = 10·log₁₀(' + n(1 + m * m, 3) + ') = ' + q(att, 'dB', 3),
        steps: ['ω/ω0 = ' + n(w) + ' ÷ ' + n(w0) + ' = ' + n(m) + '.', '|G| = 1/√(1 + ' + n(m * m) + ') 이므로 이득 = −10·log₁₀(1 + ' + n(m * m) + ').', '10·log₁₀(' + n(1 + m * m, 3) + ') = ' + q(att, 'dB', 3) + ' 감쇠.'],
        check: m === 1 ? '절점 주파수라서 약 3 dB 감쇠가 맞아.' : m > 1 ? 'ω가 ω0보다 크니까 3 dB보다 더 감쇠해(10배면 약 20 dB).' : 'ω가 ω0보다 작으니까 3 dB보다 덜 감쇠해.',
        traps: ['절점에서 정확히 3 dB(−45°), 10배 주파수에서는 약 20 dB 감쇠야.', '근사(−20 dB/dec 직선)와 정확한 값은 절점 근처에서 달라.'],
      };
    },
  });

  // ───────── 유전체 ─────────
  T({
    id: 'di-two',
    concept: 'dielectric',
    gen(r) {
      const S = r.pick([50, 100, 200, 300, 500]); // cm²
      const d1 = r.pick([1, 2, 3, 4, 5]);
      const d2 = r.pick([1, 2, 3, 4, 5]);
      const e1 = r.pick([2, 3, 4, 5, 6, 8]);
      const e2 = r.pick([2, 3, 4, 5, 6, 8, 10]);
      if (e1 === e2) return this.gen(r);
      const sum = d1 / e1 + d2 / e2;
      const C = (EPS0 * S * 1e-4) / (sum * 1e-3) * 1e12;
      return {
        params: { S, d1, d2, e1, e2 },
        text: '극판 면적 ' + q(S, 'cm²') + ' 인 평행판 사이에 두께 ' + q(d1, 'mm') + ' (비유전율 ' + n(e1) + ') 와 두께 ' + q(d2, 'mm') + ' (비유전율 ' + n(e2) + ') 의 유전체를 극판과 평행하게 겹쳐 넣었어. 정전용량은 약 몇 pF야? (ε₀ = 8.855 × 10⁻¹² F/m)',
        formula: 'C = ε0·S / (d1/εr1 + d2/εr2)',
        unit: 'pF',
        decimals: 2,
        answer: C,
        distractors: [
          { v: (EPS0 * S * 1e-4) / ((d1 + d2) * 1e-3) * 1e12 * ((e1 + e2) / 2), why: '두 유전체의 평균 비유전율을 쓰고 두께를 합쳤어. 겹친 층은 콘덴서 직렬 연결이라 d/εr를 각각 더해야 해.' },
          { v: (EPS0 * S * 1e-4) / ((d1 / e1) * 1e-3) * 1e12 + (EPS0 * S * 1e-4) / ((d2 / e2) * 1e-3) * 1e12, why: '두 층의 정전용량을 그냥 더했어(병렬 계산). 겹친 층은 직렬이라 d/εr를 더해서 한 번에 구해.' },
          { v: (EPS0 * S * 1e-4) / ((d1 * e1 + d2 * e2) * 1e-3) * 1e12, why: 'εr를 분모에 곱했어. 정전용량은 ε에 비례하니까 d/εr 꼴로 넣어야 해.' },
          { v: C * 1e-4 * 1e4 * 100, why: 'cm²를 m²로 바꾸는 걸 잘못했어. 1 cm² = 10⁻⁴ m² 이야.' },
          { v: C / 100, why: 'mm → m, cm² → m² 환산 중 하나를 빠뜨렸어. 1 mm = 10⁻³ m, 1 cm² = 10⁻⁴ m².' },
        ],
        conclusion: 'C = ε0·S ÷ (d1/εr1 + d2/εr2) = ' + q(C, 'pF', 2),
        steps: ['겹쳐 넣은 층은 극판 사이에 콘덴서가 직렬로 이어진 것과 같아.', 'd1/εr1 + d2/εr2 = ' + n(d1) + '/' + n(e1) + ' + ' + n(d2) + '/' + n(e2) + ' = ' + n(sum, 4) + ' mm.', 'C = 8.855×10⁻¹² × ' + n(S * 1e-4, 4) + ' ÷ (' + n(sum, 4) + '×10⁻³) = ' + q(C, 'pF', 2) + '.'],
        check: '두 층을 모두 공기(εr = 1)로 치면 C는 더 작아지니까, 유전체를 넣은 이 값이 더 커야 해.',
        traps: ['층을 극판과 평행하게 쌓으면 직렬(d/εr 합), 극판에 수직으로 나란히 채우면 병렬(면적비)이야.', 'cm²·mm 단위를 m로 먼저 바꿔.'],
      };
    },
  });

  T({
    id: 'di-angle',
    concept: 'dielectric',
    gen(r) {
      const th1 = r.pick([20, 30, 40, 45, 50, 60]);
      const e1 = r.pick([1, 2, 3, 4, 5, 6]);
      const e2 = r.pick([1, 2, 3, 4, 5, 6, 8, 10]);
      if (e1 === e2) return this.gen(r);
      const th2 = deg(Math.atan((Math.tan(rad(th1)) * e2) / e1));
      return {
        params: { th1, e1, e2 },
        text: '비유전율 ' + n(e1) + ' 인 유전체 속의 전기력선이 경계면의 법선과 ' + q(th1, '°') + ' 의 각으로 비유전율 ' + n(e2) + ' 인 유전체로 들어갔어. 두 번째 유전체 안에서 법선과 이루는 각은 약 몇 도야?',
        formula: 'tanθ1 / tanθ2 = ε1 / ε2  →  θ2 = atan(tanθ1 · ε2/ε1)',
        unit: '°',
        decimals: 2,
        answer: th2,
        distractors: [
          { v: deg(Math.atan((Math.tan(rad(th1)) * e1) / e2)), why: 'ε1/ε2를 거꾸로 썼어. tanθ2 = tanθ1 × (ε2/ε1) 이야(유전율이 큰 쪽의 각이 커).' },
          { v: (th1 * e2) / e1, why: '각도 자체의 비로 풀었어. 각이 아니라 tan 값의 비가 유전율 비와 같아.' },
          { v: deg(Math.asin(Math.min(1, (Math.sin(rad(th1)) * e2) / e1))), why: 'sin으로 풀었어. 경계 조건은 tan의 비야(전계 접선 성분 연속 + 전속밀도 법선 성분 연속).' },
          { v: deg(Math.atan((Math.tan(rad(th1)) * Math.sqrt(e2 / e1)))), why: '유전율 비의 제곱근을 썼어. 비 그대로(ε2/ε1)를 써야 해.' },
          { v: 90 - th1, why: '입사각의 여각을 썼어. 경계면에서 꺾이는 각은 유전율 비로 정해져.' },
        ],
        conclusion: 'tanθ2 = tan' + n(th1) + '° × ' + n(e2) + '/' + n(e1) + ' → θ2 = ' + q(th2, '°', 2),
        steps: ['전계의 접선 성분과 전속밀도의 법선 성분이 연속이라 tanθ1/tanθ2 = ε1/ε2.', 'tanθ2 = tanθ1 × ε2/ε1 = ' + n(Math.tan(rad(th1)), 4) + ' × ' + n(e2) + '/' + n(e1) + ' = ' + n((Math.tan(rad(th1)) * e2) / e1, 4) + '.', 'θ2 = tan⁻¹(' + n((Math.tan(rad(th1)) * e2) / e1, 4) + ') = ' + q(th2, '°', 2) + '.'],
        check: e2 > e1 ? '유전율이 커졌으니 각도 커졌어(' + n(th1) + '° → ' + n(th2, 2) + '°).' : '유전율이 작아졌으니 각도 작아졌어(' + n(th1) + '° → ' + n(th2, 2) + '°).',
        traps: ['각은 경계면이 아니라 "법선"과 이루는 각이야.', '유전율이 큰 쪽에서 법선과의 각이 더 커져.'],
      };
    },
  });

  // ───────── 철손 ─────────
  T({
    id: 'cl-loss',
    concept: 'mc-core-loss',
    gen(r) {
      const kind = r.pick(['hys', 'eddy']);
      const mode = r.pick(['B', 'f']);
      const P1 = r.pick([100, 150, 200, 250, 400, 500, 800, 1000]);
      const k = r.pick([0.8, 0.9, 1.1, 1.2, 1.25, 1.5, 2]);
      let ans;
      let text;
      let form;
      let steps;
      let dis;
      const nm = kind === 'hys' ? '히스테리시스손' : '와류손';
      if (mode === 'B') {
        ans = kind === 'hys' ? P1 * Math.pow(k, 1.6) : P1 * k * k;
        text = '주파수와 철심 모양은 그대로 두고 최대 자속밀도 Bm 만 ' + n(k) + '배로 바꿨어. 처음 ' + nm + ' 이 ' + q(P1, 'W') + ' 였다면 지금은 약 몇 W야?';
        form = kind === 'hys' ? 'Ph ∝ f · Bm^1.6' : 'Pe ∝ f² · Bm²';
        steps = ['f는 그대로니까 Bm 의 지수만 보면 돼.', kind === 'hys' ? 'Ph 는 Bm^1.6 에 비례 → ' + n(k) + '^1.6 = ' + n(Math.pow(k, 1.6), 4) + '배.' : 'Pe 는 Bm² 에 비례 → ' + n(k) + '² = ' + n(k * k, 4) + '배.', n(P1) + ' × ' + n(kind === 'hys' ? Math.pow(k, 1.6) : k * k, 4) + ' = ' + q(ans, 'W', 3) + '.'];
        dis =
          kind === 'hys'
            ? [
                { v: P1 * k, why: 'Bm 지수를 1로 봤어. 히스테리시스손은 Bm^1.6(스타인메츠 상수)에 비례해.' },
                { v: P1 * k * k, why: '이건 와류손의 지수(Bm²)야. 히스테리시스손은 Bm^1.6.' },
                { v: P1 * Math.pow(k, 0.6), why: '지수를 0.6으로 잘못 외웠어. 1.6이야.' },
                { v: P1 * Math.pow(k, 3.2), why: '1.6을 두 번 곱했어. 지수는 1.6 한 번이야.' },
              ]
            : [
                { v: P1 * k, why: 'Bm 지수를 1로 봤어. 와류손은 Bm²에 비례해.' },
                { v: P1 * Math.pow(k, 1.6), why: '이건 히스테리시스손의 지수(1.6)야. 와류손은 Bm².' },
                { v: P1 * k * k * k, why: 'Bm³ 으로 계산했어. 지수는 2야.' },
                { v: P1 / (k * k), why: '반대로 나눴어. Bm이 늘면 손실도 늘어.' },
              ];
      } else {
        ans = kind === 'hys' ? P1 * Math.pow(k, -0.6) : P1;
        text = '변압기에 가하는 전압을 일정하게 두고 주파수만 ' + n(k) + '배로 바꿨어. 처음 ' + nm + ' 이 ' + q(P1, 'W') + ' 였다면 지금은 약 몇 W야?';
        form = kind === 'hys' ? 'V 일정 → Bm ∝ 1/f → Ph ∝ f·f^(−1.6) = f^(−0.6)' : 'V 일정 → Pe ∝ f²·(1/f)² = 일정';
        steps =
          kind === 'hys'
            ? ['V = 4.44·f·N·φm 에서 전압이 일정하면 Bm ∝ 1/f.', 'Ph ∝ f·Bm^1.6 = f·f^(−1.6) = f^(−0.6).', n(P1) + ' × ' + n(k) + '^(−0.6) = ' + n(P1) + ' × ' + n(Math.pow(k, -0.6), 4) + ' = ' + q(ans, 'W', 3) + '.']
            : ['V = 4.44·f·N·φm 에서 전압이 일정하면 Bm ∝ 1/f.', 'Pe ∝ f²·Bm² = f²·(1/f)² 이라서 주파수와 상관없이 일정.', '그대로 ' + q(ans, 'W', 3) + '.'];
        dis =
          kind === 'hys'
            ? [
                { v: P1 * k, why: 'Bm이 변하는 걸 잊고 f에만 비례한다고 봤어. 전압 일정이면 Bm ∝ 1/f.' },
                { v: P1 * Math.pow(k, 0.6), why: '부호를 잘못 썼어. 지수는 −0.6이라서 주파수가 올라가면 손실이 줄어.' },
                { v: P1 / (k * k), why: '와류손에 쓰는 f²로 계산했어. 히스테리시스손은 f^(−0.6).' },
                { v: P1 * Math.pow(k, 1.6), why: 'Bm이 바뀌지 않는다고 보고 1.6을 곱했어. 전압이 일정하면 Bm ∝ 1/f 라서 지수가 −0.6.' },
              ]
            : [
                { v: P1 * k * k, why: 'Bm이 일정하다고 보고 f²을 곱했어. 전압 일정이면 Bm ∝ 1/f 이라서 f²·(1/f)² = 일정.' },
                { v: P1 * k, why: '와류손이 f에 비례한다고 봤어. 와류손은 f²·Bm²이라서 이 경우 변하지 않아.' },
                { v: P1 / (k * k), why: 'Bm만 반영하고 f²는 빠뜨렸어. 둘이 상쇄돼서 변하지 않아.' },
                { v: P1 * Math.pow(k, -0.6), why: '히스테리시스손의 지수(−0.6)를 썼어. 와류손은 변하지 않아.' },
              ];
      }
      return {
        params: { kind, mode, P1, k },
        text,
        formula: form,
        unit: 'W',
        decimals: 3,
        answer: ans,
        distractors: dis,
        conclusion: nm + ' = ' + q(ans, 'W', 3),
        steps,
        check: kind === 'eddy' && mode === 'f' ? '와류손은 전압이 일정하면 주파수가 변해도 그대로야.' : nm + '이 ' + (ans > P1 ? '늘' : '줄') + '어드는 방향이 식과 일치해.',
        traps: ['히스테리시스손은 f·Bm^1.6, 와류손은 f²·Bm²이야.', '전압이 일정하면 Bm ∝ 1/f 로 바뀐다는 걸 기억해.'],
      };
    },
  });

  // ───────── 동기발전기 출력·단락비 ─────────
  T({
    id: 'so-power',
    concept: 'mc-sync-out',
    gen(r) {
      const V = r.pick([6.6, 11, 22, 33, 66]);
      const ratio = r.pick([1.1, 1.2, 1.3, 1.4, 1.5]);
      const E = V * ratio;
      const Xs = r.pick([2, 3, 4, 5, 8, 10]);
      const d = r.pick([15, 20, 30, 45, 60]);
      const P = ((V * E) / Xs) * Math.sin(rad(d));
      return {
        params: { V, E, Xs, d },
        text: '3상 동기발전기의 단자 선간전압이 ' + q(V, 'kV') + ', 선간 유기기전력이 ' + q(E, 'kV', 3) + ', 1상의 동기리액턴스가 ' + q(Xs, 'Ω') + ' 이고 부하각이 ' + q(d, '°') + ' 일 때 출력은? (전기자 저항 무시)',
        formula: 'P = V·E·sinδ / Xs  [kV·kV÷Ω = MW]',
        unit: 'MW',
        decimals: 3,
        answer: P,
        distractors: [
          { v: (3 * V * E * Math.sin(rad(d))) / Xs, why: '선간전압 값에 3을 곱했어. 선간전압을 쓸 때는 V·E/Xs 만으로 3상 전력이 돼(3과 1/√3·1/√3이 약분).' },
          { v: (V * E) / Xs, why: 'sinδ를 곱하는 걸 빼먹었어. 출력은 부하각에 따라 변해.' },
          { v: ((V * E) / Xs) * Math.cos(rad(d)), why: 'sin 대신 cos를 썼어. 출력은 sinδ에 비례해(δ = 90°에서 최대).' },
          { v: (V * E * Math.sin(rad(d))) / (SQ3 * Xs), why: 'SQ3로 나눠서 1상 전력처럼 계산했어. 선간전압이면 V·E·sinδ ÷ Xs 가 3상 전력이야.' },
          { v: (V * E * Math.sin(rad(d))) / (Xs * 1000), why: 'kV를 V로 바꿔 놓고 MW 변환을 중복했어. kV·kV÷Ω은 바로 MW야.' },
        ],
        conclusion: 'P = ' + n(V) + ' × ' + n(E, 3) + ' ÷ ' + n(Xs) + ' × sin' + n(d) + '° = ' + q(P, 'MW', 3),
        steps: ['3상 출력 P = V·E·sinδ ÷ Xs (V, E는 선간값).', 'V·E ÷ Xs = ' + n(V) + ' × ' + n(E, 3) + ' ÷ ' + n(Xs) + ' = ' + n((V * E) / Xs, 4) + '.', '× sin' + n(d) + '° = ' + q(P, 'MW', 3) + '.'],
        check: 'δ = 90°이면 최대 ' + n((V * E) / Xs, 3) + ' MW 이고 이 값은 그보다 작아.',
        traps: ['선간값으로 쓰면 3상 전력이 V·E·sinδ/Xs (3은 필요 없어).', '출력은 δ = 90°에서 최대이고 그 이상은 불안정해.'],
      };
    },
  });

  T({
    id: 'so-scr',
    concept: 'mc-sync-out',
    gen(r) {
      const mode = r.pick(['z', 'f']);
      if (mode === 'z') {
        const z = r.pick([50, 60, 80, 100, 125, 150, 200]);
        const K = 100 / z;
        return {
          params: { mode, z },
          text: '정격 상태에서 %동기임피던스가 ' + q(z, '%') + ' 인 동기발전기의 단락비는?',
          formula: 'K = 100 / %Zs',
          unit: '',
          decimals: 4,
          answer: K,
          distractors: [
            { v: z / 100, why: '역수를 취하지 않았어. 단락비는 %동기임피던스의 역수(K = 100/%Zs)야.' },
            { v: z, why: '%Zs를 그대로 썼어. 단락비는 100을 %Zs로 나눈 값이야.' },
            { v: 1 / z, why: '100을 곱하는 걸 빼먹었어. K = 100/%Zs.' },
            { v: (100 - z) / 100, why: '%Zs를 100에서 뺐어. 단락비는 K = 100 ÷ %Zs.' },
          ],
          conclusion: 'K = 100 ÷ ' + n(z) + ' = ' + q(K, '', 4),
          steps: ['단락비 K는 %동기임피던스(%Zs)의 역수 × 100 이야.', '100 ÷ ' + n(z) + ' = ' + q(K, '', 4) + '.'],
          check: K + ' × ' + n(z) + '% = ' + n(K * z, 3) + ' → 100%.',
          traps: ['단락비가 클수록 %Zs가 작고 전압변동률이 작아.', 'K = 1/Zs[pu] = 100/%Zs.'],
        };
      }
      const If1 = r.pick([100, 120, 150, 200, 250]);
      const If2 = r.pick([80, 100, 125, 160, 200]);
      const K = If1 / If2;
      return {
        params: { mode, If1, If2 },
        text: '무부하에서 정격전압을 내는 데 필요한 계자전류가 ' + q(If1, 'A') + ', 3상 단락시험에서 정격전류가 흐르는 데 필요한 계자전류가 ' + q(If2, 'A') + ' 인 동기발전기의 단락비는?',
        formula: 'K = If1 / If2 (If1: 무부하 정격전압 계자전류, If2: 단락 정격전류 계자전류)',
        unit: '',
        decimals: 4,
        answer: K,
        distractors: [
          { v: If2 / If1, why: '분자와 분모를 바꿨어. 단락비 = 무부하 정격전압 계자전류 ÷ 단락 정격전류 계자전류.' },
          { v: If1 * If2, why: '두 계자전류를 곱했어. 단락비는 두 계자전류의 비야.' },
          { v: If1 - If2, why: '차를 구했어. 단락비는 비(나눗셈)야.' },
          { v: (If1 + If2) / If2, why: '합을 분자로 썼어. K = If1 ÷ If2.' },
        ],
        conclusion: 'K = If1 ÷ If2 = ' + n(If1) + ' ÷ ' + n(If2) + ' = ' + q(K, '', 4),
        steps: ['단락비는 무부하 포화 곡선에서 정격전압을 내는 계자전류(If1)와 단락 곡선에서 정격전류를 내는 계자전류(If2)의 비야.', n(If1) + ' ÷ ' + n(If2) + ' = ' + q(K, '', 4) + '.'],
        check: '%Zs = 100 ÷ K = ' + n(100 / K, 3) + ' % 가 되는데 일반 범위(60~200 %)와 맞아.',
        traps: ['If1 이 무부하 정격전압, If2 가 단락 정격전류 쪽이야(순서 주의).', '단락비가 큰 기계는 무겁고 비싸지만 안정도가 좋아.'],
      };
    },
  });

  // ───────── 보호계전기 ─────────
  T({
    id: 'rl-tap',
    concept: 'pw-relay',
    gen(r) {
      const I1n = r.pick([100, 150, 200, 300, 400, 600]);
      const IL = r.pick([60, 80, 100, 120, 150, 180, 240, 300, 360, 480]);
      const k = r.pick([1.2, 1.25, 1.3, 1.5]);
      const tap = (IL * k * 5) / I1n;
      return {
        params: { I1n, IL, k },
        text: '변류비 ' + n(I1n) + '/5 A 인 CT에 과전류 계전기(OCR)를 달았어. 부하전류가 ' + q(IL, 'A') + ' 이고 설정값을 부하전류의 ' + n(k) + '배로 잡을 때 계전기의 동작 전류(탭 전류, 2차 기준)는 몇 A야?',
        formula: '동작 전류 = 부하전류 × 설정배수 × (2차 정격 5 A ÷ 1차 정격)',
        unit: 'A',
        decimals: 3,
        answer: tap,
        distractors: [
          { v: IL * k, why: 'CT비로 환산하지 않았어. 계전기는 CT 2차 전류를 받아서 동작하므로 변류비로 나눠야 해.' },
          { v: (IL * 5) / I1n, why: '설정배수(여유)를 곱하는 걸 빼먹었어. 보통 부하전류의 1.2~1.5배로 정정해.' },
          { v: (IL * k * I1n) / 5, why: 'CT비를 거꾸로 곱했어. 2차 전류는 1차 전류 ÷ 변류비 (= × 5/1차 정격).' },
          { v: (IL * k) / 5, why: '변류비를 1차÷2차(=' + n(I1n / 5) + ')로 쓰지 않고 5로만 나눴어. 변류비는 ' + n(I1n) + '/5 = ' + n(I1n / 5) + ' 이야.' },
          { v: (IL / k * 5) / I1n, why: '배수로 나눴어. 오동작을 막으려고 부하전류보다 크게(곱해서) 정정해야 해.' },
        ],
        conclusion: '동작 전류 = ' + n(IL) + ' × ' + n(k) + ' × 5/' + n(I1n) + ' = ' + q(tap, 'A', 3),
        steps: ['CT 변류비 = ' + n(I1n) + '/5 = ' + n(I1n / 5) + ' 이야.', '계전기에 들어오는 2차 전류 = 부하전류 ÷ 변류비 = ' + n(IL) + ' ÷ ' + n(I1n / 5) + ' = ' + n(IL / (I1n / 5), 3) + ' A.', '설정배수 ' + n(k) + '를 곱하면 ' + q(tap, 'A', 3) + '.'],
        check: tap + ' A × 변류비 ' + n(I1n / 5) + ' = ' + n(tap * (I1n / 5), 3) + ' A ≈ 부하전류의 ' + n(k) + '배(' + n(IL * k, 3) + ' A).',
        traps: ['OCR 탭은 CT 2차 값 기준이야.', '실제 정정은 이 값에 가장 가까운(또는 위의) 표준 탭으로 정해.'],
      };
    },
  });

  T({
    id: 'rl-ct',
    concept: 'pw-relay',
    gen(r) {
      const I1n = r.pick([100, 150, 200, 300, 400, 600, 800]);
      const I1 = r.pick([40, 60, 75, 80, 100, 120, 150, 200, 240, 300, 360, 480, 600]);
      const i2 = (I1 * 5) / I1n;
      return {
        params: { I1n, I1 },
        text: '변류비가 ' + n(I1n) + '/5 A 인 CT가 달린 선로에 ' + q(I1, 'A') + ' 가 흐를 때 CT 2차에 연결된 전류계는 몇 A를 가리켜?',
        formula: 'I2 = I1 × (5 / I1n)',
        unit: 'A',
        decimals: 3,
        answer: i2,
        distractors: [
          { v: (I1 * I1n) / 5, why: '변류비를 거꾸로 곱했어. 2차 전류 = 1차 전류 ÷ 변류비 (변류비 = ' + n(I1n / 5) + ').' },
          { v: I1 / 5, why: '변류비를 5로만 봤어. 변류비는 1차÷2차 = ' + n(I1n) + '÷5 = ' + n(I1n / 5) + ' 야.' },
          { v: I1 * 5, why: '2차 정격(5 A)을 그대로 곱했어. 1차 정격으로 나눠야 해.' },
          { v: I1n / I1, why: '정격 전류와 선로 전류 비를 거꾸로 잡았어. 2차 = 선로 전류 × 5 ÷ 1차 정격.' },
          { v: I1 / I1n, why: '5를 곱하는 걸 빼먹었어. 2차 정격이 5 A 이니까 × 5.' },
        ],
        conclusion: 'I2 = ' + n(I1) + ' × 5 ÷ ' + n(I1n) + ' = ' + q(i2, 'A', 3),
        steps: ['변류비 = 1차 정격 ÷ 2차 정격 = ' + n(I1n) + ' ÷ 5 = ' + n(I1n / 5) + '.', '2차 전류 = 1차 전류 ÷ 변류비 = ' + n(I1) + ' ÷ ' + n(I1n / 5) + ' = ' + q(i2, 'A', 3) + '.'],
        check: '정격 전류(' + n(I1n) + ' A)가 흐르면 2차가 5 A가 되는지 보면: ' + n(I1n) + ' ÷ ' + n(I1n / 5) + ' = 5 A. 맞아.',
        traps: ['변류기 2차는 절대 개방하면 안 돼(고전압 발생).', '변류비 = 1차 정격 ÷ 2차 정격이고, 2차 전류는 이 비로 나눠서 구해.'],
      };
    },
  });

  // ───────── 서지(진행파) ─────────
  T({
    id: 'sg-wave',
    concept: 'pw-surge',
    gen(r) {
      const Z1 = r.pick([300, 400, 500]);
      const Z2 = r.pick([30, 40, 50, 60, 100, 800, 1000]);
      const e = r.pick([100, 150, 200, 300, 500]);
      const refl = r.chance(0.5);
      const er = ((Z2 - Z1) / (Z2 + Z1)) * e;
      const et = ((2 * Z2) / (Z2 + Z1)) * e;
      const ans = refl ? Math.abs(er) : et;
      const dis = refl
        ? [
            { v: et, why: '이건 투과 전압이야(2Z2/(Z1+Z2) × e). 반사 전압은 (Z2 − Z1)/(Z2 + Z1) × e 야.' },
            { v: (Z2 / (Z1 + Z2)) * e, why: '분자를 Z2 하나로 썼어. 반사는 (Z2 − Z1) ÷ (Z2 + Z1).' },
            { v: ((Z2 + Z1) / Math.abs(Z2 - Z1)) * e, why: '분자·분모를 거꾸로 썼어. 반사계수는 1 이하야.' },
            { v: ((Z1 - Z2) / Z1) * e, why: '분모가 Z1 하나가 아니라 Z1 + Z2야.' },
            { v: Math.abs(er) * 2, why: '2배 꼴은 투과 전압 공식에서 나와. 반사는 2를 곱하지 않아.' },
          ]
        : [
            { v: Math.abs(er), why: '이건 반사 전압의 크기야. 투과 전압은 2Z2/(Z1 + Z2) × e 야.' },
            { v: (Z2 / (Z1 + Z2)) * e, why: '2를 곱하는 걸 빼먹었어. 투과계수는 2Z2/(Z1 + Z2) 야.' },
            { v: ((2 * Z1) / (Z1 + Z2)) * e, why: 'Z1과 Z2를 바꿨어. 투과는 넘어가는 쪽 임피던스 Z2가 분자야.' },
            { v: e + Math.abs(er) * (er < 0 ? 1 : 0) + er, why: '입사에 반사를 더하는 방식은 맞는데 부호를 정확히 따라야 해(반사가 음수면 빼). 투과 = 입사 + 반사.' },
            { v: e * (1 + Math.abs(er) / e * 0 + 1), why: '단순히 2배를 곱했어. 투과는 임피던스 비에 따라 정해져.' },
          ];
      return {
        params: { Z1, Z2, Ei: e, refl },
        text: '특성임피던스 ' + q(Z1, 'Ω') + ' 인 가공선로를 따라 ' + q(e, 'kV') + ' 의 서지가 진행하다가 특성임피던스 ' + q(Z2, 'Ω') + ' 인 선로(또는 기기) 접속점에 도달했어. ' + (refl ? '반사파 전압의 크기는?' : '접속점을 넘어가는 투과파 전압은?'),
        formula: refl ? '반사 e_r = (Z2 − Z1)/(Z2 + Z1) · e' : '투과 e_t = 2Z2/(Z2 + Z1) · e',
        unit: 'kV',
        decimals: 3,
        answer: ans,
        distractors: dis,
        conclusion: refl ? '|e_r| = |' + n(Z2) + ' − ' + n(Z1) + '| ÷ (' + n(Z2) + ' + ' + n(Z1) + ') × ' + n(e) + ' = ' + q(ans, 'kV', 3) : 'e_t = 2 × ' + n(Z2) + ' ÷ (' + n(Z2) + ' + ' + n(Z1) + ') × ' + n(e) + ' = ' + q(ans, 'kV', 3),
        steps: refl
          ? ['반사계수 = (Z2 − Z1) ÷ (Z2 + Z1) = (' + n(Z2) + ' − ' + n(Z1) + ') ÷ (' + n(Z2) + ' + ' + n(Z1) + ') = ' + n((Z2 - Z1) / (Z2 + Z1), 4) + '.', '반사 전압 = 계수 × 입사 전압 = ' + n(er, 3) + ' kV' + (er < 0 ? ' (음수는 극성이 반대)' : '') + '.', '크기는 ' + q(ans, 'kV', 3) + '.']
          : ['투과계수 = 2Z2 ÷ (Z2 + Z1) = 2 × ' + n(Z2) + ' ÷ ' + n(Z2 + Z1) + ' = ' + n((2 * Z2) / (Z2 + Z1), 4) + '.', '투과 전압 = 계수 × 입사 전압 = ' + q(ans, 'kV', 3) + '.'],
        check: refl ? '투과 = 입사 + 반사 = ' + n(e, 3) + ' + (' + n(er, 3) + ') = ' + n(e + er, 3) + ' kV 로 투과 공식 값 ' + n(et, 3) + ' 와 같아.' : '입사 ' + n(e) + ' kV 에 반사 ' + n(er, 3) + ' kV 를 더한 값 ' + n(e + er, 3) + ' 과 같아.',
        traps: ['Z2가 작으면(케이블·변압기 쪽) 반사가 음수라 전압이 낮아지고, Z2가 크면 반사가 양수라 전압이 올라가.', '투과 전압 = 입사 + 반사야.'],
      };
    },
  });

  T({
    id: 'sg-time',
    concept: 'pw-surge',
    gen(r) {
      const cable = r.chance(0.4);
      const d = r.pick([3, 6, 9, 15, 30, 45, 60]);
      const er = cable ? r.pick([2.25, 4, 9]) : 1;
      const v = 300 / Math.sqrt(er); // m/μs
      const t = (d * 1000) / v;
      return {
        params: { d, er, cable },
        text: (cable ? '비유전율 ' + n(er) + ' 인 절연체를 쓰는 지중 케이블에서 ' : '가공선로에서 ') + q(d, 'km') + ' 떨어진 곳의 서지가 진행해 오는 데 걸리는 시간은 약 몇 μs야? (진공의 광속 3×10⁸ m/s, 비투자율 1)',
        formula: cable ? 'v = c/√εr,   t = d / v' : 'v = c = 300 m/μs,   t = d / v',
        unit: 'μs',
        decimals: 3,
        answer: t,
        distractors: cable
          ? [
              { v: (d * 1000) / 300, why: '케이블 속에서도 광속으로 계산했어. 절연체 속에서는 속도가 c/√εr 로 느려져.' },
              { v: (d * 1000 * er) / 300, why: 'εr를 그대로 곱했어. 속도는 c/√εr 이라서 시간은 √εr 배가 돼.' },
              { v: (d * 1000) / (300 * Math.sqrt(er)), why: '속도 대신 시간 쪽에 √εr를 거꾸로 적용했어. 느려지니까 시간이 √εr배 늘어.' },
              { v: (d * 1000) / (300 / er), why: 'εr를 제곱근 없이 썼어. v = c/√εr.' },
            ]
          : [
              { v: d / 0.3 / 1000, why: '단위를 잘못 바꿨어. 1 km = 1000 m 이고 300 m/μs 로 나눠야 해.' },
              { v: d * 300, why: '곱했어. 시간 = 거리 ÷ 속도야.' },
              { v: (d * 1000) / 3, why: '속도를 3 m/μs 로 잘못 읽었어. 3×10⁸ m/s = 300 m/μs.' },
              { v: (d * 1000) / 30, why: '속도를 30 m/μs 로 잘못 읽었어. 3×10⁸ m/s = 300 m/μs.' },
            ],
        conclusion: 't = d ÷ v = ' + n(d) + ' km ÷ ' + n(v, 3) + ' m/μs = ' + q(t, 'μs', 3),
        steps: [cable ? '케이블 속 속도 v = c/√εr = 300 ÷ √' + n(er) + ' = ' + n(v, 3) + ' m/μs.' : '가공선로는 광속과 같아서 v = 3×10⁸ m/s = 300 m/μs.', 'd = ' + n(d) + ' km = ' + n(d * 1000) + ' m.', 't = d ÷ v = ' + n(d * 1000) + ' ÷ ' + n(v, 3) + ' = ' + q(t, 'μs', 3) + '.'],
        check: cable ? '가공선로(' + n((d * 1000) / 300, 3) + ' μs)보다 느리니까 시간이 더 걸려야 해.' : '1 km 당 약 3.33 μs 라는 걸 외워 두면 ' + n(d) + ' km 에서 ' + n(d * 3.3333, 2) + ' μs 로 맞아.',
        traps: ['가공선로 진행파 속도는 광속(300 m/μs ≈ 0.3 m/ns).', '케이블은 절연체 때문에 속도가 광속보다 느려(c/√εr).'],
      };
    },
  });

  // ───────── 배전 전선량 ─────────
  T({
    id: 'wr-ratio',
    concept: 'pw-wires',
    gen(r) {
      const meth = r.pick(['1p3w', '3p3w', '3p4w']);
      const W = r.pick([100, 120, 200, 240, 300, 400, 480, 600, 800, 900, 1200]);
      const ratio = { '1p3w': 3 / 8, '3p3w': 3 / 4, '3p4w': 1 / 3 }[meth];
      const name = { '1p3w': '단상 3선식', '3p3w': '3상 3선식', '3p4w': '3상 4선식' }[meth];
      const ans = W * ratio;
      const others = { '1p3w': [3 / 4, 1 / 3], '3p3w': [3 / 8, 1 / 3], '3p4w': [3 / 8, 3 / 4] }[meth];
      const names = { '1p3w': ['3상 3선식', '3상 4선식'], '3p3w': ['단상 3선식', '3상 4선식'], '3p4w': ['단상 3선식', '3상 3선식'] }[meth];
      return {
        params: { meth, W },
        text: '부하 전압, 전력, 선로 손실, 전선 길이와 재질이 모두 같다고 할 때 단상 2선식에 필요한 전선 총 무게가 ' + q(W, 'kg') + ' 라면 ' + name + '에 필요한 전선 총 무게는? (중성선은 외선과 같은 굵기)',
        formula: '단상2선 100 %: 단상3선 37.5 %,  3상3선 75 %,  3상4선 33.3 %',
        unit: 'kg',
        decimals: 3,
        answer: ans,
        distractors: [
          { v: W * others[0], why: '이건 ' + names[0] + '의 소요량 비율을 곱한 값이야.' },
          { v: W * others[1], why: '이건 ' + names[1] + '의 소요량 비율을 곱한 값이야.' },
          { v: W, why: '방식이 달라지면 전선량이 달라져. 단상 2선식 값 그대로가 아니야.' },
          { v: W * (1 - ratio), why: '남는 비율(절약된 양)을 구했어. 필요한 전선량은 ' + name + ' 비율 그대로야.' },
        ],
        conclusion: name + ' = ' + n(W) + ' × ' + n(ratio * 100, 2) + ' % = ' + q(ans, 'kg', 3),
        steps: ['같은 전력·같은 손실이면 전류가 작을수록 전선을 가늘게 쓸 수 있어.', name + '의 전선량은 단상 2선식의 ' + n(ratio * 100, 2) + ' % 야.', n(W) + ' × ' + n(ratio, 4) + ' = ' + q(ans, 'kg', 3) + '.'],
        check: '3상 4선식(33.3 %)이 가장 적고, 단상 2선식(100 %)이 가장 많아.',
        traps: ['순서는 단상2선 100 > 3상3선 75 > 단상3선 37.5 > 3상4선 33.3 %.', '조건(전압·전력·손실·거리 동일)과 중성선 굵기를 확인해.'],
      };
    },
  });

  // ───────── 이론형 ─────────
  S({
    id: 'st-fp-sym',
    concepts: ['fourport'],
    text: '4단자망에서 A = D 가 성립하는 회로는?',
    choices: [
      { label: '입력 단자와 출력 단자를 바꿔도 같은 대칭 회로', why: '정답이야. 좌우 대칭이면 입력 쪽과 출력 쪽을 바꿔도 같아서 A = D가 돼.' },
      { label: '모든 가역(상반) 회로', why: '상반 회로는 AD − BC = 1 이 항상 성립하지만 A = D는 대칭일 때만이야.' },
      { label: '직렬 임피던스 하나만 있는 회로', why: '직렬 Z 하나는 A = D = 1 이라서 성립은 하지만 "A = D가 되는 조건"은 대칭이야(병렬 Y 하나도 A = D = 1).' },
      { label: '병렬 어드미턴스가 없는 회로', why: 'Y가 없다고 A = D가 되는 건 아니야. 좌우 구조가 같은지가 조건이야.' },
    ],
    answer: 0,
    formula: '대칭: A = D,   상반(가역): AD − BC = 1',
    conclusion: '좌우가 대칭인 4단자망이면 A = D가 성립해.',
    steps: ['4단자 정수 A와 D는 각각 입력 쪽, 출력 쪽에서 본 전압비·전류비와 관련돼.', '입력과 출력을 바꿔도 같으면 A = D.', '상반 회로의 AD − BC = 1 과는 별개의 조건이야.'],
    check: 'T형에서 Z1 = Z2 이면 A = 1 + Z1·Y = D 가 돼.',
    traps: ['상반(AD − BC = 1)과 대칭(A = D)을 구분해.'],
  });

  S({
    id: 'st-tx-free',
    concepts: ['txline'],
    text: '분포정수 선로에서 파형이 일그러지지 않고 전달되는 조건(무왜 조건)은?',
    choices: [
      { label: 'RC = LG (R/L = G/C)', why: '정답이야. 저항·누설 컨덕턴스 비와 인덕턴스·정전용량 비가 같아야 주파수에 따라 감쇠가 달라지지 않아.' },
      { label: 'R = G', why: '저항과 컨덕턴스의 크기가 같다고 해서 무왜가 되지 않아. L과 C의 비까지 맞아야 해.' },
      { label: 'L = C', why: '단위가 다른 L과 C를 같게 할 수는 없어. 조건은 RC = LG 야.' },
      { label: 'RL = GC', why: '곱의 짝을 잘못 맞췄어. RC = LG 야(R과 C, L과 G를 곱해).' },
    ],
    answer: 0,
    formula: '무왜 조건: R·C = L·G',
    conclusion: '무왜 선로 조건은 RC = LG 야.',
    steps: ['선로의 감쇠 정수가 주파수와 무관하려면 R/L = G/C 이어야 해.', '교차곱하면 RC = LG.', '이때 위상 속도도 주파수에 무관해져서 파형이 일그러지지 않아.'],
    check: '무손실(R = G = 0) 선로는 이 조건을 자동으로 만족해.',
    traps: ['R·C와 L·G가 짝이야(R/L = G/C).'],
  });

  S({
    id: 'st-sc-bal',
    concepts: ['symcomp'],
    text: '평형 3상 전압의 대칭분에 대한 설명으로 옳은 것은?',
    choices: [
      { label: '정상분만 있고 영상분과 역상분은 0이다', why: '정답이야. 평형이면 크기가 같고 120°씩 어긋나서 영상분·역상분이 상쇄돼.' },
      { label: '영상분만 있다', why: '영상분은 세 상이 같은 위상으로 있을 때(예: 지락)의 성분이라 평형 3상에는 없어.' },
      { label: '역상분만 있다', why: '역상분은 상순이 반대인 성분으로 불평형에서 생겨. 평형에는 없어.' },
      { label: '정상분·역상분·영상분이 모두 같은 크기로 있다', why: '세 성분이 모두 같은 건 1선 지락 같은 특별한 불평형이야.' },
    ],
    answer: 0,
    formula: '평형 3상: V0 = V2 = 0,   V1 = Va',
    conclusion: '평형 3상에는 정상분만 있어.',
    steps: ['V0 = (Va + Vb + Vc)/3 = 0 (평형이면 세 상의 합이 0).', 'V2 = (Va + a²Vb + aVc)/3 = 0.', '정상분 V1 = Va 만 남아.'],
    check: '불평형일수록 역상분·영상분이 커져. 이를 이용해 불평형률 = V2/V1 × 100 [%] 를 정해.',
    traps: ['영상분은 중성선·대지로 흐르는 전류와 관계가 있어.'],
  });

  S({
    id: 'st-ns-harm',
    concepts: ['nonsine'],
    text: '비정현파가 반파 대칭(f(t) = −f(t + T/2))이고 직류분이 없을 때 포함되는 성분은?',
    choices: [
      { label: '기본파와 홀수 고조파', why: '정답이야. 반파 대칭이면 직류분과 짝수 고조파가 없고 홀수 차수만 남아.' },
      { label: '직류분과 짝수 고조파', why: '반파 대칭이면 직류분과 짝수 고조파는 사라져.' },
      { label: '기본파와 모든 고조파', why: '반파 대칭이면 짝수 고조파는 없어. 홀수만 있어.' },
      { label: '직류분과 홀수 고조파', why: '반파 대칭은 위아래가 뒤집어진 대칭이라 직류분(평균값)이 0이야.' },
    ],
    answer: 0,
    formula: '반파 대칭: 홀수 고조파만 (직류 0, 짝수 0)',
    conclusion: '반파 대칭 파형에는 기본파와 홀수 고조파만 있어.',
    steps: ['반파 대칭이면 반 주기 뒤의 파형이 부호만 반대야.', '그러면 평균(직류분)이 0이 돼.', '푸리에 급수에서 짝수 항이 상쇄되어 홀수 차수만 남아.'],
    check: '정현파의 기본파와 3고조파의 합은 반파 대칭이야.',
    traps: ['"짝수 고조파가 있다"면 반파 대칭이 아니라는 뜻이야(정류 파형 등).'],
  });

  S({
    id: 'st-ce-type',
    concepts: ['cs-error'],
    text: '단위 부궤환 제어계가 램프(속도) 입력에 대해 정상 편차가 0이 되려면 개루프 전달함수는 최소 몇 형이어야 해?',
    choices: [
      { label: '2형', why: '정답이야. 램프 입력의 정상 편차는 1형에서 일정한 값이 남고 2형부터 0이 돼.' },
      { label: '0형', why: '0형은 계단 입력에도 편차가 남고 램프 입력에는 무한대가 돼.' },
      { label: '1형', why: '1형은 계단 입력 편차가 0이고 램프 입력에는 일정한 편차(A/Kv)가 남아.' },
      { label: '3형', why: '3형도 0이 되지만 "최소"는 2형이야.' },
    ],
    answer: 0,
    formula: '형(type) n: 입력 차수 < n 이면 편차 0, = n 이면 일정, > n 이면 ∞',
    conclusion: '램프 입력의 정상 편차 0은 2형 이상에서 얻어져.',
    steps: ['램프(1차) 입력은 입력 차수 1이야.', '형 n이 입력 차수보다 크면 편차 0이 되니까 n ≥ 2.', '그래서 최소 2형.'],
    check: '1형 + 램프는 e = A/Kv 로 일정한 값이 남고, 2형 + 램프는 0이야.',
    traps: ['"형 = 개루프의 원점 극점(1/s) 수"야.'],
  });

  S({
    id: 'st-bd-lag',
    concepts: ['bode'],
    text: '1차 지연 요소 G(s) = 1/(1 + s/ω0) 의 보드 선도에서 절점 주파수 ω = ω0 일 때 이득과 위상은?',
    choices: [
      { label: '약 −3 dB, −45°', why: '정답이야. |G| = 1/√2 → 20log(1/√2) ≈ −3 dB, 위상은 −tan⁻¹(1) = −45°.' },
      { label: '이득 변화 없음(1배), 위상 변화 없음', why: '이건 ω ≪ ω0(저주파) 일 때 값이야. 절점에서는 이미 3 dB 줄어 있어.' },
      { label: '−20 dB, −90°', why: '−20 dB, −90°는 ω가 ω0보다 훨씬 클 때(10배)에 가까워지는 값이야.' },
      { label: '−6 dB, −60°', why: '그런 값은 절점에서 나오지 않아. 절점은 −3 dB, −45°.' },
    ],
    answer: 0,
    formula: 'ω = ω0: |G| = 1/√2 ≈ −3 dB,  ∠G = −45°',
    conclusion: '절점 주파수에서 이득은 −3 dB, 위상은 −45°야.',
    steps: ['G(jω0) = 1/(1 + j1).', '크기 = 1/√2 → 20log10(1/√2) = −3.01 dB.', '위상 = −tan⁻¹(1) = −45°.'],
    check: 'ω가 10배 커지면 이득이 약 −20 dB, 위상이 약 −84°로 −90°에 가까워져.',
    traps: ['절점 = −3 dB 지점 = 위상 −45° 지점이야.'],
  });

  S({
    id: 'st-di-bound',
    concepts: ['dielectric'],
    text: '서로 다른 두 유전체의 경계면에서 항상 연속인 것은? (경계면에 자유 전하가 없다)',
    choices: [
      { label: '전계의 접선 성분과 전속밀도의 법선 성분', why: '정답이야. E1t = E2t, D1n = D2n 이 경계 조건이야.' },
      { label: '전계의 법선 성분과 전속밀도의 접선 성분', why: '반대로 외웠어. 연속인 건 E의 접선, D의 법선 성분이야.' },
      { label: '전계와 전속밀도의 접선 성분', why: 'D의 접선 성분은 ε가 달라서 연속이 아니야(D = εE).' },
      { label: '전계와 전속밀도의 법선 성분', why: 'E의 법선 성분은 ε1E1n = ε2E2n 이라서 불연속이야.' },
    ],
    answer: 0,
    formula: 'E1t = E2t,   D1n = D2n',
    conclusion: '경계에서 E의 접선 성분과 D의 법선 성분이 연속이야.',
    steps: ['경계를 따라 한 바퀴 도는 선적분이 0이라서 전계의 접선 성분이 연속.', '경계에 상자를 걸쳐 가우스 법칙을 쓰면 전속밀도의 법선 성분이 연속(자유 전하 없음).', '그래서 tanθ1/tanθ2 = ε1/ε2.'],
    check: 'ε1E1cosθ1... 법선에서 ε1E1n = ε2E2n 이므로 E의 법선 성분은 불연속임을 확인할 수 있어.',
    traps: ['"E는 접선, D는 법선"으로 외워(경계면에 전하가 없을 때).'],
  });

  S({
    id: 'st-cl-core',
    concepts: ['mc-core-loss'],
    text: '변압기 철심에 규소강판을 얇게 겹쳐(성층) 쓰는 이유로 옳은 것은?',
    choices: [
      { label: '규소는 히스테리시스손을, 성층은 와류손을 줄이기 위해서다', why: '정답이야. 규소(약 4 %) 첨가가 히스테리시스 곡선 면적을 줄이고, 얇은 판을 절연해 쌓으면 와류 경로가 작아져.' },
      { label: '동손을 줄이기 위해서다', why: '동손은 권선 저항 손실이라 철심 재료와 관계가 없어.' },
      { label: '자속 밀도를 낮추기 위해서다', why: '철심은 오히려 자속이 잘 통하게 만드는 거야.' },
      { label: '철심의 무게를 늘리기 위해서다', why: '목적은 손실 감소야. 무게와는 상관이 없어.' },
    ],
    answer: 0,
    formula: '철손 = 히스테리시스손 + 와류손',
    conclusion: '규소강판은 히스테리시스손, 성층은 와류손을 줄여.',
    steps: ['히스테리시스손은 재료의 성질이라 규소를 넣어서 줄여.', '와류손은 철심 안을 도는 전류라서 얇은 판을 절연해 쌓아 줄여.', '둘 다 무부하손(철손)이야.'],
    check: '와류손은 판 두께의 제곱에 비례해서 얇게 할수록 확 줄어.',
    traps: ['"규소 → 히스테리시스, 성층 → 와류"로 짝을 맞춰.'],
  });

  S({
    id: 'st-so-scr',
    concepts: ['mc-sync-out'],
    text: '단락비가 큰 동기발전기의 특징으로 옳은 것은?',
    choices: [
      { label: '동기임피던스가 작고 전압변동률이 작으며 안정도가 좋다', why: '정답이야. 단락비 = 100/%Zs 이니까 클수록 %Zs가 작아서 전압변동이 작고 안정도가 좋아.' },
      { label: '동기임피던스가 크고 전압변동률이 크다', why: '이건 단락비가 작은 기계(경제적이지만 전압변동이 큰 기계)의 특성이야.' },
      { label: '기계가 작고 값이 싸며 효율이 높다', why: '단락비가 큰 기계는 철을 많이 써서 크고 무겁고 비싸. 효율도 철손·기계손 때문에 조금 낮아.' },
      { label: '자기 여자 현상이 일어나기 쉽다', why: '오히려 단락비가 큰 기계는 자기 여자 현상을 일으키기 어려워(충전 용량이 커).' },
    ],
    answer: 0,
    formula: 'K = 100/%Zs:  K 큼 → Zs 작음 → 전압변동률↓, 안정도↑, 크기·가격↑',
    conclusion: '단락비가 크면 안정도가 좋고 전압변동률이 작지만 크고 비싸.',
    steps: ['단락비 K = 1/Zs[pu] 이므로 K가 크면 Zs가 작아.', 'Zs가 작으면 내부 전압강하가 작아 전압변동률이 작고 안정도가 좋아.', '대신 공극이 크고 철이 많이 들어서 크고 무겁고 비싸(철기계).'],
    check: '수차 발전기는 단락비를 크게(0.9~1.2), 터빈 발전기는 작게(0.6~1.0) 설계해.',
    traps: ['"단락비 큰 기계 = 철기계 = 안정도 좋고 비싸다".'],
  });

  S({
    id: 'st-rl-kind',
    concepts: ['pw-relay'],
    text: '변압기 내부 고장 때 발생하는 가스나 기름의 이동을 이용해서 동작하는 보호 계전기는?',
    choices: [
      { label: '부흐홀츠 계전기', why: '정답이야. 변압기 본체와 콘서베이터 사이 관에 설치해서 내부 고장 시 가스·유류 이동으로 동작해.' },
      { label: '차동 계전기', why: '차동 계전기는 들어가는 전류와 나오는 전류의 차를 비교하는 전기적 계전기야.' },
      { label: '거리 계전기', why: '거리 계전기는 고장점까지의 임피던스를 보고 동작하는 송전선 보호용이야.' },
      { label: '과전류 계전기', why: '과전류 계전기는 정해진 전류를 넘으면 동작해. 가스와는 관계없어.' },
    ],
    answer: 0,
    formula: '부흐홀츠: 변압기 ↔ 콘서베이터 사이, 가스·유류 이동으로 동작',
    conclusion: '변압기 내부 고장 보호는 부흐홀츠 계전기가 해.',
    steps: ['변압기 내부에서 아크가 나면 절연유가 분해되어 가스가 생겨.', '가스와 유류가 콘서베이터 쪽으로 이동하는 걸 감지해.', '그게 부흐홀츠 계전기의 동작 원리야.'],
    check: '차동 계전기도 변압기 내부 고장을 보지만 "전기량"을, 부흐홀츠는 "가스·유류"를 감지해.',
    traps: ['부흐홀츠 = 변압기, 거리 = 송전선, 차동 = 발전기·변압기·모선, 방향 = 전류 방향.'],
  });

  S({
    id: 'st-sg-open',
    concepts: ['pw-surge'],
    text: '선로 끝이 개방되어 있을 때 진행파(서지) 전압이 끝에 도달하면 끝에서의 전압은?',
    choices: [
      { label: '입사 전압의 2배', why: '정답이야. 개방단의 반사계수는 +1 이라서 입사 전압 + 반사 전압 = 2배가 돼.' },
      { label: '전압이 걸리지 않는다', why: '이건 단락단이야. 단락단에서는 반사계수가 −1 이라서 입사와 반사가 상쇄돼.' },
      { label: '입사 전압과 같다', why: '반사가 없을 때(정합) 얘기야. 개방단은 전부 반사돼.' },
      { label: '입사 전압의 1/2', why: '개방단에서는 오히려 전압이 올라가.' },
    ],
    answer: 0,
    formula: '개방단 Γ = +1 → 끝 전압 = 2e,   단락단 Γ = −1 → 0',
    conclusion: '개방단에서는 전압이 입사 전압의 2배가 돼.',
    steps: ['개방단은 Z2 = ∞ 이니까 반사계수 (Z2 − Z1)/(Z2 + Z1) = 1.', '반사파가 입사파와 같은 극성으로 되돌아와.', '끝에서 전압 = 입사 + 반사 = 2e.'],
    check: '그래서 선로 끝에 피뢰기를 설치해서 이 두 배 전압을 억제해.',
    traps: ['개방 = +1(2배), 단락 = −1(0).'],
  });

  S({
    id: 'st-sg-lim',
    concepts: ['pw-surge'],
    text: '피뢰기의 제한전압이란?',
    choices: [
      { label: '방전 중에 피뢰기 단자 사이에 나타나는 전압', why: '정답이야. 서지 전류를 흘려 보내는 동안 피뢰기 양단에 남는 전압이라서, 이 값이 낮을수록 기기를 잘 지켜.' },
      { label: '속류를 차단할 수 있는 최고의 교류 전압', why: '이건 피뢰기의 정격전압이야. 제한전압과 달라.' },
      { label: '피뢰기가 동작을 시작하는 계통의 최저 전압', why: '제한전압은 동작 시작 전압이 아니라 방전 중에 남는 전압이야.' },
      { label: '평상시 피뢰기에 계속 걸어 둘 수 있는 상용 주파 전압', why: '그건 연속 운전 전압(MCOV)에 가까운 개념이야. 제한전압은 방전 중의 전압.' },
    ],
    answer: 0,
    formula: '제한전압 = 방전 중 피뢰기 양단에 남는 전압 (낮을수록 좋다)',
    conclusion: '제한전압은 방전 중 피뢰기 단자에 나타나는 전압이야.',
    steps: ['서지가 들어오면 피뢰기가 방전해서 전류를 땅으로 흘려.', '그 동안에도 피뢰기 양단에는 전압이 남는데 그게 제한전압이야.', '이 값이 보호할 기기의 절연 강도보다 낮아야 기기가 안전해.'],
    check: '절연협조는 제한전압보다 기기 절연 강도가 여유 있게 높게 정해서 보호하는 거야.',
    traps: ['제한전압 = 방전 중 남는 전압, 정격전압 = 속류를 끊는 최고 교류 전압.'],
  });

  S({
    id: 'st-sg-rated',
    concepts: ['pw-surge'],
    text: '피뢰기의 정격전압이란?',
    choices: [
      { label: '속류를 차단할 수 있는 최고의 교류 전압(실효값)', why: '정답이야. 방전이 끝난 뒤 계통 전압 때문에 계속 흐르는 속류를 끊을 수 있는 가장 높은 교류 전압이야.' },
      { label: '방전 중에 피뢰기 단자 사이에 남는 전압', why: '이건 제한전압이야.' },
      { label: '피뢰기를 설치한 계통의 공칭 전압', why: '공칭전압과는 달라. 피뢰기 정격전압은 접지 방식에 따라 계통 최고 전압보다 조금 높게 정해.' },
      { label: '피뢰기가 견딜 수 있는 최대 서지 전류의 파고값', why: '그건 방전 내량(서지 전류) 얘기야.' },
    ],
    answer: 0,
    formula: '정격전압 = 속류를 차단할 수 있는 최고 교류 전압',
    conclusion: '정격전압은 속류를 차단할 수 있는 최고의 교류 전압이야.',
    steps: ['서지가 지나가고 나면 계통 전압 때문에 속류가 계속 흐르려고 해.', '피뢰기가 이 속류를 끊어 줘야 정상으로 돌아가.', '끊을 수 있는 최대 교류 전압(실효값)이 정격전압이야.'],
    check: '직접 접지 계통은 정격전압을 낮게, 비접지 계통은 높게 잡아.',
    traps: ['제한전압(방전 중 전압)과 정격전압(속류 차단 최고 전압)을 구분해.'],
  });

  S({
    id: 'st-sg-coord',
    concepts: ['pw-surge'],
    text: '절연협조에서 일반적으로 절연 강도를 가장 낮게 잡는 것은?',
    choices: [
      { label: '피뢰기', why: '정답이야. 피뢰기가 가장 먼저 동작해야 하니까 절연 강도(제한전압)를 가장 낮게 잡아.' },
      { label: '선로 애자', why: '선로 애자는 가장 높게 잡아. 애자에서 섬락이 나면 사고가 되니까.' },
      { label: '전력용 변압기', why: '변압기는 비싸고 중요하니까 피뢰기보다는 높게 잡아야 보호돼.' },
      { label: '결합 콘덴서', why: '결합 콘덴서는 선로 애자보다는 낮지만 변압기·피뢰기보다는 높게 잡아.' },
    ],
    answer: 0,
    formula: '절연협조: 선로 애자 > 결합콘덴서 > 변압기 > 피뢰기',
    conclusion: '절연협조에서 피뢰기가 가장 낮고 선로 애자가 가장 높아.',
    steps: ['이상전압이 오면 가장 먼저 피뢰기가 방전해서 기기를 지켜야 해.', '그래서 피뢰기의 제한전압이 보호 대상보다 낮아야 해.', '보호 대상 중에서는 선로 애자 > 결합콘덴서 > 변압기 순으로 높게 잡아.'],
    check: '이 순서대로면 이상전압이 와도 피뢰기가 먼저 동작해서 변압기가 보호돼.',
    traps: ['"애 · 콘 · 변 · 피" 순서로 외워(애자, 콘덴서, 변압기, 피뢰기).'],
  });

  S({
    id: 'st-wr-neutral',
    concepts: ['pw-wires'],
    text: '단상 3선식에서 부하가 불평형일 때 중성선이 끊어지면 일어나는 현상은?',
    choices: [
      { label: '부하가 작은 쪽에 이상 전압이 걸린다', why: '정답이야. 두 부하가 직렬이 되어서 전체 전압이 임피던스 비로 나뉘니까, 임피던스가 큰(부하가 작은) 쪽에 높은 전압이 걸려.' },
      { label: '양쪽 전압이 모두 0이 된다', why: '양쪽에 전원이 연결돼 있으니 0이 되지 않아.' },
      { label: '양쪽 전압이 모두 두 배가 된다', why: '전체 전압은 그대로이고 한쪽 전압이 올라갈 때 다른 쪽은 내려가.' },
      { label: '아무 영향이 없다', why: '평형일 때만 영향이 없어. 불평형이면 전압이 불균등하게 나뉘어.' },
    ],
    answer: 0,
    formula: '중성선 단선 + 불평형 → 두 부하 직렬 → 전압 분배 변화',
    conclusion: '중성선이 끊어지면 부하가 작은 쪽에 이상 전압이 걸려.',
    steps: ['정상일 때 중성선이 각 부하에 110 V씩 걸리게 해 줘.', '중성선이 끊기면 두 부하가 220 V에 직렬로 연결돼.', '직렬이면 임피던스에 비례해서 나누어 가지니까 큰 쪽(작은 부하)에 높은 전압이 걸려.'],
    check: '그래서 중성선에는 퓨즈를 넣지 않고, 양 끝에 밸런서(저압 변압기)를 설치해.',
    traps: ['"작은 부하 쪽에 전압이 더 걸린다"를 기억해.'],
  });
})(globalThis.GISA);
