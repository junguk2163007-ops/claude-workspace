// 학습 기록 로직(순수 함수). 저장은 storage.js가 맡는다.
(function (G) {
  'use strict';

  const UNLOCK_MIN_ATTEMPTS = 3;
  const UNLOCK_MIN_RATE = 0.6;
  const REVIEW_DAYS = [1, 3, 7]; // 틀림 → 1일 뒤 → (맞히면) 3일 뒤 → (맞히면) 7일 뒤 → (맞히면) 졸업
  const HISTORY_MAX = 500;

  function emptyState() {
    return {
      v: 1,
      settings: { skipOrder: false, mixStatic: true, subject: 'all', focus: 'auto', theme: 'system', allSubjects: true },
      concepts: {},
      streak: { cur: 0, best: 0 },
      total: { n: 0, c: 0 },
      reviews: {},
      history: [],
      lessons: {},
    };
  }

  // 날짜는 기기 현지 기준 'YYYY-MM-DD'
  function today(d) {
    const x = d || new Date();
    const p = (k) => String(k).padStart(2, '0');
    return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate());
  }

  function addDays(day, k) {
    const [y, m, d] = day.split('-').map(Number);
    return today(new Date(y, m - 1, d + k));
  }

  function conceptStat(state, id) {
    return state.concepts[id] || { n: 0, c: 0 };
  }

  function prereqMet(state, id) {
    const s = conceptStat(state, id);
    return s.n >= UNLOCK_MIN_ATTEMPTS && s.c / s.n >= UNLOCK_MIN_RATE;
  }

  // 레슨을 읽은 개념도 열린다(읽기 = 레벨업)
  function lessonRead(state, conceptId) {
    const l = G.lessonFor ? G.lessonFor(conceptId) : null;
    return !!(l && state.lessons && state.lessons[l.id]);
  }

  function markLessonRead(state, lessonId) {
    if (!state.lessons) state.lessons = {};
    if (!state.lessons[lessonId]) state.lessons[lessonId] = { t: Date.now() };
  }

  function isUnlocked(state, id) {
    if (state.settings.skipOrder) return true;
    if (lessonRead(state, id)) return true;
    const c = G.conceptMap[id];
    return !!c && c.prereqs.every((p) => prereqMet(state, p));
  }

  // 잠금 해제 조건 진행도: [{id, name, n, rate, met}]
  function unlockStatus(state, id) {
    return G.conceptMap[id].prereqs.map((p) => {
      const s = conceptStat(state, p);
      return { id: p, name: G.conceptMap[p].name, n: s.n, rate: s.n ? s.c / s.n : 0, met: prereqMet(state, p) };
    });
  }

  // 정답 기록. opts.day = 오늘 날짜(테스트용 주입)
  function record(state, q, ok, opts) {
    const day = (opts && opts.day) || today();
    const cs = state.concepts[q.conceptId] || (state.concepts[q.conceptId] = { n: 0, c: 0 });
    cs.n += 1;
    if (ok) cs.c += 1;
    state.total.n += 1;
    if (ok) state.total.c += 1;
    state.streak.cur = ok ? state.streak.cur + 1 : 0;
    state.streak.best = Math.max(state.streak.best, state.streak.cur);

    const rv = state.reviews[q.key];
    let reviewEvent = null;
    if (!ok) {
      state.reviews[q.key] = { k: q.key, cid: q.conceptId, stage: 0, due: addDays(day, REVIEW_DAYS[0]) };
      reviewEvent = rv ? 'reset' : 'added';
    } else if (rv && rv.due <= day) {
      const next = rv.stage + 1;
      if (next >= REVIEW_DAYS.length) {
        delete state.reviews[q.key];
        reviewEvent = 'graduated';
      } else {
        rv.stage = next;
        rv.due = addDays(day, REVIEW_DAYS[next]);
        reviewEvent = 'advanced';
      }
    }
    state.history.push({ k: q.key, cid: q.conceptId, ok: !!ok, t: Date.now() });
    if (state.history.length > HISTORY_MAX) state.history.splice(0, state.history.length - HISTORY_MAX);
    return reviewEvent;
  }

  function dueReviews(state, day) {
    const d = day || today();
    return Object.values(state.reviews)
      .filter((r) => r.due <= d)
      .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  }

  function upcomingReviews(state, day) {
    const d = day || today();
    return Object.values(state.reviews)
      .filter((r) => r.due > d)
      .sort((a, b) => (a.due < b.due ? -1 : 1));
  }

  // 정답률 낮고 덜 푼 개념에 가중치
  function pickConcept(state, ids, rand) {
    const weights = ids.map((id) => {
      const s = conceptStat(state, id);
      let w = 1;
      if (s.n < 5) w += 2;
      if (s.n > 0 && s.c / s.n < UNLOCK_MIN_RATE) w += 2;
      return w;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let x = (rand || Math.random)() * total;
    for (let i = 0; i < ids.length; i++) {
      x -= weights[i];
      if (x < 0) return ids[i];
    }
    return ids[ids.length - 1];
  }

  // 저장본을 현재 형식에 맞춰 채움(필드가 빠졌거나 깨진 경우 대비)
  function normalize(raw) {
    const base = emptyState();
    if (!raw || typeof raw !== 'object') return base;
    const out = base;
    if (raw.settings && typeof raw.settings === 'object') Object.assign(out.settings, raw.settings);
    // 1단계(회로만 있던 때) 저장본은 한 번만 "전체" 과목으로 옮겨 준다
    if (!out.settings.allSubjects) {
      out.settings.subject = 'all';
      out.settings.focus = 'auto';
      out.settings.allSubjects = true;
    }
    if (raw.concepts && typeof raw.concepts === 'object') out.concepts = raw.concepts;
    if (raw.streak) out.streak = { cur: raw.streak.cur | 0, best: raw.streak.best | 0 };
    if (raw.total) out.total = { n: raw.total.n | 0, c: raw.total.c | 0 };
    if (raw.reviews && typeof raw.reviews === 'object') out.reviews = raw.reviews;
    if (Array.isArray(raw.history)) out.history = raw.history.slice(-HISTORY_MAX);
    if (raw.lessons && typeof raw.lessons === 'object') out.lessons = raw.lessons;
    return out;
  }

  G.progress = {
    UNLOCK_MIN_ATTEMPTS,
    UNLOCK_MIN_RATE,
    REVIEW_DAYS,
    emptyState,
    normalize,
    today,
    addDays,
    conceptStat,
    prereqMet,
    isUnlocked,
    lessonRead,
    markLessonRead,
    unlockStatus,
    record,
    dueReviews,
    upcomingReviews,
    pickConcept,
  };
})(globalThis.GISA);
