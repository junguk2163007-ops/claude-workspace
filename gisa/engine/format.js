// 숫자·단위·수식 표기
(function (G) {
  'use strict';

  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', '+': '⁺' };

  function sup(n) {
    return String(n)
      .split('')
      .map((c) => SUP[c] || c)
      .join('');
  }

  function round(x, d) {
    const p = Math.pow(10, d);
    return Math.round((x + Number.EPSILON * Math.sign(x)) * p) / p;
  }

  // 기본 자릿수: 100 이상 소수 1자리, 1 이상 2자리, 0.01 이상 4자리, 그 아래는 유효숫자 3개
  function autoDecimals(x) {
    const ax = Math.abs(x);
    if (ax >= 100) return 1;
    if (ax >= 1) return 2;
    if (ax >= 0.01) return 4;
    if (ax === 0) return 0;
    return Math.min(12, Math.ceil(-Math.log10(ax)) + 2);
  }

  function num(x, d) {
    if (typeof x !== 'number' || !isFinite(x)) return String(x);
    const dec = d == null ? autoDecimals(x) : d;
    const r = round(x, dec);
    if (r === 0) return '0';
    let str = Math.abs(r).toFixed(dec);
    if (str.indexOf('.') !== -1) str = str.replace(/0+$/, '').replace(/\.$/, '');
    const dot = str.indexOf('.');
    const intPart = dot === -1 ? str : str.slice(0, dot);
    const frac = dot === -1 ? '' : str.slice(dot);
    return (r < 0 ? '-' : '') + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + frac;
  }

  function q(x, unit, d) {
    return num(x, d) + (unit ? ' ' + unit : '');
  }

  // x가 소수 d자리 안에서 딱 떨어지는지
  function isNice(x, d) {
    const p = Math.pow(10, d == null ? 2 : d);
    return isFinite(x) && Math.abs(x * p - Math.round(x * p)) < 1e-6;
  }

  // 배율 표기: 0.25 → "1/4", 4 → "4"
  function ratio(x) {
    if (x < 1) {
      const inv = 1 / x;
      if (Math.abs(inv - Math.round(inv)) < 1e-9) return '1/' + Math.round(inv);
    }
    return num(x, 3);
  }

  // 다항식 표기: poly([['s', 1], ['', 3]]) → "s + 3"
  function linear(coef, c) {
    // coef·s + c
    const parts = [];
    if (coef !== 0) parts.push((coef === 1 ? '' : num(coef, 4)) + 's');
    if (c !== 0 || parts.length === 0) {
      if (parts.length === 0) parts.push(num(c, 4));
      else parts.push((c < 0 ? '− ' : '+ ') + num(Math.abs(c), 4));
    }
    return parts.join(' ');
  }

  function coefStr(k) {
    return k === 1 ? '' : num(k, 4);
  }

  // 과학적 표기: 2.5e-7 → "2.5 × 10⁻⁷"
  function sci(x) {
    if (x === 0) return '0';
    const e = Math.floor(Math.log10(Math.abs(x)) + 1e-9);
    const m = round(x / Math.pow(10, e), 3);
    return (m === 1 ? '' : num(m, 3) + ' × ') + '10' + sup(e);
  }

  // 아주 크거나 작은 값은 과학적 표기로: 0.0002 N → "2 × 10⁻⁴ N"
  function qs(x, unit) {
    const ax = Math.abs(x);
    const body = ax !== 0 && (ax >= 1e5 || ax < 1e-3) ? sci(x) : num(x);
    return body + (unit ? ' ' + unit : '');
  }

  G.fmt = { qs, sci, sup, round, num, q, isNice, ratio, linear, coefStr, SQRT3: Math.sqrt(3), SQRT2: Math.sqrt(2) };
})(globalThis.GISA);
