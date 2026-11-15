// 개념 그림 2묶음: 전력공학·전기기기·제어공학
(function (G) {
  'use strict';
  const F = G.figure;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const T = (x, y, s, a, c) => '<text x="' + x + '" y="' + y + '" text-anchor="' + (a || 'middle') + '" class="' + (c || '') + '">' + esc(s) + '</text>';
  const L = (x1, y1, x2, y2, c, extra) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + (c ? ' class="' + c + '"' : '') + (extra || '') + '/>';
  const r1 = (v) => Math.round(v * 10) / 10;
  const COPPER = ' stroke="#b8651b" stroke-width="2.2"';

  // ───────── 전력공학 ─────────
  F('pw-pfc', {
    id: 'power-triangle',
    title: '전력 삼각형과 역률 개선',
    caption: '유효전력 P, 무효전력 Q, 피상전력 S는 직각삼각형이야(cosθ = P/S가 역률). 전력용 콘덴서가 Q_c만큼 무효전력을 상쇄하면 θ가 θ₂로 줄어 역률이 좋아지고 선로 전류가 줄어.',
    vb: [440, 210],
    svg:
      '<path d="M40 160H190V70Z" class="f" fill-opacity="0.35"/>' +
      '<path class="a" d="M190 160V115" stroke-width="2.4"/><path d="M40 160L190 115" stroke-dasharray="5 4"/>' +
      '<path class="a" d="M200 70V115" marker-start="url(#aa)" marker-end="url(#aa)"/>' + T(210, 98, 'Q_c', 'start', 'sm') +
      T(115, 178, 'P (유효전력)', 'middle', '') + T(198, 140, 'Q₂', 'start', 'sm') + T(198, 64, 'Q₁ (무효전력)', 'start', 'sm') +
      T(100, 104, 'S₁', 'end', '') + T(100, 140, 'S₂', 'end', 'sm') + T(76, 154, 'θ₁', 'start', 'sm') + T(104, 158, '', 'start', '') +
      T(300, 70, '역률 cosθ = P / S', 'start', '') + T(300, 94, 'Q_c = P(tanθ₁ − tanθ₂)', 'start', '') + T(300, 118, '= P(√(1−cos²θ₁)/cosθ₁', 'start', 'sm') + T(300, 134, '   − √(1−cos²θ₂)/cosθ₂)', 'start', 'sm') +
      T(300, 164, '콘덴서는 Q를 줄여 θ를 작게', 'start', 'sm') + T(300, 180, '→ 역률 ↑, 선로 전류 ↓', 'start', 'sm'),
  });
  F('pw-sag', {
    id: 'sag-span',
    title: '전선의 이도(처짐)',
    caption: '전선은 자기 무게로 처져. 두 지지점을 이은 수평선에서 가장 낮은 곳까지의 수직 거리가 이도 D, 지지물 사이 거리가 경간 S야. 전선의 실제 길이는 경간보다 조금 길어.',
    vb: [420, 225],
    svg:
      L(40, 180, 380, 180) + '<path d="M60 180V50M340 180V50"/><path d="M45 50H75M325 50H355"/>' +
      '<path class="a" d="M60 50Q200 130 340 50" stroke-width="2.4"/>' + '<path d="M60 50H340" stroke-dasharray="4 4" opacity="0.7"/>' +
      '<path d="M200 50V90" marker-start="url(#ah)" marker-end="url(#ah)"/>' + T(210, 74, '이도 D', 'start', '') +
      '<path d="M60 194H340" marker-start="url(#ah)" marker-end="url(#ah)"/>' + T(200, 214, '경간 S (지지물 사이 거리)', 'middle', '') +
      T(60, 42, '지지점', 'middle', 'sm') + T(340, 42, '지지점', 'middle', 'sm') + T(200, 124, '전선 길이 L = S + 8D² / (3S)', 'middle', 'sm') + T(200, 24, '이도 D = W·S² / (8T)  (W: 단위 길이 무게, T: 수평 장력)', 'middle', 'sm'),
  });

  // ───────── 전기기기 ─────────
  (function () {
    let left = '';
    let right = '';
    for (let i = 0; i < 5; i++) {
      left += '<ellipse cx="130" cy="' + (66 + i * 12) + '" rx="24" ry="5"' + COPPER + '/>';
      right += '<ellipse cx="270" cy="' + (66 + i * 12) + '" rx="24" ry="5"' + COPPER + '/>';
    }
    F('mc-tr-ratio', {
      id: 'transformer-core',
      title: '변압기의 구조와 권수비',
      caption: '철심에 1차·2차 코일을 감은 구조야. 1차 전류가 만든 자속(Φ)이 철심을 타고 2차 코일을 지나가면서 전압을 만들어. 전압은 권수에 비례하고, 전류는 반비례해.',
      vb: [440, 220],
      svg:
        '<path d="M110 40H290V160H110ZM150 80H250V124H150Z" class="f" fill-opacity="0.45" fill-rule="evenodd" stroke="none"/><path d="M110 40H290V160H110Z"/><path d="M150 80H250V124H150Z"/>' +
        left + right + '<path class="a" d="M160 60H240" marker-end="url(#aa)"/>' + T(200, 54, '자속 Φ', 'middle', 'sm') +
        '<circle cx="50" cy="102" r="14"/><path d="M41 102q4.5-9 9 0t9 0"/><path d="M50 88V66H106M50 116V122H106"/>' +
        '<path d="M294 66H340V84"/><rect x="326" y="84" width="28" height="36" rx="4" fill="var(--surface)"/><path d="M340 120V148H294"/>' + T(340, 106, 'R', 'middle', '') +
        T(50, 140, 'V₁', 'middle', '') + T(130, 30, 'N₁ (1차)', 'middle', 'sm') + T(270, 30, 'N₂ (2차)', 'middle', 'sm') + T(372, 106, 'V₂', 'start', '') +
        T(220, 192, '권수비 a = N₁/N₂ = V₁/V₂ = I₂/I₁', 'middle', '') + T(220, 210, '전압은 권수에 비례, 전류는 반비례', 'middle', 'sm'),
    });
  })();
  (function () {
    // 다이오드: p→q 방향으로 전류가 흐르는 기호
    function diode(x1, y1, x2, y2) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const len = Math.hypot(x2 - x1, y2 - y1);
      const ux = (x2 - x1) / len;
      const uy = (y2 - y1) / len;
      const nx = -uy;
      const ny = ux;
      const a = [mx - ux * 8 + nx * 7, my - uy * 8 + ny * 7];
      const b = [mx - ux * 8 - nx * 7, my - uy * 8 - ny * 7];
      const tip = [mx + ux * 8, my + uy * 8];
      const f = (p) => r1(p[0]) + ' ' + r1(p[1]);
      return (
        '<path d="M' + x1 + ' ' + y1 + 'L' + f([mx - ux * 8, my - uy * 8]) + 'M' + f(tip) + 'L' + x2 + ' ' + y2 + '"/>' +
        '<path d="M' + f(a) + 'L' + f(tip) + 'L' + f(b) + 'Z" fill="currentColor"/>' +
        '<path d="M' + f([tip[0] + nx * 8, tip[1] + ny * 8]) + 'L' + f([tip[0] - nx * 8, tip[1] - ny * 8]) + '"/>'
      );
    }
    let wave = '';
    for (let i = 0; i <= 60; i++) wave += (i ? 'L' : 'M') + r1(290 + i * 2) + ' ' + r1(170 - Math.abs(Math.sin((i / 60) * 2 * Math.PI)) * 60);
    F('mc-rectifier', {
      id: 'bridge-rectifier',
      title: '단상 전파 브리지 정류회로',
      caption: '다이오드 4개가 교류의 ±를 모두 같은 방향(위가 +)으로 바꿔 줘. 입력 + 반주기에는 D1·D4, − 반주기에는 D2·D3이 전도해서 부하에는 항상 같은 방향의 전류가 흘러.',
      vb: [420, 220],
      svg:
        diode(70, 100, 140, 40) + diode(210, 100, 140, 40) + diode(140, 160, 70, 100) + diode(140, 160, 210, 100) +
        T(84, 60, 'D1', 'end', 'sm') + T(196, 60, 'D2', 'start', 'sm') + T(84, 148, 'D3', 'end', 'sm') + T(196, 148, 'D4', 'start', 'sm') +
        '<circle cx="140" cy="40" r="3" fill="currentColor"/><circle cx="140" cy="160" r="3" fill="currentColor"/>' +
        '<path d="M70 100H52M210 100H228"/>' +
        '<path d="M52 100V108"/><circle cx="52" cy="124" r="14"/><path d="M43 124q4.5-9 9 0t9 0"/><path d="M52 138V200H228V100"/>' +
        '<path d="M140 40H250V60"/><path d="M250 60V76"/>' + '<path d="M250 76V140" stroke-width="0"/>' +
        '<path d="M250 60L250 80M250 80l8 6-16 10 16 10-16 10 16 10-8 6M250 136V160H140"/>' +
        T(268, 108, 'R', 'start', '') + T(150, 34, '+', 'start', '') + T(150, 176, '−', 'start', '') +
        '<path d="M290 176H350" opacity="0.5"/><path class="a" d="' + wave + '"/>' + T(320, 192, '출력(맥류)', 'middle', 'sm') + T(330, 78, 'V_d = 2V_m/π', 'middle', 'sm') + T(330, 94, '≈ 0.9 V (V: 실효값)', 'middle', 'sm'),
    });
  })();

  // ───────── 제어공학 ─────────
  (function () {
    const z = 0.4;
    const wd = Math.sqrt(1 - z * z);
    const phi = Math.acos(z);
    const pts = [];
    for (let i = 0; i <= 140; i++) {
      const t = i / 10;
      const y = 1 - (Math.exp(-z * t) / wd) * Math.sin(wd * t + phi);
      pts.push(r1(50 + t * 22) + ' ' + r1(170 - y * 70));
    }
    const tp = Math.PI / wd;
    F('cs-response', {
      id: 'step-response',
      title: '2차 제어계의 계단응답',
      caption: '목표값(1)까지 올라가면서 한 번 넘쳤다가(오버슈트) 진동하며 정착해. 감쇠비 ζ가 작을수록 오버슈트가 크고 오래 흔들려. ζ ≥ 1이면 넘치지 않고 올라가.',
      vb: [380, 210],
      svg:
        L(50, 170, 360, 170, '', ' marker-end="url(#ah)"') + L(50, 170, 50, 30, '', ' marker-end="url(#ah)"') + T(360, 188, 't', 'end', '') + T(44, 34, 'y(t)', 'end', 'sm') +
        '<path d="M50 100H350" stroke-dasharray="4 4" opacity="0.7"/>' + T(44, 104, '1', 'end', 'sm') +
        '<path class="a" d="M' + pts.join('L') + '" stroke-width="2.2"/>' +
        '<path d="M' + r1(50 + tp * 22) + ' 170V' + r1(170 - 1.254 * 70) + '" stroke-dasharray="3 3" opacity="0.6"/>' + T(r1(50 + tp * 22), 184, 't_p', 'middle', 'sm') +
        '<path d="M' + r1(50 + tp * 22 + 4) + ' 100V' + r1(170 - 1.254 * 70) + '" marker-start="url(#ah)" marker-end="url(#ah)"/>' + T(r1(50 + tp * 22 + 14), 70, 'M_p (최대 오버슈트)', 'start', 'sm') +
        T(215, 28, 'M_p = e^(−πζ/√(1−ζ²)) × 100 [%]', 'start', 'sm') + T(215, 44, '(그림은 ζ = 0.4, M_p ≈ 25 %)', 'start', 'sm'),
    });
  })();
})(globalThis.GISA);
