// 간단한 회로도(SVG 문자열). 선·글자는 모두 currentColor라 다크모드에서도 보인다.
(function (G) {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const SHAPES = {
    R: 'M-30 0H-20L-16.67-7L-10 7L-3.33-7L3.33 7L10-7L16.67 7L20 0H30',
    L: 'M-30 0H-20a5 5 0 0 1 10 0a5 5 0 0 1 10 0a5 5 0 0 1 10 0a5 5 0 0 1 10 0H30',
    C: 'M-30 0H-5M-5-12V12M5-12V12M5 0H30',
    Z: 'M-30 0H-18M18 0H30M-18-7H18V7H-18Z',
  };

  // 가로로 그린 소자를 (cx, cy)에 놓는다. vertical이면 90° 돌린다.
  function part(type, cx, cy, vertical) {
    const rot = vertical ? ' rotate(90)' : '';
    return '<path d="' + SHAPES[type] + '" transform="translate(' + cx + ' ' + cy + ')' + rot + '"/>';
  }

  function text(x, y, s, anchor, cls) {
    return (
      '<text x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'middle') + '"' +
      (cls ? ' class="' + cls + '"' : '') + '>' + esc(s) + '</text>'
    );
  }

  // 세로 방향 전원. 위쪽 단자 y = cy - h, 아래쪽 단자 y = cy + h
  function source(kind, x, cy) {
    if (kind === 'ac') {
      return {
        h: 15,
        svg:
          '<circle cx="' + x + '" cy="' + cy + '" r="15"/>' +
          '<path d="M' + (x - 9) + ' ' + cy + 'q4.5-9 9 0t9 0"/>',
      };
    }
    return {
      h: 6,
      svg:
        '<path d="M' + (x - 14) + ' ' + (cy - 6) + 'H' + (x + 14) + '"/>' +
        '<path d="M' + (x - 7) + ' ' + (cy + 6) + 'H' + (x + 7) + '" stroke-width="4"/>' +
        text(x - 20, cy - 8, '+', 'middle'),
    };
  }

  function wrap(w, h, body, title) {
    return (
      '<svg class="circuit" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(title || '회로도') + '"' +
      ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      body + '</svg>'
    );
  }

  // 직렬 루프: 전원 왼쪽, 소자는 윗변, (선택) 오른쪽 변에 소자 하나
  // o = { source:{kind:'dc'|'ac', label}, parts:[{type, label, mark?}], right?:{type,label,mark} }
  function series(o) {
    const n = o.parts.length;
    const left = 46;
    const W = 120 + 110 * n + (o.right ? 70 : 0);
    const right = W - (o.right ? 90 : 40);
    const top = 44;
    const bottom = 140;
    const cy = (top + bottom) / 2;
    let body = '';
    let labels = '';
    const src = source(o.source.kind, left, cy);
    body += src.svg;
    body += '<path d="M' + left + ' ' + (cy - src.h) + 'V' + top + '"/>';
    if (o.right) {
      body += '<path d="M' + left + ' ' + (cy + src.h) + 'V' + bottom + 'H' + right + 'V' + (cy + 30) + '"/>';
      body += '<path d="M' + right + ' ' + (cy - 30) + 'V' + top + '"/>';
    } else {
      body += '<path d="M' + left + ' ' + (cy + src.h) + 'V' + bottom + 'H' + right + 'V' + top + '"/>';
    }
    let x = left;
    for (let i = 0; i < n; i++) {
      const cx = left + ((right - left) * (i + 1)) / (n + 1);
      body += '<path d="M' + x + ' ' + top + 'H' + (cx - 30) + '"/>';
      body += part(o.parts[i].type, cx, top, false);
      labels += text(cx, top - 16, o.parts[i].label);
      if (o.parts[i].mark) labels += text(cx, top + 30, o.parts[i].mark, 'middle', 'hl');
      x = cx + 30;
    }
    body += '<path d="M' + x + ' ' + top + 'H' + right + '"/>';
    if (o.right) {
      // 오른쪽 변의 소자는 출력 단자와 함께 그린다
      body += part(o.right.type, right, cy, true);
      labels += text(right - 14, cy + 4, o.right.label, 'end');
      body += '<path d="M' + right + ' ' + top + 'H' + (right + 40) + 'M' + right + ' ' + bottom + 'H' + (right + 40) + '"/>';
      body += '<circle cx="' + (right + 42) + '" cy="' + top + '" r="3"/><circle cx="' + (right + 42) + '" cy="' + bottom + '" r="3"/>';
      if (o.right.mark) labels += text(right + 44, cy + 4, o.right.mark, 'middle', 'hl');
    }
    labels += text(left + 22, cy + 5, o.source.label, 'start');
    return wrapAll(W, 160, body, labels, o.title);
  }

  // 병렬: 전원 왼쪽, 갈래마다 세로 소자
  function parallel(o) {
    const n = o.branches.length;
    const left = 46;
    const W = 150 + 110 * n;
    const top = 36;
    const bottom = 140;
    const cy = (top + bottom) / 2;
    let body = '';
    let labels = '';
    const src = source(o.source.kind, left, cy);
    body += src.svg;
    const lastX = left + 110 * n;
    body += '<path d="M' + left + ' ' + (cy - src.h) + 'V' + top + 'H' + lastX + '"/>';
    body += '<path d="M' + left + ' ' + (cy + src.h) + 'V' + bottom + 'H' + lastX + '"/>';
    for (let i = 0; i < n; i++) {
      const bx = left + 110 * (i + 1);
      body += '<path d="M' + bx + ' ' + top + 'V' + (cy - 30) + 'M' + bx + ' ' + (cy + 30) + 'V' + bottom + '"/>';
      body += part(o.branches[i].type, bx, cy, true);
      labels += text(bx + 14, cy + 5, o.branches[i].label, 'start');
      if (i < n - 1 || n === 1) {
        body += '<circle cx="' + bx + '" cy="' + top + '" r="2.5" fill="currentColor"/>';
        body += '<circle cx="' + bx + '" cy="' + bottom + '" r="2.5" fill="currentColor"/>';
      }
    }
    labels += text(left + 22, cy + 5, o.source.label, 'start');
    if (o.currentLabel) labels += text(left + 55, top - 10, o.currentLabel + ' →', 'middle', 'hl');
    return wrapAll(W, 160, body, labels, o.title);
  }

  // 3상 부하: Y(별) 또는 Δ(삼각형)
  function threePhase(o) {
    const W = 260;
    const H = 190;
    let body = '';
    let labels = '';
    const zbox = (x1, y1, x2, y2) => {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      return (
        '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '"/>' +
        '<rect x="-17" y="-7" width="34" height="14" transform="translate(' + mx.toFixed(1) + ' ' + my.toFixed(1) +
        ') rotate(' + ang.toFixed(1) + ')" class="zbox"/>'
      );
    };
    if (o.type === 'Y') {
      const c = [130, 105];
      const pts = [[130, 30], [65, 145], [195, 145]];
      pts.forEach((p) => (body += zbox(c[0], c[1], p[0], p[1])));
      body += '<circle cx="130" cy="105" r="3" fill="currentColor"/>';
      labels += text(130, 22, 'a') + text(52, 160, 'b') + text(208, 160, 'c') + text(146, 112, 'N', 'start');
    } else {
      const pts = [[130, 30], [55, 155], [205, 155]];
      body += zbox(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
      body += zbox(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
      body += zbox(pts[2][0], pts[2][1], pts[0][0], pts[0][1]);
      pts.forEach((p) => (body += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="currentColor"/>'));
      labels += text(130, 22, 'a') + text(42, 170, 'b') + text(218, 170, 'c');
    }
    labels += text(W / 2, H - 4, o.label || '', 'middle', 'hl');
    return wrapAll(W, H, body, labels, o.title);
  }

  // 피드백 블록선도: R → (+/−) → [G] → C, C → [H] → 합산점
  function feedback(o) {
    const W = 330;
    const H = 150;
    let body = '';
    let labels = '';
    const arrow = (x, y, dir) => {
      const d = {
        r: 'M' + x + ' ' + y + 'l-8-4v8z',
        l: 'M' + x + ' ' + y + 'l8-4v8z',
        u: 'M' + x + ' ' + y + 'l-4 8h8z',
      }[dir];
      return '<path d="' + d + '" fill="currentColor" stroke="none"/>';
    };
    body += '<path d="M20 50H82"/>' + arrow(82, 50, 'r');
    body += '<circle cx="96" cy="50" r="13"/><path d="M87 41l18 18M105 41l-18 18" stroke-width="1.5"/>';
    body += '<path d="M109 50H140"/>' + arrow(140, 50, 'r');
    body += '<rect x="140" y="30" width="70" height="40" rx="3"/>';
    body += '<path d="M210 50H300"/>' + arrow(300, 50, 'r');
    body += '<path d="M260 50V115H210"/>' + arrow(210, 115, 'l');
    body += '<rect x="140" y="95" width="70" height="40" rx="3"/>';
    body += '<path d="M140 115H96V64"/>' + arrow(96, 64, 'u');
    labels += text(175, 55, o.g) + text(175, 120, o.h);
    labels += text(20, 40, 'R(s)', 'start') + text(300, 40, 'C(s)', 'end');
    labels += text(76, 40, '+') + text(84, 82, '−');
    return wrapAll(W, H, body, labels, o.title);
  }

  function wrapAll(w, h, body, labels, title) {
    return wrap(w, h, body + '<g class="lbl" fill="currentColor" stroke="none">' + labels + '</g>', title);
  }

  G.svg = { series, parallel, threePhase, feedback, esc };
})(globalThis.GISA);
