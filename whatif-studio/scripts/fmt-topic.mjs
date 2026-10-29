// topic.json 정리: 2칸 들여쓰기 + timeline/shot/cue/source 항목은 한 줄에 하나씩
// 사용: node scripts/fmt-topic.mjs topics/<slug>/topic.json
import fs from 'node:fs';

const oneLine = o => '{' + Object.entries(o).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ') + '}';
const ONE_LINE_LISTS = new Set(['timeline', 'shots', 'cues', 'sources', 'comments']);

function fmt(v, ind, key) {
  const pad = '  '.repeat(ind), pad1 = '  '.repeat(ind + 1);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    if (ONE_LINE_LISTS.has(key)) return '[\n' + v.map(x => pad1 + (x && typeof x === 'object' ? oneLine(x) : JSON.stringify(x))).join(',\n') + '\n' + pad + ']';
    if (v.every(x => typeof x !== 'object' || x === null)) return JSON.stringify(v).replace(/","/g, '", "');
    return '[\n' + v.map(x => pad1 + fmt(x, ind + 1)).join(',\n') + '\n' + pad + ']';
  }
  if (v && typeof v === 'object') {
    const e = Object.entries(v);
    if (!e.length) return '{}';
    return '{\n' + e.map(([k, x]) => `${pad1}${JSON.stringify(k)}: ${fmt(x, ind + 1, k)}`).join(',\n') + '\n' + pad + '}';
  }
  return JSON.stringify(v);
}

export function formatTopic(obj) { return fmt(obj, 0) + '\n'; }

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of process.argv.slice(2)) {
    const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
    fs.writeFileSync(f, formatTopic(obj));
    console.log('formatted', f);
  }
}
