// 용어 사전(나무위키처럼 눌러서 보는 해설) 데이터와 글 속 용어 찾기.
//  G.term(id, '이름', { group, aliases, brief, easy, detail, formulas, units, exam, pitfalls, example, related, concept })
//   - aliases: 글 속에서 이 용어로 인식할 다른 표기(링크가 걸림). 이름 자신은 자동으로 포함된다.
//   - easy/detail/exam/pitfalls: 문장 배열(또는 문자열 하나)
//   - formulas: [['식', '설명'], ...]    units: [['기호', '이름'], ...]
//   - example: { q: '문제', expr: '계산식(숫자만)', ans: 숫자, unit: '단위', say: '풀이 한 줄' }  ← 계산식은 테스트가 계산기로 다시 계산해서 ans와 맞는지 확인
(function (G) {
  'use strict';

  const terms = [];
  const byId = {};
  let index = null; // 별칭 → 용어 id, 정규식(긴 것부터)

  function term(id, name, o) {
    if (byId[id]) throw new Error('용어 id 중복: ' + id);
    const t = Object.assign({ id, name, group: '', aliases: [], brief: '', easy: [], detail: [], formulas: [], units: [], exam: [], pitfalls: [], example: null, related: [], concept: null }, o);
    ['easy', 'detail', 'exam', 'pitfalls'].forEach((k) => {
      if (typeof t[k] === 'string') t[k] = [t[k]];
    });
    terms.push(t);
    byId[id] = t;
    index = null;
    return t;
  }

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isWordChar = (c) => !!c && /[0-9A-Za-z가-힣_]/.test(c);
  const startsWordy = (s) => /[0-9A-Za-z]/.test(s[0]);
  const endsWordy = (s) => /[0-9A-Za-z]/.test(s[s.length - 1]);

  function build() {
    const map = {};
    terms.forEach((t) => {
      [t.name].concat(t.aliases).forEach((a) => {
        if (!a) return;
        if (map[a] && map[a] !== t.id) throw new Error('용어 별칭이 겹침: "' + a + '" (' + map[a] + ', ' + t.id + ')');
        map[a] = t.id;
      });
    });
    const keys = Object.keys(map).sort((a, b) => b.length - a.length);
    index = { map, keys, re: keys.length ? new RegExp(keys.map(esc).join('|'), 'g') : null };
  }

  // 글 안에서 용어를 찾는다. 앞이 한글·영문·숫자로 이어지면(더 긴 낱말의 일부) 건너뛰고,
  // 영문·숫자로 끝나는 별칭은 뒤가 영문·숫자로 이어지지 않을 때만 인정한다.
  // 돌려주는 값: [{ start, end, id }] (겹치지 않음, 앞에서부터)
  function find(text, opts) {
    if (!index) build();
    if (!index.re) return [];
    const skip = (opts && opts.skip) || null; // 이미 걸린 용어는 건너뜀(한 묶음에 한 번만 걸 때)
    const out = [];
    const seen = {};
    index.re.lastIndex = 0;
    let m;
    while ((m = index.re.exec(text))) {
      const a = m[0];
      const id = index.map[a];
      const before = text[m.index - 1];
      const after = text[m.index + a.length];
      let ok = !isWordChar(before);
      if (ok && endsWordy(a) && /[0-9A-Za-z]/.test(after || '')) ok = false;
      if (ok && startsWordy(a) && /[0-9A-Za-z가-힣]/.test(before || '')) ok = false;
      if (ok && skip && skip[id]) ok = false;
      if (!ok) {
        index.re.lastIndex = m.index + 1;
        continue;
      }
      if (opts && opts.once) {
        if (seen[id]) continue;
        seen[id] = true;
      }
      out.push({ start: m.index, end: m.index + a.length, id });
    }
    return out;
  }

  function search(q) {
    const s = String(q || '').trim().toLowerCase();
    if (!s) return terms.slice();
    return terms.filter((t) => [t.name].concat(t.aliases, [t.brief]).some((x) => x && x.toLowerCase().indexOf(s) >= 0));
  }

  G.term = term;
  G.glossary = { terms, byId, find, search, rebuild: () => (index = null), build };
})(globalThis.GISA);
