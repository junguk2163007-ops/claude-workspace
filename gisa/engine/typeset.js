// 수식 조판: 글 속의 "1/√(LC)", "V × R₂ / (R₁ + R₂)" 같은 한 줄 수식을 교과서·기출처럼
// 분수(분자 위, 분모 아래), 제곱근(윗줄), 위첨자(^)로 바꿔 그릴 수 있게 노드 트리로 만든다.
//  G.typeset(text) → 노드 배열 [{t:'tx',s} | {t:'frac',n:[…],d:[…]} | {t:'sqrt',b:[…],i?:[…]} | {t:'sup',b:[…]}], 바뀐 게 없으면 null
//  - 단위(V/m, rad/s, kg/m³ …)와 [대괄호] 안, 한글 낱말 사이의 슬래시는 분수로 만들지 않는다.
//  - 분자는 슬래시 왼쪽의 곱(×, 이어 쓴 글자) 전체, 분모는 (괄호 묶음) 또는 붙어 있는 글자 덩어리.
(function (G) {
  'use strict';

  const SUB = '₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₔₕₖₗₘₙₚₛₜ';
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ';
  const OPS = '+−-×·*=≈∝→←⇒≠<>≤≥±,;:∥∼~÷|';
  const WORD_RE = /[A-Za-z0-9α-ωΑ-Ωµμ°′″'∞%!…ℓʳᵍ]/;
  const isWord = (c) => WORD_RE.test(c) || SUB.indexOf(c) >= 0 || SUP.indexOf(c) >= 0;
  const UNITS = new Set(['V', 'A', 'W', 'Ω', 'F', 'H', 'T', 'N', 'J', 'C', 'S', 'm', 's', 'h', 'kg', 'g', 'km', 'cm', 'mm', 'rad', 'Wb', 'Hz', 'var', 'VA', 'AT', 'kV', 'kW', 'MW', 'kA', 'mA', 'mH', 'μF', 'μH', 'pF', 'kVA', 'kcal', 'rpm', 'MVA', 'kvar', 'N·m', 'ms', 'μs', 'min', 'mWb']);
  const UNIT_RE = /^[GMkmμµnp]?(?:V|A|W|Ω|F|H|T|N|J|C|S|s|m|g|Hz|Wb|var|VA|AT|rad|cal|Wh|h|min|rpm)$/;
  const isUnitWord = (w) => UNITS.has(w) || UNIT_RE.test(w);
  const LOWER_UNITS = new Set(['m', 's', 'h', 'km', 'cm', 'mm', 'kg', 'g', 'ms', 'min', 'μs']);

  // 글자 → 토큰
  function tokenize(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c === ' ' || c === ' ' || c === ' ') out.push({ k: 'sp', s: ' ' });
      else if (isWord(c) || ((c === '.' || c === ',') && i > 0 && /[0-9]/.test(str[i - 1]) && /[0-9]/.test(str[i + 1] || '') && !(c === ',' && str[i + 2] !== undefined && /[0-9]/.test(str[i + 2]) && /[0-9]/.test(str[i + 3] || '') === false))) {
        const last = out[out.length - 1];
        if (last && last.k === 'w') last.s += c;
        else out.push({ k: 'w', s: c });
      } else if (c === '√' || c === '∛') out.push({ k: c, s: c });
      else if (c === '^') out.push({ k: '^', s: c });
      else if (c === '(' || c === '{') out.push({ k: '(', s: c });
      else if (c === ')' || c === '}') out.push({ k: ')', s: c });
      else if (c === '[') out.push({ k: '[', s: c });
      else if (c === ']') out.push({ k: ']', s: c });
      else if (c === '/') out.push({ k: '/', s: c });
      else if (OPS.indexOf(c) >= 0) out.push({ k: 'op', s: c });
      else out.push({ k: 'x', s: c });
    }
    return out;
  }

  // 토큰 → 노드 배열 (글자는 이어 붙임)
  function toNodes(tokens) {
    const nodes = [];
    let buf = '';
    const flush = () => {
      if (buf) nodes.push({ t: 'tx', s: buf });
      buf = '';
    };
    tokens.forEach((t) => {
      if (t.k === 'node') {
        flush();
        nodes.push(t.node);
      } else buf += t.s;
    });
    flush();
    // 앞뒤 공백 정리
    if (nodes.length && nodes[0].t === 'tx') nodes[0].s = nodes[0].s.replace(/^\s+/, '');
    if (nodes.length && nodes[nodes.length - 1].t === 'tx') nodes[nodes.length - 1].s = nodes[nodes.length - 1].s.replace(/\s+$/, '');
    return nodes.filter((n) => n.t !== 'tx' || n.s);
  }

  const isOpen = (t) => t && t.k === '(';
  const isClose = (t) => t && t.k === ')';
  function matchClose(tokens, i) {
    let d = 0;
    for (let j = i; j < tokens.length; j++) {
      if (isOpen(tokens[j])) d++;
      else if (isClose(tokens[j])) {
        d--;
        if (d === 0) return j;
      }
    }
    return -1;
  }
  function matchOpen(tokens, i) {
    let d = 0;
    for (let j = i; j >= 0; j--) {
      if (isClose(tokens[j])) d++;
      else if (isOpen(tokens[j])) {
        d--;
        if (d === 0) return j;
      }
    }
    return -1;
  }

  // 1단계: √ 와 ^ 를 노드로
  function radicalsAndPowers(tokens) {
    const out = tokens.slice();
    // 뒤에서 앞으로: 안쪽(오른쪽) 것부터 바꿔야 바깥 것의 피연산자가 완성된다
    for (let i = out.length - 1; i >= 0; i--) {
      const t = out[i];
      if (t.k === '√' || t.k === '∛') {
        let j = i + 1;
        while (out[j] && out[j].k === 'sp' && false) j++;
        const nx = out[j];
        if (isOpen(nx)) {
          const e = matchClose(out, j);
          if (e < 0) continue;
          const inner = process(out.slice(j + 1, e));
          out.splice(i, e - i + 1, { k: 'node', node: { t: 'sqrt', b: toNodes(inner), i: t.k === '∛' ? [{ t: 'tx', s: '3' }] : null } });
        } else if (nx && (nx.k === 'w' || nx.k === 'node')) {
          out.splice(i, 2, { k: 'node', node: { t: 'sqrt', b: toNodes([nx]), i: t.k === '∛' ? [{ t: 'tx', s: '3' }] : null } });
        }
      } else if (t.k === '^' && i > 0) {
        const nx = out[i + 1];
        if (isOpen(nx)) {
          const e = matchClose(out, i + 1);
          if (e < 0) continue;
          const inner = process(out.slice(i + 2, e));
          out.splice(i, e - i + 1, { k: 'node', node: { t: 'sup', b: toNodes(inner) } });
        } else if (nx && nx.k === 'op' && nx.s === '−' && out[i + 2] && out[i + 2].k === 'w') {
          out.splice(i, 3, { k: 'node', node: { t: 'sup', b: [{ t: 'tx', s: '−' + out[i + 2].s }] } });
        } else if (nx && nx.k === 'w') {
          out.splice(i, 2, { k: 'node', node: { t: 'sup', b: [{ t: 'tx', s: nx.s }] } });
        }
      }
    }
    return out;
  }

  const wordish = (t) => t && (t.k === 'w' || t.k === 'node');
  const isHan = (t) => !!t && t.k === 'x' && /[가-힣]/.test(t.s);
  const MAX_WORDS = 4; // 한글 구절 피연산자는 낱말 4개까지(문장을 통째로 삼키지 않게)
  const wordCount = (ts) => {
    let n = 0;
    let inWord = false;
    ts.forEach((t) => {
      const w = t.k === 'w' || t.k === 'node' || isHan(t);
      if (w && !inWord) n++;
      inWord = w;
    });
    return n;
  };

  // 슬래시 왼쪽의 분자 범위: [시작, 끝) (끝 = 슬래시 위치 바로 앞 공백 제외)
  function leftOperand(tokens, slash, kr) {
    let i = slash - 1;
    while (i >= 0 && tokens[i].k === 'sp') i--;
    const end = i + 1;
    let start = end;
    while (i >= 0) {
      const t = tokens[i];
      if (t.k === 'w' || t.k === 'node' || (kr && isHan(t))) {
        start = i;
        i--;
      } else if (t.k === ')') {
        const o = matchOpen(tokens, i);
        if (o < 0) break;
        start = o;
        i = o - 1;
        // 함수처럼 붙은 이름: sF(s)
        if (i >= 0 && tokens[i].k === 'w') {
          start = i;
          i--;
        }
      } else if (t.k === 'op' && (t.s === '×' || t.s === '·' || t.s === '*')) {
        start = i;
        i--;
      } else if (t.k === 'sp') {
        // 공백은 곱 연산자 곁이거나 글자·묶음 사이(이어 쓰기)일 때만 이어 간다
        let l = i - 1;
        while (l >= 0 && tokens[l].k === 'sp') l--;
        const left = tokens[l];
        const right = tokens[start];
        const mulLeft = left && left.k === 'op' && (left.s === '×' || left.s === '·' || left.s === '*');
        const mulRight = right && right.k === 'op' && (right.s === '×' || right.s === '·' || right.s === '*');
        const leftOk = left && (left.k === 'w' || left.k === 'node' || left.k === ')' || (kr && isHan(left)));
        const rightOk = right && (right.k === 'w' || right.k === 'node' || right.k === '(' || right.k === '√' || (kr && isHan(right)));
        if (mulLeft || (mulRight && leftOk) || (leftOk && rightOk && start === i + 1)) i--;
        else break;
      } else if (t.k === '√' || t.k === '∛') {
        start = i;
        i--;
      } else break;
    }
    // 시작이 곱 연산자면 의미가 없으니 그 앞 공백/연산자는 포함하지 않는다
    while (start < end && (tokens[start].k === 'sp' || (tokens[start].k === 'op' && start === 0))) start++;
    return [start, end];
  }

  // 슬래시 오른쪽의 분모 범위: [시작, 끝)
  function rightOperand(tokens, slash, kr) {
    let i = slash + 1;
    while (i < tokens.length && tokens[i].k === 'sp') i++;
    const start = i;
    if (i >= tokens.length) return [start, start];
    if (isOpen(tokens[i])) {
      const e = matchClose(tokens, i);
      return e < 0 ? [start, start] : [start, e + 1];
    }
    let end = i;
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.k === 'w' || t.k === 'node' || t.k === '√' || t.k === '∛' || (kr && isHan(t))) {
        i++;
        end = i;
      } else if (kr && t.k === 'sp' && (wordish(tokens[i + 1]) || isHan(tokens[i + 1]))) {
        i++;
      } else if (t.k === '(' && i > start && tokens[i - 1].k === 'w') {
        const e = matchClose(tokens, i);
        if (e < 0) break;
        // 이름 뒤에 붙은 (한글 설명)은 함수 인수가 아니라 덧붙인 말이다: R(최대), r(같은 단위)
        if (tokens.slice(i, e).some(isHan) && (tokens[i - 1].s.length === 1 || /^[0-9.]+$/.test(tokens[i - 1].s))) break;
        i = e + 1;
        end = i;
      } else break;
    }
    return [start, end];
  }

  const baseOf = (s) => s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ]/g, '').replace(/[0-9]+$/, (m) => (s.length > m.length ? '' : m));

  // 단위끼리의 나눗셈(V/m, rad/s, kg/m³ …)인지
  function looksLikeUnit(numTokens, denTokens) {
    const flat = (ts) => ts.map((t) => (t.k === 'node' ? '#' : t.s)).join('').trim();
    const n = flat(numTokens);
    const d = flat(denTokens);
    if (n.indexOf('#') >= 0 || d.indexOf('#') >= 0) return false;
    // "12 V/m", "1 C/s"처럼 숫자 뒤에 단위가 붙은 분자는 마지막 낱말만 본다
    const nb = baseOf(n.replace(/^[0-9.,×·\s]+/, '').split(/\s+/).pop());
    const db = baseOf(d);
    if (!isUnitWord(nb) || !isUnitWord(db)) return false;
    return LOWER_UNITS.has(db) || db.length > 1 || nb.length > 1;
  }

  function trimSp(ts) {
    let a = 0;
    let b = ts.length;
    while (a < b && ts[a].k === 'sp') a++;
    while (b > a && ts[b - 1].k === 'sp') b--;
    return ts.slice(a, b);
  }
  // 전체가 괄호 하나로 감싸여 있으면 벗긴다
  function unwrap(ts) {
    const t = trimSp(ts);
    if (t.length >= 2 && isOpen(t[0]) && matchClose(t, 0) === t.length - 1) return trimSp(t.slice(1, -1));
    return t;
  }

  // 2단계: 슬래시를 분수로 (안쪽 괄호 것부터)
  function fractions(tokens) {
    let out = tokens.slice();
    for (let guard = 0; guard < 200; guard++) {
      // 괄호 깊이가 가장 깊은 슬래시(같으면 왼쪽)를 고른다. [ ] 안은 건너뜀.
      let best = -1;
      let bestDepth = -1;
      let depth = 0;
      let br = 0;
      for (let i = 0; i < out.length; i++) {
        const t = out[i];
        if (isOpen(t)) depth++;
        else if (isClose(t)) depth--;
        else if (t.k === '[') br++;
        else if (t.k === ']') br--;
        else if (t.k === '/' && br === 0 && depth > bestDepth) {
          best = i;
          bestDepth = depth;
        }
      }
      if (best < 0) break;
      const spaced = out[best - 1] && out[best - 1].k === 'sp' && out[best + 1] && out[best + 1].k === 'sp';
      const afterGroup = out[best - 1] && out[best - 1].k === ')';
      let [ls, le] = leftOperand(out, best, false);
      let [rs, re] = rightOperand(out, best, false);
      // 한글로 된 식("평균 전력 / 최대 전력")은 슬래시 양옆에 공백이 있거나 분자가 괄호 묶음일 때만 분수로 본다
      if ((ls >= le || rs >= re) && (spaced || afterGroup)) {
        [ls, le] = leftOperand(out, best, true);
        [rs, re] = rightOperand(out, best, true);
        if (wordCount(out.slice(ls, le)) > MAX_WORDS || wordCount(out.slice(rs, re)) > MAX_WORDS) {
          out[best] = { k: 'x', s: '/' };
          continue;
        }
      }
      // 분자 앞에 붙은 곱 연산자·공백, 함수 이름(tan 4/3의 tan)은 분수 밖에 남긴다
      for (;;) {
        const t0 = out[ls];
        const t1 = out[ls + 1];
        if (ls < le && (t0.k === 'sp' || (t0.k === 'op' && (t0.s === '×' || t0.s === '·' || t0.s === '*')))) ls++;
        else if (ls + 1 < le && t0.k === 'w' && /^(sin|cos|tan|log|ln|exp)$/.test(t0.s) && t1.k === 'sp') ls += 2;
        else break;
      }
      const num = out.slice(ls, le);
      const den = out.slice(rs, re);
      const separator = (out[best - 2] && out[best - 1].k === 'sp' && out[best - 2].k === 'sp') || (out[best + 2] && out[best + 1].k === 'sp' && out[best + 2].k === 'sp');
      const numT = unwrap(num);
      const denT = unwrap(den);
      // 한글 낱말에 바로 붙은 글자(예: 상전압²/Z)는 수식이 아니라 말이다
      const glued = ls > 0 && isHan(out[ls - 1]) && !spaced && !afterGroup;
      const badX = (ts) => ts.some((t) => t.k === 'x' && !isHan(t));
      // "0 / 44" 같은 숫자끼리의 진행 표시(공백 있는 정수/정수)는 분수가 아니다
      const counter = spaced && num.length === 1 && den.length === 1 && /^[0-9]+$/.test(num[0].s || '') && /^[0-9]+$/.test(den[0].s || '');
      if (counter || separator || glued || !numT.length || !denT.length || looksLikeUnit(numT, denT) || badX(num) || badX(den)) {
        out[best] = { k: 'x', s: '/' }; // 분수로 만들 수 없는 슬래시는 그냥 글자
        continue;
      }
      const node = { k: 'node', node: { t: 'frac', n: toNodes(numT), d: toNodes(denT) } };
      out.splice(ls, re - ls, node);
    }
    return out;
  }

  // 3단계: (분수 하나)만 든 괄호는 벗긴다
  function unwrapFractionParens(tokens) {
    const out = tokens.slice();
    for (let i = 0; i < out.length; i++) {
      if (isOpen(out[i])) {
        const e = matchClose(out, i);
        if (e < 0) continue;
        const inner = trimSp(out.slice(i + 1, e));
        if (inner.length === 1 && inner[0].k === 'node' && inner[0].node.t === 'frac' && !(i > 0 && out[i - 1].k === 'w')) {
          out.splice(i, e - i + 1, inner[0]);
        }
      }
    }
    return out;
  }

  function process(tokens) {
    return unwrapFractionParens(fractions(radicalsAndPowers(tokens)));
  }

  // ───────── 수식 구간: 변수는 기울이고(I, V, ω₀), 함수·단위·숫자는 바로 세운다 ─────────
  const FUNC_RE = /^(?:sin|cos|tan|log|ln|exp|lim|max|min)/;
  const VAR_LETTER = /[A-Za-zα-ωµ]/; // 소문자 그리스(π 제외)와 라틴 문자만 기울인다
  // 문자열 → 노드(tx, v). afterNum: 바로 앞이 숫자(→ 단위 가능), afterSlash: 바로 앞이 단위 나눗셈 슬래시
  function styleText(str, afterNum, afterSlash) {
    const out = [];
    let plain = '';
    const flush = () => {
      if (plain) out.push({ t: 'tx', s: plain });
      plain = '';
    };
    let i = 0;
    while (i < str.length) {
      const c = str[i];
      if (/[A-Za-zΑ-Ωα-ωµ]/.test(c)) {
        let j = i;
        while (j < str.length && /[A-Za-zΑ-Ωα-ωµ]/.test(str[j])) j++;
        const word = str.slice(i, j);
        // 숫자 뒤나 단위 슬래시 뒤의 단위 낱말은 세워 쓴다(12 V, 5 mH, C/s)
        const isUnit = (afterNum || afterSlash) && i === 0 && isUnitWord(word);
        if (isUnit) plain += word;
        else {
          let k = 0;
          while (k < word.length) {
            const f = FUNC_RE.exec(word.slice(k));
            if (f) {
              plain += f[0];
              k += f[0].length;
            } else if (VAR_LETTER.test(word[k]) && word[k] !== 'π') {
              flush();
              out.push({ t: 'v', s: word[k] });
              k++;
            } else {
              plain += word[k];
              k++;
            }
          }
        }
        i = j;
      } else {
        plain += c;
        i++;
      }
    }
    flush();
    return out;
  }

  // 노드 안의 글자 스타일 적용(분수·루트·위첨자 속까지)
  function styleNodes(nodes) {
    const out = [];
    nodes.forEach((n) => {
      if (n.t === 'tx') {
        const numBefore = out.length ? /[0-9][0-9.,\s×·]*$/.test(plainOf(out)) : false;
        styleText(n.s, numBefore, false).forEach((x) => out.push(x));
      } else if (n.t === 'frac') out.push({ t: 'frac', n: styleNodes(n.n), d: styleNodes(n.d) });
      else if (n.t === 'sqrt') out.push({ t: 'sqrt', b: styleNodes(n.b), i: n.i });
      else if (n.t === 'sup') out.push({ t: 'sup', b: styleNodes(n.b) });
      else out.push(n);
    });
    return out;
  }
  const plainOf = (ns) =>
    ns
      .map((n) => (n.t === 'tx' || n.t === 'v' ? n.s : ''))
      .join('');

  const REGION_KINDS = new Set(['w', 'op', 'sp', '(', ')', '[', ']', '/', 'node', '√', '∛', '^']);
  const BREAK_OPS = new Set([',', ';', ':']);

  function regionNodes(ts) {
    // 대괄호 [ ] 안은 단위 표시라서 스타일 없이 그대로 둔다
    const out = [];
    let bracket = 0;
    let prev = null;
    ts.forEach((t) => {
      if (t.k === '[') bracket++;
      if (t.k === 'node') {
        out.push(...styleNodes([t.node]));
      } else if (t.k === 'w' && bracket === 0) {
        const afterNum = !!prev && prev.k === 'sp' && prev.afterNum;
        const afterSlash = !!prev && prev.k === '/';
        styleText(t.s, afterNum, afterSlash).forEach((x) => out.push(x));
      } else out.push({ t: 'tx', s: t.s });
      if (t.k === ']') bracket = Math.max(0, bracket - 1);
      prev = t;
    });
    return out;
  }

  // 숫자 바로 뒤(공백 하나 포함)에 오는 낱말인지 표시해 둔다
  function markNumbers(tokens) {
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.k === 'sp' && tokens[i - 1] && tokens[i - 1].k === 'w' && /[0-9]$/.test(tokens[i - 1].s)) t.afterNum = true;
    }
  }

  function styleRegions(tokens) {
    markNumbers(tokens);
    const out = [];
    let i = 0;
    let changed = false;
    while (i < tokens.length) {
      const t = tokens[i];
      const ok = (x) => REGION_KINDS.has(x.k) && !(x.k === 'op' && BREAK_OPS.has(x.s));
      if (!ok(t)) {
        out.push(t);
        i++;
        continue;
      }
      let j = i;
      while (j < tokens.length && ok(tokens[j])) j++;
      let a = i;
      let b = j;
      while (a < b && tokens[a].k === 'sp') a++;
      while (b > a && (tokens[b - 1].k === 'sp' || tokens[b - 1].k === '(')) b--;
      const run = tokens.slice(a, b);
      const hasEq = run.some((x) => x.k === 'op' && /[=≈∝]/.test(x.s));
      const hasNode = run.some((x) => x.k === 'node');
      const hasLetter = run.some((x) => (x.k === 'w' && /[A-Za-zΑ-Ωα-ω]/.test(x.s)) || x.k === 'node');
      for (let q = i; q < a; q++) out.push(tokens[q]);
      if (run.length && (hasEq || hasNode) && hasLetter) {
        out.push({ k: 'node', node: { t: 'math', b: regionNodes(run) } });
        changed = true;
      } else for (let q = a; q < b; q++) out.push(tokens[q]);
      for (let q = b; q < j; q++) out.push(tokens[q]);
      i = j;
    }
    return { tokens: out, changed };
  }

  function typeset(text) {
    const s = String(text);
    if (!/[/√∛^=≈∝]/.test(s)) return null;
    const processed = process(tokenize(s));
    const hasNode = processed.some((t) => t.k === 'node');
    const styled = styleRegions(processed.map((t) => (t.k === 'sp' ? Object.assign({}, t, { s: ' ' }) : t)));
    if (!hasNode && !styled.changed) return null;
    return toNodes(styled.tokens);
  }

  // 시험·확인용 문자열: 분수는 ⟦분자|분모⟧, 제곱근은 √⟦…⟧, 위첨자는 ^⟦…⟧
  function debug(nodes) {
    if (!nodes) return null;
    const d = (ns) =>
      ns
        .map((n) => {
          if (n.t === 'tx' || n.t === 'v') return n.s;
          if (n.t === 'math') return d(n.b);
          if (n.t === 'frac') return '⟦' + d(n.n) + '|' + d(n.d) + '⟧';
          if (n.t === 'sqrt') return (n.i ? '∛' : '√') + '⟦' + d(n.b) + '⟧';
          return '^⟦' + d(n.b) + '⟧';
        })
        .join('');
    return d(nodes);
  }

  G.typeset = typeset;
  G.typesetDebug = (text) => debug(typeset(text));
})(globalThis.GISA);
