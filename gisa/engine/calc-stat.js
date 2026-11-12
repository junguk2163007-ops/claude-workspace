// STAT 모드 통계 계산: 1변수(1-VAR)와 회귀 7종.
// rows: [{x, y, f}] (x, y, f는 숫자, f는 도수). 계산은 근삿값(double)로 한다.
(function (G) {
  'use strict';

  const TYPES = [
    { id: '1-VAR', label: '1-VAR', two: false },
    { id: 'A+BX', label: 'A+BX', two: true },
    { id: '_+CX2', label: '_+CX²', two: true },
    { id: 'lnX', label: 'ln X', two: true },
    { id: 'e^X', label: 'e^X', two: true },
    { id: 'A.B^X', label: 'A·B^X', two: true },
    { id: 'A.X^B', label: 'A·X^B', two: true },
    { id: '1/X', label: '1/X', two: true },
  ];

  // 변환: 회귀를 선형 회귀 y' = a + b·x'로 바꾸는 방법
  const TRANSFORM = {
    'A+BX': { fx: (x) => x, fy: (y) => y },
    lnX: { fx: Math.log, fy: (y) => y },
    'e^X': { fx: (x) => x, fy: Math.log },
    'A.B^X': { fx: (x) => x, fy: Math.log },
    'A.X^B': { fx: Math.log, fy: Math.log },
    '1/X': { fx: (x) => 1 / x, fy: (y) => y },
  };

  function solve3(m, v) {
    // 3×3 연립방정식(가우스 소거법)
    const a = m.map((row, i) => row.concat([v[i]]));
    for (let i = 0; i < 3; i++) {
      let p = i;
      for (let r = i + 1; r < 3; r++) if (Math.abs(a[r][i]) > Math.abs(a[p][i])) p = r;
      if (Math.abs(a[p][i]) < 1e-300) return null;
      [a[i], a[p]] = [a[p], a[i]];
      for (let r = i + 1; r < 3; r++) {
        const f = a[r][i] / a[i][i];
        for (let c = i; c < 4; c++) a[r][c] -= f * a[i][c];
      }
    }
    const x = [0, 0, 0];
    for (let i = 2; i >= 0; i--) {
      let s = a[i][3];
      for (let c = i + 1; c < 3; c++) s -= a[i][c] * x[c];
      x[i] = s / a[i][i];
    }
    return x;
  }

  // 통계 결과를 계산. 데이터가 부족하면 null을 돌려준다(호출 쪽에서 Math ERROR).
  function compute(type, rows) {
    const T = TYPES.find((t) => t.id === type);
    const data = rows.filter((r) => r.x !== null && (!T.two || r.y !== null));
    let n = 0;
    let sx = 0;
    let sx2 = 0;
    let sx3 = 0;
    let sx4 = 0;
    let sy = 0;
    let sy2 = 0;
    let sxy = 0;
    let sx2y = 0;
    data.forEach((r) => {
      const f = r.f === null || r.f === undefined ? 1 : r.f;
      n += f;
      sx += f * r.x;
      sx2 += f * r.x * r.x;
      sx3 += f * r.x ** 3;
      sx4 += f * r.x ** 4;
      if (T.two) {
        sy += f * r.y;
        sy2 += f * r.y * r.y;
        sxy += f * r.x * r.y;
        sx2y += f * r.x * r.x * r.y;
      }
    });
    if (n === 0) return null;
    const xs = data.map((r) => r.x);
    const out = { n, sumx: sx, sumx2: sx2, sumx3: sx3, sumx4: sx4, sumy: sy, sumy2: sy2, sumxy: sxy, sumx2y: sx2y };
    out.xbar = sx / n;
    out.sxp = Math.sqrt(Math.max(sx2 / n - out.xbar * out.xbar, 0));
    out.sxs = n > 1 ? Math.sqrt(Math.max((sx2 - n * out.xbar * out.xbar) / (n - 1), 0)) : NaN;
    out.minX = Math.min.apply(null, xs);
    out.maxX = Math.max.apply(null, xs);
    if (T.two) {
      const ys = data.map((r) => r.y);
      out.ybar = sy / n;
      out.syp = Math.sqrt(Math.max(sy2 / n - out.ybar * out.ybar, 0));
      out.sys = n > 1 ? Math.sqrt(Math.max((sy2 - n * out.ybar * out.ybar) / (n - 1), 0)) : NaN;
      out.minY = Math.min.apply(null, ys);
      out.maxY = Math.max.apply(null, ys);
      out.reg = regress(type, data);
    }
    return out;
  }

  function regress(type, data) {
    if (type === '_+CX2') {
      let n = 0;
      let s1 = 0;
      let s2 = 0;
      let s3 = 0;
      let s4 = 0;
      let t0 = 0;
      let t1 = 0;
      let t2 = 0;
      data.forEach((r) => {
        const f = r.f === null || r.f === undefined ? 1 : r.f;
        n += f;
        s1 += f * r.x;
        s2 += f * r.x ** 2;
        s3 += f * r.x ** 3;
        s4 += f * r.x ** 4;
        t0 += f * r.y;
        t1 += f * r.x * r.y;
        t2 += f * r.x * r.x * r.y;
      });
      const sol = solve3([[n, s1, s2], [s1, s2, s3], [s2, s3, s4]], [t0, t1, t2]);
      if (!sol) return null;
      return { A: sol[0], B: sol[1], C: sol[2] };
    }
    const tr = TRANSFORM[type];
    let n = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (const r of data) {
      const f = r.f === null || r.f === undefined ? 1 : r.f;
      const X = tr.fx(r.x);
      const Y = tr.fy(r.y);
      if (!isFinite(X) || !isFinite(Y)) return null; // ln(음수) 등
      n += f;
      sx += f * X;
      sy += f * Y;
      sxx += f * X * X;
      syy += f * Y * Y;
      sxy += f * X * Y;
    }
    const den = n * sxx - sx * sx;
    if (den === 0) return null;
    const b = (n * sxy - sx * sy) / den;
    const a = (sy - b * sx) / n;
    const rden = Math.sqrt(den * (n * syy - sy * sy));
    const r = rden === 0 ? NaN : (n * sxy - sx * sy) / rden;
    let A = a;
    let B = b;
    if (type === 'e^X' || type === 'A.B^X' || type === 'A.X^B') A = Math.exp(a);
    if (type === 'A.B^X') B = Math.exp(b);
    return { A, B, r };
  }

  // ŷ: x에서 y 추정, x̂: y에서 x 추정. 불가능하면 NaN
  function estimate(type, reg, which, v) {
    const { A, B, C } = reg;
    if (which === 'yhat') {
      switch (type) {
        case 'A+BX':
          return A + B * v;
        case '_+CX2':
          return A + B * v + C * v * v;
        case 'lnX':
          return A + B * Math.log(v);
        case 'e^X':
          return A * Math.exp(B * v);
        case 'A.B^X':
          return A * Math.pow(B, v);
        case 'A.X^B':
          return A * Math.pow(v, B);
        default:
          return A + B / v;
      }
    }
    switch (type) {
      case 'A+BX':
        return (v - A) / B;
      case 'lnX':
        return Math.exp((v - A) / B);
      case 'e^X':
        return Math.log(v / A) / B;
      case 'A.B^X':
        return Math.log(v / A) / Math.log(B);
      case 'A.X^B':
        return Math.pow(v / A, 1 / B);
      case '1/X':
        return B / (v - A);
      default: {
        // 2차 회귀: C·x² + B·x + (A − y) = 0
        const D = B * B - 4 * C * (A - v);
        if (D < 0) return NaN;
        const s = Math.sqrt(D);
        return which === 'xhat1' ? (-B + s) / (2 * C) : (-B - s) / (2 * C);
      }
    }
  }

  G.cstat = { TYPES, compute, estimate };
})(globalThis.GISA);
