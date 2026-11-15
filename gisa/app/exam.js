// 모의고사(시험모드)와 북마크: 화면 없이 계산·저장만 한다.
//  - 시험 구성: 전기기사 필기와 같은 5과목 × 20문제 = 100문제, 150분. 합격은 평균 60점 이상이면서 과목마다 40점 이상.
//  - 문제는 시드로 만들어서 문제 번호(키)만 저장한다. 같은 키면 언제든 같은 문제가 나온다.
//  - 저장: 이 브라우저(localStorage)에만. 기록 동기화(S)와는 따로 둔다.
(function (G) {
  'use strict';

  const SUBJECTS = ['em', 'power', 'machine', 'circuit', 'code']; // 실제 시험 순서
  const PER_SUBJECT = 20;
  const LIMIT_SEC = 150 * 60;
  const PASS_AVG = 60;
  const CUT = 40; // 과락 기준(과목 점수가 이 값 미만이면 불합격)
  const K_BOOK = 'gisa-bookmarks';
  const K_CUR = 'gisa-exam-cur';
  const K_HIST = 'gisa-exam-hist';

  const read = (k, fb) => {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v === null || v === undefined ? fb : v;
    } catch (e) {
      return fb;
    }
  };
  const write = (k, v) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      /* 저장소를 못 쓰는 환경이면 이번 화면에서만 유지 */
    }
  };

  // ───────── 북마크 ─────────
  let marks = null;
  const loadMarks = () => {
    if (!marks) {
      const arr = read(K_BOOK, []);
      marks = Array.isArray(arr) ? arr.filter((k) => typeof k === 'string') : [];
    }
    return marks;
  };
  const book = {
    list: () => loadMarks().slice(),
    has: (key) => loadMarks().indexOf(key) !== -1,
    toggle(key) {
      const m = loadMarks();
      const i = m.indexOf(key);
      if (i === -1) m.push(key);
      else m.splice(i, 1);
      write(K_BOOK, m);
      return i === -1;
    },
    count: () => loadMarks().length,
    clear() {
      marks = [];
      write(K_BOOK, []);
    },
  };

  // ───────── 시험지 만들기 ─────────
  function sectionConcepts(sid) {
    return G.concepts.filter((c) => c.subject === sid).map((c) => c.id);
  }

  // seed → { seed, keys:[100], sections:[{id, name, from, to}] } (같은 seed면 같은 시험지)
  function build(seed) {
    const rng = G.rng.create(seed, 'exam');
    const keys = [];
    const sections = [];
    const used = new Set();
    SUBJECTS.forEach((sid) => {
      const cids = sectionConcepts(sid);
      const from = keys.length;
      let pool = [];
      let guard = 0;
      while (keys.length - from < PER_SUBJECT && guard++ < 2000) {
        if (!pool.length) pool = rng.shuffle(cids.slice());
        const cid = pool.shift();
        const tpls = G.templatesFor(cid);
        const sts = G.staticFor(cid);
        let key;
        if (sts.length && (!tpls.length || rng.chance(0.2))) {
          const it = rng.pick(sts);
          key = 's:' + it.id + '#' + rng.int(1, 999999);
          if (used.has(key.split('#')[0])) continue; // 같은 이론형 문제는 한 시험지에 한 번만
          used.add(key.split('#')[0]);
        } else {
          const t = rng.pick(tpls);
          key = 't:' + t.id + '#' + rng.int(1, 999999999);
        }
        keys.push(key);
      }
      const s = G.subjects.find((x) => x.id === sid);
      sections.push({ id: sid, name: s ? s.name : sid, short: s ? s.short : sid, from, to: keys.length });
    });
    return { seed, keys, sections };
  }

  // ───────── 진행 중인 시험 ─────────
  // cur = { paper, answers:[-1 안 풂 | 0~3 고른 번호 | -2 모르겠어요], idx, startedAt(ms), done:false }
  const cur = {
    load() {
      const c = read(K_CUR, null);
      if (!c || !c.paper || !Array.isArray(c.paper.keys) || c.paper.keys.length !== SUBJECTS.length * PER_SUBJECT) return null;
      if (!Array.isArray(c.answers) || c.answers.length !== c.paper.keys.length) return null;
      return c;
    },
    save: (c) => write(K_CUR, c),
    start() {
      const paper = build(Math.floor(Math.random() * 2147483000) + 1);
      const c = { paper, answers: paper.keys.map(() => -1), idx: 0, startedAt: Date.now(), done: false };
      write(K_CUR, c);
      return c;
    },
    clear: () => write(K_CUR, null),
  };

  const remaining = (c, now) => Math.max(0, LIMIT_SEC - Math.floor(((now || Date.now()) - c.startedAt) / 1000));

  // ───────── 채점 ─────────
  // 문제 번호로 정답 칸을 알아낸다
  function answerIndexOf(key) {
    return G.fromKey(key).answerIndex;
  }

  // c → { scores:[과목 점수], avg, pass, cut:[과락인 과목 이름], correct, wrong:[키], blank }
  function grade(c) {
    const wrong = [];
    let blank = 0;
    const per = c.paper.sections.map((s) => {
      let ok = 0;
      for (let i = s.from; i < s.to; i++) {
        const a = c.answers[i];
        if (a < 0) blank++;
        if (a >= 0 && a === answerIndexOf(c.paper.keys[i])) ok++;
        else wrong.push(c.paper.keys[i]);
      }
      return { id: s.id, name: s.name, short: s.short, ok, n: s.to - s.from, score: Math.round((ok / (s.to - s.from)) * 100) };
    });
    const avg = Math.round((per.reduce((t, p) => t + p.score, 0) / per.length) * 10) / 10;
    const cutSubjects = per.filter((p) => p.score < CUT).map((p) => p.name);
    return { per, avg, pass: avg >= PASS_AVG && !cutSubjects.length, cutSubjects, correct: per.reduce((t, p) => t + p.ok, 0), wrong, blank };
  }

  // ───────── 시험 기록 ─────────
  const hist = {
    list() {
      const a = read(K_HIST, []);
      return Array.isArray(a) ? a : [];
    },
    add(c, g) {
      const a = hist.list();
      a.push({
        t: Date.now(),
        seed: c.paper.seed,
        secs: Math.min(LIMIT_SEC, Math.floor((Date.now() - c.startedAt) / 1000)),
        keys: c.paper.keys,
        answers: c.answers,
        per: g.per.map((p) => ({ id: p.id, name: p.name, short: p.short, score: p.score, ok: p.ok, n: p.n })),
        avg: g.avg,
        pass: g.pass,
        correct: g.correct,
      });
      while (a.length > 20) a.shift();
      write(K_HIST, a);
    },
    clear: () => write(K_HIST, []),
  };

  G.exam = { SUBJECTS, PER_SUBJECT, LIMIT_SEC, PASS_AVG, CUT, book, build, cur, remaining, grade, hist, answerIndexOf };
})(globalThis.GISA);
