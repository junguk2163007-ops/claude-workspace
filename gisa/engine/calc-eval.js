// 계산기 수식 계산: 입력 토큰 → 값.
// 값 V = { ex: 정확한 값|null, f: 근삿값(15자리), dec: 소수로 입력한 값이 섞였는지 }
// 우선순위는 카시오 설명서 "계산 우선 순위"와 같다:
//  1 괄호 2 함수( ) 3 후위(x² x³ x⁻¹ x! ° % 등)·거듭제곱·n제곱근 4 분수 5 (−) 6 추정값 7 생략된 곱
//  8 nPr nCr 9 × ÷ 10 + −  (같은 순위는 왼쪽부터)
(function (G) {
  'use strict';
  const N = G.qn;
  const { Q, Q0, Q1 } = N;

  class CalcError extends Error {
    constructor(kind, pos) {
      super(kind + ' ERROR');
      this.kind = kind;
      this.pos = pos;
    }
  }
  const mathErr = (pos) => new CalcError('Math', pos);
  const syntaxErr = (pos) => new CalcError('Syntax', pos);
  const argErr = (pos) => new CalcError('Argument', pos);

  // ───────── 값 ─────────
  const r15 = (x) => (x === 0 || !isFinite(x) ? x : Number(x.toPrecision(15)));
  const mkV = (ex, f, dec) => ({ ex, f, dec: !!dec });
  function fin(v) {
    if (!isFinite(v.f) || Math.abs(v.f) >= 1e100) throw mathErr();
    if (v.f !== 0 && Math.abs(v.f) < 1e-99) return mkV(N.exInt(0), 0, v.dec);
    return v;
  }
  const vEx = (ex, dec) => fin(mkV(ex, r15(N.exToNumber(ex)), dec));
  const vF = (f, dec) => fin(mkV(null, r15(f), dec));
  const vInt = (n) => vEx(N.exInt(n));
  const vQ = (q, dec) => vEx(N.exQ(q), dec);
  const isZero = (v) => (v.ex ? N.exIsZero(v.ex) : v.f === 0);
  const vInteger = (v) => {
    // 정수이면 BigInt, 아니면 null
    if (v.ex) return N.exIsRat(v.ex) && N.qIsInt(v.ex.q) ? v.ex.q.n : null;
    return Number.isInteger(v.f) && Math.abs(v.f) < 1e15 ? BigInt(v.f) : null;
  };

  function vAdd(a, b) {
    if (a.ex && b.ex) return vEx(N.exAdd(a.ex, b.ex), a.dec || b.dec);
    return vF(a.f + b.f, a.dec || b.dec);
  }
  function vSub(a, b) {
    if (a.ex && b.ex) return vEx(N.exSub(a.ex, b.ex), a.dec || b.dec);
    return vF(a.f - b.f, a.dec || b.dec);
  }
  function vMul(a, b) {
    if (a.ex && b.ex) {
      const e = N.exMul(a.ex, b.ex);
      if (e) return vEx(e, a.dec || b.dec);
    }
    return vF(a.f * b.f, a.dec || b.dec);
  }
  function vDiv(a, b) {
    if (isZero(b)) throw mathErr();
    if (a.ex && b.ex) {
      const e = N.exDiv(a.ex, b.ex);
      if (e) return vEx(e, a.dec || b.dec);
    }
    return vF(a.f / b.f, a.dec || b.dec);
  }
  const vNeg = (a) => (a.ex ? vEx(N.exNeg(a.ex), a.dec) : vF(-a.f, a.dec));
  const vAbs = (a) => (a.f < 0 ? vNeg(a) : a);
  const v100 = vInt(100);

  // ───────── 각도 ─────────
  const toRad = (x, u) => (u === 'Deg' ? (x * Math.PI) / 180 : u === 'Gra' ? (x * Math.PI) / 200 : x);
  const fromRad = (r, u) => (u === 'Deg' ? (r * 180) / Math.PI : u === 'Gra' ? (r * 200) / Math.PI : r);
  const ANGLE_MAX = { Deg: 9e9, Rad: 157079632.7, Gra: 1e10 };

  // 정확히 정수 도(°)로 표현되는 각도면 BigInt 도, 아니면 null
  function exactDeg(v, unit) {
    if (!v.ex) return null;
    let d;
    if (unit === 'Deg') {
      if (!N.exIsRat(v.ex)) return null;
      d = v.ex.q;
    } else if (unit === 'Gra') {
      if (!N.exIsRat(v.ex)) return null;
      d = N.qMul(v.ex.q, Q(9n, 10n));
    } else if (N.exIsZero(v.ex)) d = Q0;
    else if (N.exIsPurePi(v.ex)) d = N.qMul(v.ex.p, Q(180n));
    else return null;
    return d.d === 1n ? d.n : null;
  }
  function fromDegExact(d, unit, dec) {
    // d: 정수 도
    if (unit === 'Deg') return vEx(N.exInt(d), dec);
    if (unit === 'Gra') return vEx(N.exQ(Q(BigInt(d) * 10n, 9n)), dec);
    if (d === 0) return vInt(0);
    return vEx(N.mk(Q0, null, Q(BigInt(d), 180n)), dec);
  }

  function checkAngle(v, unit) {
    if (Math.abs(v.f) >= ANGLE_MAX[unit]) throw mathErr();
  }
  const snap0 = (x) => (Math.abs(x) < 1e-15 ? 0 : x);

  function vTrig(name, v, unit) {
    checkAngle(v, unit);
    const d = exactDeg(v, unit);
    if (d !== null) {
      const dd = Number(((d % 360n) + 360n) % 360n);
      let e;
      if (name === 'sin') e = N.sinDegExact(dd);
      else if (name === 'cos') e = N.cosDegExact(dd);
      else {
        e = N.tanDegExact(dd);
        if (e === null) throw mathErr();
      }
      if (e) return vEx(e, v.dec);
    }
    const r = toRad(v.f, unit);
    let x;
    if (name === 'sin') x = Math.sin(r);
    else if (name === 'cos') x = Math.cos(r);
    else {
      const c = Math.cos(r);
      if (Math.abs(c) < 1e-15) throw mathErr();
      x = Math.tan(r);
    }
    return vF(snap0(x), v.dec);
  }

  function vInvTrig(name, v, unit) {
    if (v.ex) {
      const d = N.inverseDeg(name, v.ex);
      if (d !== null) return fromDegExact(d, unit, v.dec);
    }
    let r;
    if (name === 'sin') {
      if (Math.abs(v.f) > 1) throw mathErr();
      r = Math.asin(v.f);
    } else if (name === 'cos') {
      if (Math.abs(v.f) > 1) throw mathErr();
      r = Math.acos(v.f);
    } else r = Math.atan(v.f);
    return vF(fromRad(r, unit), v.dec);
  }

  function vHyp(name, v) {
    const x = v.f;
    let r;
    switch (name) {
      case 'sinh':
        if (Math.abs(x) > 230.2585092) throw mathErr();
        r = Math.sinh(x);
        break;
      case 'cosh':
        if (Math.abs(x) > 230.2585092) throw mathErr();
        r = Math.cosh(x);
        break;
      case 'tanh':
        r = Math.tanh(x);
        break;
      case 'asinh':
        r = Math.asinh(x);
        break;
      case 'acosh':
        if (x < 1) throw mathErr();
        r = Math.acosh(x);
        break;
      default:
        if (Math.abs(x) >= 1) throw mathErr();
        r = Math.atanh(x);
    }
    if (isZero(v) && (name === 'sinh' || name === 'tanh' || name === 'asinh' || name === 'atanh')) return vInt(0);
    if (name === 'cosh' && isZero(v)) return vInt(1);
    if (name === 'acosh' && v.ex && N.exEq(v.ex, N.exInt(1))) return vInt(0);
    return vF(r, v.dec);
  }

  // ───────── 지수·로그·거듭제곱 ─────────
  const isPow10 = (n) => /^10*$/.test(n.toString());
  function log10Exact(q) {
    if (q.n <= 0n) return null;
    if (q.d === 1n && isPow10(q.n)) return q.n.toString().length - 1;
    if (q.n === 1n && isPow10(q.d)) return -(q.d.toString().length - 1);
    return null;
  }
  function vLog(v) {
    if (v.f <= 0 || (v.ex && N.exSign(v.ex) <= 0)) throw mathErr();
    if (v.ex && N.exIsRat(v.ex)) {
      const k = log10Exact(v.ex.q);
      if (k !== null) return vInt(k);
    }
    return vF(Math.log10(v.f), v.dec);
  }
  function vLn(v) {
    if (v.f <= 0) throw mathErr();
    if (v.ex && N.exEq(v.ex, N.exInt(1))) return vInt(0);
    return vF(Math.log(v.f), v.dec);
  }
  function vLogAB(a, b) {
    if (a.f <= 0 || a.f === 1 || b.f <= 0) throw mathErr();
    const dec = a.dec || b.dec;
    if (a.ex && b.ex && N.exIsRat(a.ex) && N.exIsRat(b.ex)) {
      const k = Math.round(Math.log(b.f) / Math.log(a.f));
      if (Math.abs(k) <= 64) {
        const p = N.exPowInt(a.ex, k);
        if (p && N.exEq(p, b.ex)) return vInt(k);
      }
    }
    return vF(Math.log(b.f) / Math.log(a.f), dec);
  }
  function vExp10(v) {
    if (v.f > 99.99999999) throw mathErr();
    const k = vInteger(v);
    if (k !== null && v.ex && k >= -99n && k <= 99n) {
      const kk = Number(k);
      const q = kk >= 0 ? Q(10n ** BigInt(kk)) : Q(1n, 10n ** BigInt(-kk));
      return vQ(q, v.dec);
    }
    return vF(Math.pow(10, v.f), v.dec);
  }
  function vExpE(v) {
    if (v.f > 230.2585092) throw mathErr();
    if (isZero(v)) return vInt(1);
    return vF(Math.exp(v.f), v.dec);
  }
  function vSqrt(v) {
    if (v.f < 0 || (v.ex && N.exSign(v.ex) < 0)) throw mathErr();
    if (v.ex) {
      const e = N.exSqrt(v.ex);
      if (e) return vEx(e, v.dec);
    }
    return vF(Math.sqrt(v.f), v.dec);
  }
  function vCbrt(v) {
    if (v.ex && N.exIsRat(v.ex)) {
      const r = N.qRoot(v.ex.q, 3);
      if (r) return vQ(r, v.dec);
    }
    return vF(Math.cbrt(v.f), v.dec);
  }
  // x의 y제곱
  function vPow(a, b) {
    const dec = a.dec || b.dec;
    if (isZero(a)) {
      if (b.f > 0) return vInt(0);
      throw mathErr();
    }
    // 정수 지수
    const k = vInteger(b);
    if (k !== null && b.ex && a.ex) {
      const kk = Number(k);
      if (Math.abs(kk) <= 64) {
        const e = N.exPowInt(a.ex, kk);
        if (e) return vEx(e, dec);
      }
    }
    // 분수 지수 p/q (밑이 분수이고 정확히 떨어질 때)
    if (b.ex && N.exIsRat(b.ex) && !N.qIsInt(b.ex.q) && a.ex && N.exIsRat(a.ex)) {
      const q = b.ex.q;
      if (q.d <= 12n) {
        const root = N.qRoot(a.ex.q, Number(q.d));
        if (root) {
          const e = N.exPowInt(N.exQ(root), Number(q.n));
          if (e) return vEx(e, dec);
        }
      }
    }
    if (a.f > 0) return vF(Math.pow(a.f, b.f), dec);
    // 음수 밑: 정수 지수 또는 홀수 분모의 분수 지수만
    if (k !== null) return vF(Math.pow(a.f, b.f), dec);
    if (b.ex && N.exIsRat(b.ex) && b.ex.q.d % 2n === 1n) {
      const odd = b.ex.q.n % 2n !== 0n;
      const mag = Math.pow(-a.f, b.f);
      return vF(odd ? -mag : mag, dec);
    }
    throw mathErr();
  }
  // 지수가 idx인 n제곱근
  function vRoot(idx, body) {
    if (isZero(idx)) throw mathErr();
    const dec = idx.dec || body.dec;
    const k = vInteger(idx);
    if (k !== null && body.ex && N.exIsRat(body.ex) && k > 0n && k <= 64n) {
      const r = N.qRoot(body.ex.q, Number(k));
      if (r) return vQ(r, dec);
    }
    if (body.f < 0) {
      if (k !== null && k % 2n !== 0n) return vF(-Math.pow(-body.f, 1 / idx.f), dec);
      throw mathErr();
    }
    return vF(Math.pow(body.f, 1 / idx.f), dec);
  }
  const BIG_LIMIT = 10n ** 100n;
  function vFact(v) {
    const n = vInteger(v);
    if (n === null || n < 0n || n > 69n) throw mathErr();
    let r = 1n;
    for (let i = 2n; i <= n; i++) r *= i;
    return vQ(Q(r));
  }
  function nPrCr(kind, a, b) {
    const n = vInteger(a);
    const r = vInteger(b);
    if (n === null || r === null) throw argErr();
    if (n < 0n || r < 0n || n >= 10n ** 10n || r > n) throw argErr();
    const k = kind === 'nCr' && r > n - r ? n - r : r;
    let res = 1n;
    for (let i = 0n; i < k; i++) {
      res *= n - i;
      if (kind === 'nCr') res /= i + 1n; // 연속된 정수의 곱은 (i+1)!로 항상 나누어떨어짐
      if (res >= BIG_LIMIT) throw mathErr();
    }
    if (kind === 'nPr') {
      // nPr은 r개 모두 곱함(위 루프는 r까지 곱했음)
      let p = 1n;
      for (let i = 0n; i < r; i++) {
        p *= n - i;
        if (p >= BIG_LIMIT) throw mathErr();
      }
      return vQ(Q(p));
    }
    return vQ(Q(res));
  }

  // 각도 단위 후위 연산자(°, r, g): 현재 각도 단위로 변환
  function vUnit(v, from, to) {
    if (from === to) return v;
    if (from === 'Deg' && to === 'Rad') return vMul(v, vDiv(vEx(N.exPi()), vInt(180)));
    if (from === 'Deg' && to === 'Gra') return vMul(v, vQ(Q(10n, 9n)));
    if (from === 'Rad' && to === 'Deg') return vMul(v, vDiv(vInt(180), vEx(N.exPi())));
    if (from === 'Rad' && to === 'Gra') return vMul(v, vDiv(vInt(200), vEx(N.exPi())));
    if (from === 'Gra' && to === 'Deg') return vMul(v, vQ(Q(9n, 10n)));
    return vMul(v, vDiv(vEx(N.exPi()), vInt(200))); // Gra → Rad
  }

  // 직교 ↔ 극좌표
  function polar(x, y, unit) {
    // r = √(x²+y²), θ ∈ (−180°, 180°]
    const dec = x.dec || y.dec;
    let r;
    const x2y2 = vAdd(vMul(x, x), vMul(y, y));
    r = vSqrt(x2y2);
    let theta;
    if (isZero(x) && isZero(y)) throw mathErr();
    if (x.ex && y.ex) {
      let d = null;
      if (isZero(x)) d = N.exSign(y.ex) > 0 ? 90 : -90;
      else if (isZero(y)) d = N.exSign(x.ex) > 0 ? 0 : 180;
      else {
        const t = N.exDiv(y.ex, x.ex);
        const base = t ? N.inverseDeg('tan', t) : null;
        if (base !== null) {
          d = base;
          if (N.exSign(x.ex) < 0) d = base + (N.exSign(y.ex) >= 0 ? 180 : -180);
        }
      }
      if (d !== null) theta = fromDegExact(d, unit, dec);
    }
    if (!theta) theta = vF(fromRad(Math.atan2(y.f, x.f), unit), dec);
    return { r, theta };
  }
  function rect(r, theta, unit) {
    const c = vTrig('cos', theta, unit);
    const s = vTrig('sin', theta, unit);
    return { x: vMul(r, c), y: vMul(r, s) };
  }

  // 지정한 표시 형식(Norm/Fix/Sci)으로 반올림한 값 (Rnd 함수)
  function vRnd(v, setup) {
    if (v.f === 0) return v;
    const g = G.cfmt.digitsOf(v.f);
    let nsig;
    if (setup.fmt === 'fix') nsig = g.e + 1 + setup.n;
    else if (setup.fmt === 'sci') nsig = setup.n === 0 ? 10 : setup.n;
    else nsig = 10;
    if (nsig <= 0) return vInt(0);
    const r = G.cfmt.roundSig(g.d, g.e, nsig);
    // 반올림된 십진수를 정확한 분수로
    const digits = BigInt(r.d);
    const scale = r.e - (r.d.length - 1); // 값 = digits × 10^scale
    const q = scale >= 0 ? Q(digits * 10n ** BigInt(scale)) : Q(digits, 10n ** BigInt(-scale));
    return vQ(g.neg ? N.qNeg(q) : q, true);
  }

  // ───────── 파서 ─────────
  const isTok = (it, k, v) => !!it && !!it.t && it.t.k === k && (v === undefined || it.t.v === v);
  const POST_UNITS = { deg: 'Deg', rad: 'Rad', gra: 'Gra' };

  // 토큰 → 트리(구조 토큰 S…M…E를 묶음). 항목: {t, i, e} 또는 {s, slots, i0, markers, iE, i, e}
  function toTree(tokens) {
    const root = [];
    const frames = [];
    let cur = root;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.k === 'S') {
        const node = { s: t.s, slots: [[]], i0: i, markers: [], iE: -1, i, e: -1 };
        cur.push(node);
        frames.push({ node, parent: cur });
        cur = node.slots[0];
      } else if (t.k === 'M') {
        const f = frames[frames.length - 1];
        f.node.markers.push(i);
        f.node.slots.push([]);
        cur = f.node.slots[f.node.slots.length - 1];
      } else if (t.k === 'E') {
        const f = frames.pop();
        f.node.iE = i;
        f.node.e = i + 1;
        cur = f.parent;
      } else cur.push({ t, i, e: i + 1 });
    }
    return root;
  }

  class Parser {
    constructor(items, ctx, depth) {
      this.items = items;
      this.i = 0;
      this.ctx = ctx;
      this.depth = depth || 0;
      this.last = items.length ? items[0].i : 0;
    }
    peek() {
      return this.items[this.i];
    }
    next() {
      const it = this.items[this.i++];
      if (it) this.last = it.e;
      return it;
    }
    // 연산 중 오류에 위치를 붙여서 던진다
    wrap(fn) {
      try {
        return fn();
      } catch (e) {
        if (e instanceof CalcError && e.pos === undefined) e.pos = this.last;
        throw e;
      }
    }
    sub(items, item) {
      if (!items.length) throw syntaxErr(item.e);
      if (this.depth > 24) throw new CalcError('Stack', item.e);
      const p = new Parser(items, this.ctx, this.depth + 1);
      const v = p.parseAdd();
      if (p.i < items.length) throw syntaxErr(items[p.i].i);
      this.last = item.e;
      return v;
    }

    parseAdd() {
      let v = this.parseMul();
      for (;;) {
        const it = this.peek();
        if (isTok(it, 'op', '+') || isTok(it, 'op', '-')) {
          this.next();
          const r = this.parseMul();
          v = this.wrap(() => (it.t.v === '+' ? vAdd(v, r) : vSub(v, r)));
        } else return v;
      }
    }
    parseMul() {
      let v = this.parseNpr();
      for (;;) {
        const it = this.peek();
        if (isTok(it, 'op', '*') || isTok(it, 'op', '/')) {
          this.next();
          const r = this.parseNpr();
          v = this.wrap(() => (it.t.v === '*' ? vMul(v, r) : vDiv(v, r)));
        } else return v;
      }
    }
    parseNpr() {
      let v = this.parseImplicit();
      for (;;) {
        const it = this.peek();
        if (isTok(it, 'op', 'nPr') || isTok(it, 'op', 'nCr')) {
          this.next();
          const r = this.parseImplicit();
          v = this.wrap(() => nPrCr(it.t.v, v, r));
        } else return v;
      }
    }
    startsFactor(it) {
      if (!it) return false;
      if (it.s) return it.s !== 'pow' && it.s !== 'x10';
      const k = it.t.k;
      return k === 'd' || k === 'lp' || k === 'fn' || k === 'c' || k === 'var' || k === 'ans' || k === 'ran' || k === 'val' || k === 'stat';
    }
    parseImplicit() {
      let v = this.parseUnary();
      while (this.startsFactor(this.peek())) {
        const it = this.peek();
        if (isTok(it, 'stat') && STAT_POST[it.t.v]) break;
        const r = this.parseUnary();
        v = this.wrap(() => vMul(v, r));
      }
      return v;
    }
    parseUnary() {
      const it = this.peek();
      if (isTok(it, 'neg')) {
        this.next();
        const v = this.parseUnary();
        return this.wrap(() => vNeg(v));
      }
      return this.parsePostfix();
    }
    parsePostfix() {
      let v = this.parsePrimary();
      const setup = this.ctx.setup;
      for (;;) {
        const it = this.peek();
        if (!it) return v;
        if (it.s === 'pow') {
          const e = this.sub(it.slots[0], it);
          this.i++;
          const base = v;
          v = this.wrap(() => vPow(base, e));
        } else if (it.s === 'x10') {
          const e = this.sub(it.slots[0], it);
          this.i++;
          const base = v;
          v = this.wrap(() => vMul(base, vExp10(e)));
        } else if (isTok(it, 'post')) {
          this.next();
          const base = v;
          switch (it.t.v) {
            case 'x2':
              v = this.wrap(() => vMul(base, base));
              break;
            case 'x3':
              v = this.wrap(() => vMul(vMul(base, base), base));
              break;
            case 'xinv':
              v = this.wrap(() => vDiv(vInt(1), base));
              break;
            case 'fact':
              v = this.wrap(() => vFact(base));
              break;
            case 'pct':
              v = this.wrap(() => vDiv(base, v100));
              break;
            default:
              v = this.wrap(() => vUnit(base, POST_UNITS[it.t.v], setup.angle));
          }
        } else if (isTok(it, 'powl')) {
          // 리니어 표기의 ^( … )
          this.next();
          const e = this.parseAdd();
          if (isTok(this.peek(), 'rp')) this.next();
          const base = v;
          v = this.wrap(() => vPow(base, e));
        } else if (isTok(it, 'nrootl')) {
          // 리니어 표기: 지수 ˣ√( … )
          this.next();
          const body = this.parseAdd();
          if (isTok(this.peek(), 'rp')) this.next();
          const idx = v;
          v = this.wrap(() => vRoot(idx, body));
        } else if (isTok(it, 'stat') && STAT_POST[it.t.v]) {
          this.next();
          const base = v;
          v = this.wrap(() => this.ctx.estimate(it.t.v, base));
        } else return v;
      }
    }

    // 숫자(소수·60진수·리니어 분수)
    literal() {
      let s = '';
      let dots = 0;
      let startI = this.peek().i;
      while (isTok(this.peek(), 'd')) {
        const c = this.next().t.v;
        if (c === '.') dots++;
        s += c;
      }
      if (dots > 1 || s === '.' || !/\d/.test(s)) throw syntaxErr(this.last);
      return { s, pos: startI };
    }
    litValue(s) {
      const dec = s.indexOf('.') !== -1;
      if (!dec) return vQ(Q(BigInt(s)), false);
      const [ip, fp] = s.split('.');
      const digits = BigInt((ip || '0') + fp);
      return vQ(Q(digits, 10n ** BigInt(fp.length)), true);
    }
    parseNumber() {
      let v = this.litValue(this.literal().s);
      // 도·분·초
      if (isTok(this.peek(), 'dms')) {
        this.next();
        let total = v;
        let div = 60;
        let part = 0;
        // 분
        while (part < 2 && isTok(this.peek(), 'd')) {
          const m = this.litValue(this.literal().s);
          if (!isTok(this.peek(), 'dms')) throw syntaxErr(this.last);
          this.next();
          total = this.wrap(() => vAdd(total, vDiv(m, vInt(div))));
          div *= 60;
          part++;
        }
        return Object.assign({}, total, { dms: true });
      }
      // 리니어 분수: 분자⌟분모, 정수⌟분자⌟분모
      if (isTok(this.peek(), 'fsep')) {
        this.next();
        const b = this.litValue(this.literal().s);
        if (isTok(this.peek(), 'fsep')) {
          this.next();
          const c = this.litValue(this.literal().s);
          const whole = v;
          return this.wrap(() => vAdd(whole, vDiv(b, c)));
        }
        const a = v;
        return this.wrap(() => vDiv(a, b));
      }
      return v;
    }

    args() {
      const out = [];
      if (isTok(this.peek(), 'rp')) throw syntaxErr(this.peek().i);
      out.push(this.parseAdd());
      while (isTok(this.peek(), 'comma')) {
        this.next();
        out.push(this.parseAdd());
      }
      if (isTok(this.peek(), 'rp')) this.next();
      return out;
    }

    fnCall(name) {
      const startLast = this.last;
      const a = this.args();
      const setup = this.ctx.setup;
      const one = () => {
        if (a.length !== 1) throw argErr(this.last);
        return a[0];
      };
      return this.wrap(() => {
        switch (name) {
          case 'sin':
          case 'cos':
          case 'tan':
            return vTrig(name, one(), setup.angle);
          case 'asin':
            return vInvTrig('sin', one(), setup.angle);
          case 'acos':
            return vInvTrig('cos', one(), setup.angle);
          case 'atan':
            return vInvTrig('tan', one(), setup.angle);
          case 'sinh':
          case 'cosh':
          case 'tanh':
          case 'asinh':
          case 'acosh':
          case 'atanh':
            return vHyp(name, one());
          case 'log':
            if (a.length === 2) return vLogAB(a[0], a[1]);
            return vLog(one());
          case 'ln':
            return vLn(one());
          case 'Abs':
            return vAbs(one());
          case 'sqrt':
            return vSqrt(one());
          case 'cbrt':
            return vCbrt(one());
          case 'pow10':
            return vExp10(one());
          case 'powe':
            return vExpE(one());
          case 'Rnd':
            return vRnd(one(), setup);
          case 'Pol': {
            if (a.length !== 2) throw argErr(this.last);
            const { r, theta } = polar(a[0], a[1], setup.angle);
            this.ctx.pair = { kind: 'Pol', labels: ['r', 'θ'], vals: [r, theta] };
            this.ctx.setVar('X', r);
            this.ctx.setVar('Y', theta);
            return r;
          }
          case 'Rec': {
            if (a.length !== 2) throw argErr(this.last);
            const { x, y } = rect(a[0], a[1], setup.angle);
            this.ctx.pair = { kind: 'Rec', labels: ['X', 'Y'], vals: [x, y] };
            this.ctx.setVar('X', x);
            this.ctx.setVar('Y', y);
            return x;
          }
          case 'RanInt': {
            if (a.length !== 2) throw argErr(this.last);
            const lo = vInteger(a[0]);
            const hi = vInteger(a[1]);
            if (lo === null || hi === null || lo >= hi || hi - lo >= 10n ** 10n) throw argErr(this.last);
            const span = Number(hi - lo) + 1;
            return vInt(lo + BigInt(Math.floor(this.ctx.rand() * span)));
          }
          default:
            throw syntaxErr(startLast);
        }
      });
    }

    parsePrimary() {
      const it = this.peek();
      if (!it) throw syntaxErr(this.last);
      if (it.s) return this.structure(this.next());
      const k = it.t.k;
      if (k === 'd') return this.parseNumber();
      this.next();
      switch (k) {
        case 'lp': {
          this.depthCheck(it);
          const p = new Parser(this.items, this.ctx, this.depth + 1);
          p.i = this.i;
          const v = p.parseAdd();
          this.i = p.i;
          this.last = p.last;
          if (isTok(this.peek(), 'rp')) this.next();
          return v;
        }
        case 'fn':
          this.depthCheck(it);
          return this.fnCall(it.t.v);
        case 'c':
          return it.t.v === 'pi' ? vEx(N.exPi()) : vF(Math.E);
        case 'var':
          return this.ctx.getVar(it.t.v);
        case 'ans':
          return this.ctx.getVar('Ans');
        case 'ran':
          return vQ(Q(BigInt(Math.floor(this.ctx.rand() * 1000)), 1000n));
        case 'val':
          return it.t.v;
        case 'stat':
          if (STAT_POST[it.t.v]) throw syntaxErr(it.i);
          return this.wrap(() => this.ctx.statValue(it.t.v));
        default:
          throw syntaxErr(it.i);
      }
    }
    depthCheck(it) {
      if (this.depth > 24) throw new CalcError('Stack', it.e);
    }

    structure(node) {
      const slot = (n) => this.sub(node.slots[n], node);
      let v;
      switch (node.s) {
        case 'frac': {
          const n = slot(0);
          const d = slot(1);
          return this.wrap(() => vDiv(n, d));
        }
        case 'mix': {
          const w = slot(0);
          const n = slot(1);
          const d = slot(2);
          return this.wrap(() => vAdd(w, vDiv(n, d)));
        }
        case 'sqrt':
          v = slot(0);
          return this.wrap(() => vSqrt(v));
        case 'cbrt':
          v = slot(0);
          return this.wrap(() => vCbrt(v));
        case 'nroot': {
          const idx = slot(0);
          const body = slot(1);
          return this.wrap(() => vRoot(idx, body));
        }
        case 'abs':
          v = slot(0);
          return this.wrap(() => vAbs(v));
        case 'e10':
          v = slot(0);
          return this.wrap(() => vExp10(v));
        case 'ee':
          v = slot(0);
          return this.wrap(() => vExpE(v));
        case 'logb': {
          const b = slot(0);
          const a = slot(1);
          return this.wrap(() => vLogAB(b, a));
        }
        default:
          throw syntaxErr(node.i);
      }
    }
  }

  // STAT 모드의 추정값 명령(바로 앞의 값을 인수로 받음)
  const STAT_POST = { xhat: 1, yhat: 1, xhat1: 1, xhat2: 1 };

  // 한 식 계산. items: 트리 항목 배열
  function evalItems(items, ctx) {
    if (!items.length) throw syntaxErr(0);
    const p = new Parser(items, ctx, 0);
    const v = p.parseAdd();
    if (p.i < items.length) throw syntaxErr(items[p.i].i);
    return v;
  }

  // 토큰 전체를 ':' 기준 문장들로 나눔 (최상위 항목만)
  function splitStatements(items) {
    const out = [[]];
    items.forEach((it) => {
      if (isTok(it, 'colon')) out.push([]);
      else out[out.length - 1].push(it);
    });
    return out;
  }

  G.ceval = {
    CalcError, mathErr, syntaxErr, argErr,
    r15, mkV, vEx, vF, vInt, vQ, isZero, vInteger, vAdd, vSub, vMul, vDiv, vNeg, vAbs, vPow, vSqrt, vFact, vUnit,
    toTree, evalItems, splitStatements, polar, rect, fromDegExact, vRnd, vTrig, vInvTrig, isTok, STAT_POST,
  };
})(globalThis.GISA);
