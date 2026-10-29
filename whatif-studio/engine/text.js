// WhatIf Studio — 텍스트 산출물: 언어별 보기, SRT, 챕터, 유튜브 메타데이터
// 브라우저(스튜디오 다운로드 버튼)와 Node(build.mjs) 양쪽에서 쓴다.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root.WI = root.WI || {}, api);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const pick = (o, k, lang) => (lang === 'en' && o.en && o.en[k] != null ? o.en[k] : o[k]);

  // 언어가 적용된 화면용 데이터
  function localize(topic, lang) {
    const timeline = topic.timeline.map(d => ({
      s: d.s, e: d.e, comment: !!d.comment, outro: !!d.outro,
      fact: pick(d, 'fact', lang) || '', sub: pick(d, 'sub', lang) || '',
      narLines: pick(d, 'narLines', lang) || [],
    }));
    const h = topic.hook;
    const hook = {
      until: h.until,
      comments: pick(h, 'comments', lang),
      title: pick(h, 'title', lang),
      countdown: Object.assign({}, h.countdown, { label: lang === 'en' && h.en && h.en.countdownLabel ? h.en.countdownLabel : h.countdown.label }),
    };
    return { lang, timeline, hook, outroTitle: pick(topic, 'outroTitle', lang) };
  }

  function secToSrt(sec) {
    const total = Math.round(sec * 1000);
    const ms = total % 1000, s = Math.floor(total / 1000);
    const p = (n, z = 2) => String(n).padStart(z, '0');
    return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)},${p(ms, 3)}`;
  }

  // mode 1: 대형 자막만, mode 2: [팩트 - 설명] + 자막
  function srt(view, mode) {
    const NL = '\n';
    const blocks = [];
    let idx = 1;
    view.timeline.forEach(item => {
      const count = item.narLines.length;
      const segDur = (item.e - item.s) / count;
      item.narLines.forEach((line, i) => {
        const a = item.s + i * segDur, b = item.s + (i + 1) * segDur;
        const body = (mode === 2 && item.fact) ? `[${item.fact} - ${item.sub}]` + NL + line : line;
        blocks.push(`${idx++}` + NL + `${secToSrt(a)} --> ${secToSrt(b)}` + NL + body + NL);
      });
    });
    return blocks.join(NL);
  }

  function srtFiles(topic, langs) {
    const files = {};
    for (const lang of langs) {
      const v = localize(topic, lang);
      const L = lang.toUpperCase();
      files[`${L}_${topic.fileStem}_LargeSub.srt`] = srt(v, 1);
      files[`${L}_${topic.fileStem}_Full.srt`] = srt(v, 2);
    }
    return files;
  }

  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // 유튜브 챕터 규칙: 0:00 시작, 3개 이상, 각 10초 이상 → 짧은 구간은 묶는다
  function chapters(topic, lang, minLen = 10) {
    const v = localize(topic, lang);
    const segs = v.timeline.filter(d => !d.outro);
    const groups = [];
    let cur = null;
    for (const d of segs) {
      const label = d.comment ? (lang === 'en' ? 'Intro' : '시작') : d.fact;
      if (!cur) cur = { s: d.s, labels: [] };
      cur.e = d.e;
      if (label && !cur.labels.includes(label)) cur.labels.push(label);
      if (cur.e - cur.s >= minLen) { groups.push(cur); cur = null; }
    }
    if (cur) {
      if (groups.length) groups[groups.length - 1].labels.push(...cur.labels);
      else groups.push(cur);
    }
    if (groups.length < 3) return [];
    groups[0].s = 0;
    return groups.map(g => ({ start: g.s, label: g.labels.slice(0, 2).join(' · ') }));
  }

  // 유튜브 업로드용 메타데이터
  function metadata(topic, channel, { ratio, lang }) {
    const shorts = ratio === '9x16' && topic.duration <= 180;
    const title = (channel.titlePattern || '{title}').replace('{title}', topic.title).slice(0, 100);
    const primary = lang === 'en' ? 'en' : 'ko';
    const ch = chapters(topic, primary);
    const tags = [...new Set([...(shorts ? ['#Shorts'] : []), ...(topic.hashtags || []), ...(channel.hashtags || [])])].slice(0, 3);
    const summary = pick(topic, 'summary', primary);
    const lines = [summary, ''];
    if (ch.length) { ch.forEach(c => lines.push(`${mmss(c.start)} ${c.label}`)); lines.push(''); }
    if (topic.sources && topic.sources.length) {
      lines.push('Sources:');
      topic.sources.forEach(s => lines.push(`- ${s.publisher}: ${s.url}`));
      lines.push('');
    }
    if (channel.descriptionFooter) { lines.push(channel.descriptionFooter); lines.push(''); }
    lines.push(tags.join(' '));
    const description = lines.join('\n').trim();
    const kw = [...new Set([...(topic.tags || []), ...(channel.tags || [])])];
    while (kw.join(',').length > 480) kw.pop();
    return {
      title, description, tags: kw, hashtags: tags,
      categoryId: String(channel.categoryId || '28'),
      defaultLanguage: primary,
      privacyStatus: 'private',
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: false,
      shorts, ratio, duration: topic.duration, chapters: ch,
    };
  }

  return { localize, secToSrt, srt, srtFiles, chapters, metadata, mmss };
});
