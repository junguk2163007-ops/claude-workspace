// 공고 상세 페이지 HTML → jobkit 공고 글. 수집기(서버)와 jobkit 페이지(공고 새로고침)가 같이 쓴다.
// 네트워크·브라우저 없이 문자열만 다룬다.

import { parsePosting } from '../lib/parser';
import { todaySeoul } from '../lib/util/date';
import { estimateCommute, type CommuteResult, type Geo } from '../artifact/src/commute';

export const TEXT_MAX = 3500;

export type SourceId = 'dghma' | 'jobkorea' | 'saramin' | 'work24';

export const ORIGIN: Record<SourceId, string> = { dghma: '대구주택관리사협회', jobkorea: '잡코리아', saramin: '사람인', work24: '고용24' };

export interface JobItem {
  id: string;
  source: SourceId;
  /** 출처 사이트 이름 (화면 배지용) */
  origin: string;
  url: string;
  list_title: string;
  site: string;
  title: string;
  company: string;
  address: string;
  salary: string;
  shift: string;
  deadline: string | null;
  deadline_text: string;
  emails: string[];
  /** 채용 담당자 (고용24 등) */
  contact?: { name?: string; phone?: string; fax?: string; method?: string } | null;
  apply_channels: string[];
  /** 이메일로 접수 가능한지 */
  email_apply: boolean;
  commute: CommuteResult;
  /** 근무지 좌표 (카카오맵 길찾기용, 도로 단위 정확도). 못 찾으면 null */
  geo: Geo | null;
  posted: string;
  /** 처음 발견한 때 (ISO). 이전 수집 결과(JOBKIT_PREV 폴더)가 있을 때만 채운다 */
  first_seen?: string;
  /** 이번에 스캔한 때 (ISO) */
  scanned_at?: string;
  text: string;
}

export interface SourceResult {
  source: SourceId;
  updated_at: string;
  scanned: number;
  kept: number;
  dropped_far: number;
  errors: string[];
  items: JobItem[];
}

/** 시설·기전·영선 계열 직무인지 (사무·청소·영업 등은 제외) */
export function toItem(source: SourceId, id: string, url: string, listTitle: string, posted: string, text: string, fallback: { address?: string; company?: string; title?: string; site?: string }): JobItem {
  const today = todaySeoul();
  const p = parsePosting(text, today);
  const address = p.address || fallback.address || '';
  const site = p.site || fallback.site || '';
  const commute = estimateCommute(address, site);
  return {
    id: `${source}-${id}`,
    source,
    origin: ORIGIN[source],
    url,
    list_title: listTitle,
    site,
    title: p.title || fallback.title || listTitle,
    company: p.company || fallback.company || '',
    address,
    salary: p.salary_text,
    shift: p.shift,
    deadline: p.deadline,
    deadline_text: p.deadline_text,
    emails: p.emails,
    apply_channels: p.apply_channels,
    email_apply: p.emails.length > 0,
    commute,
    geo: null,
    posted,
    text: text.slice(0, TEXT_MAX),
  };
}

export const clean = (s: string) =>
  s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();

export interface Card {
  title: string;
  company: string;
  loc: string;
}

/** 공고 하나를 다시 가져올 주소 (사람이 보는 주소와 다를 수 있다). 협회는 브라우저 검사가 있어 여기서 다루지 않는다 */
export function detailFetchUrl(source: SourceId, nativeId: string): string | null {
  if (!/^[A-Za-z0-9]+$/.test(nativeId)) return null;
  if (source === 'jobkorea') return `https://www.jobkorea.co.kr/Recruit/GI_Read/${nativeId}`;
  if (source === 'saramin') return `https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=${nativeId}`;
  if (source === 'work24') return `https://www.work24.go.kr/wk/a/b/1500/empDetailAuthView.do?wantedAuthNo=${nativeId}&infoTypeCd=VALIDATION&infoTypeGroup=tb_workinfoworknet`;
  return null;
}

/** 마감·삭제된 공고 페이지인지 (확실한 표시만 본다) */
export function looksClosed(status: number, html: string): boolean {
  if (status === 404 || status === 410) return true;
  const t = clean(html).slice(0, 30000);
  return /(마감된 공고|채용이 마감|접수가 마감|모집이 마감|존재하지 않는 (공고|채용)|삭제된 (공고|채용)|게시가 종료|채용정보가 없습니다)/.test(t);
}

export function extractJobkorea(html: string, c: Card): { text: string; addr: string } {
  const body = clean(html);
  const s = body.search(/모집요강|모집분야|근무조건|지원자격/);
  const e = body.search(/기업 정보|기업정보 더보기|이 기업의 다른 공고/);
  let text = body.slice(s >= 0 ? s : 0, e > s ? e : undefined);
  const addr = text.match(/근무지\s*주소\s*([^\n]+?)(?:\s*지도보기|\n|$)/)?.[1]?.trim() ?? '';
  const due = text.match(/마감일\s*(\d{4}\.\d{2}\.\d{2})/)?.[1];
  text = [`채용정보 : ${c.title}`, `위탁사명 : ${c.company}`, addr && `주소 : ${addr}`, due && `마감일자 : ${due.replace(/\./g, '-')}`, text].filter(Boolean).join('\n');
  return { text, addr };
}

export function extractSaramin(html: string, c: Card): { text: string; addr: string } {
  let text = clean(html);
  const addr = text.match(/근무\s*(?:지|지역|장소)\s*[:：]\s*([^\n•]+)/)?.[1]?.trim() ?? '';
  text = [`채용정보 : ${c.title}`, `위탁사명 : ${c.company}`, addr && `주소 : ${addr}`, text].filter(Boolean).join('\n');
  return { text, addr };
}

export function extractWork24(html: string, c: Card): { text: string; addr: string; site: string; contact: JobItem['contact'] } {
  const body = clean(html);
  const pick = (label: string) => body.match(new RegExp(`${label}\\s*\\n\\s*([^\\n]+)`))?.[1]?.trim() ?? '';
  const s0 = body.indexOf('직무내용');
  const duty = body.slice(s0 >= 0 ? s0 + 4 : 0, s0 >= 0 ? body.indexOf('더보기', s0) : 0).trim();
  const addr = pick('근무 예정지').replace(/,\s*\.\s*/, ' ');
  const site = addr.match(/\([^,)]*,\s*([^)]+)\)/)?.[1]?.trim() ?? '';
  // 접수 방법: 제목 다음 줄부터 "제출 서류" 앞까지 (고용24 입사지원 / 이메일 / 우편 / 방문 / 팩스 …)
  const m0 = body.search(/접수 방법\s*\n/);
  const method =
    m0 >= 0
      ? body
          .slice(m0, body.indexOf('제출 서류', m0) > m0 ? body.indexOf('제출 서류', m0) : m0 + 200)
          .split('\n')
          .slice(1)
          .map((x) => x.trim())
          .filter((x) => x && x !== '텍스트' && !/br태그/.test(x))
          .join(', ')
          .slice(0, 120)
      : '';
  // 채용 담당자 이름·전화·팩스 (이메일은 고용24 로그인해야 보임)
  const k0 = body.indexOf('채용 담당자 정보 열람');
  const cblock = k0 >= 0 ? body.slice(k0, body.indexOf('질문하기', k0) > k0 ? body.indexOf('질문하기', k0) : k0 + 1500) : '';
  const cName = cblock.match(/상세 보기\s*\n\s*([^\n*]+?)\s*\n/)?.[1]?.trim() ?? '';
  const cPhone = cblock.match(/전화번호\s*([0-9][0-9-]{7,})/)?.[1] ?? '';
  const cFax = cblock.match(/팩스\s*([0-9][0-9-]{7,})/)?.[1] ?? '';
  // 본문 어디에든 적힌 이메일 (고용24 자체 주소 제외)
  const bodyEmails = Array.from(new Set(body.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [])).filter(
    (e) => !/(work24|keis|moel|korea)\.(go|or)\.kr$/i.test(e),
  );
  const due = pick('접수 마감일').match(/\d{4}\.\d{2}\.\d{2}/)?.[0]?.replace(/\./g, '-') ?? '';
  const text = [
    `채용정보 : ${c.title}`,
    site && `단지명 : ${site}`,
    `위탁사명 : ${c.company}`,
    addr && `주소 : ${addr}`,
    `급여 : ${pick('임금 조건')}`,
    `근무형태 : ${pick('근무 형태')} ${pick('상세 근무시간')}`.trim(),
    due && `마감일자 : ${due}`,
    `제출서류 : ${pick('제출 서류')}`,
    `접수방법 : ${method}`,
    bodyEmails.length ? `이메일 : ${bodyEmails.join(', ')}` : '',
    cName || cPhone ? `채용담당 : ${[cName, cPhone && `전화 ${cPhone}`, cFax && `팩스 ${cFax}`].filter(Boolean).join(' · ')}` : '',
    '',
    duty,
  ]
    .filter((x): x is string => typeof x === 'string')
    .join('\n');
  const contact = cName || cPhone || cFax || method ? { name: cName || undefined, phone: cPhone || undefined, fax: cFax || undefined, method: method || undefined } : null;
  return { text, addr, site, contact };
}

/** 공고 하나를 다시 읽은 HTML 로 고친 공고를 만든다. 통근·좌표·발견일은 주소가 같으면 그대로 둔다 */
export function refreshItem(old: JobItem, status: number, html: string, now = new Date().toISOString()): { item: JobItem | null; closed: boolean } {
  if (looksClosed(status, html)) return { item: null, closed: true };
  if (status >= 400) throw new Error(`HTTP ${status}`);
  const nativeId = old.id.slice(old.source.length + 1);
  const c: Card = { title: old.list_title || old.title, company: old.company, loc: old.address };
  let fresh: JobItem;
  if (old.source === 'jobkorea') {
    const r = extractJobkorea(html, c);
    fresh = toItem('jobkorea', nativeId, old.url, old.list_title, old.posted, r.text, { address: r.addr || old.address, company: old.company, title: old.title, site: old.site });
  } else if (old.source === 'saramin') {
    const r = extractSaramin(html, c);
    fresh = toItem('saramin', nativeId, old.url, old.list_title, old.posted, r.text, { address: r.addr || old.address, company: old.company, title: old.title, site: old.site });
  } else if (old.source === 'work24') {
    const r = extractWork24(html, c);
    fresh = toItem('work24', nativeId, old.url, old.list_title, old.posted, r.text, { address: r.addr || old.address, company: old.company, title: old.title, site: r.site || old.site });
    fresh.contact = r.contact;
  } else throw new Error('이 사이트는 여기서 새로고침하지 않습니다');
  // 읽은 글이 너무 짧으면 페이지 구조가 바뀐 것 — 예전 내용을 지우지 않는다
  if (fresh.text.replace(/\s/g, '').length < 120) throw new Error('공고 내용을 읽지 못했습니다');
  const sameAddr = fresh.address.replace(/\s/g, '') === old.address.replace(/\s/g, '');
  return {
    item: { ...fresh, geo: sameAddr ? old.geo : fresh.geo ?? old.geo ?? null, commute: sameAddr ? old.commute : fresh.commute, first_seen: old.first_seen, scanned_at: now },
    closed: false,
  };
}
