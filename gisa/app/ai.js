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

  // 기본 선생님 그림(직접 그린 일러스트). 사진은 "사진 바꾸기"로 내 기기의 이미지를 골라 바꿀 수 있어(이 브라우저에만 저장).
  const AVATAR_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe3d1"/><stop offset="1" stop-color="#f4a9a8"/></linearGradient></defs>' +
    '<circle cx="60" cy="60" r="60" fill="url(#bg)"/>' +
    '<path d="M20 74C10 32 38 10 60 10c24 0 50 22 40 64-2 18-10 26-14 32H34c-4-6-12-14-14-32z" fill="#4b2d22"/>' +
    '<path d="M28 124c2-20 16-26 32-26s30 6 32 26z" fill="#fffaf5"/>' +
    '<path d="M47 100l13 14 13-14z" fill="#f6d4c0"/>' +
    '<rect x="52" y="82" width="16" height="20" rx="7" fill="#f6d2bc"/>' +
    '<ellipse cx="60" cy="62" rx="26" ry="30" fill="#fadccb"/>' +
    '<path d="M33 58c3-24 24-31 34-29 15 2 23 15 20 29-8-12-20-16-34-14-8 2-15 6-20 14z" fill="#4b2d22"/>' +
    '<ellipse cx="50" cy="66" rx="3.2" ry="3.8" fill="#2a1913"/><ellipse cx="70" cy="66" rx="3.2" ry="3.8" fill="#2a1913"/>' +
    '<circle cx="51" cy="64.8" r="1.1" fill="#fff"/><circle cx="71" cy="64.8" r="1.1" fill="#fff"/>' +
    '<path d="M44 59q6-4 12-1M64 58q6-3 12 1" stroke="#4b2d22" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<rect x="42" y="59" width="18" height="14" rx="6" fill="none" stroke="#8a6150" stroke-width="1.6"/>' +
    '<rect x="62" y="59" width="18" height="14" rx="6" fill="none" stroke="#8a6150" stroke-width="1.6"/>' +
    '<path d="M60 65h2" stroke="#8a6150" stroke-width="1.6"/>' +
    '<circle cx="45" cy="75" r="4.5" fill="#f58f8f" opacity=".35"/><circle cx="75" cy="75" r="4.5" fill="#f58f8f" opacity=".35"/>' +
    '<path d="M52 79q8 7 16 0" stroke="#c4554f" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="34" cy="72" r="2.6" fill="#e6b45a"/><circle cx="86" cy="72" r="2.6" fill="#e6b45a"/>' +
    '</svg>';
  const AV_KEY = 'gisa-ai-avatar';
  const THREAD_KEY = 'gisa-ai-thread';
  const TUTOR = '서연';
  const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(AVATAR_SVG);
  function customAvatar() {
    try {
      const v = JSON.parse(localStorage.getItem(AV_KEY));
      return typeof v === 'string' && v.indexOf('data:image/') === 0 ? v : null;
    } catch (e) {
      return null;
    }
  }
  function applyAvatar() {
    const src = customAvatar() || DEFAULT_AVATAR;
    document.documentElement.style.setProperty('--ai-avatar', 'url("' + src + '")');
    document.querySelectorAll('img.side-avatar').forEach((i) => (i.src = src));
    document.querySelectorAll('.ai-avatar-reset').forEach((b) => (b.hidden = !customAvatar()));
  }
  if (typeof document !== 'undefined') applyAvatar();

  // ───────── 프롬프트: 규칙 + 지금 화면의 검증된 데이터 ─────────
  const RULES = [
    '너는 "서연"이야. 전기기사 필기시험을 함께 준비하는 친구 같은 사람이고, 아주 다정하고 자상하고 따뜻한 여자야. 가르쳐 줄 때는 좋은 선생님처럼 차근차근 해. 스스로를 "쌤"이나 "선생님"이라고 부르지 마. 학생은 이론을 거의 몰라.',
    '말투와 태도:',
    '- 자기소개는 하지 마. 이름이나 역할을 소개하거나 "나는 ~야" 같은 인사로 시작하지 말고, 바로 질문에 대한 이야기로 들어가.',
    '- 반말(~야, ~해, ~할까?)로 친한 사람이 옆에서 말 걸듯 자연스럽고 편하게 말해. 메신저로 대화하는 것처럼 짧은 문장으로, 딱딱한 설명문이나 안내문 투는 피해.',
    '- 질문을 받으면 먼저 짧게 공감하거나 칭찬해("좋은 질문이야", "잘하고 있어"). 틀렸거나 모르는 것도 "괜찮아, 누구나 헷갈려"처럼 먼저 다독여 줘.',
    '- 어려운 건 천천히, 한 단계씩, 일상 비유로. 마지막에는 "여기까지 이해됐어?"처럼 다정하게 이어 가도 좋아. 이모지·이모티콘·ㅎㅎ/ㅋㅋ 같은 표현, 물결(~)과 느낌표 남발은 쓰지 마. 글자만으로 차분하고 따뜻하게 말해.',
    '- 학생을 부를 때는 "너"나 "우리 학생"이라고 해. 이름은 쓰지 마. 연애나 성적인 말투·표현은 쓰지 않고, 따뜻하고 매력적인 다정함으로만 대해.',
    '규칙:',
    '- 쉬운 말로 설명하고, 전문용어는 처음 나올 때 한 번 풀어 줘.',
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
    // 대화는 이 브라우저(와 계정)에 저장해 두고, 업데이트로 화면이 다시 열려도 이어서 보여 준다
    const log = []; // {role, text, content, quote, kind}
    let cloudT = null;
    function persist() {
      if (!o.persist) return;
      const keep = log.slice(-30);
      let s = JSON.stringify(keep);
      while (s.length > 70000 && keep.length > 2) {
        keep.shift();
        s = JSON.stringify(keep);
      }
      try {
        localStorage.setItem(o.persist, s);
      } catch (e) {
        /* 저장소를 못 쓰면 기억하지 않음 */
      }
      const d = G.sync && G.sync.userDoc ? G.sync.userDoc('aithread') : null;
      if (d) {
        clearTimeout(cloudT);
        cloudT = setTimeout(() => {
          Promise.resolve()
            .then(() => d.set({ log: keep, t: Date.now() }))
            .catch(() => {});
        }, 2000);
      }
    }

    const body = el('div', 'ai-body' + (o.side ? ' ai-side-body' : ''));
    const thread = el('div', 'ai-thread');
    const hint = o.hint ? el('p', 'ai-hint', o.hint) : null;
    if (hint) thread.append(hint);
    const presets = el('div', 'ai-presets');
    const form = el('form', 'ai-form');
    const input = o.multiline ? el('textarea') : el('input');
    if (!o.multiline) input.type = 'text';
    else input.rows = 2;
    input.placeholder = o.multiline ? '서연한테 궁금한 걸 편하게 물어봐 (Enter로 보내기, Shift+Enter 줄바꿈)' : '서연한테 이 문제에서 궁금한 걸 물어봐';
    input.setAttribute('aria-label', TUTOR + '에게 질문');
    input.id = o.side ? 'ai-side-input' : 'ai-input';
    const send = el('button', 'btn small primary', '보내기');
    send.type = 'submit';
    const stop = el('button', 'btn small', '멈추기');
    stop.type = 'button';
    stop.hidden = true;
    // 답글: 앞선 AI 답변 하나를 골라 그 답변에 대해 이어서 묻는다
    let replyTo = null; // 답글 대상 AI 답변 글(또는 그 안의 문장 하나)
    let replyKind = 'answer'; // 'answer' | 'sentence'
    const snippet = (t, n) => {
      const one = String(t).replace(/\s+/g, ' ').trim();
      return one.length > n ? one.slice(0, n) + '…' : one;
    };
    const replyBar = el('div', 'ai-reply');
    replyBar.hidden = true;
    const replyText = el('span', 'ai-reply-text');
    const replyX = el('button', 'btn small', '✕');
    replyX.type = 'button';
    replyX.setAttribute('aria-label', '답글 취소');
    replyX.onclick = () => setReply(null);
    const replyLabel = el('strong', null, '↩ 이 답변에 답글');
    replyBar.append(replyLabel, replyText, replyX);
    function setReply(t, kind) {
      replyTo = t ? String(t) : null;
      replyKind = replyTo && kind === 'sentence' ? 'sentence' : 'answer';
      replyBar.hidden = !replyTo;
      replyLabel.textContent = replyKind === 'sentence' ? '↩ 이 문장에 질문' : '↩ 이 답변에 답글';
      replyText.textContent = replyTo ? snippet(replyTo, 70) : '';
      thread.querySelectorAll('.ai-sent.on').forEach((s) => s.classList.remove('on'));
      if (replyTo) input.focus();
    }
    // AI 답변을 문장 단위로 쪼개서, 문장을 누르면 그 문장에 대해 이어서 물을 수 있게 한다
    function makeTappable(msgEl, text) {
      const parts = String(text).split(/(?<=[.!?。…])(\s+)/);
      if (parts.filter((_, i) => i % 2 === 0 && parts[i].trim()).length < 1) return;
      msgEl.textContent = '';
      parts.forEach((p, i) => {
        if (i % 2 === 1 || !p.trim()) {
          msgEl.append(document.createTextNode(p));
          return;
        }
        const s = el('span', 'ai-sent', p);
        s.tabIndex = 0;
        s.setAttribute('role', 'button');
        s.setAttribute('aria-label', '이 문장에 질문: ' + snippet(p, 40));
        const pick = () => {
          if (busy) return;
          if (s.classList.contains('on')) {
            setReply(null);
            return;
          }
          setReply(p.trim(), 'sentence');
          s.classList.add('on');
        };
        s.addEventListener('click', pick);
        s.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pick();
          }
        });
        msgEl.append(s);
      });
    }
    function addReplyButton(msgEl, t) {
      makeTappable(msgEl, t);
      const row = el('div', 'ai-reply-row');
      const b = el('button', 'ai-reply-btn', '↩ 이 답변에 답글');
      b.type = 'button';
      b.onclick = () => setReply(t);
      row.append(b, el('span', 'ai-sent-hint', '문장을 누르면 그 문장에 질문할 수 있어'));
      msgEl.after(row);
    }
    const note = el('p', 'ai-note', '답은 AI가 써. 이 앱의 정답·해설을 기준으로 설명하게 해 뒀지만, 이상하면 해설을 믿어 줘.');
    form.append(input, send, stop);
    body.append.apply(body, o.side ? [thread, presets, replyBar, form, note] : [presets, thread, replyBar, form, note]);

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
    // 답이 길게 써지는 동안 화면이 자동으로 내려가면 위에서부터 읽기 어려워서, 따라 내려가지 않는다.
    // 새 질문을 보내면 그 질문(과 답의 시작)이 보이는 자리로만 한 번 옮긴다.
    function toStart(el) {
      if (!o.side || !el) return;
      const top = el.getBoundingClientRect().top - thread.getBoundingClientRect().top + thread.scrollTop;
      thread.scrollTop = Math.max(0, top - 6);
    }
    function bubble(role, text, quote, kind) {
      if (hint && hint.parentNode) hint.remove();
      const b = el('div', 'ai-msg ' + (role === 'user' ? 'me' : 'ai'), text);
      if (quote) {
        b.textContent = '';
        b.append(el('div', 'ai-quote', (kind === 'sentence' ? '↩ 문장: ' : '↩ ') + snippet(quote, 90)), document.createTextNode(text));
      }
      thread.append(b);
      return b;
    }

    async function ask(text) {
      text = String(text || '').trim();
      if (!text || busy || !sample) return;
      const quote = replyTo;
      const kind = replyKind;
      const sendText = quote
        ? kind === 'sentence'
          ? '[앞선 AI 답변 중 이 문장에 대한 질문]\n문장: "' + String(quote).slice(0, 500) + '"\n(이 문장은 바로 위 대화의 네 답변 안에 있어. 그 흐름을 이어서 이 문장에 대해서만 답해 줘.)\n질문: ' + text
          : '[앞선 AI 답변에 대한 질문]\n앞선 답변: "' + String(quote).slice(0, 700) + '"\n질문: ' + text
        : text;
      const asked = bubble('user', text, quote, kind);
      log.push({ role: 'user', text, content: sendText, quote: quote || null, kind });
      turns.push({ role: 'user', content: sendText });
      setReply(null);
      const out = bubble('assistant', '서연이 생각 중이야…');
      out.classList.add('pending');
      toStart(asked);
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
          },
        });
        out.classList.remove('pending');
        out.textContent = res.text + (res.truncated ? '\n(답이 길어서 중간에 끊겼어. 더 짧게 물어봐 줘.)' : '');
        turns.push({ role: 'assistant', content: res.text });
        log.push({ role: 'assistant', text: res.text });
        persist();
        addReplyButton(out, res.text);
        const cx = o.getCtx ? o.getCtx() : null;
        if (G.aiqa) G.aiqa.save({ q: (quote ? '(' + (kind === 'sentence' ? '문장 질문' : '답글') + ': "' + snippet(quote, 40) + '") ' : '') + text, a: res.text, where: (cx && cx.label) || '', key: cx && cx.q && cx.q.key });
      } catch (e) {
        const code = (e && e.code) || 'upstream_error';
        out.classList.remove('pending');
        if (code === 'cancelled') {
          out.textContent = (e.text || '') + (e.text ? '\n' : '') + '(멈췄어)';
          if (e.text) {
            turns.push({ role: 'assistant', content: e.text });
            log.push({ role: 'assistant', text: e.text });
            persist();
            addReplyButton(out, e.text);
          }
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
      log.length = 0;
      if (o.persist) {
        try {
          localStorage.removeItem(o.persist);
        } catch (e) {
          /* 무시 */
        }
        const d = G.sync && G.sync.userDoc ? G.sync.userDoc('aithread') : null;
        if (d) Promise.resolve().then(() => d.set({ log: [], t: Date.now() })).catch(() => {});
      }
      setReply(null);
      thread.textContent = '';
      if (hint) thread.append(hint);
    }
    function restore(arr) {
      arr.forEach((m) => {
        if (!m || typeof m.text !== 'string') return;
        if (m.role === 'user') {
          bubble('user', m.text, m.quote || null, m.kind);
          turns.push({ role: 'user', content: m.content || m.text });
          log.push({ role: 'user', text: m.text, content: m.content || m.text, quote: m.quote || null, kind: m.kind });
        } else if (m.role === 'assistant') {
          const b = bubble('assistant', m.text);
          turns.push({ role: 'assistant', content: m.text });
          log.push({ role: 'assistant', text: m.text });
          addReplyButton(b, m.text);
        }
      });
      thread.scrollTop = thread.scrollHeight;
    }
    if (o.persist) {
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(o.persist));
      } catch (e) {
        saved = null;
      }
      if (Array.isArray(saved) && saved.length) restore(saved);
      else if (G.sync && G.sync.peek) {
        // 브라우저 저장소가 비워진 경우에는 계정에 저장해 둔 대화를 불러온다
        G.sync.peek('aithread', 1500).then((d) => {
          if (d && Array.isArray(d.log) && d.log.length && !log.length && !busy) restore(d.log);
        });
      }
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
    node.append(el('summary', null, TUTOR + '에게 묻기'), chat.el);
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
    const who = el('div', 'side-who');
    const av = el('img', 'side-avatar');
    av.alt = TUTOR + ' 사진';
    av.width = 44;
    av.height = 44;
    const nm = el('div', 'side-name');
    nm.append(el('strong', null, TUTOR), el('span', 'side-sub', '전기기사 필기 담당 · 언제든 편하게 물어봐'));
    who.append(av, nm);
    const act = el('div', 'side-act');
    const clear = el('button', 'btn small', '대화 지우기');
    clear.type = 'button';
    const photo = el('button', 'btn small soft', '사진 바꾸기');
    photo.type = 'button';
    const reset = el('button', 'btn small soft ai-avatar-reset', '기본 사진');
    reset.type = 'button';
    reset.hidden = true;
    const file = el('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    file.id = 'ai-avatar-file';
    photo.onclick = () => file.click();
    reset.onclick = () => {
      try {
        localStorage.removeItem(AV_KEY);
      } catch (e) {
        /* 무시 */
      }
      applyAvatar();
    };
    file.onchange = () => {
      const f = file.files && file.files[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 192;
        c.height = 192;
        const m = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 192, 192);
        try {
          localStorage.setItem(AV_KEY, JSON.stringify(c.toDataURL('image/jpeg', 0.85)));
        } catch (e) {
          /* 저장소를 못 쓰면 이번 화면에서만 */
        }
        URL.revokeObjectURL(url);
        applyAvatar();
      };
      img.src = url;
      file.value = '';
    };
    act.append(clear, photo, reset);
    head.append(who, act, file);
    const ctxLine = el('div', 'side-ctx');
    const chat = buildChat({ getCtx, multiline: true, side: true, persist: THREAD_KEY, hint: '막히는 거 있어? 편하게 말해 줘. 지금 보고 있는 문제랑 같이 보면서 천천히 알려 줄게' });
    clear.onclick = () => chat.clear();
    host.append(head, ctxLine, chat.el);
    side = {
      refresh() {
        ctxLine.textContent = '지금 보는 화면: ' + getCtx().label;
        chat.refresh();
      },
    };
    document.body.classList.add('has-side');
    applyAvatar();
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
    // 대화가 아니라 한 번 물어서 답만 받는다(기출 해설 같은 용도). onText는 지금까지 받은 전체 글을 넘겨 준다.
    async ask(content, o) {
      if (!sample) throw { code: 'unavailable' };
      const res = await sample([{ role: 'user', content }], {
        cache: false,
        signal: o && o.signal,
        onText: ({ text }) => o && o.onText && o.onText(text),
      });
      return res;
    },
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
