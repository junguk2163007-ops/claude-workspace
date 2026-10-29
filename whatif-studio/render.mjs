#!/usr/bin/env node
// dist/<slug>/index.html → MP4 (결정적 오프라인 렌더: Playwright + ffmpeg)
// 사용: node render.mjs <slug> [--ratio 9:16|16:9|both] [--fps 30] [--scale 1.5] [--crf 18]
//                       [--bgm 30] [--sfx 80] [--quality 0.94] [--to 초(미리보기용 부분 렌더)]
// 결과: dist/<slug>/<slug>_<ratio>.mp4, <slug>_<ratio>_sheet.png (contact sheet), render.json (ffprobe 요약)
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, checkWebGL } from './scripts/browser.mjs';
import { parseArgs, ratioList, loadTopic } from './build.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SHEET_FONT = path.join(ROOT, 'vendor', 'fonts', 'NanumMyeongjo-Bold.ttf');

function ffprobe(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
  const v = j.streams.find(s => s.codec_type === 'video'), a = j.streams.find(s => s.codec_type === 'audio');
  return {
    duration: +(+j.format.duration).toFixed(3), sizeMB: +(j.format.size / 1048576).toFixed(2),
    video: v ? { codec: v.codec_name, width: v.width, height: v.height, fps: v.r_frame_rate, pix_fmt: v.pix_fmt, frames: +v.nb_frames } : null,
    audio: a ? { codec: a.codec_name, sample_rate: +a.sample_rate, channels: a.channels } : null,
  };
}

// 자막이 다 떠 있는 시점 6개: 훅, 전제 붕괴, 중간 비트 3개, outro
export function sheetTimes(topic, end) {
  const tl = topic.timeline;
  const n = tl.length;
  const pickIdx = [...new Set([0, 1, Math.round((n - 1) * 0.35), Math.round((n - 1) * 0.55), Math.round((n - 1) * 0.75), n - 1])];
  return pickIdx.map(i => {
    const d = tl[i];
    const seg = (d.e - d.s) / Math.max(1, d.narLines.length);
    return Math.min(end - 0.05, +(d.s + seg * 0.6).toFixed(2));
  });
}

function contactSheet(mp4, times, ratio, out, work) {
  const portrait = ratio === '9x16';
  const w = portrait ? 360 : 640;
  times.forEach((t, i) => {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', mp4, '-frames:v', '1',
      '-vf', `scale=${w}:-2,drawtext=fontfile=${SHEET_FONT}:text='${t.toFixed(1)}s':x=10:y=10:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6:boxborderw=6`,
      path.join(work, `sheet_${i + 1}.png`)]);
  });
  fs.readdirSync(work).filter(f => /^sheet_\d+\.png$/.test(f) && +f.match(/\d+/)[0] > times.length).forEach(f => fs.rmSync(path.join(work, f)));
  const cols = 3, rows = Math.ceil(times.length / cols);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(work, 'sheet_%d.png'), '-vf', `tile=${cols}x${rows}:padding=6:color=0x202020`, '-frames:v', '1', out]);
}

async function renderOne(browser, slug, ratio, o) {
  const dist = path.join(ROOT, 'dist', slug);
  const work = path.join(dist, '.work', ratio);
  fs.mkdirSync(work, { recursive: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const q = new URLSearchParams({ render: '1', ratio, scale: String(o.scale) });
  if (o.lang) q.set('lang', o.lang);
  await page.goto(pathToFileURL(path.join(dist, 'index.html')).href + '?' + q);
  const gl = await checkWebGL(page);
  if (!gl) throw new Error('WebGL 을 사용할 수 없습니다 (Chromium launch 인자 확인)');
  await page.evaluate(() => window.WI.ready);
  if (errors.length) throw new Error('페이지 오류: ' + errors.join(' | '));
  const info = await page.evaluate(() => window.__info());
  const fps = Number(o.fps || info.fps || 30);
  const end = Math.min(info.duration, Number(o.to || info.duration));
  const N = Math.round(end * fps);
  console.log(`▶ ${slug} ${ratio}: ${Math.round(info.W * info.scale)}×${Math.round(info.H * info.scale)} @${fps}fps, ${end}s (${N}프레임) · ${gl}`);

  // 미리보기: 지정 시각의 정지 화면만 뽑아 시트로 (인코딩 없음, 입자 상태는 근사)
  if (o.stills) {
    const { topic } = loadTopic(slug);
    const times = o.stills === true ? sheetTimes(topic, end) : String(o.stills).split(',').map(Number);
    const w = ratio === '9x16' ? 360 : 640;
    for (let i = 0; i < times.length; i++) {
      const u = await page.evaluate(t => window.__renderFrame(t, 'image/jpeg', 0.9), times[i]);
      const f = path.join(work, `still_${i + 1}.jpg`);
      fs.writeFileSync(f, Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', f, '-vf', `scale=${w}:-2,drawtext=fontfile=${SHEET_FONT}:text='${times[i].toFixed(1)}s':x=10:y=10:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6:boxborderw=6`, path.join(work, `sheet_${i + 1}.png`)]);
    }
    work && fs.readdirSync(work).filter(f => /^sheet_\d+\.png$/.test(f) && +f.match(/\d+/)[0] > times.length).forEach(f => fs.rmSync(path.join(work, f)));
    const out = path.join(dist, `${slug}_${ratio}_stills.png`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(work, 'sheet_%d.png'), '-vf', `tile=3x${Math.ceil(times.length / 3)}:padding=6:color=0x202020`, '-frames:v', '1', out]);
    await page.close();
    console.log(`  ✔ 미리보기 ${path.relative(ROOT, out)}`);
    return null;
  }

  // 1) 오디오: OfflineAudioContext → WAV
  const t0 = Date.now();
  const au = await page.evaluate(([b, s]) => window.__renderAudio(b, s), [o.bgm / 100, o.sfx / 100]);
  const wavPath = path.join(work, 'audio.wav');
  fs.writeFileSync(wavPath, Buffer.concat(au.parts.map(p => Buffer.from(p, 'base64'))));
  console.log(`  오디오 ${au.duration.toFixed(2)}s, 피크 ${au.peak.toFixed(3)}${au.peak > 1 ? ' ⚠ 클리핑' : ''}`);

  // 2) 프레임 → ffmpeg stdin
  const mp4 = path.join(dist, `${slug}_${ratio}.mp4`);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', wavPath, '-map', '0:v', '-map', '1:a', '-t', String(end),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(o.crf), '-preset', o.preset,
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error(`ffmpeg 종료 코드 ${c}`)))));
  const write = buf => new Promise(res => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));
  const B = 8;
  let lastPct = -1;
  for (let i = 0; i < N; i += B) {
    const ts = [];
    for (let k = i; k < Math.min(N, i + B); k++) ts.push(k / fps);
    const urls = await page.evaluate(([ts, qv]) => window.__renderFrames(ts, 'image/jpeg', qv), [ts, o.quality]);
    for (const u of urls) await write(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
    const pct = Math.floor(100 * Math.min(N, i + B) / N);
    if (pct >= lastPct + 10) { lastPct = pct - (pct % 10); console.log(`  프레임 ${pct}% (${((Date.now() - t0) / 1000).toFixed(0)}s)`); }
  }
  ff.stdin.end();
  await done;
  await page.close();
  if (errors.length) throw new Error('렌더 중 페이지 오류: ' + errors.join(' | '));

  // 3) 검증: ffprobe + contact sheet
  const probe = ffprobe(mp4);
  const expectW = Math.round(info.W * info.scale), expectH = Math.round(info.H * info.scale);
  const checks = {
    duration: Math.abs(probe.duration - end) < 0.1,
    resolution: probe.video && probe.video.width === expectW && probe.video.height === expectH,
    audioTrack: !!probe.audio,
    frames: probe.video && Math.abs(probe.video.frames - N) <= 1,
  };
  const { topic } = loadTopic(slug);
  const sheet = path.join(dist, `${slug}_${ratio}_sheet.png`);
  const times = sheetTimes(topic, end);
  contactSheet(mp4, times, ratio, sheet, work);
  const secs = (Date.now() - t0) / 1000;
  console.log(`  ✔ ${path.relative(ROOT, mp4)} ${probe.sizeMB}MB, ${probe.duration}s, ${probe.video.width}×${probe.video.height}, 오디오 ${probe.audio ? probe.audio.codec : '없음'} · ${secs.toFixed(0)}s 소요`);
  const bad = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  if (bad.length) console.log(`  ✖ 검증 실패: ${bad.join(', ')}`);
  return { ratio, file: path.relative(ROOT, mp4), sheet: path.relative(ROOT, sheet), sheetTimes: times, probe, checks, audioPeak: +au.peak.toFixed(3), seconds: +secs.toFixed(1) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = parseArgs(process.argv.slice(2));
  const slug = a._[0];
  if (!slug) { console.error('사용: node render.mjs <slug> [--ratio 9:16|16:9|both] [--fps 30] [--scale 1.5] [--crf 18]'); process.exit(1); }
  const dist = path.join(ROOT, 'dist', slug);
  if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error(`먼저 빌드하세요: node build.mjs ${slug}`); process.exit(1); }
  const meta = JSON.parse(fs.readFileSync(path.join(dist, 'metadata.json'), 'utf8'));
  const ratios = a.ratio ? ratioList(a.ratio) : meta.ratios;
  const o = { fps: a.fps, scale: Number(a.scale || 1.5), crf: Number(a.crf || 18), preset: a.preset || 'veryfast',
    bgm: Number(a.bgm ?? 30), sfx: Number(a.sfx ?? 80), quality: Number(a.quality || 0.94), to: a.to, lang: a.lang, stills: a.stills };
  const browser = await launch();
  const results = [];
  try {
    for (const r of ratios) { const res = await renderOne(browser, slug, r, o); if (res) results.push(res); }
  } catch (e) {
    console.error('✖ ' + e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
  if (results.length) {
    const f = path.join(dist, 'render.json');
    const prev = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
    for (const r of results) prev[r.ratio] = r;
    fs.writeFileSync(f, JSON.stringify(prev, null, 2) + '\n');
    if (results.some(r => Object.values(r.checks).includes(false))) process.exitCode = 1;
  }
}
