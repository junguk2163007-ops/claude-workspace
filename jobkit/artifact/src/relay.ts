// 원클릭 발송: 서류를 Google Drive 폴더에 올리고, 정민욱 계정(mwjung2002)에 설치한
// Apps Script 웹앱(발송기)이 그 파일을 첨부해 정민욱 Gmail 로 보낸다.
// 이 페이지에 연결된 Gmail 은 개인 계정이라 보내는 사람을 바꿀 수 없기 때문.

const DRIVE = 'Google Drive';

export interface RelayFile {
  id: string;
  name: string;
}

export interface RelayJob {
  to: string;
  subject: string;
  body: string;
  from_name: string;
  files: RelayFile[];
}

async function mcpNs(): Promise<any> {
  const c = (window as any).claude;
  if (!c?.use) return null;
  try {
    return await c.use('mcp');
  } catch {
    return null;
  }
}

async function drive(tool: string, args: Record<string, unknown>): Promise<any> {
  const mcp = await mcpNs();
  if (!mcp) throw new Error('이 화면에서는 Google Drive를 쓸 수 없습니다. claude.ai 에서 이 페이지를 열어 주세요.');
  const r = await mcp.callTool(DRIVE, tool, args, { cache: false });
  return r?.payload ?? {};
}

const idOf = (p: any): string => p?.id ?? p?.file?.id ?? '';

/** 서류 폴더를 만들고 발송 계정에 편집 권한을 준다 (처음 한 번) */
export async function createFolder(sender: string): Promise<string> {
  const f = await drive('create_file', { title: 'jobkit 지원서 (정민욱)', contentMimeType: 'application/vnd.google-apps.folder' });
  const id = idOf(f);
  if (!id) throw new Error('Drive 폴더를 만들지 못했습니다.');
  await drive('share_file', { fileId: id, emailAddress: sender, role: 'writer' });
  return id;
}

export async function uploadPdf(folder: string, name: string, b64: string, type = 'application/pdf'): Promise<string> {
  const f = await drive('create_file', { title: name, parentId: folder, base64Content: b64, contentMimeType: type, disableConversionToGoogleType: true });
  const id = idOf(f);
  if (!id) throw new Error(`${name} 을(를) Drive에 올리지 못했습니다.`);
  return id;
}

export async function uploadJob(folder: string, title: string, job: RelayJob): Promise<string> {
  const f = await drive('create_file', {
    title,
    parentId: folder,
    textContent: JSON.stringify(job),
    contentMimeType: 'application/json',
    disableConversionToGoogleType: true,
  });
  const id = idOf(f);
  if (!id) throw new Error('발송 요청 파일을 Drive에 올리지 못했습니다.');
  return id;
}

export type RelayStatus = { state: 'waiting' } | { state: 'sent'; threadId: string | null } | { state: 'failed'; why: string };

/** 발송기가 요청 파일 이름 앞에 "보냄 …" / "실패 …" 를 붙인다 */
export async function relayStatus(jobId: string): Promise<RelayStatus> {
  const m = await drive('get_file_metadata', { fileId: jobId, excludeContentSnippets: true });
  const title: string = m?.title ?? m?.name ?? '';
  if (title.startsWith('보냄')) {
    const t = title.split(' ')[1];
    return { state: 'sent', threadId: t && t !== '-' ? t : null };
  }
  if (title.startsWith('실패')) return { state: 'failed', why: title.replace(/^실패\s*/, '').split(' | ')[0] };
  return { state: 'waiting' };
}

export function relayUrl(base: string, key: string, jobId: string) {
  const u = new URL(base.trim());
  u.searchParams.set('k', key);
  u.searchParams.set('j', jobId);
  return u.toString();
}

export function pingUrl(base: string) {
  const u = new URL(base.trim());
  u.searchParams.set('ping', '1');
  return u.toString();
}

export function validRelayBase(s: string) {
  return /^https:\/\/script\.google\.com\/macros\/(u\/\d+\/)?s\/[A-Za-z0-9_-]+\/exec$/.test(s.trim());
}

export function newKey() {
  const a = new Uint8Array(18);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 24);
}

/** 정민욱 계정 Apps Script 에 붙여넣을 발송기 코드 */
export function relayScript(key: string): string {
  return [
    '// jobkit 발송기 — 이 프로젝트를 만든 Google 계정(정민욱) Gmail 로 지원 메일을 보냅니다.',
    '// jobkit 페이지가 Google Drive 에 올린 서류만 첨부해 보내며, 열쇠(KEY)가 맞을 때만 동작합니다.',
    "var KEY = '" + key + "';",
    '',
    'function doGet(e) {',
    '  var p = (e && e.parameter) || {};',
    "  if (p.ping) return page('연결됨 ✓', Session.getEffectiveUser().getEmail() + ' 계정으로 보냅니다. 이 창은 닫아도 됩니다.', true);",
    "  if (p.k !== KEY) return page('열쇠가 다릅니다', 'jobkit 설정에서 발송기 코드를 다시 복사해 붙여넣고 새 버전으로 배포해 주세요.', false);",
    '  var lock = LockService.getScriptLock();',
    '  lock.waitLock(30000);',
    '  var jf = null;',
    '  try {',
    '    jf = DriveApp.getFileById(p.j);',
    "    if (jf.getName().indexOf('보냄') === 0) return page('이미 보낸 지원서입니다', '같은 메일을 두 번 보내지 않았습니다. 이 창은 닫아도 됩니다.', true);",
    "    var job = JSON.parse(jf.getBlob().getDataAsString('UTF-8'));",
    "    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(job.to)) throw new Error('받는 사람 주소가 이상합니다: ' + job.to);",
    '    var atts = job.files.map(function (f) { return DriveApp.getFileById(f.id).getBlob().setName(f.name); });',
    '    GmailApp.sendEmail(job.to, job.subject, job.body, { attachments: atts, name: job.from_name });',
    '    Utilities.sleep(2500);',
    "    var th = GmailApp.search('in:sent to:' + job.to + ' newer_than:1h', 0, 1);",
    "    jf.setName('보냄 ' + (th.length ? th[0].getId() : '-') + ' ' + jf.getName());",
    "    return page('보냈습니다 ✓', job.to + ' 에게 \"' + job.subject + '\" 메일을 보냈습니다. 이 창은 닫아도 됩니다.', true);",
    '  } catch (err) {',
    "    var msg = String(err && err.message || err);",
    "    if (jf) { try { jf.setName('실패 ' + msg.slice(0, 80) + ' | ' + jf.getName().replace(/^실패 .*? \\| /, '')); } catch (x) {} }",
    "    return page('보내지 못했습니다', msg, false);",
    '  } finally {',
    '    lock.releaseLock();',
    '  }',
    '}',
    '',
    'function page(title, msg, ok) {',
    "  var h = '<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">' +",
    "    '<div style=\"font-family:sans-serif;max-width:520px;margin:48px auto;padding:24px 28px;border-radius:14px;background:' + (ok ? '#e3f7ec' : '#ffe7e4') + '\">' +",
    "    '<h2 style=\"margin:0 0 8px\">' + esc(title) + '</h2><p style=\"font-size:16px;line-height:1.6\">' + esc(msg) + '</p></div>';",
    "  return HtmlService.createHtmlOutput(h).setTitle('jobkit 발송');",
    '}',
    '',
    'function esc(s) {',
    "  return String(s).replace(/[&<>\"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]; });",
    '}',
    '',
  ].join('\n');
}
