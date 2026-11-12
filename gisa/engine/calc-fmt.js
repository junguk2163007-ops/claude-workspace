// 계산기 결과 표시 규칙 (카시오 fx-350ES PLUS 설명서 기준)
//  - 소수 표시: Norm 1/2, Fix n, Sci n, ENG. 표시는 10자리, 내부는 15자리
//  - 분수·√·π 표시(자연수 표기): 설명서의 표시 가능 범위를 넘으면 소수로 표시
// 표시 노드: {t:'tx',s} {t:'frac',n,d} {t:'sqrt',b,idx?} {t:'sup',b} {t:'sub',b} {t:'abs',b} {t:'mix',w,n,d} {t:'cur'} {t:'box'}
(function (G) {
  'use strict';
  const N = G.qn;

  const tx = (s) => ({ t: 'tx', s });
  const sup = (b) => ({ t: 'sup', b });

  // 숫자 → 15자리 십진수 문자열과 지수: value = d[0].d[1..] × 10^e
  function digitsOf(x) {
    const neg = x < 0;
    const s = Math.abs(x).toExponential(14); // d.dddddddddddddde±x
    const m = /^(\d)\.(\d+)e([+-]\d+)$/.exec(s);
    return { neg, d: m[1] + m[2], e: parseInt(m[3], 10) };
  }

  // 유효 자리수 n으로 반올림(사사오입이 아니라 "0.5 이상 올림")
  function roundSig(d, e, n) {
    if (n >= d.length) return { d: d.padEnd(n, '0'), e };
    const up = d.charCodeAt(n) >= 53; // '5'
    let kept = d.slice(0, n);
    if (up) {
      const arr = kept.split('').map(Number);
      let i = n - 1;
      while (i >= 0) {
        if (arr[i] === 9) {
          arr[i] = 0;
          i--;
        } else {
          arr[i]++;
          break;
        }
      }
      if (i < 0) {
        arr.unshift(1);
        arr.pop();
        e += 1;
      }
      kept = arr.join('');
    }
    return { d: kept, e };
  }

  const trimZeros = (s) => (s.indexOf('.') === -1 ? s : s.replace(/0+$/, '').replace(/\.$/, ''));

  // d(유효숫자 문자열)·e(지수)를 지수 없이 펼친 문자열
  function plain(d, e) {
    if (e >= 0) {
      const intLen = e + 1;
      const digits = d.length >= intLen ? d : d.padEnd(intLen, '0');
      const ip = digits.slice(0, intLen);
      const fp = digits.slice(intLen);
      return fp ? ip + '.' + fp : ip;
    }
    return '0.' + '0'.repeat(-e - 1) + d;
  }

  // 소수 표시 → {s: 가수 문자열(부호 포함), exp: 지수|null}
  function decimalParts(x, setup, engK) {
    if (x === 0 || Object.is(x, -0)) {
      if (setup.fmt === 'fix') return { s: setup.n ? '0.' + '0'.repeat(setup.n) : '0', exp: null };
      if (setup.fmt === 'sci') return { s: setup.n === 0 ? '0' : '0.' + '0'.repeat(setup.n - 1), exp: 0 };
      return { s: '0', exp: null };
    }
    const g = digitsOf(x);
    const sign = g.neg ? '-' : '';
    // ENG: 지수를 3의 배수로 맞춘 표기
    if (engK !== null && engK !== undefined) {
      const r = roundSig(g.d, g.e, 10);
      const base = Math.floor(r.e / 3) * 3;
      const exp = base + 3 * engK;
      const shift = r.e - exp; // 가수에서 정수 부분 자릿수 - 1
      let m;
      if (shift >= 0) {
        const digits = r.d.padEnd(shift + 1, '0');
        m = digits.slice(0, shift + 1) + (digits.length > shift + 1 ? '.' + digits.slice(shift + 1) : '');
      } else {
        m = '0.' + '0'.repeat(-shift - 1) + r.d;
      }
      return { s: sign + trimZeros(m), exp };
    }
    if (setup.fmt === 'sci') {
      const nsig = setup.n === 0 ? 10 : setup.n;
      const r = roundSig(g.d, g.e, nsig);
      const m = r.d[0] + (nsig > 1 ? '.' + r.d.slice(1) : '');
      return { s: sign + m, exp: r.e };
    }
    if (setup.fmt === 'fix') {
      const nsig = g.e + 1 + setup.n; // 소수 n째 자리까지 필요한 유효 자리수
      if (g.e >= 10) {
        const r = roundSig(g.d, g.e, 10);
        return { s: sign + trimZeros(r.d[0] + '.' + r.d.slice(1)), exp: r.e };
      }
      if (nsig < 0) return { s: setup.n ? '0.' + '0'.repeat(setup.n) : '0', exp: null };
      let r;
      if (nsig === 0) {
        // 첫 유효숫자 바로 앞 자리에서 반올림
        r = g.d.charCodeAt(0) >= 53 ? { d: '1', e: g.e + 1 } : { d: '0', e: g.e };
        if (r.d === '0') return { s: setup.n ? '0.' + '0'.repeat(setup.n) : '0', exp: null };
      } else {
        r = roundSig(g.d, g.e, nsig);
      }
      // r을 소수 n자리로 펼침
      const intDigits = r.e + 1;
      let body = r.d.padEnd(Math.max(r.d.length, intDigits + setup.n), '0');
      let s;
      if (r.e >= 0) {
        s = body.slice(0, intDigits) + (setup.n ? '.' + body.slice(intDigits, intDigits + setup.n) : '');
      } else {
        const zeros = '0'.repeat(-r.e - 1);
        s = '0.' + (zeros + body).slice(0, setup.n);
      }
      if (r.e >= 10) {
        const rr = roundSig(g.d, g.e, 10);
        return { s: sign + trimZeros(rr.d[0] + '.' + rr.d.slice(1)), exp: rr.e };
      }
      return { s: sign + s, exp: null };
    }
    // Norm 1 / Norm 2
    const r = roundSig(g.d, g.e, 10);
    const low = setup.n === 2 ? -9 : -2; // 이보다 작으면 지수 표시
    if (r.e < low || r.e >= 10) {
      return { s: sign + trimZeros(r.d[0] + '.' + r.d.slice(1)), exp: r.e };
    }
    return { s: sign + trimZeros(plain(r.d, r.e)), exp: null };
  }

  function dot(s, setup) {
    return setup.dot === 'Comma' ? s.replace('.', ',') : s;
  }

  function decimalNodes(x, setup, engK) {
    const p = decimalParts(x, setup, engK);
    const nodes = [tx(dot(p.s, setup))];
    if (p.exp !== null) nodes.push(tx('×10'), sup([tx(String(p.exp).replace('-', '−'))]));
    return nodes;
  }

  // ───────── 정확한 값(분수·√·π) 표시 ─────────
  const bigLen = (b) => (b < 0n ? -b : b).toString().length;
  const neg = (s) => s.replace(/^-/, '−');

  // 분수 표시 가능 범위(자릿수 합 10 이내)
  function fracFits(q, mixed, linear) {
    const n = q.n < 0n ? -q.n : q.n;
    if (mixed && n >= q.d) {
      const w = n / q.d;
      const r = n % q.d;
      if (r === 0n) return bigLen(w) <= 10;
      return bigLen(w) + bigLen(r) + bigLen(q.d) + 2 <= 10;
    }
    return bigLen(n) + bigLen(q.d) + (linear ? 1 : 0) <= 10;
  }

  function rationalNodes(q, setup, linear) {
    const isNeg = q.n < 0n;
    const n = isNeg ? -q.n : q.n;
    const sign = isNeg ? [tx('−')] : [];
    if (q.d === 1n) return bigLen(n) <= 10 ? sign.concat([tx(n.toString())]) : null;
    const mixed = setup.frac === 'ab/c' && n > q.d;
    if (!fracFits(q, mixed, linear)) return null;
    if (linear) {
      if (mixed) return sign.concat([tx(`${n / q.d}⌟${n % q.d}⌟${q.d}`)]);
      return sign.concat([tx(`${n}⌟${q.d}`)]);
    }
    if (mixed) {
      return sign.concat([{ t: 'mix', w: [tx((n / q.d).toString())], n: [tx((n % q.d).toString())], d: [tx(q.d.toString())] }]);
    }
    return sign.concat([{ t: 'frac', n: [tx(n.toString())], d: [tx(q.d.toString())] }]);
  }

  function lcm(a, b) {
    return (a / N.gcd(a, b)) * b;
  }

  // 항들을 한 줄 문자열 노드로: [{c: BigInt(부호 포함 정수 계수), r: BigInt|null(√ 수), pi: bool}]
  function termsNodes(terms) {
    const out = [];
    terms.forEach((t, i) => {
      const mag = t.c < 0n ? -t.c : t.c;
      const sign = t.c < 0n ? '−' : i > 0 ? '+' : '';
      if (sign) out.push(tx(sign));
      if (t.r !== null) {
        if (mag !== 1n) out.push(tx(mag.toString()));
        out.push({ t: 'sqrt', b: [tx(t.r.toString())] });
      } else if (t.pi) {
        if (mag !== 1n) out.push(tx(mag.toString()));
        out.push(tx('π'));
      } else {
        out.push(tx(mag.toString()));
      }
    });
    return out;
  }

  // 정확한 값 → 노드(표시 가능 범위를 넘으면 null)
  function exactNodes(ex, setup, linear) {
    const hasR = N.hasR(ex);
    const hasPi = N.hasPi(ex);
    if (!hasR && !hasPi) return rationalNodes(ex.q, setup, linear);
    if (linear) return null; // √·π 표시는 자연수 표기(MathO)에서만
    // 항 모으기
    const items = []; // {q: Q, r: BigInt|null, pi: bool}
    if (!N.qIsZero(ex.q)) items.push({ q: ex.q, r: null, pi: false });
    Object.keys(ex.r)
      .sort((a, b) => (BigInt(a) < BigInt(b) ? 1 : -1))
      .forEach((k) => items.push({ q: ex.r[k], r: BigInt(k), pi: false }));
    if (hasPi) items.push({ q: ex.p, r: null, pi: true });
    if (hasPi) {
      if (items.length !== 1) return null; // π는 다른 항과 섞어 표시하지 않음
      const it = items[0];
      if (Math.abs(N.qToNumber(it.q) * Math.PI) >= 1e6) return null;
      const n = it.q.n < 0n ? -it.q.n : it.q.n;
      if (n >= 1000n || it.q.d >= 1000n) return null;
      const num = [];
      if (n !== 1n) num.push(tx(n.toString()));
      num.push(tx('π'));
      const sign = it.q.n < 0n ? [tx('−')] : [];
      if (it.q.d === 1n) return sign.concat(num);
      return sign.concat([{ t: 'frac', n: num, d: [tx(it.q.d.toString())] }]);
    }
    if (items.length > 2) return null;
    // 공통 분모
    let D = 1n;
    items.forEach((it) => (D = lcm(D, it.q.d)));
    const terms = items.map((it) => ({ c: (it.q.n * D) / it.q.d, r: it.r, pi: false }));
    // 표시 가능 범위: 계수 < 100, √ 안 < 1000, 분모 < 100
    const lim = terms.every((t) => (t.c < 0n ? -t.c : t.c) < 100n && (t.r === null || t.r < 1000n)) && D < 100n;
    if (!lim) return null;
    const body = termsNodes(terms);
    if (D === 1n) return body;
    // 부호는 분자 맨 앞(−)을 분수 앞으로 뺀다
    let lead = [];
    if (terms[0].c < 0n && terms.every((t) => t.c < 0n)) {
      const flipped = terms.map((t) => ({ ...t, c: -t.c }));
      return [tx('−'), { t: 'frac', n: termsNodes(flipped), d: [tx(D.toString())] }];
    }
    void lead;
    return [{ t: 'frac', n: body, d: [tx(D.toString())] }];
  }

  // 노드를 평문으로 (테스트·접근성용)
  function flat(nodes) {
    return nodes
      .map((n) => {
        switch (n.t) {
          case 'tx':
            return n.s;
          case 'frac': {
            const a = flat(n.n);
            const b = flat(n.d);
            const w = (s) => (/[+−\-×÷]/.test(s.replace(/^[−-]/, '')) ? '(' + s + ')' : s);
            return w(a) + '/' + w(b);
          }
          case 'mix':
            return flat(n.w) + ' ' + flat(n.n) + '/' + flat(n.d);
          case 'sqrt': {
            const b = flat(n.b);
            const r = /^[0-9.]+$/.test(b) ? b : '(' + b + ')';
            return (n.idx ? flat(n.idx) : '') + '√' + r;
          }
          case 'sup':
            return '^' + (/^[0-9−]+$/.test(flat(n.b)) ? flat(n.b) : '(' + flat(n.b) + ')');
          case 'sub':
            return '_' + flat(n.b);
          case 'abs':
            return '|' + flat(n.b) + '|';
          case 'cur':
            return '‸';
          case 'box':
            return '□';
          default:
            return '';
        }
      })
      .join('');
  }

  G.cfmt = { digitsOf, roundSig, decimalParts, decimalNodes, exactNodes, rationalNodes, flat, tx, sup, fracFits };
})(globalThis.GISA);
