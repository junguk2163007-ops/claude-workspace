// 카시오 fx-350ES PLUS (2nd edition) 계산기 본체.
//  press(키 이름)으로 조작하고 view()로 화면을 읽는다.
//  키 이름: SHIFT ALPHA MODE ON UP DOWN LEFT RIGHT Abs x3 x-1 LOGAB FRAC SQRT x2 x^ log ln (-) DMS hyp sin cos tan
//           RCL ENG ( ) S<>D M+ 7 8 9 DEL AC 4 5 6 * / 1 2 3 + - 0 . x10^x Ans =
(function (G) {
  'use strict';
  const N = G.qn;
  const E = G.ceval;
  const F = G.cfmt;
  const { tx } = F;
  const sup = F.sup;
  const CalcError = E.CalcError;

  const VARS = { '(-)': 'A', DMS: 'B', hyp: 'C', sin: 'D', cos: 'E', tan: 'F', ')': 'X', 'S<>D': 'Y', 'M+': 'M' };
  const STRUCT_SLOTS = { frac: 2, mix: 3, sqrt: 1, cbrt: 1, nroot: 2, pow: 1, e10: 1, ee: 1, x10: 1, logb: 2, abs: 1 };
  const BIN_KEYS = { '+': '+', '-': '-', '*': '*', '/': '/' };
  const ZERO = () => E.vInt(0);

  const FN_NAME = {
    sin: ['sin'], cos: ['cos'], tan: ['tan'],
    asin: ['sin', '−1'], acos: ['cos', '−1'], atan: ['tan', '−1'],
    sinh: ['sinh'], cosh: ['cosh'], tanh: ['tanh'],
    asinh: ['sinh', '−1'], acosh: ['cosh', '−1'], atanh: ['tanh', '−1'],
    log: ['log'], ln: ['ln'], Abs: ['Abs'], Pol: ['Pol'], Rec: ['Rec'], RanInt: ['RanInt#'], Rnd: ['Rnd'],
    sqrt: ['√'], cbrt: ['³√'], pow10: ['10^'], powe: ['e^'],
  };
  const STAT_NAME = {
    n: 'n', xbar: 'x̄', sxp: 'σx', sxs: 'sx', ybar: 'ȳ', syp: 'σy', sys: 'sy',
    sumx: 'Σx', sumx2: 'Σx²', sumy: 'Σy', sumy2: 'Σy²', sumxy: 'Σxy', sumx3: 'Σx³', sumx2y: 'Σx²y', sumx4: 'Σx⁴',
    regA: 'A', regB: 'B', regC: 'C', regr: 'r', minX: 'minX', maxX: 'maxX', minY: 'minY', maxY: 'maxY',
    xhat: 'x̂', yhat: 'ŷ', xhat1: 'x̂₁', xhat2: 'x̂₂',
  };

  const deepV = (v) => ({ ex: v.ex, f: v.f, dec: v.dec });

  class Calc {
    constructor(opts) {
      this.rand = (opts && opts.rand) || Math.random;
      this.resetAll();
    }

    // ───────── 초기화 ─────────
    resetSetup() {
      this.setup = { io: 'MathO', angle: 'Deg', fmt: 'norm', n: 1, frac: 'd/c', stat: false, dot: 'Dot' };
      this.mode = 'COMP';
      this.clearScreen(true);
    }
    resetMemory() {
      this.mem = { Ans: ZERO(), A: ZERO(), B: ZERO(), C: ZERO(), D: ZERO(), E: ZERO(), F: ZERO(), X: ZERO(), Y: ZERO(), M: ZERO() };
    }
    resetAll() {
      this.off = false;
      this.contrast = 0;
      this.resetMemory();
      this.stat = { type: '1-VAR', rows: [{ x: null, y: null, f: null }], sel: { r: 0, c: 0 }, top: 0 };
      this.table = { fx: [], start: E.vInt(1), end: E.vInt(5), step: E.vInt(1), rows: [], sel: 0, stage: 'fx' };
      this.hist = [];
      this.resetSetup();
    }
    clearScreen(clearHist) {
      this.tokens = [];
      this.cur = 0;
      this.overwrite = false;
      this.wrapNext = false;
      this.shift = false;
      this.alpha = false;
      this.pending = null;
      this.screen = 'input';
      this.res = null;
      this.histPos = -1;
      this.multi = null;
      this.menu = null;
      this.err = null;
      this.prompt = null;
      this.eng = null;
      this.toggle = false;
      this.mixedToggle = false;
      this.forceDec = false;
      this.dmsView = false;
      this.factView = false;
      if (clearHist) this.hist = [];
    }
    get io() {
      return this.mode === 'STAT' ? 'LineIO' : this.setup.io;
    }

    // ───────── 키 입력 ─────────
    press(id) {
      if (this.off) {
        if (id === 'ON') {
          this.off = false;
          this.clearScreen(true);
        }
        return;
      }
      if (id === 'SHIFT') {
        this.shift = !this.shift;
        this.alpha = false;
        return;
      }
      if (id === 'ALPHA') {
        this.alpha = !this.alpha;
        this.shift = false;
        return;
      }
      const sh = this.shift;
      const al = this.alpha;
      this.shift = false;
      this.alpha = false;
      if (id === 'ON') {
        this.clearScreen(true);
        return;
      }
      if (sh && id === 'AC') {
        this.off = true;
        return;
      }
      switch (this.screen) {
        case 'error':
          return this.errorKey(id);
        case 'menu':
          return this.menuKey(id);
        case 'confirm':
          return this.confirmKey(id);
        case 'prompt':
          return this.promptKey(id);
        case 'contrast':
          return this.contrastKey(id);
        case 'statedit':
          return this.statEditKey(id, sh, al);
        case 'table':
          return this.tableKey(id, sh, al);
        default:
      }
      if (this.pending) return this.varKey(id, sh, al);
      if (this.mode === 'TABLE' && this.table.stage !== 'fx') return this.tableDialogKey(id, sh, al);
      return this.inputKey(id, sh, al);
    }

    // 키 문자열 여러 개를 연속 입력 (테스트·도움말용): "sin 3 0 ) =" / 숫자는 한 글자씩
    keys(str) {
      str.trim().split(/\s+/).forEach((w) => {
        if (/^[0-9.]+$/.test(w) && w.length > 1) w.split('').forEach((c) => this.press(c));
        else this.press(w);
      });
      return this;
    }

    // ───────── 입력 화면의 키 ─────────
    inputKey(id, sh, al) {
      const line = this.io === 'LineIO';
      // 모드·설정·초기화 메뉴
      if (id === 'MODE') return sh ? this.openSetup() : this.openMenu('mode');
      if (sh && id === '9') return this.openMenu('clr');
      if (sh && id === '1') {
        if (this.mode === 'STAT') return this.openStatMenu();
        return;
      }
      // 이동·삭제
      if (id === 'LEFT' || id === 'RIGHT') return this.horizontal(id);
      if (id === 'UP' || id === 'DOWN') return this.vertical(id);
      if (id === 'AC') return this.ac();
      if (id === 'DEL') return sh ? this.toggleIns() : this.del();
      if (id === '=') return this.equals(sh);
      // 결과 화면 전용 키
      if (this.screen === 'result') {
        if (id === 'S<>D') {
          if (sh) this.mixedToggle = !this.mixedToggle;
          else {
            this.toggle = !this.toggle;
            this.eng = null;
            this.dmsView = false;
          }
          return;
        }
        if (id === 'ENG') {
          const base = this.eng === null ? 0 : this.eng;
          this.eng = sh ? (this.eng === null ? 1 : base + 1) : this.eng === null ? 0 : base - 1;
          this.toggle = false;
          this.dmsView = false;
          return;
        }
        if (id === 'DMS' && !sh) {
          this.dmsView = !this.dmsView;
          this.eng = null;
          return;
        }
        if (id === 'DMS' && sh) return this.factorize();
        if (id === 'M+') return this.memAdd(sh ? -1 : 1);
        if (id === 'RCL' && sh) {
          this.pending = 'STO';
          return;
        }
      }
      if (id === 'RCL') {
        this.pending = sh ? 'STO' : 'RCL';
        return;
      }
      if (id === 'M+' && !al) return this.memAdd(sh ? -1 : 1);

      const act = this.action(id, sh, al, line);
      if (!act) return;
      this.perform(act);
    }

    // 키 → 동작
    action(id, sh, al, line) {
      if (al) {
        if (VARS[id]) return { tok: { k: 'var', v: VARS[id] } };
        if (id === 'x3') return { tok: { k: 'colon' } };
        if (id === '.') return { tok: { k: 'fn', v: 'RanInt' } };
        if (id === 'x10^x') return { tok: { k: 'c', v: 'e' } };
        return null;
      }
      if (sh) {
        switch (id) {
          case 'x-1':
            return { tok: { k: 'post', v: 'fact' }, post: true };
          case 'DMS':
            return null;
          case 'FRAC':
            return line ? { tok: { k: 'fsep' } } : { struct: 'mix', wrap: true };
          case 'SQRT':
            return line ? { tok: { k: 'fn', v: 'cbrt' } } : { struct: 'cbrt', wrap: true };
          case 'x^':
            return line ? { tok: { k: 'nrootl' }, post: true } : { struct: 'nroot', wrap: true };
          case 'log':
            return line ? { tok: { k: 'fn', v: 'pow10' } } : { struct: 'e10', wrap: true };
          case 'ln':
            return line ? { tok: { k: 'fn', v: 'powe' } } : { struct: 'ee', wrap: true };
          case 'sin':
            return { tok: { k: 'fn', v: 'asin' } };
          case 'cos':
            return { tok: { k: 'fn', v: 'acos' } };
          case 'tan':
            return { tok: { k: 'fn', v: 'atan' } };
          case '0':
            return { tok: { k: 'fn', v: 'Rnd' } };
          case '.':
            return { tok: { k: 'ran' } };
          case 'x10^x':
            return { tok: { k: 'c', v: 'pi' } };
          case 'Ans':
            return { menu: 'drg' };
          case '*':
            return { tok: { k: 'op', v: 'nPr' }, bin: true };
          case '/':
            return { tok: { k: 'op', v: 'nCr' }, bin: true };
          case '+':
            return { tok: { k: 'fn', v: 'Pol' } };
          case '-':
            return { tok: { k: 'fn', v: 'Rec' } };
          case '(':
            return { tok: { k: 'post', v: 'pct' }, post: true };
          case ')':
            return { tok: { k: 'comma' } };
          default:
            return null;
        }
      }
      if (/^[0-9]$/.test(id) || id === '.') return { tok: { k: 'd', v: id }, digit: true };
      if (BIN_KEYS[id]) return { tok: { k: 'op', v: BIN_KEYS[id] }, bin: true };
      switch (id) {
        case '(-)':
          return { tok: { k: 'neg' } };
        case '(':
          return { tok: { k: 'lp' } };
        case ')':
          return { tok: { k: 'rp' } };
        case 'sin':
        case 'cos':
        case 'tan':
        case 'log':
        case 'ln':
          return { tok: { k: 'fn', v: id } };
        case 'x2':
          return { tok: { k: 'post', v: 'x2' }, post: true, once: true };
        case 'x3':
          return { tok: { k: 'post', v: 'x3' }, post: true, once: true };
        case 'x-1':
          return { tok: { k: 'post', v: 'xinv' }, post: true, once: true };
        case 'x^':
          return line ? { tok: { k: 'powl' }, post: true } : { struct: 'pow', post: true, once: true };
        case 'x10^x':
          return line ? { tok: { k: 'x10l' }, post: true } : { struct: 'x10', post: true };
        case 'SQRT':
          return line ? { tok: { k: 'fn', v: 'sqrt' } } : { struct: 'sqrt', wrap: true };
        case 'FRAC':
          return line ? { tok: { k: 'fsep' } } : { struct: 'frac', wrap: true, numerator: true };
        case 'LOGAB':
          return line ? null : { struct: 'logb', wrap: true };
        case 'Abs':
          return line ? { tok: { k: 'fn', v: 'Abs' } } : { struct: 'abs', wrap: true };
        case 'hyp':
          return { menu: 'hyp' };
        case 'DMS':
          return { tok: { k: 'dms' } };
        case 'Ans':
          return { tok: { k: 'ans' } };
        default:
          return null;
      }
    }

    perform(act) {
      if (act.menu) return this.openMenu(act.menu);
      // 결과 화면에서의 시작 규칙
      if (this.screen === 'result') {
        if (act.bin || act.post) {
          this.tokens = [{ k: 'ans' }];
          this.cur = 1;
        } else {
          this.tokens = [];
          this.cur = 0;
        }
        this.leaveResult();
      } else if (!this.tokens.length && (act.bin || act.post) && this.mode !== 'TABLE') {
        this.tokens = [{ k: 'ans' }];
        this.cur = 1;
      }
      // x² x³ x⁻¹ ^ 를 연달아 누르면 뒤의 것은 무시(설명서)
      if (act.once) {
        const prev = this.tokens[this.cur - 1];
        if (prev && ((prev.k === 'post' && /^(x2|x3|xinv)$/.test(prev.v)) || (prev.k === 'E' && (prev.s === 'pow')))) return;
      }
      if (act.struct) return this.insertStruct(act);
      this.insert(act.tok);
    }

    leaveResult() {
      this.screen = 'input';
      this.res = null;
      this.histPos = -1;
      this.multi = null;
      this.eng = null;
      this.toggle = false;
      this.mixedToggle = false;
      this.forceDec = false;
      this.dmsView = false;
      this.factView = false;
    }

    // ───────── 편집기 ─────────
    insert(tok) {
      if (this.overwrite && this.io === 'LineIO') {
        const t = this.tokens[this.cur];
        if (t && !/^[SME]$/.test(t.k)) {
          this.tokens[this.cur] = tok;
          this.cur++;
          return;
        }
      }
      this.tokens.splice(this.cur, 0, tok);
      this.cur++;
    }

    insertStruct(act) {
      const s = act.struct;
      const n = STRUCT_SLOTS[s];
      const open = [{ k: 'S', s }];
      for (let i = 1; i < n; i++) open.push({ k: 'M', s, i });
      open.push({ k: 'E', s });
      // 분수 키: 바로 앞의 숫자를 분자로 삼는다
      if (s === 'frac' && act.numerator && !this.wrapNext) {
        let j = this.cur;
        while (j > 0 && this.tokens[j - 1].k === 'd') j--;
        if (j < this.cur) {
          const numTokens = this.tokens.slice(j, this.cur);
          this.tokens.splice(j, this.cur - j, open[0], ...numTokens, open[1], open[2]);
          this.cur = j + 1 + numTokens.length + 1; // 분모 시작
          return;
        }
      }
      // INS 상태: 커서 오른쪽의 값 하나를 이 함수의 인수로 감쌈
      if (this.wrapNext && act.wrap) {
        this.wrapNext = false;
        const end = this.operandEnd(this.cur);
        if (end > this.cur) {
          const operand = this.tokens.slice(this.cur, end);
          const slotIdx = s === 'nroot' || s === 'logb' ? 1 : 0; // n제곱근은 피개수, log는 진수
          const parts = [open[0]];
          for (let i = 0; i < n; i++) {
            if (i > 0) parts.push(open[i]);
            if (i === slotIdx) parts.push(...operand);
          }
          parts.push(open[open.length - 1]);
          this.tokens.splice(this.cur, end - this.cur, ...parts);
          if (s === 'frac' || s === 'nroot' || s === 'logb' || s === 'mix') {
            // 비어 있는 칸에 커서
            const emptySlot = s === 'frac' ? 1 : 0;
            let idx = this.cur + 1;
            let slot = 0;
            for (let i = this.cur + 1; slot < emptySlot; i++) {
              if (this.tokens[i].k === 'M' && this.tokens[i].s === s) {
                slot++;
                idx = i + 1;
              }
            }
            this.cur = idx;
          } else this.cur += parts.length;
          return;
        }
      }
      this.tokens.splice(this.cur, 0, ...open);
      this.cur++; // 첫 칸 안으로
    }

    // 커서 오른쪽의 "값 하나"가 끝나는 위치
    operandEnd(i) {
      const t = this.tokens[i];
      if (!t) return i;
      let depth = 0;
      if (t.k === 'S') {
        for (let j = i; j < this.tokens.length; j++) {
          if (this.tokens[j].k === 'S') depth++;
          else if (this.tokens[j].k === 'E') {
            depth--;
            if (depth === 0) return j + 1;
          }
        }
        return this.tokens.length;
      }
      if (t.k === 'lp' || t.k === 'fn') {
        for (let j = i; j < this.tokens.length; j++) {
          const k = this.tokens[j].k;
          if (k === 'lp' || k === 'fn') depth++;
          else if (k === 'rp') {
            depth--;
            if (depth === 0) return j + 1;
          }
        }
        return this.tokens.length;
      }
      if (t.k === 'd') {
        let j = i;
        while (j < this.tokens.length && this.tokens[j].k === 'd') j++;
        return j;
      }
      return i + 1;
    }

    del() {
      if (this.screen === 'result') {
        // 결과 화면의 DEL: 식을 불러와서 편집 상태로
        this.recallExpr(true);
        return;
      }
      if (this.cur === 0) return;
      const t = this.tokens[this.cur - 1];
      if (t.k === 'E') {
        this.cur--; // 구조 안으로 들어감
        return;
      }
      if (t.k === 'M' || t.k === 'S') {
        const open = this.structOpenAt(this.cur - 1);
        if (this.structEmpty(open)) {
          const close = this.structCloseAt(open);
          this.tokens.splice(open, close - open + 1);
          this.cur = open;
        } else {
          this.cur--;
        }
        return;
      }
      this.tokens.splice(this.cur - 1, 1);
      this.cur--;
    }
    structOpenAt(i) {
      // i 위치의 S 또는 M이 속한 구조의 S 위치
      let depth = 0;
      for (let j = i; j >= 0; j--) {
        const k = this.tokens[j].k;
        if (k === 'E') depth++;
        else if (k === 'S') {
          if (depth === 0) return j;
          depth--;
        }
      }
      return 0;
    }
    structCloseAt(open) {
      let depth = 0;
      for (let j = open; j < this.tokens.length; j++) {
        if (this.tokens[j].k === 'S') depth++;
        else if (this.tokens[j].k === 'E') {
          depth--;
          if (depth === 0) return j;
        }
      }
      return this.tokens.length - 1;
    }
    structEmpty(open) {
      const close = this.structCloseAt(open);
      for (let j = open + 1; j < close; j++) if (this.tokens[j].k !== 'M') return false;
      return true;
    }
    toggleIns() {
      if (this.io === 'LineIO') this.overwrite = !this.overwrite;
      else this.wrapNext = true;
    }

    ac() {
      if (this.mode === 'TABLE' && this.screen === 'input' && this.table.stage === 'fx' && !this.tokens.length) return;
      this.tokens = [];
      this.cur = 0;
      this.leaveResult();
      this.wrapNext = false;
      this.overwrite = false;
      if (this.mode === 'TABLE') this.table.stage = 'fx';
    }

    horizontal(id) {
      if (this.screen === 'result') {
        this.recallExpr(id === 'LEFT');
        return;
      }
      const len = this.tokens.length;
      if (id === 'LEFT') this.cur = this.cur > 0 ? this.cur - 1 : len;
      else this.cur = this.cur < len ? this.cur + 1 : 0;
      this.wrapNext = this.wrapNext && true;
    }

    // 결과 화면에서 식을 다시 불러와 편집(재생)
    recallExpr(toEnd) {
      const entry = this.shownEntry();
      if (!entry) return;
      this.tokens = entry.tokens.map((t) => ({ ...t }));
      this.cur = toEnd ? this.tokens.length : 0;
      this.leaveResult();
    }

    vertical(id) {
      if (this.screen === 'result') {
        return this.scrollHistory(id === 'UP' ? -1 : 1);
      }
      if (this.moveInStruct(id)) return;
      if (this.io === 'LineIO' && this.tokens.length) {
        this.cur = id === 'UP' ? 0 : this.tokens.length;
        return;
      }
      if (!this.tokens.length && this.mode === 'COMP') this.scrollHistory(-1, true);
    }
    moveInStruct(id) {
      // 커서를 둘러싼 가장 안쪽 구조 찾기
      const stack = [];
      for (let i = 0; i < this.cur; i++) {
        const t = this.tokens[i];
        if (t.k === 'S') stack.push({ i, slot: 0, ms: [] });
        else if (t.k === 'M') {
          const f = stack[stack.length - 1];
          f.slot++;
          f.ms.push(i);
        } else if (t.k === 'E') stack.pop();
      }
      if (!stack.length) return false;
      const f = stack[stack.length - 1];
      const s = this.tokens[f.i].s;
      const n = STRUCT_SLOTS[s];
      const closeIdx = this.structCloseAt(f.i);
      const markers = [];
      for (let j = f.i + 1; j < closeIdx; j++) {
        if (this.tokens[j].k === 'M') {
          // 같은 구조의 표시만(중첩 구조의 표시는 건너뜀)
          if (this.structOpenAt(j) === f.i) markers.push(j);
        }
      }
      if (n > 1 && (s === 'frac' || s === 'mix' || s === 'logb' || s === 'nroot')) {
        if (id === 'DOWN' && f.slot < n - 1) {
          this.cur = markers[f.slot] + 1;
          return true;
        }
        if (id === 'UP' && f.slot > 0) {
          this.cur = markers[f.slot - 1];
          return true;
        }
        return false;
      }
      if (id === 'DOWN' && (s === 'pow' || s === 'e10' || s === 'ee' || s === 'x10')) {
        this.cur = closeIdx + 1;
        return true;
      }
      return false;
    }

    // ───────── 계산 ─────────
    ctx() {
      const self = this;
      return {
        setup: this.setup,
        pair: null,
        rand: () => self.rand(),
        getVar: (name) => self.mem[name],
        setVar: (name, v) => {
          self.mem[name] = v;
        },
        statValue: (name) => self.statValue(name),
        estimate: (name, v) => self.statEstimate(name, v),
      };
    }

    equals(sh) {
      // 멀티스테이트먼트 진행: 결과 화면에서 = → 다음 문장
      if (this.screen === 'result') {
        if (this.multi && this.multi.next < this.multi.stmts.length) return this.runStatement(this.multi.next, sh);
        return;
      }
      if (this.mode === 'TABLE' && this.table.stage === 'fx') return this.tableFxDone();
      if (!this.tokens.length) return;
      let tree;
      try {
        tree = E.toTree(this.tokens);
      } catch (e) {
        return this.fail(new CalcError('Syntax', this.tokens.length));
      }
      this.multi = { stmts: E.splitStatements(tree), next: 0, tree };
      this.runStatement(0, sh);
    }

    runStatement(i, forceDec) {
      let items = this.multi.stmts[i];
      const stoNames = [];
      while (items.length && E.isTok(items[items.length - 1], 'sto')) {
        stoNames.unshift(items[items.length - 1].t.v);
        items = items.slice(0, -1);
      }
      const cx = this.ctx();
      let v;
      try {
        v = E.evalItems(items, cx);
        stoNames.forEach((nm) => {
          this.mem[nm] = deepV(v);
        });
      } catch (e) {
        if (e instanceof CalcError) return this.fail(e);
        throw e;
      }
      this.mem.Ans = v;
      const tokensOfStmt = this.stmtTokens(i);
      const first = items[0];
      const pair = cx.pair && first && first.t && first.t.k === 'fn' && (first.t.v === 'Pol' || first.t.v === 'Rec') ? cx.pair : null;
      if (pair) this.mem.Ans = pair.vals[0];
      this.res = {
        v,
        pair,
        fracInput: tokensOfStmt.some((t) => (t.k === 'S' && (t.s === 'frac' || t.s === 'mix')) || t.k === 'fsep'),
        dms: tokensOfStmt.some((t) => t.k === 'dms'),
        forceDec: !!forceDec,
        stmt: i,
      };
      this.multi.next = i + 1;
      this.screen = 'result';
      this.histPos = -1;
      this.toggle = false;
      this.eng = null;
      this.mixedToggle = false;
      this.dmsView = this.res.dms && this.dmsEligible(tokensOfStmt);
      this.factView = false;
      if (this.mode === 'COMP' && this.multi.next >= this.multi.stmts.length) this.pushHistory();
    }
    // 60진수 입력이 들어간 식은 +, −, ×, ÷만 있으면 결과도 60진수로 표시
    dmsEligible(toks) {
      return toks.every((t) => t.k === 'd' || t.k === 'dms' || (t.k === 'op' && /[+\-*/]/.test(t.v)));
    }
    stmtTokens(i) {
      // i번째 문장에 해당하는 토큰들(콜론 기준)
      const out = [];
      let idx = 0;
      let depth = 0;
      this.tokens.forEach((t) => {
        if (t.k === 'S') depth++;
        if (t.k === 'E') depth--;
        if (t.k === 'colon' && depth === 0) idx++;
        else if (idx === i) out.push(t);
      });
      return out;
    }
    pushHistory() {
      this.hist.push({ tokens: this.tokens.map((t) => ({ ...t })), res: this.res });
      let bytes = 0;
      for (let i = this.hist.length - 1; i >= 0; i--) {
        bytes += this.hist[i].tokens.length;
        if (bytes > 200) {
          this.hist.splice(0, i);
          break;
        }
      }
    }
    scrollHistory(dir, fromInput) {
      if (!this.hist.length) return;
      let pos = this.histPos;
      if (pos === -1) {
        if (dir > 0) return;
        pos = this.hist.length - (this.screen === 'result' ? 2 : 1);
        if (pos < 0) return;
      } else {
        pos += dir;
        if (pos < 0) return;
        if (pos >= this.hist.length) {
          // 최신 결과로 돌아감
          this.histPos = -1;
          return;
        }
      }
      if (fromInput) {
        this.screen = 'result';
        this.res = this.hist[pos].res;
      }
      this.histPos = pos;
    }
    shownEntry() {
      if (this.histPos >= 0 && this.hist[this.histPos]) return this.hist[this.histPos];
      if (this.screen === 'result' && this.res) return { tokens: this.tokens, res: this.res };
      return null;
    }
    fail(err) {
      this.screen = 'error';
      this.err = { kind: err.kind, pos: err.pos === undefined ? this.tokens.length : err.pos };
      this.multi = null;
    }
    errorKey(id) {
      if (id === 'AC') {
        this.tokens = [];
        this.cur = 0;
        this.err = null;
        this.screen = 'input';
        this.multi = null;
        if (this.mode === 'TABLE') this.table.stage = 'fx';
        return;
      }
      if (id === 'LEFT' || id === 'RIGHT') {
        this.screen = 'input';
        this.cur = Math.max(0, Math.min(this.tokens.length, this.err.pos));
        this.err = null;
        this.multi = null;
      }
    }

    // 결과를 변수/메모리에 저장하거나 가감
    currentValue() {
      if (this.screen === 'result' && this.res) return this.res.v;
      if (!this.tokens.length) return this.mem.Ans;
      this.equals(false);
      return this.screen === 'result' && this.res ? this.res.v : null;
    }
    memAdd(sign) {
      const v = this.currentValue();
      if (!v) return;
      try {
        this.mem.M = sign > 0 ? E.vAdd(this.mem.M, v) : E.vSub(this.mem.M, v);
      } catch (e) {
        if (e instanceof CalcError) return this.fail(e);
        throw e;
      }
      if (this.screen !== 'result') {
        this.res = { v, pair: null, fracInput: false, dms: false, forceDec: false, stmt: 0 };
        this.screen = 'result';
      }
      this.mem.Ans = v;
    }
    varKey(id, sh, al) {
      const name = VARS[id];
      const kind = this.pending;
      this.pending = null;
      if (!name) return;
      if (kind === 'STO') {
        // 설명서: "3+5 SHIFT STO A" → 식 뒤에 →A 가 붙고 = 를 눌러야 저장된다
        if (this.screen === 'result') {
          this.tokens = [{ k: 'ans' }];
          this.cur = 1;
          this.leaveResult();
        } else if (!this.tokens.length) {
          this.tokens = [{ k: 'ans' }];
          this.cur = 1;
        }
        this.insert({ k: 'sto', v: name });
        return;
      }
      // RCL: 변수의 값을 식에 넣는다
      if (this.screen === 'result') {
        this.tokens = [];
        this.cur = 0;
        this.leaveResult();
      }
      const v = this.mem[name];
      this.insert({ k: 'val', v: deepV(v), label: this.plainDecimal(v.f) });
    }

    factorize() {
      const r = this.res;
      if (!r || r.pair) return this.fail(new CalcError('Math'));
      const n = E.vInteger(r.v);
      if (n === null || n <= 0n || n.toString().length > 10) return this.fail(new CalcError('Math'));
      this.factView = !this.factView;
    }

    // ───────── 메뉴 ─────────
    openMenu(id) {
      this.menu = { id, page: 0 };
      this.screen = 'menu';
    }
    openSetup() {
      this.menu = { id: 'setup', page: 0 };
      this.screen = 'menu';
    }
    openStatMenu() {
      this.menu = { id: this.stat.type === '1-VAR' ? 'stat1' : 'stat2', page: 0 };
      this.screen = 'menu';
    }
    closeMenu() {
      this.menu = null;
      this.screen = this.mode === 'STAT' && this.statEditing ? 'statedit' : 'input';
      if (this.mode === 'STAT' && this.statEditing) this.screen = 'statedit';
    }

    menuKey(id) {
      const m = this.menu;
      if (id === 'AC') return this.closeMenu();
      if (id === 'UP' || id === 'DOWN') {
        if (m.id === 'setup') m.page = id === 'DOWN' ? 1 : 0;
        return;
      }
      if (!/^[0-9]$/.test(id)) return;
      const d = Number(id);
      switch (m.id) {
        case 'mode':
          return this.chooseMode(d);
        case 'setup':
          return this.setupChoose(d);
        case 'setup-mthio':
          if (d === 1 || d === 2) this.setSetup({ io: d === 1 ? 'MathO' : 'LineO' });
          return;
        case 'setup-norm':
          if (d === 1 || d === 2) this.setSetup({ fmt: 'norm', n: d });
          return;
        case 'setup-stat':
          if (d === 1 || d === 2) this.setSetup({ stat: d === 1 });
          return;
        case 'setup-disp':
          if (d === 1 || d === 2) this.setSetup({ dot: d === 1 ? 'Dot' : 'Comma' });
          return;
        case 'hyp': {
          const names = ['sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh'];
          if (d >= 1 && d <= 6) this.menuInsert({ k: 'fn', v: names[d - 1] });
          return;
        }
        case 'drg': {
          const u = ['deg', 'rad', 'gra'];
          if (d >= 1 && d <= 3) this.menuInsert({ k: 'post', v: u[d - 1] });
          return;
        }
        case 'clr':
          if (d >= 1 && d <= 3) {
            this.confirm = d;
            this.screen = 'confirm';
            this.menu = null;
          }
          return;
        case 'stat-type':
          if (d >= 1 && d <= 8) this.setStatType(G.cstat.TYPES[d - 1].id);
          return;
        case 'stat1':
        case 'stat2':
          return this.statMenuChoose(d);
        case 'stat-sum1':
          return this.statInsert(['sumx2', 'sumx'][d - 1]);
        case 'stat-sum2':
          return this.statInsert(['sumx2', 'sumx', 'sumy2', 'sumy', 'sumxy', 'sumx3', 'sumx2y', 'sumx4'][d - 1]);
        case 'stat-var1':
          return this.statInsert(['n', 'xbar', 'sxp', 'sxs'][d - 1]);
        case 'stat-var2':
          return this.statInsert(['n', 'xbar', 'sxp', 'sxs', 'ybar', 'syp', 'sys'][d - 1]);
        case 'stat-reg': {
          const quad = this.stat.type === '_+CX2';
          const list = quad ? ['regA', 'regB', 'regC', 'xhat1', 'xhat2', 'yhat'] : ['regA', 'regB', 'regr', 'xhat', 'yhat'];
          return this.statInsert(list[d - 1]);
        }
        case 'stat-mm1':
          return this.statInsert(['minX', 'maxX'][d - 1]);
        case 'stat-mm2':
          return this.statInsert(['minX', 'maxX', 'minY', 'maxY'][d - 1]);
        case 'stat-edit':
          return this.statEditChoose(d);
        default:
      }
    }
    menuInsert(tok) {
      this.menu = null;
      this.screen = 'input';
      if (!tok) return;
      if (this.res) this.leaveResult();
      this.insert(tok);
    }
    chooseMode(d) {
      if (d < 1 || d > 3) return;
      const mode = ['COMP', 'STAT', 'TABLE'][d - 1];
      this.menu = null;
      this.screen = 'input';
      if (mode === this.mode && mode !== 'STAT') {
        this.clearScreen(false);
        return;
      }
      this.mode = mode;
      this.clearScreen(true);
      this.statEditing = false;
      if (mode === 'STAT') {
        this.stat = { type: this.stat.type, rows: [{ x: null, y: null, f: null }], sel: { r: 0, c: 0 }, top: 0 };
        this.menu = { id: 'stat-type', page: 0 };
        this.screen = 'menu';
      } else if (mode === 'TABLE') {
        this.table.stage = 'fx';
        this.table.fx = [];
      }
    }
    setupChoose(d) {
      const m = this.menu;
      if (m.page === 0) {
        switch (d) {
          case 1:
            this.menu = { id: 'setup-mthio', page: 0 };
            return;
          case 2:
            return this.setSetup({ io: 'LineIO' });
          case 3:
          case 4:
          case 5:
            return this.setSetup({ angle: ['Deg', 'Rad', 'Gra'][d - 3] });
          case 6:
          case 7:
            this.prompt = { kind: d === 6 ? 'fix' : 'sci' };
            this.screen = 'prompt';
            this.menu = null;
            return;
          case 8:
            this.menu = { id: 'setup-norm', page: 0 };
            return;
          default:
            return;
        }
      }
      switch (d) {
        case 1:
          return this.setSetup({ frac: 'ab/c' });
        case 2:
          return this.setSetup({ frac: 'd/c' });
        case 3:
          this.menu = { id: 'setup-stat', page: 0 };
          return;
        case 4:
          this.menu = { id: 'setup-disp', page: 0 };
          return;
        case 5:
          this.screen = 'contrast';
          this.menu = null;
          return;
        default:
      }
    }
    setSetup(patch) {
      const before = JSON.stringify(this.setup);
      const ioChanged = patch.io !== undefined && patch.io !== this.setup.io;
      Object.assign(this.setup, patch);
      this.menu = null;
      this.screen = 'input';
      // 표기 형식을 바꾸면 이력과 입력식이 지워진다(설명서). 통계 형식 변경은 통계 데이터도 지운다.
      if (ioChanged) {
        this.hist = [];
        this.tokens = [];
        this.cur = 0;
        this.leaveResult();
        if (this.mode === 'TABLE') this.table.fx = [];
      }
      if (patch.stat !== undefined && this.mode === 'STAT') this.stat.rows = [{ x: null, y: null, f: null }];
      if (this.screen === 'input' && this.res) this.leaveResult();
      void before;
    }
    promptKey(id) {
      if (id === 'AC') {
        this.screen = 'input';
        this.prompt = null;
        return;
      }
      if (/^[0-9]$/.test(id)) {
        const n = Number(id);
        this.setSetup({ fmt: this.prompt.kind, n });
        this.prompt = null;
      }
    }
    contrastKey(id) {
      if (id === 'LEFT') this.contrast = Math.max(-5, this.contrast - 1);
      else if (id === 'RIGHT') this.contrast = Math.min(5, this.contrast + 1);
      else if (id === 'AC' || id === '=') this.screen = 'input';
    }
    confirmKey(id) {
      if (id === 'AC') {
        this.screen = 'input';
        return;
      }
      if (id !== '=') return;
      const c = this.confirm;
      this.screen = 'input';
      if (c === 1 || c === 3) this.resetSetup();
      if (c === 2 || c === 3) this.resetMemory();
      if (c === 3) {
        this.stat = { type: '1-VAR', rows: [{ x: null, y: null, f: null }], sel: { r: 0, c: 0 }, top: 0 };
        this.table = { fx: [], start: E.vInt(1), end: E.vInt(5), step: E.vInt(1), rows: [], sel: 0, stage: 'fx' };
      }
    }

    // ───────── STAT ─────────
    get twoVar() {
      return G.cstat.TYPES.find((t) => t.id === this.stat.type).two;
    }
    setStatType(type) {
      const wasTwo = this.twoVar;
      this.stat.type = type;
      const isTwo = this.twoVar;
      if (wasTwo !== isTwo || !this.stat.rows.length) this.stat.rows = [{ x: null, y: null, f: null }];
      this.stat.sel = { r: 0, c: 0 };
      this.stat.top = 0;
      this.menu = null;
      this.statEditing = true;
      this.screen = 'statedit';
      this.tokens = [];
      this.cur = 0;
    }
    statColumns() {
      const cols = ['x'];
      if (this.twoVar) cols.push('y');
      if (this.setup.stat) cols.push('f');
      return cols;
    }
    statMenuChoose(d) {
      const two = this.menu.id === 'stat2';
      switch (d) {
        case 1:
          this.menu = { id: 'stat-type', page: 0 };
          return;
        case 2:
          this.statEditing = true;
          this.menu = null;
          this.screen = 'statedit';
          this.tokens = [];
          this.cur = 0;
          return;
        case 3:
          this.menu = { id: two ? 'stat-sum2' : 'stat-sum1', page: 0 };
          return;
        case 4:
          this.menu = { id: two ? 'stat-var2' : 'stat-var1', page: 0 };
          return;
        case 5:
          this.menu = { id: two ? 'stat-reg' : 'stat-mm1', page: 0 };
          return;
        case 6:
          if (two) this.menu = { id: 'stat-mm2', page: 0 };
          return;
        default:
      }
    }
    statInsert(name) {
      if (!name) return;
      this.menu = null;
      this.screen = 'input';
      this.statEditing = false;
      if (this.res) this.leaveResult();
      this.insert({ k: 'stat', v: name });
    }
    statResult() {
      return G.cstat.compute(this.stat.type, this.stat.rows);
    }
    statValue(name) {
      const r = this.statResult();
      if (!r) throw E.mathErr();
      const map = { regA: 'A', regB: 'B', regC: 'C', regr: 'r' };
      let x;
      if (map[name]) {
        if (!r.reg) throw E.mathErr();
        x = r.reg[map[name]];
      } else x = r[name];
      if (x === undefined || !isFinite(x)) throw E.mathErr();
      return E.vF(x);
    }
    statEstimate(name, v) {
      const r = this.statResult();
      if (!r || !r.reg) throw E.mathErr();
      const x = G.cstat.estimate(this.stat.type, r.reg, name, v.f);
      if (!isFinite(x)) throw E.mathErr();
      return E.vF(x);
    }
    statCell(r, c) {
      const row = this.stat.rows[r];
      return row ? row[c] : null;
    }
    statEditKey(id, sh, al) {
      const cols = this.statColumns();
      const st = this.stat;
      const rowsMax = this.twoVar ? (this.setup.stat ? 26 : 40) : this.setup.stat ? 40 : 80;
      if (id === 'MODE') return sh ? this.openSetup() : this.openMenu('mode');
      if (sh && id === '9') return this.openMenu('clr');
      if (sh && id === '1') {
        this.menu = { id: 'stat-edit-top', page: 0 };
        this.menu = { id: 'stat-edit', page: 0 };
        this.screen = 'menu';
        return;
      }
      if (id === 'AC') {
        // 입력 중이면 입력 취소, 아니면 계산 화면으로
        if (this.tokens.length) {
          this.tokens = [];
          this.cur = 0;
          return;
        }
        this.statEditing = false;
        this.screen = 'input';
        return;
      }
      const moveTo = (r, c) => {
        st.sel = { r: Math.max(0, Math.min(st.rows.length - 1, r)), c: Math.max(0, Math.min(cols.length - 1, c)) };
        st.top = Math.max(0, Math.min(st.sel.r, Math.max(st.top, st.sel.r - 2)));
        if (st.sel.r < st.top) st.top = st.sel.r;
        this.tokens = [];
        this.cur = 0;
      };
      if (id === 'UP') return moveTo(st.sel.r - 1, st.sel.c);
      if (id === 'DOWN') return moveTo(st.sel.r + 1, st.sel.c);
      if (id === 'LEFT') return this.tokens.length ? this.horizontal('LEFT') : moveTo(st.sel.r, st.sel.c - 1);
      if (id === 'RIGHT') return this.tokens.length ? this.horizontal('RIGHT') : moveTo(st.sel.r, st.sel.c + 1);
      if (id === 'DEL' && !this.tokens.length) {
        if (st.rows.length > 1 || st.rows[0].x !== null) {
          st.rows.splice(st.sel.r, 1);
          if (!st.rows.length) st.rows.push({ x: null, y: null, f: null });
          moveTo(Math.min(st.sel.r, st.rows.length - 1), st.sel.c);
        }
        return;
      }
      if (id === '=') {
        const col = cols[st.sel.c];
        if (!this.tokens.length) {
          // 값 없이 =: 아래 칸으로
          return moveTo(st.sel.r + 1, st.sel.c);
        }
        let v;
        try {
          v = E.evalItems(E.toTree(this.tokens), this.ctx());
        } catch (e) {
          if (e instanceof CalcError) return this.fail(e);
          throw e;
        }
        while (st.rows.length <= st.sel.r) st.rows.push({ x: null, y: null, f: null });
        st.rows[st.sel.r][col] = v.f;
        if (col === 'x' && this.setup.stat === false) st.rows[st.sel.r].f = null;
        // 새 행 추가
        if (st.sel.r === st.rows.length - 1 && st.rows.length < rowsMax) st.rows.push({ x: null, y: null, f: null });
        return moveTo(st.sel.r + 1, st.sel.c);
      }
      // 값 입력용 편집
      const line = true;
      const act = this.action(id, sh, al, line);
      if (!act || act.menu) return;
      if (act.struct) return;
      this.insert(act.tok);
    }
    statEditChoose(d) {
      const st = this.stat;
      this.menu = null;
      this.screen = 'statedit';
      if (d === 1) {
        st.rows.splice(st.sel.r, 0, { x: null, y: null, f: null });
      } else if (d === 2) {
        st.rows = [{ x: null, y: null, f: null }];
        st.sel = { r: 0, c: 0 };
        st.top = 0;
      }
    }

    // ───────── TABLE ─────────
    tableFxDone() {
      if (!this.tokens.length) return;
      this.table.fx = this.tokens.map((t) => ({ ...t }));
      this.table.stage = 'start';
      this.dialogFresh = true;
      this.tokens = this.valueTokens(this.table.start);
      this.cur = this.tokens.length;
    }
    valueTokens(v) {
      const s = this.plainDecimal(v.f).replace('−', '-');
      const toks = [];
      s.split('').forEach((c) => {
        if (c === '-') toks.push({ k: 'neg' });
        else if (/[0-9.]/.test(c)) toks.push({ k: 'd', v: c });
      });
      return toks;
    }
    tableDialogKey(id, sh, al) {
      const t = this.table;
      if (id === 'AC') {
        t.stage = 'fx';
        this.tokens = t.fx.map((x) => ({ ...x }));
        this.cur = this.tokens.length;
        return;
      }
      if (id === 'MODE') return sh ? this.openSetup() : this.openMenu('mode');
      if (id === 'LEFT') return this.horizontal('LEFT');
      if (id === 'RIGHT') return this.horizontal('RIGHT');
      if (id === 'DEL') return this.del();
      if (id === '=') {
        let v;
        try {
          v = E.evalItems(E.toTree(this.tokens), this.ctx());
        } catch (e) {
          if (e instanceof CalcError) return this.fail(e);
          throw e;
        }
        if (t.stage === 'start') {
          t.start = v;
          t.stage = 'end';
          this.dialogFresh = true;
          this.tokens = this.valueTokens(t.end);
        } else if (t.stage === 'end') {
          t.end = v;
          t.stage = 'step';
          this.dialogFresh = true;
          this.tokens = this.valueTokens(t.step);
        } else {
          t.step = v;
          return this.buildTable();
        }
        this.cur = this.tokens.length;
        return;
      }
      const act = this.action(id, sh, al, true);
      if (!act || act.menu || act.struct) return;
      if (this.dialogFresh) {
        this.tokens = [];
        this.cur = 0;
        this.dialogFresh = false;
      }
      this.insert(act.tok);
    }
    buildTable() {
      const t = this.table;
      const start = t.start.f;
      const end = t.end.f;
      const step = t.step.f;
      if (!(end > start) || !(step > 0)) return this.fail(new CalcError('Argument', this.tokens.length));
      const count = Math.floor((end - start) / step + 1e-9) + 1;
      if (count > 30) return this.fail(new CalcError('Insufficient MEM', this.tokens.length));
      const rows = [];
      const savedX = this.mem.X;
      const items = E.toTree(t.fx);
      for (let i = 0; i < count; i++) {
        const x = E.vF(E.r15(start + i * step));
        this.mem.X = x;
        let fv = null;
        try {
          fv = E.evalItems(items, this.ctx());
        } catch (e) {
          if (!(e instanceof CalcError)) throw e;
        }
        rows.push({ x, fx: fv });
      }
      void savedX;
      t.rows = rows;
      t.sel = 0;
      t.col = 0;
      t.stage = 'table';
      this.screen = 'table';
      this.tokens = [];
      this.cur = 0;
    }
    tableKey(id, sh, al) {
      const t = this.table;
      if (id === 'MODE') return sh ? this.openSetup() : this.openMenu('mode');
      if (id === 'AC') {
        t.stage = 'fx';
        this.screen = 'input';
        this.tokens = t.fx.map((x) => ({ ...x }));
        this.cur = this.tokens.length;
        return;
      }
      if (id === 'UP') t.sel = Math.max(0, t.sel - 1);
      else if (id === 'DOWN') t.sel = Math.min(t.rows.length - 1, t.sel + 1);
      else if (id === 'LEFT') t.col = 0;
      else if (id === 'RIGHT') t.col = 1;
    }

    // ───────── 숫자 → 문자열/노드 ─────────
    plainDecimal(x) {
      const p = F.decimalParts(x, { fmt: 'norm', n: 1, dot: 'Dot' }, null);
      return p.exp === null ? p.s.replace('-', '−') : p.s.replace('-', '−') + '×10^' + p.exp;
    }
    decNodes(x, engK) {
      return F.decimalNodes(x, this.setup, engK === undefined ? null : engK);
    }

    // 60진수(°′″) 표시
    dmsNodes(x) {
      const neg = x < 0;
      let a = Math.abs(x);
      let deg = Math.floor(a + 1e-12);
      let rest = (a - deg) * 60;
      let min = Math.floor(rest + 1e-10);
      let sec = Math.round((rest - min) * 60 * 100) / 100;
      if (sec >= 60) {
        sec -= 60;
        min += 1;
      }
      if (min >= 60) {
        min -= 60;
        deg += 1;
      }
      const secS = String(sec);
      return [tx((neg ? '−' : '') + deg + '°' + min + '′' + secS + '″')];
    }

    factorNodes(n) {
      let m = Number(n);
      const parts = [];
      for (let p = 2; p <= 999 && p * p <= m; p++) {
        if (m % p === 0) {
          let c = 0;
          while (m % p === 0) {
            m /= p;
            c++;
          }
          parts.push([p, c]);
        }
      }
      let rem = null;
      if (m > 1) {
        if (m < 1000 || (parts.length && m <= 999)) parts.push([m, 1]);
        else rem = m;
      }
      // 999 이하 소수 인수를 다 뺀 뒤 남은 수: 나머지를 괄호로
      const out = [];
      parts.forEach((pc, i) => {
        if (i) out.push(tx('×'));
        out.push(tx(String(pc[0])));
        if (pc[1] > 1) out.push(sup([tx(String(pc[1]))]));
      });
      if (rem !== null) {
        if (out.length) out.push(tx('×'));
        out.push(tx('(' + rem + ')'));
      }
      return out;
    }

    // 값 하나를 현재 설정으로 표시
    valueNodes(v, res) {
      if (this.factView) return this.factorNodes(E.vInteger(v));
      if (this.eng !== null) return this.decNodes(v.f, this.eng);
      if (this.dmsView) return this.dmsNodes(v.f);
      const math = this.io === 'MathO';
      const linear = !math;
      let exact = null;
      if (v.ex) {
        const setup = this.mixedToggle ? { ...this.setup, frac: this.setup.frac === 'ab/c' ? 'd/c' : 'ab/c' } : this.setup;
        exact = F.exactNodes(v.ex, setup, linear);
      }
      let base;
      if (math) base = !v.dec && !res.forceDec;
      else base = !!res.fracInput && !v.dec && !res.forceDec;
      const useExact = !!exact && (this.toggle ? !base : base);
      if (useExact) return exact;
      return this.decNodes(v.f);
    }

    resultNodes(entry) {
      const res = entry.res;
      if (res.pair) {
        const out = [];
        res.pair.vals.forEach((v, i) => {
          if (i) out.push(tx(this.setup.dot === 'Comma' ? ';' : ','));
          out.push(tx(res.pair.labels[i] + '='));
          out.push(...this.valueNodes(v, res));
        });
        return out;
      }
      return this.valueNodes(res.v, res);
    }

    // ───────── 입력식 → 표시 노드 ─────────
    tokenNodes(t, ctx) {
      switch (t.k) {
        case 'd':
          return [tx(t.v === '.' ? (this.setup.dot === 'Comma' ? '.' : '.') : t.v)];
        case 'op':
          return [tx({ '+': '+', '-': '−', '*': '×', '/': '÷', nPr: 'P', nCr: 'C' }[t.v])];
        case 'neg':
          return [tx('−')];
        case 'lp':
          return [tx('(')];
        case 'rp':
          return [tx(')')];
        case 'fn': {
          const nm = FN_NAME[t.v];
          const out = [tx(nm[0])];
          if (nm[1]) out.push(sup([tx(nm[1])]));
          out.push(tx(t.v === 'sqrt' || t.v === 'cbrt' || t.v === 'pow10' || t.v === 'powe' ? '(' : '('));
          return out;
        }
        case 'comma':
          return [tx(this.setup.dot === 'Comma' ? ';' : ',')];
        case 'colon':
          return [tx(':')];
        case 'sto':
          return [tx('→' + t.v)];
        case 'c':
          return [tx(t.v === 'pi' ? 'π' : 'e')];
        case 'var':
          return [tx(t.v)];
        case 'ans':
          return [tx('Ans')];
        case 'ran':
          return [tx('Ran#')];
        case 'post':
          switch (t.v) {
            case 'x2':
              return [sup([tx('2')])];
            case 'x3':
              return [sup([tx('3')])];
            case 'xinv':
              return [sup([tx('−1')])];
            case 'fact':
              return [tx('!')];
            case 'pct':
              return [tx('%')];
            case 'deg':
              return [tx('°')];
            case 'rad':
              return [sup([tx('r')])];
            default:
              return [sup([tx('g')])];
          }
        case 'dms': {
          const sym = ['°', '′', '″'][ctx.dms % 3];
          ctx.dms++;
          return [tx(sym)];
        }
        case 'fsep':
          return [tx('⌟')];
        case 'stat':
          return [tx(STAT_NAME[t.v])];
        case 'val':
          return [tx(t.label)];
        case 'powl':
          return [tx('^(')];
        case 'nrootl':
          return [tx('ˣ√(')];
        case 'x10l':
          return [tx('×10^')];
        default:
          return [];
      }
    }

    layout(tokens, cur) {
      const tree = E.toTree(tokens);
      return this.layoutSlot(tree, 0, tokens.length, cur);
    }
    layoutSlot(items, start, end, cur) {
      const nodes = [];
      const ctx = { dms: 0 };
      items.forEach((it) => {
        if (it.i === cur) nodes.push({ t: 'cur' });
        if (it.s) nodes.push(...this.structNodes(it, cur));
        else {
          if (it.t.k !== 'd' && it.t.k !== 'dms') ctx.dms = 0;
          nodes.push(...this.tokenNodes(it.t, ctx));
        }
      });
      if (cur === end) nodes.push({ t: 'cur' });
      if (!nodes.length) return [{ t: 'box' }];
      return nodes;
    }
    structNodes(it, cur) {
      const n = it.slots.length;
      const slot = (k) => {
        const start = k === 0 ? it.i0 + 1 : it.markers[k - 1] + 1;
        const end = k < n - 1 ? it.markers[k] : it.iE;
        return this.layoutSlot(it.slots[k], start, end, cur);
      };
      switch (it.s) {
        case 'frac':
          return [{ t: 'frac', n: slot(0), d: slot(1) }];
        case 'mix':
          return [{ t: 'mix', w: slot(0), n: slot(1), d: slot(2) }];
        case 'sqrt':
          return [{ t: 'sqrt', b: slot(0) }];
        case 'cbrt':
          return [{ t: 'sqrt', idx: [tx('3')], b: slot(0) }];
        case 'nroot':
          return [{ t: 'sqrt', idx: slot(0), b: slot(1) }];
        case 'abs':
          return [{ t: 'abs', b: slot(0) }];
        case 'pow':
          return [sup(slot(0))];
        case 'e10':
          return [tx('10'), sup(slot(0))];
        case 'ee':
          return [tx('e'), sup(slot(0))];
        case 'x10':
          return [tx('×10'), sup(slot(0))];
        case 'logb':
          return [tx('log'), { t: 'sub', b: slot(0) }, tx('('), ...slot(1), tx(')')];
        default:
          return [];
      }
    }

    // ───────── 화면 ─────────
    indicators() {
      const io = this.io;
      return {
        shift: this.shift,
        alpha: this.alpha,
        M: !E.isZero(this.mem.M),
        STO: this.pending === 'STO',
        RCL: this.pending === 'RCL',
        STAT: this.mode === 'STAT',
        ang: { Deg: 'D', Rad: 'R', Gra: 'G' }[this.setup.angle],
        FIX: this.setup.fmt === 'fix',
        SCI: this.setup.fmt === 'sci',
        math: io !== 'LineIO',
        up: this.screen === 'result' && this.hist.length > 0 && this.histPos !== 0 && (this.histPos > 0 || this.hist.length > 1),
        down: this.histPos >= 0,
        disp: this.screen === 'result' && !!this.multi && this.multi.next < this.multi.stmts.length,
      };
    }

    menuLines() {
      const m = this.menu;
      const S = G.cstat.TYPES;
      switch (m.id) {
        case 'mode':
          return ['1:COMP 2:STAT', '3:TABLE'];
        case 'setup':
          return m.page === 0 ? ['1:MthIO 2:LineIO', '3:Deg 4:Rad', '5:Gra 6:Fix', '7:Sci 8:Norm'] : ['1:ab/c 2:d/c', '3:STAT 4:Disp', '5:◀CONT▶'];
        case 'setup-mthio':
          return ['1:MathO', '2:LineO'];
        case 'setup-norm':
          return ['1:Norm1', '2:Norm2'];
        case 'setup-stat':
          return ['1:ON', '2:OFF'];
        case 'setup-disp':
          return ['1:Dot', '2:Comma'];
        case 'hyp':
          return ['1:sinh 2:cosh', '3:tanh 4:sinh⁻¹', '5:cosh⁻¹ 6:tanh⁻¹'];
        case 'drg':
          return ['1:° 2:ʳ 3:ᵍ'];
        case 'clr':
          return ['1:Setup 2:Memory', '3:All'];
        case 'stat-type':
          return [`1:${S[0].label} 2:${S[1].label}`, `3:${S[2].label} 4:${S[3].label}`, `5:${S[4].label} 6:${S[5].label}`, `7:${S[6].label} 8:${S[7].label}`];
        case 'stat1':
          return ['1:Type 2:Data', '3:Sum 4:Var', '5:MinMax'];
        case 'stat2':
          return ['1:Type 2:Data', '3:Sum 4:Var', '5:Reg 6:MinMax'];
        case 'stat-edit':
          return ['1:Ins 2:Del-A'];
        case 'stat-sum1':
          return ['1:Σx² 2:Σx'];
        case 'stat-sum2':
          return ['1:Σx² 2:Σx', '3:Σy² 4:Σy', '5:Σxy 6:Σx³', '7:Σx²y 8:Σx⁴'];
        case 'stat-var1':
          return ['1:n 2:x̄', '3:σx 4:sx'];
        case 'stat-var2':
          return ['1:n 2:x̄', '3:σx 4:sx', '5:ȳ 6:σy', '7:sy'];
        case 'stat-reg':
          return this.stat.type === '_+CX2' ? ['1:A 2:B', '3:C 4:x̂₁', '5:x̂₂ 6:ŷ'] : ['1:A 2:B', '3:r 4:x̂', '5:ŷ'];
        case 'stat-mm1':
          return ['1:minX 2:maxX'];
        case 'stat-mm2':
          return ['1:minX 2:maxX', '3:minY 4:maxY'];
        default:
          return [];
      }
    }

    view() {
      const ind = this.indicators();
      if (this.off) return { kind: 'off', ind: {}, lines: [] };
      switch (this.screen) {
        case 'menu':
          return { kind: 'text', ind, lines: this.menuLines(), arrow: this.menu.id === 'setup' ? (this.menu.page === 0 ? 'down' : 'up') : null };
        case 'error': {
          const k = this.err.kind;
          return { kind: 'text', ind, lines: [k === 'Insufficient MEM' ? 'Insufficient MEM Error' : k + ' ERROR', '', '[AC] :Cancel', '[◀][▶]:Goto'], error: true };
        }
        case 'confirm': {
          const name = ['Setup', 'Memory', 'All'][this.confirm - 1];
          return { kind: 'text', ind, lines: [name + ':Reset?', '', '[=]:Yes', '[AC]:Cancel'] };
        }
        case 'prompt':
          return { kind: 'text', ind, lines: [(this.prompt.kind === 'fix' ? 'Fix' : 'Sci') + ' 0~9', '', '', ''] };
        case 'contrast':
          return { kind: 'text', ind, lines: ['CONTRAST', '', 'LIGHT      DARK', ' [◀]       [▶]'] };
        case 'statedit':
          return this.statView(ind);
        case 'table':
          return this.tableView(ind);
        default:
      }
      if (this.mode === 'TABLE' && this.table.stage !== 'fx') {
        const label = { start: 'Start?', end: 'End?', step: 'Step?' }[this.table.stage];
        return { kind: 'expr', ind, upper: [tx(label)], lower: [], input: this.layout(this.tokens, this.cur), dialog: true };
      }
      const prefix = this.mode === 'TABLE' ? [tx('f(X)=')] : [];
      if (this.screen === 'result') {
        const entry = this.shownEntry();
        if (entry) {
          return { kind: 'expr', ind, upper: prefix.concat(this.layout(entry.tokens, -1)), lower: this.resultNodes(entry) };
        }
      }
      return { kind: 'expr', ind, upper: prefix.concat(this.layout(this.tokens, this.cur)), lower: [] };
    }

    statView(ind) {
      const st = this.stat;
      const cols = this.statColumns();
      const rows = [];
      for (let i = st.top; i < Math.min(st.rows.length, st.top + 3); i++) {
        rows.push({ n: i + 1, cells: cols.map((c) => (st.rows[i][c] === null || st.rows[i][c] === undefined ? '' : this.plainDecimal(st.rows[i][c]))) });
      }
      const editText = this.tokens.length ? F.flat(this.layout(this.tokens, this.cur)) : null;
      const cur = st.rows[st.sel.r] ? st.rows[st.sel.r][cols[st.sel.c]] : null;
      return {
        kind: 'grid',
        ind,
        head: cols.map((c) => ({ x: 'X', y: 'Y', f: 'FREQ' }[c])),
        rows,
        sel: { r: st.sel.r - st.top, c: st.sel.c },
        value: editText !== null ? editText : cur === null || cur === undefined ? '0' : this.plainDecimal(cur),
        editing: !!this.tokens.length,
      };
    }
    tableView(ind) {
      const t = this.table;
      const top = Math.max(0, Math.min(t.sel - 2, t.rows.length - 3));
      const start = Math.max(0, Math.min(t.sel, top + 2) - 2);
      const view = t.rows.slice(start, start + 3);
      const fmt = (v) => (v ? this.plainDecimal(v.f) : '');
      const sel = t.rows[t.sel];
      return {
        kind: 'grid',
        ind,
        head: ['X', 'F(X)'],
        rows: view.map((r, i) => ({ n: start + i + 1, cells: [fmt(r.x), fmt(r.fx)] })),
        sel: { r: t.sel - start, c: t.col || 0 },
        value: sel ? ((t.col || 0) === 0 ? fmt(sel.x) : fmt(sel.fx)) : '',
        table: true,
      };
    }

    // 테스트용 평문 화면
    text() {
      const v = this.view();
      if (v.kind === 'text') return v.lines.join(' | ');
      if (v.kind === 'grid') return v.rows.map((r) => r.n + ':' + r.cells.join(',')).join(' | ') + ' @' + v.value;
      if (v.kind === 'off') return '(off)';
      const up = F.flat(v.upper).replace(/‸/g, '');
      const lo = F.flat(v.lower);
      return v.dialog ? up + ' ' + F.flat(v.input).replace(/‸/g, '') : up + (lo ? ' => ' + lo : '');
    }
    result() {
      const v = this.view();
      return v.kind === 'expr' ? F.flat(v.lower) : '';
    }

    // ───────── 저장·복원(설정과 메모리) ─────────
    serialize() {
      const sv = (v) => ({ f: v.f, dec: v.dec, ex: v.ex ? exToJson(v.ex) : null });
      const mem = {};
      Object.keys(this.mem).forEach((k) => (mem[k] = sv(this.mem[k])));
      return { setup: this.setup, mem, contrast: this.contrast };
    }
    restore(o) {
      try {
        if (o.setup) Object.assign(this.setup, o.setup);
        if (o.mem) Object.keys(o.mem).forEach((k) => (this.mem[k] = { f: o.mem[k].f, dec: o.mem[k].dec, ex: o.mem[k].ex ? exFromJson(o.mem[k].ex) : null }));
        if (typeof o.contrast === 'number') this.contrast = o.contrast;
      } catch (e) {
        /* 저장본이 깨졌으면 기본값 유지 */
      }
    }
  }

  const qJ = (q) => [q.n.toString(), q.d.toString()];
  const qF = (a) => N.Q(BigInt(a[0]), BigInt(a[1]));
  function exToJson(ex) {
    const r = {};
    Object.keys(ex.r).forEach((k) => (r[k] = qJ(ex.r[k])));
    return { q: qJ(ex.q), r, p: qJ(ex.p) };
  }
  function exFromJson(o) {
    const r = {};
    Object.keys(o.r).forEach((k) => (r[k] = qF(o.r[k])));
    return N.mk(qF(o.q), r, qF(o.p));
  }

  G.Calc = Calc;
})(globalThis.GISA);
