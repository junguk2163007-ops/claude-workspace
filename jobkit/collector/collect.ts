// 공고 수집기: 대구주택관리사협회 구인게시판, 잡코리아, 사람인에서
// 대구 시설·기전·관리 공고를 모아 jobkit 파서로 정리하고, 통근 표로 거른다.
// 사용법: node collector/build.mjs && node collector/dist/collect.cjs <출력폴더>
// 사이트에 부담을 주지 않도록 요청 사이에 쉬고, 로그인·이력서 페이지는 열지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';
import { parsePosting } from '../lib/parser';
import { todaySeoul } from '../lib/util/date';
import { estimateCommute, type CommuteResult, type Geo } from '../artifact/src/commute';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36';
const TEXT_MAX = 3500;
const PER_SOURCE_MAX = 40;

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
const ROLE_RE = /(시설|기전|영선|관리주임|관리과장|관리기사|관리소|아파트|건물\s*관리|빌딩\s*관리|보일러|에너지\s*관리|전기\s*(기사|주임|안전|기술)|설비\s*(관리|유지|보수|기사|주임))/;
const NOT_ROLE_RE = /(사무|총무|경리|회계|청소|미화|영업|판매|상담원|물품|배송|운전기사|요양|간호|조리|강사|디자인|개발자|마케팅|안전관리대행|월점검|설계|오퍼레이터|\bOP\b|생산|제조|포장|건설|시공|현장\s*기계|엔지니어|정보통신|태양광|판금|절곡|제작|공사|공무|경비원|요양)/;

/** 목록의 지역 표기가 가까운 구를 포함하는지 (먼 구만 적힌 공고는 상세를 열지 않는다) */
function nearInList(loc: string): boolean {
  if (!/대구|칠곡/.test(loc)) return false;
  if (/북구|서구|중구|칠곡|대구\s*전체|대구전체/.test(loc)) return true;
  if (/(수성구|달서구|달성군|동구|남구|경산|구미|경주|포항|영천)/.test(loc)) return false;
  return /대구/.test(loc);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clean = (s: string) =>
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

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function toItem(source: SourceId, id: string, url: string, listTitle: string, posted: string, text: string, fallback: { address?: string; company?: string; title?: string; site?: string }): JobItem {
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

export function isRelevant(it: Pick<JobItem, 'list_title' | 'title' | 'text'>): boolean {
  const head = `${it.list_title} ${it.title}`;
  if (NOT_ROLE_RE.test(head)) return false;
  return ROLE_RE.test(head) || ROLE_RE.test(it.text.slice(0, 600));
}

function keep(it: JobItem, today: string): 'keep' | 'far' | 'closed' | 'other' {
  if (!isRelevant(it)) return 'other';
  if (it.deadline && it.deadline < today) return 'closed';
  // 화면에서 기준(통근 분)에 맞춰 다시 거르므로, 여기서는 넉넉히(50분) 남긴다
  if (it.commute.min !== null && it.commute.min > 50) return 'far';
  // 동을 모르는 공고는 가까운 구(북구·서구·중구·칠곡)만 "확인 필요"로 남긴다
  if (it.commute.verdict === 'unknown' && !(/대구|칠곡/.test(it.address) && /북구|서구|중구|칠곡/.test(it.address))) return 'far';
  return 'keep';
}

// ---------- 대구주택관리사협회 ----------

async function collectDghma(browser: Browser): Promise<{ items: JobItem[]; scanned: number; errors: string[] }> {
  const errors: string[] = [];
  const items: JobItem[] = [];
  const page = await browser.newPage({ userAgent: UA });
  const base = 'https://www.dghma.org/pg/bbs/board.php?bo_table=recruit_new_3';
  const links = new Map<string, string>();
  for (const pg of [1, 2]) {
    await page.goto(`${base}&page=${pg}`, { waitUntil: 'networkidle', timeout: 45000 });
    const rows = await page.$$eval('a[href*="wr_id="]', (as) =>
      as.map((a) => ({ t: (a.textContent || '').trim().replace(/\s+/g, ' '), h: (a as HTMLAnchorElement).href })).filter((x) => x.t),
    );
    for (const r of rows) {
      const id = r.h.match(/wr_id=(\d+)/)?.[1];
      if (id && !links.has(id)) links.set(id, r.t);
    }
    await sleep(800);
  }
  let scanned = 0;
  for (const [id, title] of links) {
    if (items.length >= PER_SOURCE_MAX) break;
    try {
      await page.goto(`${base}&wr_id=${id}`, { waitUntil: 'networkidle', timeout: 45000 });
      scanned++;
      const full: string = await page.evaluate(() => (document.querySelector('#bo_v') as HTMLElement | null)?.innerText || document.body.innerText);
      if (/마감여부\s*마감(?!여부)/.test(full) && !/채용중/.test(full)) continue;
      const date = full.match(/작성일\s*\n?\s*(\d{2}-\d{2}-\d{2})/)?.[1] ?? '';
      const start = full.indexOf('구인상세정보');
      const end = full.lastIndexOf('수정하기');
      // 표의 한 줄 "라벨\t값\t라벨\t값" → "라벨 : 값" 줄로 나눈다
      const text = full
        .slice(start >= 0 ? start : 0, end > start ? end : undefined)
        .split('\n')
        .flatMap((line) => {
          const cells = line.split('\t').map((c) => c.trim());
          if (cells.length < 2) return [line];
          const out: string[] = [];
          // 값이 빈 칸(예: 마감일자 미기재)은 버린다. 남겨 두면 파서가 다음 칸의 라벨을 값으로 읽는다
          for (let i = 0; i < cells.length; i += 2) if (cells[i] && cells[i + 1]) out.push(`${cells[i]} : ${cells[i + 1]}`);
          return out;
        })
        .join('\n')
        .trim();
      items.push(toItem('dghma', id, `${base}&wr_id=${id}`, title, date ? `20${date}` : '', text, {}));
    } catch (e) {
      errors.push(`협회 ${id}: ${(e as Error).message}`);
    }
    await sleep(700);
  }
  await page.close();
  return { items, scanned, errors };
}

// ---------- 잡코리아 ----------

const JK_QUERIES = ['대구 시설관리', '대구 아파트 관리', '대구 기전', '대구 영선', '대구 시설주임', '대구 전기 시설', '대구 설비', '칠곡 시설관리'];

async function collectJobkorea(): Promise<{ items: JobItem[]; scanned: number; errors: string[] }> {
  const errors: string[] = [];
  const cards = new Map<string, { title: string; company: string; loc: string; duty: string }>();
  for (const q of JK_QUERIES) {
    try {
      const html = await get(`https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(q)}&tabType=recruit`);
      for (const part of html.split('data-sentry-component="CardJob"').slice(1)) {
        const gid = part.match(/GI_Read\/(\d+)/)?.[1];
        if (!gid || cards.has(gid)) continue;
        const texts = Array.from(part.matchAll(/>([^<>]{2,120})</g)).map((m) => clean(m[1])).filter((x) => x && !x.startsWith('{'));
        const loc = texts.find((x) => /^(대구|경북)\s/.test(x)) ?? '';
        if (!/^(대구|경북 칠곡)/.test(loc)) continue;
        const title = clean(part.match(/text-typo-b1-18[^"]*">([^<]+)</)?.[1] ?? '');
        const company = clean(part.match(/text-gray700 text-typo-b2-16">([^<]+)</)?.[1] ?? (part.match(/alt="([^"]+?) 로고"/)?.[1] ?? ''));
        const duty = clean(part.match(/text-typo-b4-14">([^<]+)<\/span><\/div><\/div>/)?.[1] ?? '');
        if (!title || !nearInList(loc) || NOT_ROLE_RE.test(title) || !ROLE_RE.test(`${title} ${duty}`)) continue;
        cards.set(gid, { title, company, loc, duty });
      }
    } catch (e) {
      errors.push(`잡코리아 검색 "${q}": ${(e as Error).message}`);
    }
    await sleep(1000);
  }
  const items: JobItem[] = [];
  let scanned = 0;
  for (const [gid, c] of cards) {
    if (items.length >= PER_SOURCE_MAX) break;
    const url = `https://www.jobkorea.co.kr/Recruit/GI_Read/${gid}`;
    try {
      const html = await get(url);
      scanned++;
      const body = clean(html);
      const s = body.search(/모집요강|모집분야|근무조건|지원자격/);
      const e = body.search(/기업 정보|기업정보 더보기|이 기업의 다른 공고/);
      let text = body.slice(s >= 0 ? s : 0, e > s ? e : undefined);
      const addr = text.match(/근무지\s*주소\s*([^\n]+?)(?:\s*지도보기|\n|$)/)?.[1]?.trim() ?? '';
      const due = text.match(/마감일\s*(\d{4}\.\d{2}\.\d{2})/)?.[1];
      text = [`채용정보 : ${c.title}`, `위탁사명 : ${c.company}`, addr && `주소 : ${addr}`, due && `마감일자 : ${due.replace(/\./g, '-')}`, text].filter(Boolean).join('\n');
      items.push(toItem('jobkorea', gid, url, c.title, '', text, { address: addr || c.loc, company: c.company, title: c.title, site: c.company }));
    } catch (e) {
      errors.push(`잡코리아 ${gid}: ${(e as Error).message}`);
    }
    await sleep(900);
  }
  return { items, scanned, errors };
}

// ---------- 사람인 ----------

const SR_QUERIES = ['시설관리', '아파트 관리', '기전', '영선', '시설주임', '전기기사', '설비'];

async function collectSaramin(): Promise<{ items: JobItem[]; scanned: number; errors: string[] }> {
  const errors: string[] = [];
  const cards = new Map<string, { title: string; company: string; loc: string; due: string }>();
  for (const q of SR_QUERIES) {
    try {
      const html = await get(`https://www.saramin.co.kr/zf_user/search/recruit?searchword=${encodeURIComponent(q)}&loc_mcd=104000&recruitPageCount=40`);
      for (const b of html.split('<div class="item_recruit"').slice(1)) {
        const id = b.match(/value="(\d+)"/)?.[1];
        if (!id || cards.has(id)) continue;
        const title = clean(b.match(/class="job_tit"[\s\S]*?title="([^"]+)"/)?.[1] ?? '');
        const company = clean(b.match(/class="corp_name"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '');
        const cond = clean(b.match(/class="job_condition">([\s\S]*?)<\/div>/)?.[1] ?? '');
        const due = clean(b.match(/class="job_date">([\s\S]*?)<\/div>/)?.[1] ?? '');
        // 가까운 구가 들어간 시설 계열 공고만 상세를 연다
        if (!nearInList(cond) || NOT_ROLE_RE.test(title) || !ROLE_RE.test(title)) continue;
        cards.set(id, { title, company, loc: cond, due });
      }
    } catch (e) {
      errors.push(`사람인 검색 "${q}": ${(e as Error).message}`);
    }
    await sleep(1000);
  }
  const items: JobItem[] = [];
  let scanned = 0;
  for (const [id, c] of cards) {
    if (items.length >= PER_SOURCE_MAX) break;
    const url = `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${id}`;
    try {
      const html = await get(`https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=${id}`);
      scanned++;
      let text = clean(html);
      const addr = text.match(/근무\s*(?:지|지역|장소)\s*[:：]\s*([^\n•]+)/)?.[1]?.trim() ?? '';
      text = [`채용정보 : ${c.title}`, `위탁사명 : ${c.company}`, addr && `주소 : ${addr}`, text].filter(Boolean).join('\n');
      items.push(toItem('saramin', id, url, c.title, '', text, { address: addr, company: c.company, title: c.title, site: c.company }));
    } catch (e) {
      errors.push(`사람인 ${id}: ${(e as Error).message}`);
    }
    await sleep(900);
  }
  return { items, scanned, errors };
}

// ---------- 주소 → 좌표 (OpenStreetMap Nominatim, 1초에 1건 이하) ----------

const GEO_UA = 'jobkit-collector/1.0 (personal job search tool)';
const geoCache = new Map<string, Geo | null>();

async function geocodeOnce(q: string): Promise<Geo | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=kr&accept-language=ko`;
  const res = await fetch(url, { headers: { 'User-Agent': GEO_UA } });
  await sleep(1100);
  if (!res.ok) return null;
  const d = (await res.json()) as { lat: string; lon: string }[];
  return d[0] ? { lat: Number(d[0].lat), lng: Number(d[0].lon) } : null;
}

/** 주소를 점점 줄여 가며 찾는다: 전체 → 괄호·건물명 뺀 도로명주소 → 구+동 */
export async function geocode(address: string): Promise<Geo | null> {
  const a = address.replace(/☎.*$/, '').replace(/\(\d{5}\)/, '').trim();
  if (!a) return null;
  if (geoCache.has(a)) return geoCache.get(a)!;
  const road = a.match(/^(.*?(?:로|길)\s*\d+(?:-\d+)?)/)?.[1];
  const dong = a.match(/\(([가-힣0-9]+동)/)?.[1];
  const gu = a.match(/(북구|서구|중구|남구|동구|수성구|달서구|달성군|칠곡군)/)?.[1];
  const tries = [a, road, gu && dong ? `대구 ${gu} ${dong}` : undefined].filter((x, i, arr): x is string => !!x && arr.indexOf(x) === i);
  let found: Geo | null = null;
  for (const q of tries) {
    try {
      found = await geocodeOnce(q);
    } catch {
      found = null;
    }
    if (found) break;
  }
  geoCache.set(a, found);
  return found;
}

// ---------- 고용24 (그 외) ----------

/** 대구 북구·서구·중구, 경북 칠곡군 */
const W24_REGIONS = ['27230', '27170', '27110', '47850'];
const W24_QUERIES = ['시설', '기전', '영선', '관리주임', '전기'];

async function collectWork24(): Promise<{ items: JobItem[]; scanned: number; errors: string[] }> {
  const errors: string[] = [];
  const cards = new Map<string, { title: string; company: string; loc: string }>();
  for (const region of W24_REGIONS)
    for (const q of W24_QUERIES) {
      try {
        const html = await get(
          `https://www.work24.go.kr/wk/a/b/1200/retriveDtlEmpSrchList.do?srcKeyword=${encodeURIComponent(q)}&region=${region}&resultCnt=50`,
        );
        for (const row of html.match(/<tr id="list\d+">[\s\S]*?<\/tr>/g) ?? []) {
          const v = row.match(/value="([^"]+)"/)?.[1]?.split('|');
          if (!v || v.length < 4 || cards.has(v[0])) continue;
          const title = clean(v[3]);
          const loc = clean(row.match(/<li class="site">([\s\S]*?)<\/li>/)?.[1] ?? '');
          if (NOT_ROLE_RE.test(title) || !ROLE_RE.test(title)) continue;
          cards.set(v[0], { title, company: clean(v[2]), loc });
        }
      } catch (e) {
        errors.push(`고용24 검색 ${region} "${q}": ${(e as Error).message}`);
      }
      await sleep(900);
    }
  const items: JobItem[] = [];
  let scanned = 0;
  for (const [no, c] of cards) {
    if (items.length >= PER_SOURCE_MAX) break;
    const url = `https://www.work24.go.kr/wk/a/b/1500/empDetailAuthView.do?wantedAuthNo=${no}&infoTypeCd=VALIDATION&infoTypeGroup=tb_workinfoworknet`;
    try {
      const body = clean(await get(url));
      scanned++;
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
      const item = toItem('work24', no, url, c.title, '', text, { address: addr || c.loc, company: c.company, title: c.title, site: site || c.company });
      item.contact = cName || cPhone || cFax || method ? { name: cName || undefined, phone: cPhone || undefined, fax: cFax || undefined, method: method || undefined } : null;
      items.push(item);
    } catch (e) {
      errors.push(`고용24 ${no}: ${(e as Error).message}`);
    }
    await sleep(900);
  }
  return { items, scanned, errors };
}

// ---------- 실행 ----------

async function main() {
  const out = path.resolve(process.argv[2] || 'collector/out');
  fs.mkdirSync(out, { recursive: true });
  const only = (process.argv[3] || 'dghma,jobkorea,saramin,work24').split(',') as SourceId[];
  const today = todaySeoul();
  const browser = only.includes('dghma') ? await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined }) : null;
  try {
    for (const source of only) {
      const t0 = Date.now();
      let r: { items: JobItem[]; scanned: number; errors: string[] };
      try {
        r =
          source === 'dghma'
            ? await collectDghma(browser!)
            : source === 'jobkorea'
              ? await collectJobkorea()
              : source === 'saramin'
                ? await collectSaramin()
                : await collectWork24();
      } catch (e) {
        r = { items: [], scanned: 0, errors: [`${source}: ${(e as Error).message}`] };
      }
      const kept = r.items.filter((it) => keep(it, today) === 'keep');
      for (const it of kept) it.geo = await geocode(it.address);
      kept.sort((a, b) => (a.commute.min ?? 99) - (b.commute.min ?? 99));
      const result: SourceResult = {
        source,
        updated_at: new Date().toISOString(),
        scanned: r.scanned,
        kept: kept.length,
        dropped_far: r.items.filter((it) => keep(it, today) === 'far').length,
        errors: r.errors.slice(0, 10),
        items: kept,
      };
      fs.writeFileSync(path.join(out, `jobs_${source}.json`), JSON.stringify(result));
      console.log(`${source}: 본 공고 ${r.scanned}건 → 통근 조건 맞는 공고 ${kept.length}건 (${((Date.now() - t0) / 1000).toFixed(0)}초)${r.errors.length ? `, 오류 ${r.errors.length}건` : ''}`);
    }
  } finally {
    await browser?.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
