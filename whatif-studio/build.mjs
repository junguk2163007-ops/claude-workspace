#!/usr/bin/env node
// topic → dist/<slug>/ (단일 index.html + SRT + 메타데이터 + sources.md)
// 사용: node build.mjs <slug> [--ratio 9:16|16:9|both] [--lang ko|en|both] [--channel channels/default.json] [--strict]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const text = require('./engine/text.js');

export function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) {
      const key = k.slice(2);
      const nx = argv[i + 1];
      if (nx === undefined || nx.startsWith('--')) a[key] = true;
      else { a[key] = nx; i++; }
    } else a._.push(k);
  }
  return a;
}

export const ratioList = r => {
  const v = String(r || '9:16').toLowerCase();
  if (v === 'both') return ['9x16', '16x9'];
  const k = v.replace(':', 'x');
  if (!['9x16', '16x9'].includes(k)) throw new Error(`--ratio 는 9:16 / 16:9 / both 중 하나: ${r}`);
  return [k];
};
export const langList = l => {
  const v = String(l || 'ko').toLowerCase();
  if (v === 'both') return ['ko', 'en'];
  if (!['ko', 'en'].includes(v)) throw new Error(`--lang 은 ko / en / both 중 하나: ${l}`);
  return [v];
};

const ENGINE_FILES = ['engine/core.js', 'engine/text.js', 'engine/layout.js', 'engine/world.js', 'engine/audio.js', 'engine/composite.js'];
const SCENE_FILES = () => fs.readdirSync(path.join(ROOT, 'scenes')).filter(f => f.endsWith('.js')).sort().map(f => `scenes/${f}`);

const FONT_FACES = [
  { family: 'Nanum Myeongjo', weight: 400, file: 'NanumMyeongjo-Regular.ttf' },
  { family: 'Nanum Myeongjo', weight: 700, file: 'NanumMyeongjo-Bold.ttf' },
  { family: 'Nanum Myeongjo', weight: 800, file: 'NanumMyeongjo-ExtraBold.ttf' },
  { family: 'Noto Sans KR', weight: 400, file: 'NotoSansKR[wght].ttf', wght: 400 },
  { family: 'Noto Sans KR', weight: 500, file: 'NotoSansKR[wght].ttf', wght: 500 },
  { family: 'Noto Sans KR', weight: 700, file: 'NotoSansKR[wght].ttf', wght: 700 },
];

// --- 검증: 구간 연속성, 연출/장면 이름, 자막 길이 규칙(4절) ---
function validate(topic, code, langs, ratios, strict) {
  const errs = [], warns = [];
  const tl = topic.timeline;
  if (!tl.length) errs.push('timeline 비어 있음');
  if (tl[0].s !== 0) errs.push('timeline 은 0초에서 시작해야 함');
  for (let i = 1; i < tl.length; i++) if (Math.abs(tl[i].s - tl[i - 1].e) > 1e-9) errs.push(`timeline 끊김: ${tl[i - 1].e} → ${tl[i].s}`);
  if (Math.abs(tl[tl.length - 1].e - topic.duration) > 1e-9) errs.push(`timeline 끝(${tl[tl.length - 1].e}) ≠ duration(${topic.duration})`);
  if (!tl[0].comment) warns.push('첫 구간에 comment(댓글 훅)가 없음');
  if (!tl[tl.length - 1].outro) warns.push('마지막 구간이 outro 가 아님');
  const shots = topic.shots;
  if (shots[shots.length - 1].e < topic.duration) errs.push('shots 가 영상 끝까지 덮지 않음');
  const defined = kind => new Set([...code.matchAll(new RegExp(`define${kind}\\('([^']+)'`, 'g'))].map(m => m[1]));
  const shotNames = defined('Shot'), rigNames = defined('Rig');
  shots.forEach(s => { if (!shotNames.has(s.shot)) errs.push(`정의되지 않은 연출(shot): ${s.shot}`); });
  topic.rigs.forEach(r => { const n = typeof r === 'string' ? r : (r.type || r.name); if (!rigNames.has(n)) errs.push(`정의되지 않은 장면(rig): ${n}`); });
  const cues = topic.audio.cues;
  cues.forEach(c => { if (c.t + (c.dur || 0) > topic.duration + 0.5) warns.push(`오디오 큐가 영상보다 김: ${c.fx}@${c.t}`); });
  if (ratios.includes('9x16') && topic.duration > 180) errs.push('9:16 쇼츠는 180초 이하여야 함');
  const len = s => [...(s || '')].length;
  for (const lang of langs) {
    const v = text.localize(topic, lang);
    const lim = lang === 'ko' ? { line: 16, fact: 11, sub: 28 } : { line: 32, fact: 22, sub: 56 };
    v.timeline.forEach(d => {
      if (len(d.fact) > lim.fact) warns.push(`[${lang}] fact ${len(d.fact)}자 > ${lim.fact}: ${d.fact}`);
      if (len(d.sub) > lim.sub) warns.push(`[${lang}] sub ${len(d.sub)}자 > ${lim.sub}: ${d.sub}`);
      d.narLines.forEach(l => { if (len(l) > lim.line) warns.push(`[${lang}] 자막 ${len(l)}자 > ${lim.line}: ${l}`); });
      if (!d.narLines.length) errs.push(`[${lang}] 자막 없는 구간: ${d.s}~${d.e}`);
    });
    if (lang === 'en' && !topic.timeline.every(d => d.en && d.en.narLines)) errs.push('--lang en/both 인데 영어 자막(en.narLines)이 없는 구간이 있음');
  }
  if (strict && warns.length) errs.push(...warns.map(w => '(strict) ' + w));
  return { errs, warns };
}

// --- 폰트: 사용 글자만 남긴 woff2 를 base64 로 인라인 ---
function buildFonts(chars) {
  const cacheDir = path.join(ROOT, '.cache', 'fonts');
  fs.mkdirSync(cacheDir, { recursive: true });
  const jobs = [], faces = [];
  for (const f of FONT_FACES) {
    const src = path.join(ROOT, 'vendor', 'fonts', f.file);
    const key = crypto.createHash('sha1').update(f.file + '|' + (f.wght || '') + '|' + chars).digest('hex').slice(0, 16);
    const out = path.join(cacheDir, `${key}.woff2`);
    if (!fs.existsSync(out)) jobs.push({ in: src, out, text: chars, wght: f.wght || null });
    faces.push({ ...f, out });
  }
  if (jobs.length) {
    const jf = path.join(cacheDir, `jobs-${process.pid}.json`);
    fs.writeFileSync(jf, JSON.stringify(jobs));
    try {
      execFileSync('python3', [path.join(ROOT, 'engine', 'fonts.py'), jf], { stdio: 'inherit' });
    } catch (e) {
      throw new Error('폰트 서브셋 실패: python3 와 fonttools 가 필요합니다 → pip install fonttools brotli');
    } finally { fs.rmSync(jf, { force: true }); }
  }
  return faces.map(f => `@font-face { font-family: '${f.family}'; font-style: normal; font-weight: ${f.weight}; font-display: block; src: url(data:font/woff2;base64,${fs.readFileSync(f.out).toString('base64')}) format('woff2'); }`).join('\n');
}

// three.js 의 UUID 생성(ct)이 Math.random 을 소비하면 객체 생성 순서에 따라 장면 난수열이 어긋난다.
// → UUID 는 별도 난수(window.__uuidRandom)를 쓰도록 인라인 사본만 패치한다.
const UUID_SRC = 'function ct(){const t=4294967295*Math.random()|0,e=4294967295*Math.random()|0,n=4294967295*Math.random()|0,i=4294967295*Math.random()|0;';
const UUID_DST = 'function ct(){const R=(typeof window!=="undefined"&&window.__uuidRandom)||Math.random,t=4294967295*R()|0,e=4294967295*R()|0,n=4294967295*R()|0,i=4294967295*R()|0;';
export function patchedThree() {
  const src = fs.readFileSync(path.join(ROOT, 'vendor', 'three.r128.min.js'), 'utf8');
  if (!src.includes(UUID_SRC)) throw new Error('three.js UUID 패치 위치를 찾지 못함 (vendor 버전 확인)');
  return src.replace(UUID_SRC, UUID_DST);
}

const safeJson = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16));
const fill = (tpl, map) => tpl.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in map ? map[k] : m));

export function loadTopic(slug) {
  const dir = path.join(ROOT, 'topics', slug);
  const f = path.join(dir, 'topic.json');
  if (!fs.existsSync(f)) throw new Error(`주제 파일 없음: ${path.relative(ROOT, f)}`);
  const topic = JSON.parse(fs.readFileSync(f, 'utf8'));
  topic.slug = topic.slug || slug;
  topic.fileStem = topic.fileStem || slug.replace(/(^|-)(\w)/g, (m, a, b) => b.toUpperCase());
  return { topic, dir };
}

export function build(slug, opts = {}) {
  const ratios = ratioList(opts.ratio);
  const langs = langList(opts.lang);
  const channelPath = path.resolve(ROOT, opts.channel || 'channels/default.json');
  const channel = JSON.parse(fs.readFileSync(channelPath, 'utf8'));
  const { topic, dir } = loadTopic(slug);

  const topicScenes = path.join(dir, 'scenes.js');
  const files = [...ENGINE_FILES, ...SCENE_FILES(), ...(fs.existsSync(topicScenes) ? [path.relative(ROOT, topicScenes)] : []), 'engine/studio.js'];
  const engineJs = files.map(f => `// ---- ${f} ----\n` + fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');

  const { errs, warns } = validate(topic, engineJs, langs, ratios, opts.strict);
  warns.forEach(w => console.warn('⚠ ' + w));
  if (errs.length) { errs.forEach(e => console.error('✖ ' + e)); throw new Error(`검증 실패 (${errs.length}건)`); }

  // 메타데이터 (비율별)
  const byRatio = {};
  for (const r of ['9x16', '16x9']) byRatio[r] = text.metadata(topic, channel, { ratio: r, lang: langs.length > 1 ? 'ko' : langs[0] });
  const srtFiles = text.srtFiles(topic, langs);
  const videos = ratios.map(r => ({ ratio: r, file: `${slug}_${r}.mp4`, ...byRatio[r] }));
  const metaJson = {
    slug, title: byRatio[ratios[0]].title, langs, ratios,
    channel: channel.name, generatedAt: new Date().toISOString(),
    videos, srt: Object.keys(srtFiles),
    sources: (topic.sources || []).map(s => ({ publisher: s.publisher, title: s.title, url: s.url, usedFor: s.usedFor })),
  };
  const META = { defaultRatio: ratios[0], langs, byRatio, json: metaJson };

  // 스튜디오 HTML
  const tpl = fs.readFileSync(path.join(ROOT, 'engine', 'studio.html'), 'utf8');
  const three = patchedThree().replace(/<\/script/gi, '<\\/script');
  const st = topic.studio || {};
  const map = {
    LANG: langs[0], PAGE_TITLE: topic.titleKo || topic.title, EMOJI: st.emoji || '🌍🔊',
    GO_TITLE: st.goTitle || topic.titleKo || topic.title, GO_SUB: st.goSub || '', DURATION: String(topic.duration),
    TITLE_KO: topic.titleKo || topic.title, PANEL_DESC: st.panelDesc || '', SLUG: slug,
    TOPIC_JSON: safeJson(topic), META_JSON: safeJson(META), ENGINE_JS: engineJs.replace(/<\/script/gi, '<\\/script'),
  };
  const withoutFonts = fill(tpl, { ...map, THREE_JS: '', FONT_FACES: '' });
  const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
  const chars = [...new Set([...withoutFonts, ...ascii, '°', '·', '→', '…', '−', '×'])].filter(c => c.codePointAt(0) >= 32).sort().join('');
  const html = fill(tpl, { ...map, THREE_JS: three, FONT_FACES: buildFonts(chars) });

  const out = path.join(ROOT, 'dist', slug);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
  for (const [name, body] of Object.entries(srtFiles)) fs.writeFileSync(path.join(out, name), body);
  fs.writeFileSync(path.join(out, 'metadata.json'), JSON.stringify(metaJson, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'title.txt'), byRatio[ratios[0]].title + '\n');
  fs.writeFileSync(path.join(out, 'description.txt'), byRatio[ratios[0]].description + '\n');
  if (ratios.length > 1) fs.writeFileSync(path.join(out, `description_${ratios[1]}.txt`), byRatio[ratios[1]].description + '\n');
  fs.writeFileSync(path.join(out, 'sources.md'), sourcesMd(topic));
  return { out, html, ratios, langs, warns, size: Buffer.byteLength(html) };
}

function sourcesMd(topic) {
  const L = [`# 출처 — ${topic.titleKo || topic.title}`, '', '영상에 쓴 팩트와 근거 자료입니다.', ''];
  (topic.sources || []).forEach((s, i) => L.push(`${i + 1}. **${s.publisher}** — ${s.title}  `, `   ${s.url}  `, `   사용한 곳: ${s.usedFor}`, ''));
  if (topic.review && topic.review.length) {
    L.push('## 추정·검토 필요', '');
    topic.review.forEach(r => L.push(`- ${r}`));
    L.push('');
  }
  return L.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = parseArgs(process.argv.slice(2));
  const slug = a._[0];
  if (!slug) { console.error('사용: node build.mjs <slug> [--ratio 9:16|16:9|both] [--lang ko|en|both] [--channel channels/x.json] [--strict]'); process.exit(1); }
  try {
    const r = build(slug, a);
    console.log(`✔ ${path.relative(ROOT, r.out)}/index.html (${(r.size / 1024 / 1024).toFixed(2)} MB) · 비율 ${r.ratios.join(', ')} · 자막 ${r.langs.join(', ')} · 경고 ${r.warns.length}건`);
  } catch (e) {
    console.error('✖ ' + e.message);
    process.exit(1);
  }
}
