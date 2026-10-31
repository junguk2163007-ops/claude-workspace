/* 전기실 진단노트 — 진단·역추적 레슨·기록·추천 로직
 * 데이터: window.LEVELS, window.FIELDS (data/fields.js), window.QUESTIONS (data/questions.js)
 */
(function () {
  'use strict';

  const LEVELS = window.LEVELS || [];
  const FIELDS = window.FIELDS || [];
  const QUESTIONS = window.QUESTIONS || [];
  const QMAP = {};
  QUESTIONS.forEach(q => { QMAP[q.id] = q; });
  const FMAP = {};
  FIELDS.forEach(f => { FMAP[f.id] = f; });

  const STORE_KEY = 'elecDiagNote.v1';
  const NUM = ['①', '②', '③', '④', '⑤', '⑥'];
  const STATUS = {
    none: { sym: '—', label: '미진단', cls: 'none' },
    o: { sym: '○', label: '이해', cls: 'ok' },
    tri: { sym: '△', label: '부분 이해', cls: 'mid' },
    x: { sym: '✕', label: '보강 필요', cls: 'bad' }
  };
  const UNKNOWN = -1;

  /* ───────── 저장소: localStorage, 막혀 있으면 메모리 ───────── */
  const store = (function () {
    let available = false;
    let memory = null;
    try {
      const k = '__elec_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      available = true;
    } catch (e) {
      available = false;
    }
    return {
      isAvailable: () => available,
      load() {
        if (available) {
          try {
            const raw = window.localStorage.getItem(STORE_KEY);
            if (raw) return JSON.parse(raw);
          } catch (e) { /* 손상된 기록은 무시하고 메모리 사용 */ }
        }
        return memory;
      },
      save(data) {
        memory = data;
        if (!available) return;
        try {
          window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
        } catch (e) {
          available = false;
        }
      },
      clear() {
        memory = null;
        if (!available) return;
        try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* 무시 */ }
      }
    };
  })();

  /* ───────── 상태 ───────── */
  function freshField() {
    return {
      reached: 0,        // 통과한 최고 단계 (0 = 아직 없음)
      correct: 0, wrong: 0, unknown: 0,
      streak: 0,         // 연속 정답 수
      unknownRun: 0,     // 마지막 ○ 이후 '모르겠어요' 횟수
      xFlag: false,      // ✕ 보강 필요
      priorityAt: 0,     // ✕가 된 시각 (최근일수록 1순위)
      recheckPass: 0, recheckFail: 0,
      lastDate: null,
      passed: {}         // 문제별 통과 여부
    };
  }
  function freshState() {
    const fields = {};
    FIELDS.forEach(f => { fields[f.id] = freshField(); });
    return { version: 1, createdAt: new Date().toISOString(), fields, log: [], askList: [] };
  }
  function loadState() {
    const s = store.load();
    if (!s || typeof s !== 'object' || !s.fields) return freshState();
    FIELDS.forEach(f => { s.fields[f.id] = Object.assign(freshField(), s.fields[f.id] || {}); });
    s.log = Array.isArray(s.log) ? s.log : [];
    s.askList = Array.isArray(s.askList) ? s.askList : [];
    return s;
  }
  let state = loadState();
  const save = () => store.save(state);

  let view = 'home';
  let session = null;
  const ui = { fieldId: null, confirmReset: false, exportText: null };

  /* ───────── 유틸 ───────── */
  const pad = n => String(n).padStart(2, '0');
  const fname = id => `${id}. ${FMAP[id].name}`;
  const levelInfo = lv => LEVELS.find(l => l.level === lv) || { name: '' };
  const fieldQuestions = id => QUESTIONS.filter(q => q.fieldId === id);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  // 줄바꿈은 문단, "- "는 목록, "1) "은 번호 목록
  function fmt(text) {
    const lines = String(text || '').split('\n');
    let html = '';
    let list = null;
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    lines.forEach(raw => {
      const line = raw.trim();
      if (!line) { close(); return; }
      let m;
      if ((m = line.match(/^-\s+(.*)$/))) {
        if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; }
        html += `<li>${inline(m[1])}</li>`;
      } else if ((m = line.match(/^\d+\)\s+(.*)$/))) {
        if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; }
        html += `<li>${inline(m[1])}</li>`;
      } else {
        close();
        html += `<p>${inline(line)}</p>`;
      }
    });
    close();
    return `<div class="prose">${html}</div>`;
  }
  function fmtDate(iso, withTime) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    const day = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
    return withTime ? `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}` : day;
  }
  function meter(reached) {
    let s = '<span class="meter" aria-hidden="true">';
    for (let i = 1; i <= 4; i++) s += `<i class="${i <= reached ? 'on' : ''}"></i>`;
    return s + '</span>';
  }
  const lvText = r => (r > 0 ? `Lv.${r}` : 'Lv.—');
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2600);
  }

  /* ───────── 상태 판정 ───────── */
  function statusOf(id) {
    const f = state.fields[id];
    if (f.correct + f.wrong + f.unknown === 0) return 'none';
    if (f.xFlag) return 'x';
    if (f.streak >= 2) return 'o';
    return 'tri';
  }

  // kind: 'main'(본 문제) | 'down'(한 단계 아래 확인) | 'recheck'(레슨 후 확인 문제)
  function recordAnswer(q, result, kind) {
    const f = state.fields[q.fieldId];
    const nowIso = new Date().toISOString();
    f.lastDate = nowIso;
    state.log.push({ t: nowIso, qid: q.id, fieldId: q.fieldId, level: q.level, kind, result });

    if (kind === 'recheck') {
      if (result === 'correct') {
        f.recheckPass++;
      } else {
        f.recheckFail++;
        f.xFlag = true;
        f.priorityAt = Date.now();
      }
    } else if (result === 'correct') {
      f.correct++;
      f.streak++;
      f.passed[q.id] = true;
      f.reached = Math.max(f.reached, q.level);
      if (f.streak >= 2) { f.xFlag = false; f.unknownRun = 0; }
    } else {
      f.streak = 0;
      f.passed[q.id] = false;
      f.reached = Math.min(f.reached, q.level - 1); // 틀린 단계 아래로
      if (result === 'unknown') {
        f.unknown++;
        f.unknownRun++;
        if (f.unknownRun >= 2) { f.xFlag = true; f.priorityAt = Date.now(); }
      } else {
        f.wrong++;
      }
    }
    save();
  }

  /* ───────── 다음 추천 ───────── */
  function ancestors(id, acc) {
    acc = acc || new Set();
    (FMAP[id].prereqs || []).forEach(p => {
      if (!acc.has(p)) { acc.add(p); ancestors(p, acc); }
    });
    return acc;
  }
  function recommend() {
    const st = id => statusOf(id);
    const reached = id => state.fields[id].reached;

    // (1) ✕ 분야가 있으면 그 분야의 선수 분야부터
    const xs = FIELDS.filter(f => st(f.id) === 'x')
      .sort((a, b) => state.fields[b.id].priorityAt - state.fields[a.id].priorityAt || a.id - b.id);
    if (xs.length) {
      const top = xs[0].id;
      const weakAnc = [...ancestors(top)].filter(id => st(id) === 'x' || st(id) === 'none').sort((a, b) => a - b);
      if (weakAnc.length) {
        return { fieldId: weakAnc[0], rule: 1, reason: `‘${fname(top)}’ 분야가 보강 필요(✕)예요. 그 바탕이 되는 선수 분야 ‘${fname(weakAnc[0])}’부터 다져요.` };
      }
      return { fieldId: top, rule: 1, reason: `‘${fname(top)}’ 분야가 보강 필요(✕)로 기록됐어요. 선수 분야는 갖췄으니 이 분야를 1순위로 다시 배워요.` };
    }
    // (2) 미진단 분야 중 번호가 낮은 것
    const none = FIELDS.filter(f => st(f.id) === 'none');
    if (none.length) {
      const id = none[0].id;
      const first = none.length === FIELDS.length;
      return { fieldId: id, rule: 2, reason: first ? '진단은 가장 기초인 ‘1. 전기 기초이론’부터 시작해요.' : `아직 진단하지 않은 분야 중 번호가 가장 낮은(가장 기초인) 분야예요.` };
    }
    // (3) 모두 진단했으면 △ 중 도달 단계가 가장 낮은 것
    const tris = FIELDS.filter(f => st(f.id) === 'tri').sort((a, b) => reached(a.id) - reached(b.id) || a.id - b.id);
    if (tris.length) {
      const id = tris[0].id;
      return { fieldId: id, rule: 3, reason: `모든 분야를 진단했어요. 부분 이해(△) 분야 중 도달 단계가 가장 낮아요(${lvText(reached(id))}).` };
    }
    // 모두 ○: 남은 단계 도전 → 모두 Lv.4면 가장 오래된 분야 복습
    const notMax = FIELDS.filter(f => reached(f.id) < 4).sort((a, b) => reached(a.id) - reached(b.id) || a.id - b.id);
    if (notMax.length) {
      const id = notMax[0].id;
      return { fieldId: id, rule: 4, reason: `모든 분야가 이해(○)예요. 도달 단계가 가장 낮은 분야에서 Lv.${reached(id) + 1}에 도전해요.` };
    }
    const oldest = FIELDS.slice().sort((a, b) => String(state.fields[a.id].lastDate).localeCompare(String(state.fields[b.id].lastDate)))[0];
    return { fieldId: oldest.id, rule: 4, reason: '모든 분야 Lv.4 통과! 가장 오래전에 본 분야부터 복습해요.' };
  }

  function weakTop() {
    return FIELDS.map(f => {
      const s = statusOf(f.id);
      const d = state.fields[f.id];
      let score = 0;
      if (s === 'x') score += 1000;
      if (s === 'tri') score += 100;
      score += (d.wrong + d.unknown) * 10 + d.recheckFail * 20 + (4 - d.reached) * 5;
      return { id: f.id, s, score };
    }).filter(w => w.s === 'x' || w.s === 'tri')
      .sort((a, b) => b.score - a.score || a.id - b.id)
      .slice(0, 3);
  }

  function startLevelOf(id) {
    const f = state.fields[id];
    const qs = fieldQuestions(id);
    const q = qs.find(x => !f.passed[x.id] && x.level >= f.reached) || qs.find(x => !f.passed[x.id]);
    return q ? q.level : 1;
  }

  /* ───────── 진단 세션 ───────── */
  function startField(id) {
    const f = state.fields[id];
    const qs = fieldQuestions(id);
    if (!qs.length) return;
    let start = qs.find(x => !f.passed[x.id] && x.level >= f.reached) || qs.find(x => !f.passed[x.id]);
    let review = false;
    if (!start) { start = qs[0]; review = true; }
    session = {
      fieldId: id, qid: start.id, mode: 'main', phase: 'question',
      review, history: [], seenCorrect: {},
      pick: null, card: 0, alt: false, recheckPick: null, levelUp: 0, endReason: null
    };
    go('quiz');
  }

  function answer(idx) {
    const q = QMAP[session.qid];
    const result = idx === UNKNOWN ? 'unknown' : (idx === q.answerIndex ? 'correct' : 'wrong');
    const before = state.fields[q.fieldId].reached;
    recordAnswer(q, result, session.mode);
    session.history.push({ qid: q.id, level: q.level, mode: session.mode, result, recheck: null });
    session.pick = idx;
    if (result === 'correct') {
      session.seenCorrect[q.id] = true;
      session.levelUp = state.fields[q.fieldId].reached > before ? state.fields[q.fieldId].reached : 0;
      session.phase = 'correct';
    } else {
      session.phase = 'lesson';
      session.card = 0;
      session.alt = false;
    }
    renderTop();
  }

  function nextAfterCorrect() {
    const q = QMAP[session.qid];
    if (session.mode === 'down') return endSession('down-ok');
    const nq = q.nextQuestionId && QMAP[q.nextQuestionId];
    if (nq) {
      session.qid = nq.id;
      session.mode = 'main';
      session.phase = 'question';
      renderTop();
    } else {
      endSession('complete');
    }
  }

  // 레슨+확인 문제 뒤: 이번 진단에서 아래 단계를 맞힌 적이 없으면 Lv.n-1 문제로 내려가 확인
  function downTarget() {
    const q = QMAP[session.qid];
    if (q.level < 2) return null;
    const lower = fieldQuestions(q.fieldId).filter(x => x.level === q.level - 1);
    if (!lower.length) return null;
    if (lower.some(x => session.seenCorrect[x.id])) return null;
    if (lower.some(x => session.history.some(h => h.qid === x.id))) return null;
    return lower[lower.length - 1];
  }

  function continueAfterLesson() {
    const t = downTarget();
    if (t) {
      session.qid = t.id;
      session.mode = 'down';
      session.phase = 'question';
      renderTop();
    } else {
      endSession('stopped');
    }
  }

  function endSession(reason) {
    session.phase = 'end';
    session.endReason = reason;
    renderTop();
  }

  function cardNext() {
    const q = QMAP[session.qid];
    if (session.card < q.prereqCards.length - 1) {
      session.card++;
      session.alt = false;
    } else {
      session.phase = 'recheck';
    }
    renderTop();
  }

  function recheckAnswer(idx) {
    const q = QMAP[session.qid];
    const r = q.recheck;
    const result = idx === UNKNOWN ? 'unknown' : (idx === r.answerIndex ? 'correct' : 'wrong');
    recordAnswer(q, result, 'recheck');
    session.history[session.history.length - 1].recheck = result === 'correct' ? 'pass' : 'fail';
    session.recheckPick = idx;
    session.phase = 'recheckResult';
    renderTop();
  }

  function addAsk() {
    const q = QMAP[session.qid];
    const c = q.prereqCards[session.card];
    const key = `${q.id}#${session.card}`;
    if (!state.askList.some(a => a.key === key)) {
      state.askList.push({ key, qid: q.id, fieldId: q.fieldId, title: c.title, t: new Date().toISOString() });
      save();
    }
    toast('‘선임자에게 물어볼 것’ 목록에 담았어요');
  }

  /* ───────── 화면 전환 ───────── */
  function go(v) {
    view = v;
    renderTop();
  }
  function renderTop() {
    render();
    window.scrollTo(0, 0);
    const app = document.getElementById('app');
    try { app.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
  }

  function render() {
    const app = document.getElementById('app');
    document.body.classList.toggle('in-quiz', view === 'quiz');
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view || (view === 'field' && t.dataset.view === 'home')));
    const top = document.getElementById('topAction');
    top.innerHTML = view === 'quiz' && session && session.phase !== 'end'
      ? '<button type="button" class="top-btn" data-action="quit">그만하기</button>'
      : '';

    if (view === 'home') app.innerHTML = viewHome();
    else if (view === 'field') app.innerHTML = viewField(ui.fieldId);
    else if (view === 'quiz') app.innerHTML = viewQuiz();
    else if (view === 'records') app.innerHTML = viewRecords();
    else if (view === 'map') app.innerHTML = viewMap();
  }

  /* ───────── 홈 ───────── */
  function recBlock(r, label) {
    const f = state.fields[r.fieldId];
    const st = statusOf(r.fieldId);
    const startLv = startLevelOf(r.fieldId);
    const verb = st === 'none' ? '진단 시작' : `Lv.${startLv}부터 이어서`;
    return `
      <section class="rec" aria-label="다음 추천 학습">
        <p class="eyebrow">${esc(label || '다음 추천 학습')}</p>
        <h2 class="rec-name"><span class="mono">F-${pad(r.fieldId)}</span>${esc(FMAP[r.fieldId].name)}</h2>
        <p class="rec-why">${esc(r.reason)}</p>
        <button type="button" class="btn" data-action="start" data-field="${r.fieldId}">다음 추천 학습: ${esc(FMAP[r.fieldId].name)} · ${verb} →</button>
      </section>`;
  }

  function viewHome() {
    const r = recommend();
    const counts = { none: 0, o: 0, tri: 0, x: 0 };
    FIELDS.forEach(f => { counts[statusOf(f.id)]++; });
    const diagnosed = FIELDS.length - counts.none;
    const fresh = diagnosed === 0;

    const cards = FIELDS.map(f => {
      const s = STATUS[statusOf(f.id)];
      const d = state.fields[f.id];
      return `
        <button type="button" class="fcard${f.id === r.fieldId ? ' is-rec' : ''}" data-action="open-field" data-field="${f.id}" aria-label="${esc(fname(f.id))}, ${s.label}, 도달 ${lvText(d.reached)}">
          <span class="fcard-top"><span class="fcard-no">F-${pad(f.id)}</span><span class="lamp ${s.cls}" aria-hidden="true"></span></span>
          <span class="fcard-name">${esc(f.name)}</span>
          <span class="fcard-foot">
            <span class="fcard-st ${s.cls}">${s.sym} ${s.label}</span>
            <span class="fcard-lv">${meter(d.reached)}${lvText(d.reached)}</span>
          </span>
        </button>`;
    }).join('');

    return `
      ${store.isAvailable() ? '' : '<p class="notice">이 브라우저에서는 기록 저장이 막혀 있어요. 지금 기록은 이 창을 닫으면 사라지니, ‘이해도 기록’에서 내보내기로 보관하세요.</p>'}
      ${fresh ? `
        <section class="intro">
          <h1 class="page-title">무엇을 모르는지부터 찾아요</h1>
          <p>쉬운 질문부터 한 문제씩 드려요. 틀리거나 모르면 정답만 알려 주지 않고, 그 답을 이해하는 데 필요한 기초 개념까지 거슬러 올라가 함께 짚어요.</p>
        </section>` : ''}
      ${recBlock(r)}
      <section class="tally" aria-label="진단 현황">
        <div><b>${diagnosed}<small style="font-size:0.6em;color:var(--muted)">/${FIELDS.length}</small></b><span>진단한 분야</span></div>
        <div class="ok"><b>${counts.o}</b><span>○ 이해</span></div>
        <div class="mid"><b>${counts.tri}</b><span>△ 부분 이해</span></div>
        <div class="bad"><b>${counts.x}</b><span>✕ 보강 필요</span></div>
      </section>
      <section class="sec">
        <div class="sec-head">
          <h2>학습 지도</h2>
          <p>12개 분야예요. 카드를 누르면 핵심 지식과 ‘이 분야 진단 시작’ 버튼이 나와요.</p>
        </div>
        <div class="grid">${cards}</div>
        <p class="legend">램프: 초록 ○ 이해 · 주황 △ 부분 이해 · 빨강 ✕ 보강 필요 · 꺼짐 미진단 / 게이지: 도달 단계</p>
      </section>`;
  }

  /* ───────── 분야 상세 ───────── */
  function viewField(id) {
    const f = FMAP[id];
    const d = state.fields[id];
    const s = STATUS[statusOf(id)];
    const qs = fieldQuestions(id);
    const startLv = startLevelOf(id);
    const allPassed = qs.every(q => d.passed[q.id]);
    const preText = f.prereqs.length ? `선수 분야: ${f.prereqs.map(p => fname(p)).join(', ')}` : f.prereqNote;

    const lv = LEVELS.map(l => {
      const n = qs.filter(q => q.level === l.level).length;
      const done = d.reached >= l.level;
      const next = !done && l.level === startLv;
      return `<li class="${done ? 'done' : ''}${next ? ' next' : ''}">
        <span class="lvno">Lv.${l.level}</span>
        <span class="lvname">${esc(l.name)}<small>${esc(l.goal)} · 문제 ${n}개</small></span>
        <span class="lvst">${done ? '✓ 통과' : (next ? '다음 도전' : '대기')}</span>
      </li>`;
    }).join('');

    const kp = f.keyPoints.map(k => `<li><b>${esc(k.name)}</b><span>${esc(k.desc)}</span></li>`).join('');

    return `
      <button type="button" class="link-btn" data-action="nav" data-view="home">← 학습 지도로</button>
      <section class="fhead">
        <p class="eyebrow">분야 F-${pad(id)} · ${esc(preText)}</p>
        <h1>${esc(f.name)}</h1>
        <div class="fhead-row">
          <span class="chip ${s.cls}"><span class="lamp ${s.cls}" aria-hidden="true"></span><span class="sym">${s.sym}</span>${s.label}</span>
          <span class="fcard-lv">${meter(d.reached)} 도달 ${lvText(d.reached)}</span>
        </div>
        <p class="statline">
          <span>정답 <b>${d.correct}</b></span><span>오답 <b>${d.wrong}</b></span><span>모름 <b>${d.unknown}</b></span><span>마지막 진단 <b>${fmtDate(d.lastDate)}</b></span>
        </p>
        <button type="button" class="btn btn-primary btn-block" data-action="start" data-field="${id}">
          이 분야 진단 시작 · ${allPassed ? '처음부터 복습' : `Lv.${startLv} 문제부터`}
        </button>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>핵심 지식</h2><p>${esc(f.summary)}</p></div>
        <div class="panel"><ul class="kp">${kp}</ul></div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>단계별 진행</h2><p>Lv.n 문제를 맞히면 Lv.n+1로 올라가요. 틀리면 기초 개념 레슨 후 한 단계 아래에서 다시 확인해요.</p></div>
        <ol class="lvlist">${lv}</ol>
      </section>`;
  }

  /* ───────── 진단 화면 ───────── */
  function quizHead(q) {
    const f = FMAP[q.fieldId];
    const d = state.fields[q.fieldId];
    const qs = fieldQuestions(q.fieldId);
    const idx = qs.findIndex(x => x.id === q.id) + 1;
    const track = [1, 2, 3, 4].map(l => {
      const cls = l === q.level ? 'current' : (d.reached >= l ? 'passed' : '');
      return `<li class="${cls}">${d.reached >= l && l !== q.level ? '✓ ' : ''}Lv.${l}</li>`;
    }).join('');
    const extra = session.phase === 'recheck' || session.phase === 'recheckResult'
      ? '<span class="tag tag-check">확인 문제</span>'
      : (session.mode === 'down' ? '<span class="tag tag-down">기초 확인</span>' : '');
    return `
      <div class="qhead">
        <div class="qmeta">
          <span class="tag"><span class="mono">F-${pad(f.id)}</span>${esc(f.name)}</span>
          <span class="tag tag-lv">Lv.${q.level} ${esc(levelInfo(q.level).name)}</span>
          ${extra}
        </div>
        <ol class="track" aria-label="단계 진행도">${track}</ol>
        <p class="qcount">이번 진단 ${session.history.length + (session.phase === 'question' ? 1 : 0)}번째 문제 · 이 분야 문제 ${idx}/${qs.length}</p>
      </div>`;
  }

  function optionButtons(options, action) {
    const list = options.map((o, i) => `
      <button type="button" class="opt" data-action="${action}" data-idx="${i}"><span class="n">${NUM[i]}</span><span>${esc(o)}</span></button>`).join('');
    const n = options.length;
    return `<div class="opts">${list}
      <button type="button" class="opt unknown" data-action="${action}" data-idx="${UNKNOWN}"><span class="n">${NUM[n]}</span><span>모르겠어요</span></button>
    </div>
    <p class="hint">확실하지 않으면 ‘모르겠어요’를 눌러 주세요. 찍어서 맞히는 것보다 정확한 진단이 되고, 필요한 기초 개념부터 바로 알려 드려요.</p>`;
  }

  function originalSummary(q) {
    return `
      <section class="panel">
        <p class="eyebrow">원래 문제 정리</p>
        <h2>${esc(q.question)}</h2>
        <p><b>정답 ${NUM[q.answerIndex]}</b> ${esc(q.options[q.answerIndex])}</p>
        ${fmt(q.explanation)}
      </section>
      <section class="fieldlink"><span class="fl-label">현장에서는?</span><p>${esc(q.fieldLink)}</p></section>`;
  }

  function viewQuiz() {
    if (!session) return viewHome();
    const q = QMAP[session.qid];
    const ph = session.phase;

    if (ph === 'question') {
      const note = session.mode === 'down'
        ? `<p class="downnote">앞 단계(Lv.${q.level + 1})를 틀려서, 한 단계 아래 Lv.${q.level} 문제로 기초가 잡혀 있는지 확인해요.</p>`
        : (session.review && session.history.length === 0 ? '<p class="downnote">모든 단계를 통과한 분야예요. 처음부터 복습해요.</p>' : '');
      return `${quizHead(q)}${note}
        <h1 class="qtext">${esc(q.question)}</h1>
        ${optionButtons(q.options, 'answer')}`;
    }

    if (ph === 'correct') {
      const last = !q.nextQuestionId || session.mode === 'down';
      return `${quizHead(q)}
        <div class="verdict ok"><span class="vmark" aria-hidden="true">✓</span>
          <div><strong>정답이에요</strong><p>${NUM[q.answerIndex]} ${esc(q.options[q.answerIndex])}</p>
          ${session.levelUp ? `<p class="levelup">Lv.${session.levelUp} 통과 · 도달 단계가 올라갔어요</p>` : ''}</div>
        </div>
        <section class="panel">${fmt(q.explanation)}</section>
        <section class="fieldlink"><span class="fl-label">현장에서는?</span><p>${esc(q.fieldLink)}</p></section>
        <button type="button" class="btn btn-primary btn-block" data-action="next">${last ? '이번 진단 정리 보기 →' : '다음 문제 →'}</button>`;
    }

    if (ph === 'lesson') {
      const cards = q.prereqCards;
      const c = cards[session.card];
      const letters = 'ABCDEFG';
      const chain = cards.map((_, i) => {
        const cls = i < session.card ? 'done' : (i === session.card ? 'now' : '');
        return `<li class="${cls}">개념 ${letters[i]}</li><li class="sep" aria-hidden="true">→</li>`;
      }).join('') + '<li>확인 문제</li>';
      const opener = session.card === 0 && !session.alt ? `
        <div class="verdict mid"><span class="vmark" aria-hidden="true">!</span>
          <div><strong>${session.pick === UNKNOWN ? '모르겠다고 솔직하게 답해 줘서 좋아요' : '아쉽지만 정답이 아니에요'}</strong>
          <p>정답만 알려 드리고 끝내지 않을게요. 이 문제를 이해하는 데 필요한 개념 ${cards.length}개를 가장 기초부터 한 장씩 보고, 쉬운 확인 문제로 마무리해요.</p></div>
        </div>` : '';
      const buttons = session.alt
        ? `<div class="btn-col">
             <button type="button" class="btn btn-primary btn-block" data-action="card-ok">이제 이해했어요 →</button>
             <button type="button" class="btn btn-ghost btn-block" data-action="card-ask">그래도 어려워요 (질문 목록에 담고 다음으로)</button>
           </div>
           <p class="askhint">‘질문 목록’은 이해도 기록 화면에 모여요. 선임자에게 보여 주고 물어보세요.</p>`
        : `<div class="btn-row">
             <button type="button" class="btn btn-primary" data-action="card-ok">이해했어요</button>
             <button type="button" class="btn btn-ghost" data-action="card-unsure">잘 모르겠어요</button>
           </div>`;
      return `${quizHead(q)}${opener}
        <ol class="chain" aria-label="개념 카드 순서">${chain}</ol>
        <article class="ccard">
          <p class="eyebrow">개념 카드 ${session.card + 1} / ${cards.length}</p>
          <h2>${esc(c.title)}</h2>
          ${fmt(c.body)}
          ${session.alt ? `<div class="alt"><p class="eyebrow">보충 카드 · 다른 비유로 다시 볼게요</p>${fmt(c.altBody)}</div>` : ''}
        </article>
        ${buttons}`;
    }

    if (ph === 'recheck') {
      return `${quizHead(q)}
        <p class="downnote">방금 본 개념으로 풀 수 있는 쉬운 확인 문제예요. 맞히면 원래 단계로 돌아가요.</p>
        <h1 class="qtext">${esc(q.recheck.question)}</h1>
        ${optionButtons(q.recheck.options, 'recheck-answer')}`;
    }

    if (ph === 'recheckResult') {
      const r = q.recheck;
      const pass = session.recheckPick === r.answerIndex;
      const t = downTarget();
      const verdict = pass
        ? `<div class="verdict ok"><span class="vmark" aria-hidden="true">✓</span>
             <div><strong>확인 문제 통과! 원래 단계로 돌아가요</strong><p>이 분야는 부분 이해(△)로 기록했어요. Lv.${q.level} 문제는 다음 진단에서 다시 도전해요.</p></div></div>`
        : `<div class="verdict bad"><span class="vmark" aria-hidden="true">✕</span>
             <div><strong>아직 헷갈리는 부분이 있어요</strong><p>이 분야를 보강 필요(✕)로 기록하고 다음 학습 1순위로 올렸어요. 정답은 ${NUM[r.answerIndex]} ${esc(r.options[r.answerIndex])}.</p></div></div>`;
      const label = t ? `한 단계 아래(Lv.${t.level})에서 기초 확인하기 →` : '이번 진단 정리 보기 →';
      return `${quizHead(q)}${verdict}
        <section class="panel"><p class="eyebrow">확인 문제 해설</p>${fmt(r.explanation)}</section>
        ${originalSummary(q)}
        <button type="button" class="btn btn-primary btn-block" data-action="continue">${label}</button>`;
    }

    if (ph === 'end') return viewEnd();
    return '';
  }

  function viewEnd() {
    const id = session.fieldId;
    const d = state.fields[id];
    const s = STATUS[statusOf(id)];
    const lastQ = QMAP[session.qid];
    const msg = {
      complete: `이 분야의 마지막 문제(Lv.${lastQ.level})까지 풀었어요.`,
      stopped: `Lv.${lastQ.level}에서 멈췄어요. 다음 진단 때 Lv.${startLevelOf(id)}부터 다시 도전해요.`,
      'down-ok': `기초(Lv.${lastQ.level})는 확인됐어요. Lv.${lastQ.level + 1} 문제는 다음 진단 때 다시 도전해요.`,
      quit: '진단을 중간에 멈췄어요. 지금까지 푼 결과는 기록됐어요.'
    }[session.endReason] || '';
    const items = session.history.map(h => {
      const res = h.result === 'correct' ? '<span class="res ok">정답</span>'
        : (h.result === 'unknown' ? '<span class="res mid">모름</span>' : '<span class="res bad">오답</span>');
      const rc = h.recheck ? (h.recheck === 'pass' ? ' · <span class="res ok">확인 통과</span>' : ' · <span class="res bad">확인 실패</span>') : '';
      const tag = h.mode === 'down' ? ' <small>(기초 확인)</small>' : '';
      return `<li><span class="lv">Lv.${h.level}</span><span>${esc(QMAP[h.qid].question.slice(0, 34))}…${tag}</span><span>${res}${rc}</span></li>`;
    }).join('');
    const r = recommend();
    return `
      <section class="fhead">
        <p class="eyebrow">진단 정리 · F-${pad(id)}</p>
        <h1>${esc(FMAP[id].name)}</h1>
        <div class="fhead-row">
          <span class="chip ${s.cls}"><span class="lamp ${s.cls}" aria-hidden="true"></span><span class="sym">${s.sym}</span>${s.label}</span>
          <span class="fcard-lv">${meter(d.reached)} 도달 ${lvText(d.reached)}</span>
        </div>
        <p class="sub">${esc(msg)}</p>
      </section>
      ${items ? `<section class="panel"><h2>이번에 푼 문제</h2><ul class="hist">${items}</ul></section>` : ''}
      ${recBlock(r)}
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" data-action="nav" data-view="records">이해도 기록 보기</button>
        <button type="button" class="btn btn-ghost" data-action="nav" data-view="home">홈으로</button>
      </div>`;
  }

  /* ───────── 이해도 기록표 ───────── */
  function viewRecords() {
    const weak = weakTop();
    const rank = {};
    weak.forEach((w, i) => { rank[w.id] = i + 1; });
    const rows = FIELDS.map(f => {
      const d = state.fields[f.id];
      const s = STATUS[statusOf(f.id)];
      return `<tr class="${rank[f.id] ? 'weak-row' : ''}">
        <td><span class="fname"><small>F-${pad(f.id)}</small><span>${esc(f.name)}${rank[f.id] ? `<span class="rank-badge">취약 ${rank[f.id]}</span>` : ''}</span></span></td>
        <td><span class="chip ${s.cls}"><span class="sym">${s.sym}</span>${s.label}</span></td>
        <td class="num">${lvText(d.reached)}</td>
        <td class="num">${d.correct}</td>
        <td class="num">${d.wrong}</td>
        <td class="num">${d.unknown}</td>
        <td class="num">${fmtDate(d.lastDate)}</td>
      </tr>`;
    }).join('');

    const weakList = weak.length
      ? weak.map((w, i) => {
          const s = STATUS[w.s];
          return `<button type="button" class="weak-item" data-action="open-field" data-field="${w.id}">
            <span class="weak-rank">취약 ${i + 1}</span><span><b>${esc(fname(w.id))}</b></span><span class="chip ${s.cls}"><span class="sym">${s.sym}</span>${s.label}</span>
          </button>`;
        }).join('')
      : '<p class="lead">아직 취약 분야가 없어요. 진단을 진행하면 여기에 보강이 필요한 분야가 나타나요.</p>';

    const asks = state.askList.length
      ? `<ul class="asklist">${state.askList.map((a, i) => `<li><span>${esc(a.title)}<small>${esc(fname(a.fieldId))} · ${fmtDate(a.t)}</small></span><button type="button" class="x-btn" data-action="ask-remove" data-idx="${i}" aria-label="목록에서 지우기">해결</button></li>`).join('')}</ul>`
      : '<p class="lead">레슨에서 ‘그래도 어려워요’를 누른 개념이 여기에 모여요.</p>';

    const confirm = ui.confirmReset
      ? `<div class="confirm"><p><b>모든 진단 기록과 질문 목록을 지울까요?</b> 되돌릴 수 없어요. 필요하면 먼저 내보내기를 하세요.</p>
          <div class="btn-row"><button type="button" class="btn btn-danger" data-action="reset-confirm">기록 지우기</button><button type="button" class="btn btn-ghost" data-action="reset-cancel">취소</button></div></div>`
      : '';
    const exportBox = ui.exportText
      ? `<div class="export-box">
          <p class="lead" style="font-size:var(--fs-sm)">JSON 파일 다운로드를 시작했어요. 파일이 저장되지 않는 환경이라면 아래 내용을 복사해 보관하세요.</p>
          <textarea id="exportText" readonly>${esc(ui.exportText)}</textarea>
          <button type="button" class="btn btn-ghost" data-action="copy-export">내용 복사</button>
        </div>`
      : '';

    const r = recommend();
    return `
      <section class="sec-head">
        <h1 class="page-title">이해도 기록표</h1>
        <p>12개 분야의 상태, 도달 단계, 정답·오답·모름 횟수, 마지막 진단일이에요. 취약 분야 상위 3개를 빨갛게 표시했어요.</p>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>취약 분야 TOP 3</h2></div>
        <div class="weak">${weakList}</div>
      </section>
      <section class="sec">
        <div class="table-wrap">
          <table class="rec-table">
            <thead><tr><th>분야</th><th>상태</th><th>도달</th><th>정답</th><th>오답</th><th>모름</th><th>마지막 진단</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="legend">표가 화면보다 넓으면 옆으로 밀어서 보세요.</p>
      </section>
      ${recBlock(r)}
      <section class="sec">
        <div class="sec-head"><h2>선임자에게 물어볼 것</h2><p>보충 설명을 봐도 어려웠던 개념 카드예요.</p></div>
        ${asks}
      </section>
      <section class="sec">
        <div class="sec-head"><h2>기록 관리</h2><p>${store.isAvailable() ? '기록은 이 기기의 브라우저에 저장돼요.' : '이 브라우저는 저장이 막혀 있어 창을 닫으면 기록이 사라져요.'}</p></div>
        <div class="btn-row">
          <button type="button" class="btn btn-ghost" data-action="export">기록 내보내기 (JSON)</button>
          <button type="button" class="btn btn-ghost" data-action="reset">기록 초기화</button>
        </div>
        ${exportBox}
        ${confirm}
      </section>`;
  }

  /* ───────── 학습 지도 보기 ───────── */
  function viewMap() {
    const lv = LEVELS.map(l => `<tr><td>Lv.${l.level}</td><td><b>${esc(l.name)}</b></td><td>${esc(l.stage)}</td><td>${esc(l.goal)}</td></tr>`).join('');
    const node = id => `<span class="flow-node">${esc(fname(id))}</span>`;
    const flow = `
      <div class="flow">
        <div class="flow-row"><span class="flow-step">1단계</span>${node(1)}</div>
        <div class="flow-arrow">↓</div>
        <div class="flow-row"><span class="flow-step">2단계</span>${node(2)}</div>
        <div class="flow-arrow">↓</div>
        <div class="flow-row"><span class="flow-step">3단계</span>${node(3)}${node(4)}</div>
        <div class="flow-arrow">↓</div>
        <div class="flow-row"><span class="flow-step">4단계</span>${node(5)}${node(6)}</div>
        <div class="flow-arrow">↓</div>
        <div class="flow-row"><span class="flow-step">5단계</span>${node(7)}${node(8)}${node(9)}</div>
        <div class="flow-arrow">↓</div>
        <div class="flow-row"><span class="flow-step">마지막</span>${node(11)}${node(12)}</div>
        <div class="flow-row" style="margin-top:6px"><span class="flow-step">병행</span><span class="flow-node side">${esc(fname(10))} · 언제든 함께</span></div>
      </div>`;
    const fields = FIELDS.map(f => `
      <article class="mapfield">
        <h3><span class="mono">F-${pad(f.id)}</span>${esc(f.name)}</h3>
        <p class="pre">${esc(f.prereqs.length ? '선수: ' + f.prereqs.map(p => fname(p)).join(', ') : f.prereqNote)}</p>
        <p style="font-size:var(--fs-sm)">${esc(f.summary)}</p>
        <ul class="kp">${f.keyPoints.map(k => `<li><b>${esc(k.name)}</b><span>${esc(k.desc)}</span></li>`).join('')}</ul>
      </article>`).join('');

    return `
      <section class="sec-head">
        <h1 class="page-title">학습 지도</h1>
        <p>최종 목표: 설비의 원리를 이해하고, 정상/이상 상태를 구분하며, 점검 결과를 이해하고, 선임자의 지시를 정확히 알아듣는 신입사원.</p>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>단계 정의</h2></div>
        <div class="table-wrap">
          <table class="lvtable">
            <thead><tr><th>단계</th><th>이름</th><th>설명</th><th>도달 목표</th></tr></thead>
            <tbody>${lv}</tbody>
          </table>
        </div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>분야 순서</h2><p>아래 분야는 위 분야를 바탕으로 해요.</p></div>
        <div class="panel">${flow}</div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>진단과 추천 규칙</h2></div>
        <div class="panel">
          <ul class="rules">
            <li><b>○ 이해</b>: 문제를 연속 2개 맞힘 · <b>△ 부분 이해</b>: 정답·오답이 섞이거나 레슨 후 확인 문제 통과 · <b>✕ 보강 필요</b>: 레슨 후 확인 문제도 틀리거나 ‘모르겠어요’ 2회 이상</li>
            <li>Lv.n 문제를 맞히면 Lv.n+1로 올라가요. 틀리면 기초 개념 카드 → 확인 문제 → 한 단계 아래(Lv.n-1) 문제로 내려가 확인해요.</li>
            <li>다음 추천: ① ✕ 분야가 있으면 그 분야의 선수 분야부터 ② 없으면 미진단 분야 중 번호가 낮은 것 ③ 모두 진단했으면 △ 분야 중 도달 단계가 가장 낮은 것</li>
            <li>전기 안전(10)은 언제든 병행하고, 점검·고장 대응(11)과 도면·현장 용어(12)는 마지막에 해요.</li>
          </ul>
        </div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>분야별 핵심 지식</h2></div>
        ${fields}
      </section>`;
  }

  /* ───────── 기록 내보내기 ───────── */
  function exportRecords() {
    const payload = {
      app: '전기실 진단노트',
      exportedAt: new Date().toISOString(),
      summary: FIELDS.map(f => {
        const d = state.fields[f.id];
        return { fieldId: f.id, field: f.name, status: STATUS[statusOf(f.id)].label, reachedLevel: d.reached, correct: d.correct, wrong: d.wrong, unknown: d.unknown, recheckPass: d.recheckPass, recheckFail: d.recheckFail, lastDate: d.lastDate };
      }),
      recommendation: recommend(),
      askList: state.askList,
      state
    };
    const text = JSON.stringify(payload, null, 2);
    const now = new Date();
    const fileName = `elec-diag-record_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.json`;
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) { /* 다운로드가 막힌 환경은 아래 텍스트 상자로 대신 */ }
    ui.exportText = text;
    render();
  }

  function copyExport() {
    const ta = document.getElementById('exportText');
    if (!ta) return;
    const fallback = () => { ta.focus(); ta.select(); toast('내용을 선택했어요. 길게 눌러 복사하세요'); };
    try {
      navigator.clipboard.writeText(ta.value).then(() => toast('복사했어요'), fallback);
    } catch (e) {
      fallback();
    }
  }

  /* ───────── 이벤트 ───────── */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    const fid = el.dataset.field ? Number(el.dataset.field) : null;
    const idx = el.dataset.idx != null ? Number(el.dataset.idx) : null;

    switch (a) {
      case 'nav':
        if (view === 'quiz' && session && session.phase !== 'end') session = null;
        ui.confirmReset = false;
        go(el.dataset.view);
        break;
      case 'open-field':
        ui.fieldId = fid;
        go('field');
        break;
      case 'start':
        startField(fid);
        break;
      case 'answer':
        if (session && session.phase === 'question') answer(idx);
        break;
      case 'next':
        nextAfterCorrect();
        break;
      case 'card-ok':
        cardNext();
        break;
      case 'card-unsure':
        session.alt = true;
        render();
        break;
      case 'card-ask':
        addAsk();
        cardNext();
        break;
      case 'recheck-answer':
        if (session && session.phase === 'recheck') recheckAnswer(idx);
        break;
      case 'continue':
        continueAfterLesson();
        break;
      case 'quit':
        if (session) {
          if (session.history.length) { endSession('quit'); } else { session = null; go('home'); }
        }
        break;
      case 'export':
        exportRecords();
        break;
      case 'copy-export':
        copyExport();
        break;
      case 'reset':
        ui.confirmReset = true;
        render();
        break;
      case 'reset-cancel':
        ui.confirmReset = false;
        render();
        break;
      case 'reset-confirm':
        store.clear();
        state = freshState();
        save();
        ui.confirmReset = false;
        ui.exportText = null;
        session = null;
        render();
        toast('기록을 초기화했어요');
        break;
      case 'ask-remove':
        state.askList.splice(idx, 1);
        save();
        render();
        break;
      default:
        break;
    }
  });

  // 테스트·디버깅용으로 읽기 전용 접근점만 노출
  window.ElecDiag = {
    getState: () => JSON.parse(JSON.stringify(state)),
    recommend: () => recommend(),
    statusOf: id => statusOf(id)
  };

  render();
})();
