// 계산기용 정확한 수 연산.
// 값 = q + Σ c·√r + p·π  (q, c, p는 분수, r은 제곱 인수가 없는 자연수)
// 분수·√·π 결과를 "손으로 쓴 것처럼" 정확히 다루고, 정확히 표현할 수 없는 경우에는 null을 돌려줘서
// 호출한 쪽이 소수(근삿값) 계산으로 넘어가게 한다. (카시오 자연수 표기 계산기의 결과 표시 방식과 같은 목적)
(function (G) {
  'use strict';

  // ───────── 분수(BigInt) ─────────
  const ZERO = 0n;
  const ONE = 1n;
  const abs = (a) => (a < ZERO ? -a : a);
  function gcd(a, b) {
    a = abs(a);
    b = abs(b);
    while (b) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a;
  }
  function Q(n, d) {
    if (d === undefined) d = ONE;
    if (d === ZERO) throw new RangeError('division by zero');
    if (d < ZERO) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    return g > ONE ? { n: n / g, d: d / g } : { n, d };
  }
  const qAdd = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
  const qSub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
  const qMul = (a, b) => Q(a.n * b.n, a.d * b.d);
  const qDiv = (a, b) => Q(a.n * b.d, a.d * b.n);
  const qNeg = (a) => ({ n: -a.n, d: a.d });
  const qIsZero = (a) => a.n === ZERO;
  const qIsInt = (a) => a.d === ONE;
  const qEq = (a, b) => a.n === b.n && a.d === b.d;
  const qSign = (a) => (a.n > ZERO ? 1 : a.n < ZERO ? -1 : 0);
  const Q0 = { n: ZERO, d: ONE };
  const Q1 = { n: ONE, d: ONE };

  function bigToNumber(n) {
    return Number(n);
  }
  function qToNumber(a) {
    // 아주 큰 분자/분모도 나눗셈이 가능하도록 자릿수를 맞춰서 변환
    const nn = bigToNumber(a.n);
    const dd = bigToNumber(a.d);
    if (isFinite(nn) && isFinite(dd)) return nn / dd;
    const sn = a.n.toString().length;
    const sd = a.d.toString().length;
    const shift = Math.max(sn, sd) - 300;
    const pow = 10n ** BigInt(Math.max(shift, 0));
    return bigToNumber(a.n / pow) / bigToNumber(a.d / pow);
  }

  // 자연수 N = s²·r (r은 제곱 인수 없음). 너무 큰 수는 null(근삿값으로 넘어감)
  const SQF_LIMIT = 1000000000000n; // 1e12
  function sqfDecomp(N) {
    if (N <= ZERO || N > SQF_LIMIT) return null;
    let n = Number(N);
    let outside = 1;
    let inside = 1;
    for (let p = 2; p * p <= n; p++) {
      let cnt = 0;
      while (n % p === 0) {
        n /= p;
        cnt++;
      }
      if (cnt) {
        outside *= Math.pow(p, Math.floor(cnt / 2));
        if (cnt % 2) inside *= p;
      }
    }
    if (n > 1) inside *= n;
    return { s: BigInt(outside), r: BigInt(inside) };
  }

  // ───────── 정확한 값 ─────────
  // { q: Q, r: { "<제곱 인수 없는 자연수>": Q }, p: Q }
  function mk(q, r, p) {
    const rr = {};
    if (r) {
      Object.keys(r).forEach((k) => {
        if (!qIsZero(r[k])) rr[k] = r[k];
      });
    }
    return { q: q || Q0, r: rr, p: p || Q0 };
  }
  const exInt = (n) => mk(Q(BigInt(n)));
  const exQ = (q) => mk(q);
  const exPi = () => mk(Q0, null, Q1);
  const hasR = (a) => Object.keys(a.r).length > 0;
  const hasPi = (a) => !qIsZero(a.p);
  const exIsRat = (a) => !hasR(a) && !hasPi(a);
  const exIsZero = (a) => qIsZero(a.q) && !hasR(a) && !hasPi(a);
  const exIsPurePi = (a) => qIsZero(a.q) && !hasR(a) && hasPi(a);

  function exAdd(a, b) {
    const r = {};
    Object.keys(a.r).forEach((k) => (r[k] = a.r[k]));
    Object.keys(b.r).forEach((k) => (r[k] = r[k] ? qAdd(r[k], b.r[k]) : b.r[k]));
    return mk(qAdd(a.q, b.q), r, qAdd(a.p, b.p));
  }
  function exNeg(a) {
    const r = {};
    Object.keys(a.r).forEach((k) => (r[k] = qNeg(a.r[k])));
    return mk(qNeg(a.q), r, qNeg(a.p));
  }
  const exSub = (a, b) => exAdd(a, exNeg(b));

  function exMul(a, b) {
    if (hasPi(a) && (hasPi(b) || hasR(b))) return null;
    if (hasPi(b) && hasR(a)) return null;
    let q = qMul(a.q, b.q);
    const r = {};
    const addR = (k, c) => (r[k] = r[k] ? qAdd(r[k], c) : c);
    // 분수 × √ 항
    Object.keys(b.r).forEach((k) => {
      if (!qIsZero(a.q)) addR(k, qMul(a.q, b.r[k]));
    });
    Object.keys(a.r).forEach((k) => {
      if (!qIsZero(b.q)) addR(k, qMul(a.r[k], b.q));
    });
    // √ × √
    const ka = Object.keys(a.r);
    const kb = Object.keys(b.r);
    for (let i = 0; i < ka.length; i++) {
      for (let j = 0; j < kb.length; j++) {
        const ri = BigInt(ka[i]);
        const rj = BigInt(kb[j]);
        const g = gcd(ri, rj);
        const rest = (ri / g) * (rj / g); // 서로소인 두 제곱 인수 없는 수의 곱 → 제곱 인수 없음
        const c = qMul(qMul(a.r[ka[i]], b.r[kb[j]]), Q(g));
        if (rest === ONE) q = qAdd(q, c);
        else addR(rest.toString(), c);
      }
    }
    // π 항
    let p = Q0;
    if (hasPi(a)) p = qAdd(p, qMul(a.p, b.q));
    if (hasPi(b)) p = qAdd(p, qMul(b.p, a.q));
    return mk(q, r, p);
  }

  function exScale(a, c) {
    const r = {};
    Object.keys(a.r).forEach((k) => (r[k] = qMul(a.r[k], c)));
    return mk(qMul(a.q, c), r, qMul(a.p, c));
  }

  function exDiv(a, b) {
    if (exIsZero(b)) throw new RangeError('division by zero');
    if (exIsRat(b)) return exScale(a, qDiv(Q1, b.q));
    if (exIsPurePi(b)) {
      // (pπ)/(p'π) = p/p'. 그 밖에는 1/π가 되어 표현할 수 없음
      if (exIsPurePi(a)) return exQ(qDiv(a.p, b.p));
      if (exIsZero(a)) return a;
      return null;
    }
    if (hasPi(b)) return null;
    // b가 √ 항을 가질 때: 켤레(conjugate)를 곱해 분모를 유리화
    let num = a;
    let den = b;
    for (let guard = 0; guard < 6 && hasR(den); guard++) {
      const keys = Object.keys(den.r).sort((x, y) => (BigInt(x) < BigInt(y) ? 1 : -1));
      const k = keys[0];
      const conjR = {};
      Object.keys(den.r).forEach((kk) => (conjR[kk] = kk === k ? qNeg(den.r[kk]) : den.r[kk]));
      const conj = mk(den.q, conjR, Q0);
      num = exMul(num, conj);
      den = exMul(den, conj);
      if (!num || !den) return null;
    }
    if (hasR(den) || !exIsRat(den) || qIsZero(den.q)) return null;
    return exScale(num, qDiv(Q1, den.q));
  }

  function exToNumber(a) {
    let x = qToNumber(a.q);
    Object.keys(a.r).forEach((k) => {
      x += qToNumber(a.r[k]) * Math.sqrt(Number(k));
    });
    if (hasPi(a)) x += qToNumber(a.p) * Math.PI;
    return x;
  }
  const exSign = (a) => {
    if (exIsZero(a)) return 0;
    const x = exToNumber(a);
    return x > 0 ? 1 : x < 0 ? -1 : 0;
  };
  function exEq(a, b) {
    if (!qEq(a.q, b.q) || !qEq(a.p, b.p)) return false;
    const ka = Object.keys(a.r);
    if (ka.length !== Object.keys(b.r).length) return false;
    return ka.every((k) => b.r[k] && qEq(a.r[k], b.r[k]));
  }

  function exPowInt(a, k) {
    if (k === 0) return exInt(1);
    if (Math.abs(k) > 64) return null;
    let n = Math.abs(k);
    let base = a;
    let acc = exInt(1);
    while (n > 0) {
      if (n & 1) {
        acc = exMul(acc, base);
        if (!acc) return null;
      }
      n >>= 1;
      if (n > 0) {
        base = exMul(base, base);
        if (!base) return null;
      }
    }
    return k < 0 ? exDiv(exInt(1), acc) : acc;
  }

  // 분수의 제곱근: √(n/d) = √(n·d) / d
  function exSqrt(a) {
    if (!exIsRat(a)) return null;
    if (qSign(a.q) < 0) return null;
    if (qIsZero(a.q)) return a;
    const dec = sqfDecomp(a.q.n * a.q.d);
    if (!dec) return null;
    const coef = Q(dec.s, a.q.d);
    if (dec.r === ONE) return exQ(coef);
    const r = {};
    r[dec.r.toString()] = coef;
    return mk(Q0, r, Q0);
  }

  // 정수 n제곱근 (정확히 떨어질 때만)
  function bigRoot(n, k) {
    if (n < ZERO) return null;
    if (n < 2n) return n;
    let lo = ZERO;
    let hi = n;
    const K = BigInt(k);
    while (lo < hi) {
      const mid = (lo + hi + ONE) / 2n;
      if (mid ** K <= n) lo = mid;
      else hi = mid - ONE;
    }
    return lo ** K === n ? lo : null;
  }
  // 분수의 n제곱근(정확히 떨어질 때만, 음수는 홀수 n만)
  function qRoot(a, k) {
    let neg = false;
    let q = a;
    if (qSign(a) < 0) {
      if (k % 2 === 0) return null;
      neg = true;
      q = qNeg(a);
    }
    const rn = bigRoot(q.n, k);
    const rd = bigRoot(q.d, k);
    if (rn === null || rd === null) return null;
    const r = Q(rn, rd);
    return neg ? qNeg(r) : r;
  }

  // ───────── 삼각함수의 정확한 값 (15° 배수) ─────────
  const SIN_TABLE = (function () {
    // 0°~90°, 15° 간격
    const half = exQ(Q(1n, 2n));
    const s6m2 = mk(Q0, { 6: Q(1n, 4n), 2: Q(-1n, 4n) }, Q0); // (√6−√2)/4
    const s6p2 = mk(Q0, { 6: Q(1n, 4n), 2: Q(1n, 4n) }, Q0); // (√6+√2)/4
    return {
      0: exInt(0),
      15: s6m2,
      30: half,
      45: mk(Q0, { 2: Q(1n, 2n) }, Q0),
      60: mk(Q0, { 3: Q(1n, 2n) }, Q0),
      75: s6p2,
      90: exInt(1),
    };
  })();

  // 각도(도, 정수) → sin 값. 15의 배수가 아니면 null
  function sinDegExact(d) {
    let x = ((d % 360) + 360) % 360;
    if (x % 15 !== 0) return null;
    let sign = 1;
    if (x > 180) {
      sign = -1;
      x -= 180;
    }
    if (x > 90) x = 180 - x;
    const v = SIN_TABLE[x];
    return sign < 0 ? exNeg(v) : v;
  }
  const cosDegExact = (d) => sinDegExact(90 - d);

  function tanDegExact(d) {
    const s = sinDegExact(d);
    const c = cosDegExact(d);
    if (s === null || c === null) return undefined; // 정확한 값 없음
    if (exIsZero(c)) return null; // 정의되지 않음(Math ERROR)
    return exDiv(s, c);
  }

  // 정확한 값에서 각도(도) 찾기: sin/cos/tan 값 → 정수 각도 (표에 있는 값만)
  function inverseDeg(fn, x) {
    const range = fn === 'sin' ? [-90, 90] : fn === 'cos' ? [0, 180] : [-75, 75];
    for (let d = range[0]; d <= range[1]; d += 15) {
      let v;
      if (fn === 'sin') v = sinDegExact(d);
      else if (fn === 'cos') v = cosDegExact(d);
      else {
        v = tanDegExact(d);
        if (!v) continue;
      }
      if (v && exEq(v, x)) return d;
    }
    return null;
  }

  G.qn = {
    Q, Q0, Q1, qAdd, qSub, qMul, qDiv, qNeg, qIsZero, qIsInt, qEq, qSign, qToNumber, gcd,
    mk, exInt, exQ, exPi, hasR, hasPi, exIsRat, exIsZero, exIsPurePi,
    exAdd, exSub, exNeg, exMul, exDiv, exScale, exToNumber, exSign, exEq, exPowInt, exSqrt,
    sqfDecomp, bigRoot, qRoot, sinDegExact, cosDegExact, tanDegExact, inverseDeg,
  };
})(globalThis.GISA);
