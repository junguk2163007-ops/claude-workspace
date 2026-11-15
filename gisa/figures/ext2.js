// 개념 그림: 과도현상(시정수)
(function (G) {
  'use strict';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const T = (x, y, s, a, c) => '<text x="' + x + '" y="' + y + '" text-anchor="' + (a || 'middle') + '" class="' + (c || '') + '">' + esc(s) + '</text>';
  const r1 = (v) => Math.round(v * 10) / 10;
  const pts = [];
  for (let i = 0; i <= 110; i++) {
    const u = (i / 110) * 5; // t/τ: 0 ~ 5
    pts.push(r1(190 + u * 38) + ' ' + r1(160 - (1 - Math.exp(-u)) * 120));
  }
  const x1 = r1(190 + 38); // t = τ
  G.figure('transient', {
    id: 'transient-curve',
    title: 'RL·RC 과도현상 곡선',
    caption: '스위치를 닫으면 전류(RL)나 콘덴서 전압(RC)이 0에서 최종값을 향해 지수 곡선으로 올라가. 시간이 시정수 τ일 때 최종값의 63.2 %, 3τ에서 95 %, 5τ에서 99 % 이상이야.',
    vb: [430, 215],
    svg:
      '<path d="M30 60H64"/><path d="M64 60l8-10 8 20 8-20 8 20 8-20 6 10H120"/><path d="M120 60H132a5 5 0 0 1 10 0a5 5 0 0 1 10 0a5 5 0 0 1 10 0H166"/>' +
      '<path d="M166 60H176V150H30V118M30 98V60"/><path d="M16 98H44M23 118H37" stroke-width="2"/>' + T(12, 112, 'V', 'end', '') + T(92, 44, 'R', 'middle', '') + T(146, 44, 'L (또는 C)', 'middle', 'sm') +
      T(103, 176, '스위치를 닫는 순간 t = 0', 'middle', 'sm') + T(103, 192, 'τ = L/R  또는  τ = RC', 'middle', 'sm') +
      '<path d="M190 160H400" marker-end="url(#ah)"/><path d="M190 160V30" marker-end="url(#ah)"/>' + T(400, 178, 't', 'end', '') + T(184, 34, '전류 i 또는 전압 v_c', 'end', 'sm') +
      '<path d="M190 40H395" stroke-dasharray="4 4" opacity="0.6"/>' + T(396, 36, '최종값 (V/R 또는 V)', 'end', 'sm') +
      '<path class="a" d="M' + pts.join('L') + '" stroke-width="2.2"/>' +
      '<path d="M' + x1 + ' 160V' + r1(160 - (1 - Math.exp(-1)) * 120) + 'H190" stroke-dasharray="3 3" opacity="0.6"/>' + T(x1, 174, 'τ', 'middle', '') + T(186, r1(160 - 0.632 * 120) + 4, '63.2 %', 'end', 'sm') +
      '<path d="M190 160L' + x1 + ' 40" stroke-dasharray="2 4" opacity="0.5"/>' + T(r1(190 + 3 * 38), 174, '3τ', 'middle', 'sm') + T(r1(190 + 5 * 38), 174, '5τ', 'middle', 'sm'),
  });
})(globalThis.GISA);
