// 내 기출 보관함: 사용자가 가진 기출·CBT 문제 파일(JSON)을 이 브라우저에 가져와서 반복해 푼다.
//  - 문제는 사이트 코드나 서버에 올라가지 않고, 가져온 사람의 브라우저(IndexedDB)에만 저장된다. (공유 링크로 새지 않음)
//  - 문제 형식: { id, exam:'2019-08-04', s:1~4(과목), n:번호, q:'문제', c:['보기1',…4], a:정답(1~4), p:정답률(선택), f:출제 횟수(선택) }
//  - 가져올 때 글 속의 용어(용어 사전)로 우리 개념에 자동으로 이어 붙인다(개념별 "기출 반복"에 쓰임).
(function (G) {
  'use strict';

  const DB = 'gisa-kigeum';
  const STORE = 'q';
  const STAT_KEY = 'gisa-kigeum-stats';
  const SUBJECTS = { 1: '전기자기학', 2: '전력공학', 3: '전기기기', 4: '회로이론 및 제어공학' };
  const SUBJECT_KEY = { 1: 'em', 2: 'power', 3: 'machine', 4: 'circuit' };

  let items = []; // 불러온 문제
  let byId = {};
  let stats = {};
  let loaded = false;

  try {
    stats = JSON.parse(localStorage.getItem(STAT_KEY) || '{}') || {};
  } catch (e) {
    stats = {};
  }
  const saveStats = () => {
    try {
      localStorage.setItem(STAT_KEY, JSON.stringify(stats));
    } catch (e) {
      /* 못 저장해도 풀 수는 있음 */
    }
  };

  // ───────── 저장소(IndexedDB) ─────────
  function open() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('이 브라우저는 저장소를 쓸 수 없어'));
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(STORE, { keyPath: 'id' });
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error || new Error('저장소를 열지 못했어'));
    });
  }
  const tx = (db, mode) => db.transaction(STORE, mode).objectStore(STORE);
  const wrap = (rq) =>
    new Promise((resolve, reject) => {
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    });

  function index() {
    byId = {};
    items.forEach((x) => (byId[x.id] = x));
  }

  // ───────── 개념 이어 붙이기 ─────────
  // 문제·보기 글에서 용어 사전의 용어를 찾고, 그 용어가 속한 개념에 표를 준다. 과목 안의 개념만 인정한다.
  function classify(x) {
    const text = x.q + ' ' + x.c.join(' ');
    const votes = {};
    if (G.glossary) {
      G.glossary.find(text).forEach((m) => {
        const t = G.glossary.byId[m.id];
        if (!t || !t.concept) return;
        const c = G.concepts.find((k) => k.id === t.concept);
        if (!c || c.subject === 'base') return;
        if (SUBJECT_KEY[x.s] && c.subject !== SUBJECT_KEY[x.s]) return;
        votes[c.id] = (votes[c.id] || 0) + 1;
      });
    }
    return Object.keys(votes)
      .sort((a, b) => votes[b] - votes[a])
      .slice(0, 2);
  }

  function valid(x) {
    return (
      x &&
      typeof x.id === 'string' &&
      SUBJECTS[x.s] &&
      typeof x.q === 'string' &&
      x.q.length >= 4 &&
      x.q.length < 2000 &&
      Array.isArray(x.c) &&
      x.c.length === 4 &&
      x.c.every((c) => typeof c === 'string' && c.length > 0 && c.length < 600) &&
      Number.isInteger(x.a) &&
      x.a >= 1 &&
      x.a <= 4 &&
      !/⟦그림⟧/.test(x.q + x.c.join(''))
    );
  }

  // ───────── 가져오기 / 지우기 ─────────
  async function load() {
    try {
      const db = await open();
      items = await wrap(tx(db, 'readonly').getAll());
      db.close();
    } catch (e) {
      items = [];
    }
    index();
    loaded = true;
    return items.length;
  }

  async function importText(text) {
    let arr;
    try {
      arr = JSON.parse(text);
    } catch (e) {
      throw new Error('JSON 파일이 아니야. 내가 만들어 준 기출 파일을 골라 줘.');
    }
    if (!Array.isArray(arr)) throw new Error('문제 목록이 아니야.');
    const good = [];
    let skipped = 0;
    arr.forEach((x) => {
      if (valid(x)) good.push({ id: x.id, exam: String(x.exam || ''), s: x.s, n: x.n | 0, q: x.q, c: x.c.slice(), a: x.a, p: Number.isFinite(x.p) ? x.p : null, f: Number.isInteger(x.f) && x.f > 1 ? x.f : 1, cids: classify(x) });
      else skipped++;
    });
    if (!good.length) throw new Error('쓸 수 있는 문제가 하나도 없어(' + arr.length + '개 중). 파일을 확인해 줘.');
    const db = await open();
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      const st = t.objectStore(STORE);
      good.forEach((g) => st.put(g));
      t.oncomplete = resolve;
      t.onerror = () => reject(t.error);
    });
    db.close();
    await load();
    return { added: good.length, skipped };
  }

  async function clear() {
    const db = await open();
    await wrap(tx(db, 'readwrite').clear());
    db.close();
    items = [];
    index();
    stats = {};
    saveStats();
  }

  // 용어 사전이 늘었을 때 개념 연결을 다시 계산
  async function reclassify() {
    items.forEach((x) => (x.cids = classify(x)));
    const db = await open();
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      const st = t.objectStore(STORE);
      items.forEach((x) => st.put(x));
      t.oncomplete = resolve;
      t.onerror = () => reject(t.error);
    });
    db.close();
  }

  // ───────── 문제 고르기 ─────────
  const year = (x) => Number(String(x.exam).slice(0, 4)) || 0;
  // filter: { s: 과목(1~4, 0/없음=전체), cid: 개념, from: 이 연도 이후 }
  function pool(f) {
    const o = f || {};
    return items.filter((x) => (!o.s || x.s === o.s) && (!o.cid || x.cids.indexOf(o.cid) >= 0) && (!o.from || year(x) >= o.from));
  }
  // 안 푼 문제 → 틀린 문제 → 맞힌 문제 순으로 우선, 같은 묶음 안에서는 무작위
  function pick(f, rnd, avoidId) {
    const list = pool(f).filter((x) => x.id !== avoidId);
    if (!list.length) return null;
    const r = rnd || Math.random;
    const rank = (x) => {
      const st = stats[x.id];
      if (!st || !st.n) return 0;
      return st.last ? 2 : 1;
    };
    const best = Math.min.apply(null, list.map(rank));
    const top = list.filter((x) => rank(x) === best);
    return top[Math.floor(r() * top.length)];
  }

  function record(id, ok) {
    const st = stats[id] || { n: 0, c: 0, last: false };
    st.n++;
    if (ok) st.c++;
    st.last = !!ok;
    stats[id] = st;
    saveStats();
  }
  function summary(f) {
    const list = pool(f);
    let tried = 0;
    let right = 0;
    list.forEach((x) => {
      const st = stats[x.id];
      if (st && st.n) {
        tried++;
        if (st.last) right++;
      }
    });
    return { total: list.length, tried, right };
  }

  G.kigeum = {
    SUBJECTS,
    load,
    importText,
    clear,
    reclassify,
    pool,
    pick,
    record,
    summary,
    get: (id) => byId[id] || null,
    count: () => items.length,
    isLoaded: () => loaded,
    conceptCount: (cid) => pool({ cid }).length,
    stat: (id) => stats[id] || null,
    years: () => {
      const ys = items.map(year).filter(Boolean);
      return ys.length ? { min: Math.min.apply(null, ys), max: Math.max.apply(null, ys) } : null;
    },
    _classify: classify,
    _setItems: (arr) => {
      items = arr;
      index();
      loaded = true;
    },
  };
})(globalThis.GISA);
