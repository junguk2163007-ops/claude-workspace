// 화면. 상태가 바뀌면 현재 탭을 통째로 다시 그린다(작은 앱이라 이게 제일 단순하고 안전함).
(function (G) {
  'use strict';
  const P = G.progress;
  // 과목 → 그룹 순서(개념 데이터에 나온 순서 그대로)
  function groupsOf(subjectId) {
    const out = [];
    G.concepts.forEach((c) => {
      if ((subjectId === 'all' || c.subject === subjectId) && !out.some((g) => g.subject === c.subject && g.name === c.group))
        out.push({ subject: c.subject, name: c.group });
    });
    return out;
  }
  const subjectName = (id) => (G.subjects.find((s) => s.id === id) || {}).short || id;
  const NUMS = ['1', '2', '3', '4'];

  let S = G.store.load();
  const view = {
    tab: 'practice',
    q: null,
    answered: false,
    chosen: -1,
    hint: 0,
    analogy: false,
    event: null,
    unlocked: [],
    mode: 'normal', // normal | review | basics
    reviewQueue: [],
    basics: null, // { focus, from }
    backupOut: '',
    msg: {},
    resetArmed: false,
    lessonId: null,
    exampleKey: null,
    quiz: null,
  };

  // ───────── 도우미 ─────────
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach((x) => append(el, x));
    el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  const pct = (c, n) => (n ? Math.round((100 * c) / n) + '%' : '–');
  const concept = (id) => G.conceptMap[id];
  const save = () => G.store.save(S);

  let toastTimer = null;
  function toast(text) {
    let t = document.getElementById('toast');
    if (!t) {
      t = h('div', { id: 'toast', class: 'toast', role: 'status' });
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }

  function applyTheme() {
    const t = S.settings.theme || 'system';
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  // ───────── 문제 고르기 ─────────
  function inSubject(c) {
    const s = S.settings.subject;
    return s === 'all' || c.subject === s;
  }
  function subjectReady() {
    const s = S.settings.subject;
    return s === 'all' || (G.subjects.find((x) => x.id === s) || {}).ready;
  }
  function openConcepts() {
    return G.concepts.filter((c) => inSubject(c) && P.isUnlocked(S, c.id)).map((c) => c.id);
  }
  function unlockedSet() {
    return G.concepts.filter((c) => P.isUnlocked(S, c.id)).map((c) => c.id);
  }

  function makeQuestion(cid) {
    const seed = G.rng.newSeed();
    const tpls = G.templatesFor(cid);
    const st = G.staticFor(cid);
    if (S.settings.mixStatic && st.length && Math.random() < 0.2) {
      return G.buildStatic(st[Math.floor(Math.random() * st.length)].id, seed);
    }
    return G.generate(tpls[Math.floor(Math.random() * tpls.length)].id, seed);
  }

  function resetCard() {
    view.answered = false;
    view.chosen = -1;
    view.hint = 0;
    view.analogy = false;
    view.event = null;
    view.unlocked = [];
  }

  function nextQuestion() {
    resetCard();
    if (view.mode === 'review') {
      while (view.reviewQueue.length) {
        const key = view.reviewQueue.shift();
        try {
          view.q = G.fromKey(key);
          return;
        } catch (e) {
          delete S.reviews[key]; // 예전 버전에서 사라진 문제
          save();
        }
      }
      view.mode = 'normal';
      toast('오늘 복습 끝! 잘했어.');
    }
    let cid = null;
    if (view.mode === 'basics' && view.basics) cid = view.basics.focus;
    else if (S.settings.focus !== 'auto' && concept(S.settings.focus) && P.isUnlocked(S, S.settings.focus) && inSubject(concept(S.settings.focus)))
      cid = S.settings.focus;
    else {
      const ids = openConcepts();
      if (ids.length) cid = P.pickConcept(S, ids);
    }
    view.q = cid ? makeQuestion(cid) : null;
  }

  function loadKey(key) {
    resetCard();
    view.q = G.fromKey(key);
    view.mode = 'normal';
  }

  function answer(i) {
    if (view.answered || !view.q) return;
    const before = unlockedSet();
    view.answered = true;
    view.chosen = i;
    const ok = view.q.choices[i].correct;
    view.event = P.record(S, view.q, ok);
    const after = unlockedSet();
    view.unlocked = after.filter((id) => before.indexOf(id) === -1);
    save();
    render();
    const v = document.querySelector('.verdict');
    if (v && v.scrollIntoView) v.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function goTab(tab) {
    if (tab === 'learn' && view.tab === 'learn') view.lessonId = null;
    view.tab = tab;
    view.resetArmed = false;
    render();
    window.scrollTo(0, 0);
  }

  // ───────── 상단 바 ─────────
  function renderBar() {
    const due = P.dueReviews(S).length;
    const tabs = [
      ['learn', '배우기'],
      ['practice', '연습'],
      ['review', '복습'],
      ['stats', '기록'],
      ['settings', '설정'],
    ];
    const bar = document.getElementById('bar');
    bar.textContent = '';
    bar.appendChild(
      h(
        'div',
        { class: 'wrap' },
        h(
          'div',
          { class: 'brand' },
          h('span', { html: '<svg viewBox="0 0 30 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M2 9c3.5-9 6.5-9 10 0s6.5 9 10 0 4-6 6-6"/></svg>', 'aria-hidden': 'true' }),
          h('span', null, '전기기사 필기 ', h('small', null, '연습장')),
          h('span', { class: 'streak', title: '현재 연속 정답' }, '연속 ' + S.streak.cur)
        ),
        h(
          'nav',
          { class: 'tabs', role: 'tablist' },
          tabs.map(([id, label]) =>
            h(
              'button',
              { class: 'tab', role: 'tab', 'aria-selected': String(view.tab === id), onclick: () => goTab(id), id: 'tab-' + id },
              label,
              id === 'review' && due ? h('span', { class: 'badge' }, due) : null
            )
          )
        )
      )
    );
  }

  // ───────── 연습 탭 ─────────
  function subjectChips() {
    const all = [{ id: 'all', short: '전체', ready: true }].concat(G.subjects);
    return h(
      'div',
      { class: 'chips', role: 'group', 'aria-label': '과목' },
      all.map((s) =>
        h(
          'button',
          {
            class: 'chip',
            'aria-pressed': String(S.settings.subject === s.id),
            onclick: () => {
              S.settings.subject = s.id;
              S.settings.focus = 'auto';
              view.mode = 'normal';
              view.reviewQueue = [];
              save();
              nextQuestion();
              render();
            },
          },
          s.short,
          s.ready ? null : h('span', { class: 'soon' }, s.id === 'code' ? '나중에' : '준비 중')
        )
      )
    );
  }

  function conceptPicker() {
    const sel = h('select', {
      id: 'concept-select',
      onchange: (e) => {
        S.settings.focus = e.target.value;
        if (view.mode === 'basics') view.mode = 'normal';
        save();
        nextQuestion();
        render();
      },
    });
    sel.appendChild(h('option', { value: 'auto' }, '자동 (열린 개념 골고루)'));
    groupsOf(S.settings.subject).forEach((g) => {
      const list = G.concepts.filter((c) => c.subject === g.subject && c.group === g.name);
      if (!list.length) return;
      const og = h('optgroup', { label: S.settings.subject === 'all' ? subjectName(g.subject) + ' · ' + g.name : g.name });
      list.forEach((c) => {
        const open = P.isUnlocked(S, c.id);
        og.appendChild(h('option', { value: c.id, disabled: !open }, c.name + (open ? '' : ' (잠김)')));
      });
      sel.appendChild(og);
    });
    sel.value = S.settings.focus;
    if (sel.value !== S.settings.focus) sel.value = 'auto';
    return h('div', { class: 'picker' }, h('label', { for: 'concept-select' }, '개념'), sel);
  }

  function modeBanner() {
    if (view.mode === 'review') {
      return h(
        'div',
        { class: 'banner' },
        '복습 중 · 남은 문제 ' + view.reviewQueue.length + '개',
        h('button', { class: 'btn small', onclick: () => { view.mode = 'normal'; view.reviewQueue = []; nextQuestion(); render(); } }, '복습 그만하기')
      );
    }
    if (view.mode === 'basics' && view.basics) {
      return h(
        'div',
        { class: 'banner' },
        '기초 다지는 중: ' + concept(view.basics.focus).name + ' (' + concept(view.basics.from).name + '에서 내려옴)',
        h('button', { class: 'btn small', onclick: () => { view.mode = 'normal'; S.settings.focus = view.basics.from; view.basics = null; save(); nextQuestion(); render(); } }, '원래 개념으로')
      );
    }
    return null;
  }

  function hintsBlock(q) {
    if (view.answered) return null;
    const body = [];
    if (view.hint >= 1) body.push(h('div', { class: 'hint-body' }, h('span', { class: 'eyebrow' }, '힌트 1 · 개념 카드'), h('p', null, q.hints.card)));
    if (view.hint >= 2) body.push(h('div', { class: 'hint-body' }, h('span', { class: 'eyebrow' }, '힌트 2 · 쓸 공식'), h('p', { class: 'formula' }, q.hints.formula)));
    return h(
      'div',
      { class: 'hints' },
      h(
        'div',
        { class: 'hint-row' },
        h('button', { class: 'btn small soft', id: 'hint1', disabled: view.hint >= 1, onclick: () => { view.hint = 1; render(); } }, '힌트 1 · 개념 카드'),
        h('button', { class: 'btn small soft', id: 'hint2', disabled: view.hint !== 1, onclick: () => { view.hint = 2; render(); } }, '힌트 2 · 쓸 공식')
      ),
      body
    );
  }

  function choiceList(q) {
    return h(
      'ol',
      { class: 'choices' },
      q.choices.map((c, i) => {
        let cls = 'choice';
        if (view.answered) {
          if (c.correct) cls += ' is-correct';
          else if (i === view.chosen) cls += ' is-wrong';
          else cls += ' is-dim';
        }
        return h(
          'li',
          null,
          h(
            'button',
            { class: cls, disabled: view.answered, onclick: () => answer(i), 'data-i': i },
            h('span', { class: 'no' }, NUMS[i]),
            h('span', { class: 'lab' }, c.label)
          )
        );
      })
    );
  }

  function reviewNote() {
    const e = view.event;
    if (e === 'added') return '틀린 문제라 같은 숫자 그대로 내일 복습 목록에 넣었어. (1일 → 3일 → 7일)';
    if (e === 'reset') return '복습 문제를 다시 틀려서 내일부터 다시 시작해.';
    if (e === 'advanced') return '복습 통과! 다음 복습 날짜: ' + (S.reviews[view.q.key] || {}).due;
    if (e === 'graduated') return '복습 3단계를 모두 통과해서 이 문제는 졸업했어.';
    return null;
  }

  function explainBlock(q) {
    const chosen = q.choices[view.chosen];
    const ok = chosen.correct;
    const ex = q.explain;
    const c = concept(q.conceptId);
    const cards = [];
    cards.push(
      h(
        'div',
        { class: 'verdict ' + (ok ? 'ok' : 'bad'), role: 'status' },
        ok ? '정답!' : '아쉽다, 오답이야',
        h('small', null, ok ? '연속 정답 ' + S.streak.cur + '개째' : '정답은 ' + NUMS[q.answerIndex] + '번 · ' + q.choices[q.answerIndex].label)
      )
    );
    const steps = ex.steps.map((s) => (s.indexOf('검산: ') === 0 ? h('li', { class: 'check' }, s) : h('li', null, s)));
    cards.push(
      h(
        'div',
        { class: 'explain' },
        h('section', { class: 'ex' }, h('h3', null, h('span', { class: 'n' }, '1'), '한 줄 결론'), h('p', { class: 'lead' }, ex.conclusion)),
        h(
          'section',
          { class: 'ex' },
          h('h3', null, h('span', { class: 'n' }, '2'), '개념 카드 · ' + c.name),
          h('p', null, ex.card),
          view.analogy
            ? h('p', { class: 'analogy' }, ex.analogy)
            : h('div', null, h('button', { class: 'btn small soft', id: 'easier', onclick: () => { view.analogy = true; render(); } }, '더 쉽게 설명'))
        ),
        h('section', { class: 'ex' }, h('h3', null, h('span', { class: 'n' }, '3'), '풀이'), h('ol', null, steps)),
        h('section', { class: 'ex' }, h('h3', null, h('span', { class: 'n' }, '4'), '함정 · 기억할 점'), h('ul', null, ex.traps.map((t) => h('li', null, t)))),
        h(
          'section',
          { class: 'ex' },
          h('h3', null, '보기별 해설'),
          h(
            'ul',
            { class: 'per-choice' },
            q.choices.map((ch, i) =>
              h(
                'li',
                null,
                h('span', { class: 'pc-mark ' + (ch.correct ? 'ok' : 'bad') }, NUMS[i] + ' ' + (ch.correct ? '정답' : '오답')),
                h('span', { class: 'pc-label' }, ch.label, i === view.chosen ? h('span', { class: 'mine' }, '내 선택') : null),
                h('span', { class: 'pc-why' }, ch.why)
              )
            )
          )
        )
      )
    );
    const notes = [];
    const rn = reviewNote();
    if (rn) notes.push(h('p', { class: 'note' }, rn));
    if (view.unlocked.length) notes.push(h('p', { class: 'note' }, '새 개념이 열렸어: ' + view.unlocked.map((id) => concept(id).name).join(', ')));
    cards.push(notes);
    const actions = [
      h('button', { class: 'btn primary', id: 'next', onclick: () => { nextQuestion(); render(); window.scrollTo(0, 0); } }, '다음 문제'),
      h('button', { class: 'btn', id: 'retry', onclick: () => { loadKey(q.key); render(); window.scrollTo(0, 0); } }, '같은 문제 다시'),
    ];
    if (!ok) {
      c.prereqs.forEach((pid) =>
        actions.push(
          h(
            'button',
            {
              class: 'btn soft',
              onclick: () => {
                view.mode = 'basics';
                view.basics = { focus: pid, from: c.id };
                nextQuestion();
                render();
                window.scrollTo(0, 0);
              },
            },
            '기초로 내려가기: ' + concept(pid).name
          )
        )
      );
    }
    cards.push(h('div', { class: 'actions' }, actions));
    return cards;
  }

  function questionCard() {
    if (!subjectReady()) {
      const s = G.subjects.find((x) => x.id === S.settings.subject);
      return h(
        'div',
        { class: 'empty' },
        h('strong', null, s.name),
        h('p', null, s.id === 'code' ? '전기설비기술기준은 최신 기준을 확인한 뒤에 따로 추가할 거야.' : '이 과목은 다음 단계에서 채울 예정이야. 지금은 회로이론 및 제어공학을 풀 수 있어.'),
        h('button', { class: 'btn', onclick: () => { S.settings.subject = 'circuit'; save(); nextQuestion(); render(); } }, '회로·제어로 가기')
      );
    }
    const q = view.q;
    if (!q) return h('div', { class: 'empty' }, '풀 수 있는 개념이 없어. 설정에서 "순서 건너뛰기"를 켜 봐.');
    const c = concept(q.conceptId);
    const isReview = !!S.reviews[q.key] && view.mode === 'review';
    return h(
      'article',
      { class: 'qcard', 'aria-live': 'polite' },
      h(
        'div',
        { class: 'qmeta' },
        h('span', { class: 'tag' }, c.name),
        h('span', { class: 'tag plain' }, c.group + (q.source === 'static' ? ' · 이론형' : '')),
        isReview ? h('span', { class: 'tag review' }, '복습') : null,
        h('span', { class: 'qid', title: '문제 번호 (설정에서 다시 불러올 수 있어)' }, q.key)
      ),
      h('p', { class: 'qtext' }, q.text),
      q.svg ? h('div', { class: 'figure', html: q.svg }) : null,
      hintsBlock(q),
      choiceList(q),
      G.aiTutor ? G.aiTutor.panel(q, () => ({ answered: view.answered, chosen: view.chosen })) : null,
      view.answered ? explainBlock(q) : null
    );
  }

  // 잠긴 개념이 있으면 몇 개가 열렸는지와 "전부 열기"를 연습 화면에서 바로 보여 준다
  function lockBar() {
    if (S.settings.skipOrder || !subjectReady()) return null;
    const list = G.concepts.filter(inSubject);
    const open = list.filter((c) => P.isUnlocked(S, c.id)).length;
    if (open === list.length) return null;
    return h(
      'div',
      { class: 'lockbar' },
      h('span', null, h('strong', null, '열린 개념 ' + open + '/' + list.length), ' · 선행 개념을 ' + P.UNLOCK_MIN_ATTEMPTS + '문제 이상, 정답률 ' + P.UNLOCK_MIN_RATE * 100 + '% 이상 맞히면 다음 개념이 열려.'),
      h('span', { class: 'lockbar-btns' },
        h('button', { class: 'btn small', onclick: () => goTab('learn') }, '배우기'),
        h('button', { class: 'btn small soft', id: 'open-all', onclick: () => { S.settings.skipOrder = true; save(); toast('모든 개념을 열었어. 설정에서 다시 끌 수 있어.'); render(); } }, '전부 열기')
      )
    );
  }

  function renderPractice(root) {
    root.appendChild(h('div', { class: 'panel' }, subjectChips(), lockBar(), subjectReady() && view.mode !== 'review' ? conceptPicker() : null));
    const b = modeBanner();
    if (b) root.appendChild(b);
    root.appendChild(questionCard());
  }

  // ───────── 배우기 탭 ─────────
  function lessonIndex(id) {
    return G.lessons.findIndex((l) => l.id === id);
  }
  function firstUnread() {
    return G.lessons.find((l) => !S.lessons[l.id]) || null;
  }
  function openLesson(id) {
    const l = G.lessonMap[id];
    view.lessonId = id;
    view.exampleKey = l && l.example ? 't:' + l.example.replace('#', '#') : null;
    view.quiz = null;
    view.tab = 'learn';
    render();
    window.scrollTo(0, 0);
  }
  function finishLesson(l) {
    P.markLessonRead(S, l.id);
    save();
  }
  function newQuiz(cid) {
    const tpls = G.templatesFor(cid);
    const t = tpls[Math.floor(Math.random() * tpls.length)];
    view.quiz = { q: G.generate(t.id, G.rng.newSeed()), chosen: -1 };
  }

  function renderLearnList(root) {
    const done = G.lessons.filter((l) => S.lessons[l.id]).length;
    const next = firstUnread();
    root.appendChild(
      h(
        'div',
        { class: 'panel' },
        h('h2', null, '배우기'),
        h('p', { class: 'muted small' }, '아무것도 모르는 상태에서 시작해서 한 단계씩 나아가는 순서야. 읽고 → 예제를 따라가고 → 확인 문제를 풀어. 레슨을 읽으면 그 개념의 문제도 열려.'),
        h(
          'div',
          { class: 'tile progress-tile' },
          h('div', { class: 'stat-line' }, h('span', null, '읽은 레슨'), h('span', null, done + ' / ' + G.lessons.length)),
          h('div', { class: 'bar' }, h('i', { style: 'width:' + Math.round((100 * done) / G.lessons.length) + '%' })),
          h('button', { class: 'btn primary', id: 'continue-lesson', onclick: () => openLesson((next || G.lessons[0]).id) }, next ? (done ? '이어서 읽기: ' : '처음부터 시작: ') + next.title : '처음부터 다시 보기')
        )
      )
    );
    G.lessonParts.forEach((part) => {
      root.appendChild(h('h3', { class: 'group-title eyebrow' }, part));
      root.appendChild(
        h(
          'div',
          { class: 'rows' },
          G.lessons
            .filter((l) => l.part === part)
            .map((l) => {
              const read = !!S.lessons[l.id];
              const c = l.concept ? concept(l.concept) : null;
              const st = c ? P.conceptStat(S, c.id) : null;
              const open = c ? P.isUnlocked(S, c.id) : true;
              return h(
                'button',
                { class: 'row lesson-row', 'data-lesson': l.id, onclick: () => openLesson(l.id) },
                h(
                  'span',
                  { class: 'row-head' },
                  h('span', { class: 'lesson-no' }, lessonIndex(l.id) + 1),
                  h('span', { class: 'name' }, l.title),
                  h('span', { class: 'right' }, read ? h('span', { class: 'state open' }, '읽음') : null)
                ),
                h('span', { class: 'stat-line' }, h('span', null, l.goal)),
                c
                  ? h('span', { class: 'stat-line' }, h('span', null, open ? '문제 ' + st.n + '개 풀이 · 정답률 ' + pct(st.c, st.n) : '문제 잠김 · 이 레슨을 읽으면 열려'), h('span', null, subjectName(c.subject)))
                  : null
              );
            })
        )
      );
    });
  }

  function exampleBlock(l) {
    if (!view.exampleKey) return null;
    let q;
    try {
      q = G.fromKey(view.exampleKey);
    } catch (e) {
      return null;
    }
    const steps = q.explain.steps.map((s) => (s.indexOf('검산: ') === 0 ? h('li', { class: 'check' }, s) : h('li', null, s)));
    return h(
      'section',
      { class: 'example' },
      h('div', { class: 'example-head' }, h('span', { class: 'eyebrow' }, '예제 풀이'), h('span', { class: 'qid' }, q.key)),
      h('p', { class: 'qtext' }, q.text),
      q.svg ? h('div', { class: 'figure', html: q.svg }) : null,
      h(
        'ol',
        { class: 'choices' },
        q.choices.map((c, i) => h('li', null, h('div', { class: 'choice' + (c.correct ? ' is-correct' : ' is-dim') }, h('span', { class: 'no' }, NUMS[i]), h('span', { class: 'lab' }, c.label))))
      ),
      h('h3', null, '풀이'),
      h('ol', { class: 'steps' }, steps),
      h('p', { class: 'lead' }, '답: ' + q.explain.conclusion),
      h(
        'button',
        {
          class: 'btn soft',
          id: 'another-example',
          onclick: () => {
            view.exampleKey = 't:' + l.example.split('#')[0] + '#' + G.rng.newSeed();
            render();
            const ex = document.querySelector('.example');
            if (ex && ex.scrollIntoView) ex.scrollIntoView({ block: 'start' });
          },
        },
        '다른 숫자로 예제 보기'
      )
    );
  }

  function quizBlock(l) {
    if (!l.concept) return null;
    if (!view.quiz) newQuiz(l.concept);
    const qz = view.quiz;
    const q = qz.q;
    const answered = qz.chosen >= 0;
    const kids = [
      h('div', { class: 'example-head' }, h('span', { class: 'eyebrow' }, '바로 확인'), h('span', { class: 'qid' }, q.key)),
      h('p', { class: 'qtext' }, q.text),
      q.svg ? h('div', { class: 'figure', html: q.svg }) : null,
      h(
        'ol',
        { class: 'choices' },
        q.choices.map((c, i) => {
          let cls = 'choice';
          if (answered) cls += c.correct ? ' is-correct' : i === qz.chosen ? ' is-wrong' : ' is-dim';
          return h(
            'li',
            null,
            h(
              'button',
              {
                class: cls,
                disabled: answered,
                'data-qi': i,
                onclick: () => {
                  qz.chosen = i;
                  P.record(S, q, c.correct);
                  finishLesson(l);
                  render();
                },
              },
              h('span', { class: 'no' }, NUMS[i]),
              h('span', { class: 'lab' }, c.label)
            )
          );
        })
      ),
    ];
    if (answered) {
      const ok = q.choices[qz.chosen].correct;
      kids.push(h('div', { class: 'verdict ' + (ok ? 'ok' : 'bad') }, ok ? '정답!' : '아쉽다, 오답이야', h('small', null, q.choices[qz.chosen].why)));
      if (!ok) kids.push(h('p', { class: 'note' }, '정답 ' + NUMS[q.answerIndex] + '번: ' + q.choices[q.answerIndex].why));
      kids.push(h('p', { class: 'lead' }, q.explain.conclusion));
      kids.push(h('button', { class: 'btn soft', id: 'quiz-next', onclick: () => { newQuiz(l.concept); render(); } }, '확인 문제 하나 더'));
    }
    return h('section', { class: 'example quiz' }, kids);
  }

  function renderLesson(root, l) {
    const idx = lessonIndex(l.id);
    const next = G.lessons[idx + 1] || null;
    const c = l.concept ? concept(l.concept) : null;
    root.appendChild(h('button', { class: 'btn small back', id: 'lesson-back', onclick: () => { view.lessonId = null; render(); window.scrollTo(0, 0); } }, '← 레슨 목록'));
    const art = h(
      'article',
      { class: 'lesson' },
      h('span', { class: 'eyebrow' }, l.part + ' · ' + (idx + 1) + '/' + G.lessons.length),
      h('h2', null, l.title),
      h('p', { class: 'goal' }, '이번 목표: ' + l.goal),
      l.sections.map((sec) =>
        h('section', { class: 'lesson-sec' }, h('h3', null, sec.h), (sec.p || []).map((t) => h('p', null, t)), sec.list ? h('ul', null, sec.list.map((t) => h('li', null, t))) : null)
      ),
      c ? h('div', { class: 'box analogy' }, h('span', { class: 'eyebrow' }, '비유로 보면'), h('p', null, c.analogy)) : null,
      c ? h('div', { class: 'box formula-box' }, h('span', { class: 'eyebrow' }, '핵심 공식'), h('p', { class: 'formula' }, c.formula)) : null,
      h('section', { class: 'lesson-sec' }, h('h3', null, '문제 푸는 순서'), h('ol', { class: 'how' }, l.how.map((t) => h('li', null, t)))),
      exampleBlock(l),
      quizBlock(l),
      h('section', { class: 'lesson-sec' }, h('h3', null, '시험 포인트'), h('ul', null, l.points.concat(c && c.remember ? [c.remember] : []).map((t) => h('li', null, t)))),
      h(
        'div',
        { class: 'actions' },
        next
          ? h('button', { class: 'btn primary', id: 'lesson-next', onclick: () => { finishLesson(l); openLesson(next.id); } }, '다 읽었어 · 다음: ' + next.title)
          : h('button', { class: 'btn primary', id: 'lesson-next', onclick: () => { finishLesson(l); view.lessonId = null; toast('마지막 레슨까지 다 읽었어!'); render(); } }, '다 읽었어 · 목록으로'),
        c
          ? h(
              'button',
              {
                class: 'btn',
                id: 'lesson-practice',
                onclick: () => {
                  finishLesson(l);
                  S.settings.subject = 'all';
                  S.settings.focus = c.id;
                  view.mode = 'normal';
                  save();
                  nextQuestion();
                  goTab('practice');
                },
              },
              '이 개념 문제 풀기'
            )
          : null
      )
    );
    root.appendChild(art);
  }

  function renderLearn(root) {
    const l = view.lessonId ? G.lessonMap[view.lessonId] : null;
    if (l) renderLesson(root, l);
    else renderLearnList(root);
  }

  // ───────── 복습 탭 ─────────
  function renderReview(root) {
    const due = P.dueReviews(S);
    const later = P.upcomingReviews(S);
    const stageName = (s) => ['1차(1일)', '2차(3일)', '3차(7일)'][s] || '';
    root.appendChild(
      h(
        'div',
        { class: 'panel' },
        h('h2', null, '복습'),
        h('p', { class: 'muted small' }, '틀린 문제는 숫자까지 똑같이 1일 → 3일 → 7일 뒤에 다시 나와. 세 번 연속 맞히면 졸업이고, 중간에 틀리면 1일부터 다시 시작해.'),
        h(
          'div',
          { class: 'tiles' },
          h('div', { class: 'tile' }, h('div', { class: 'v' }, due.length), h('div', { class: 'k' }, '오늘 복습할 문제')),
          h('div', { class: 'tile' }, h('div', { class: 'v' }, later.length), h('div', { class: 'k' }, '예정된 복습'))
        ),
        h(
          'button',
          {
            class: 'btn primary',
            id: 'start-review',
            disabled: !due.length,
            onclick: () => {
              view.mode = 'review';
              view.reviewQueue = due.map((r) => r.k);
              nextQuestion();
              goTab('practice');
            },
          },
          due.length ? '복습 시작 (' + due.length + '문제)' : '오늘은 복습할 문제가 없어'
        )
      )
    );
    const list = (title, items) =>
      items.length
        ? [
            h('h3', { class: 'group-title eyebrow' }, title),
            h(
              'div',
              { class: 'rows' },
              items.slice(0, 50).map((r) =>
                h(
                  'div',
                  { class: 'row' },
                  h('div', { class: 'row-head' }, h('span', { class: 'name' }, (concept(r.cid) || { name: r.cid }).name), h('span', { class: 'right muted small' }, r.due)),
                  h('div', { class: 'stat-line' }, h('span', null, r.k), h('span', null, stageName(r.stage)))
                )
              )
            ),
          ]
        : null;
    append(root, list('오늘', due));
    append(root, list('다가오는 복습', later));
  }

  // ───────── 기록 탭 ─────────
  function renderStats(root) {
    const recent = S.history.slice(-30);
    root.appendChild(
      h(
        'div',
        { class: 'panel' },
        h('h2', null, '기록'),
        h(
          'div',
          { class: 'tiles' },
          h('div', { class: 'tile' }, h('div', { class: 'v' }, S.streak.cur), h('div', { class: 'k' }, '현재 연속 정답')),
          h('div', { class: 'tile' }, h('div', { class: 'v' }, S.streak.best), h('div', { class: 'k' }, '최고 연속 정답')),
          h('div', { class: 'tile' }, h('div', { class: 'v' }, S.total.n), h('div', { class: 'k' }, '푼 문제')),
          h('div', { class: 'tile' }, h('div', { class: 'v' }, pct(S.total.c, S.total.n)), h('div', { class: 'k' }, '전체 정답률'))
        ),
        recent.length
          ? h('div', { class: 'panel' }, h('h3', { class: 'eyebrow' }, '최근 ' + recent.length + '문제 (왼쪽이 오래된 것)'), h('div', { class: 'dots', 'aria-label': '최근 결과' }, recent.map((x) => h('i', { class: x.ok ? 'ok' : '', title: x.k }))))
          : h('div', { class: 'empty' }, '아직 푼 문제가 없어. 연습 탭에서 첫 문제를 풀면 여기에 쌓여.')
      )
    );
    root.appendChild(h('h3', { class: 'group-title eyebrow' }, '개념별 정답률'));
    root.appendChild(
      h(
        'div',
        { class: 'rows' },
        G.concepts.map((c) => {
          const st = P.conceptStat(S, c.id);
          const rate = st.n ? st.c / st.n : 0;
          return h(
            'div',
            { class: 'row' },
            h('div', { class: 'row-head' }, h('span', { class: 'name' }, c.name), h('span', { class: 'right muted small' }, subjectName(c.subject) + (P.isUnlocked(S, c.id) ? '' : ' · 잠김'))),
            h('div', { class: 'bar' + (st.n && rate < P.UNLOCK_MIN_RATE ? ' low' : '') }, h('i', { style: 'width:' + Math.round(rate * 100) + '%' })),
            h('div', { class: 'stat-line' }, h('span', null, st.c + ' / ' + st.n + '문제'), h('span', null, pct(st.c, st.n)))
          );
        })
      )
    );
  }

  // ───────── 설정 탭 ─────────
  function renderSettings(root) {
    const m = view.msg;
    const sw = (id, key, title, desc) =>
      h(
        'label',
        { class: 'switch field', for: id },
        h('input', {
          type: 'checkbox',
          id,
          checked: !!S.settings[key],
          onchange: (e) => {
            S.settings[key] = e.target.checked;
            save();
            if (key === 'skipOrder') nextQuestion();
            render();
          },
        }),
        h('span', null, h('strong', null, title), h('br'), h('span', { class: 'muted small' }, desc))
      );
    const themeSel = h(
      'select',
      {
        id: 'theme-select',
        onchange: (e) => {
          S.settings.theme = e.target.value;
          save();
          applyTheme();
        },
      },
      h('option', { value: 'system' }, '기기 설정 따라가기'),
      h('option', { value: 'light' }, '밝게'),
      h('option', { value: 'dark' }, '어둡게')
    );
    themeSel.value = S.settings.theme || 'system';

    root.appendChild(h('h2', null, '설정'));
    if (!G.store.isAvailable())
      root.appendChild(h('div', { class: 'banner' }, '이 브라우저에서는 기록을 저장할 수 없어(개인정보 보호 모드일 수 있어). 새로고침하면 기록이 사라져.'));
    root.appendChild(
      h(
        'div',
        { class: 'rows' },
        sw('skip-order', 'skipOrder', '순서 건너뛰기 (전부 열기)', '선행 개념 조건 없이 모든 개념을 열어.'),
        sw('mix-static', 'mixStatic', '이론형 문제 섞기', '숫자 계산이 아닌 개념 문제도 가끔(약 20%) 섞어서 내.'),
        h('div', { class: 'field' }, h('label', { for: 'theme-select' }, h('strong', null, '화면 테마')), themeSel)
      )
    );

    const keyInput = h('input', { type: 'text', id: 'key-input', placeholder: '예: t:ohm-current#12345', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false' });
    root.appendChild(h('h3', { class: 'group-title eyebrow' }, '문제 번호로 다시 풀기'));
    root.appendChild(
      h(
        'div',
        { class: 'rows' },
        h(
          'div',
          { class: 'field' },
          h('p', { class: 'small muted' }, '문제 카드 오른쪽 위의 번호를 넣으면 숫자까지 똑같은 문제가 다시 나와.'),
          h(
            'div',
            { class: 'inline' },
            keyInput,
            h(
              'button',
              {
                class: 'btn',
                id: 'load-key',
                onclick: () => {
                  try {
                    loadKey(keyInput.value);
                    view.msg = {};
                    goTab('practice');
                  } catch (e) {
                    view.msg = { key: e.message };
                    render();
                  }
                },
              },
              '불러오기'
            )
          ),
          m.key ? h('p', { class: 'msg err' }, m.key) : null
        )
      )
    );

    const pasteBox = h('textarea', { id: 'import-box', placeholder: '백업 코드를 여기에 붙여 넣어' });
    root.appendChild(h('h3', { class: 'group-title eyebrow' }, '기록 백업'));
    root.appendChild(
      h(
        'div',
        { class: 'rows' },
        h(
          'div',
          { class: 'field' },
          h('p', { class: 'small muted' }, '기록은 이 브라우저(localStorage)에만 저장돼. 아이폰과 맥은 따로 저장되니까, 옮기거나 지켜 두고 싶으면 백업 코드를 만들어 메모에 붙여 둬.'),
          h(
            'div',
            { class: 'inline' },
            h('button', { class: 'btn', id: 'make-backup', onclick: () => { view.backupOut = JSON.stringify(S); render(); } }, '백업 코드 만들기'),
            view.backupOut
              ? h(
                  'button',
                  {
                    class: 'btn',
                    onclick: () => {
                      const box = document.getElementById('export-box');
                      const done = () => toast('복사했어');
                      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(view.backupOut).then(done, () => { box.select(); toast('복사가 막혀 있어. 선택된 글을 직접 복사해 줘.'); });
                      else { box.select(); toast('선택된 글을 직접 복사해 줘.'); }
                    },
                  },
                  '복사'
                )
              : null
          ),
          view.backupOut ? h('textarea', { id: 'export-box', readonly: true }, view.backupOut) : null
        ),
        h(
          'div',
          { class: 'field' },
          pasteBox,
          h(
            'button',
            {
              class: 'btn',
              id: 'import-backup',
              onclick: () => {
                try {
                  const data = JSON.parse(pasteBox.value);
                  if (!data || data.v !== 1) throw new Error('형식이 달라');
                  S = P.normalize(data);
                  save();
                  applyTheme();
                  view.msg = { imp: '가져왔어. 푼 문제 ' + S.total.n + '개.' };
                  nextQuestion();
                } catch (e) {
                  view.msg = { impErr: '백업 코드를 읽지 못했어. 처음부터 끝까지 빠짐없이 붙여 넣었는지 확인해 줘.' };
                }
                render();
              },
            },
            '백업 가져오기'
          ),
          m.imp ? h('p', { class: 'msg ok' }, m.imp) : null,
          m.impErr ? h('p', { class: 'msg err' }, m.impErr) : null
        )
      )
    );

    root.appendChild(h('h3', { class: 'group-title eyebrow' }, '초기화'));
    root.appendChild(
      h(
        'div',
        { class: 'rows' },
        h(
          'div',
          { class: 'field' },
          h('p', { class: 'small muted' }, '푼 기록, 정답률, 복습 일정을 모두 지워. 되돌릴 수 없어.'),
          view.resetArmed
            ? h(
                'div',
                { class: 'inline' },
                h(
                  'button',
                  {
                    class: 'btn danger',
                    id: 'reset-confirm',
                    onclick: () => {
                      const theme = S.settings.theme;
                      G.store.clear();
                      S = P.emptyState();
                      S.settings.theme = theme;
                      save();
                      view.resetArmed = false;
                      view.mode = 'normal';
                      nextQuestion();
                      toast('기록을 모두 지웠어');
                      render();
                    },
                  },
                  '정말 지우기'
                ),
                h('button', { class: 'btn', onclick: () => { view.resetArmed = false; render(); } }, '취소')
              )
            : h('button', { class: 'btn', id: 'reset', onclick: () => { view.resetArmed = true; render(); } }, '기록 초기화')
        )
      )
    );
    root.appendChild(h('p', { class: 'muted small' }, '버전 ' + G.version + ' · 문제 템플릿 ' + G.templateList.length + '개 · 이론형 ' + G.staticBank.length + '개 · 모든 문제는 자체 제작'));
  }

  // ───────── 그리기 ─────────
  function render() {
    renderBar();
    const root = document.getElementById('view');
    root.textContent = '';
    const fn = { learn: renderLearn, practice: renderPractice, review: renderReview, stats: renderStats, settings: renderSettings }[view.tab];
    fn(root);
  }

  // 맥 키보드: 1~4 고르기, Enter/N 다음 문제
  document.addEventListener('keydown', (e) => {
    if (view.tab !== 'practice' || !view.q || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!view.answered && /^[1-4]$/.test(e.key)) {
      answer(Number(e.key) - 1);
      e.preventDefault();
    } else if (view.answered && (e.key === 'Enter' || e.key === 'n' || e.key === 'N')) {
      nextQuestion();
      render();
      window.scrollTo(0, 0);
      e.preventDefault();
    }
  });

  function start() {
    if (!S.settings.theme) S.settings.theme = 'system';
    if (S.total.n === 0 && !Object.keys(S.lessons || {}).length) view.tab = 'learn';
    applyTheme();
    nextQuestion();
    render();
    if (G.aiTutor) G.aiTutor.onReady(() => render());
  }

  // 테스트(브라우저 점검)용 진입점
  function _load(key) {
    loadKey(key);
    view.tab = 'practice';
    render();
  }
  G.ui = { start, _view: view, _state: () => S, _load, _answer: answer, _openLesson: openLesson };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(globalThis.GISA);
