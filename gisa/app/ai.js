// "AI에게 묻기": 문제마다 접힌 질문 상자. claude.ai에서 열었을 때만 보이고(sample 기능),
// 그냥 파일로 열면 window.claude가 없어서 아예 나타나지 않는다.
(function (G) {
  'use strict';

  let sample = null; // claude.use('sample') 결과. null이면 기능 숨김
  let onReady = null;
  const panels = new WeakMap(); // 문제 객체 → 패널 DOM(다시 그려도 대화·입력이 유지되게)

  if (typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function') {
    window.claude
      .use('sample')
      .then((fn) => {
        sample = fn || null;
        if (sample && onReady) onReady();
      })
      .catch(() => (sample = null));
  }

  const NUMS = ['1', '2', '3', '4'];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // 튜터 규칙 + 이 문제의 검증된 데이터 (매 호출 맨 앞 user 턴으로 보냄)
  function rules(q, st) {
    const lines = [
      '너는 한국 전기기사 필기시험을 준비하는 학생을 돕는 튜터야. 학생은 이론을 거의 몰라.',
      '규칙:',
      '- 반말(~야, ~해)로, 쉬운 말과 일상 비유로 설명해. 전문용어는 처음 나올 때 한 번 풀어 줘.',
      '- 아래 [문제 데이터]의 정답·풀이는 코드로 검산한 값이야. 이걸 기준으로 설명하고, 다른 답을 주장하지 마.',
      '- 확실하지 않은 공식이나 수치는 지어내지 말고 "확실하지 않아"라고 말해.',
      '- 짧게: 보통 3~8문장. 단계가 필요하면 1) 2) 3)으로 줄을 나눠. 마크다운 표·제목·굵게(**)는 쓰지 마.',
      '- 학생 질문이 이 문제나 전기기사 공부와 관계없으면 한 문장으로 공부 이야기로 돌려.',
      st.answered
        ? '- 학생은 이미 답을 골랐어. 정답과 이유를 자유롭게 설명해도 돼.'
        : '- 학생은 아직 답을 고르지 않았어. 정답 값이나 정답 번호를 절대 말하지 말고, 힌트와 생각하는 순서로만 이끌어. 학생이 답을 알려 달라고 하면 "보기를 먼저 골라 보면 해설이 바로 나와"라고 해.',
      '',
      '[문제 데이터]',
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
    if (st.answered) lines.push('학생이 고른 답: ' + NUMS[st.chosen] + ') ' + q.choices[st.chosen].label + (q.choices[st.chosen].correct ? ' (정답)' : ' (오답)'));
    return lines.join('\n');
  }

  const ERR = {
    rate_limited: '지금은 질문이 너무 많아. 잠시 뒤에 다시 물어봐.',
    session_expired: 'claude.ai 로그인이 풀렸어. 다시 로그인한 뒤 물어봐.',
    refused: '이 질문에는 답할 수 없대. 다르게 물어봐 줘.',
    empty_completion: '답이 비어서 왔어. 질문을 조금 바꿔서 다시 물어봐.',
    prompt_too_large: '대화가 너무 길어졌어. 새 문제에서 다시 물어봐.',
  };
  const HIDE = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];

  function panel(q, getState) {
    if (!sample) return null;
    let p = panels.get(q);
    if (p) {
      p.refresh();
      return p.node;
    }
    const turns = []; // {role, content} — 규칙 턴은 보낼 때마다 앞에 붙임
    let ctl = null;
    let busy = false;

    const node = el('details', 'ai-box');
    const summary = el('summary', null, 'AI에게 묻기');
    const body = el('div', 'ai-body');
    const thread = el('div', 'ai-thread');
    const presets = el('div', 'ai-presets');
    const form = el('form', 'ai-form');
    const input = el('input');
    input.type = 'text';
    input.placeholder = '이 문제에서 궁금한 걸 물어봐';
    input.setAttribute('aria-label', 'AI에게 질문');
    input.id = 'ai-input';
    const send = el('button', 'btn small primary', '보내기');
    send.type = 'submit';
    const stop = el('button', 'btn small', '멈추기');
    stop.type = 'button';
    stop.hidden = true;
    const note = el('p', 'ai-note', '답은 AI가 써. 이 앱의 정답·해설을 기준으로 설명하게 해 뒀지만, 이상하면 해설을 믿어 줘.');
    form.append(input, send, stop);
    body.append(presets, thread, form, note);
    node.append(summary, body);

    function presetList() {
      const st = getState();
      if (!st.answered) return ['힌트만 줘', '이 문제가 묻는 게 뭐야?', '어떤 공식을 써야 해?'];
      const mine = st.chosen >= 0 && !q.choices[st.chosen].correct;
      return (mine ? ['내가 고른 답은 왜 틀려?'] : []).concat(['풀이를 더 쉽게 설명해 줘', '비유로 다시 설명해 줘', '비슷한 문제 하나 내 줘']);
    }
    function refresh() {
      presets.textContent = '';
      presetList().forEach((t) => {
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
    function bubble(role, text) {
      const b = el('div', 'ai-msg ' + (role === 'user' ? 'me' : 'ai'), text);
      thread.append(b);
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
      const recent = turns.slice(-10);
      try {
        const res = await sample([{ role: 'user', content: rules(q, getState()) }].concat(recent[0].role === 'user' ? recent : recent.slice(1)), {
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
          out.textContent = (e.text ? e.text + '\n' : '') + (ERR[code] || '연결이 잠깐 끊겼어. 다시 물어봐.');
          if (code === 'refused') out.textContent = ERR.refused;
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
    stop.onclick = () => ctl && ctl.abort();
    refresh();
    p = { node, refresh };
    panels.set(q, p);
    return node;
  }

  G.aiTutor = {
    panel,
    available: () => !!sample,
    onReady: (fn) => {
      onReady = fn;
      if (sample) fn();
    },
  };
})(globalThis.GISA);
