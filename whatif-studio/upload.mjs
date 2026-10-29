#!/usr/bin/env node
// YouTube Data API v3 업로드 (재개 가능 업로드, 기본 비공개)
// 사용: node upload.mjs <slug> [--ratio 9:16|16:9] [--privacy private|unlisted|public] [--publish-at 2026-11-01T09:00:00+09:00]
//                      [--dry-run] [--yes]
//
// 안전 규칙
//  - 정욱님이 --upload 를 명시했을 때만 /whatif 가 이 스크립트를 실행한다.
//  - --dry-run 으로 제목·설명·태그·공개 설정을 먼저 보여주고, 확인을 받은 뒤 --yes 로 실행한다.
//  - 기본 privacyStatus = private. 공개 전환은 YouTube Studio 에서 직접 (또는 --publish-at 예약).
//  - OAuth 범위는 youtube.upload 하나. 인증 정보는 ~/.config/whatif-studio/ 에 저장 (git 밖).
//  - videos.insert 한 번 = 쿼터 약 1,600 유닛, 기본 일일 쿼터 10,000 → 하루 약 6개.
// googleapis 패키지 대신 같은 REST API 를 fetch 로 직접 호출한다 (설치 불필요, 재개 로직을 직접 제어).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs, ratioList } from './build.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONF = process.env.WHATIF_CONFIG_DIR || path.join(os.homedir(), '.config', 'whatif-studio');
const SECRET = path.join(CONF, 'client_secret.json');
const TOKEN = path.join(CONF, 'token.json');
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const CHUNK = 8 * 1024 * 1024; // 256KB 의 배수

export const SETUP_GUIDE = `업로드는 아직 설정 전입니다. 한 번만 아래 순서로 설정하면 됩니다.

1. Google Cloud 콘솔(https://console.cloud.google.com/)에서 새 프로젝트를 만듭니다. (예: whatif-studio)
2. "API 및 서비스 → 라이브러리"에서 "YouTube Data API v3"를 찾아 [사용]을 누릅니다.
3. "API 및 서비스 → OAuth 동의 화면"에서 사용자 유형 "외부"로 만들고,
   테스트 사용자에 업로드할 채널의 Google 계정을 추가합니다.
4. "API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID"
   애플리케이션 유형은 "데스크톱 앱"을 고릅니다.
5. 만든 클라이언트의 JSON을 내려받아 아래 경로에 저장합니다.
     ${SECRET}
6. 다시 실행하면 브라우저 로그인 창이 뜨고, 허용하면 토큰이 같은 폴더에 저장됩니다.

주의
- 심사(감사)를 받지 않은 API 프로젝트로 올린 영상은 비공개로 잠길 수 있습니다.
  잠기면 YouTube Studio에서 직접 공개로 바꾸거나, Google에 API 감사(audit)를 신청해야 합니다.
- 기본 일일 쿼터 10,000 유닛, 업로드 1회 약 1,600 유닛 → 하루 약 6개가 한계입니다.`;

function loadSecret() {
  if (!fs.existsSync(SECRET)) return null;
  const j = JSON.parse(fs.readFileSync(SECRET, 'utf8'));
  const c = j.installed || j.web;
  if (!c || !c.client_id) throw new Error(`${SECRET} 형식이 올바르지 않음 (데스크톱 앱 OAuth 클라이언트 JSON 필요)`);
  return c;
}

function saveToken(tok) {
  fs.mkdirSync(CONF, { recursive: true, mode: 0o700 });
  fs.writeFileSync(TOKEN, JSON.stringify(tok, null, 2), { mode: 0o600 });
}

async function tokenRequest(params) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`토큰 요청 실패: ${j.error} ${j.error_description || ''}`);
  return j;
}

// 루프백 + PKCE 데스크톱 OAuth
async function authorize(client) {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  const server = http.createServer();
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const redirect = `http://127.0.0.1:${server.address().port}`;
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: client.client_id, redirect_uri: redirect, response_type: 'code', scope: SCOPE,
    access_type: 'offline', prompt: 'consent', code_challenge: challenge, code_challenge_method: 'S256', state,
  });
  console.log('\n브라우저에서 아래 주소로 로그인·허용하세요:\n' + url + '\n');
  execFile(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open', [url], () => {});
  const code = await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('5분 안에 로그인이 끝나지 않음')), 300000);
    server.on('request', (req, rsp) => {
      const q = new URL(req.url, redirect).searchParams;
      if (!q.get('code') && !q.get('error')) { rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      rsp.end('<p>WhatIf Studio: 인증이 끝났습니다. 이 창을 닫아도 됩니다.</p>');
      clearTimeout(timer);
      if (q.get('state') !== state) rej(new Error('state 불일치'));
      else if (q.get('error')) rej(new Error('인증 거부: ' + q.get('error')));
      else res(q.get('code'));
    });
  });
  server.close();
  const tok = await tokenRequest({ client_id: client.client_id, client_secret: client.client_secret || '', code, code_verifier: verifier, redirect_uri: redirect, grant_type: 'authorization_code' });
  tok.expires_at = Date.now() + (tok.expires_in - 60) * 1000;
  saveToken(tok);
  return tok;
}

async function accessToken(client) {
  let tok = fs.existsSync(TOKEN) ? JSON.parse(fs.readFileSync(TOKEN, 'utf8')) : null;
  if (!tok || !tok.refresh_token) tok = await authorize(client);
  if (!tok.access_token || Date.now() > (tok.expires_at || 0)) {
    const r = await tokenRequest({ client_id: client.client_id, client_secret: client.client_secret || '', refresh_token: tok.refresh_token, grant_type: 'refresh_token' });
    tok = { ...tok, ...r, expires_at: Date.now() + (r.expires_in - 60) * 1000 };
    saveToken(tok);
  }
  return tok.access_token;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function startSession(token, body, size) {
  const r = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': String(size), 'X-Upload-Content-Type': 'video/mp4' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`업로드 세션 시작 실패 ${r.status}: ${await r.text()}`);
  return r.headers.get('location');
}

// 서버가 받은 위치 확인 (재개용)
async function queryOffset(token, session, size) {
  const r = await fetch(session, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Range': `bytes */${size}` } });
  if (r.status === 200 || r.status === 201) return { done: await r.json() };
  if (r.status === 308) { const g = r.headers.get('range'); return { offset: g ? Number(g.split('-')[1]) + 1 : 0 }; }
  if (r.status === 404 || r.status === 410) return { expired: true };
  throw new Error(`업로드 상태 확인 실패 ${r.status}`);
}

async function uploadFile(token, session, file, size, onProgress) {
  const fd = fs.openSync(file, 'r');
  let offset = 0, retries = 0;
  try {
    for (;;) {
      const len = Math.min(CHUNK, size - offset);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, offset);
      let r;
      try {
        r = await fetch(session, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Length': String(len), 'Content-Range': `bytes ${offset}-${offset + len - 1}/${size}` }, body: buf });
      } catch (e) { r = null; }
      if (r && (r.status === 200 || r.status === 201)) return r.json();
      if (r && r.status === 308) {
        const g = r.headers.get('range');
        offset = g ? Number(g.split('-')[1]) + 1 : 0;
        retries = 0;
        onProgress(offset / size);
        continue;
      }
      if (r && r.status < 500 && r.status !== 429) throw new Error(`업로드 실패 ${r.status}: ${await r.text()}`);
      if (++retries > 6) throw new Error('업로드 재시도 한도 초과');
      await sleep(Math.min(32000, 1000 * 2 ** retries));
      const q = await queryOffset(token, session, size);
      if (q.done) return q.done;
      if (q.expired) throw new Error('업로드 세션 만료 — 다시 실행하세요');
      offset = q.offset;
    }
  } finally { fs.closeSync(fd); }
}

async function confirm(question) {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question(question)).trim().toLowerCase();
  rl.close();
  return ans === 'yes' || ans === 'y';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = parseArgs(process.argv.slice(2));
  const slug = a._[0];
  if (!slug) { console.error('사용: node upload.mjs <slug> [--ratio 9:16] [--privacy private] [--publish-at ISO] [--dry-run] [--yes]'); process.exit(1); }
  try {
    const dist = path.join(ROOT, 'dist', slug);
    const meta = JSON.parse(fs.readFileSync(path.join(dist, 'metadata.json'), 'utf8'));
    const ratio = a.ratio ? ratioList(a.ratio)[0] : meta.ratios[0];
    const v = meta.videos.find(x => x.ratio === ratio);
    if (!v) throw new Error(`metadata.json 에 ${ratio} 영상 정보 없음 → node build.mjs ${slug} --ratio both`);
    const file = path.join(dist, v.file);
    if (!fs.existsSync(file)) throw new Error(`영상 파일 없음: ${path.relative(ROOT, file)} → node render.mjs ${slug} --ratio ${ratio.replace('x', ':')}`);
    const privacy = a.privacy || 'private';
    if (!['private', 'unlisted', 'public'].includes(privacy)) throw new Error('--privacy 는 private / unlisted / public');
    const publishAt = a['publish-at'] ? new Date(a['publish-at']) : null;
    if (publishAt && (isNaN(publishAt) || publishAt <= new Date())) throw new Error('--publish-at 은 미래 시각(ISO 8601)이어야 함');
    if (publishAt && privacy !== 'private') throw new Error('--publish-at 예약은 privacy=private 일 때만 가능');
    const size = fs.statSync(file).size;
    const body = {
      snippet: { title: v.title, description: v.description, tags: v.tags, categoryId: v.categoryId, defaultLanguage: v.defaultLanguage },
      status: { privacyStatus: privacy, selfDeclaredMadeForKids: v.selfDeclaredMadeForKids, containsSyntheticMedia: v.containsSyntheticMedia, ...(publishAt ? { publishAt: publishAt.toISOString() } : {}) },
    };
    console.log('──── 업로드 내용 확인 ────');
    console.log(`파일     : ${path.relative(ROOT, file)} (${(size / 1048576).toFixed(1)}MB, ${ratio}${v.shorts ? ', 쇼츠' : ''})`);
    console.log(`제목     : ${v.title}`);
    console.log(`공개 설정: ${privacy}${publishAt ? ` → ${publishAt.toISOString()} 예약 공개` : ''}`);
    console.log(`카테고리 : ${v.categoryId} · 아동용 아님 · 언어 ${v.defaultLanguage}`);
    console.log(`태그     : ${v.tags.join(', ')}`);
    console.log('설명     :\n' + v.description.split('\n').map(l => '  ' + l).join('\n'));
    console.log('──────────────────────────');
    if (a['dry-run']) { console.log('(dry-run: 업로드하지 않음)'); process.exit(0); }
    const client = loadSecret();
    if (!client) { console.log('\n' + SETUP_GUIDE); process.exit(2); }
    if (!a.yes && !(await confirm('이대로 업로드할까요? (yes 입력): '))) { console.log('취소했습니다.'); process.exit(3); }
    const token = await accessToken(client);
    const session = await startSession(token, body, size);
    let last = -1;
    const res = await uploadFile(token, session, file, size, p => { const pct = Math.floor(p * 100); if (pct >= last + 10) { last = pct; console.log(`  업로드 ${pct}%`); } });
    const out = { id: res.id, url: `https://youtu.be/${res.id}`, studio: `https://studio.youtube.com/video/${res.id}/edit`, requestedPrivacy: privacy, privacyStatus: res.status && res.status.privacyStatus, uploadStatus: res.status && res.status.uploadStatus, publishAt: res.status && res.status.publishAt, ratio, uploadedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(dist, `upload_${ratio}.json`), JSON.stringify(out, null, 2) + '\n');
    console.log(`✔ 업로드 완료: ${out.url} (privacyStatus=${out.privacyStatus}, uploadStatus=${out.uploadStatus})`);
    console.log(`  Studio: ${out.studio}`);
    if (out.privacyStatus !== privacy) console.log('⚠ 요청과 다른 공개 상태입니다. 미심사 API 프로젝트라 비공개로 잠겼을 수 있습니다 → Studio에서 직접 공개하거나 API 감사를 신청하세요.');
    else console.log('ℹ 첫 업로드라면 Studio에서 "비공개로 잠김" 표시가 있는지 확인하세요 (미심사 API 프로젝트 제한).');
  } catch (e) {
    console.error('✖ ' + e.message);
    process.exit(1);
  }
}
