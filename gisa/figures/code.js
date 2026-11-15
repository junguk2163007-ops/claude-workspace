// 개념 그림 3묶음: 전기설비기술기준 (한국전기설비규정 2026.1.5 개정 전문 기준의 수치)
(function (G) {
  'use strict';
  const F = G.figure;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const T = (x, y, s, a, c) => '<text x="' + x + '" y="' + y + '" text-anchor="' + (a || 'middle') + '" class="' + (c || '') + '">' + esc(s) + '</text>';
  const L = (x1, y1, x2, y2, c, extra) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + (c ? ' class="' + c + '"' : '') + (extra || '') + '/>';
  const GROUND = (x1, x2, y) => L(x1, y, x2, y, '', ' stroke-width="2"') + Array.from({ length: Math.floor((x2 - x1) / 12) }, (_, i) => L(x1 + 6 + i * 12, y, x1 + i * 12, y + 8, '', ' stroke-width="1" opacity="0.5"')).join('');
  const DIM_V = (x, y1, y2) => '<path d="M' + x + ' ' + y1 + 'V' + y2 + '" marker-start="url(#ah)" marker-end="url(#ah)"/>';
  const DIM_H = (x1, x2, y) => '<path d="M' + x1 + ' ' + y + 'H' + x2 + '" marker-start="url(#ah)" marker-end="url(#ah)"/>';
  const SC = 16; // 1 m = 16 px (높이 그림)

  F('cd-height', {
    id: 'wire-height',
    title: '가공전선의 최소 높이',
    caption: '저압·고압 가공전선의 최소 높이: 도로 횡단 6 m, 철도·궤도 횡단 6.5 m(레일면상), 횡단보도교 위 3.5 m(노면상, 저압 절연전선·케이블은 3 m), 그 밖의 장소 5 m. 특고압은 35 kV 이하 5 m, 초과 6 m이고 160 kV를 넘으면 10 kV(단수)마다 0.12 m를 더해.',
    vb: [460, 230],
    svg:
      GROUND(10, 450, 190) +
      // 도로 횡단 6 m
      '<path class="a" d="M20 ' + (190 - 6 * SC) + 'H110" stroke-width="2.6"/>' + DIM_V(30, 190 - 6 * SC, 190) + T(66, 202 + 12, '도로 횡단', 'middle', 'sm') + T(66, 228, '6 m', 'middle', '') +
      '<rect x="62" y="174" width="30" height="14" rx="3" class="f"/><circle cx="70" cy="190" r="3.5"/><circle cx="85" cy="190" r="3.5"/>' +
      // 철도 6.5 m
      '<path class="a" d="M130 ' + (190 - 6.5 * SC) + 'H220" stroke-width="2.6"/>' + DIM_V(140, 190 - 6.5 * SC, 190) + T(176, 214, '철도·궤도 횡단', 'middle', 'sm') + T(176, 228, '6.5 m (레일면상)', 'middle', '') +
      '<path d="M156 190H206M162 190V196M174 190V196M186 190V196M198 190V196" stroke-width="2"/>' +
      // 횡단보도교 3.5 m (노면상)
      '<path d="M236 126H330" stroke-width="3"/><path d="M244 126V190M322 126V190"/>' +
      '<path class="a" d="M236 ' + (126 - 3.5 * SC) + 'H330" stroke-width="2.6"/>' + DIM_V(262, 126 - 3.5 * SC, 126) + T(283, 214, '횡단보도교 위', 'middle', 'sm') + T(283, 228, '3.5 m (노면상)', 'middle', '') +
      // 그 밖 5 m
      '<path class="a" d="M350 ' + (190 - 5 * SC) + 'H445" stroke-width="2.6"/>' + DIM_V(362, 190 - 5 * SC, 190) + T(398, 214, '그 밖의 장소', 'middle', 'sm') + T(398, 228, '5 m', 'middle', '') +
      '<circle cx="410" cy="178" r="5"/><path d="M410 183V190M404 186l6-3 6 3"/>' +
      T(230, 14, '저압·고압 가공전선 (지표상·레일면상·노면상)', 'middle', 'sm'),
  });

  F('cd-earth', {
    id: 'earth-electrode-depth',
    title: '접지극 매설 깊이와 접지도체 보호',
    caption: '접지극은 지하 0.75 m 이상에 묻어(고압 이상 설비). 사람이 닿을 수 있는 접지도체는 지하 0.75 m부터 지표 위 2 m까지 두께 2 mm 이상 합성수지관 등으로 덮어. 철주 같은 금속체를 따라 시설하면 접지극은 금속체에서 1 m 이상 떼어 묻어.',
    vb: [460, 240],
    svg:
      GROUND(20, 440, 150) + '<rect x="320" y="24" width="110" height="40" rx="6" class="f"/>' + T(375, 48, '전기설비', 'middle', 'sm') +
      '<rect x="211" y="50" width="18" height="138" rx="3" fill="var(--surface-2)" fill-opacity="0.9"/>' + '<path d="M320 44H220V188" class="a" stroke-width="2.4"/>' +
      '<rect x="188" y="188" width="64" height="8" rx="2" class="f"/>' +
      DIM_V(170, 150, 188) + T(162, 174, '0.75 m', 'end', '') + DIM_V(170, 150, 50) + T(162, 104, '2 m', 'end', '') +
      T(240, 100, '합성수지관 (두께 2 mm 이상)', 'start', 'sm') + T(240, 214, '접지극 (지하 0.75 m 이상)', 'start', 'sm') + T(240, 168, '지표면', 'start', 'sm') + T(20, 16, '접지도체 보호: 지하 0.75 m ~ 지상 2 m', 'start', 'sm'),
  });

  F('cd-support', {
    id: 'pole-embed-guy',
    title: '전주 매설 깊이와 지지선',
    caption: '설계하중 6.8 kN 이하이고 전체 길이 15 m 이하인 전주는 길이의 1/6 이상을 땅에 묻어(15 m 초과는 2.5 m 이상). 지지선은 안전율 2.5 이상, 허용 인장하중 최저 4.31 kN이고, 도로를 횡단하면 지표상 5 m 이상이야.',
    vb: [460, 240],
    svg:
      GROUND(20, 440, 152) + '<rect x="196" y="20" width="12" height="158" class="f" fill-opacity="0.8"/><path d="M196 20H208V178H196Z"/>' +
      '<path d="M170 40H234M180 58H224" stroke-width="2.4"/>' +
      '<path class="a" d="M202 52L360 152" stroke-width="2"/><path d="M360 152V196M346 196H374" stroke-width="2.4"/><circle cx="360" cy="152" r="3" fill="currentColor"/>' +
      DIM_V(150, 20, 178) + T(142, 104, 'L', 'end', '') + DIM_V(172, 152, 178) + T(164, 170, 'L/6', 'end', '') +
      T(250, 70, '지지선', 'start', 'sm') + T(300, 214, '지지선 기초(앵커)', 'start', 'sm') + T(20, 206, '매설 깊이: L/6 이상 (L ≤ 15 m)', 'start', 'sm') + T(20, 222, '15 m 초과는 2.5 m 이상', 'start', 'sm') + T(20, 14, '지지선 안전율 ≥ 2.5, 허용 인장하중 ≥ 4.31 kN', 'start', 'sm'),
  });

  F('cd-approach', {
    id: 'building-clearance',
    title: '가공전선과 건조물 사이의 간격',
    caption: '저압·고압 가공전선과 건물 상부 조영재(지붕 등) 사이: 위쪽 2 m(저압은 고압·특고압 절연전선·케이블, 고압은 케이블이면 1 m), 옆쪽·아래쪽 1.2 m(접촉 우려가 없게 시설하면 0.8 m, 케이블 등은 0.4 m). 건조물 아래쪽에 시설하면 저압 0.6 m, 고압 0.8 m야.',
    vb: [460, 230],
    svg:
      GROUND(20, 440, 200) + '<path d="M90 200V130H250V200" class="f" fill-opacity="0.5"/><path d="M80 130H260"/><path d="M90 130L170 84L250 130"/>' +
      '<rect x="150" y="150" width="40" height="50" fill="var(--surface)"/>' +
      '<circle class="af" cx="170" cy="40" r="4"/>' + DIM_V(192, 40, 84) + T(200, 66, '위쪽 2 m (케이블 1 m)', 'start', 'sm') +
      '<circle class="af" cx="300" cy="150" r="4"/>' + DIM_H(250, 296, 150) + T(256, 142, '옆쪽 1.2 m', 'start', 'sm') + T(256, 172, '(0.8 m / 케이블 0.4 m)', 'start', 'sm') +
      T(170, 220, '건물(조영재)', 'middle', 'sm') + T(318, 150, '← 가공전선(단면)', 'start', 'sm') +
      T(300, 30, '특고압은 표 333.23-1', 'start', 'sm') + T(300, 46, '(35 kV 초과 시 10 kV마다 +0.15 m)', 'start', 'sm'),
  });

  F('cd-lightning', {
    id: 'lightning-system',
    title: '피뢰시스템의 구성',
    caption: '번개를 받는 수뢰부(돌침 등), 땅으로 내려보내는 인하도선, 땅에 퍼뜨리는 접지극으로 이루어져. 수뢰부는 보호각법·회전구체법·그물망법으로 배치하고, 접지극은 지하 0.75 m 이상에 묻어.',
    vb: [460, 250],
    svg:
      '<path d="M130 10l-14 22 14-6-18 28 6-2" stroke-width="2.6" class="a" fill="none"/>' + '<path d="M110 54L96 74" class="a" stroke-width="2.6"/>' +
      '<path d="M96 74V84"/>' + '<path d="M96 84l-6 6M96 84l6 6" stroke="none"/>' +
      '<path d="M60 130L96 84L132 130" stroke-dasharray="5 4" opacity="0.7"/>' + T(60, 124, '보호각', 'end', 'sm') +
      '<rect x="40" y="130" width="112" height="82" class="f" fill-opacity="0.5"/><path d="M34 130H158"/>' +
      '<path d="M96 84V130"/><path class="a" d="M52 130V224" stroke-width="2.4"/>' +
      GROUND(10, 200, 212) + '<rect x="34" y="224" width="36" height="7" rx="2" class="f"/>' +
      T(214, 70, '① 수뢰부시스템', 'start', '') + T(214, 86, '돌침·수평도체·그물망도체', 'start', 'sm') + T(214, 106, '배치: 보호각법·회전구체법·그물망법', 'start', 'sm') +
      T(214, 140, '② 인하도선시스템', 'start', '') + T(214, 156, '분리되지 않은 경우 2가닥 이상', 'start', 'sm') + T(214, 172, '병렬 간격 Ⅰ·Ⅱ 10 m, Ⅲ 15 m, Ⅳ 20 m', 'start', 'sm') +
      T(214, 206, '③ 접지극시스템', 'start', '') + T(214, 222, '지표면에서 0.75 m 이상 깊이에 매설', 'start', 'sm') + T(214, 238, '높이 20 m 이상 건축물에 시설', 'start', 'sm'),
  });
})(globalThis.GISA);
