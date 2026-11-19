// 지원 기준: 어떤 공고를 찾고 어디에 지원할지. 공유 저장(shared/criteria)되고 AI 대화로 고친다.
// 공고 목록은 이 기준으로 걸러서 보여 준다.

import { parseSalaryAmount } from '../../lib/parser';
import type { ParsedPosting } from '../../lib/parser';
import { SHIFTS } from '../../lib/types';

export interface Criteria {
  /** 한두 문장 목표 */
  goal: string;
  /** 찾는 직무 키워드 (하나라도 맞으면 통과) */
  roles_include: string[];
  /** 제외할 직무 키워드 (공고 제목에 있으면 숨김) */
  roles_exclude: string[];
  /** 대중교통 편도 목표(분) */
  commute_limit: number;
  /** 넘으면 숨기는 최대(분) */
  commute_max: number;
  /** 보고 싶은 근무형태. 빈 배열 = 전부 */
  shifts: string[];
  /** 최소 월급여(만원). null = 제한 없음 */
  salary_min_man: number | null;
  /** 이메일로 접수하는 공고만 */
  email_only: boolean;
  /** 곧 딸 수 없는 자격(기사급 등)을 필수로 요구하는 공고 숨김 */
  hide_unqualified: boolean;
  /** 이미 지원한 공고 숨김 */
  hide_applied: boolean;
  /** 지원할 때 지킬 지침 */
  notes: string[];
  updated_at: string;
}

export const DEFAULT_CRITERIA: Criteria = {
  goal: '대구 북구 칠곡(태전역) 집에서 대중교통으로 오가기 쉬운 아파트·건물 시설관리직에 지원해, 오래 다닐 수 있는 자리를 구합니다.',
  roles_include: ['시설주임', '시설관리', '기전', '영선', '관리주임', '시설기사', '설비', '전기', '아파트'],
  roles_exclude: ['사무', '청소', '미화', '영업', '설계', '생산', '오퍼레이터', '경비', '요양'],
  commute_limit: 30,
  commute_max: 35,
  shifts: [],
  salary_min_man: null,
  email_only: false,
  hide_unqualified: true,
  hide_applied: true,
  notes: [
    '공고가 "필수 기재"를 요구하면 메일 제목과 이력서 맨 위에 글자 그대로 넣는다.',
    '경력·자격은 사실만 쓴다. 소방안전관리자 보조처럼 곧 딸 수 있는 자격만 "취득 예정"으로 적는다.',
    '등본·통장 사본을 요구하면 합격 후 제출해도 되는지 먼저 문의한다.',
    '같은 단지에 중복 지원하지 않는다.',
  ],
  updated_at: '',
};

export type JobVerdict = 'ok' | 'edge' | 'far' | 'unknown';

export function commuteVerdict(min: number | null, c: Criteria): JobVerdict {
  if (min === null) return 'unknown';
  if (min <= c.commute_limit) return 'ok';
  if (min <= c.commute_max) return 'edge';
  return 'far';
}

export interface FilterResult {
  show: boolean;
  verdict: JobVerdict;
  /** 숨긴 이유 (show=false 일 때) */
  reason: string | null;
}

const has = (text: string, words: string[]) => words.find((w) => w.trim() && text.replace(/\s+/g, '').includes(w.replace(/\s+/g, '')));

export function filterJob(
  job: { list_title: string; title: string; text: string; commute: { min: number | null } },
  p: Pick<ParsedPosting, 'title' | 'shift' | 'salary_text' | 'emails'>,
  c: Criteria,
  extra: { blockers?: string[]; applied?: string | null } = {},
): FilterResult {
  const verdict = commuteVerdict(job.commute.min, c);
  const head = `${job.list_title} ${p.title || job.title}`;
  if ((c.hide_applied ?? true) && extra.applied) return { show: false, verdict, reason: `이미 지원함 (${extra.applied})` };
  if (verdict === 'far') return { show: false, verdict, reason: `통근 ${job.commute.min}분 (기준 ${c.commute_max}분 초과)` };
  if ((c.hide_unqualified ?? true) && extra.blockers?.length) return { show: false, verdict, reason: `필수 자격 없음: ${extra.blockers.join(', ')}` };
  const ex = has(head, c.roles_exclude);
  if (ex) return { show: false, verdict, reason: `제외 직무 "${ex}"` };
  if (c.roles_include.length && !has(`${head} ${job.text.slice(0, 800)}`, c.roles_include)) return { show: false, verdict, reason: '찾는 직무와 다름' };
  if (c.shifts.length && !c.shifts.includes(p.shift)) return { show: false, verdict, reason: `근무형태 ${p.shift}` };
  if (c.salary_min_man !== null) {
    const amt = p.salary_text ? parseSalaryAmount(p.salary_text) : null;
    if (amt !== null && amt < c.salary_min_man * 10000) return { show: false, verdict, reason: `급여 ${Math.round(amt / 10000)}만원 (기준 ${c.salary_min_man}만원 미만)` };
  }
  if (c.email_only && !p.emails.length) return { show: false, verdict, reason: '이메일 접수 아님' };
  return { show: true, verdict, reason: null };
}

const strList = (v: unknown, max = 30): string[] | undefined =>
  Array.isArray(v) ? Array.from(new Set(v.filter((x) => typeof x === 'string').map((x) => (x as string).trim()).filter(Boolean))).slice(0, max) : undefined;

/** AI 가 준 변경분을 검증해 기준에 합친다. 알 수 없는 필드·형식은 버린다. */
export function applyChanges(cur: Criteria, raw: unknown): { next: Criteria; changed: string[] } {
  const ch = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const next: Criteria = { ...cur };
  const changed: string[] = [];
  if (typeof ch.goal === 'string' && ch.goal.trim()) {
    next.goal = ch.goal.trim().slice(0, 400);
    changed.push('목표');
  }
  const inc = strList(ch.roles_include);
  if (inc) {
    next.roles_include = inc;
    changed.push('찾는 직무');
  }
  const exc = strList(ch.roles_exclude);
  if (exc) {
    next.roles_exclude = exc;
    changed.push('제외 직무');
  }
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null);
  const lim = num(ch.commute_limit);
  const mx = num(ch.commute_max);
  if (lim !== null) next.commute_limit = Math.min(60, Math.max(10, lim));
  if (mx !== null) next.commute_max = Math.min(60, Math.max(10, mx));
  if (next.commute_max < next.commute_limit) next.commute_max = next.commute_limit;
  if (lim !== null || mx !== null) changed.push('통근 시간');
  const sh = strList(ch.shifts);
  if (sh) {
    next.shifts = sh.filter((s) => (SHIFTS as readonly string[]).includes(s));
    changed.push('근무형태');
  }
  if ('salary_min_man' in ch) {
    const s = ch.salary_min_man === null ? null : num(ch.salary_min_man);
    next.salary_min_man = s !== null && s > 0 ? Math.min(2000, s) : null;
    changed.push('최소 급여');
  }
  if (typeof ch.hide_unqualified === 'boolean') {
    next.hide_unqualified = ch.hide_unqualified;
    changed.push('자격 필터');
  }
  if (typeof ch.hide_applied === 'boolean') {
    next.hide_applied = ch.hide_applied;
    changed.push('지원한 공고 숨김');
  }
  if (typeof ch.email_only === 'boolean') {
    next.email_only = ch.email_only;
    changed.push('접수 방식');
  }
  const notes = strList(ch.notes, 15);
  if (notes) {
    next.notes = notes.map((n) => n.slice(0, 200));
    changed.push('지원 지침');
  }
  if (changed.length) next.updated_at = new Date().toISOString();
  return { next, changed };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  at: string;
}

/** AI 에게 보낼 요청문 (한 번에 하나, 기억 없음) */
export function criteriaPrompt(cur: Criteria, history: ChatMessage[], ask: string, stats: string): string {
  const { updated_at: _u, ...shown } = cur;
  const recent = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? '사용자' : '도우미'}: ${m.text}`)
    .join('\n');
  return `너는 정민욱 님의 구직 도우미다. 정민욱 님은 아파트·건물 시설관리직(시설주임·기전·영선 등)을 찾고 있다. 집은 대구 북구 칠곡(3호선 태전역 근처)이다.
아래 "현재 지원 기준"을 사용자의 요청에 맞게 고친다.

규칙
- 사용자가 바꿔 달라고 한 부분만 바꾼다. 정민욱 님의 경력·자격·학력 같은 사실은 지어내지 않는다.
- 통근 시간은 분 단위 정수다. commute_limit(목표) ≤ commute_max(최대) ≤ 60.
- shifts 는 다음 중에서만 고른다: ${SHIFTS.join(', ')}. 빈 배열은 "전부".
- salary_min_man 은 월급여 만원 단위 정수, 제한이 없으면 null.
- 질문이나 상담만 하고 기준을 바꿀 필요가 없으면 changes 는 null 이다.
- reply 는 한국어 2~4문장으로, 무엇을 바꿨는지(또는 답)를 쉬운 말로 쓴다.

반드시 JSON 하나만 출력한다:
{"reply": "...", "changes": {바뀐 필드만} 또는 null}
바꿀 수 있는 필드: goal, roles_include, roles_exclude, commute_limit, commute_max, shifts, salary_min_man, email_only, hide_unqualified(기사급 필수 자격 공고 숨김), hide_applied(지원한 공고 숨김), notes

현재 지원 기준:
${JSON.stringify(shown, null, 1)}

현재 공고 현황: ${stats}

최근 대화:
${recent || '(없음)'}

사용자 요청: ${ask}`;
}

/** 추천 점수: 통근·서류 통과 가능성·접수 방법·급여·마감·새 공고를 함께 본다 (높을수록 먼저) */
export function recommend(x: {
  min: number | null;
  verdict: JobVerdict;
  signal: 'green' | 'yellow' | 'red';
  email: boolean;
  salaryWon: number | null;
  daysLeft: number | null;
  isNew: boolean;
}, c: Criteria): { score: number; why: string[] } {
  let score = 0;
  const why: string[] = [];
  if (x.min !== null) {
    if (x.min <= Math.min(20, c.commute_limit)) {
      score += 30;
      why.push(`가까움 ${x.min}분`);
    } else if (x.verdict === 'ok') {
      score += 22;
      why.push(`통근 ${x.min}분`);
    } else if (x.verdict === 'edge') score += 8;
  } else score += 5;
  if (x.signal === 'green') {
    score += 25;
    why.push('자격 충족');
  } else if (x.signal === 'yellow') {
    score += 13;
    why.push('곧 딸 자격으로 지원 가능');
  }
  if (x.email) {
    score += 15;
    why.push('메일로 바로 지원');
  } else score += 3;
  if (x.salaryWon !== null) {
    const man = Math.round(x.salaryWon / 10000);
    if (man >= 300) {
      score += 10;
      why.push(`월 ${man}만원`);
    } else if (man >= 270) score += 6;
    else score += 2;
  } else score += 3;
  if (x.daysLeft !== null && x.daysLeft >= 0 && x.daysLeft <= 3) {
    score += 5;
    why.push(x.daysLeft === 0 ? '오늘 마감' : `마감 ${x.daysLeft}일 남음`);
  }
  if (x.isNew) {
    score += 5;
    why.push('새 공고');
  }
  return { score, why };
}
