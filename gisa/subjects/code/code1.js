// 전기설비기술기준 1차 문제 템플릿
// 근거: 한국전기설비규정(KEC) 2026.1.5 개정 전문(기후에너지환경부 공고 제2025-227호). 문제와 해설은 직접 쓴 글이고, 수치는 조항과 맞췄다.
// 각 템플릿의 quote(근거 문구)는 test/kec-verify.js 가 공식 전문과 대조한다.
(function (G) {
  'use strict';
  const F = G.fmt;
  const n = F.num;
  const q = F.q;
  const T = G.defineTemplate;
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const r2 = (x) => Math.round(x * 100) / 100;
  // 근거 문구 목록: test/kec-verify.js 가 공식 전문과 대조한다
  G.codeQuotes = G.codeQuotes || [];
  const Q = (id, clause, quote) => G.codeQuotes.push({ id, clause, quote });
  G.codeQuote = Q;

  // ───────── 공통: 근거 조항의 값을 고르는 문제 ─────────
  // item: { key, text, ans, unit, dec, clause, rule, wrong:[[값, 왜 틀렸는지]...], trap }
  function factTemplate(id, concept, items, opt) {
    items.forEach((it) => {
      if (!it.key || !it.text || typeof it.ans !== 'number' || !it.clause || !it.rule || !it.quote || !it.wrong || it.wrong.length < 3) throw new Error('사실 문제 항목 오류: ' + id + ' ' + it.key);
    });
    items.forEach((it) => Q(id + ':' + it.key, it.clause, it.quote));
    const keys = new Set(items.map((it) => it.key));
    if (keys.size !== items.length) throw new Error('사실 문제 key 중복: ' + id);
    T({
      id,
      concept,
      noCalc: true,
      facts: items,
      gen(r) {
        const it = r.pick(items);
        const unit = it.unit;
        const dec = it.dec == null ? 2 : it.dec;
        const label = (v) => q(v, unit, dec);
        const wrong = r.shuffle(it.wrong.slice());
        return {
          params: { key: it.key },
          text: it.text,
          formula: it.formula || it.rule,
          unit,
          decimals: dec,
          answer: it.ans,
          distractors: wrong.map(([v, why]) => ({ v, why })),
          conclusion: it.rule + ' → ' + label(it.ans),
          steps: ['규정(KEC ' + it.clause + '): ' + it.rule, '문제의 조건이 어느 경우에 해당하는지 먼저 찾아.', '따라서 ' + label(it.ans) + '.'],
          check: it.check || '숫자만 외우지 말고 "어떤 경우의 값인지"까지 같이 기억해 둬.',
          traps: [it.trap || '비슷한 조건에 쓰는 다른 숫자와 섞이기 쉬워. 조건(전압, 장소, 지지물)부터 확인해.'],
        };
      },
    });
  }

  G.codeFactTemplate = factTemplate;

  // ═════════ 1. 전압의 구분 ═════════
  factTemplate('cd-volt-limit', 'cd-volt', [
    {
      key: 'ac-low',
      text: '한국전기설비규정에서 교류 전압의 "저압"은 몇 kV 이하야?',
      ans: 1, unit: 'kV', dec: 1, clause: '111.1', quote: '저압: 교류는 1 kV 이하',
      rule: '저압은 교류 1 kV 이하',
      wrong: [[1.5, '1.5 kV는 직류의 저압 상한이야. 교류는 1 kV야.'], [7, '7 kV는 고압의 상한이야. 저압의 상한이 아니야.'], [0.6, '0.6 kV는 이 규정의 구분 경계가 아니야. 교류 저압은 1 kV 이하야.'], [0.4, '0.4 kV는 저압 안의 한 값일 뿐 경계가 아니야. 경계는 1 kV야.']],
      trap: '교류 1 kV, 직류 1.5 kV — 교류와 직류의 저압 경계가 다른 걸 기억해.',
    },
    {
      key: 'dc-low',
      text: '한국전기설비규정에서 직류 전압의 "저압"은 몇 kV 이하야?',
      ans: 1.5, unit: 'kV', dec: 1, clause: '111.1', quote: '직류는 1.5 kV 이하인 것',
      rule: '저압은 직류 1.5 kV 이하',
      wrong: [[1, '1 kV는 교류의 저압 상한이야. 직류는 1.5 kV야.'], [7, '7 kV는 고압의 상한이야. 저압의 상한이 아니야.'], [0.75, '0.75 kV는 이 규정의 구분 경계가 아니야. 직류 저압은 1.5 kV 이하야.'], [3, '3 kV는 경계가 아니야. 직류 저압은 1.5 kV 이하야.']],
      trap: '교류는 1 kV, 직류는 1.5 kV야. 직류가 더 높다는 것만 기억해도 반은 맞춰.',
    },
    {
      key: 'high-top',
      text: '한국전기설비규정에서 "고압"의 상한은 몇 kV 이하야?',
      ans: 7, unit: 'kV', dec: 1, clause: '111.1', quote: '고압: 교류는 1 kV를, 직류는 1.5 kV를 초과하고, 7 kV 이하인 것',
      rule: '고압은 저압을 초과하고 7 kV 이하',
      wrong: [[1, '1 kV는 교류 저압의 상한이야. 고압의 상한은 7 kV야.'], [1.5, '1.5 kV는 직류 저압의 상한이야. 고압의 상한은 7 kV야.'], [25, '25 kV는 고압·특고압 구분이 아니야. 7 kV를 넘으면 특고압이야.'], [35, '35 kV는 특고압을 나누는 다른 기준(높이 등)에 나오는 값이야. 고압의 상한은 7 kV야.']],
      trap: '고압의 위쪽 경계 7 kV는 교류와 직류가 같아.',
    },
    {
      key: 'extra-over',
      text: '한국전기설비규정에서 "특고압"은 몇 kV를 초과하는 전압이야?',
      ans: 7, unit: 'kV', dec: 1, clause: '111.1', quote: '특고압: 7 kV를 초과하는 것',
      rule: '특고압은 7 kV를 초과하는 것',
      wrong: [[1, '1 kV는 교류 저압의 상한이야. 특고압은 7 kV를 넘는 거야.'], [1.5, '1.5 kV는 직류 저압의 상한이야. 특고압은 7 kV를 넘는 거야.'], [22.9, '22.9 kV는 특고압 중 한 계통의 공칭전압일 뿐 경계가 아니야.'], [35, '35 kV는 특고압 안에서 높이 등을 나누는 다른 기준이야. 특고압의 시작은 7 kV 초과야.']],
      trap: '고압의 상한과 특고압의 시작이 같은 숫자(7 kV)야. "이하/초과" 표현만 달라.',
    },
  ]);

  // ═════════ 2. 전로의 절연내력 시험전압 (표 132-1) ═════════
  // sys: plain 특별한 접지 조건 없음 / multi 중성선 다중접지 / unearthed 비접지 / earthed 접지식(직접접지 아님) / direct 직접접지 / direct-sub 170 kV 초과 직접접지 + 발전소·변전소 구내
  const LINE_ROWS = [
    { sys: 'plain', pool: [3.3, 3.45, 5.5, 6.6, 6.9, 7], mult: 1.5, floor: 0, where: '7 kV 이하인 고압 전로', row: '표 132-1의 1란', quote: '최대사용전압 7 kV 이하인 전로' },
    { sys: 'multi', pool: [11, 13.2, 15, 20, 24, 25], mult: 0.92, floor: 0, where: '중성점이 접지되고 중성선을 다중접지하는 전로(7 kV 초과 25 kV 이하)', row: '표 132-1의 2란', quote: '최대사용전압의 0.92배의 전압' },
    { sys: 'plain', pool: [7.2, 8, 10, 13.2, 20, 30, 45, 60], mult: 1.25, floor: 10.5, where: '7 kV 초과 60 kV 이하인 전로(중성선 다중접지식이 아님)', row: '표 132-1의 3란', quote: '최대사용전압의 1.25배의 전압(10.5 kV 미만으로 되는 경우는 10.5 kV)' },
    { sys: 'unearthed', pool: [66, 69, 77, 100, 154, 170], mult: 1.25, floor: 0, where: '60 kV를 초과하는 중성점 비접지식 전로', row: '표 132-1의 4란', quote: '최대사용전압 60 kV 초과 중성점 비접지식전로' },
    { sys: 'earthed', pool: [66, 69, 77, 100, 154, 170], mult: 1.1, floor: 75, where: '60 kV를 초과하는 중성점 접지식 전로(직접접지식이 아님)', row: '표 132-1의 5란', quote: '(75 kV 미만으로 되는 경우에는 75 kV)' },
    { sys: 'direct', pool: [69, 100, 154, 170], mult: 0.72, floor: 0, where: '60 kV를 초과하는 중성점 직접접지식 전로', row: '표 132-1의 6란', quote: '최대사용전압의 0.72배의 전압' },
    { sys: 'direct-sub', pool: [242, 362, 550, 800], mult: 0.64, floor: 0, where: '170 kV를 초과하는 중성점 직접접지식 전로 중, 중성점이 직접 접지된 발전소·변전소 구내의 것', row: '표 132-1의 7란', quote: '최대사용전압의 0.64배의 전압' },
  ];
  LINE_ROWS.forEach((row, i) => Q('cd-insul-line:' + row.sys + '/' + i, row.row, row.quote));
  const MULT_NAME = {
    1.5: '7 kV 이하 전로',
    1.25: '7 kV 초과 60 kV 이하 전로, 또는 60 kV 초과 중성점 비접지식',
    1.1: '60 kV 초과 중성점 접지식',
    0.92: '25 kV 이하 중성선 다중접지식',
    0.72: '60 kV 초과 중성점 직접접지식',
    0.64: '170 kV 초과 직접접지식(발전소·변전소 구내)',
  };

  T({
    id: 'cd-insul-line',
    concept: 'cd-insul-line',
    gen(r) {
      const row = r.pick(LINE_ROWS);
      const V = r.pick(row.pool);
      const raw = r3(V * row.mult);
      const floored = row.floor > 0 && raw < row.floor;
      const ans = floored ? row.floor : raw;
      const lab = (v) => q(v, 'kV', 3);
      const dis = [];
      if (floored) dis.push({ v: raw, why: '계산값 ' + lab(raw) + '이 하한(' + lab(row.floor) + ')보다 작아서 하한값을 시험전압으로 써야 해.' });
      dis.push({ v: r3(raw * 2), why: '2배 직류 시험은 "전선이 케이블인 교류 전로"에서 직류로 시험할 때만 쓰는 방법이야. 교류 시험전압을 묻는 이 문제에는 맞지 않아.' });
      const others = r.shuffle(Object.keys(MULT_NAME).map(Number).filter((m) => m !== row.mult));
      others.forEach((m) => {
        const v = r3(V * m);
        dis.push({ v, why: '배수 ' + n(m) + '는 ' + MULT_NAME[m] + '에 쓰는 값이야. 이 문제는 ' + row.where + '라서 ' + n(row.mult) + '배야.' });
      });
      const sysText = row.sys === 'plain' ? '' : '';
      return {
        params: { V, sys: row.sys, mult: row.mult, floor: row.floor },
        text: row.where + '(최대사용전압 ' + q(V, 'kV') + ')의 절연내력 시험전압(교류)은 몇 kV야?',
        formula: '시험전압 = 최대사용전압 × 배수 (표 132-1), 연속 10분',
        unit: 'kV',
        decimals: 3,
        answer: ans,
        distractors: dis,
        conclusion: '시험전압 = ' + n(V) + ' × ' + n(row.mult) + ' = ' + lab(raw) + (floored ? ' → 하한 ' + lab(row.floor) + ' 적용 → ' + lab(ans) : ' → ' + lab(ans)),
        steps: [
          '먼저 조건에 맞는 줄을 찾아. 이 문제는 ' + row.where + '이니까 ' + row.row + '이야.',
          '그 줄의 배수는 ' + n(row.mult) + '배' + (row.floor ? '이고, ' + lab(row.floor) + ' 미만이 되면 ' + lab(row.floor) + '를 써' : '이고 하한이 없어') + '.',
          n(V) + ' kV × ' + n(row.mult) + ' = ' + lab(raw) + '.',
          floored ? lab(raw) + '는 하한 ' + lab(row.floor) + '보다 작으니까 시험전압은 ' + lab(row.floor) + '.' : '하한에 걸리지 않으니까 그대로 ' + lab(ans) + '.',
        ],
        check: floored ? '하한(' + lab(row.floor) + ')에 걸리는 경우라서 계산값보다 커졌어.' : lab(ans) + ' ÷ ' + n(row.mult) + ' = ' + n(V) + ' kV로 처음 값과 같아.',
        traps: [row.floor ? '하한(' + lab(row.floor) + ')을 놓치기 쉬워. 곱한 결과를 꼭 하한과 비교해.' : '이 줄에는 하한이 없어. 곱한 값이 그대로 답이야.', '먼저 "몇 kV인가", "중성점 접지 방식이 무엇인가"로 줄을 정하고 나서 계산해.'],
      };
    },
  });

  // ═════════ 3. 회전기·변압기·기구 등의 시험전압 ═════════
  const EQ_KINDS = [
    { kind: 'rot-low', name: '회전기(발전기·전동기 등, 회전변류기 제외)', cond: '7 kV 이하', pool: [0.22, 0.38, 0.44, 3.3, 3.45, 6.6, 6.9], mult: 1.5, floor: 0.5, row: '표 133-1', acNote: '권선과 대지 사이' },
    { kind: 'rot-high', name: '회전기(발전기·전동기 등, 회전변류기 제외)', cond: '7 kV 초과', pool: [7.2, 8, 11, 13.2, 15, 20], mult: 1.25, floor: 10.5, row: '표 133-1', acNote: '권선과 대지 사이' },
    { kind: 'tr-low', name: '변압기 권선(중성선 다중접지 전로에 접속하는 것은 아님)', cond: '7 kV 이하', pool: [0.22, 0.38, 0.44, 3.3, 3.45, 6.6, 6.9], mult: 1.5, floor: 0.5, row: '표 135-1', acNote: '권선과 다른 권선·철심·외함 사이' },
    { kind: 'tr-mid', name: '변압기 권선(중성선 다중접지 전로에 접속하는 것은 아님)', cond: '7 kV 초과 60 kV 이하', pool: [7.2, 8, 10, 13.2, 20, 30, 45, 60], mult: 1.25, floor: 10.5, row: '표 135-1', acNote: '권선과 다른 권선·철심·외함 사이' },
    { kind: 'eq-low', name: '개폐기·차단기 같은 기구 등의 전로(중성선 다중접지 전로에 접속하는 것은 아님)', cond: '7 kV 이하', pool: [0.22, 0.38, 0.44, 3.3, 3.45, 6.6, 6.9], mult: 1.5, floor: 0.5, row: '표 136-1', acNote: '전로와 대지 사이' },
    { kind: 'eq-mid', name: '개폐기·차단기 같은 기구 등의 전로(중성선 다중접지 전로에 접속하는 것은 아님)', cond: '7 kV 초과 60 kV 이하', pool: [7.2, 8, 10, 13.2, 20, 30, 45, 60], mult: 1.25, floor: 10.5, row: '표 136-1', acNote: '전로와 대지 사이' },
    { kind: 'rect', name: '정류기(교류전압으로 시험)', cond: '직류측, 60 kV 이하', pool: [0.22, 0.38, 0.44, 0.6, 1.5, 3, 6, 12, 22], mult: 1, floor: 0.5, row: '표 133-1', acNote: '충전부분과 외함 사이', ratioText: '직류측 최대사용전압의 1배의 교류전압' },
    { kind: 'pv-dc', name: '태양전지 모듈(직류전압으로 시험)', cond: '', pool: [0.6, 0.8, 1, 1.2, 1.5], mult: 1.5, floor: 0, row: '134', acNote: '충전부분과 대지 사이', ratioText: '최대사용전압의 1.5배의 직류전압' },
    { kind: 'pv-ac', name: '태양전지 모듈(교류전압으로 시험)', cond: '', pool: [0.22, 0.38, 0.6, 0.8, 1], mult: 1, floor: 0.5, row: '134', acNote: '충전부분과 대지 사이', ratioText: '최대사용전압의 1배의 교류전압' },
  ];
  [
    '최대사용전압의 1.5배의 전압(500 V 미만으로 되는 경우에는 500 V)',
    '최대사용전압의 1.25배의 전압(10.5 kV 미만으로 되는 경우에는 10.5 kV)',
    '직류측의 최대사용전압의 1배의 교류전압(500 V 미만으로 되는 경우에는 500 V)',
    '최대사용전압의 1.5배의 직류전압 또는 1배의 교류전압(500 V 미만으로 되는 경우에는 500 V)',
  ].forEach((t, i) => Q('cd-insul-eq/' + i, '133~136', t));
  const vLabel = (v) => (v < 1 ? n(Math.round(v * 1000)) + ' V' : n(v, 3) + ' kV');

  T({
    id: 'cd-insul-eq',
    concept: 'cd-insul-eq',
    gen(r) {
      const k = r.pick(EQ_KINDS);
      const V = r.pick(k.pool);
      const raw = r3(V * k.mult);
      const floored = k.floor > 0 && raw < k.floor;
      const ans = floored ? k.floor : raw;
      const dis = [];
      if (floored) dis.push({ v: raw, why: '계산값 ' + vLabel(raw) + '이 하한 ' + vLabel(k.floor) + '보다 작아. 이런 기기에는 하한값을 시험전압으로 써.' });
      if (k.kind === 'rect' || k.kind === 'pv-ac') dis.push({ v: r3(V * 1.5), why: '1.5배는 7 kV 이하 회전기·변압기 등이나 태양전지의 "직류" 시험에 쓰는 배수야. 이 문제는 1배의 교류전압이야.' });
      if (k.kind === 'pv-dc') dis.push({ v: V, why: '1배는 태양전지를 "교류전압"으로 시험할 때의 값이야. 직류로 시험하면 1.5배야.' });
      if (!k.kind.startsWith('rect') && !k.kind.startsWith('pv')) {
        const alt = k.mult === 1.5 ? 1.25 : 1.5;
        dis.push({ v: r3(V * alt), why: '배수 ' + n(alt) + '는 ' + (alt === 1.5 ? '7 kV 이하' : '7 kV 초과') + '인 경우의 값이야. 이 문제는 ' + k.cond + ' 조건이라 ' + n(k.mult) + '배야.' });
        dis.push({ v: r3(V * 1.1), why: '1.1배는 60 kV를 초과하는 접지식 전로 등에 쓰는 배수야. 이 문제와 맞지 않아.' });
        dis.push({ v: r3(V * 0.92), why: '0.92배는 25 kV 이하 중성선 다중접지식 전로에 쓰는 배수야. 이 문제는 그 조건이 아니야.' });
      }
      dis.push({ v: r3(V * 2), why: '2배는 어느 줄에도 나오지 않는 배수야(케이블 직류 시험의 2배와 섞였을 수 있어).' });
      const lab = vLabel;
      const rule = k.ratioText || '최대사용전압의 ' + n(k.mult) + '배의 전압' + (k.floor ? '(' + lab(k.floor) + ' 미만이면 ' + lab(k.floor) + ')' : '');
      return {
        params: { V, kind: k.kind, mult: k.mult, floor: k.floor },
        text: k.name + ': 최대사용전압이 ' + vLabel(V) + (k.cond ? '(' + k.cond + ')' : '') + '일 때 절연내력 시험전압은 얼마야?',
        formula: '시험전압 = ' + rule + ', 연속 10분',
        unit: 'kV',
        label: lab,
        answer: ans,
        distractors: dis,
        conclusion: lab(V) + ' × ' + n(k.mult) + ' = ' + lab(raw) + (floored ? ' → 하한 ' + lab(k.floor) + ' 적용 → ' + lab(ans) : ' → ' + lab(ans)),
        steps: [
          '이 기기는 ' + k.row + '의 줄에 해당해. 시험 위치는 ' + k.acNote + '이고 시간은 연속 10분이야.',
          '기준은 ' + rule + '.',
          lab(V) + ' × ' + n(k.mult) + ' = ' + lab(raw) + '.',
          floored ? lab(raw) + '는 하한 ' + lab(k.floor) + '보다 작으니까 ' + lab(k.floor) + '로 시험해.' : '하한에 걸리지 않으니까 ' + lab(ans) + '.',
        ],
        check: floored ? '낮은 전압 기기라서 하한이 적용되어 계산값보다 커졌어.' : lab(ans) + ' ÷ ' + n(k.mult) + ' = ' + lab(V) + '(처음 값)',
        traps: ['전로(표 132-1)의 7 kV 이하에는 하한이 없지만, 회전기·변압기·기구·정류기·태양전지에는 500 V 하한이 있어.', '곱한 뒤에 하한(500 V 또는 10.5 kV)과 비교하는 걸 꼭 해.'],
      };
    },
  });

  // ═════════ 4. 접지극·접지도체 시설 기준 ═════════
  factTemplate('cd-earth-fact', 'cd-earth', [
    {
      key: 'depth', text: '고압 이상의 전기설비에 시설하는 접지극의 매설 깊이는 지표면에서 최소 몇 m야?',
      ans: 0.75, unit: 'm', dec: 2, clause: '142.2의 3 나', quote: '지표면으로부터 지하 0.75 m 이상으로 한다',
      rule: '접지극의 매설 깊이는 지표면으로부터 지하 0.75 m 이상',
      wrong: [[0.3, '0.3 m는 접지도체를 철주를 따라 시설할 때 접지극을 철주 밑면에서 묻는 깊이(0.3 m 이상)야.'], [1, '1 m는 접지극을 금속체에서 떼어 묻는 거리야. 깊이가 아니야.'], [2, '2 m는 접지도체를 합성수지관으로 덮는 지상 쪽 끝 높이야.'], [1.5, '1.5 m는 이 기준에 나오는 값이 아니야.']],
      trap: '0.75 m는 접지극 깊이이면서 접지도체 보호관의 지하 시작점이기도 해.',
    },
    {
      key: 'metal-gap', text: '접지도체를 철주 같은 금속체를 따라 시설하고 접지극을 철주 밑면에서 0.3 m 이상 깊이에 묻지 않는다면, 접지극은 지중에서 그 금속체로부터 몇 m 이상 떼어 묻어야 해?',
      ans: 1, unit: 'm', dec: 1, clause: '142.2의 3 다', quote: '접지극을 지중에서 그 금속체로부터 1 m 이상 떼어 매설하여야 한다',
      rule: '철주 등 금속체를 따라 접지도체를 시설하면 접지극을 지중에서 금속체로부터 1 m 이상 떼어 매설',
      wrong: [[0.3, '0.3 m는 철주 밑면에서 접지극을 묻을 때의 예외 깊이야. 떼어 놓는 거리가 아니야.'], [0.75, '0.75 m는 접지극의 최소 매설 깊이야. 이격 거리가 아니야.'], [2, '2 m는 이 기준에 나오는 이격 거리가 아니야(지상 2 m는 보호관 높이야).'], [1.5, '1.5 m는 이 기준에 나오는 값이 아니야.']],
      trap: '깊이(0.75 m, 0.3 m)와 이격 거리(1 m)를 헷갈리지 마.',
    },
    {
      key: 'pipe-top', text: '사람이 접촉할 우려가 있는 곳에 시설하는 고정설비의 접지도체는 지하 0.75 m부터 지표 위 몇 m까지 합성수지관 등으로 덮어야 해?',
      ans: 2, unit: 'm', dec: 1, clause: '142.3.1의 3 가', quote: '지하 0.75 m 부터 지표 상 2 m 까지 부분은 합성수지관',
      rule: '접지도체는 지하 0.75 m부터 지표 위 2 m까지 합성수지관 또는 이와 동등 이상의 몰드로 덮음',
      wrong: [[0.75, '0.75 m는 보호관이 시작되는 지하 깊이야. 끝 높이가 아니야.'], [1, '1 m는 이 기준에 나오는 높이가 아니야.'], [1.5, '1.5 m는 이 기준에 나오는 높이가 아니야.'], [2.5, '2.5 m는 이 기준에 나오는 높이가 아니야. 지표 위 2 m까지야.']],
      trap: '두께 2 mm 미만의 합성수지제 전선관·콤바인덕트관은 이 보호관으로 쓸 수 없어.',
    },
    {
      key: 'pipe-thick', text: '접지도체를 덮는 합성수지관에서, 두께가 몇 mm 미만인 합성수지제 전선관은 사용할 수 없어?',
      ans: 2, unit: 'mm', dec: 1, clause: '142.3.1의 3 가', quote: '두께 2 ㎜ 미만의 합성수지제 전선관 및 콤바인덕트관을 제외한다',
      rule: '두께 2 mm 미만의 합성수지제 전선관과 콤바인덕트관은 접지도체 보호관에서 제외',
      wrong: [[1, '1 mm는 기준 값이 아니야. 두께 2 mm 미만은 못 써.'], [1.5, '1.5 mm는 기준 값이 아니야. 두께 2 mm 미만은 못 써.'], [3, '3 mm는 기준 값이 아니야. 두께 2 mm 미만은 못 써.'], [0.75, '0.75는 다른 기준(접지도체 단면적 0.75 ㎟)에 나오는 값이야.']],
      trap: '"2"가 지상 높이(2 m)와 두께(2 mm)에 둘 다 나와서 헷갈려. 단위가 달라.',
    },
    {
      key: 'water-ohm', text: '지중에 매설된 금속제 수도관로를 접지극으로 쓰려면, 대지와의 전기저항이 몇 Ω 이하를 유지해야 해?',
      ans: 3, unit: 'Ω', dec: 1, clause: '142.2의 7 가', quote: '대지와의 전기저항 값이 3 Ω 이하의 값을 유지하고 있는 금속제 수도관로',
      rule: '대지와의 전기저항이 3 Ω 이하인 금속제 수도관로는 접지극으로 사용할 수 있음',
      wrong: [[2, '2 Ω는 건축물·구조물의 철골을 접지극으로 쓸 때의 기준이야(수도관은 3 Ω).'], [5, '5 Ω은 이 기준의 저항 값이 아니야. 5 m는 분기점으로부터의 거리로 나오는 숫자야.'], [10, '10 Ω은 이 기준에 나오는 값이 아니야.'], [100, '100 Ω은 이 기준에 나오는 값이 아니야.']],
      trap: '수도관 3 Ω, 철골 2 Ω. 수도관이 더 헐렁해.',
    },
    {
      key: 'steel-ohm', text: '건축물·구조물의 철골 기타 금속제를 접지극으로 쓰려면 대지와의 전기저항은 몇 Ω 이하야?',
      ans: 2, unit: 'Ω', dec: 1, clause: '142.2의 7 나', quote: '대지와의 사이에 전기저항 값이 2 Ω 이하',
      rule: '철골 등을 접지극으로 쓰려면 대지와의 전기저항이 2 Ω 이하',
      wrong: [[3, '3 Ω은 금속제 수도관로를 접지극으로 쓸 때의 기준이야.'], [5, '5 Ω은 이 기준에 나오는 값이 아니야.'], [10, '10 Ω은 이 기준에 나오는 값이 아니야.'], [1, '1 Ω은 이 기준에 나오는 값이 아니야.']],
      trap: '수도관 3 Ω, 철골 2 Ω — 철골 쪽이 더 엄격해.',
    },
    {
      key: 'water-dia', text: '접지도체를 금속제 수도관로에 접속하는 곳은 안지름이 몇 mm 이상인 부분이어야 해?',
      ans: 75, unit: 'mm', dec: 0, clause: '142.2의 7 가 (1)', quote: '안지름 75 ㎜ 이상인 부분',
      rule: '접지도체와 수도관로의 접속은 안지름 75 mm 이상인 부분(또는 분기점으로부터 5 m 이내)에서 함',
      wrong: [[50, '50 mm는 이 기준에 나오는 값이 아니야. 안지름 75 mm 이상이야.'], [100, '100 mm는 이 기준에 나오는 값이 아니야. 안지름 75 mm 이상이야.'], [25, '25 mm는 이 기준에 나오는 값이 아니야(접지극 강관의 지름이 25 mm야).'], [150, '150 mm는 이 기준에 나오는 값이 아니야.']],
      trap: '75 mm 미만의 분기관에서는 분기점에서 5 m 이내에서만 접속해야 해.',
    },
    {
      key: 'water-branch', text: '안지름 75 mm 미만으로 분기한 수도관에서는, 접지도체를 분기점으로부터 몇 m 이내 부분에 접속해야 해? (수도관로와 대지 사이 저항이 2 Ω 이하인 경우는 제외)',
      ans: 5, unit: 'm', dec: 0, clause: '142.2의 7 가 (1)', quote: '분기점으로부터 5 m 이내의 부분',
      rule: '안지름 75 mm 미만 분기관은 분기점으로부터 5 m 이내 부분에서 접속(대지 저항 2 Ω 이하면 5 m를 넘을 수 있음)',
      wrong: [[3, '3 m는 이 기준에 나오는 거리가 아니야(3은 Ω 기준에 나오는 숫자야).'], [10, '10 m는 이 기준에 나오는 거리가 아니야.'], [2, '2 m는 이 기준에 나오는 거리가 아니야(2는 Ω 기준에 나오는 숫자야).'], [1, '1 m는 접지극을 금속체에서 떼어 묻는 거리야.']],
      trap: '대지 저항이 2 Ω 이하이면 5 m를 넘어서 접속할 수 있어.',
    },
  ]);

  // ═════════ 5. 보호도체·접지도체의 굵기 ═════════
  Q('cd-pe-section', '142.3.2의 1 가, 표 142.3-1', 'S ≤ 16 S 16 < S ≤ 35 16a S > 35 Sa/2');
  T({
    id: 'cd-pe-section',
    concept: 'cd-pe',
    noCalc: true,
    gen(r) {
      const S = r.pick([2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300]);
      const ans = S <= 16 ? S : S <= 35 ? 16 : S / 2;
      const dis = [];
      const add = (v, why) => dis.push({ v, why });
      if (ans !== S / 2) add(S / 2, '절반(S/2)은 선도체가 35 ㎟를 넘을 때만 써. 이 문제는 그 구간이 아니야.');
      if (ans !== 16) add(16, '16 ㎟는 선도체가 16 ㎟ 초과 35 ㎟ 이하일 때의 값이야.');
      if (ans !== S) add(S, '선도체와 같은 굵기는 선도체가 16 ㎟ 이하일 때만 해당해.');
      add(S * 2, '보호도체를 선도체보다 굵게 할 필요는 없어.');
      add(35, '35 ㎟는 구간의 경계값일 뿐 보호도체의 굵기가 아니야.');
      return {
        params: { S },
        text: '선도체가 구리 ' + q(S, '㎟') + '이고 보호도체도 같은 재질(구리)이며 선도체와 같은 케이블 안에 있어. 표 142.3-1로 정할 때 보호도체의 최소 단면적은 몇 ㎟야?',
        formula: 'S ≤ 16 → S,  16 < S ≤ 35 → 16,  S > 35 → S/2 (같은 재질)',
        unit: '㎟',
        decimals: 2,
        answer: ans,
        distractors: dis,
        conclusion: S <= 16 ? 'S ≤ 16 ㎟ 구간이라 선도체와 같은 ' + q(ans, '㎟') : S <= 35 ? '16 < S ≤ 35 구간이라 ' + q(ans, '㎟') : 'S > 35 구간이라 S/2 = ' + q(ans, '㎟'),
        steps: ['선도체 단면적 S = ' + q(S, '㎟') + '이야.', '구간을 정해: S ≤ 16이면 S, 16 < S ≤ 35이면 16, S > 35이면 S/2.', S <= 16 ? S + '는 16 이하라서 같은 굵기 ' + q(ans, '㎟') + '.' : S <= 35 ? S + '는 16 초과 35 이하라서 16 ㎟.' : S + '는 35 초과라서 ' + S + ' ÷ 2 = ' + n(ans) + ' ㎟.'],
        check: ans <= S ? '보호도체(' + q(ans, '㎟') + ')가 선도체(' + q(S, '㎟') + ')보다 같거나 가늘어서 규칙과 맞아.' : '',
        traps: ['"16 이하는 같은 굵기, 16~35는 16, 35 초과는 절반" 세 구간을 순서대로 확인해.', '이 표는 선도체와 보호도체의 재질이 같을 때야. 재질이 다르면 다른 식을 써.'],
      };
    },
  });

  const GW = [
    { key: 'neutral', text: '중성점 접지용 접지도체의 최소 단면적(연동선)은 몇 ㎟야? (아래 예외 조건에 해당하지 않는 일반적인 경우)', ans: 16, clause: '142.3.1의 4 나', quote: '중성점 접지용 접지도체는 공칭단면적 16 ㎟ 이상의 연동선', rule: '중성점 접지용 접지도체는 공칭단면적 16 ㎟ 이상의 연동선', wrongKeys: [6, 10, 4, 25] },
    { key: 'neutral-7kv', text: '7 kV 이하 전로의 중성점 접지용 접지도체는 최소 단면적(연동선)이 몇 ㎟면 돼?', ans: 6, clause: '142.3.1의 4 나 (1)', quote: '(1) 7 kV 이하의 전로', rule: '7 kV 이하 전로의 중성점 접지용 접지도체는 6 ㎟ 이상의 연동선', wrongKeys: [16, 10, 4, 2.5] },
    { key: 'neutral-25kv', text: '사용전압 25 kV 이하인 특고압 가공전선로(중성선 다중접지 방식, 지락 시 2초 이내에 자동 차단)의 중성점 접지용 접지도체는 최소 단면적(연동선)이 몇 ㎟면 돼?', ans: 6, clause: '142.3.1의 4 나 (2)', quote: '지락이 생겼을 때 2초 이내에 자동적으로 이를 전로로부터 차단하는 장치가 되어 있는 것', rule: '25 kV 이하 특고압 가공전선로(다중접지, 2초 이내 자동 차단)의 중성점 접지용 접지도체는 6 ㎟ 이상', wrongKeys: [16, 10, 4, 2.5] },
    { key: 'mobile-hv', text: '이동하여 사용하는 전기기계기구의 금속제 외함 접지에서, 특고압·고압 전기설비용 접지도체와 중성점 접지용 접지도체(캡타이어케이블 1개 도체 등)의 단면적은 몇 ㎟ 이상이어야 해?', ans: 10, clause: '142.3.1의 4 다 (1)', quote: '단면적이 10 ㎟ 이상인 것을 사용한다', rule: '이동용 특고압·고압 및 중성점 접지용 접지도체(캡타이어케이블 등)는 10 ㎟ 이상', wrongKeys: [16, 6, 4, 1.5] },
    { key: 'mobile-lv-cord', text: '이동하여 사용하는 저압 전기설비용 접지도체로 다심 코드 또는 다심 캡타이어케이블을 쓸 때, 1개 도체의 단면적은 몇 ㎟ 이상이어야 해?', ans: 0.75, clause: '142.3.1의 4 다 (2)', quote: '1개 도체의 단면적이 0.75 ㎟ 이상인 것을 사용한다', rule: '이동용 저압 접지도체는 다심 코드·다심 캡타이어케이블 1개 도체 0.75 ㎟ 이상', wrongKeys: [1.5, 2.5, 4, 6] },
    { key: 'mobile-lv-flex', text: '이동하여 사용하는 저압 전기설비용 접지도체로 기타 유연성이 있는 연동연선을 쓸 때, 1개 도체의 단면적은 몇 ㎟ 이상이어야 해?', ans: 1.5, clause: '142.3.1의 4 다 (2)', quote: '1개 도체의 단면적이 1.5 ㎟ 이상인 것을 사용한다', rule: '이동용 저압 접지도체로 기타 유연성 연동연선은 1개 도체 1.5 ㎟ 이상', wrongKeys: [0.75, 2.5, 4, 6] },
  ];
  const GW_CTX = {
    0.75: '이동용 저압 접지도체(다심 코드·다심 캡타이어케이블 1개 도체)의 최소 단면적',
    1.5: '이동용 저압 접지도체 중 기타 유연성 연동연선의 최소 단면적',
    2.5: '케이블의 일부가 아닌 보호도체가 기계적 손상으로부터 보호될 때의 최소 단면적',
    4: '케이블의 일부가 아닌 보호도체가 기계적 보호를 받지 않을 때의 최소 단면적',
    6: '7 kV 이하 전로 등 예외 조건의 중성점 접지용(또는 특고압·고압용) 접지도체 단면적',
    10: '이동용 특고압·고압 및 중성점 접지용 접지도체의 단면적',
    16: '일반 중성점 접지용 접지도체의 단면적',
    25: '이 기준에 접지도체 값으로 나오지 않는 숫자',
  };
  factTemplate(
    'cd-gnd-wire',
    'cd-pe',
    GW.map((g) => ({
      key: g.key, text: g.text, ans: g.ans, unit: '㎟', dec: 2, clause: g.clause, quote: g.quote, rule: g.rule,
      wrong: g.wrongKeys.map((v) => [v, v + ' ㎟는 ' + GW_CTX[v] + '야. 이 문제의 조건과는 달라.']),
      trap: '중성점 접지용은 16 ㎟가 기본이고, 7 kV 이하나 25 kV 이하 다중접지 특례에서 6 ㎟야. 이동용은 10 ㎟(고압·중성점)와 0.75 / 1.5 ㎟(저압)야.',
    }))
  );
})(globalThis.GISA);
