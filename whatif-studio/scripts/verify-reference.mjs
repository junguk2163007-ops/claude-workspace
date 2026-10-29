#!/usr/bin/env node
// 검증 1단계: 레퍼런스 HTML 과 새 엔진 빌드가 같은 장면·자막·소리를 내는지 비교한다.
// 사용: node scripts/verify-reference.mjs --ref "reference/파일.html" --slug moon-vanish [--step 15]
//  - 화면: 같은 시드(Math.random 교체)·같은 시간열로 두 페이지를 진행시키며 0.5초마다 픽셀 비교
//  - 자막: 레퍼런스 downloadSRT(1/2) 결과와 dist 의 SRT 를 바이트 단위 비교
//  - 소리: 레퍼런스 scheduleScore 를 OfflineAudioContext 로 돌려 엔진 오프라인 렌더와 샘플 비교
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './browser.mjs';
import { parseArgs, patchedThree } from '../build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = parseArgs(process.argv.slice(2));
if (!a.ref || !a.slug) { console.error('사용: node scripts/verify-reference.mjs --ref reference/x.html --slug <slug> [--step 15]'); process.exit(1); }
const refPath = path.resolve(ROOT, a.ref);
const slug = a.slug;
const step = Number(a.step || 15);
const skipVideo = !!a['audio-only'];
const fps = 30;
const dist = path.join(ROOT, 'dist', slug);
const outDir = path.join(dist, 'verify');
fs.mkdirSync(outDir, { recursive: true });

const topic = JSON.parse(fs.readFileSync(path.join(ROOT, 'topics', slug, 'topic.json'), 'utf8'));
const built = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const fontCss = built.slice(built.indexOf('<style>') + 7, built.indexOf('* { box-sizing'));
const threeJs = patchedThree();

const MULBERRY = `function __mb(a){a>>>=0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}`;
const FACES = ['400 20px "Nanum Myeongjo"', '700 20px "Nanum Myeongjo"', '800 20px "Nanum Myeongjo"', '400 20px "Noto Sans KR"', '500 20px "Noto Sans KR"', '700 20px "Noto Sans KR"'];

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
// 레퍼런스의 외부 의존(구글 폰트, cdnjs)을 같은 로컬 자원으로 대체
await ctx.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: fontCss }));
await ctx.route(/cdnjs\.cloudflare\.com.*three/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: threeJs }));

const ref = await ctx.newPage();
ref.on('pageerror', e => console.error('[ref] ', e.message));
await ref.addInitScript(`${MULBERRY}; Math.random = __mb(${topic.seed}); window.__uuidRandom = __mb((${topic.seed} ^ 0x5bd1e995) >>> 0); window.__mb = __mb; window.requestAnimationFrame = () => 0;`);
await ref.goto(pathToFileURL(refPath).href);
await ref.evaluate(async faces => { await Promise.all(faces.map(f => document.fonts.load(f, '가A1'))); await document.fonts.ready; }, FACES);

const eng = await ctx.newPage();
eng.on('pageerror', e => console.error('[engine] ', e.message));
await eng.goto(pathToFileURL(path.join(dist, 'index.html')).href + '?render=1&scale=1&ratio=9x16');
await eng.evaluate(() => window.WI.ready);

const cmp = await ctx.newPage();
await cmp.setContent('<canvas id=c></canvas>');

// --- 1. 화면 ---
const N = Math.round(topic.duration * fps);
const samples = [];
for (let i0 = 1; !skipVideo && i0 < N; i0 += step) {
  const ts = [];
  for (let i = i0; i < Math.min(N, i0 + step); i++) ts.push(i / fps);
  const refPng = await ref.evaluate(ts => {
    for (const t of ts) {
      const dt = window.__lastT == null ? 0.016 : Math.min(0.05, Math.max(0.001, t - window.__lastT));
      window.__lastT = t;
      updateWorld(t, dt); renderComposite(t);
    }
    return document.getElementById('outCanvas').toDataURL('image/png');
  }, ts);
  const engPng = await eng.evaluate(ts => window.__renderSeq(ts, 'image/png'), ts);
  const st = await cmp.evaluate(async ([A, B, save]) => {
    const load = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = src; });
    const [ia, ib] = await Promise.all([load(A), load(B)]);
    const w = ia.width, h = ia.height;
    const c = document.getElementById('c'); c.width = w * 3; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(ia, 0, 0); g.drawImage(ib, w, 0);
    const da = g.getImageData(0, 0, w, h).data, db = g.getImageData(w, 0, w, h).data;
    const diff = g.createImageData(w, h);
    let sum = 0, max = 0, over = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      sum += d; if (d > max) max = d; if (d > 16) over++;
      const v = Math.min(255, d * 8);
      diff.data[i] = v; diff.data[i + 1] = v * 0.3; diff.data[i + 2] = 0; diff.data[i + 3] = 255;
    }
    g.putImageData(diff, w * 2, 0);
    return { mean: sum / (w * h), max, pctOver16: 100 * over / (w * h), sheet: save ? c.toDataURL('image/png') : null };
  }, [refPng, engPng, true]);
  const t = ts[ts.length - 1];
  samples.push({ t, mean: st.mean, max: st.max, pctOver16: st.pctOver16, sheet: st.sheet });
  if (samples.length % 20 === 0) process.stdout.write(`  화면 비교 ${t.toFixed(1)}s / ${topic.duration}s\n`);
}
const worst = [...samples].sort((x, y) => y.pctOver16 - x.pctOver16).slice(0, 4);
worst.forEach(s => fs.writeFileSync(path.join(outDir, `diff_${s.t.toFixed(2)}s.png`), Buffer.from(s.sheet.split(',')[1], 'base64')));
const meanAll = samples.length ? samples.reduce((s, x) => s + x.mean, 0) / samples.length : 0;
const identical = samples.filter(s => s.max === 0).length;

// --- 2. 자막 ---
const refSrt = await ref.evaluate(async () => {
  const got = [];
  URL.createObjectURL = b => { got.push(b); return 'blob:x'; };
  HTMLAnchorElement.prototype.click = function () {};
  downloadSRT(1); downloadSRT(2);
  return Promise.all(got.map(b => b.text()));
});
const engSrt = [`KO_${topic.fileStem}_LargeSub.srt`, `KO_${topic.fileStem}_Full.srt`].map(f => fs.readFileSync(path.join(dist, f), 'utf8'));
const srtSame = refSrt.map((s, i) => s === engSrt[i]);

// --- 3. 소리 ---
const SR = 48000;
const refAudio = await ref.evaluate(async ([seed, dur, SR]) => {
  window.AudioContext = function () {
    const c = new OfflineAudioContext(2, Math.ceil(SR * (dur + 0.2)), SR);
    c.createMediaStreamDestination = () => c.createGain();
    c.close = () => {};
    window.__off = c;
    return c;
  };
  Math.random = window.__mb(seed);
  (typeof scheduleMoonScore === 'function' ? scheduleMoonScore : scheduleScore)();
  const buf = await window.__off.startRendering();
  const f = buf.getChannelData(0);
  const u8 = new Uint8Array(f.buffer.slice(0));
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}, [topic.audioSeed, topic.duration, SR]);
const engAudio = await eng.evaluate(async SR => {
  const buf = await window.WI.renderAudioOffline(window.TOPIC, 0.3, 0.8, SR, 0.1);
  const u8 = new Uint8Array(buf.getChannelData(0).buffer.slice(0));
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}, SR);
const toF32 = b64 => { const b = Buffer.from(b64, 'base64'); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const ra = toF32(refAudio), ea = toF32(engAudio);
if (a['dump-audio']) { fs.writeFileSync(path.join(outDir, 'ref.f32'), Buffer.from(ra.buffer, ra.byteOffset, ra.byteLength)); fs.writeFileSync(path.join(outDir, 'eng.f32'), Buffer.from(ea.buffer, ea.byteOffset, ea.byteLength)); }
const lead = 0; // 양쪽 모두 now = 0.1 로 스케줄 (레퍼런스 실시간과 동일 조건)
let maxD = 0, se = 0, ss = 0, peak = 0;
for (let i = 0; i < ea.length && i + lead < ra.length; i++) {
  const d = ra[i + lead] - ea[i];
  if (Math.abs(d) > maxD) maxD = Math.abs(d);
  se += d * d; ss += ea[i] * ea[i];
  if (Math.abs(ea[i]) > peak) peak = Math.abs(ea[i]);
}
const snr = se === 0 ? Infinity : 10 * Math.log10(ss / se);
await browser.close();

const report = {
  reference: path.relative(ROOT, refPath), slug,
  video: { samples: samples.length, identicalFrames: identical, meanAbsDiff: +meanAll.toFixed(4),
    worst: worst.map(s => ({ t: +s.t.toFixed(2), pctPixelsOver16: +s.pctOver16.toFixed(3), max: s.max })) },
  srt: { largeSubIdentical: srtSame[0], fullIdentical: srtSame[1] },
  audio: { maxSampleDiff: +maxD.toExponential(2), snrDb: snr === Infinity ? 'identical' : +snr.toFixed(1), peak: +peak.toFixed(3) },
};
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
