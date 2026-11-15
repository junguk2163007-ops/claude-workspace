// 개념 그림 1묶음: 회로 기본·교류·3상·전기자기학 (직접 그린 도식과 실물 일러스트)
(function (G) {
  'use strict';
  const F = G.figure;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const T = (x, y, s, a, c) => '<text x="' + x + '" y="' + y + '" text-anchor="' + (a || 'middle') + '" class="' + (c || '') + '">' + esc(s) + '</text>';
  const L = (x1, y1, x2, y2, c, extra) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + (c ? ' class="' + c + '"' : '') + (extra || '') + '/>';
  const r1 = (v) => Math.round(v * 10) / 10;

  // 저항 지그재그 (가로/세로)
  function zigH(x1, x2, y) {
    const len = x2 - x1;
    const lead = len * 0.15;
    const w = (len - 2 * lead) / 6;
    let d = 'M' + x1 + ' ' + y + 'H' + r1(x1 + lead);
    for (let i = 0; i < 6; i++) d += 'L' + r1(x1 + lead + w * (i + 0.5)) + ' ' + (y + (i % 2 ? 8 : -8));
    return '<path d="' + d + 'L' + r1(x2 - lead) + ' ' + y + 'H' + x2 + '"/>';
  }
  function zigV(x, y1, y2) {
    const len = y2 - y1;
    const lead = len * 0.15;
    const w = (len - 2 * lead) / 6;
    let d = 'M' + x + ' ' + y1 + 'V' + r1(y1 + lead);
    for (let i = 0; i < 6; i++) d += 'L' + (x + (i % 2 ? 8 : -8)) + ' ' + r1(y1 + lead + w * (i + 0.5));
    return '<path d="' + d + 'L' + x + ' ' + r1(y2 - lead) + 'V' + y2 + '"/>';
  }
  // 직류 전원(긴 선 +, 짧은 선 −): 세로, 위쪽이 +
  const battery = (x, y) => L(x - 14, y - 7, x + 14, y - 7) + L(x - 8, y + 7, x + 8, y + 7, '', ' stroke-width="3"') + T(x + 22, y - 3, '+', 'start', 'sm') + T(x + 22, y + 12, '−', 'start', 'sm');

  // ───────── 옴의 법칙 ─────────
  F('ohm', {
    id: 'ohm-resistor-real',
    title: '실물 저항기와 회로 기호',
    caption: '색띠 저항기: 갈(1)·검(0)·빨(×100)·금(±5 %) = 10 × 100 = 1 kΩ ±5 %. 회로도에서는 지그재그 기호(R)로 그려.',
    vb: [320, 165],
    svg:
      T(160, 16, '실물: 색띠 저항기', 'middle', 'sm') +
      L(20, 55, 95, 55) + L(225, 55, 300, 55) +
      '<rect x="95" y="37" width="130" height="36" rx="16" fill="#d9b98a" stroke="currentColor"/>' +
      '<rect x="116" y="38" width="9" height="34" fill="#7b4a1e" stroke="none"/><rect x="134" y="38" width="9" height="34" fill="#1f1f1f" stroke="none"/><rect x="152" y="38" width="9" height="34" fill="#c0392b" stroke="none"/><rect x="196" y="38" width="9" height="34" fill="#d4af37" stroke="none"/>' +
      T(120.5, 90, '1', 'middle', 'sm') + T(138.5, 90, '0', 'middle', 'sm') + T(156.5, 90, '×100', 'middle', 'sm') + T(200.5, 90, '±5%', 'middle', 'sm') +
      T(160, 110, '기호', 'middle', 'sm') + zigH(95, 225, 130) + L(20, 130, 95, 130) + L(225, 130, 300, 130) + T(160, 158, 'R [Ω]', 'middle', ''),
  });
  F('ohm', {
    id: 'ohm-loop',
    title: '전원과 저항이 이어진 회로',
    caption: '전원(V)이 전류를 미는 힘이고, 저항(R)이 전류를 막는 정도야. 전류 I는 V를 R로 나눈 만큼 흘러.',
    vb: [320, 170],
    svg:
      '<path d="M60 36H110"/>' + zigH(110, 210, 36) + '<path d="M210 36H260V140H60V122M60 102V36"/>' +
      battery(60, 112) + T(34, 114, 'V', 'end', '') + T(160, 66, 'R', 'middle', '') +
      '<path class="a" d="M205 22H240" marker-end="url(#aa)"/>' + T(224, 16, 'I', 'middle', '') +
      T(160, 160, 'V = I × R   →   I = V / R', 'middle', ''),
  });

  // ───────── 직렬 · 병렬 · 분압 ─────────
  F('series', {
    id: 'series-loop',
    title: '직렬 회로',
    caption: '저항이 한 줄로 이어져서 전류 I가 모두 같아. 전압은 저항 크기대로 나눠 걸려서 V = V1 + V2, 합성저항 R = R1 + R2.',
    vb: [360, 180],
    svg:
      '<path d="M50 40H90"/>' + zigH(90, 160, 40) + zigH(160, 230, 40) + '<path d="M230 40H300V140H50V122M50 102V40"/>' +
      battery(50, 112) + T(26, 114, 'V', 'end', '') + T(125, 66, 'R1', 'middle', '') + T(195, 66, 'R2', 'middle', '') +
      T(125, 84, 'V1', 'middle', 'sm') + T(195, 84, 'V2', 'middle', 'sm') +
      '<path class="a" d="M105 22H135" marker-end="url(#aa)"/><path class="a" d="M175 22H205" marker-end="url(#aa)"/>' + T(120, 16, 'I', 'middle', '') + T(190, 16, 'I', 'middle', '') +
      T(180, 166, 'R = R1 + R2,   I 같음,   V = V1 + V2', 'middle', ''),
  });
  F('parallel', {
    id: 'parallel-loop',
    title: '병렬 회로',
    caption: '두 저항 양끝에 같은 전압 V가 걸려. 전류는 갈라져서 I = I1 + I2, 합성저항은 1/R = 1/R1 + 1/R2 (저항이 작은 쪽으로 전류가 더 많이 흘러).',
    vb: [360, 190],
    svg:
      '<path d="M50 40H230M50 150H230M50 40V102M50 122V150"/>' + battery(50, 112) + T(26, 114, 'V', 'end', '') +
      L(130, 40, 130, 56) + zigV(130, 56, 134, '') + L(130, 134, 130, 150) +
      L(210, 40, 210, 56) + zigV(210, 56, 134, '') + L(210, 134, 210, 150) +
      T(152, 98, 'R1', 'start', '') + T(232, 98, 'R2', 'start', '') +
      '<path class="a" d="M80 28H112" marker-end="url(#aa)"/>' + T(96, 18, 'I', 'middle', '') +
      '<path class="a" d="M142 28H170" marker-end="url(#aa)"/>' + T(156, 18, 'I1', 'middle', 'sm') +
      '<path class="a" d="M222 28H250" marker-end="url(#aa)"/>' + T(236, 18, 'I2', 'middle', 'sm') +
      T(180, 180, 'V 같음,   I = I1 + I2,   1/R = 1/R1 + 1/R2', 'middle', ''),
  });
  F('divider', {
    id: 'divider-loop',
    title: '분압 회로',
    caption: '직렬 저항에서 R2 양끝만 꺼내 쓰면 출력 전압은 V × R2/(R1+R2). 저항이 큰 쪽에 전압이 더 많이 걸려.',
    vb: [360, 190],
    svg:
      '<path d="M50 40H100"/>' + zigH(100, 190, 40) + '<path d="M190 40H290"/>' + L(290, 40, 290, 60) + zigV(290, 60, 140, '') + '<path d="M290 140V150H50V122M50 102V40"/>' +
      battery(50, 112) + T(26, 114, 'V', 'end', '') + T(145, 66, 'R1', 'middle', '') + T(268, 104, 'R2', 'end', '') +
      '<circle cx="290" cy="40" r="3" fill="currentColor"/><circle cx="290" cy="140" r="3" fill="currentColor"/>' +
      '<path d="M290 40H330M290 140H330"/><path class="a" d="M322 46V134" marker-start="url(#aa)" marker-end="url(#aa)"/>' + T(335, 96, 'Vout', 'start', '') +
      T(180, 178, 'Vout = V × R2 / (R1 + R2)', 'middle', ''),
  });

  // ───────── RLC 직렬 · 임피던스 삼각형 ─────────
  F('rlc', {
    id: 'rlc-series',
    title: 'RLC 직렬 회로와 임피던스 삼각형',
    caption: '저항 R은 에너지를 쓰고, 코일 X_L은 전류를 늦추고, 콘덴서 X_C는 전류를 앞세워. 합쳐진 리액턴스 X = X_L − X_C 와 R이 직각삼각형을 이뤄 Z = √(R² + X²).',
    vb: [460, 200],
    svg:
      '<path d="M40 40H62"/>' + zigH(62, 112, 40) +
      '<path d="M112 40H128a5 5 0 0 1 10 0a5 5 0 0 1 10 0a5 5 0 0 1 10 0a5 5 0 0 1 10 0H178"/>' +
      '<path d="M178 40H190M190 28V52M198 28V52M198 40H225"/>' + '<path d="M225 40H240V120H40V90M40 62V40"/>' +
      '<circle cx="40" cy="76" r="14"/><path d="M31 76q4.5-9 9 0t9 0"/>' +
      T(87, 66, 'R', 'middle', '') + T(145, 66, 'L', 'middle', '') + T(194, 66, 'C', 'middle', '') +
      T(145, 84, 'X_L = ωL', 'middle', 'sm') + T(196, 100, 'X_C = 1/(ωC)', 'middle', 'sm') + T(140, 138, '교류 전원', 'middle', 'sm') +
      '<path d="M300 150H420V92Z" class="f" fill-opacity="0.35"/>' + T(360, 168, 'R', 'middle', '') + T(428, 126, 'X', 'start', '') + T(350, 112, 'Z', 'end', '') + T(332, 144, 'θ', 'start', 'sm') +
      T(230, 190, 'X = X_L − X_C,   Z = √(R² + X²),   역률 cosθ = R / Z', 'middle', 'sm'),
  });

  // ───────── 공진 ─────────
  (function () {
    // I = 1/√(1 + Q²(f/f0 − f0/f)²), Q = 5
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const u = 0.55 + (0.9 * i) / 120;
      const I = 1 / Math.sqrt(1 + 25 * Math.pow(u - 1 / u, 2));
      pts.push(r1(40 + ((u - 0.5) / 1.0) * 290) + ' ' + r1(160 - I * 120));
    }
    F('resonance', {
      id: 'resonance-curve',
      title: '직렬 공진 곡선',
      caption: '주파수가 공진 주파수 f₀에 맞으면 X_L = X_C 라서 서로 상쇄되고 임피던스가 R만 남아 전류가 최대가 돼. 공진 주파수 f₀ = 1/(2π√(LC)).',
      vb: [360, 200],
      svg:
        L(40, 160, 340, 160, '', ' marker-end="url(#ah)"') + L(40, 160, 40, 22, '', ' marker-end="url(#ah)"') + T(340, 178, 'f', 'end', '') + T(34, 26, 'I', 'end', '') +
        '<path class="a" d="M' + pts.join('L') + '"/>' +
        '<path d="M185 160V40" stroke-dasharray="4 4"/>' + T(185, 176, 'f₀', 'middle', '') + T(190, 34, '전류 최대 (Z = R)', 'start', 'sm') +
        T(193, 52, 'X_L = X_C', 'start', 'sm') + T(100, 146, 'X_C > X_L (전류가 앞섬)', 'middle', 'sm') + T(285, 146, 'X_L > X_C (전류가 늦음)', 'middle', 'sm') +
        T(190, 196, 'f₀ = 1 / (2π√(LC))', 'middle', ''),
    });
  })();

  // ───────── Y 결선과 Δ 결선 ─────────
  F('y-delta', {
    id: 'y-delta-wiring',
    title: 'Y 결선과 Δ 결선',
    caption: 'Y(성형)는 한쪽 끝을 중성점에 모으고, Δ(삼각)는 코일을 삼각형으로 이어. Y는 선간전압이 상전압의 √3배(30° 앞섬), Δ는 선전류가 상전류의 √3배야.',
    vb: [420, 210],
    svg:
      T(100, 10, 'Y 결선', 'middle', '') + T(310, 10, 'Δ 결선', 'middle', '') +
      '<path d="M100 120V50M100 120L45 160M100 120L155 160"/>' +
      '<circle cx="100" cy="120" r="3.5" fill="currentColor"/>' + T(112, 124, 'N', 'start', 'sm') +
      '<path class="a" d="M100 50V30M45 160L30 172M155 160L170 172"/>' + T(88, 84, 'Vp', 'end', 'sm') + T(100, 28, 'a', 'middle', 'sm') + T(22, 180, 'b', 'middle', 'sm') + T(178, 180, 'c', 'middle', 'sm') +
      '<path d="M310 52L250 150H370Z"/>' + T(310, 48, '', 'middle', '') + '<path class="a" d="M310 52V30M250 150L236 162M370 150L384 162"/>' + T(310, 28, 'a', 'middle', 'sm') + T(228, 172, 'b', 'middle', 'sm') + T(392, 172, 'c', 'middle', 'sm') +
      T(310, 134, 'Vl = Vp', 'middle', 'sm') + T(100, 200, 'Vl = √3·Vp,  Il = Ip', 'middle', 'sm') + T(310, 200, 'Vl = Vp,  Il = √3·Ip', 'middle', 'sm'),
  });

  // ───────── 전기자기학 ─────────
  F('em-coulomb', {
    id: 'coulomb-force',
    title: '두 전하 사이의 힘(쿨롱의 법칙)',
    caption: '같은 부호끼리는 서로 밀어내고(반발), 다른 부호끼리는 서로 끌어당겨(인력). 힘의 크기는 전하의 곱에 비례하고 거리의 제곱에 반비례해.',
    vb: [360, 200],
    svg:
      '<circle cx="90" cy="46" r="15" class="f"/>' + T(90, 51, '+', 'middle', '') + T(90, 78, 'Q1', 'middle', 'sm') +
      '<circle cx="270" cy="46" r="15" class="f"/>' + T(270, 51, '+', 'middle', '') + T(270, 78, 'Q2', 'middle', 'sm') +
      '<path class="a" d="M72 46H40" marker-end="url(#aa)"/><path class="a" d="M288 46H320" marker-end="url(#aa)"/>' + T(180, 40, '반발력', 'middle', 'sm') +
      '<circle cx="90" cy="126" r="15" class="f"/>' + T(90, 131, '+', 'middle', '') +
      '<circle cx="270" cy="126" r="15" class="f"/>' + T(270, 131, '−', 'middle', '') +
      '<path class="a" d="M110 126H140" marker-end="url(#aa)"/><path class="a" d="M250 126H220" marker-end="url(#aa)"/>' + T(180, 120, '인력', 'middle', 'sm') +
      '<path d="M105 100H255" stroke-dasharray="3 3" marker-start="url(#ah)" marker-end="url(#ah)"/>' + T(180, 96, 'r', 'middle', 'sm') +
      T(180, 172, 'F = Q1·Q2 / (4πε₀ r²) = 9×10⁹ · Q1·Q2 / r²  [N]', 'middle', ''),
  });
  (function () {
    let lines = '';
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6;
      lines += '<path d="M' + r1(150 + 22 * Math.cos(a)) + ' ' + r1(100 + 22 * Math.sin(a)) + 'L' + r1(150 + 84 * Math.cos(a)) + ' ' + r1(100 + 84 * Math.sin(a)) + '" marker-end="url(#ah)"/>';
    }
    F('em-efield', {
      id: 'efield-point',
      title: '점전하의 전기력선과 등전위면',
      caption: '+전하에서 전기력선이 사방으로 뻗어 나가(−전하면 들어와). 점선 원은 전위가 같은 등전위면이고, 전기력선과 항상 직각이야. 멀어질수록 전계가 약해져.',
      vb: [360, 200],
      svg:
        '<circle cx="150" cy="100" r="62" stroke-dasharray="4 4" opacity="0.6"/><circle cx="150" cy="100" r="40" stroke-dasharray="4 4" opacity="0.6"/>' + lines +
        '<circle cx="150" cy="100" r="14" class="f"/>' + T(150, 105, '+', 'middle', '') +
        T(255, 58, '전기력선', 'start', 'sm') + '<path d="M252 56L212 62" stroke-width="1"/>' + T(255, 96, '등전위면(점선)', 'start', 'sm') + T(255, 150, 'E = Q / (4πε₀ r²)', 'start', 'sm') + T(255, 166, '[V/m]', 'start', 'sm'),
    });
  })();
  F('em-capacitor', {
    id: 'capacitor-real',
    title: '콘덴서 실물과 평행판 구조',
    caption: '콘덴서는 두 금속판 사이에 유전체를 끼워 전하를 모으는 부품이야. 판 면적 S가 클수록, 간격 d가 좁을수록, 유전율 ε이 클수록 많이 모아: C = εS/d.',
    vb: [420, 210],
    svg:
      T(60, 16, '실물', 'middle', 'sm') +
      '<rect x="30" y="40" width="60" height="92" rx="6" fill="#4a6fa5" fill-opacity="0.55"/><ellipse cx="60" cy="40" rx="30" ry="7" fill="#b9c4d0" stroke="currentColor"/>' +
      '<rect x="30" y="44" width="14" height="86" fill="#d8dee6" stroke="none"/>' + T(37, 92, '−', 'middle', 'sm') + T(37, 78, '−', 'middle', 'sm') + T(37, 106, '−', 'middle', 'sm') +
      L(48, 132, 48, 170) + L(72, 132, 72, 170) + T(60, 186, '전해 콘덴서', 'middle', 'sm') +
      T(160, 16, '기호', 'middle', 'sm') + L(120, 100, 150, 100) + L(150, 80, 150, 120) + L(166, 80, 166, 120) + L(166, 100, 196, 100) + T(160, 140, 'C [F]', 'middle', '') +
      T(320, 16, '평행판 단면', 'middle', 'sm') +
      '<rect x="250" y="76" width="140" height="48" class="f" fill-opacity="0.5" stroke="none"/>' +
      L(246, 76, 394, 76, '', ' stroke-width="3.5"') + L(246, 124, 394, 124, '', ' stroke-width="3.5"') +
      T(268, 68, '+ + + + + + +', 'start', 'sm') + T(268, 142, '− − − − − − −', 'start', 'sm') + T(402, 80, '+Q', 'start', 'sm') + T(402, 128, '−Q', 'start', 'sm') +
      [276, 306, 336, 366].map((x) => '<path class="a" d="M' + x + ' 82V118" marker-end="url(#aa)"/>').join('') + 
      '<path d="M236 76V124" marker-start="url(#ah)" marker-end="url(#ah)"/>' + T(230, 104, 'd', 'end', 'sm') + T(320, 156, '유전체 ε (전계 E는 + → −)', 'middle', 'sm') +
      T(320, 182, 'C = εS / d,   Q = C·V', 'middle', ''),
  });
  (function () {
    const rings = [26, 48, 70]
      .map((r) => '<circle class="a" cx="110" cy="100" r="' + r + '"/><path class="a" d="M114 ' + (100 - r) + 'H104" marker-end="url(#aa)"/><path class="a" d="M106 ' + (100 + r) + 'H116" marker-end="url(#aa)"/>')
      .join('');
    F('em-magfield', {
      id: 'magfield-wire',
      title: '직선 전류 둘레의 자기장',
      caption: '전류가 흐르는 도선 둘레에는 동심원 모양의 자기장이 생겨. 방향은 오른나사(오른손) 법칙: 엄지를 전류 방향에, 감아쥔 네 손가락이 자기장 방향이야.',
      vb: [360, 200],
      svg:
        rings + '<circle cx="110" cy="100" r="11" class="f"/><circle cx="110" cy="100" r="3" fill="currentColor"/>' + T(110, 104, '', 'middle', '') +
        T(110, 12, '전류 I: 종이에서 나오는 방향(⊙)', 'middle', 'sm') + T(228, 70, '자기장 H', 'start', 'sm') + T(228, 90, '(반시계 방향)', 'start', 'sm') +
        T(228, 130, 'H = I / (2πr) [A/m]', 'start', 'sm') + T(228, 146, 'B = μH [T]', 'start', 'sm') + T(228, 162, 'r: 도선에서의 거리', 'start', 'sm'),
    });
  })();
  F('em-force', {
    id: 'force-left-hand',
    title: '자계 속 도선이 받는 힘(플레밍의 왼손 법칙)',
    caption: '자계(B) 안에서 전류(I)가 흐르는 도선은 힘(F)을 받아. 왼손의 엄지가 힘, 검지가 자계, 중지가 전류 방향이야(전동기의 원리). 이 그림은 전류가 종이로 들어가는 경우야.',
    vb: [360, 200],
    svg:
      '<rect x="14" y="40" width="42" height="100" class="f" fill-opacity="0.6"/>' + T(35, 96, 'N', 'middle', '') + '<rect x="304" y="40" width="42" height="100" class="f" fill-opacity="0.6"/>' + T(325, 96, 'S', 'middle', '') +
      [50, 126, 150].map((y) => '<path d="M66 ' + y + 'H296" marker-end="url(#ah)" opacity="0.75"/>').join('') + T(180, 44, '자계 B (N → S)', 'middle', 'sm') +
      '<circle cx="180" cy="90" r="12" fill="var(--surface)"/><path d="M174 84L186 96M186 84L174 96"/>' + T(198, 80, 'I (전류, 들어감 ⊗)', 'start', 'sm') +
      '<path class="a" d="M180 106V170" marker-end="url(#aa)"/>' + T(196, 166, 'F (힘)', 'start', 'sm') + T(180, 192, 'F = B·I·ℓ·sinθ [N]', 'middle', ''),
  });
  F('em-induction', {
    id: 'induction-lenz',
    title: '전자유도와 렌츠의 법칙',
    caption: '코일을 지나는 자속이 변하면 코일에 전압이 생겨(패러데이). 유도 기전력은 자속의 변화를 방해하는 방향이야(렌츠): 자석의 N극이 다가오면 코일 쪽 면이 N극이 되어 밀어내.',
    vb: [380, 200],
    svg:
      '<rect x="30" y="62" width="50" height="40" class="f" fill-opacity="0.6"/>' + T(55, 88, 'S', 'middle', '') + '<rect x="80" y="62" width="50" height="40" class="af" fill-opacity="0.35"/>' + T(105, 88, 'N', 'middle', '') +
      '<path class="a" d="M140 82H178" marker-end="url(#aa)"/>' + T(160, 70, '접근', 'middle', 'sm') +
      '<ellipse cx="208" cy="82" rx="10" ry="30"/><ellipse cx="226" cy="82" rx="10" ry="30"/><ellipse cx="244" cy="82" rx="10" ry="30"/><ellipse cx="262" cy="82" rx="10" ry="30"/>' +
      '<path d="M208 112V150H300V82H272V112M262 112V150"/>' + '<circle cx="262" cy="150" r="0"/>' +
      '<circle cx="238" cy="150" r="14" fill="var(--surface)"/>' + T(238, 155, 'G', 'middle', '') + T(196, 128, '코일의 N극 면', 'end', 'sm') + T(196, 141, '(자석을 밀어냄)', 'end', 'sm') +
      T(190, 24, '자속 Φ가 늘어나면 방해하는 방향으로 유도 기전력', 'middle', 'sm') + T(190, 190, 'e = −N · dΦ/dt [V]', 'middle', ''),
  });
  (function () {
    let loops = '';
    for (let i = 0; i < 9; i++) loops += '<ellipse cx="' + (60 + i * 14) + '" cy="95" rx="8" ry="30" stroke="#b8651b" stroke-width="2.2"/>';
    let teeth = '';
    for (let i = 0; i < 26; i++) {
      const a = (i * 2 * Math.PI) / 26;
      teeth += '<path stroke="#b8651b" stroke-width="2" d="M' + r1(310 + 20 * Math.cos(a)) + ' ' + r1(95 + 20 * Math.sin(a)) + 'L' + r1(310 + 44 * Math.cos(a + 0.18)) + ' ' + r1(95 + 44 * Math.sin(a + 0.18)) + '"/>';
    }
    F('em-inductance', {
      id: 'coil-real',
      title: '코일(인덕터) 실물과 회로 기호',
      caption: '도선을 여러 번 감은 코일은 전류가 변하면 이를 막는 기전력을 만들어. 감은 수 N이 많고 단면적 S가 클수록, 길이 ℓ이 짧을수록, 투자율 μ가 큰 코어일수록 인덕턴스 L이 커져.',
      vb: [420, 220],
      svg:
        T(100, 16, '솔레노이드(공심 코일)', 'middle', 'sm') + loops + '<path d="M60 125V165M172 125V165" stroke="#b8651b" stroke-width="2.2"/>' +
        T(310, 16, '토로이드(링 코어에 감은 코일)', 'middle', 'sm') + '<circle cx="310" cy="95" r="44" class="f" fill-opacity="0.5"/><circle cx="310" cy="95" r="20" fill="var(--surface)"/>' + teeth +
        T(310, 160, '코어', 'middle', 'sm') + T(100, 184, '기호', 'middle', 'sm') + '<path d="M30 204H60a8 8 0 0 1 16 0a8 8 0 0 1 16 0a8 8 0 0 1 16 0a8 8 0 0 1 16 0H170"/>' +
        T(310, 190, 'L = μ N² S / ℓ [H]', 'middle', '') + T(310, 208, 'W = ½ L I² [J]', 'middle', 'sm'),
    });
  })();
  F('em-magcircuit', {
    id: 'magnetic-circuit',
    title: '자기회로(철심 + 코일 + 공극)',
    caption: '자기회로는 전기회로와 짝이야: 기자력 F = NI ↔ 전압, 자속 Φ ↔ 전류, 자기저항 R_m ↔ 저항. 공극(틈)은 자기저항이 아주 커서 전체 자기저항을 크게 만들어.',
    vb: [420, 210],
    svg:
      '<path d="M70 36H290V164H70ZM104 72H256V128H104Z" class="f" fill-opacity="0.45" fill-rule="evenodd" stroke="none"/>' +
      '<rect x="254" y="90" width="40" height="20" fill="var(--surface)" stroke="none"/>' +
      '<path d="M70 164V36H290V90M290 110V164H70"/><path d="M104 72H256V90M256 110V128H104V72"/><path d="M256 90H290M256 110H290" stroke-dasharray="3 3"/>' +
      '<ellipse cx="87" cy="84" rx="26" ry="5" stroke="#b8651b" stroke-width="2.2"/><ellipse cx="87" cy="98" rx="26" ry="5" stroke="#b8651b" stroke-width="2.2"/><ellipse cx="87" cy="112" rx="26" ry="5" stroke="#b8651b" stroke-width="2.2"/><ellipse cx="87" cy="126" rx="26" ry="5" stroke="#b8651b" stroke-width="2.2"/>' +
      '<path class="a" d="M120 54H230" marker-end="url(#aa)"/>' + T(175, 48, '자속 Φ', 'middle', 'sm') + T(54, 104, 'N 회', 'end', 'sm') + T(54, 120, 'I', 'end', 'sm') +
      T(273, 104, 'lg', 'middle', 'sm') + T(306, 56, 'Φ = NI / R_m', 'start', 'sm') + T(306, 76, 'R_m = ℓ / (μS)', 'start', 'sm') + T(306, 106, '공극이 있으면', 'start', 'sm') + T(306, 122, 'R_m = Σ ℓ/(μS)', 'start', 'sm') +
      T(210, 196, '기자력 F = N·I [AT],   Φ = F / R_m [Wb]', 'middle', ''),
  });
})(globalThis.GISA);
