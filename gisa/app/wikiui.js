// 용어 사전 화면: 글 속 용어에 밑줄 링크를 걸고, 누르면 나무위키처럼 상세 해설을 보여 준다.
//  - 링크는 render() 뒤에 G.wikiUi.link(root)가 건다. 같은 카드 안에서는 용어마다 첫 번째 한 번만 건다.
//  - 해설 창 안의 용어도 링크라서 계속 타고 들어갈 수 있고, ← 로 돌아온다.
(function (G) {
  'use strict';
  if (typeof document === 'undefined' || !G.glossary) return;

  const GL = G.glossary;
  // 링크를 걸지 않는 자리
  const SKIP = 'a,button,input,textarea,select,option,svg,script,style,h1,h2,h3,h4,.choices,.tabs,.qmeta,.tag,.chip,.eyebrow,.term,.ai-box,.demo,.qid,.syncdot,.streak,.formula,.formula-box,.wiki-formula,.toast,.cele';
  const SCOPE = '.qcard,.point-card,.lesson-sec,.wiki-sec,.panel,.tile,.box,article,section';

  let panel = null;
  let stack = []; // 열어 본 순서: 'term:id' 또는 'index'
  let search = '';

  const h = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  };

  // ───────── 글 속 용어에 링크 걸기 ─────────
  function link(root, exclude) {
    if (!root) return;
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue || n.nodeValue.trim().length < 2) continue;
      const p = n.parentElement;
      if (!p || p.closest(SKIP)) continue;
      nodes.push(n);
    }
    const seen = new Map(); // 카드(범위) → 이미 건 용어
    nodes.forEach((tn) => {
      const scope = tn.parentElement.closest(SCOPE) || root;
      if (!seen.has(scope)) seen.set(scope, exclude ? { [exclude]: true } : {});
      const skip = seen.get(scope);
      const text = tn.nodeValue;
      const hits = GL.find(text, { skip });
      if (!hits.length) return;
      const frag = document.createDocumentFragment();
      let pos = 0;
      hits.forEach((m) => {
        if (skip[m.id]) return; // 같은 글 안에서 앞에서 이미 걸림
        skip[m.id] = true;
        if (m.start > pos) frag.appendChild(document.createTextNode(text.slice(pos, m.start)));
        const a = h('a', 'term', text.slice(m.start, m.end));
        a.setAttribute('role', 'button');
        a.tabIndex = 0;
        a.dataset.term = m.id;
        a.title = GL.byId[m.id].name + ' — ' + GL.byId[m.id].brief;
        frag.appendChild(a);
        pos = m.end;
      });
      if (pos === 0) return;
      if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
      tn.parentNode.replaceChild(frag, tn);
    });
  }

  // ───────── 해설 창 ─────────
  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('aside');
    panel.id = 'wiki';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '용어 사전');
    document.body.appendChild(panel);
    return panel;
  }

  function open(id) {
    if (!GL.byId[id]) return;
    ensurePanel();
    const top = stack[stack.length - 1];
    if (top !== 'term:' + id) stack.push('term:' + id);
    render();
  }
  function openIndex() {
    ensurePanel();
    if (stack[stack.length - 1] !== 'index') stack.push('index');
    render();
    const inp = panel.querySelector('.wiki-search');
    if (inp) inp.focus();
  }
  function close() {
    if (!panel) return;
    stack = [];
    panel.hidden = true;
    document.body.classList.remove('wiki-open-body');
    if (G.calcDemo && G.calcDemo.active() && G.calcDemo.scope() === 'wiki') G.calcDemo.stop();
  }
  function back() {
    if (stack.length <= 1) return close();
    stack.pop();
    render();
  }

  function para(cls, text) {
    const p = h('p', cls);
    p.textContent = text;
    return p;
  }
  function section(title, kids, cls) {
    const s = h('section', 'wiki-sec' + (cls ? ' ' + cls : ''));
    s.appendChild(h('h3', null, title));
    kids.forEach((k) => k && s.appendChild(k));
    return s;
  }
  function list(items) {
    const ul = h('ul', 'wiki-list');
    items.forEach((t) => ul.appendChild(h('li', null, t)));
    return ul;
  }

  function entryBody(t) {
    const body = h('div', 'wiki-body');
    const tags = h('div', 'wiki-tags');
    tags.appendChild(h('span', 'tag', t.group));
    const c = t.concept ? G.concepts.find((x) => x.id === t.concept) : null;
    if (c) tags.appendChild(h('span', 'tag plain', c.name));
    body.appendChild(tags);
    body.appendChild(para('wiki-brief', t.brief));
    if (t.easy.length) body.appendChild(section('쉽게 말하면', t.easy.map((x) => para('', x))));
    if (t.detail.length) body.appendChild(section('조금 더 자세히', t.detail.map((x) => para('', x))));
    if (t.formulas.length) {
      const dl = h('div', 'wiki-formulas');
      t.formulas.forEach(([f, note]) => {
        const row = h('div', 'wiki-formula');
        row.appendChild(h('code', null, f));
        if (note) row.appendChild(h('span', null, note));
        dl.appendChild(row);
      });
      body.appendChild(section('공식', [dl]));
    }
    if (t.units.length) {
      const row = h('div', 'wiki-units');
      t.units.forEach(([sym, name]) => {
        const u = h('span', 'wiki-unit');
        u.append(h('b', null, sym), ' ' + name);
        row.appendChild(u);
      });
      body.appendChild(section('단위', [row]));
    }
    if (t.exam.length) body.appendChild(section('시험에서는', [list(t.exam)]));
    if (t.pitfalls.length) body.appendChild(section('헷갈리지 마', [list(t.pitfalls)], 'warn'));
    if (t.example) {
      const e = t.example;
      const box = h('div', 'wiki-example');
      box.appendChild(para('wiki-q', e.q));
      const ans = h('p', 'wiki-ans');
      ans.append('계산식 ', h('code', null, e.expr.replace(/\*/g, '×').replace(/\//g, '÷')), ' = ', h('b', null, trimNum(e.ans) + (e.unit ? ' ' + e.unit : '')));
      box.appendChild(ans);
      box.appendChild(para('wiki-say', e.say));
      if (G.calcDemo && (document.body.classList.contains('calc-dock') || document.body.classList.contains('calc-float'))) {
        const b = h('button', 'btn small primary', '🖩 계산기로 눌러 보기');
        b.type = 'button';
        b.id = 'wiki-demo';
        b.onclick = () => {
          G.calcDemo.startExample(t.id);
          if (window.innerWidth < 1280) close(); // 가운데 폭이 좁으면 계산기가 보이도록 해설 창을 닫는다
        };
        box.appendChild(b);
      }
      body.appendChild(section('예제', [box]));
    }
    if (t.related.length) {
      const chips = h('div', 'wiki-chips');
      t.related.forEach((r) => {
        const rt = GL.byId[r];
        const b = h('button', 'chip', rt.name);
        b.type = 'button';
        b.dataset.term = r;
        chips.appendChild(b);
      });
      body.appendChild(section('같이 보면 좋은 용어', [chips]));
    }
    // 더 공부하기
    const acts = h('div', 'wiki-actions');
    if (c) {
      const lesson = G.lessonFor ? G.lessonFor(c.id) : null;
      if (lesson && G.ui && G.ui.openLesson) {
        const b = h('button', 'btn small', '레슨 읽기: ' + c.name);
        b.type = 'button';
        b.id = 'wiki-lesson';
        b.onclick = () => {
          close();
          G.ui.openLesson(lesson.id);
        };
        acts.appendChild(b);
      }
      if (G.ui && G.ui.openUnit) {
        const b = h('button', 'btn small soft', '과목별에서 문제 반복');
        b.type = 'button';
        b.id = 'wiki-unit';
        b.onclick = () => {
          close();
          G.ui.openUnit(c.id);
        };
        acts.appendChild(b);
      }
    }
    if (acts.children.length) body.appendChild(section('더 공부하기', [acts]));
    return body;
  }

  function trimNum(x) {
    return String(Number(x.toPrecision(10)));
  }

  function indexBody() {
    const body = h('div', 'wiki-body');
    const inp = h('input', 'wiki-search');
    inp.type = 'search';
    inp.placeholder = '용어 검색 (예: 역률, 임피던스, kWh)';
    inp.value = search;
    inp.setAttribute('aria-label', '용어 검색');
    const results = h('div', 'wiki-results');
    const fill = () => {
      results.textContent = '';
      const found = GL.search(search);
      if (!found.length) {
        results.appendChild(para('muted', '찾는 용어가 없어. 다른 말로 검색해 봐.'));
        return;
      }
      const groups = {};
      found.forEach((t) => (groups[t.group] = groups[t.group] || []).push(t));
      Object.keys(groups).forEach((g) => {
        results.appendChild(h('h3', 'wiki-group', g + ' (' + groups[g].length + ')'));
        groups[g].forEach((t) => {
          const b = h('button', 'wiki-item');
          b.type = 'button';
          b.dataset.term = t.id;
          b.append(h('strong', null, t.name), h('span', null, t.brief));
          results.appendChild(b);
        });
      });
    };
    inp.addEventListener('input', () => {
      search = inp.value;
      fill();
    });
    body.append(inp, results);
    fill();
    return body;
  }

  function render() {
    const cur = stack[stack.length - 1];
    panel.hidden = false;
    document.body.classList.add('wiki-open-body');
    panel.textContent = '';
    const head = h('div', 'wiki-head');
    const bk = h('button', 'btn small', stack.length > 1 ? '← 뒤로' : '닫기');
    bk.type = 'button';
    bk.id = 'wiki-back';
    bk.onclick = back;
    const title = h('strong', 'wiki-title', cur === 'index' ? '용어 사전' : GL.byId[cur.slice(5)].name);
    title.tabIndex = -1;
    const idx = h('button', 'btn small soft', '전체 목록');
    idx.type = 'button';
    idx.id = 'wiki-index';
    idx.onclick = openIndex;
    idx.hidden = cur === 'index';
    const x = h('button', 'btn small', '✕');
    x.type = 'button';
    x.id = 'wiki-close';
    x.setAttribute('aria-label', '용어 사전 닫기');
    x.onclick = close;
    head.append(bk, title, idx, x);
    const body = cur === 'index' ? indexBody() : entryBody(GL.byId[cur.slice(5)]);
    panel.append(head, body);
    link(body, cur === 'index' ? null : cur.slice(5));
    body.scrollTop = 0;
    panel.scrollTop = 0;
    if (cur !== 'index') title.focus({ preventScroll: true });
  }

  // ───────── 클릭·키보드 ─────────
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('[data-term]') : null;
    if (!t) return;
    e.preventDefault();
    open(t.dataset.term);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel && !panel.hidden) {
      close();
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('term')) {
      e.preventDefault();
      open(e.target.dataset.term);
    }
  });

  G.wikiUi = { link, open, openIndex, close, back, isOpen: () => !!panel && !panel.hidden, _stack: () => stack.slice() };
})(globalThis.GISA);
