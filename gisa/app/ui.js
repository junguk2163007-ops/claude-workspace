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
    kg: null, // 기출 반복 중: { filter, q, answered, chosen }
    unitSubject: 'circuit',
    unitCid: null,
    restTopic: null,
    ulogOpen: false,
    ulogItems: {},
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
    view.kgNext = null;
  }

  // 다음 문제로 넘어갈 때 계산기 화면과 메모판을 비워서 바로 쓰기 쉽게 한다(계산기 설정·메모리 값은 그대로).
  // 새로고침으로 앱이 다시 열릴 때는 비우지 않는다.
  let booting = true;
  function resetTools() {
    if (booting) return;
    if (G.calcDemo && G.calcDemo.active()) return; // 계산기 시연 중에는 시연이 알아서 관리
    try {
      if (G.calcUi && G.calcUi.calc) {
        G.calcUi.calc.press('AC');
        if (G.calcUi.paint) G.calcUi.paint();
        if (G.calcUi.save) G.calcUi.save();
      }
    } catch (e) {
      /* 계산기를 못 쓰는 상태면 건너뜀 */
    }
    if (G.pad && G.pad.clear) G.pad.clear();
  }

  function nextQuestion() {
    resetTools();
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
    else if (view.mode === 'weak' && view.weak) cid = view.weak.cid;
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
    view.kgNext = null;
    if (masteredName !== null && G.kigeum && KG().count() && KG().pool({ cid: view.q.conceptId }).length) view.kgNext = { cid: view.q.conceptId };
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
    if (view.tab === 'units' && view.restTopic) return 'rest:' + view.restTopic.s + ':' + (view.restTopic.id || 'all');
    if (view.tab === 'units') return 'ulist:' + view.unitSubject;
    if (view.tab === 'learn' && view.lessonId) return 'lesson:' + view.lessonId;
    if (view.tab === 'learn') return 'llist';
    return null;
  }
  // 목록에서 단락·레슨으로 들어갈 때 지금 자리를 기억하고, 돌아오면 그 자리로 간다
  function rememberScroll() {
    const k = scrollKey();
    if (k) view.scrollMemo[k] = window.scrollY;
  }
  function backScroll() {
    const k = scrollKey();
    window.scrollTo(0, (k && view.scrollMemo[k]) || 0);
  }

  function goTab(tab) {
    const leaving = scrollKey();
    if (leaving) view.scrollMemo[leaving] = window.scrollY;
    if (tab === 'learn' && view.tab === 'learn') view.lessonId = null;
    if (tab === 'units' && view.tab === 'units') { view.unitCid = null; view.restTopic = null; }
    if (tab !== 'settings') {
      view.ulogOpen = false;
      view.ulogItems = {};
    }
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
    view.restTopic = null;
    view.mode = view.mode === 'review' ? 'normal' : view.mode;
    view.tab = 'learn';
    view.resetArmed = false;
    render();
    window.scrollTo(0, 0);
  }

  // ───────── 기출 빈출 별(★) ─────────
  // 가져온 기출(2003~2022) 중 그 개념으로 이어진 문제가 과목 전체 문제의 몇 %인지로 등급을 매긴다.
  //  ★★★ 8% 이상(아주 자주) / ★★ 3.5% 이상(자주) / ★ 1.5% 이상(가끔) / 별 없음 = 기출에서 드문 편
  function kgStar(cid) {
    const f = G.kgFreq;
    const c = G.conceptMap[cid];
    if (!f || !c || f.c[cid] === undefined || !f.subjectTotal[c.subject]) return null;
    const n = f.c[cid];
    const pc = (100 * n) / f.subjectTotal[c.subject];
    const stars = pc >= 8 ? 3 : pc >= 3.5 ? 2 : pc >= 1.5 ? 1 : 0;
    return { stars, n, pct: Math.round(pc * 10) / 10 };
  }
  // 별 표시는 기본으로 숨기고, 과목별 단원의 체크 표시로 켜고 끈다(켠 상태는 이 브라우저에 기억)
  const starsOn = () => lsGet('gisa-show-stars') === true;
  function starBadge(cid) {
    if (!starsOn()) return null;
    const k = kgStar(cid);
    if (!k || !k.stars) return null;
    return h(
      'span',
      { class: 'kgstar s' + k.stars, 'data-stars': String(k.stars), title: '기출 빈출 ' + '★'.repeat(k.stars) + ' · 기출 ' + k.n + '문제(과목의 ' + k.pct + '%)', 'aria-label': '기출 빈출 등급 ' + k.stars + '/3' },
      '★'.repeat(k.stars)
    );
  }
  function starLegend() {
    const f = G.kgFreq;
    if (!f) return null;
    const on = starsOn();
    const toggle = h(
      'label',
      { class: 'star-toggle', id: 'kgstar-toggle' },
      h('input', { type: 'checkbox', id: 'kgstar-check', checked: on, onchange: (e) => { lsSet('gisa-show-stars', !!e.target.checked); render(); } }),
      ' ★ 기출 빈출 별 보기'
    );
    if (!on) return toggle;
    return h(
      'div',
      { class: 'star-wrap' },
      toggle,
      h(
      'p',
      { class: 'kgstar-legend muted small', id: 'kgstar-legend' },
      h('span', { class: 'kgstar s3' }, '★★★'), ' 아주 자주  ', h('span', { class: 'kgstar s2' }, '★★'), ' 자주  ', h('span', { class: 'kgstar s1' }, '★'), ' 가끔 — 기출 ' + f.meta.total.toLocaleString() + '문제(' + f.meta.from + '~' + f.meta.to + '년, 글로 된 문제)에서 이 개념이 나온 비율 기준이야. 별이 없으면 기출에서 드문 편이고, 기술기준은 아직 기출 자료가 없어.'
      )
    );
  }

  // ───────── 개념 그림(도식·실물 일러스트) ─────────
  function conceptFigures(cid) {
    const figs = G.figuresFor ? G.figuresFor(cid) : [];
    if (!figs.length) return null;
    return h(
      'div',
      { class: 'cfigs', 'data-figs': cid },
      figs.map((f) => h('figure', { class: 'cfig', 'data-fig': f.id }, h('div', { class: 'cfig-art', html: G.figures.render(f) }), h('figcaption', null, h('strong', null, f.title), f.caption ? h('span', null, f.caption) : null)))
    );
  }

  // ───────── 보던 화면 기억 · 업데이트 알림 ─────────
  // 새 버전이 올라와서 페이지가 다시 열려도 보던 탭·레슨·단락·문제·스크롤 위치로 돌아오게 한다(이 브라우저 localStorage).
  const VIEW_KEY = 'gisa-view';
  const BUILD_KEY = 'gisa-build';
  const lsGet = (k) => {
    try {
      return JSON.parse(localStorage.getItem(k));
    } catch (e) {
      return null;
    }
  };
  const lsSet = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      /* 저장소를 못 쓰는 환경이면 기억하지 않음 */
    }
  };
  let restoring = false;
  // 보던 화면을 계정(개인 문서)에도 저장: 브라우저 저장소가 비워져도 업데이트 뒤에 그 자리로 돌아오게
  let cloudTimer = null;
  let cloudLast = '';
  function cloudSaveView(rec) {
    if (!G.sync || !G.sync.userDoc || S.settings.syncOn === false) return;
    const doc = G.sync.userDoc('view');
    if (!doc) return;
    const body = JSON.stringify(Object.assign({}, rec, { t: 0, y: Math.round(rec.y / 50) * 50 }));
    if (body === cloudLast) return; // 바뀐 게 없으면 올리지 않음
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => {
      cloudLast = body;
      Promise.resolve()
        .then(() => doc.set(Object.assign({}, rec, { t: Date.now() })))
        .catch(() => (cloudLast = ''));
    }, 1500);
  }
  function rememberView() {
    if (restoring || booting) return;
    const rec = {
      tab: view.tab,
      lessonId: view.lessonId,
      unitCid: view.unitCid,
      unitSubject: view.unitSubject,
      q: view.tab === 'practice' && ['normal', 'drill', 'review', 'basics'].indexOf(view.mode) >= 0 && view.q ? view.q.key : null,
      mode: view.tab === 'practice' ? view.mode : null,
      drill: view.mode === 'drill' ? view.drill : null,
      rq: view.mode === 'review' ? view.reviewQueue.slice(0, 200) : null,
      basics: view.mode === 'basics' ? view.basics : null,
      kg: view.tab === 'practice' && view.mode === 'kigeum' && view.kg && view.kg.q ? { f: view.kg.filter, id: view.kg.q.id, a: view.kg.answered, c: view.kg.chosen } : null,
      rt: view.tab === 'units' && !view.unitCid ? view.restTopic : null,
      ulog: view.tab === 'settings' ? !!view.ulogOpen : false,
      exam: view.mode === 'exam' && view.ex && !view.ex.result ? 1 : 0,
      y: Math.round(window.scrollY || 0),
      t: Date.now(),
    };
    lsSet(VIEW_KEY, rec);
    cloudSaveView(rec);
  }
  // 불러온 값이 지금 데이터와 맞을 때만 복원(없어진 레슨·문제는 무시)
  function restoreView(rec) {
    const r = rec || lsGet(VIEW_KEY);
    if (!r || typeof r !== 'object') return null;
    const tabs = ['learn', 'units', 'practice', 'review', 'stats', 'settings'];
    if (tabs.indexOf(r.tab) === -1) return null;
    view.tab = r.tab;
    if (r.unitSubject && G.subjects.some((x) => x.id === r.unitSubject)) view.unitSubject = r.unitSubject;
    if (r.tab === 'learn' && r.lessonId && G.lessonMap[r.lessonId]) {
      const l = G.lessonMap[r.lessonId];
      view.lessonId = r.lessonId;
      view.exampleKey = l && l.example ? 't:' + l.example : null;
    }
    if (r.tab === 'units' && r.unitCid && G.conceptMap[r.unitCid]) view.unitCid = r.unitCid;
    if (r.tab === 'practice') {
      if (r.mode === 'drill' && r.drill && G.conceptMap[r.drill.cid]) {
        view.mode = 'drill';
        view.drill = r.drill;
      } else if (r.mode === 'review' && Array.isArray(r.rq)) {
        view.mode = 'review';
        view.reviewQueue = r.rq.filter((k) => typeof k === 'string');
      } else if (r.mode === 'basics' && r.basics && G.conceptMap[r.basics.focus] && G.conceptMap[r.basics.from]) {
        view.mode = 'basics';
        view.basics = r.basics;
      }
    }
    if (r.tab === 'practice' && r.q) {
      try {
        view.q = G.fromKey(r.q);
        resetCard();
      } catch (e) {
        view.q = null;
      }
    }
    if (r.tab === 'units' && !r.unitCid && r.rt && r.rt.s) view.restTopic = r.rt;
    if (r.tab === 'settings' && r.ulog) view.ulogOpen = true;
    return r;
  }
  function buildStamp() {
    const b = window.GISA_BUILD;
    if (!b || !b.label) return null;
    return h(
      'button',
      {
        class: 'build-stamp',
        id: 'build-stamp',
        type: 'button',
        title: '이 버전이 만들어진 시각(한국 시간). 누르면 업데이트 내역',
        'aria-label': '업데이트 ' + b.label + ', 업데이트 내역 보기',
        onclick: openUpdateLog,
      },
      h('span', null, '업데이트'),
      h('span', null, b.label)
    );
  }
  function announceUpdate() {
    const b = window.GISA_BUILD;
    if (!b) return;
    const seen = lsGet(BUILD_KEY);
    if (seen && seen.t && seen.t !== b.t) toast('업데이트 되었습니다 · ' + b.label);
    lsSet(BUILD_KEY, { t: b.t, label: b.label });
    // 이 기기에서 열린 버전 시각 기록(설정 → 업데이트 내역에 보여 줌)
    const log = lsGet('gisa-build-log') || [];
    if (!log.some((x) => x.t === b.t)) {
      log.push({ t: b.t, label: b.label });
      lsSet('gisa-build-log', log.slice(-12));
    }
  }
  function openUpdateLog() {
    view.ulogOpen = true; // 업데이트 시각을 눌러서 온 거라 목록은 바로 펼친다(상세는 항목 버튼을 눌러야)
    goTab('settings');
    setTimeout(() => {
      const el = document.getElementById('update-log');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 30);
  }
  // 설정 탭의 "업데이트 내역": 최근 업데이트 시각과 바뀐 내용
  function renderUpdateLog(root) {
    const b = window.GISA_BUILD;
    const log = (lsGet('gisa-build-log') || []).slice().reverse();
    const cl = G.changelog || [];
    root.appendChild(
      h(
        'section',
        { class: 'panel', id: 'update-log' },
        h('h2', null, '업데이트 내역'),
        h('p', { class: 'muted small', id: 'update-latest' }, b && b.label ? '최근 업데이트: ' + b.label + ' (한국 시간)' : '이 화면은 파일로 열어서 업데이트 시각이 없어.'),
        log.length > 1 ? h('p', { class: 'muted small' }, '이 기기에서 열린 버전: ' + log.map((x) => x.label).join(' · ')) : null,
        h(
          'button',
          { class: 'btn small', id: 'ulog-toggle', 'aria-expanded': String(!!view.ulogOpen), onclick: () => { view.ulogOpen = !view.ulogOpen; render(); } },
          view.ulogOpen ? '업데이트 내역 접기' : '업데이트 내역 보기 (' + cl.length + ')'
        ),
        view.ulogOpen
          ? cl.map((e, i) => {
              const open = !!(view.ulogItems && view.ulogItems[i]);
              return h(
                'div',
                { class: 'ulog', 'data-open': String(open) },
                h(
                  'div',
                  { class: 'ulog-head' },
                  h('span', { class: 'tag plain' }, e.date),
                  h('strong', null, e.title),
                  h('button', { class: 'btn small soft ulog-more', 'aria-expanded': String(open), onclick: () => { view.ulogItems = view.ulogItems || {}; view.ulogItems[i] = !open; render(); } }, open ? '접기' : '상세 보기')
                ),
                open ? h('ul', null, e.items.map((t) => h('li', null, t))) : null
              );
            })
          : null
      )
    );
  }

  // ───────── 상단 바 ─────────
  function renderBar() {
    const due = P.dueReviews(S).length;
    const tabs = [
      ['learn', '배우기'],
      ['units', '과목별'],
      ['practice', '∞ 문제풀이'],
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
          buildStamp(),
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

  // 단락 반복 중에 언제든 이 개념의 기출로 바로 넘어가는 버튼
  function kgDrillButton(cid) {
    if (!G.kigeum) return null;
    const n = G.kigeum.conceptCount(cid);
    if (!G.kigeum.count()) return h('button', { class: 'btn small soft', id: 'drill-kg', onclick: () => goTab('settings') }, '기출 가져오기');
    if (!n) return h('button', { class: 'btn small soft', id: 'drill-kg', disabled: true, title: '이 개념에 이어진 기출이 아직 없어' }, '이 개념 기출 없음');
    return h('button', { class: 'btn small primary', id: 'drill-kg', onclick: () => startKigeum({ cid }) }, '이 개념 기출 풀기 (' + n + ')');
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
        kgDrillButton(d.cid),
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
    if (view.mode === 'weak' && view.weak) {
      return h(
        'div',
        { class: 'banner', id: 'weak-banner' },
        '약점 집중: ' + concept(view.weak.cid).name,
        h('button', { class: 'btn small', id: 'weak-exit', onclick: () => { view.mode = 'normal'; view.weak = null; nextQuestion(); render(); } }, '그만하기')
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
          // 한 번 더 묻지 않고 바로 자동 재생(느리게)으로 보여 준다
          view.calcAsk = false;
          G.calcDemo.start(q, { auto: true });
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
        h('button', { class: 'btn small soft', id: 'hint2', disabled: view.hint !== 1, onclick: () => { view.hint = 2; render(); } }, '힌트 2 · 쓸 공식'),
        h('button', { class: 'btn small', id: 'idk', title: '고르지 않고 정답과 풀이를 봐. 오답으로 기록되고 복습에 들어가', onclick: giveUp }, '모르겠어요')
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
    const ok = !!chosen && chosen.correct;
    const ex = q.explain;
    const c = concept(q.conceptId);
    const cards = [];
    cards.push(
      h(
        'div',
        { class: 'verdict ' + (ok ? 'ok' : 'bad'), role: 'status' },
        ok ? '정답!' : view.chosen < 0 ? '모르겠어요로 넘겼어' : '아쉽다, 오답이야',
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
    if (view.kgNext) notes.push(h('p', { class: 'note', id: 'kg-bonus-note' }, '연속 3정답으로 이 포인트가 익숙해졌어. 이제 같은 개념의 기출·CBT 문제 ' + Math.min(3, KG().conceptCount(view.kgNext.cid)) + '개로 실전 감각을 확인해 보자.'));
    if (view.unlocked.length) notes.push(h('p', { class: 'note' }, '새 개념이 열렸어: ' + view.unlocked.map((id) => concept(id).name).join(', ')));
    cards.push(notes);
    const actions = [
      view.kgNext
        ? h('button', { class: 'btn primary', id: 'next', onclick: () => startKigeumSet(view.kgNext.cid) }, '다음: 이 개념 기출·CBT ' + Math.min(3, KG().conceptCount(view.kgNext.cid)) + '문제')
        : h('button', { class: 'btn primary', id: 'next', onclick: () => { nextQuestion(); render(); window.scrollTo(0, 0); } }, '다음 문제'),
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
        h('span', { class: 'qid', title: '문제 번호 (설정에서 다시 불러올 수 있어)' }, q.key),
        bookmarkButton(q)
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

  // ───────── 모의고사(시험모드) ─────────
  const X = () => G.exam;
  const fmtClock = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(Math.floor(m / 60)) + ':' + String(m % 60).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  };
  let examTimer = null;
  function stopExamTimer() {
    if (examTimer) clearInterval(examTimer);
    examTimer = null;
  }
  function startExamTimer() {
    stopExamTimer();
    examTimer = setInterval(() => {
      const ex = view.ex;
      if (!ex || ex.result) return stopExamTimer();
      const left = X().remaining(ex.c);
      const el = document.getElementById('ex-timer');
      if (el) {
        el.textContent = fmtClock(left);
        el.classList.toggle('low', left <= 600);
      }
      if (left <= 0) examSubmit();
    }, 1000);
  }
  function examQuestion() {
    const ex = view.ex;
    if (!ex.q || ex.qIdx !== ex.c.idx) {
      ex.q = G.fromKey(ex.c.paper.keys[ex.c.idx]);
      ex.qIdx = ex.c.idx;
    }
    return ex.q;
  }
  function startExam(resume) {
    let c = resume ? X().cur.load() : null;
    if (!c) c = X().cur.start();
    view.mode = 'exam';
    view.ex = { c, q: null, qIdx: -1, grid: false, confirm: false, result: null };
    startExamTimer();
    goTab('practice');
    window.scrollTo(0, 0);
  }
  function exitExam() {
    stopExamTimer();
    view.mode = 'normal';
    view.ex = null;
    nextQuestion();
    render();
    window.scrollTo(0, 0);
  }
  function examSave() {
    X().cur.save(view.ex.c);
  }
  function examGo(n) {
    resetTools();
    const ex = view.ex;
    ex.c.idx = Math.max(0, Math.min(ex.c.answers.length - 1, n));
    ex.grid = false;
    examSave();
    render();
    window.scrollTo(0, 0);
  }
  function examPick(i) {
    const ex = view.ex;
    ex.c.answers[ex.c.idx] = ex.c.answers[ex.c.idx] === i ? -1 : i; // 한 번 더 누르면 선택 취소
    examSave();
    render();
  }
  function examIdk() {
    const ex = view.ex;
    ex.c.answers[ex.c.idx] = -2;
    examSave();
    if (ex.c.idx < ex.c.answers.length - 1) examGo(ex.c.idx + 1);
    else render();
  }
  function examSubmit() {
    const ex = view.ex;
    if (!ex || ex.result) return;
    stopExamTimer();
    const g = X().grade(ex.c);
    // 푼 기록과 복습에도 반영: 틀리거나 못 푼 문제는 복습 목록으로
    ex.c.paper.keys.forEach((key, i) => {
      try {
        const q = G.fromKey(key);
        P.record(S, q, ex.c.answers[i] >= 0 && ex.c.answers[i] === q.answerIndex);
      } catch (e) {
        /* 없어진 문제는 건너뜀 */
      }
    });
    save();
    X().hist.add(ex.c, g);
    X().cur.clear();
    ex.result = g;
    ex.confirm = false;
    render();
    window.scrollTo(0, 0);
  }

  function examGrid(ex) {
    const c = ex.c;
    const wrap = h('div', { class: 'ex-grid-panel', id: 'ex-grid' });
    c.paper.sections.forEach((s) => {
      const done = c.answers.slice(s.from, s.to).filter((a) => a !== -1).length;
      wrap.appendChild(h('h3', { class: 'ex-sec' }, s.name, h('span', { class: 'muted small' }, ' (' + done + '/' + (s.to - s.from) + ')')));
      const grid = h('div', { class: 'ex-grid' });
      for (let i = s.from; i < s.to; i++) {
        const a = c.answers[i];
        let cls = 'ex-no';
        if (i === c.idx) cls += ' cur';
        else if (a === -2) cls += ' idk';
        else if (a >= 0) cls += ' done';
        grid.appendChild(h('button', { class: cls, 'data-n': i, 'aria-label': i + 1 + '번' + (a >= 0 ? ' 푼 문제' : a === -2 ? ' 모르겠어요' : ' 안 푼 문제'), onclick: () => examGo(i) }, String(i + 1)));
      }
      wrap.appendChild(grid);
    });
    wrap.appendChild(
      h(
        'div',
        { class: 'ex-legend muted small' },
        h('span', null, h('i', { class: 'ex-sw cur' }), '현재'),
        h('span', null, h('i', { class: 'ex-sw done' }), '푼 문제'),
        h('span', null, h('i', { class: 'ex-sw idk' }), '모르겠어요'),
        h('span', null, h('i', { class: 'ex-sw' }), '안 푼 문제')
      )
    );
    return wrap;
  }

  function renderExam(root) {
    const ex = view.ex;
    if (ex.result) return renderExamResult(root);
    const c = ex.c;
    const left = X().remaining(c);
    if (left <= 0) {
      examSubmit();
      return;
    }
    const q = examQuestion();
    const sec = c.paper.sections.find((s) => c.idx >= s.from && c.idx < s.to);
    const unanswered = c.answers.filter((a) => a === -1).length;
    const idk = c.answers.filter((a) => a === -2).length;
    root.appendChild(
      h(
        'div',
        { class: 'panel ex-head' },
        h(
          'div',
          { class: 'ex-top' },
          h('strong', null, '모의고사'),
          h('span', { class: 'tag plain' }, '시험모드'),
          h('span', { class: 'ex-timer' + (left <= 600 ? ' low' : ''), id: 'ex-timer', title: '남은 시간' }, fmtClock(left))
        ),
        h('div', { class: 'bar' }, h('i', { style: 'width:' + Math.round(((c.answers.length - unanswered) / c.answers.length) * 100) + '%' })),
        h(
          'div',
          { class: 'stat-line' },
          h('span', null, sec.name + ' · ' + (c.idx + 1) + '/' + c.answers.length),
          h('span', null, '푼 문제 ' + (c.answers.length - unanswered - idk) + ' · 모르겠어요 ' + idk + ' · 안 푼 문제 ' + unanswered)
        ),
        h(
          'div',
          { class: 'actions' },
          h('button', { class: 'btn small', id: 'ex-grid-btn', 'aria-expanded': String(ex.grid), onclick: () => { ex.grid = !ex.grid; render(); } }, ex.grid ? '번호표 닫기' : '번호표'),
          h('button', { class: 'btn small primary', id: 'ex-submit', onclick: () => { ex.confirm = true; render(); } }, '제출하기'),
          h('button', { class: 'btn small soft', id: 'ex-quit', onclick: () => { ex.quit = true; render(); } }, '나가기')
        ),
        ex.grid ? examGrid(ex) : null
      )
    );
    if (ex.confirm) {
      root.appendChild(
        h(
          'div',
          { class: 'panel ex-confirm', id: 'ex-confirm', role: 'alertdialog' },
          h('strong', null, '지금 제출할까?'),
          h('p', { class: 'muted small' }, '안 푼 문제 ' + unanswered + '개, 모르겠어요 ' + idk + '개는 오답으로 채점돼. 제출하면 시험이 끝나.'),
          h(
            'div',
            { class: 'actions' },
            h('button', { class: 'btn primary', id: 'ex-submit-yes', onclick: examSubmit }, '제출'),
            h('button', { class: 'btn', id: 'ex-submit-no', onclick: () => { ex.confirm = false; render(); } }, '계속 풀기')
          )
        )
      );
    }
    if (ex.quit) {
      root.appendChild(
        h(
          'div',
          { class: 'panel ex-confirm', id: 'ex-quit-box', role: 'alertdialog' },
          h('strong', null, '시험을 나갈까?'),
          h('p', { class: 'muted small' }, '지금까지 푼 답과 남은 시간은 저장돼서 문제풀이 탭의 "이어서 풀기"로 다시 올 수 있어. 시간은 나가 있는 동안에도 흘러.'),
          h(
            'div',
            { class: 'actions' },
            h('button', { class: 'btn primary', id: 'ex-quit-yes', onclick: exitExam }, '나가기'),
            h('button', { class: 'btn', id: 'ex-quit-no', onclick: () => { ex.quit = false; render(); } }, '계속 풀기')
          )
        )
      );
    }
    const a = c.answers[c.idx];
    root.appendChild(
      h(
        'article',
        { class: 'qcard ex-card', 'data-ex': c.idx },
        h('div', { class: 'qmeta' }, h('span', { class: 'tag' }, '문제 ' + (c.idx + 1)), h('span', { class: 'tag plain' }, sec.short), bookmarkButton(q)),
        h('div', { class: 'qrow' }, h('p', { class: 'qtext' }, q.text), calcButton(q)),
        q.svg ? h('div', { class: 'figure', html: q.svg }) : null,
        h(
          'ol',
          { class: 'choices' },
          q.choices.map((ch, i) =>
            h('li', null, h('button', { class: 'choice' + (a === i ? ' is-picked' : ''), 'aria-pressed': String(a === i), 'data-i': i, onclick: () => examPick(i) }, h('span', { class: 'no' }, NUMS[i]), h('span', { class: 'lab' }, ch.label)))
          )
        ),
        a === -2 ? h('p', { class: 'note' }, '"모르겠어요"로 표시했어. 보기를 고르면 바뀌어.') : null,
        h(
          'div',
          { class: 'actions ex-nav' },
          h('button', { class: 'btn', id: 'ex-prev', disabled: c.idx === 0, onclick: () => examGo(c.idx - 1) }, '이전 문제'),
          h('button', { class: 'btn soft', id: 'ex-idk', onclick: examIdk }, '모르겠어요'),
          c.idx < c.answers.length - 1
            ? h('button', { class: 'btn primary', id: 'ex-next', onclick: () => examGo(c.idx + 1) }, '다음 문제')
            : h('button', { class: 'btn primary', id: 'ex-next', onclick: () => { ex.confirm = true; render(); } }, '제출하기')
        )
      )
    );
  }

  function renderExamResult(root) {
    const ex = view.ex;
    const g = ex.result;
    const c = ex.c;
    const secs = Math.min(X().LIMIT_SEC, Math.floor((Date.now() - c.startedAt) / 1000));
    root.appendChild(
      h(
        'div',
        { class: 'panel ex-result', id: 'ex-result' },
        h('h2', null, g.pass ? '합격권이야! 🎉' : '아쉽다, 불합격 점수야'),
        h('p', { class: 'muted small' }, '평균 ' + g.avg + '점 (합격은 평균 ' + X().PASS_AVG + '점 이상, 과목마다 ' + X().CUT + '점 이상) · 맞힌 문제 ' + g.correct + '/100 · 걸린 시간 ' + fmtClock(secs)),
        g.cutSubjects.length ? h('p', { class: 'note', id: 'ex-cut' }, '과락 과목: ' + g.cutSubjects.join(', ') + ' (' + X().CUT + '점 미만이면 평균이 높아도 불합격이야)') : null,
        h(
          'div',
          { class: 'rows' },
          g.per.map((p) =>
            h(
              'div',
              { class: 'row' },
              h('div', { class: 'row-head' }, h('span', { class: 'name' }, p.name), h('span', { class: 'right' + (p.score < X().CUT ? ' bad-text' : '') }, p.score + '점 (' + p.ok + '/' + p.n + ')')),
              h('div', { class: 'bar cut' + (p.score < X().CUT ? ' low' : '') }, h('i', { style: 'width:' + p.score + '%' }), h('b', { class: 'cutline', style: 'left:' + X().CUT + '%', title: '과락선 ' + X().CUT + '점' }))
            )
          )
        ),
        h(
          'div',
          { class: 'actions' },
          g.wrong.length
            ? h('button', { class: 'btn primary', id: 'ex-review-wrong', onclick: () => { stopExamTimer(); view.mode = 'review'; view.ex = null; view.reviewQueue = g.wrong.slice(); nextQuestion(); render(); window.scrollTo(0, 0); } }, '틀린 문제 다시 풀기 (' + g.wrong.length + ')')
            : null,
          h('button', { class: 'btn', id: 'ex-new', onclick: () => startExam(false) }, '새 모의고사'),
          h('button', { class: 'btn soft', id: 'ex-close', onclick: exitExam }, '닫기')
        ),
        h('p', { class: 'note' }, '틀리거나 못 푼 문제는 복습 목록(1일 → 3일 → 7일)에 들어갔어.')
      )
    );
    // 문제별 결과 격자
    const grid = h('div', { class: 'ex-grid-panel' });
    c.paper.sections.forEach((s) => {
      grid.appendChild(h('h3', { class: 'ex-sec' }, s.name));
      const gr = h('div', { class: 'ex-grid' });
      for (let i = s.from; i < s.to; i++) {
        const a = c.answers[i];
        let okk = false;
        try {
          okk = a >= 0 && a === X().answerIndexOf(c.paper.keys[i]);
        } catch (e) {
          okk = false;
        }
        gr.appendChild(
          h('button', { class: 'ex-no ' + (okk ? 'right' : 'wrong'), 'aria-label': i + 1 + '번 ' + (okk ? '정답' : '오답'), title: '눌러서 이 문제를 다시 풀기', onclick: () => { stopExamTimer(); view.mode = 'normal'; view.ex = null; loadKey(c.paper.keys[i]); render(); window.scrollTo(0, 0); } }, String(i + 1))
        );
      }
      grid.appendChild(gr);
    });
    root.appendChild(h('div', { class: 'panel' }, h('h3', { class: 'eyebrow' }, '문제별 결과 (눌러서 다시 풀기)'), grid));
  }

  // 문제풀이 화면 맨 위의 모의고사 입구
  function examEntry() {
    const cur = X().cur.load();
    const hist = X().hist.list();
    const last = hist.length ? hist[hist.length - 1] : null;
    return h(
      'div',
      { class: 'exam-entry', id: 'exam-entry' },
      h('div', null, h('strong', null, '모의고사 (시험모드)'), h('p', { class: 'muted small' }, '5과목 × 20문제 = 100문제 · 150분. 합격은 평균 60점 이상, 과목마다 40점 이상이야.' + (last ? ' 최근 결과: 평균 ' + last.avg + '점 ' + (last.pass ? '합격권' : '불합격') : ''))),
      h(
        'div',
        { class: 'actions' },
        cur && X().remaining(cur) > 0 ? h('button', { class: 'btn primary', id: 'exam-resume', onclick: () => startExam(true) }, '이어서 풀기 (' + cur.answers.filter((a) => a !== -1).length + '/100)') : null,
        h('button', { class: cur && X().remaining(cur) > 0 ? 'btn' : 'btn primary', id: 'exam-start', onclick: () => startExam(false) }, '새 모의고사 시작')
      )
    );
  }

  // 문제 카드의 북마크(별) 버튼
  function bookmarkButton(q) {
    if (!q || !q.key) return null;
    const on = X().book.has(q.key);
    return h(
      'button',
      {
        class: 'bm-btn' + (on ? ' on' : ''),
        id: 'bookmark-btn',
        type: 'button',
        'aria-pressed': String(on),
        'aria-label': on ? '북마크 해제' : '북마크',
        title: on ? '북마크 해제' : '북마크: 나중에 복습 탭에서 다시 풀 수 있어',
        onclick: () => {
          const now = X().book.toggle(q.key);
          toast(now ? '북마크했어. 복습 탭에서 다시 풀 수 있어.' : '북마크를 뺐어.');
          render();
        },
      },
      on ? '★ 북마크됨' : '☆ 북마크'
    );
  }

  // "모르겠어요": 고르지 않고 정답과 풀이를 본다(오답으로 기록되고 복습에 들어가)
  function giveUp() {
    if (view.answered || !view.q) return;
    const before = unlockedSet();
    view.answered = true;
    view.chosen = -1;
    view.event = P.record(S, view.q, false);
    view.unlocked = unlockedSet().filter((id) => before.indexOf(id) === -1);
    save();
    render();
    const v = document.querySelector('.verdict');
    if (v && v.scrollIntoView) v.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // 약점 개념 집중 풀이
  function startWeak(cid) {
    view.mode = 'weak';
    view.weak = { cid };
    nextQuestion();
    goTab('practice');
    window.scrollTo(0, 0);
  }

  // 복습 탭의 북마크 목록
  function bookmarkPanel() {
    const list = X().book.list();
    const rows = list.slice(0, 50).map((key) => {
      let label = key;
      let cname = '';
      try {
        const m = /^([ts]):([a-z0-9-]+)#/.exec(key);
        const cid = m[1] === 't' ? (G.templates[m[2]] || {}).concept : ((G.staticMap[m[2]] || {}).concepts || [])[0];
        cname = cid && concept(cid) ? concept(cid).name : '';
      } catch (e) {
        cname = '';
      }
      return h(
        'div',
        { class: 'row', 'data-bm': key },
        h('div', { class: 'row-head' }, h('span', { class: 'name' }, cname || key), h('span', { class: 'right' }, h('button', { class: 'btn small', onclick: () => { view.mode = 'normal'; loadKey(key); goTab('practice'); window.scrollTo(0, 0); } }, '풀기'), ' ', h('button', { class: 'btn small soft', 'aria-label': '북마크 해제', onclick: () => { X().book.toggle(key); render(); } }, '빼기'))),
        h('div', { class: 'stat-line' }, h('span', null, label))
      );
    });
    return h(
      'div',
      { class: 'panel', id: 'bookmark-panel' },
      h('h2', null, '북마크 (' + list.length + ')'),
      list.length
        ? h('div', null, h('div', { class: 'rows' }, rows), h('div', { class: 'actions' }, h('button', { class: 'btn primary', id: 'bm-all', onclick: () => { view.mode = 'review'; view.reviewQueue = list.slice(); nextQuestion(); goTab('practice'); window.scrollTo(0, 0); } }, '북마크 전부 풀기')))
        : h('p', { class: 'muted small' }, '문제 위의 ☆ 북마크를 누르면 여기에 모여. 다시 보고 싶은 문제를 골라 둬.')
    );
  }

  // 기록 탭: 약점 개념 + 모의고사 기록
  function weakPanel() {
    const rows = G.concepts
      .map((c) => ({ c, st: P.conceptStat(S, c.id) }))
      .filter((x) => x.st.n >= 3 && x.st.c / x.st.n < 1)
      .sort((a, b) => a.st.c / a.st.n - b.st.c / b.st.n || b.st.n - a.st.n)
      .slice(0, 5);
    return h(
      'div',
      { class: 'panel', id: 'weak-panel' },
      h('h2', null, '약점 개념 TOP 5'),
      rows.length
        ? h(
            'div',
            { class: 'rows' },
            rows.map((x, i) =>
              h(
                'div',
                { class: 'row', 'data-weak': x.c.id },
                h('div', { class: 'row-head' }, h('span', { class: 'name' }, i + 1 + '. ' + x.c.name), h('span', { class: 'right bad-text' }, Math.round((x.st.c / x.st.n) * 100) + '% (' + x.st.c + '/' + x.st.n + ')')),
                h('div', { class: 'stat-line' }, h('span', { class: 'muted small' }, subjectName(x.c.subject)), h('button', { class: 'btn small', onclick: () => startWeak(x.c.id) }, '바로 풀기'))
              )
            )
          )
        : h('p', { class: 'muted small' }, '아직 3문제 이상 푼 개념 중에 틀린 게 없어. 더 풀면 가장 약한 개념 5개를 여기서 바로 풀 수 있게 보여 줄게.')
    );
  }
  function examHistoryPanel() {
    const hs = X().hist.list().slice(-5).reverse();
    if (!hs.length) return null;
    const lastH = hs[0];
    return h(
      'div',
      { class: 'panel', id: 'exam-history' },
      h('h2', null, '모의고사 기록'),
      h('p', { class: 'muted small' }, '가장 최근: ' + new Date(lastH.t).toLocaleDateString('ko-KR') + ' · 평균 ' + lastH.avg + '점 · ' + (lastH.pass ? '합격권' : '불합격')),
      h(
        'div',
        { class: 'rows' },
        lastH.per.map((p) =>
          h(
            'div',
            { class: 'row' },
            h('div', { class: 'row-head' }, h('span', { class: 'name' }, p.name), h('span', { class: 'right' + (p.score < X().CUT ? ' bad-text' : '') }, p.score + '점')),
            h('div', { class: 'bar cut' + (p.score < X().CUT ? ' low' : '') }, h('i', { style: 'width:' + p.score + '%' }), h('b', { class: 'cutline', style: 'left:' + X().CUT + '%' }))
          )
        )
      ),
      hs.length > 1 ? h('p', { class: 'muted small' }, '이전 시험: ' + hs.slice(1).map((e) => e.avg + '점').join(' · ')) : null
    );
  }

  // ───────── 기출 CBT 반복 (내 기출 보관함) ─────────
  const KG = () => G.kigeum;
  function startKigeum(filter) {
    view.mode = 'kigeum';
    view.kg = { filter: Object.assign({ s: 0, cid: null, from: 0 }, filter || {}), q: null, answered: false, chosen: -1 };
    kigeumNext();
    goTab('practice');
  }
  // 연속 3정답 보너스: 같은 개념의 기출·CBT를 최대 3문제 풀고 원래 하던 곳으로 돌아간다
  function startKigeumSet(cid) {
    const back = { mode: view.mode };
    view.mode = 'kigeum';
    view.kg = { filter: { s: 0, cid, from: 0 }, q: null, answered: false, chosen: -1, back, set: { n: Math.min(3, KG().conceptCount(cid)), done: 0, right: 0 } };
    view.kgNext = null;
    kigeumNext();
    goTab('practice');
    window.scrollTo(0, 0);
  }
  function finishKigeumSet() {
    const k = view.kg;
    const back = k && k.back ? k.back.mode : 'normal';
    const msg = k && k.set ? '기출·CBT ' + k.set.n + '문제 중 ' + k.set.right + '문제 맞혔어!' : '';
    view.mode = back === 'kigeum' || back === 'exam' ? 'normal' : back;
    view.kg = null;
    nextQuestion();
    render();
    window.scrollTo(0, 0);
    if (msg) toast(msg);
  }
  function exitKigeum() {
    view.mode = 'normal';
    view.kg = null;
    nextQuestion();
    render();
    window.scrollTo(0, 0);
  }
  function kigeumNext() {
    resetTools();
    const k = view.kg;
    k.q = KG().pick(k.filter, null, k.q && k.q.id);
    k.answered = false;
    k.chosen = -1;
  }
  function kigeumAnswer(i) {
    const k = view.kg;
    if (!k || !k.q || k.answered) return;
    k.answered = true;
    k.chosen = i;
    if (k.set) {
      k.set.done += 1;
      if (i + 1 === k.q.a) k.set.right += 1;
    }
    KG().record(k.q.id, i + 1 === k.q.a);
    kgxLoad(k.q, i);
    render();
    const v = document.querySelector('.verdict');
    if (v && v.scrollIntoView) v.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  // 아예 모를 때: 보기를 고르지 않고 정답과 해설부터 본다(틀린 것으로 기록해서 나중에 다시 나옴)
  function kigeumPeek() {
    const k = view.kg;
    if (!k || !k.q || k.answered) return;
    k.answered = true;
    k.chosen = -1;
    if (k.set) k.set.done += 1;
    KG().record(k.q.id, false);
    kgxLoad(k.q, -1);
    render();
    const v = document.querySelector('.verdict');
    if (v && v.scrollIntoView) v.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function kgFilterLabel(f) {
    const parts = [];
    if (f.cid) parts.push(concept(f.cid).name);
    if (f.rest) parts.push('단락 없는 기출' + (f.topic ? ' · ' + KG().topicName(f.topic) : ''));
    if (f.s) parts.push(KG().SUBJECTS[f.s]);
    if (f.from) parts.push(f.from + '년 이후');
    return parts.length ? parts.join(' · ') : '전체 기출';
  }

  // ───────── 기출 해설: 맞히든 틀리든 AI가 달아 준다 ─────────
  const KGX_KEY = 'gisa-kg-expl';
  const kgxRead = () => lsGet(KGX_KEY) || {};
  function kgxSave(id, text) {
    const m = kgxRead();
    delete m[id];
    m[id] = text;
    const keys = Object.keys(m);
    keys.slice(0, Math.max(0, keys.length - 300)).forEach((k) => delete m[k]);
    lsSet(KGX_KEY, m);
  }
  function kgxPrompt(q, chosen) {
    const lines = [
      '너는 한국 전기기사 필기시험을 준비하는 학생의 튜터야. 학생은 이론을 거의 몰라. 아래 기출문제의 해설을 써 줘.',
      '규칙:',
      '- 반말(~야, ~해)로, 쉬운 말과 일상 비유로. 전문용어는 처음 나올 때 한 번 풀어 줘.',
      '- 마크다운 표·제목·굵게(**)는 쓰지 말고, 아래 번호 순서의 짧은 글로 써.',
      '- "정답"으로 주어진 번호를 기준으로 설명해. 다만 계산해 보니 그 보기가 도저히 안 나오거나 개념과 어긋나면 지어내서 맞추지 말고 "이 정답은 확인이 필요해"라고 솔직히 말해.',
      '- 확실하지 않은 공식·수치는 지어내지 말고 "확실하지 않아"라고 말해.',
      '형식:',
      '1) 정답과 한 줄 이유',
      '2) 핵심 개념을 쉬운 말로 (필요하면 비유 하나)',
      '3) 풀이 과정 (계산 문제면 식과 숫자를 단계별로, 개념 문제면 판단 순서)',
      '4) 나머지 보기가 왜 아닌지 한 줄씩',
      '5) 기억할 점 한 줄',
      '',
      '[기출문제] ' + KG().SUBJECTS[q.s] + ' · ' + q.exam + ' ' + q.n + '번',
      q.q,
    ];
    q.c.forEach((c, i) => lines.push(NUMS[i] + ' ' + c));
    lines.push('정답(출처 자료 기준): ' + q.a + '번');
    lines.push(chosen < 0 ? '학생은 문제를 전혀 몰라서 답을 고르지 않고 해설부터 보려고 해. 처음 배우는 사람 눈높이로 천천히 설명해 줘.' : '학생이 고른 답: ' + (chosen + 1) + '번 (' + (chosen + 1 === q.a ? '맞혔어' : '틀렸어') + ')');
    return lines.join('\n');
  }
  let kgxCtl = null;
  function kgxLoad(q, chosen) {
    const k = view.kg;
    if (kgxCtl) kgxCtl.abort();
    kgxCtl = null;
    const cached = kgxRead()[q.id];
    if (cached) {
      k.expl = { id: q.id, state: 'done', text: cached };
      return;
    }
    if (!G.aiTutor || !G.aiTutor.available()) {
      k.expl = { id: q.id, state: 'none', text: '' };
      return;
    }
    k.expl = { id: q.id, state: 'loading', text: '' };
    kgxCtl = new AbortController();
    const mine = k.expl;
    G.aiTutor
      .ask(kgxPrompt(q, chosen), {
        signal: kgxCtl.signal,
        onText: (t) => {
          mine.text = t;
          const el = document.getElementById('kg-expl-body');
          if (el && view.kg && view.kg.expl === mine) el.textContent = t;
        },
      })
      .then((res) => {
        mine.state = 'done';
        mine.text = res.text;
        kgxSave(q.id, res.text);
        if (view.kg && view.kg.expl === mine) render();
      })
      .catch((e) => {
        if (e && e.code === 'cancelled') return;
        mine.state = 'error';
        if (view.kg && view.kg.expl === mine) render();
      });
  }
  function kgExplainBlock(k, q) {
    const x = k.expl;
    if (!x || x.id !== q.id) return null;
    if (x.state === 'none') return h('p', { class: 'note', id: 'kg-expl-none' }, 'AI 해설은 claude.ai에서 열었을 때 나와. 지금은 정답만 보여 줄게.');
    return h(
      'section',
      { class: 'ex kg-expl', id: 'kg-expl' },
      h('h3', null, 'AI 해설'),
      x.state === 'error'
        ? h('p', { class: 'note' }, '해설을 불러오지 못했어. ', h('button', { class: 'btn small', id: 'kg-expl-retry', onclick: () => { kgxLoad(q, k.chosen); render(); } }, '다시 시도'))
        : h('p', { class: 'kg-expl-body', id: 'kg-expl-body' }, x.text || '해설을 쓰는 중…'),
      x.state === 'done' ? h('p', { class: 'muted small' }, 'AI가 쓴 해설이라 틀릴 수 있어. 기출 원문에는 공식 해설이 없고, 정답은 가져온 자료를 따랐어.') : null
    );
  }

  function renderKigeum(root) {
    const k = view.kg;
    const f = k.filter;
    const sum = KG().summary(f);
    const subjSel = h(
      'select',
      { id: 'kg-subject', 'aria-label': '기출 과목', onchange: (e) => { f.s = Number(e.target.value); f.cid = null; f.topic = null; kigeumNext(); render(); } },
      h('option', { value: '0' }, '전체 과목'),
      Object.keys(KG().SUBJECTS).map((n) => h('option', { value: n }, KG().SUBJECTS[n]))
    );
    subjSel.value = String(f.s);
    const yr = KG().years();
    const yearSel = h(
      'select',
      { id: 'kg-year', 'aria-label': '기출 연도', onchange: (e) => { f.from = Number(e.target.value); kigeumNext(); render(); } },
      h('option', { value: '0' }, '모든 연도'),
      [2010, 2015, 2018, 2020].filter((y) => yr && yr.max >= y).map((y) => h('option', { value: String(y) }, y + '년 이후'))
    );
    yearSel.value = String(f.from);
    root.appendChild(
      h(
        'div',
        { class: 'panel' },
        h('h2', null, '기출 CBT 반복'),
        h('p', { class: 'muted small' }, kgFilterLabel(f) + ' · 풀 수 있는 문제 ' + sum.total + '개 · 푼 문제 ' + sum.tried + '개 중 마지막에 맞힌 것 ' + sum.right + '개. 안 푼 문제 → 틀린 문제 순으로 먼저 나와.'),
        h('div', { class: 'field kg-filters' }, subjSel, yearSel),
        f.cid ? h('div', { class: 'chips' }, h('button', { class: 'chip', id: 'kg-clear-cid', onclick: () => { f.cid = null; kigeumNext(); render(); } }, concept(f.cid).name + ' ✕')) : null,
        f.rest ? h('div', { class: 'chips' }, h('button', { class: 'chip', id: 'kg-clear-rest', onclick: () => { f.rest = false; f.topic = null; kigeumNext(); render(); } }, '단락 없는 기출' + (f.topic ? ' · ' + KG().topicName(f.topic) : '') + ' ✕')) : null,
        k.set ? h('p', { class: 'note', id: 'kg-set-note' }, '연속 3정답 보너스 · 기출·CBT ' + k.set.n + '문제 중 ' + k.set.done + '문제 풀었어 (맞힌 ' + k.set.right + '개)') : null,
        h(
          'div',
          { class: 'actions' },
          h('button', { class: 'btn', id: 'kg-exit', onclick: k.set ? finishKigeumSet : exitKigeum }, k.set ? '← 원래 문제로 돌아가기' : '← 문제풀이로 돌아가기'),
          k.q ? k.q.cids.map((cid) => h('button', { class: 'btn small soft', 'data-unit-top': cid, onclick: () => { view.mode = 'normal'; view.kg = null; openUnit(cid); } }, '단락 보기: ' + concept(cid).name)) : null
        )
      )
    );
    const q = k.q;
    if (!q) {
      root.appendChild(h('div', { class: 'empty', id: 'kg-empty' }, '이 조건에 맞는 기출 문제가 없어. 과목이나 연도를 바꿔 봐.'));
      return;
    }
    const ok = k.answered && k.chosen + 1 === q.a;
    const st = KG().stat(q.id);
    root.appendChild(
      h(
        'article',
        { class: 'qcard kg-card', 'aria-live': 'polite', 'data-kg': q.id },
        h(
          'div',
          { class: 'qmeta' },
          h('span', { class: 'tag' }, KG().SUBJECTS[q.s]),
          h('span', { class: 'tag plain' }, '기출 ' + q.exam + ' · ' + q.n + '번'),
          q.p !== null ? h('span', { class: 'tag plain' }, '정답률 ' + q.p + '%') : null,
          !k.answered ? h('button', { class: 'btn small soft kg-peek', id: 'kg-peek', onclick: kigeumPeek }, '해설 보기') : null,
          q.f > 1 ? h('span', { class: 'tag plain' }, q.f + '회 출제') : null,
          st && !k.answered ? h('span', { class: 'tag review' }, st.last ? '전에 맞힘' : '전에 틀림') : null
        ),
        h('p', { class: 'qtext' }, q.q),
        h(
          'ol',
          { class: 'choices' },
          q.c.map((label, i) => {
            let cls = 'choice';
            if (k.answered) cls += i + 1 === q.a ? ' is-correct' : i === k.chosen ? ' is-wrong' : ' is-dim';
            return h('li', null, h('button', { class: cls, disabled: k.answered, onclick: () => kigeumAnswer(i), 'data-i': i }, h('span', { class: 'no' }, NUMS[i]), h('span', { class: 'lab' }, label)));
          })
        ),
        k.answered
          ? h(
              'div',
              null,
              h('div', { class: 'verdict ' + (ok ? 'ok' : 'bad'), role: 'status' }, ok ? '정답!' : k.chosen < 0 ? '모르면 해설로 배우면 돼' : '아쉽다, 오답이야', h('small', null, '정답은 ' + NUMS[q.a - 1] + '번 · ' + q.c[q.a - 1])),
              kgExplainBlock(k, q),
              q.cids.length
                ? h(
                    'div',
                    { class: 'actions' },
                    q.cids.map((cid) => h('button', { class: 'btn small soft', 'data-unit': cid, onclick: () => { view.mode = 'normal'; view.kg = null; openUnit(cid); } }, '이 개념 공부: ' + concept(cid).name))
                  )
                : null,
              h(
                'div',
                { class: 'actions' },
                k.set && k.set.done >= k.set.n
                  ? h('button', { class: 'btn primary', id: 'kg-finish', onclick: finishKigeumSet }, '기출 ' + k.set.n + '문제 끝 (' + k.set.right + '개 정답) · 돌아가기')
                  : h('button', { class: 'btn primary', id: 'kg-next', onclick: () => { kigeumNext(); render(); window.scrollTo(0, 0); } }, k.set ? '다음 기출 (' + k.set.done + '/' + k.set.n + ')' : '다음 기출')
              )
            )
          : null
      )
    );
  }

  // 연습 화면 맨 위의 기출 입구
  function kigeumEntry() {
    if (!KG()) return null;
    const n = KG().count();
    if (!n) {
      return h('p', { class: 'muted small kg-hint', id: 'kg-hint' }, '내가 가진 기출·CBT 문제 파일이 있으면 ', h('button', { class: 'btn small', onclick: () => goTab('settings') }, '설정 → 내 기출 보관함'), '에서 가져와서 여기서 반복해 풀 수 있어.');
    }
    return h('div', { class: 'actions kg-entry' }, h('button', { class: 'btn', id: 'kg-open', onclick: () => startKigeum({}) }, '기출 CBT 풀기 (' + n + '문제)'));
  }

  // 설정: 내 기출 보관함
  function kigeumSettings() {
    const n = KG().count();
    const yr = KG().years();
    const m = view.kgMsg;
    const file = h('input', {
      type: 'file',
      id: 'kg-file',
      accept: 'application/json,.json',
      onchange: async (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        try {
          const text = await f.text();
          const r = await KG().importText(text);
          view.kgMsg = { ok: true, text: r.added + '문제를 보관함에 넣었어' + (r.skipped ? ' (쓸 수 없는 ' + r.skipped + '개는 건너뜀)' : '') + '.' };
        } catch (err) {
          view.kgMsg = { ok: false, text: err.message || String(err) };
        }
        render();
      },
    });
    return h(
      'div',
      { class: 'panel kg-bank' },
      h('p', { class: 'muted small' }, '기출·CBT 문제 파일(JSON)을 가져오면 이 브라우저에만 저장돼. 사이트나 서버에는 올라가지 않고, 공유 링크로도 새지 않아. 다른 기기에서 쓰려면 거기서도 가져와야 해.'),
      h('p', null, n ? h('strong', null, '보관함 ' + n + '문제' + (yr ? ' · ' + yr.min + '~' + yr.max + '년' : '')) : '보관함이 비어 있어.'),
      h('div', { class: 'field' }, h('label', { for: 'kg-file' }, '기출 문제 파일 가져오기'), file),
      m && m.text ? h('p', { class: 'msg ' + (m.ok ? 'ok' : 'err'), id: 'kg-msg', role: 'status' }, m.text) : null,
      n
        ? h(
            'div',
            { class: 'actions' },
            h('button', { class: 'btn', id: 'kg-reclass', onclick: async () => { await KG().reclassify(); view.kgMsg = { ok: true, text: '개념 연결을 다시 계산했어.' }; render(); } }, '개념 연결 다시 계산'),
            h('button', { class: 'btn', id: 'kg-clear', onclick: async () => { await KG().clear(); view.kgMsg = { ok: true, text: '보관함을 비웠어.' }; render(); } }, '보관함 비우기')
          )
        : null
    );
  }

  function renderPractice(root) {
    if (view.mode === 'kigeum' && view.kg) return renderKigeum(root);
    if (view.mode === 'exam' && view.ex) return renderExam(root);
    root.appendChild(h('div', { class: 'panel' }, subjectChips(), lockBar(), subjectReady() && view.mode !== 'review' && view.mode !== 'drill' ? conceptPicker() : null, view.mode === 'normal' ? examEntry() : null, view.mode === 'normal' ? kigeumEntry() : null));
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
    rememberScroll();
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
        starLegend(),
        animGallery(),
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
                  h('span', { class: 'name' }, c ? starBadge(c.id) : null, l.title, c ? animBadge(c.id) : null),
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
    root.appendChild(h('button', { class: 'btn small back', id: 'lesson-back', onclick: () => { rememberScroll(); view.lessonId = null; render(); backScroll(); } }, '← 레슨 목록'));
    const art = h(
      'article',
      { class: 'lesson' },
      h('span', { class: 'eyebrow' }, l.part + ' · ' + (idx + 1) + '/' + G.lessons.length),
      h('h2', null, l.title),
      h('p', { class: 'goal' }, '이번 목표: ' + l.goal),
      animButton(l.concept),
      c ? conceptFigures(c.id) : null,
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
    rememberScroll();
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

  // "이 포인트 문제만 반복" 옆: 이 개념에 이어진 기출 문제 반복(기출은 개념 단위로 이어 붙임)
  function kigeumPointButton(cid) {
    if (!KG()) return null;
    const total = KG().count();
    if (!total) return h('button', { class: 'btn', id: 'kg-point-' + cid, 'data-kg-point': cid, onclick: () => goTab('settings') }, '기출 CBT 반복 (가져오기 필요)');
    const n = KG().conceptCount(cid);
    if (!n) return h('button', { class: 'btn', disabled: true, 'data-kg-point': cid }, '기출 CBT 반복 (이어진 기출 없음)');
    return h('button', { class: 'btn', 'data-kg-point': cid, onclick: () => startKigeum({ cid }) }, '기출 CBT 반복 (' + n + '문제)');
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
        starLegend(),
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
                h('span', { class: 'row-head' }, h('span', { class: 'name' }, starBadge(c.id), c.name, animBadge(c.id)), h('span', { class: 'right' }, h('span', { class: 'state ' + (cp.total && cp.mastered === cp.total ? 'open' : 'locked') }, '포인트 ' + cp.mastered + '/' + cp.total))),
                h('span', { class: 'bar' + (cp.mastered === 0 ? '' : '') }, h('i', { style: 'width:' + (cp.total ? Math.round((100 * cp.mastered) / cp.total) : 0) + '%' })),
                h('span', { class: 'stat-line' }, h('span', null, st.n + '문제 풀이'), h('span', null, '정답률 ' + pct(st.c, st.n)))
              );
            })
        )
      );
    });
    restKigeumSection(root, sj.id);
  }

  // 개념 단락이 없는 기출: 과목마다 주제별로 묶어서 이어 풀기(문제마다 AI 해설이 나옴)
  function restKigeumSection(root, sid) {
    if (!KG() || !KG().count()) return;
    const sn = { em: 1, power: 2, machine: 3, circuit: 4 }[sid];
    if (!sn) return;
    const topics = KG().restTopics(sn);
    if (!topics.length) return;
    const total = topics.reduce((a, t) => a + t.n, 0);
    root.appendChild(h('h3', { class: 'group-title eyebrow', id: 'rest-title' }, '개념 단락이 없는 기출 (' + total + '문제)'));
    root.appendChild(h('p', { class: 'muted small' }, '위 단락들 어디에도 이어지지 않은 기출이야. 주제별로 이어 풀고, 풀 때마다 AI 해설로 공부해.'));
    root.appendChild(
      h(
        'div',
        { class: 'rows' },
        h('button', { class: 'row lesson-row', 'data-rest': 'all', onclick: () => { rememberScroll(); view.restTopic = { s: sn, id: null }; render(); window.scrollTo(0, 0); } }, h('span', { class: 'row-head' }, h('span', { class: 'name' }, '전부 모아서 풀기'), h('span', { class: 'right muted small' }, total + '문제'))),
        topics.map((t) => {
          const sm = KG().summary({ s: sn, rest: true, topic: t.id });
          return h(
            'button',
            { class: 'row lesson-row', 'data-rest': t.id, onclick: () => { rememberScroll(); view.restTopic = { s: sn, id: t.id }; render(); window.scrollTo(0, 0); } },
            h('span', { class: 'row-head' }, h('span', { class: 'name' }, t.name), h('span', { class: 'right muted small' }, t.n + '문제')),
            h('span', { class: 'bar' }, h('i', { style: 'width:' + (t.n ? Math.round((100 * sm.right) / t.n) : 0) + '%' })),
            h('span', { class: 'stat-line' }, h('span', null, '푼 문제 ' + sm.tried), h('span', null, '마지막에 맞힌 ' + sm.right))
          );
        })
      )
    );
  }

  // 포인트 제목 옆 ▶: 그 포인트와 가장 가까운 3D 장면(구간)을 바로 재생
  function animPointButton(p, cid) {
    if (!G.anim3d || !G.anim3d.pointInfo) return null;
    const info = G.anim3d.pointInfo(p.id, cid);
    if (!info) return null;
    return h('button', { class: 'btn small soft anim-point', type: 'button', 'data-anim': p.id, title: '3D로 보기' + (info.label ? ' · ' + info.label : ''), 'aria-label': p.t + ' 3D로 보기', onclick: () => G.anim3d.openPoint(p.id, cid) }, '▶ 3D');
  }

  // 목록 줄 앞의 "▶3D" 표시: 이 단락에는 3D 장면이 있다는 뜻
  function animBadge(cid) {
    return G.anim3d && G.anim3d.has(cid) ? h('span', { class: 'anim-badge', title: '3D 설명 장면이 있어' }, '3D') : null;
  }
  // 3D 장면 모아보기: 어떤 장면이 있는지 한눈에 보고 바로 재생
  function animGallery() {
    if (!G.anim3d || !G.anim3d.list().length) return null;
    return h(
      'div',
      { class: 'anim-gallery', id: 'anim-gallery' },
      h('div', { class: 'anim-gallery-title' }, '▶ 3D로 볼 수 있는 장면 ' + G.anim3d.list().length + '개'),
      h('div', { class: 'chips' }, G.anim3d.list().map((id) => h('button', { class: 'chip anim-chip', type: 'button', 'data-scene': id, onclick: () => G.anim3d.openScene(id) }, G.anim3d.scene(id).title)))
    );
  }

  // 이 개념에 3D 설명 애니메이션이 있으면 레슨 위에 재생 버튼을 보여 준다
  function animButton(cid) {
    if (!cid || !G.anim3d || !G.anim3d.has(cid)) return null;
    return h('div', { class: 'actions' }, h('button', { class: 'btn', id: 'anim-btn-lesson', type: 'button', onclick: () => G.anim3d.open(cid) }, '▶ 3D로 보기'));
  }

  // ───────── Why?: 풀이 핵심이 왜 그렇게 되는지 원리를 팝업으로 자세히 ─────────
  const WHY_KEY = 'gisa-why';
  const whyRead = () => lsGet(WHY_KEY) || {};
  function whySave(id, text) {
    const m = whyRead();
    delete m[id];
    m[id] = text;
    const keys = Object.keys(m);
    keys.slice(0, Math.max(0, keys.length - 150)).forEach((k) => delete m[k]);
    lsSet(WHY_KEY, m);
  }
  function whyPrompt(p, c) {
    return [
      '너는 한국 전기기사 필기시험을 준비하는 학생의 튜터야. 학생은 이론을 거의 몰라. 아래 "풀이 핵심"이 왜 그렇게 되는지 원리를 처음부터 자세히 설명해 줘.',
      '규칙:',
      '- 반말(~야, ~해)로, 쉬운 말과 일상 비유로. 전문용어는 처음 나올 때 한 번 풀어 줘.',
      '- 마크다운 표·제목·굵게(**)는 쓰지 말고, 아래 번호 순서의 짧은 글로 써.',
      '- 식은 "어디서 나왔는지"를 한 단계씩 유도해 줘. 식에 나오는 문자마다 뜻과 단위를 말해 줘.',
      '- 확실하지 않은 공식·수치는 지어내지 말고 "확실하지 않아"라고 말해.',
      '형식:',
      '1) 한 줄 결론',
      '2) 왜 그렇게 되는지 (원리와 유도 과정을 단계별로)',
      '3) 쉬운 비유 하나',
      '4) 숫자 예시 하나 (계산 과정 포함)',
      '5) 자주 하는 착각 한 줄',
      '',
      '[개념] ' + c.name,
      '[개념 한 줄 설명] ' + (c.card || ''),
      '[포인트] ' + p.t + ' — ' + p.ask,
      '[풀이 핵심] ' + p.key,
      '[자주 틀리는 곳] ' + p.trap,
    ].join('\n');
  }
  let whyCtl = null;
  function closeWhy() {
    if (whyCtl) whyCtl.abort();
    whyCtl = null;
    const o = document.getElementById('why-overlay');
    if (o) o.remove();
    document.body.classList.remove('why-open');
    if (whyOpener && whyOpener.focus) whyOpener.focus();
    whyOpener = null;
  }
  let whyOpener = null;
  function openWhy(p, cid) {
    closeWhy();
    whyOpener = document.activeElement;
    const c = concept(cid) || {};
    const pid = p.id;
    const text = h('div', { class: 'why-text', id: 'why-text' });
    const foot = h('p', { class: 'muted small why-foot' });
    const overlay = h(
      'div',
      { class: 'why-overlay', id: 'why-overlay', onclick: (e) => { if (e.target === overlay) closeWhy(); } },
      h(
        'div',
        { class: 'why-pop', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Why? ' + p.t },
        h('div', { class: 'why-head' }, h('strong', null, 'Why? ' + p.t), h('button', { class: 'btn small', id: 'why-close', type: 'button', onclick: closeWhy }, '닫기')),
        h('div', { class: 'box formula-box' }, h('span', { class: 'eyebrow' }, '풀이 핵심'), h('p', null, p.key)),
        text,
        foot
      )
    );
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeWhy(); });
    document.body.appendChild(overlay);
    document.body.classList.add('why-open');
    const fin = (t) => {
      text.textContent = t;
      if (G.mathUi) G.mathUi.typeset(text);
    };
    const basic = () => {
      // AI 없이 볼 수 있는 기본 설명: 개념 카드·비유·공식
      text.textContent = '';
      [c.card, c.analogy ? '비유: ' + c.analogy : '', c.formula ? '공식: ' + c.formula : '', c.remember ? '기억할 점: ' + c.remember : ''].filter(Boolean).forEach((t) => text.appendChild(h('p', null, t)));
      if (G.mathUi) G.mathUi.typeset(text);
      foot.textContent = 'AI 연결이 되면(claude.ai에서 열었을 때) 이 포인트의 원리를 유도 과정까지 자세히 설명해 줘.';
    };
    const cached = whyRead()[pid];
    if (cached) {
      fin(cached);
      foot.textContent = '한 번 받은 설명은 저장해 두었어. AI가 쓴 설명이라 틀릴 수 있어.';
    } else if (!G.aiTutor || !G.aiTutor.available()) {
      basic();
    } else {
      text.textContent = '설명을 쓰는 중…';
      whyCtl = new AbortController();
      const mine = whyCtl;
      G.aiTutor
        .ask(whyPrompt(p, c), { signal: mine.signal, onText: (t) => { if (document.getElementById('why-text') === text) text.textContent = t; } })
        .then((res) => {
          whySave(pid, res.text);
          if (document.getElementById('why-text') === text) {
            fin(res.text);
            foot.textContent = 'AI가 쓴 설명이라 틀릴 수 있어. 이상하면 위의 풀이 핵심과 개념 설명을 믿어 줘.';
          }
        })
        .catch((e) => {
          if (e && e.code === 'cancelled') return;
          if (document.getElementById('why-text') !== text) return;
          basic();
          foot.textContent = '설명을 불러오지 못해서 기본 설명을 보여 줘. 잠시 뒤에 다시 눌러 봐.';
        });
    }
    const x = document.getElementById('why-close');
    if (x) x.focus();
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

    root.appendChild(h('button', { class: 'btn small back', id: 'unit-back', onclick: () => { rememberScroll(); view.unitCid = null; render(); backScroll(); } }, '← ' + sj.short + ' 단원 목록'));
    const kids = [
      h('span', { class: 'eyebrow' }, sj.name + ' · ' + c.group),
      h('h2', null, starBadge(c.id), c.name),
      (() => {
        const k = kgStar(c.id);
        return starsOn() && k && k.stars ? h('p', { class: 'muted small', id: 'kgstar-line' }, '기출 빈출 ' + '★'.repeat(k.stars) + ' · 가져온 기출 중 ' + k.n + '문제(과목의 ' + k.pct + '%)가 이 개념이야.') : null;
      })(),
      l ? h('p', { class: 'goal' }, '이번 목표: ' + l.goal) : null,
      progressTile('익숙해진 포인트', cp.mastered, cp.total),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', id: 'drill-all', onclick: () => startDrill(c.id, null) }, '이 단락 전부 섞어서 반복'), G.anim3d && G.anim3d.has(c.id) ? h('button', { class: 'btn', id: 'anim-btn', type: 'button', onclick: () => G.anim3d.open(c.id) }, '▶ 3D로 보기') : null),

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
        h('p', null, c.card),
        conceptFigures(c.id)
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
          h('div', { class: 'point-head' }, h('span', { class: 'lesson-no' }, i + 1), h('h3', null, p.t, animPointButton(p, c.id)), h('span', { class: 'state ' + stt.cls }, stt.text)),
          h('p', { class: 'point-ask' }, p.ask),
          h('div', { class: 'box formula-box' }, h('div', { class: 'box-head' }, h('span', { class: 'eyebrow' }, '풀이 핵심'), h('button', { class: 'btn small soft why-btn', type: 'button', 'data-why': pid, 'aria-label': '풀이 핵심의 원리 자세히 보기', onclick: () => openWhy(p, c.id) }, 'Why?')), h('p', null, p.key)),
          h('div', { class: 'box trap-box' }, h('span', { class: 'eyebrow' }, '자주 틀리는 곳'), h('p', null, p.trap)),
          pointExample(p),
          h(
            'div',
            { class: 'point-foot' },
            h('button', { class: 'btn primary', 'data-drill': pid, onclick: () => startDrill(c.id, pid) }, '이 포인트 문제만 반복'),
            kigeumPointButton(c.id),
            h('span', { class: 'muted small' }, ps.n ? ps.n + '문제 풀이 · 정답 ' + ps.c + '개' : '아직 안 풀었어')
          )
        );
      }),
      h(
        'div',
        { class: 'actions' },
        nextC ? h('button', { class: 'btn', id: 'unit-next', onclick: () => openUnit(nextC.id) }, '다음 단락: ' + nextC.name) : null,
        h('button', { class: 'btn', onclick: () => { rememberScroll(); view.unitCid = null; render(); backScroll(); } }, '단원 목록으로')
      ),
    ];
    root.appendChild(h('article', { class: 'lesson unit' }, kids));
  }

  function renderUnits(root) {
    const c = view.unitCid ? G.conceptMap[view.unitCid] : null;
    if (c) renderUnitDetail(root, c);
    else if (view.restTopic && KG() && KG().count()) renderRestTopic(root, view.restTopic);
    else renderUnitList(root);
  }

  // 단락 없는 기출의 주제 화면: 개념 설명을 먼저 읽고 → 기출 연습
  function renderRestTopic(root, rt) {
    const sjName = { 1: '전기자기학', 2: '전력공학', 3: '전기기기', 4: '회로이론·제어' }[rt.s];
    const subjId = { 1: 'em', 2: 'power', 3: 'machine', 4: 'circuit' }[rt.s];
    const name = rt.id ? KG().topicName(rt.id) : '단락 없는 기출 전부';
    const note = rt.id && G.restNotes ? G.restNotes[rt.id] : null;
    const f = { s: rt.s, rest: true, topic: rt.id || null };
    const sm = KG().summary(f);
    root.appendChild(h('button', { class: 'btn small back', id: 'rest-back', onclick: () => { rememberScroll(); view.restTopic = null; view.unitSubject = subjId; render(); backScroll(); } }, '← ' + sjName + ' 단원 목록'));
    root.appendChild(
      h(
        'section',
        { class: 'panel', id: 'rest-detail' },
        h('span', { class: 'eyebrow' }, sjName + ' · 개념 단락이 없는 기출'),
        h('h2', null, name),
        h('p', { class: 'muted small' }, '기출 ' + sm.total + '문제 · 푼 문제 ' + sm.tried + '개 중 마지막에 맞힌 것 ' + sm.right + '개'),
        h('div', { class: 'actions' }, h('button', { class: 'btn primary', id: 'rest-drill', onclick: () => startKigeum(f) }, '이 주제 기출 풀기 (' + sm.total + '문제)')),
        note
          ? h(
              'section',
              { class: 'lesson-sec' },
              h('h3', null, '1. 개념 설명'),
              h('p', { class: 'goal' }, note.lead),
              h('ul', { class: 'rest-points' }, note.points.map((t) => h('li', null, t))),
              note.tips && note.tips.length ? h('div', { class: 'note' }, h('strong', null, '시험에서 자주 나와: '), note.tips.join(' ')) : null
            )
          : h('p', { class: 'muted' }, '여러 주제가 섞인 기출이라 따로 정리한 개념 설명은 없어. 풀면서 나오는 AI 해설로 공부해.'),
        h('section', { class: 'lesson-sec' }, h('h3', null, note ? '2. 기출 연습' : '기출 연습'), h('p', { class: 'muted small' }, '풀 때마다 맞히든 틀리든 AI 해설이 나와. 안 푼 문제 → 틀린 문제 순으로 먼저 나와.'), h('button', { class: 'btn primary', onclick: () => startKigeum(f) }, '기출 풀기 시작'))
      )
    );
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
    root.appendChild(bookmarkPanel());
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
          : h('div', { class: 'empty' }, '아직 푼 문제가 없어. 문제풀이 탭에서 첫 문제를 풀면 여기에 쌓여.')
      )
    );
    root.appendChild(weakPanel());
    append(root, examHistoryPanel());
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

  // AI에게 물어본 내용 저장 현황(매일 복습 알림이 이걸 읽어 가)
  function renderAiqaSettings(root) {
    if (!G.aiqa) return;
    const st = G.aiqa.status();
    const n = G.aiqa.count();
    root.appendChild(h('h3', { class: 'group-title eyebrow' }, 'AI 질문 복습'));
    root.appendChild(
      h(
        'div',
        { class: 'panel', id: 'aiqa-panel' },
        h('p', { class: 'muted small' }, 'AI에게 물어본 질문과 답은 자동으로 저장돼. 저장된 질문 ' + n + '개' + (G.aiqa.pending() ? ' (클라우드에 올리는 중 ' + G.aiqa.pending() + '개)' : '') + '.'),
        h('p', { class: 'muted small' }, st === 'cloud' ? '클라우드(내 계정에서만 보이는 저장소)에 같이 저장돼. 매일 한 번, 랜덤한 시간에 이 중에서 골라 복습 알림으로 보내 줄 수 있어.' : st === 'local' ? '지금은 이 브라우저에만 저장돼. claude.ai에서 열어야 클라우드에 저장되고 복습 알림이 이걸 읽을 수 있어.' : '저장소 연결을 확인하는 중이야…')
      )
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
    renderUpdateLog(root);
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
    renderAiqaSettings(root);
    renderSyncSettings(root, sw);

    const keyInput = h('input', { type: 'text', id: 'key-input', placeholder: '예: t:ohm-current#12345', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false' });
    if (KG()) {
      root.appendChild(h('h3', { class: 'group-title eyebrow' }, '내 기출 보관함'));
      root.appendChild(kigeumSettings());
    }
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
    if (view.tab === 'practice' && view.mode === 'kigeum') return { kind: 'general', label: '기출 CBT 반복', stats: statsSummary() };
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
    const names = { learn: '배우기 목록', units: '과목별 단원 목록', practice: '문제풀이', review: '복습', stats: '기록', settings: '설정' };
    return { kind: 'general', label: names[view.tab] || '', stats: statsSummary() };
  }

  let pendingBoot = false; // 보던 화면 기록을 가져오는 동안(최대 약 2초) 첫 화면을 그리지 않는다
  function render() {
    if (pendingBoot) return;
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
    rememberView();
  }
  let scrollTimer = null;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(rememberView, 250);
  }, { passive: true });

  // 맥 키보드: 1~4 고르기, Enter/N 다음 문제
  document.addEventListener('keydown', (e) => {
    if (view.tab === 'practice' && view.mode === 'exam' && view.ex && !view.ex.result && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const tg = (e.target && e.target.tagName) || '';
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || (e.target && e.target.closest && e.target.closest('#calc'))) return;
      if (/^[1-4]$/.test(e.key)) {
        examPick(Number(e.key) - 1);
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        examGo(view.ex.c.idx + 1);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        examGo(view.ex.c.idx - 1);
        e.preventDefault();
      }
      return;
    }
    if (view.tab === 'practice' && view.mode === 'kigeum' && view.kg && view.kg.q && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const tg = (e.target && e.target.tagName) || '';
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || (e.target && e.target.closest && e.target.closest('#calc'))) return;
      if (!view.kg.answered && /^[1-4]$/.test(e.key)) {
        kigeumAnswer(Number(e.key) - 1);
        e.preventDefault();
      } else if (view.kg.answered && (e.key === 'Enter' || e.key === 'n' || e.key === 'N')) {
        kigeumNext();
        render();
        window.scrollTo(0, 0);
        e.preventDefault();
      }
      return;
    }
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

  // 첫 화면 정하기: 기억해 둔 자리가 있으면 거기로, 없으면 기본 화면
  function finishBoot(rec) {
    pendingBoot = false;
    restoring = true;
    const back = restoreView(rec);
    if (back && back.kg && back.kg.id && KG() && KG().get(back.kg.id)) {
      const q = KG().get(back.kg.id);
      view.mode = 'kigeum';
      view.kg = { filter: Object.assign({ s: 0, cid: null, from: 0 }, back.kg.f || {}), q, answered: !!back.kg.a, chosen: typeof back.kg.c === 'number' ? back.kg.c : -1, expl: null };
      if (view.kg.answered) kgxLoad(q, view.kg.chosen);
    } else if (!(back && back.tab === 'practice' && view.q)) nextQuestion();
    render();
    restoring = false;
    booting = false;
    if (back && back.exam && G.exam && G.exam.cur.load() && G.exam.remaining(G.exam.cur.load()) > 0) startExam(true);
    if (back && back.y) setTimeout(() => window.scrollTo(0, back.y), 60);
    announceUpdate();
    rememberView();
  }

  function start() {
    if (G.kigeum) G.kigeum.load().then(() => render());
    if (!S.settings.theme) S.settings.theme = 'system';
    if (S.total.n === 0 && !Object.keys(S.lessons || {}).length) view.tab = 'learn';
    applyTheme();
    const local = lsGet(VIEW_KEY);
    const hasClaude = () => typeof window.claude !== 'undefined' && window.claude && typeof window.claude.use === 'function';
    // 기출 CBT·단락 없는 기출 화면은 기출 보관함을 읽은 다음에 복원
    const boot = (rec) => {
      if (rec && ((rec.kg && rec.kg.id) || rec.rt) && G.kigeum) {
        pendingBoot = true;
        const done = () => finishBoot(rec);
        G.kigeum.load().then(done, done);
      } else finishBoot(rec);
    };
    const wantCloud = !local && G.sync && G.sync.peek && S.settings.syncOn !== false && (hasClaude() || location.protocol !== 'file:');
    if (wantCloud) {
      pendingBoot = true;
      // 업데이트 직후에는 계정 연결(window.claude)이 조금 늦게 붙을 수 있어서 최대 1.2초 기다린다
      const waitClaude = (left) => (hasClaude() || left <= 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, 100)).then(() => waitClaude(left - 100)));
      waitClaude(1200)
        .then(() => (hasClaude() ? G.sync.peek('view', 1800) : null))
        .then((r) => {
          pendingBoot = false;
          boot(r && Date.now() - (r.t || 0) < 7 * 24 * 3600 * 1000 ? r : null);
        });
    } else boot(local);
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
  G.ui = { startKigeum, openLesson, openUnit, start, _view: view, _state: () => S, _load, _answer: answer, _openLesson: openLesson, _openUnit: openUnit, _startDrill: startDrill, startExam, examPick, examGo, examSubmit, giveUp, startWeak };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(globalThis.GISA);
