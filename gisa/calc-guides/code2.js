// 계산기 풀이 가이드: 전기설비기술기준 2차
(function (G) {
  'use strict';
  const g = G.guide;
  const fuseMult = (I, blow) => (blow ? (I <= 4 ? 2.1 : I < 16 ? 1.9 : 1.6) : I < 16 ? 1.5 : 1.25);

  g('cd-fuse-trip', (p) => {
    const m = fuseMult(p.I, p.blow);
    return [{ say: (p.blow ? '용단전류' : '불용단전류') + ' = 정격전류 × ' + m + '배 (표 212.3-1)', expr: 'I*mult', vars: { mult: m } }];
  });
  g('cd-mccb-trip', (p) => [{ say: '동작·부동작 전류 = 정격전류 × ' + p.mult + '배 (표 212.3-2, 212.3-4)', expr: 'I*mult' }]);
  g('cd-mccb-inst', (p) => {
    const r = { B: [3, 5], C: [5, 10], D: [10, 20] }[p.type];
    const k = p.hi ? r[1] : r[0];
    return [{ say: p.type + '형 순시트립 범위의 ' + (p.hi ? '상한' : '하한') + ' = ' + k + ' × In', expr: 'k*In', vars: { k } }];
  });
  g('cd-bldg-ehv', (p) =>
    p.N > 0
      ? [
          { say: '35 kV를 넘는 단수 = (V − 35) ÷ 10 (결과를 올림해서 ' + p.N + '단)', expr: '(V-35)/10' },
          { say: '간격 = 기준값 + 단수 × 0.15 m', expr: 'base+N*0.15' },
        ]
      : [{ say: '35 kV 이하라서 기준값 그대로', expr: 'base' }]
  );
  g('cd-downcond', (p) => [
    { say: '둘레 ÷ 최대 간격 (결과를 올림하고, 최소 2가닥)', expr: 'L/d' },
    { say: '올림한 개수 ' + p.N + '가닥', expr: 'N' },
  ]);
})(globalThis.GISA);
