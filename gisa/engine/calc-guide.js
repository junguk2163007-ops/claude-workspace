// "계산기로 풀기": 문제마다 실제 fx-350ES PLUS에서 누르는 키 순서를 만든다.
//  - 풀이 가이드(G.guide)는 단계마다 설명(say)과 계산식(expr)을 돌려준다. 식에는 문제의 숫자 변수(params 이름)를 그대로 쓴다.
//  - 계산식은 이렇게 쓴다:  V/R   sqrt(R^2+X^2)   9e9*Q/d^2   sin(th)   (a+b)*Ans   pi   → 키 순서로 바뀐다.
//  - 가이드가 낸 키 순서는 test/calc-guide-tests.js가 실제 G.Calc에 눌러 보고 정답과 같은지 문제마다 확인한다.
(function (G) {
  'use strict';

  const guides = {};
  const FUNCS = {
    sqrt: { keys: ['SQRT'], close: 'RIGHT' },
    cbrt: { keys: ['SHIFT', 'SQRT'], close: 'RIGHT' },
    abs: { keys: ['Abs'], close: 'RIGHT' },
    sin: { keys: ['sin'], close: ')' },
    cos: { keys: ['cos'], close: ')' },
    tan: { keys: ['tan'], close: ')' },
    asin: { keys: ['SHIFT', 'sin'], close: ')' },
    acos: { keys: ['SHIFT', 'cos'], close: ')' },
    atan: { keys: ['SHIFT', 'tan'], close: ')' },
    log: { keys: ['log'], close: ')' },
    ln: { keys: ['ln'], close: ')' },
  };

  // 숫자 → 키. 아주 작거나 0이 많이 붙은 큰 수는 시험에서처럼 ×10ˣ 키로 입력한다.
  function numberKeys(x) {
    if (!isFinite(x)) throw new Error('계산식에 쓸 수 없는 숫자: ' + x);
    const neg = x < 0;
    const ax = Math.abs(x);
    const keys = [];
    if (neg) keys.push('(-)');
    const push = (str) => str.split('').forEach((c) => keys.push(c));
    const plain = String(Number(ax.toPrecision(12)));
    const useExp = ax !== 0 && (ax < 1e-3 || (Number.isInteger(ax) && ax >= 1e5 && /0000$/.test(plain)));
    if (useExp || /e/.test(plain)) {
      const parts = ax.toExponential(11).split('e');
      let mant = parts[0].replace(/\.?0+$/, '');
      const exp = Number(parts[1]);
      push(mant);
      keys.push('x10^x');
      if (exp < 0) keys.push('(-)');
      push(String(Math.abs(exp)));
      keys.push('RIGHT');
    } else push(plain);
    return keys;
  }

  const VARKEY = { A: '(-)', B: 'DMS', C: 'hyp', D: 'sin', E: 'cos', F: 'tan', X: ')', Y: 'S<>D', M: 'M+' };

  // 계산식 문자열 → 키 배열. scope: 변수 이름 → 숫자
  function exprKeys(expr, scope) {
    const keys = [];
    const stack = []; // 열린 괄호의 종류: ')' 또는 'RIGHT'
    const s = String(expr).replace(/\s+/g, '');
    let i = 0;
    let prev = 'start'; // start | op | open | value
    // ×10ˣ 로 입력하는 수가 나누기 바로 뒤에 오면 괄호로 묶어서 헷갈리지 않게 한다
    const pushNum = (v) => {
      const nk = numberKeys(v);
      if (nk.indexOf('x10^x') >= 0 && keys[keys.length - 1] === '/') keys.push('(', ...nk, ')');
      else keys.push(...nk);
    };
    const err = (m) => {
      throw new Error('계산식 오류(' + m + '): ' + expr);
    };
    while (i < s.length) {
      const c = s[i];
      // 숫자 (1.5, 9e9, 1.5e-6)
      const nm = /^(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:e[+-]?[0-9]+)?/.exec(s.slice(i));
      if (nm) {
        if (prev === 'value') err('숫자 앞에 연산자가 없음');
        pushNum(Number(nm[0]));
        i += nm[0].length;
        prev = 'value';
        continue;
      }
      if (c === '$') {
        const vk = VARKEY[s[i + 1]];
        if (!vk) err('계산기 변수 이름이 이상함');
        if (prev === 'value') err('변수 앞에 연산자가 없음');
        keys.push('ALPHA', vk);
        i += 2;
        prev = 'value';
        continue;
      }
      const wm = /^[A-Za-z_][A-Za-z_0-9]*/.exec(s.slice(i));
      if (wm) {
        const w = wm[0];
        i += w.length;
        if (FUNCS[w] && s[i] === '(') {
          if (prev === 'value') err('함수 앞에 연산자가 없음');
          keys.push(...FUNCS[w].keys);
          stack.push(FUNCS[w].close);
          i++;
          prev = 'open';
        } else if (w === 'pi') {
          if (prev === 'value') err('π 앞에 연산자가 없음');
          keys.push('SHIFT', 'x10^x');
          prev = 'value';
        } else if (w === 'Ans') {
          if (prev === 'value') err('Ans 앞에 연산자가 없음');
          keys.push('Ans');
          prev = 'value';
        } else {
          if (prev === 'value') err('변수 앞에 연산자가 없음');
          const v = scope ? scope[w] : undefined;
          if (typeof v !== 'number') err('알 수 없는 이름 ' + w);
          pushNum(v);
          prev = 'value';
        }
        continue;
      }
      if (c === '(') {
        if (prev === 'value') err('( 앞에 연산자가 없음');
        keys.push('(');
        stack.push(')');
        i++;
        prev = 'open';
        continue;
      }
      if (c === ')') {
        if (!stack.length) err('닫는 괄호가 더 많음');
        keys.push(stack.pop());
        i++;
        prev = 'value';
        continue;
      }
      if (c === '^') {
        if (prev !== 'value') err('^ 앞에 값이 없음');
        i++;
        // 2, 3, -1 은 전용 키(x², x³, x⁻¹)
        const sm = /^(2|3|\(-1\)|-1)(?![0-9.])/.exec(s.slice(i));
        if (sm) {
          keys.push(sm[1] === '2' ? 'x2' : sm[1] === '3' ? 'x3' : 'x-1');
          i += sm[0].length;
          continue;
        }
        keys.push('x^');
        // 지수: 괄호 묶음이면 안쪽, 아니면 숫자 하나
        if (s[i] === '(') {
          let d = 0;
          let j = i;
          for (; j < s.length; j++) {
            if (s[j] === '(') d++;
            else if (s[j] === ')') {
              d--;
              if (d === 0) break;
            }
          }
          if (d !== 0) err('지수 괄호가 안 닫힘');
          keys.push(...exprKeys(s.slice(i + 1, j), scope));
          i = j + 1;
        } else {
          const em = /^-?(?:[0-9]+\.?[0-9]*|[A-Za-z_][A-Za-z_0-9]*)/.exec(s.slice(i));
          if (!em) err('지수를 읽을 수 없음');
          keys.push(...exprKeys(em[0], scope));
          i += em[0].length;
        }
        keys.push('RIGHT');
        prev = 'value';
        continue;
      }
      if (c === '+' || c === '*' || c === '/') {
        if (prev === 'open') err('연산자가 괄호 바로 뒤에 옴');
        keys.push(c);
        i++;
        prev = 'op';
        continue;
      }
      if (c === '-') {
        if (prev === 'value') keys.push('-');
        else keys.push('(-)');
        i++;
        prev = prev === 'value' ? 'op' : 'start';
        continue;
      }
      err('읽을 수 없는 글자 ' + c);
    }
    if (stack.length) err('괄호가 안 닫힘');
    return keys;
  }

  const guide = (id, fn) => {
    if (guides[id]) throw new Error('계산기 가이드 id 중복: ' + id);
    guides[id] = fn;
  };

  // 문제 → 단계 목록 [{say, expr, keys:[... , '=']}] . 가이드가 없으면 null
  function plan(q) {
    const fn = q && q.templateId ? guides[q.templateId] : null;
    if (!fn || q.answerValue === null || q.answerValue === undefined) return null;
    const raw = fn(q.params || {}, q);
    if (!raw || !raw.length) return null;
    return raw.map((st) => ({
      say: st.say,
      expr: st.expr,
      keys: exprKeys(st.expr, Object.assign({}, q.params, st.vars)).concat(st.store ? ['SHIFT', 'RCL', VARKEY[st.store]] : [], ['=']),
      store: st.store || null,
    }));
  }

  G.guide = guide;
  G.calcGuides = guides;
  G.calcPlan = plan;
  G.calcExprKeys = exprKeys;
})(globalThis.GISA);
