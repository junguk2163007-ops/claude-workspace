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
    drill: null, // { cid, pid|null } 포인트 반복 중
    unitSubject: 'circuit',
    unitCid: null,
    exSeeds: {},
    exOpen: {},
    scrollMemo: {}, // 읽던 단락·레슨의 스크롤 위치(문제를 풀고 돌아오면 거기로)
  };
  const ptKey = (p) => (p.kind === 'static' ? 's:' + p.ref : p.ref);

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
  // 상단 바의 작은 동기화 표시(☁✓ 동기화됨, ☁… 진행 중, ☁! 문제)
  function paintSyncDot() {
    const dot = document.getElementById('sync-dot');
    if (!dot || !G.sync) return;
    const st = G.sync.status();
    const m = { ok: ['ok', ' ☁✓', '동기화됨'], syncing: ['', ' ☁…', '동기화 중'], error: ['bad', ' ☁!', st.message], readonly: ['bad', ' ☁!', st.message] }[st.state];
    dot.className = 'syncdot ' + (m ? m[0] : '');
    dot.textContent = m ? m[1] : '';
    dot.title = m ? m[2] : '';
  }

  // 기록이 바뀔 때마다: 변경 시각을 남기고(기기 간 합치기 기준), 로컬에 저장하고, 서버 동기화를 예약
  const save = () => {
    S.updatedAt = Math.max(Date.now(), S.updatedAt || 0);
    G.store.save(S);
    if (G.sync) G.sync.schedule();
  };

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
  // 연습에서 고르는 과목. 예전에 "기초 수학"을 골라 둔 기록은 "전체"로 본다.
  const practiceSubject = () => (S.settings.subject === 'base' ? 'all' : S.settings.subject);
  function inSubject(c) {
    const s = practiceSubject();
    return s === 'all' || c.subject === s;
  }
  function subjectReady() {
    const s = practiceSubject();
    return s === 'all' || (G.subjects.find((x) => x.id === s) || {}).ready;
  }
  // 자동으로 뽑는 연습 문제에는 기초 수학 개념을 넣지 않는다(레슨의 "문제 풀기"나 기초로 내려가기로는 여전히 풀 수 있음)
  function openConcepts() {
    return G.concepts.filter((c) => c.subject !== 'base' && inSubject(c) && P.isUnlocked(S, c.id)).map((c) => c.id);
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
    view.calcAsk = false;
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
    if (view.mode === 'drill' && view.drill) {
      const pts = G.pointsFor(view.drill.cid);
      let pt = view.drill.pid ? pts.find((p) => ptKey(p) === view.drill.pid) : null;
      if (!pt && pts.length) {
        const todo = pts.filter((p) => !P.pointMastered(S, ptKey(p)));
        const pool = todo.length ? todo : pts;
        pt = pool[Math.floor(Math.random() * pool.length)];
      }
      if (pt) {
        view.q = G.questionForPoint(pt, G.rng.newSeed());
        return;
      }
      view.mode = 'normal';
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
    const pid = G.pointId ? G.pointId(view.q) : null;
    const wasMastered = pid ? P.pointMastered(S, pid) : false;
    view.event = P.record(S, view.q, ok);
    let masteredName = null;
    if (pid && !wasMastered && P.pointMastered(S, pid)) {
      const pt = G.pointsFor(view.q.conceptId || '').find((p) => ptKey(p) === pid);
      masteredName = pt ? pt.t : '';
    }
    const after = unlockedSet();
    view.unlocked = after.filter((id) => before.indexOf(id) === -1);
    save();
    render();
    const v = document.querySelector('.verdict');
    if (v && v.scrollIntoView) v.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    // 익숙해졌으면 정답 표시 자리에서 작은 폭죽 (움직임 줄이기 설정이면 짧은 알림만)
    if (masteredName !== null && !(G.celebrate && G.celebrate.play('익숙해졌어!', masteredName, v))) toast('이 포인트는 이제 익숙해졌어!');
  }

  // 지금 읽고 있는 단락/레슨의 기억 키(목록 화면이면 null)
  function scrollKey() {
    if (view.tab === 'units' && view.unitCid) return 'unit:' + view.unitCid;
    if (view.tab === 'learn' && view.lessonId) return 'lesson:' + view.lessonId;
    return null;
  }

  function goTab(tab) {
    const leaving = scrollKey();
    if (leaving) view.scrollMemo[leaving] = window.scrollY;
    if (tab === 'learn' && view.tab === 'learn') view.lessonId = null;
    if (tab === 'units' && view.tab === 'units') view.unitCid = null;
    view.tab = tab;
    view.resetArmed = false;
    render();
    const back = scrollKey();
    window.scrollTo(0, (back && view.scrollMemo[back]) || 0);
  }

  // 처음(메인) 화면 = 배우기 첫 화면(검색창이 맨 위에 있음)
  function goHome() {
    if (G.wikiUi && G.wikiUi.isOpen()) G.wikiUi.close();
    view.search = '';
    view.lessonId = null;
    view.unitCid = null;
    view.mode = view.mode === 'review' ? 'normal' : view.mode;
    view.tab = 'learn';
    view.resetArmed = false;
    render();
    window.scrollTo(0, 0);
  }

  // ───────── 상단 바 ─────────
  function renderBar() {
    const due = P.dueReviews(S).length;
    const tabs = [
      ['learn', '배우기'],
      ['units', '과목별'],
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
          h('span', null, '통전', h('span', { class: 'bolt', 'aria-hidden': 'true', html: '<svg viewBox="0 0 10 16" fill="currentColor"><path d="M6.4 0 0.6 9.2h3.6L3 16l6.4-9.4H5.6z"/></svg>' }), '기사 ', h('small', null, '전기기사 필기')),
          h('button', {
            class: 'home-btn',
            id: 'home-btn',
            type: 'button',
            title: '처음 화면으로',
            'aria-label': '처음 화면으로',
            onclick: goHome,
            html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 11 12 3.5 20.5 11"/><path d="M5.5 9.8V20h4.5v-5.5h4V20h4.5V9.8"/></svg>',
          }),
          h('span', { class: 'streak', title: '현재 연속 정답' }, '연속 ' + S.streak.cur, h('span', { class: 'syncdot', id: 'sync-dot' })),
          h('button', {
            class: 'wiki-open',
            id: 'wiki-open',
            type: 'button',
            title: '용어 사전',
            'aria-label': '용어 사전 열기',
            onclick: () => G.wikiUi && G.wikiUi.openIndex(),
            html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2"/><path d="m15.2 15.2 5 5"/><path d="M8 10.5a2.5 2.5 0 0 1 2.5-2.5"/></svg>',
          })
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
    paintSyncDot();
  }

  // ───────── 연습 탭 ─────────
  function subjectChips() {
    const all = [{ id: 'all', short: '전체', ready: true }].concat(G.subjects.filter((x) => x.id !== 'base')); // 기초 수학은 연습 과목에서 뺌(배우기·과목별에는 그대로)
    return h(
      'div',
      { class: 'chips', role: 'group', 'aria-label': '과목' },
      all.map((s) =>
        h(
          'button',
          {
            class: 'chip',
            'aria-pressed': String(practiceSubject() === s.id),
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
    groupsOf(practiceSubject()).forEach((g) => {
      if (g.subject === 'base') return;
      const list = G.concepts.filter((c) => c.subject === g.subject && c.group === g.name);
      if (!list.length) return;
      const og = h('optgroup', { label: practiceSubject() === 'all' ? subjectName(g.subject) + ' · ' + g.name : g.name });
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
    if (view.mode === 'drill' && view.drill) {
      const d = view.drill;
      const pt = d.pid ? G.pointsFor(d.cid).find((p) => ptKey(p) === d.pid) : null;
      const cp = P.conceptPoints(S, d.cid);
      const label = pt
        ? '포인트 반복: ' + pt.t + ' · 연속 정답 ' + P.pointStat(S, d.pid).streak + '/' + P.MASTER_STREAK + (P.pointMastered(S, d.pid) ? ' ✓ 익숙해졌어' : '')
        : '단락 반복: ' + concept(d.cid).name + ' · 익숙한 포인트 ' + cp.mastered + '/' + cp.total;
      return h(
        'div',
        { class: 'banner', id: 'drill-banner' },
        label,
        h('button', { class: 'btn small', id: 'drill-exit', onclick: () => { view.mode = 'normal'; view.drill = null; openUnit(d.cid, true); } }, '단락으로 돌아가기')
      );
    }
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

  // 문제 옆 작은 계산기 버튼: 왼쪽 계산기에서 풀이 키를 한 키씩 눌러 보여 줘(PC)
  function calcButton(q) {
    if (!G.calcPlan || !G.calcDemo || !G.calcPlan(q)) return null;
    const on = G.calcDemo.active() && G.calcDemo.key() === q.key;
    return h(
      'button',
      {
        class: 'calc-btn' + (on ? ' on' : ''),
        id: 'calc-solve',
        type: 'button',
        title: '계산기로 풀기: 왼쪽 계산기에서 키를 누르는 순서를 보여 줘',
        'aria-label': '계산기로 풀기',
        onclick: () => {
          if (on) {
            G.calcDemo.stop();
            render();
            return;
          }
          if (!view.answered) {
            view.calcAsk = !view.calcAsk;
            render();
            return;
          }
          G.calcDemo.start(q);
          render();
        },
        html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><rect x="8" y="5.5" width="8" height="3.5" rx="0.8"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/></svg>',
      }
    );
  }

  // 풀기 전에 풀이를 보려 하면 정답이 드러난다고 한 번 알려 준다
  function calcAsk(q) {
    if (!view.calcAsk || view.answered) return null;
    return h(
      'div',
      { class: 'calc-ask', id: 'calc-ask' },
      h('span', null, '계산기 풀이를 보면 정답이 드러나. 그래도 볼래?'),
      h('button', { class: 'btn small primary', id: 'calc-ask-yes', onclick: () => { view.calcAsk = false; G.calcDemo.start(q); render(); } }, '볼래'),
      h('button', { class: 'btn small', id: 'calc-ask-no', onclick: () => { view.calcAsk = false; render(); } }, '아니, 내가 풀래')
    );
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
      h('button', { class: 'btn', id: 'retry', onclick: () => { resetCard(); view.q = G.fromKey(q.key); render(); window.scrollTo(0, 0); } }, '같은 문제 다시'),
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
    if (view.mode === 'drill' && view.drill && view.drill.pid && P.pointMastered(S, view.drill.pid)) {
      const d = view.drill;
      actions.push(
        h('button', { class: 'btn soft', id: 'drill-back-bottom', onclick: () => { view.mode = 'normal'; view.drill = null; openUnit(d.cid, true); } }, '익숙해졌어! 단락으로 돌아가기')
      );
    }
    cards.push(h('div', { class: 'actions' }, actions));
    return cards;
  }

  function questionCard() {
    if (!subjectReady()) {
      const s = G.subjects.find((x) => x.id === practiceSubject());
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
      h('div', { class: 'qrow' }, h('p', { class: 'qtext' }, q.text), calcButton(q)),
      calcAsk(q),
      q.svg ? h('div', { class: 'figure', html: q.svg }) : null,
      hintsBlock(q),
      choiceList(q),
      G.aiTutor ? G.aiTutor.panel(q, () => ({ answered: view.answered, chosen: view.chosen })) : null,
      view.answered ? explainBlock(q) : null
    );
  }

  // 잠긴 개념이 있으면 몇 개가 열렸는지와 "전부 열기"를 연습 화면에서 바로 보여 준다
  function lockBar() {
    if (S.settings.skipOrder || !subjectReady() || view.mode === 'drill') return null;
    const list = G.concepts.filter((c) => c.subject !== 'base' && inSubject(c));
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
    root.appendChild(h('div', { class: 'panel' }, subjectChips(), lockBar(), subjectReady() && view.mode !== 'review' && view.mode !== 'drill' ? conceptPicker() : null));
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

  // 검색: 용어 해설 · 개념(레슨·단락) · 그 개념의 문제 유형을 한 번에
  function searchPanel(listEl) {
    const box = h('div', { class: 'search-results', id: 'search-results', 'aria-live': 'polite' });
    const input = h('input', {
      class: 'search-input',
      id: 'search-input',
      type: 'search',
      placeholder: '궁금한 개념·용어 검색 (예: 역률, 임피던스, 슬립)',
      'aria-label': '개념·용어 검색',
      autocomplete: 'off',
    });
    input.value = view.search || '';
    input.addEventListener('input', () => {
      view.search = input.value;
      if (listEl) listEl.hidden = !!view.search.trim();
      fillSearch(box);
    });
    fillSearch(box);
    return h('div', { class: 'panel search-panel' }, h('label', { class: 'search-label', for: 'search-input' }, '무엇이 궁금해?'), input, box);
  }

  const snippet = (t, n) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t);

  function fillSearch(box) {
    box.textContent = '';
    const q = (view.search || '').trim();
    if (!q) return;
    const r = G.search(q);
    if (!r.terms.length && !r.concepts.length) {
      box.appendChild(h('p', { class: 'muted small', id: 'search-empty' }, '"' + q + '"에 맞는 게 없어. 다른 말로 검색해 봐. (예: 옴, 전력, 변압기)'));
      return;
    }
    if (r.terms.length) {
      box.appendChild(h('h3', { class: 'group-title eyebrow' }, '용어 해설 ' + r.terms.length));
      r.terms.slice(0, 8).forEach((t) =>
        box.appendChild(h('button', { class: 'wiki-item', type: 'button', 'data-term': t.id }, h('strong', null, t.name), h('span', null, t.brief)))
      );
    }
    if (r.concepts.length) {
      box.appendChild(h('h3', { class: 'group-title eyebrow' }, '개념과 문제 ' + r.concepts.length));
      r.concepts.slice(0, 10).forEach(({ c, points, via }) => {
        const lesson = G.lessonFor(c.id);
        const st = P.conceptStat(S, c.id);
        box.appendChild(
          h(
            'div',
            { class: 'tile search-concept', 'data-concept': c.id },
            h('div', { class: 'row-head' }, h('strong', { class: 'name' }, c.name), h('span', { class: 'tag plain' }, c.group)),
            h('p', { class: 'muted small' }, snippet(c.card, 110)),
            via ? h('p', { class: 'muted small' }, '“' + via + '” 용어와 이어진 개념') : null,
            st && st.n ? h('p', { class: 'muted small' }, '푼 문제 ' + st.n + '개 · 정답률 ' + Math.round((100 * st.c) / st.n) + '%') : null,
            points.length
              ? h(
                  'div',
                  { class: 'search-points' },
                  points.map((p) => h('button', { class: 'btn small soft', type: 'button', 'data-point': ptKey(p), onclick: () => { view.search = ''; startDrill(c.id, ptKey(p)); } }, '문제 유형: ' + p.t))
                )
              : null,
            h(
              'div',
              { class: 'actions' },
              lesson ? h('button', { class: 'btn small', type: 'button', 'data-lesson': lesson.id, onclick: () => openLesson(lesson.id) }, '레슨 읽기') : null,
              h('button', { class: 'btn small', type: 'button', 'data-unit': c.id, onclick: () => openUnit(c.id) }, '단락 보기'),
              h('button', { class: 'btn small primary', type: 'button', 'data-drill': c.id, onclick: () => { view.search = ''; startDrill(c.id, null); } }, '문제 풀기')
            )
          )
        );
      });
    }
    if (G.mathUi) G.mathUi.typeset(box);
    if (G.wikiUi) G.wikiUi.link(box);
  }

  function renderLearnList(outer) {
    // 검색어가 있는 동안에는 레슨 목록을 숨기고 결과만 보여 준다(입력 중에 화면을 다시 그리지 않으려고 hidden으로 처리)
    const root = h('div', { id: 'learn-lists' });
    root.hidden = !!(view.search || '').trim();
    outer.appendChild(searchPanel(root));
    outer.appendChild(root);
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
          : null,
        c ? h('button', { class: 'btn', id: 'lesson-units', onclick: () => { finishLesson(l); openUnit(c.id); } }, '포인트별로 반복하기') : null
      )
    );
    root.appendChild(art);
  }

  function renderLearn(root) {
    const l = view.lessonId ? G.lessonMap[view.lessonId] : null;
    if (l) renderLesson(root, l);
    else renderLearnList(root);
  }

  // ───────── 과목별(단원) 탭 ─────────
  // restore가 true면(문제 풀다가 돌아올 때) 읽던 자리로, 아니면 맨 위로
  function openUnit(cid, restore) {
    view.unitSubject = concept(cid).subject;
    view.unitCid = cid;
    view.tab = 'units';
    render();
    window.scrollTo(0, (restore && view.scrollMemo['unit:' + cid]) || 0);
  }

  // 포인트 문제만 반복. 반복을 시작하면 개념을 읽은 것으로 쳐서 잠금도 풀어 준다.
  function startDrill(cid, pid) {
    const l = G.lessonFor(cid);
    if (l) P.markLessonRead(S, l.id);
    view.mode = 'drill';
    view.drill = { cid, pid: pid || null };
    save();
    nextQuestion();
    goTab('practice');
  }

  function pointStatus(pid) {
    const st = P.pointStat(S, pid);
    if (P.pointMastered(S, pid)) return { cls: 'open', text: '익숙해짐 ✓' };
    if (st.n) return { cls: 'locked', text: '연속 ' + st.streak + '/' + P.MASTER_STREAK };
    return { cls: 'locked', text: '아직 안 풀었어' };
  }

  function progressTile(label, mastered, total) {
    return h(
      'div',
      { class: 'tile progress-tile' },
      h('div', { class: 'stat-line' }, h('span', null, label), h('span', { class: 'nowrap' }, mastered + ' / ' + total)),
      h('div', { class: 'bar' }, h('i', { style: 'width:' + (total ? Math.round((100 * mastered) / total) : 0) + '%' }))
    );
  }

  function renderUnitList(root) {
    const subs = G.subjects.filter((s) => s.ready || s.id === 'code');
    if (!subs.some((s) => s.id === view.unitSubject)) view.unitSubject = 'circuit';
    root.appendChild(
      h(
        'div',
        { class: 'panel' },
        h('h2', null, '과목별 단원'),
        h('p', { class: 'muted small' }, '과목 → 단원 → 세부 단락 순서로 들어가. 단락마다 "문제 포인트 → 개념 설명 → 그 포인트 문제만 반복"으로 공부해. 한 포인트에서 연속 ' + P.MASTER_STREAK + '문제를 맞히면 익숙해진 걸로 쳐.'),
        h(
          'div',
          { class: 'chips', role: 'group', 'aria-label': '과목' },
          subs.map((s) =>
            h('button', { class: 'chip', 'data-subject': s.id, 'aria-pressed': String(view.unitSubject === s.id), onclick: () => { view.unitSubject = s.id; render(); } }, s.short, s.ready ? null : h('span', { class: 'soon' }, '나중에'))
          )
        )
      )
    );
    const sj = G.subjects.find((s) => s.id === view.unitSubject);
    if (!sj.ready) {
      root.appendChild(h('div', { class: 'empty' }, h('strong', null, sj.name), h('p', null, '최신 기준을 확인한 뒤에 따로 추가할 거야.')));
      return;
    }
    let m = 0;
    let t = 0;
    G.concepts.filter((c) => c.subject === sj.id).forEach((c) => {
      const cp = P.conceptPoints(S, c.id);
      m += cp.mastered;
      t += cp.total;
    });
    root.appendChild(progressTile('익숙해진 포인트', m, t));
    groupsOf(sj.id).forEach((g) => {
      root.appendChild(h('h3', { class: 'group-title eyebrow' }, g.name));
      root.appendChild(
        h(
          'div',
          { class: 'rows' },
          G.concepts
            .filter((c) => c.subject === g.subject && c.group === g.name)
            .map((c) => {
              const cp = P.conceptPoints(S, c.id);
              const st = P.conceptStat(S, c.id);
              return h(
                'button',
                { class: 'row lesson-row', 'data-unit': c.id, onclick: () => openUnit(c.id) },
                h('span', { class: 'row-head' }, h('span', { class: 'name' }, c.name), h('span', { class: 'right' }, h('span', { class: 'state ' + (cp.total && cp.mastered === cp.total ? 'open' : 'locked') }, '포인트 ' + cp.mastered + '/' + cp.total))),
                h('span', { class: 'bar' + (cp.mastered === 0 ? '' : '') }, h('i', { style: 'width:' + (cp.total ? Math.round((100 * cp.mastered) / cp.total) : 0) + '%' })),
                h('span', { class: 'stat-line' }, h('span', null, st.n + '문제 풀이'), h('span', null, '정답률 ' + pct(st.c, st.n)))
              );
            })
        )
      );
    });
  }

  // 포인트 카드 안의 예제(같은 숫자로 항상 같은 예제, "다른 숫자로"로 바꿀 수 있음)
  function pointExample(p) {
    const pid = ptKey(p);
    let q;
    try {
      q = G.questionForPoint(p, view.exSeeds[pid] || 1);
    } catch (e) {
      return null;
    }
    const steps = q.explain.steps.map((s) => (s.indexOf('검산: ') === 0 ? h('li', { class: 'check' }, s) : h('li', null, s)));
    return h(
      'details',
      { class: 'mini-example', open: !!view.exOpen[pid], ontoggle: (e) => { view.exOpen[pid] = e.target.open; } },
      h('summary', null, '예제 풀이 보기'),
      h(
        'div',
        { class: 'example' },
        h('div', { class: 'example-head' }, h('span', { class: 'eyebrow' }, '예제'), h('span', { class: 'qid' }, q.key)),
        h('p', { class: 'qtext' }, q.text),
        q.svg ? h('div', { class: 'figure', html: q.svg }) : null,
        h('ol', { class: 'choices' }, q.choices.map((c, i) => h('li', null, h('div', { class: 'choice' + (c.correct ? ' is-correct' : ' is-dim') }, h('span', { class: 'no' }, NUMS[i]), h('span', { class: 'lab' }, c.label))))),
        h('h3', null, '풀이'),
        h('ol', { class: 'steps' }, steps),
        h('p', { class: 'lead' }, '답: ' + q.explain.conclusion),
        h('button', { class: 'btn soft', 'data-another': pid, onclick: () => { view.exSeeds[pid] = G.rng.newSeed(); view.exOpen[pid] = true; render(); } }, '다른 숫자로 보기')
      )
    );
  }

  function renderUnitDetail(root, c) {
    const l = G.lessonFor(c.id);
    const points = G.pointsFor(c.id);
    const cp = P.conceptPoints(S, c.id);
    const sj = G.subjects.find((s) => s.id === c.subject);
    const sameSubject = G.concepts.filter((x) => x.subject === c.subject);
    const nextC = sameSubject[sameSubject.findIndex((x) => x.id === c.id) + 1] || null;

    root.appendChild(h('button', { class: 'btn small back', id: 'unit-back', onclick: () => { view.unitCid = null; render(); window.scrollTo(0, 0); } }, '← ' + sj.short + ' 단원 목록'));
    const kids = [
      h('span', { class: 'eyebrow' }, sj.name + ' · ' + c.group),
      h('h2', null, c.name),
      l ? h('p', { class: 'goal' }, '이번 목표: ' + l.goal) : null,
      progressTile('익숙해진 포인트', cp.mastered, cp.total),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', id: 'drill-all', onclick: () => startDrill(c.id, null) }, '이 단락 전부 섞어서 반복')),

      // 1) 문제 포인트 한눈에
      h(
        'section',
        { class: 'lesson-sec' },
        h('h3', null, '1. 이 단락에서 나오는 문제 포인트'),
        h('p', { class: 'muted small' }, '시험에서 이 개념은 아래 ' + points.length + '가지 모양으로 나와. 먼저 훑어보고, 아래 개념 설명을 읽은 뒤 포인트별로 풀어 봐.'),
        h('ol', { class: 'pt-list' }, points.map((p) => h('li', null, h('strong', null, p.t), h('span', { class: 'muted' }, ' — ' + p.ask))))
      ),

      // 2) 개념을 쉽고 자세하게
      h(
        'section',
        { class: 'lesson-sec' },
        h('h3', null, '2. 개념을 쉽게 이해하기'),
        h('p', null, c.card)
      ),
      l
        ? l.sections.map((sec) => h('section', { class: 'lesson-sec' }, h('h3', null, sec.h), (sec.p || []).map((t) => h('p', null, t)), sec.list ? h('ul', null, sec.list.map((t) => h('li', null, t))) : null))
        : null,
      h('div', { class: 'box analogy' }, h('span', { class: 'eyebrow' }, '비유로 보면'), h('p', null, c.analogy)),
      h('div', { class: 'box formula-box' }, h('span', { class: 'eyebrow' }, '핵심 공식'), h('p', { class: 'formula' }, c.formula)),
      l ? h('section', { class: 'lesson-sec' }, h('h3', null, '문제 푸는 순서'), h('ol', { class: 'how' }, l.how.map((t) => h('li', null, t)))) : null,

      // 3) 포인트별로 풀어 보기
      h('section', { class: 'lesson-sec' }, h('h3', null, '3. 포인트별로 풀어 보기'), h('p', { class: 'muted small' }, '포인트마다 풀이 핵심과 함정을 읽고, 예제를 본 다음, 그 모양의 문제만 계속 풀어서 익숙하게 만들어.')),
      points.map((p, i) => {
        const pid = ptKey(p);
        const stt = pointStatus(pid);
        const ps = P.pointStat(S, pid);
        return h(
          'section',
          { class: 'point-card', 'data-point': pid },
          h('div', { class: 'point-head' }, h('span', { class: 'lesson-no' }, i + 1), h('h3', null, p.t), h('span', { class: 'state ' + stt.cls }, stt.text)),
          h('p', { class: 'point-ask' }, p.ask),
          h('div', { class: 'box formula-box' }, h('span', { class: 'eyebrow' }, '풀이 핵심'), h('p', null, p.key)),
          h('div', { class: 'box trap-box' }, h('span', { class: 'eyebrow' }, '자주 틀리는 곳'), h('p', null, p.trap)),
          pointExample(p),
          h(
            'div',
            { class: 'point-foot' },
            h('button', { class: 'btn primary', 'data-drill': pid, onclick: () => startDrill(c.id, pid) }, '이 포인트 문제만 반복'),
            h('span', { class: 'muted small' }, ps.n ? ps.n + '문제 풀이 · 정답 ' + ps.c + '개' : '아직 안 풀었어')
          )
        );
      }),
      h(
        'div',
        { class: 'actions' },
        nextC ? h('button', { class: 'btn', id: 'unit-next', onclick: () => openUnit(nextC.id) }, '다음 단락: ' + nextC.name) : null,
        h('button', { class: 'btn', onclick: () => { view.unitCid = null; render(); window.scrollTo(0, 0); } }, '단원 목록으로')
      ),
    ];
    root.appendChild(h('article', { class: 'lesson unit' }, kids));
  }

  function renderUnits(root) {
    const c = view.unitCid ? G.conceptMap[view.unitCid] : null;
    if (c) renderUnitDetail(root, c);
    else renderUnitList(root);
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

  // ───────── 기록 동기화(설정 화면) ─────────
  function syncLabel(sy) {
    const when = sy.at ? new Date(sy.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
    return (
      {
        starting: '연결을 확인하는 중이야…',
        unavailable: '이 화면에서는 쓸 수 없어. claude.ai에 로그인한 상태로 웹 주소(is.gd/gisa2026)를 열면 아이폰·맥 기록이 하나로 이어져. 지금은 이 브라우저에만 저장돼.',
        syncing: '동기화하는 중…',
        ok: 'claude.ai 계정에 연결돼 있어' + (when ? ' · 마지막 동기화 ' + when : ''),
        readonly: sy.message,
        error: sy.message,
        off: '꺼져 있어. 기록은 이 브라우저에만 저장돼.',
      }[sy.state] || ''
    );
  }

  function renderSyncSettings(root, sw) {
    const sy = G.sync ? G.sync.status() : { state: 'unavailable' };
    const canUse = G.sync && G.sync.available();
    root.appendChild(h('h3', { class: 'group-title eyebrow' }, '기록 동기화'));
    root.appendChild(
      h(
        'div',
        { class: 'rows' },
        h(
          'div',
          { class: 'field' },
          h('p', { class: 'small', id: 'sync-status' }, syncLabel(sy)),
          h('p', { class: 'small muted' }, 'claude.ai 계정 기준으로 저장돼서 다른 사람과는 섞이지 않아. 두 기기에서 따로 풀었으면 문제를 더 많이 푼 쪽의 통계를 남기고, 읽은 레슨·풀이 기록·복습 일정은 합쳐.')
        ),
        canUse ? sw('sync-on', 'syncOn', '자동 동기화', '기록이 바뀌면 몇 초 뒤에 올리고, 앱을 열 때와 다시 돌아왔을 때 최신 기록을 받아 와.') : null,
        canUse ? h('div', { class: 'field' }, h('div', { class: 'inline' }, h('button', { class: 'btn', id: 'sync-now', disabled: sy.state === 'syncing', onclick: () => { G.sync.syncNow(); } }, '지금 동기화'))) : null
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
            if (key === 'syncOn' && G.sync) G.sync.setEnabled(e.target.checked);
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
    renderSyncSettings(root, sw);

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
          h('p', { class: 'small muted' }, '동기화를 쓸 수 없거나 꺼 두면 기록은 이 브라우저(localStorage)에만 저장돼. 지켜 두고 싶으면 백업 코드를 만들어 메모에 붙여 둬. 백업을 가져오면 동기화 중인 다른 기기의 기록도 그 백업으로 바뀌어.'),
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
                  P.replaceAll(S);
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
          h('p', { class: 'small muted' }, '푼 기록, 정답률, 복습 일정을 모두 지워. 되돌릴 수 없어. 동기화 중이면 다른 기기의 기록도 같이 지워져.'),
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
                      P.replaceAll(S);
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
  // PC 오른쪽 AI 패널이 "지금 무엇을 보고 있는지" 알 수 있게 화면 상태를 정리해서 건넨다
  function statsSummary() {
    const rows = G.concepts
      .map((c) => ({ name: c.name, st: P.conceptStat(S, c.id) }))
      .filter((r) => r.st.n >= 3)
      .sort((a, b) => a.st.c / a.st.n - b.st.c / b.st.n)
      .slice(0, 6);
    const read = Object.keys(S.lessons || {}).length;
    return (
      '푼 문제 ' + S.total.n + '개, 전체 정답률 ' + pct(S.total.c, S.total.n) + ', 읽은 레슨 ' + read + '/' + G.lessons.length + '. ' +
      (rows.length ? '정답률이 낮은 개념: ' + rows.map((r) => r.name + ' ' + pct(r.st.c, r.st.n) + '(' + r.st.n + '문제)').join(', ') : '아직 3문제 이상 푼 개념이 없어.')
    );
  }

  function aiContext() {
    if (view.tab === 'practice' && view.q) {
      return { kind: 'question', q: view.q, answered: view.answered, chosen: view.chosen, label: '문제 · ' + concept(view.q.conceptId).name };
    }
    if (view.tab === 'learn' && view.lessonId) {
      const l = G.lessonMap[view.lessonId];
      return {
        kind: 'lesson',
        lesson: l,
        concept: l.concept ? concept(l.concept) : null,
        quiz: view.quiz ? { q: view.quiz.q, answered: view.quiz.chosen >= 0 } : null,
        label: '레슨 · ' + l.title,
      };
    }
    if (view.tab === 'units' && view.unitCid) {
      const c = concept(view.unitCid);
      return { kind: 'unit', concept: c, points: G.pointsFor(c.id), label: '단락 · ' + c.name };
    }
    const names = { learn: '배우기 목록', units: '과목별 단원 목록', practice: '연습', review: '복습', stats: '기록', settings: '설정' };
    return { kind: 'general', label: names[view.tab] || '', stats: statsSummary() };
  }

  function render() {
    // 다른 문제로 넘어가면 계산기 시연을 끝낸다
    if (G.calcDemo && G.calcDemo.active() && G.calcDemo.scope() === 'question' && G.calcDemo.key() !== (view.q && view.q.key)) G.calcDemo.stop();
    renderBar();
    const root = document.getElementById('view');
    root.textContent = '';
    const fn = { learn: renderLearn, units: renderUnits, practice: renderPractice, review: renderReview, stats: renderStats, settings: renderSettings }[view.tab];
    fn(root);
    if (G.mathUi) G.mathUi.typeset(root);
    if (G.wikiUi) G.wikiUi.link(root);
    if (G.aiTutor) G.aiTutor.updateSide();
  }

  // 맥 키보드: 1~4 고르기, Enter/N 다음 문제
  document.addEventListener('keydown', (e) => {
    if (view.tab !== 'practice' || !view.q || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.target && e.target.closest && e.target.closest('#calc')) return; // 계산기에 입력 중일 땐 문제 단축키 끔
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
    if (G.sync) {
      G.sync.init({
        getState: () => S,
        // 서버 기록과 합친 결과를 이 기기에 적용(로컬 저장만 하고, 다시 올리는 건 동기화가 알아서 함)
        apply(merged, info) {
          S = merged;
          G.store.save(S);
          applyTheme();
          if (info && info.hadLocal && info.hadRemote) toast('다른 기기의 기록과 합쳤어');
          render();
        },
        onStatus() {
          paintSyncDot();
          if (view.tab === 'settings') render();
        },
      });
    }
    if (G.aiTutor) {
      G.aiTutor.mountSide(aiContext);
      G.aiTutor.onReady(() => render());
      G.aiTutor.onLayoutChange(() => render());
    }
  }

  // 테스트(브라우저 점검)용 진입점
  function _load(key) {
    loadKey(key);
    view.tab = 'practice';
    render();
  }
  G.ui = { openLesson, openUnit, start, _view: view, _state: () => S, _load, _answer: answer, _openLesson: openLesson, _openUnit: openUnit, _startDrill: startDrill };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(globalThis.GISA);
