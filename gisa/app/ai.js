// "AI에게 묻기". claude.ai에서 열었을 때만 쓸 수 있고(sample 기능), 그냥 파일로 열면 아예 나타나지 않는다.
//  - 좁은 화면(폰): 문제마다 접힌 질문 상자(panel)
//  - 넓은 화면(PC): 오른쪽에 고정된 질문 패널(mountSide). 어느 탭에서든 열려 있고, 지금 보는 화면을 같이 본다.
(function (G) {
  'use strict';

  const NUMS = ['1', '2', '3', '4'];
  const WIDE_QUERY = '(min-width: 940px)';

  let sample = null; // claude.use('sample') 결과. null이면 기능 숨김
  let getCtx = null; // 사이드 패널이 쓸 "지금 화면" 제공 함수
  let side = null; // 만들어진 사이드 패널
  const readyFns = [];
  const layoutFns = [];
  const panels = new WeakMap(); // 문제 객체 → 인라인 패널(다시 그려도 대화·입력이 유지되게)
  const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(WIDE_QUERY) : null;

  const wide = () => !!(mql && mql.matches);
  const sideMode = () => !!(sample && side && wide());

  if (mql) {
    const fire = () => layoutFns.forEach((f) => f());
    if (mql.addEventListener) mql.addEventListener('change', fire);
    else if (mql.addListener) mql.addListener(fire);
  }

  if (typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function') {
    window.claude
      .use('sample')
      .then((fn) => {
        sample = fn || null;
        if (sample) {
          tryMount();
          readyFns.forEach((f) => f());
        }
      })
      .catch(() => (sample = null));
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ───────── 프롬프트: 규칙 + 지금 화면의 검증된 데이터 ─────────
  const RULES = [
    '너는 한국 전기기사 필기시험을 준비하는 학생을 돕는 튜터야. 학생은 이론을 거의 몰라.',
    '규칙:',
    '- 반말(~야, ~해)로, 쉬운 말과 일상 비유로 설명해. 전문용어는 처음 나올 때 한 번 풀어 줘.',
    '- 아래 [화면 데이터]는 이 앱이 코드로 검산한 내용이야. 이걸 기준으로 설명하고, 다른 값을 주장하지 마.',
    '- 확실하지 않은 공식이나 수치는 지어내지 말고 "확실하지 않아"라고 말해.',
    '- 짧게: 보통 3~8문장. 단계가 필요하면 1) 2) 3)으로 줄을 나눠. 마크다운 표·제목·굵게(**)는 쓰지 마.',
    '- 학생 질문이 전기기사 공부와 관계없으면 한 문장으로 공부 이야기로 돌려.',
  ];

  function questionBlock(q, st) {
    const lines = [
      '개념: ' + G.conceptMap[q.conceptId].name,
      '문제: ' + q.text,
      '보기: ' + q.choices.map((c, i) => NUMS[i] + ') ' + c.label).join('  '),
      '정답: ' + NUMS[q.answerIndex] + ') ' + q.choices[q.answerIndex].label,
      '한 줄 결론: ' + q.explain.conclusion,
      '풀이 단계: ' + q.explain.steps.join(' / '),
      '오답 이유: ' + q.choices.map((c, i) => (c.correct ? '' : NUMS[i] + ') ' + c.why)).filter(Boolean).join(' / '),
      '함정: ' + q.explain.traps.join(' / '),
      '개념 카드: ' + q.explain.card,
    ];
    if (st.answered && st.chosen >= 0) lines.push('학생이 고른 답: ' + NUMS[st.chosen] + ') ' + q.choices[st.chosen].label + (q.choices[st.chosen].correct ? ' (정답)' : ' (오답)'));
    return lines;
  }

  function block(ctx) {
    const out = ['', '[화면 데이터]'];
    if (ctx.kind === 'question') {
      out.push('학생은 지금 연습 문제를 풀고 있어.');
      out.push(
        ctx.answered
          ? '학생은 이미 답을 골랐어. 정답과 이유를 자유롭게 설명해도 돼.'
          : '학생은 아직 답을 고르지 않았어. 정답 값이나 정답 번호를 절대 말하지 말고, 힌트와 생각하는 순서로만 이끌어. 학생이 답을 알려 달라고 하면 "보기를 먼저 골라 보면 해설이 바로 나와"라고 해.'
      );
      return out.concat(questionBlock(ctx.q, ctx));
    }
    if (ctx.kind === 'lesson') {
      const l = ctx.lesson;
      out.push('학생은 지금 "배우기" 레슨을 읽고 있어.');
      out.push('레슨: ' + l.title + ' (' + l.part + ')');
      out.push('목표: ' + l.goal);
      out.push('본문: ' + l.sections.map((s) => s.h + ': ' + (s.p || []).concat(s.list || []).join(' ')).join(' | ').slice(0, 3500));
      if (ctx.concept) out.push('핵심 공식: ' + ctx.concept.formula);
      out.push('문제 푸는 순서: ' + l.how.join(' / '));
      out.push('시험 포인트: ' + l.points.join(' / '));
      if (ctx.quiz) {
        out.push('화면의 확인 문제: ' + ctx.quiz.q.text + ' 보기: ' + ctx.quiz.q.choices.map((c, i) => NUMS[i] + ') ' + c.label).join('  '));
        out.push(
          ctx.quiz.answered
            ? '확인 문제 정답: ' + NUMS[ctx.quiz.q.answerIndex] + ') ' + ctx.quiz.q.choices[ctx.quiz.q.answerIndex].label + ' / 결론: ' + ctx.quiz.q.explain.conclusion
            : '학생은 확인 문제를 아직 안 풀었어. 그 문제의 정답을 말하지 마.'
        );
      }
      return out;
    }
    if (ctx.kind === 'unit') {
      const c = ctx.concept;
      out.push('학생은 지금 "과목별" 탭에서 한 단락을 공부하고 있어.');
      out.push('단락: ' + c.name + ' (' + c.group + ')');
      out.push('개념 카드: ' + c.card);
      out.push('비유: ' + c.analogy);
      out.push('핵심 공식: ' + c.formula);
      out.push('문제 포인트: ' + ctx.points.map((p) => p.t + ' — ' + p.ask + ' 핵심: ' + p.key + ' 함정: ' + p.trap).join(' | '));
      return out;
    }
    out.push('학생은 지금 "' + ctx.label + '" 화면을 보고 있어. 특정 문제나 레슨이 화면에 있지는 않아.');
    if (ctx.stats) out.push('학생 기록 요약: ' + ctx.stats);
    return out;
  }

  const promptFor = (ctx) => RULES.concat(block(ctx)).join('\n');

  function presetList(ctx) {
    if (ctx.kind === 'question') {
      if (!ctx.answered) return ['힌트만 줘', '이 문제가 묻는 게 뭐야?', '어떤 공식을 써야 해?'];
      const mine = ctx.chosen >= 0 && !ctx.q.choices[ctx.chosen].correct;
      return (mine ? ['내가 고른 답은 왜 틀려?'] : []).concat(['풀이를 더 쉽게 설명해 줘', '비유로 다시 설명해 줘', '비슷한 문제 하나 내 줘']);
    }
    if (ctx.kind === 'lesson' || ctx.kind === 'unit') return ['이 개념을 더 쉽게 설명해 줘', '시험엔 어떻게 나와?', '비유를 하나 더 들어 줘', '자주 하는 실수가 뭐야?'];
    return ['공부 순서 추천해 줘', '내 기록 보고 약한 부분 알려 줘', '전기기사 필기 시험 구조 알려 줘'];
  }

  const ERR = {
    rate_limited: '지금은 질문이 너무 많아. 잠시 뒤에 다시 물어봐.',
    session_expired: 'claude.ai 로그인이 풀렸어. 다시 로그인한 뒤 물어봐.',
    refused: '이 질문에는 답할 수 없대. 다르게 물어봐 줘.',
    empty_completion: '답이 비어서 왔어. 질문을 조금 바꿔서 다시 물어봐.',
    prompt_too_large: '대화가 너무 길어졌어. 대화를 지우고 다시 물어봐.',
  };
  const HIDE = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];

  // ───────── 대화 상자(인라인·사이드 공통) ─────────
  // o = { getCtx, multiline, side, hint }
  function buildChat(o) {
    const turns = []; // {role, content}. 규칙+화면 데이터는 보낼 때마다 새로 만들어 맨 앞에 붙임
    let ctl = null;
    let busy = false;

    const body = el('div', 'ai-body' + (o.side ? ' ai-side-body' : ''));
    const thread = el('div', 'ai-thread');
    const hint = o.hint ? el('p', 'ai-hint', o.hint) : null;
    if (hint) thread.append(hint);
    const presets = el('div', 'ai-presets');
    const form = el('form', 'ai-form');
    const input = o.multiline ? el('textarea') : el('input');
    if (!o.multiline) input.type = 'text';
    else input.rows = 2;
    input.placeholder = o.multiline ? '궁금한 걸 물어봐 (Enter로 보내기, Shift+Enter 줄바꿈)' : '이 문제에서 궁금한 걸 물어봐';
    input.setAttribute('aria-label', 'AI에게 질문');
    input.id = o.side ? 'ai-side-input' : 'ai-input';
    const send = el('button', 'btn small primary', '보내기');
    send.type = 'submit';
    const stop = el('button', 'btn small', '멈추기');
    stop.type = 'button';
    stop.hidden = true;
    const note = el('p', 'ai-note', '답은 AI가 써. 이 앱의 정답·해설을 기준으로 설명하게 해 뒀지만, 이상하면 해설을 믿어 줘.');
    form.append(input, send, stop);
    body.append.apply(body, o.side ? [thread, presets, form, note] : [presets, thread, form, note]);

    function refresh() {
      presets.textContent = '';
      presetList(o.getCtx()).forEach((t) => {
        const b = el('button', 'chip ai-chip', t);
        b.type = 'button';
        b.disabled = busy;
        b.onclick = () => ask(t);
        presets.append(b);
      });
    }
    function setBusy(v) {
      busy = v;
      send.disabled = v;
      input.disabled = v;
      stop.hidden = !v;
      presets.querySelectorAll('button').forEach((b) => (b.disabled = v));
    }
    function toBottom() {
      if (o.side) thread.scrollTop = thread.scrollHeight;
    }
    function bubble(role, text) {
      if (hint && hint.parentNode) hint.remove();
      const b = el('div', 'ai-msg ' + (role === 'user' ? 'me' : 'ai'), text);
      thread.append(b);
      toBottom();
      return b;
    }

    async function ask(text) {
      text = String(text || '').trim();
      if (!text || busy || !sample) return;
      bubble('user', text);
      turns.push({ role: 'user', content: text });
      const out = bubble('assistant', '생각 중…');
      out.classList.add('pending');
      setBusy(true);
      ctl = new AbortController();
      const recent = turns.slice(-12);
      const history = recent[0].role === 'user' ? recent : recent.slice(1);
      try {
        const res = await sample([{ role: 'user', content: promptFor(o.getCtx()) }].concat(history), {
          cache: false,
          signal: ctl.signal,
          onText: ({ text: t }) => {
            out.classList.remove('pending');
            out.textContent = t;
            toBottom();
          },
        });
        out.classList.remove('pending');
        out.textContent = res.text + (res.truncated ? '\n(답이 길어서 중간에 끊겼어. 더 짧게 물어봐 줘.)' : '');
        turns.push({ role: 'assistant', content: res.text });
      } catch (e) {
        const code = (e && e.code) || 'upstream_error';
        out.classList.remove('pending');
        if (code === 'cancelled') {
          out.textContent = (e.text || '') + (e.text ? '\n' : '') + '(멈췄어)';
          if (e.text) turns.push({ role: 'assistant', content: e.text });
        } else if (HIDE.indexOf(code) !== -1) {
          sample = null;
          out.textContent = 'AI 질문을 쓸 수 없는 상태야(허용하지 않았거나 이 계정에서 꺼져 있어).';
          form.hidden = true;
          presets.hidden = true;
        } else {
          out.textContent = code === 'refused' ? ERR.refused : (e.text ? e.text + '\n' : '') + (ERR[code] || '연결이 잠깐 끊겼어. 다시 물어봐.');
        }
      } finally {
        ctl = null;
        setBusy(false);
        refresh();
        toBottom();
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const t = input.value;
      input.value = '';
      ask(t);
    });
    if (o.multiline) {
      input.addEventListener('keydown', (e) => {
        // 한글 조합 중 Enter는 글자 확정이므로 보내지 않는다
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
          e.preventDefault();
          form.requestSubmit ? form.requestSubmit() : send.click();
        }
      });
    }
    stop.onclick = () => ctl && ctl.abort();
    function clear() {
      if (ctl) ctl.abort();
      turns.length = 0;
      thread.textContent = '';
      if (hint) thread.append(hint);
    }
    refresh();
    return { el: body, refresh, clear };
  }

  // ───────── 인라인(폰): 문제 아래 접힌 상자 ─────────
  function panel(q, getState) {
    if (!sample || sideMode()) return null;
    let p = panels.get(q);
    if (p) {
      p.chat.refresh();
      return p.node;
    }
    const ctxOf = () => {
      const st = getState();
      return { kind: 'question', q, answered: st.answered, chosen: st.chosen };
    };
    const chat = buildChat({ getCtx: ctxOf });
    const node = el('details', 'ai-box');
    node.append(el('summary', null, 'AI에게 묻기'), chat.el);
    p = { node, chat };
    panels.set(q, p);
    return node;
  }

  // ───────── 사이드(PC): 오른쪽에 고정 ─────────
  function tryMount() {
    if (!sample || !getCtx || side) return;
    const host = document.getElementById('side');
    if (!host) return;
    const head = el('div', 'side-head');
    const clear = el('button', 'btn small', '대화 지우기');
    clear.type = 'button';
    head.append(el('strong', null, 'AI에게 묻기'), clear);
    const ctxLine = el('div', 'side-ctx');
    const chat = buildChat({ getCtx, multiline: true, side: true, hint: '궁금한 걸 물어봐. 지금 보고 있는 문제·레슨·단락을 같이 보고 답해 줘.' });
    clear.onclick = () => chat.clear();
    host.append(head, ctxLine, chat.el);
    side = {
      refresh() {
        ctxLine.textContent = '지금 보는 화면: ' + getCtx().label;
        chat.refresh();
      },
    };
    document.body.classList.add('has-side');
    side.refresh();
  }

  G.aiTutor = {
    panel,
    mountSide(fn) {
      getCtx = fn;
      tryMount();
    },
    updateSide() {
      if (side) side.refresh();
    },
    sideMode,
    available: () => !!sample,
    onReady(fn) {
      readyFns.push(fn);
      if (sample) fn();
    },
    onLayoutChange(fn) {
      layoutFns.push(fn);
    },
  };
})(globalThis.GISA);
