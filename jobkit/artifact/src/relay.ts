// 원클릭 발송: 페이지가 서류(PDF)를 정민욱 계정(mwjung2002)에 설치한 Apps Script 웹앱(발송기)으로
// 직접 넘기고(새 창으로 폼 전송), 발송기가 정민욱 Gmail 로 보내며 정민욱 Drive 에 사본을 남긴다.
// claude.ai 연결(Gmail/Drive) 기능을 쓰지 않으므로 어느 계정·화면에서 열어도 동작한다.

export const RELAY_VERSION = 3;

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
  rid: string;
  ok: boolean;
  msg: string;
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
  const name = `jobkit_send_${p.rid.replace(/[^A-Za-z0-9_]/g, '_')}`;
  let w: Window | null = null;
  try {
    w = window.open('', name);
    w?.document.write('<p style="font-family:sans-serif;padding:40px;font-size:18px">jobkit: 보내는 중입니다… 잠시만 기다려 주세요.</p>');
  } catch {
    /* 새 창을 못 열면 아래 _blank 로 */
  }
  form.target = w ? name : '_blank';
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
    "  if (p.ping) return page('연결됨 ✓ (v" + RELAY_VERSION + ")', Session.getEffectiveUser().getEmail() + ' 계정으로 보냅니다. 이 창은 닫아도 됩니다.', true, '');",
    "  return page('jobkit 발송기', 'jobkit 페이지에서 보내기 버튼을 눌러 사용합니다.', true, '');",
    '}',
    '',
    'function doPost(e) {',
    '  var p = (e && e.parameter) || {};',
    "  if (p.k !== KEY) return page('열쇠가 다릅니다', 'jobkit 설정에서 발송기 코드를 다시 복사해 붙여넣고 새 버전으로 배포해 주세요. 메일은 나가지 않았습니다.', false, p.rid);",
    '  var lock = LockService.getScriptLock();',
    '  lock.waitLock(30000);',
    '  try {',
    '    var props = PropertiesService.getScriptProperties();',
    "    if (p.rid && props.getProperty('sent_' + p.rid)) return page('이미 보낸 지원서입니다', '같은 메일을 두 번 보내지 않았습니다. 이 창은 닫아도 됩니다.', true, p.rid);",
    "    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(p.to || '')) throw new Error('받는 사람 주소가 이상합니다: ' + p.to);",
    "    var files = JSON.parse(p.files || '[]');",
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
    "    return page('보냈습니다 ✓', p.to + ' 에게 \"' + p.subject + '\" 메일을 첨부 ' + atts.length + '개와 함께 보냈습니다. 이 창은 닫아도 됩니다.', true, p.rid);",
    '  } catch (err) {',
    "    return page('보내지 못했습니다', String(err && err.message || err) + ' — 메일은 나가지 않았습니다.', false, p.rid);",
    '  } finally {',
    '    lock.releaseLock();',
    '  }',
    '}',
    '',
    '// rid 가 있으면 결과를 jobkit 페이지(이 창을 연 창)로 알려 준다',
    'function page(title, msg, ok, rid) {',
    "  var sig = rid ? '<script>(function(){var m=' + JSON.stringify({ jobkit: 'relay', rid: String(rid), ok: !!ok, msg: title + ' ' + msg }).replace(/</g, '\\\\u003c') + ';' +",
    "    'var t=[];try{t.push(window.top.opener)}catch(e){}try{t.push(window.opener)}catch(e){}' +",
    "    't.forEach(function(w){try{if(w)w.postMessage(m,\"*\")}catch(e){}});})();<\\/script>' : '';",
    "  var h = '<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">' +",
    "    '<div style=\"font-family:sans-serif;max-width:520px;margin:48px auto;padding:24px 28px;border-radius:14px;background:' + (ok ? '#e3f7ec' : '#ffe7e4') + '\">' +",
    "    '<h2 style=\"margin:0 0 8px\">' + esc(title) + '</h2><p style=\"font-size:16px;line-height:1.6\">' + esc(msg) + '</p>' +",
    "    (rid ? '<p style=\"color:#555\">jobkit 페이지로 돌아가면 결과가 표시됩니다.</p>' : '') + '</div>' + sig;",
    "  return HtmlService.createHtmlOutput(h).setTitle('jobkit 발송');",
    '}',
    '',
    'function esc(s) {',
    "  return String(s).replace(/[&<>\"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]; });",
    '}',
    '',
  ].join('\n');
}
