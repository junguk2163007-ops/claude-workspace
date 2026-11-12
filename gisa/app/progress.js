// 학습 기록 로직(순수 함수). 저장은 storage.js가 맡는다.
(function (G) {
  'use strict';

  const UNLOCK_MIN_ATTEMPTS = 3;
  const UNLOCK_MIN_RATE = 0.6;
  const REVIEW_DAYS = [1, 3, 7]; // 틀림 → 1일 뒤 → (맞히면) 3일 뒤 → (맞히면) 7일 뒤 → (맞히면) 졸업
  const HISTORY_MAX = 500;
  const MASTER_STREAK = 3; // 한 포인트에서 연속 3문제를 맞히면 "익숙해짐"
  // 기기를 넘나들며 합치는 설정. 나머지(화면 테마, 과목 필터, 동기화 켜기)는 기기마다 따로 둔다.
  const SYNC_SETTINGS = ['skipOrder', 'mixStatic'];
  const DONE_MAX = 500;

  function emptyState() {
    return {
      v: 1,
      settings: { skipOrder: false, mixStatic: true, subject: 'all', focus: 'auto', theme: 'system', allSubjects: true, syncOn: true },
      concepts: {},
      streak: { cur: 0, best: 0 },
      total: { n: 0, c: 0 },
      reviews: {},
      history: [],
      lessons: {},
      points: {},
      reviewDone: {}, // 졸업한 복습 {문제 번호: 시각} — 다른 기기에서 되살아나지 않게
      updatedAt: 0, // 기록이 마지막으로 바뀐 시각(ms)
      resetAt: 0, // 기록을 초기화한 시각(ms)
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
      state.reviews[q.key] = { k: q.key, cid: q.conceptId, stage: 0, due: addDays(day, REVIEW_DAYS[0]), u: Date.now() };
      if (state.reviewDone) delete state.reviewDone[q.key];
      reviewEvent = rv ? 'reset' : 'added';
    } else if (rv && rv.due <= day) {
      const next = rv.stage + 1;
      if (next >= REVIEW_DAYS.length) {
        delete state.reviews[q.key];
        if (!state.reviewDone) state.reviewDone = {};
        state.reviewDone[q.key] = Date.now();
        reviewEvent = 'graduated';
      } else {
        rv.stage = next;
        rv.u = Date.now();
        rv.due = addDays(day, REVIEW_DAYS[next]);
        reviewEvent = 'advanced';
      }
    }
    // 포인트(문제 유형)별 기록: 연속 정답을 세어 "익숙해짐"을 판단
    const pid = G.pointId ? G.pointId(q) : null;
    if (pid) {
      if (!state.points) state.points = {};
      const ps = state.points[pid] || (state.points[pid] = { n: 0, c: 0, streak: 0 });
      ps.n += 1;
      if (ok) ps.c += 1;
      ps.streak = ok ? ps.streak + 1 : 0;
    }
    state.history.push({ k: q.key, cid: q.conceptId, ok: !!ok, t: Date.now() });
    if (state.history.length > HISTORY_MAX) state.history.splice(0, state.history.length - HISTORY_MAX);
    return reviewEvent;
  }

  function pointStat(state, pid) {
    return (state.points && state.points[pid]) || { n: 0, c: 0, streak: 0 };
  }
  function pointMastered(state, pid) {
    return pointStat(state, pid).streak >= MASTER_STREAK;
  }
  // 개념 안에서 익숙해진 포인트 수
  function conceptPoints(state, cid) {
    const list = G.pointsFor ? G.pointsFor(cid) : [];
    const pid = (p) => (p.kind === 'static' ? 's:' + p.ref : p.ref);
    return { total: list.length, mastered: list.filter((p) => pointMastered(state, pid(p))).length };
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
    if (raw.points && typeof raw.points === 'object') out.points = raw.points;
    if (raw.reviewDone && typeof raw.reviewDone === 'object') out.reviewDone = raw.reviewDone;
    out.updatedAt = Number(raw.updatedAt) || 0;
    out.resetAt = Number(raw.resetAt) || 0;
    return out;
  }

  // ───────── 기기 간 합치기 ─────────
  // 목적: 아이폰과 맥의 기록을 한 계정으로 이어 쓰기. 원칙은 "잃지 않기".
  //  - 개념·포인트 통계: 문제를 더 많이 푼 쪽(n이 큰 쪽)을 채택
  //  - 읽은 레슨: 합집합, 풀이 기록: 합집합(최근 500개)
  //  - 복습: 합집합. 같은 문제는 더 나중에 바뀐 쪽, 졸업했으면 졸업이 우선
  //  - 초기화(resetAt) 이후 아무 활동이 없는 쪽 기록은 버림
  // local의 기기별 설정(테마 등)은 그대로 두고, 공유 설정은 더 최근 쪽을 따른다.
  function pickBigger(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (b.n > a.n || (b.n === a.n && b.c > a.c)) return b;
    return a;
  }

  function merge(local, remote) {
    const resetAt = Math.max(local.resetAt || 0, remote.resetAt || 0);
    const parts = [local, remote].filter((s) => !resetAt || (s.updatedAt || 0) > resetAt);
    const newest = parts.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    const out = emptyState();
    out.settings = Object.assign({}, local.settings);
    out.resetAt = resetAt;
    out.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0, resetAt);
    if (!parts.length) return out;

    SYNC_SETTINGS.forEach((k) => {
      if (newest.settings && newest.settings[k] !== undefined) out.settings[k] = newest.settings[k];
    });
    ['concepts', 'points'].forEach((f) => {
      parts.forEach((s) => {
        Object.keys(s[f] || {}).forEach((id) => (out[f][id] = pickBigger(out[f][id], s[f][id])));
      });
    });
    out.total = parts.reduce((best, s) => pickBigger(best, s.total), null) || out.total;
    out.streak = { cur: newest.streak.cur, best: Math.max.apply(null, parts.map((s) => s.streak.best)) };
    parts.forEach((s) => {
      Object.keys(s.lessons || {}).forEach((id) => {
        const cur = out.lessons[id];
        if (!cur || (s.lessons[id].t || 0) < (cur.t || 0)) out.lessons[id] = s.lessons[id];
      });
    });
    const seen = {};
    const hist = [];
    parts.forEach((s) =>
      s.history.forEach((e) => {
        const key = e.k + '@' + e.t;
        if (!seen[key]) {
          seen[key] = 1;
          hist.push(e);
        }
      })
    );
    hist.sort((a, b) => a.t - b.t);
    out.history = hist.slice(-HISTORY_MAX);

    // 복습: 키마다 "가장 나중 사건"이 이긴다(졸업 기록 t, 복습 항목 u)
    const keys = {};
    parts.forEach((s) => {
      Object.keys(s.reviews || {}).forEach((k) => (keys[k] = 1));
      Object.keys(s.reviewDone || {}).forEach((k) => (keys[k] = 1));
    });
    Object.keys(keys).forEach((k) => {
      let rv = null;
      let done = 0;
      parts.forEach((s) => {
        const r = s.reviews && s.reviews[k];
        if (r && (!rv || (r.u || 0) > (rv.u || 0) || ((r.u || 0) === (rv.u || 0) && r.stage > rv.stage))) rv = r;
        if (s.reviewDone && s.reviewDone[k] > done) done = s.reviewDone[k];
      });
      if (done && (!rv || done >= (rv.u || 0))) out.reviewDone[k] = done;
      else if (rv) out.reviews[k] = rv;
    });
    const doneKeys = Object.keys(out.reviewDone).sort((a, b) => out.reviewDone[b] - out.reviewDone[a]);
    doneKeys.slice(DONE_MAX).forEach((k) => delete out.reviewDone[k]);
    return out;
  }

  // 기록을 통째로 바꿀 때(초기화·백업 가져오기): 다른 기기의 예전 기록이 되살아나지 않게 초기화 시각을 남긴다
  function replaceAll(state, now) {
    const t = now || Date.now();
    state.resetAt = t;
    state.updatedAt = t + 1;
    return state;
  }

  // 키 순서와 무관한 문자열(같은 내용이면 항상 같은 글). 동기화에서 "바뀌었나?"를 비교할 때 쓴다.
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
    }
    return JSON.stringify(v);
  }

  // 서버에 올릴 모양(기기별 설정은 뺀다)
  function syncView(state) {
    const copy = JSON.parse(JSON.stringify(state));
    const keep = {};
    SYNC_SETTINGS.forEach((k) => (keep[k] = copy.settings[k]));
    copy.settings = keep;
    return copy;
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
    merge,
    canon,
    replaceAll,
    syncView,
    SYNC_SETTINGS,
    isUnlocked,
    MASTER_STREAK,
    pointStat,
    pointMastered,
    conceptPoints,
    lessonRead,
    markLessonRead,
    unlockStatus,
    record,
    dueReviews,
    upcomingReviews,
    pickConcept,
  };
})(globalThis.GISA);
