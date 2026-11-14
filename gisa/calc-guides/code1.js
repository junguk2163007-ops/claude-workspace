// 계산기 풀이 가이드: 전기설비기술기준 1차 (계산이 있는 문제만. 표에서 값을 고르는 문제는 계산기 대상이 아니야)
(function (G) {
  'use strict';
  const g = G.guide;
  const r3 = (x) => Math.round(x * 1000) / 1000;

  const timesFloor = (p) => {
    const raw = r3(p.V * p.mult);
    const st = [{ say: '시험전압 = 최대사용전압 × 배수 (배수 ' + p.mult + ')', expr: 'V*mult' }];
    if (p.floor > 0 && raw < p.floor) st.push({ say: '계산값 ' + raw + '이 하한 ' + p.floor + ' (kV)보다 작아서 하한값을 시험전압으로 써', expr: 'floor' });
    return st;
  };
  g('cd-insul-line', timesFloor);
  g('cd-insul-eq', timesFloor);

  g('cd-height-ehv', (p) =>
    p.N > 0
      ? [
          { say: '160 kV를 넘는 단수 = (V − 160) ÷ 10 (결과를 올림해서 ' + p.N + '단)', expr: '(V-160)/10' },
          { say: '높이 = 기준값 + 단수 × 0.12 m', expr: 'base+N*0.12' },
        ]
      : [{ say: '160 kV 이하라서 기준값 그대로', expr: 'base' }]
  );
  g('cd-embed', (p) =>
    p.kind === 'short'
      ? [{ say: '전체 길이 15 m 이하는 길이의 1/6 이상 묻어', expr: 'L/6' }]
      : p.kind === 'long'
      ? [{ say: '전체 길이 15 m 초과(16 m 이하)는 2.5 m 이상', expr: '2.5' }]
      : [{ say: '철근 콘크리트주 16 m 초과 20 m 이하(설계하중 6.8 kN 이하)는 2.8 m 이상', expr: '2.8' }]
  );
  g('cd-wind-byung', () => [{ say: '병종 풍압은 갑종 풍압의 1/2', expr: 'P/2' }]);
})(globalThis.GISA);
