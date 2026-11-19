// 원클릭 발송: 페이지가 서류(PDF)를 정민욱 계정(mwjung2002)에 설치한 Apps Script 웹앱(발송기)으로
// 직접 넘기고(새 창으로 폼 전송), 발송기가 정민욱 Gmail 로 보내며 정민욱 Drive 에 사본을 남긴다.
// claude.ai 연결(Gmail/Drive) 기능을 쓰지 않으므로 어느 계정·화면에서 열어도 동작한다.

export const RELAY_VERSION = 9;
/** 팝업 없이 페이지 안 상자(iframe)로 여는 것은 v6 부터 */
export const RELAY_FRAME_VERSION = 99; // claude.ai 가 페이지 안 상자를 막아 쓰지 않는다
/** 링크로 서류를 넘겨 보내기는 v5 부터 */
export const RELAY_SEND_VERSION = 5;

export interface RelayFile {
  name: string;
  type: string;
  b64: string;
}

export interface RelayPayload {
  rid: string;
  to: string;
  subject: string;
  body: string;
  from_name: string;
  site: string;
  files: RelayFile[];
}

export function relayUrlOk(s: string) {
  return /^https:\/\/script\.google\.com\/macros\/(u\/\d+\/)?s\/[A-Za-z0-9_-]+\/exec$/.test(s.trim());
}
export const validRelayBase = relayUrlOk;

export function pingUrl(base: string) {
  const u = new URL(base.trim());
  u.searchParams.set('ping', '1');
  return u.toString();
}

export function newKey() {
  const a = new Uint8Array(18);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 24);
}

/** 발송기 창이 보내는 완료 신호 */
export interface RelaySignal {
  jobkit: 'relay';
  /** send: 메일 보냄 / ping: 연결 확인 / fetch: 공고 원문 가져옴 / ready: 보내기 창이 떴음 */
  kind?: 'send' | 'ping' | 'fetch' | 'ready';
  /** 발송기 코드 버전 (v4 부터) */
  v?: number;
  rid: string;
  ok: boolean;
  msg: string;
  status?: number;
  html?: string;
}

/** 발송기가 가져와 줄 수 있는 사이트 (브라우저 검사가 없는 곳만) */
export const FETCH_HOSTS = ['www.jobkorea.co.kr', 'www.saramin.co.kr', 'www.work24.go.kr'];

export function newRid() {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** [연결 확인] 링크 주소. 새 창은 링크 클릭으로 연다 (이 화면은 스크립트로 여는 새 창을 막는다) */
export function pingHref(base: string, rid: string): string {
  const u = new URL(base.trim());
  u.searchParams.set('ping', '1');
  u.searchParams.set('rid', rid);
  return u.toString();
}

/** 공고 원문 가져오기 링크 주소 */
export function fetchHref(base: string, key: string, url: string, rid: string): string {
  const u = new URL(base.trim());
  u.searchParams.set('action', 'fetch');
  u.searchParams.set('k', key);
  u.searchParams.set('rid', rid);
  u.searchParams.set('u', url);
  return u.toString();
}

export function isRelaySignal(d: unknown): d is RelaySignal {
  const x = d as RelaySignal;
  return !!x && x.jobkit === 'relay' && typeof x.rid === 'string' && typeof x.ok === 'boolean';
}

/**
 * 폼을 만들어 발송기로 보낸다. 반드시 클릭 처리 안에서 (await 전에) 불러야 새 창이 막히지 않는다.
 * 새 창을 window.open 으로 먼저 열어 두면, 발송기가 끝난 뒤 이 페이지로 완료 신호를 보낼 수 있다.
 */
export function submitRelay(base: string, key: string, p: RelayPayload): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = base.trim();
  // 스크립트로 여는 새 창은 막히므로 폼을 바로 새 창으로 보낸다. rel=opener 라야 결과 신호가 돌아온다
  form.target = '_blank';
  form.setAttribute('rel', 'opener');
  form.acceptCharset = 'UTF-8';
  form.style.display = 'none';
  const add = (name: string, value: string) => {
    const t = document.createElement('textarea');
    t.name = name;
    t.value = value;
    form.appendChild(t);
  };
  add('k', key);
  add('v', String(RELAY_VERSION));
  add('rid', p.rid);
  add('to', p.to);
  add('subject', p.subject);
  add('body', p.body);
  add('from_name', p.from_name);
  add('site', p.site);
  add('files', JSON.stringify(p.files));
  document.body.appendChild(form);
  try {
    form.submit();
  } finally {
    setTimeout(() => form.remove(), 1000);
  }
}

/** 정민욱 계정 Apps Script 에 붙여넣을 발송기 코드 */
/** 보내기 창 HTML (Apps Script HtmlService 안에서 돈다) */
const SEND_PAGE = `<meta name="viewport" content="width=device-width,initial-scale=1">
<div id="box" style="font-family:sans-serif;max-width:560px;margin:6px auto;padding:12px 16px;border-radius:12px;background:#eef4ff">
<h3 id="t" style="margin:0 0 4px;font-size:17px">보내는 중…</h3><p id="m" style="margin:0;font-size:14.5px;line-height:1.6">잠시만 기다려 주세요.</p><p id="c" style="margin:6px 0 0;font-size:13px;color:#555"></p></div>
<script>
function show(t, m, ok) {
  document.getElementById('t').textContent = t;
  document.getElementById('m').textContent = m;
  document.getElementById('box').style.background = ok ? '#e3f7ec' : '#ffe7e4';
}
// 결과는 이 탭을 연 jobkit 화면에만 알린다 (Google 이 감싼 바깥 창에 보내면 결과 통로가 끊긴다)
function targets() {
  var t = [];
  try { if (window.top.opener) t.push(window.top.opener); } catch (e) {}
  return t;
}
function signal(r, rid, kind) {
  var m = { jobkit: 'relay', kind: kind || 'send', v: {{V}}, rid: String(rid || ''), ok: !!r.ok, msg: r.title + ' ' + r.msg };
  targets().forEach(function (w) { try { if (w) w.postMessage(m, '*'); } catch (e) {} });
}
function closeSoon() {
  var n = 5;
  var tick = function () {
    if (n <= 0) { try { window.top.close(); } catch (e) {} document.getElementById('c').textContent = '창이 닫히지 않으면 직접 닫아 주세요.'; return; }
    document.getElementById('c').textContent = n + '초 뒤 이 창이 저절로 닫힙니다.';
    n--;
    setTimeout(tick, 1000);
  };
  tick();
}
function decode(s) {
  s = String(s || '').replace(/^#/, '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  var bin = atob(s), bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder('utf-8').decode(bytes));
}
google.script.url.getLocation(function (loc) {
  var d;
  try { d = decode(loc.hash); } catch (e) { show('보낼 서류를 읽지 못했습니다', 'jobkit 의 보내기 버튼으로 다시 열어 주세요. 메일은 나가지 않았습니다.', false); return; }
  google.script.run
    .withSuccessHandler(function (r) { show(r.title, r.msg, r.ok); signal(r, d.rid); if (r.ok) closeSoon(); })
    .withFailureHandler(function (err) { var r = { ok: false, title: '보내지 못했습니다', msg: String((err && err.message) || err) + ' — 메일은 나가지 않았습니다.' }; show(r.title, r.msg, false); signal(r, d.rid); })
    .sendFromPage(d);
});
</script>`;

/** 보내기 링크 주소: 서류는 # 뒤에 base64url 로 담는다 (서버 요청에는 실리지 않는다) */
export function sendHref(base: string, key: string, p: RelayPayload): string {
  const u = new URL(base.trim());
  u.searchParams.set('action', 'send');
  u.searchParams.set('rid', p.rid);
  const json = JSON.stringify({ k: key, ...p });
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${u.toString()}#${b64}`;
}

export function relayScript(key: string): string {
  return [
    '// jobkit 발송기 v' + RELAY_VERSION + ' — 이 프로젝트를 만든 Google 계정(정민욱) Gmail 로 지원 메일을 보냅니다.',
    '// jobkit 페이지가 넘긴 서류를 첨부해 보내고, 내 Drive 의 "jobkit 지원서" 폴더에 사본을 남깁니다.',
    '// 열쇠(KEY)가 맞을 때만 동작하며, 같은 지원서는 두 번 보내지 않습니다.',
    "var KEY = '" + key + "';",
    "var FOLDER = 'jobkit 지원서';",
    '',
    'function doGet(e) {',
    '  var p = (e && e.parameter) || {};',
    "  if (p.ping) return page('연결됨 ✓ (v" + RELAY_VERSION + ")', Session.getEffectiveUser().getEmail() + ' 계정으로 보냅니다. 이 창은 닫아도 됩니다.', true, p.rid, { kind: 'ping' });",
    "  if (p.action === 'fetch') return fetchPosting(p);",
    "  if (p.action === 'send') return sendPage();",
    "  return page('jobkit 발송기', 'jobkit 페이지에서 보내기 버튼을 눌러 사용합니다.', true, '');",
    '}',
    '',
    '// 공고 새로고침: 정해진 구인 사이트의 공고 페이지만 가져와 jobkit 에 돌려준다 (로그인·쿠키 없이 공개 페이지만)',
    "var FETCH_HOSTS = " + JSON.stringify(FETCH_HOSTS) + ";",
    'function fetchPosting(p) {',
    "  if (p.k !== KEY) return page('열쇠가 다릅니다', 'jobkit 설정에서 발송기 코드를 다시 붙여넣어 주세요.', false, p.rid, { kind: 'fetch' });",
    "  var m = String(p.u || '').match(/^https:\\/\\/([^\\/?#]+)\\//);",
    "  if (!m || FETCH_HOSTS.indexOf(m[1]) < 0) return page('가져올 수 없는 주소', String(p.u || ''), false, p.rid, { kind: 'fetch' });",
    '  try {',
    "    var r = UrlFetchApp.fetch(p.u, { muteHttpExceptions: true, followRedirects: true, headers: { 'Accept-Language': 'ko-KR,ko;q=0.9' } });",
    '    var code = r.getResponseCode();',
    "    var html = r.getContentText('UTF-8');",
    "    return page(code < 400 ? '공고를 새로 가져왔습니다 ✓' : '공고 페이지 응답 ' + code, 'jobkit 화면에 바로 반영됩니다. 이 창은 닫아도 됩니다.', code < 400, p.rid, { kind: 'fetch', status: code, html: html.slice(0, 900000) });",
    '  } catch (err) {',
    "    return page('공고를 가져오지 못했습니다', String(err && err.message || err), false, p.rid, { kind: 'fetch', status: 0 });",
    '  }',
    '}',
    '',
    'function doPost(e) {',
    '  var p = (e && e.parameter) || {};',
    '  var r = sendCore(p);',
    "  return page(r.title, r.msg, r.ok, p.rid, { kind: 'send' });",
    '}',
    '',
    '// 링크로 열린 보내기 창이 # 뒤에 담아 온 서류를 넘겨 부른다 (google.script.run)',
    'function sendFromPage(p) {',
    '  return sendCore(p || {});',
    '}',
    '',
    'function sendCore(p) {',
    "  if (p.k !== KEY) return { ok: false, title: '열쇠가 다릅니다', msg: 'jobkit 설정에서 발송기 코드를 다시 복사해 붙여넣고 새 버전으로 배포해 주세요. 메일은 나가지 않았습니다.' };",
    '  var lock = LockService.getScriptLock();',
    '  lock.waitLock(30000);',
    '  try {',
    '    var props = PropertiesService.getScriptProperties();',
    "    if (p.rid && props.getProperty('sent_' + p.rid)) return { ok: true, title: '이미 보낸 지원서입니다', msg: '같은 메일을 두 번 보내지 않았습니다. 이 창은 닫아도 됩니다.' };",
    "    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(p.to || '')) throw new Error('받는 사람 주소가 이상합니다: ' + p.to);",
    "    var files = typeof p.files === 'string' ? JSON.parse(p.files || '[]') : (p.files || []);",
    '    var atts = files.map(function (f) { return Utilities.newBlob(Utilities.base64Decode(f.b64), f.type, f.name); });',
    '    GmailApp.sendEmail(p.to, p.subject, p.body, { attachments: atts, name: p.from_name });',
    "    if (p.rid) props.setProperty('sent_' + p.rid, new Date().toISOString());",
    '    try {',
    '      var it = DriveApp.getFoldersByName(FOLDER);',
    '      var root = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);',
    "      var sub = root.createFolder(Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH.mm') + ' ' + (p.site || p.to));",
    '      atts.forEach(function (b) { sub.createFile(b); });',
    "      sub.createFile('메일.txt', '받는 사람: ' + p.to + '\\n제목: ' + p.subject + '\\n\\n' + p.body);",
    '    } catch (x) {}',
    "    return { ok: true, title: '보냈습니다 ✓', msg: p.to + ' 에게 \"' + p.subject + '\" 메일을 첨부 ' + atts.length + '개와 함께 보냈습니다. jobkit 지원 이력에도 기록됩니다.' };",
    '  } catch (err) {',
    "    return { ok: false, title: '보내지 못했습니다', msg: String(err && err.message || err) + ' — 메일은 나가지 않았습니다.' };",
    '  } finally {',
    '    lock.releaseLock();',
    '  }',
    '}',
    '',
    '// 보내기 창: 주소의 # 뒤(서버로 가지 않는 부분)에 담긴 서류를 이 브라우저에서 읽어 sendFromPage 로 넘긴다',
    'function sendPage() {',
    '  var h = ' + JSON.stringify(SEND_PAGE.replace('{{V}}', String(RELAY_VERSION))) + ';',
    "  return HtmlService.createHtmlOutput(h).setTitle('jobkit 발송').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);",
    '}',
    '',
    '// rid 가 있으면 결과를 jobkit 페이지(이 창을 연 창, 또는 이 창을 품은 페이지)로 알려 준다',
    'function page(title, msg, ok, rid, extra) {',
    "  var data = { jobkit: 'relay', v: " + RELAY_VERSION + ", rid: String(rid || ''), ok: !!ok, msg: title + ' ' + msg };",
    '  if (extra) for (var k in extra) data[k] = extra[k];',
    "  var sig = rid ? '<script>(function(){var m=' + JSON.stringify(data).replace(/</g, '\\\\u003c').replace(/\\u2028/g, '\\\\u2028').replace(/\\u2029/g, '\\\\u2029') + ';' +",
    "    'var t=[];try{if(window.top.opener)t.push(window.top.opener)}catch(e){}' +",
    "    't.forEach(function(w){try{if(w)w.postMessage(m,\"*\")}catch(e){}});' +",
    "    'if(m.ok){var n=5,el=document.getElementById(\"cd\");var tk=function(){if(n<=0){try{window.top.close()}catch(e){}if(el)el.textContent=\"창이 닫히지 않으면 직접 닫아 주세요.\";return}if(el)el.textContent=n+\"초 뒤 이 창이 저절로 닫힙니다.\";n--;setTimeout(tk,1000)};tk()}})();<\\/script>' : '';",
    "  var h = '<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">' +",
    "    '<div style=\"font-family:sans-serif;max-width:560px;margin:6px auto;padding:12px 16px;border-radius:12px;background:' + (ok ? '#e3f7ec' : '#ffe7e4') + '\">' +",
    "    '<h3 style=\"margin:0 0 4px;font-size:17px\">' + esc(title) + '</h3><p style=\"margin:0;font-size:14.5px;line-height:1.6\">' + esc(msg) + '</p>' +",
    "    (rid && ok ? '<p id=\"cd\" style=\"margin:6px 0 0;font-size:13px;color:#555\"></p>' : '') + '</div>' + sig;",
    "  return HtmlService.createHtmlOutput(h).setTitle('jobkit 발송').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);",
    '}',
    '',
    'function esc(s) {',
    "  return String(s).replace(/[&<>\"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]; });",
    '}',
    '',
  ].join('\n');
}
