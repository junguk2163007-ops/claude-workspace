#!/usr/bin/env node
// 유튜브 URL → 제목·설명·챕터·자막·썸네일 → research brief (주제·팩트 후보 파악용)
// 사용: node ingest.mjs <youtube-url> [--channel channels/default.json] [--from-dir <이미 받은 폴더>]
//
// 규칙(2-B): 영상 파일은 받지 않는다(--skip-download). 남의 영상의 대본·구성·연출은 가져오지 않고,
//           팩트는 직접 검색해 다시 검증한다. 프레임 추출은 정욱님 본인 채널(ownChannelIds)일 때만.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './build.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export function videoId(url) {
  const m = String(url).match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  throw new Error(`유튜브 영상 ID를 찾지 못함: ${url}`);
}

function ytDlp(url, dir) {
  try { execFileSync('yt-dlp', ['--version'], { stdio: 'ignore' }); }
  catch { throw new Error('yt-dlp 가 없습니다 → pip install -U yt-dlp (또는 brew install yt-dlp)'); }
  execFileSync('yt-dlp', ['--skip-download', '--write-info-json', '--write-subs', '--write-auto-subs',
    '--sub-langs', 'ko,en', '--convert-subs', 'srt', '--write-thumbnail', '--convert-thumbnails', 'jpg',
    '--no-playlist', '-o', path.join(dir, '%(id)s.%(ext)s'), url], { stdio: 'inherit' });
}

// SRT → 중복 제거한 평문 줄 (자동 자막은 같은 줄이 겹쳐 나온다)
export function srtToLines(srt) {
  const out = [];
  for (const block of srt.replace(/\r/g, '').split(/\n\n+/)) {
    const lines = block.split('\n').filter(l => l && !/^\d+$/.test(l) && !/-->/.test(l));
    for (let l of lines) {
      l = l.replace(/<[^>]+>/g, '').trim();
      if (l && out[out.length - 1] !== l) out.push(l);
    }
  }
  return out;
}

const fmtDur = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export function makeBrief(info, subs, own) {
  const L = [];
  L.push(`# Research brief — ${info.title}`, '');
  L.push('> 주제와 다룰 포인트 파악용 자료입니다. 대본 문장·구성 순서·화면 연출은 가져오지 않습니다.', '> 아래 팩트 후보는 모두 NASA·ESA·논문·대학·공식 기관 자료로 다시 검증한 뒤에만 씁니다.', '');
  L.push('## 원본 정보', '');
  L.push(`- 영상: https://www.youtube.com/watch?v=${info.id}`);
  L.push(`- 채널: ${info.channel || info.uploader || '?'} (${info.channel_id || '?'})${own ? ' — **정욱님 채널**' : ''}`);
  L.push(`- 길이: ${info.duration ? fmtDur(info.duration) : '?'} · 업로드: ${info.upload_date || '?'} · 조회수: ${info.view_count ?? '?'}`);
  if (info.tags && info.tags.length) L.push(`- 태그: ${info.tags.slice(0, 15).join(', ')}`);
  L.push(`- 프레임 추출: ${own ? '허용 (본인 채널)' : '금지 (남의 영상)'}`, '');
  if (info.chapters && info.chapters.length) {
    L.push('## 챕터 (다룰 포인트 후보)', '');
    info.chapters.forEach(c => L.push(`- ${fmtDur(c.start_time)} ${c.title}`));
    L.push('');
  }
  if (info.description) {
    L.push('## 설명 (앞부분)', '', '```', info.description.slice(0, 1500), '```', '');
  }
  for (const [lang, lines] of Object.entries(subs)) {
    if (!lines.length) continue;
    const text = lines.join(' ');
    L.push(`## 자막 요지 재료 (${lang}, ${lines.length}줄 · ${text.length}자)`, '');
    L.push('숫자가 들어간 문장만 뽑았습니다. 문장을 옮겨 쓰지 말고, 수치·개념만 검증 대상으로 씁니다.', '');
    const nums = lines.filter(l => /\d/.test(l)).slice(0, 40);
    nums.forEach(l => L.push(`- ${l}`));
    L.push('');
  }
  L.push('## 3줄 요약 (정욱님께 보여줄 것)', '', '1. 주제: ', '2. 다룰 팩트 후보: ', '3. 우리 영상에서 다르게 할 점: ', '');
  return L.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = parseArgs(process.argv.slice(2));
  const url = a._[0];
  if (!url && !a['from-dir']) { console.error('사용: node ingest.mjs <youtube-url> [--channel channels/default.json] [--from-dir <폴더>]'); process.exit(1); }
  try {
    let dir;
    if (a['from-dir']) dir = path.resolve(a['from-dir']);
    else {
      dir = path.join(ROOT, 'research', videoId(url));
      fs.mkdirSync(dir, { recursive: true });
      ytDlp(url, dir);
    }
    const infoFile = fs.readdirSync(dir).find(f => f.endsWith('.info.json'));
    if (!infoFile) throw new Error(`${dir} 에 .info.json 이 없음`);
    const info = JSON.parse(fs.readFileSync(path.join(dir, infoFile), 'utf8'));
    const channel = JSON.parse(fs.readFileSync(path.resolve(ROOT, a.channel || 'channels/default.json'), 'utf8'));
    const own = (channel.ownChannelIds || []).includes(info.channel_id);
    const subs = {};
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.srt'))) {
      const lang = (f.match(/\.([a-z]{2}(?:-[A-Za-z]+)?)\.srt$/) || [, 'xx'])[1];
      const lines = srtToLines(fs.readFileSync(path.join(dir, f), 'utf8'));
      subs[lang] = lines;
      fs.writeFileSync(path.join(dir, `transcript.${lang}.txt`), lines.join('\n') + '\n');
    }
    const brief = makeBrief(info, subs, own);
    fs.writeFileSync(path.join(dir, 'brief.md'), brief);
    // 원본 메타데이터 중 필요한 것만 남긴 요약 (info.json 원본은 크다)
    fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify({
      id: info.id, title: info.title, channel: info.channel || info.uploader, channel_id: info.channel_id,
      duration: info.duration, upload_date: info.upload_date, chapters: info.chapters || [], tags: info.tags || [], own,
      subtitleLangs: Object.keys(subs),
    }, null, 2) + '\n');
    console.log(`✔ ${path.relative(ROOT, path.join(dir, 'brief.md'))} (자막: ${Object.keys(subs).join(', ') || '없음'}${own ? ', 본인 채널' : ''})`);
  } catch (e) {
    console.error('✖ ' + e.message);
    process.exit(1);
  }
}
