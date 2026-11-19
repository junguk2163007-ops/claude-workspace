// "이 공고에 맞춰 다시 쓰기": 공고(단지·직무·근무형태·업무·우대사항)에 맞춰
// 메일 본문·자기소개서 다섯 항목·이력서 자기소개를 다시 쓴다.
// 사실(경력·자격·학력·병역·숫자)은 바꾸지 못하게 검사하고, 어긋난 항목은 원래 글을 그대로 둔다.

import { analyze } from '../../lib/analyze';
import { mailBody, signature } from '../../lib/mail';
import { parsePosting, type ParsedPosting } from '../../lib/parser';
import { composeLetter, composeResume, type LetterData, type LetterSection, type ResumeData } from '../../lib/render/compose';
import type { Blocks, ProfileData, Qualification, Settings } from '../../lib/types';
import { todaySeoul } from '../../lib/util/date';

export type SectionKey = LetterSection['key'];
export const SECTION_KEYS: SectionKey[] = ['growth', 'strength', 'experience', 'motive', 'goal'];

export interface TailorInput {
  profile: ProfileData;
  quals: Qualification[];
  posting: string;
  site: string;
  title: string;
  shift: string;
  requiredPhrase: string | null;
  near: boolean;
  /** 지금 서류의 글 */
  mailBody: string;
  sections: LetterSection[];
  intro: string[];
}

export interface TailorResult {
  mail_body: string;
  sections: Record<SectionKey, string>;
  intro: string[];
  summary: string;
  /** 검사에서 걸려 원래 글을 둔 항목과 이유 */
  kept: { what: string; why: string }[];
}

function facts(p: ProfileData, quals: Qualification[]) {
  const have = quals.filter((q) => q.have).map((q) => q.name);
  const promise = quals.filter((q) => !q.have && q.promisable && q.promise_phrase.trim()).map((q) => `${q.name} (쓸 수 있는 표현: "${q.promise_phrase.trim()}")`);
  const no = quals.filter((q) => !q.have && !q.promisable).map((q) => q.name);
  return [
    `이름: ${p.name}`,
    `학력: ${p.education.map((e) => `${e.school} ${e.status} (${e.start}~${e.end})`).join(', ') || '없음'}`,
    `병역: ${[p.military.branch, p.military.corps, p.military.rank, p.military.discharge].filter(Boolean).join(' ')} (${p.military.start}~${p.military.end})`,
    `면허·자격(보유): ${p.licenses.map((l) => `${l.name} (${l.issuer}, ${l.date})`).join(', ') || '없음'}`,
    `경력: ${p.careers.map((c) => `${c.start}~${c.end} ${c.company} — ${c.duties}`).join(' / ')}`,
    `보유로 인정되는 요건: ${have.join(', ') || '없음'}`,
    `아직 없지만 "준비 중·취득 예정"으로만 쓸 수 있는 자격: ${promise.join(', ') || '없음'}`,
    `없고 쓰면 안 되는 자격·경력: ${no.join(', ') || '없음'}`,
  ].join('\n');
}

export function tailorPrompt(t: TailorInput): string {
  const cur = t.sections.map((s) => `[${s.key}] ${s.title}\n${s.text}`).join('\n\n');
  return `너는 구직자 정민욱 님의 지원서를 공고에 맞게 다듬는 도우미다. 아래 "지금 글"을 이 공고에 어울리게 다시 쓴다.

지킬 것 (어기면 그 항목은 버려진다)
- 사실은 "사실" 목록에 있는 것만 쓴다. 경력 연수·회사·기간·학력·병역·자격 이름·날짜를 새로 만들거나 바꾸지 않는다. 목록에 없는 숫자를 쓰지 않는다.
- 갖고 있지 않은 자격·경력을 가진 것처럼 쓰지 않는다. 아파트 시설관리 실무 경력은 없다. "준비 중·취득 예정"은 허용된 자격에만, 주어진 표현으로 쓴다.
- 공고의 단지·회사 이름, 직무, 근무형태(${t.shift || '공고 참고'}), 업무 내용, 우대사항에 맞춰 왜 이 자리에 맞는 사람인지 자연스럽게 연결한다. 공고에 없는 내용(복지·규모 등)을 지어내지 않는다.
- ${t.near ? '집에서 가까운 곳이라 오래 다닐 수 있다는 점을 써도 된다.' : '집에서 가깝다는 말은 쓰지 않는다.'}
- 성장과정은 크게 바꾸지 말고 이 직무와 이어지는 한 문장 정도만 손본다.
- 각 항목 길이는 지금 글과 비슷하게(±30%). 자기소개서 전체가 A4 한 장을 넘지 않게.
- 존댓말, 담백하고 자연스러운 한국어. 과장·상투적 미사여구("최고의", "열정 넘치는" 등) 금지.
- 메일 본문: 인사 → 어느 곳 어느 직무에 지원하는지 → 이 공고에 맞춘 2~3문장 → 첨부(이력서·자기소개서) 안내 → 맺음말. 서명·연락처는 쓰지 않는다(따로 붙는다).${t.requiredPhrase ? `\n- 메일 본문 첫 줄 가까이에 공고의 필수 기재 문구 "${t.requiredPhrase}"를 글자 그대로 넣는다.` : ''}
- 이력서 자기소개(intro)는 2~3문단, 각 2~3문장.

반드시 JSON 하나만 출력한다:
{"mail_body": "...", "sections": {"growth": "...", "strength": "...", "experience": "...", "motive": "...", "goal": "..."}, "intro": ["...", "..."], "summary": "이 공고에 맞춰 바꾼 점 한두 문장"}

사실
${facts(t.profile, t.quals)}

공고 (${t.site} / ${t.title})
${t.posting.slice(0, 3000)}

지금 글 — 메일 본문 (서명 앞까지)
${t.mailBody}

지금 글 — 자기소개서
${cur}

지금 글 — 이력서 자기소개
${t.intro.join('\n')}`;
}

const digitsIn = (s: string) => new Set((s.match(/\d+/g) ?? []).map((d) => String(Number(d))));

/** AI 결과를 검사해 통과한 항목만 바꾼다 */
export function checkTailored(raw: unknown, t: TailorInput): TailorResult {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const kept: TailorResult['kept'] = [];
  const allowedNums = digitsIn([facts(t.profile, t.quals), t.posting, t.mailBody, t.sections.map((s) => s.text).join(' '), t.intro.join(' ')].join(' '));
  const forbidden = t.quals
    .filter((q) => !q.have && !q.promisable)
    .flatMap((q) => [q.name, ...q.aliases])
    .map((x) => x.trim())
    .filter((x) => x.length >= 3);
  const compact = (s: string) => s.replace(/\s+/g, '');

  function vet(what: string, next: unknown, prev: string): string {
    if (typeof next !== 'string' || !next.trim()) {
      kept.push({ what, why: '새 글이 비어 있음' });
      return prev;
    }
    const n = next.trim();
    const len = n.length;
    const base = Math.max(prev.length, 40);
    if (len < base * 0.5 || len > base * 1.8) {
      kept.push({ what, why: '길이가 너무 달라짐' });
      return prev;
    }
    const badNum = [...digitsIn(n)].find((d) => !allowedNums.has(d));
    if (badNum) {
      kept.push({ what, why: `사실에 없는 숫자 "${badNum}"` });
      return prev;
    }
    const badQual = forbidden.find((f) => compact(n).includes(compact(f)) && !compact(prev).includes(compact(f)));
    if (badQual) {
      kept.push({ what, why: `갖고 있지 않은 자격 "${badQual}" 언급` });
      return prev;
    }
    if (/아파트\s*(시설\s*)?(관리|근무)\s*(경력|경험)[을를이가]?\s*(쌓|갖|보유|있)/.test(n)) {
      kept.push({ what, why: '없는 아파트 경력을 쓴 것으로 보임' });
      return prev;
    }
    return n;
  }

  const sectionsIn = (r.sections && typeof r.sections === 'object' ? r.sections : {}) as Record<string, unknown>;
  const titles: Record<SectionKey, string> = { growth: '성장과정', strength: '성격의 장점 및 보완점', experience: '직무 관련 경험', motive: '지원동기', goal: '입사 후 포부' };
  const sections = {} as Record<SectionKey, string>;
  for (const k of SECTION_KEYS) {
    const prev = t.sections.find((s) => s.key === k)?.text ?? '';
    sections[k] = vet(`자기소개서 · ${titles[k]}`, sectionsIn[k], prev);
  }
  let mail = vet('메일 본문', r.mail_body, t.mailBody);
  if (t.requiredPhrase && !mail.includes(t.requiredPhrase)) {
    kept.push({ what: '메일 본문', why: '필수 기재 문구가 빠짐' });
    mail = t.mailBody;
  }
  const introIn = Array.isArray(r.intro) ? r.intro : [];
  let intro = t.intro;
  if (introIn.length >= 1 && introIn.length <= 4) {
    const joined = vet('이력서 자기소개', introIn.filter((x) => typeof x === 'string').join('\n'), t.intro.join('\n'));
    intro = joined === t.intro.join('\n') ? t.intro : joined.split('\n').map((x) => x.trim()).filter(Boolean);
  } else kept.push({ what: '이력서 자기소개', why: '형식이 맞지 않음' });
  return { mail_body: mail, sections, intro, summary: typeof r.summary === 'string' ? r.summary.slice(0, 300) : '', kept };
}

/** 공고 글 지문 (공고가 바뀌면 맞춤 글을 다시 쓴다) */
export function textHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** 미리 써 둔 공고 맞춤 글 (shared/tailor/list/<공고 id>) */
export interface TailorDoc {
  job_id: string;
  text_hash: string;
  at: string;
  mail_body: string;
  sections: Record<SectionKey, string>;
  intro: string[];
  summary: string;
  kept: { what: string; why: string }[];
}

/** 필수로 요구하는데 곧 딸 수도 없는 자격(기사급 등). 같은 줄에 대안(기능사 등)이 있으면 막지 않는다 */
export function hardBlockers(rows: ReturnType<typeof analyze>['rows'], quals: Qualification[]): string[] {
  const byLine = new Map<string, { block: boolean; name: string }[]>();
  for (const r of rows) {
    if (r.qualification_id == null || (r.category !== '필수(명시)' && r.category !== '필수로 보임')) continue;
    const q = quals.find((x) => x.id === r.qualification_id);
    if (!q) continue;
    const block = !q.have && !q.promisable && r.verdict === '미충족-장벽' && !/경력/.test(q.name);
    byLine.set(r.line, [...(byLine.get(r.line) ?? []), { block, name: q.name }]);
  }
  const out = new Set<string>();
  for (const hits of byLine.values()) if (hits.every((h) => h.block)) hits.forEach((h) => out.add(h.name));
  return [...out];
}

export interface BaseInput {
  profile: ProfileData;
  blocks: Blocks;
  quals: Qualification[];
  prefs: Settings;
  item: { text: string; site: string; title: string; address: string; company: string };
  near: boolean;
  today?: string;
}

/** 공고 하나로 기본 서류(메일·자기소개서·이력서 자기소개)를 만든다 — 페이지의 [지원]과 같은 방식 */
export function baseDocs(b: BaseInput): { parsed: ParsedPosting; letter: LetterData; resume: ResumeData; mailNoSig: string; sig: string; blockers: string[]; gapPhrases: string[] } {
  const today = b.today ?? todaySeoul();
  const p0 = parsePosting(b.item.text, today);
  const parsed: ParsedPosting = { ...p0, site: p0.site || b.item.site, title: p0.title || b.item.title, address: p0.address || b.item.address, company: p0.company || b.item.company };
  const analysis = analyze(b.item.text, parsed, {
    qualifications: b.quals,
    settings: { ...b.prefs, near_keywords: b.near && parsed.address.trim() ? [parsed.address.trim()] : [] },
    today,
  });
  const profile = { ...b.profile, photo_file: null };
  const input = { profile, blocks: b.blocks, parsed, analysis, today };
  const sig = signature(b.prefs, b.profile);
  const mail = mailBody({ template: b.blocks.mail_body, parsed, profile: b.profile, settings: b.prefs, extraDocs: [] });
  const mailNoSig = sig && mail.trimEnd().endsWith(sig) ? mail.trimEnd().slice(0, -sig.length).trimEnd() : mail.trimEnd();
  return { parsed, letter: composeLetter(input), resume: composeResume(input), mailNoSig, sig, blockers: hardBlockers(analysis.rows, b.quals), gapPhrases: analysis.gap_qualifications.map((g) => g.promise_phrase) };
}

/** 미리 써 둔 맞춤 글을 서류에 입힌다 */
export function applyTailorDoc(t: TailorDoc, letter: LetterData, resume: ResumeData, sig: string): { letter: LetterData; resume: ResumeData; mail: string } {
  return {
    letter: { ...letter, sections: letter.sections.map((s) => ({ ...s, text: t.sections[s.key] ?? s.text })) },
    resume: { ...resume, intro: t.intro.length ? t.intro : resume.intro },
    mail: sig ? `${t.mail_body.trimEnd()}\n\n${sig}` : t.mail_body,
  };
}

// ---------- 규칙으로 바로 쓰는 맞춤 글 (AI·네트워크 없이, 어느 화면에서든) ----------

/** 받침 여부로 조사 고르기: 은/는, 을/를, 이/가, (으)로 */
function josa(word: string, withBatchim: string, without: string): string {
  const ch = [...word.replace(/[\s)\]」』'"·.,]+$/, '')].reverse().find((c) => /[가-힣A-Za-z0-9]/.test(c));
  if (!ch) return word + without;
  if (/[가-힣]/.test(ch)) {
    const code = ch.charCodeAt(0) - 0xac00;
    const jong = code % 28;
    if (withBatchim === '으로') return word + (jong === 0 || jong === 8 ? '로' : '으로'); // ㄹ 받침은 '로'
    return word + (jong ? withBatchim : without);
  }
  return word + (/[013678LMNR]$/i.test(ch) ? withBatchim : without);
}
const eun = (w: string) => josa(w, '은', '는');
const eul = (w: string) => josa(w, '을', '를');
const euro = (w: string) => josa(w, '으로', '로');

/** 공고 글에서 업무 내용 한두 개 (짧고 숫자 없는 것만) */
export function dutiesFrom(text: string): string[] {
  const lines = text.split('\n').map((l) => l.trim());
  const out: string[] = [];
  let inDuty = false;
  for (const l of lines) {
    if (/(업무\s*내용|주요\s*업무|직무\s*내용|담당\s*업무)/.test(l)) {
      inDuty = true;
      const after = l.split(/[:：]/)[1]?.trim();
      if (after && after.length >= 4) out.push(after);
      continue;
    }
    if (inDuty) {
      if (!l) continue;
      if (/^[\[【■◆▶※]|자격|우대|급여|근무|제출|접수|마감|채용|복리/.test(l) && out.length) break;
      const t = l.replace(/^[-•·*▪○◦\d.)\s]+/, '').trim();
      if (t.length >= 4) out.push(t);
      if (out.length >= 2) break;
    }
  }
  return out
    .map((d) => d.replace(/[.。]$/, '').replace(/\s+/g, ' '))
    .filter((d) => d.length <= 40 && !/\d/.test(d) && /[가-힣]/.test(d))
    .slice(0, 2);
}

function dutyPhraseFor(title: string, duties: string[]): string {
  if (duties.length) return duties.join(', ');
  if (/기전/.test(title)) return '전기·기계 설비 점검과 관리';
  if (/영선/.test(title)) return '영선·보수 업무';
  if (/설비/.test(title)) return '설비 점검과 관리';
  if (/전기/.test(title)) return '전기설비 점검과 안전관리';
  return '시설 점검과 관리';
}

/** 주소에서 동네 이름 (OO동, 없으면 구·군) */
function placeOf(address: string): string {
  const dong = address.match(/\(([가-힣0-9]+동)[,)\s]/)?.[1] ?? address.match(/([가-힣]+동)(?:\s|$|\d)/)?.[1];
  if (dong) return dong;
  return address.match(/([가-힣]+[구군])\s/)?.[1] ?? '';
}

/** 글에 쓸 직책 이름: 테스트 표시·괄호 설명·앞에 붙은 단지명을 뺀다 (괄호뿐이면 괄호 안 글) */
export function proseTitle(raw: string, site: string): string {
  let t = raw.replace(/\[[^\]]*\]|\s*테스트\d*/g, ' ');
  const head = site.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  if (head && t.trim().startsWith(head)) t = t.trim().slice(head.length);
  const noParen = t.replace(/\([^)]*\)|（[^）]*）/g, ' ').replace(/\s+/g, ' ').trim();
  if (noParen.length >= 2) return noParen.replace(/^[-–·,\s]+|[-–·,\s]+$/g, '');
  const inside = t.match(/[(（]([^)）]+)[)）]/)?.[1]?.trim();
  return inside || raw.trim() || '시설관리';
}

export interface RuleInput extends TailorInput {
  address: string;
  startDate: string | null;
  /** 이 공고에 맞춰 쓸 수 있는 "취득 준비" 문구들 (분석 결과) */
  gapPhrases: string[];
}

const EXP_HEAD_RE = /^(.*?또한 부동산 분양 업무를 \d+년간 담당하며 다양한 사람을 상대로 신뢰를 쌓고 정확하게 소통하는 능력을 키웠)/;

/** 변형 번호로 문장 표현을 고른다 (같은 번호면 같은 글) */
function picker(seed: number) {
  let x = (seed * 2654435761) >>> 0 || 1;
  return <T,>(arr: T[]): T => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return arr[x % arr.length];
  };
}

export function ruleTailor(r: RuleInput & { variant?: number }): TailorResult {
  const pick = picker((r.variant ?? 0) + 1);
  const site = r.site.replace(/\s*[(（][^)）]*[)）]/g, '').replace(/\s+/g, ' ').trim() || r.site.trim() || '귀사';
  const title = proseTitle(r.title, r.site);
  const duties = dutiesFrom(r.posting);
  const duty = dutyPhraseFor(title, duties);
  const place = placeOf(r.address);
  const gyeogil = r.shift === '격일';
  const gyodae = /교대/.test(r.shift);
  const urgent = /긴급|급구|급히/.test(`${r.title} ${r.posting.slice(0, 300)}`);
  const apt = /아파트|단지|세대|입주/.test(`${site} ${r.posting.slice(0, 600)}`);
  const people = apt ? '입주민 민원에도' : '건물 이용자와도';
  const gap = r.gapPhrases.filter(Boolean);
  const sameGu = place === '북구';

  const shiftLine = gyeogil
    ? pick(['격일 근무에 무리 없이 적응할 수 있는 체력과 생활 리듬을 갖추고 있으며, ', '육군 수색대 복무로 다진 체력 덕분에 격일 근무도 자신 있으며, ', '격일처럼 불규칙한 근무에도 흔들리지 않는 생활 습관을 갖추고 있고, '])
    : gyodae
      ? pick(['교대 근무에도 잘 적응할 수 있는 체력과 생활 리듬을 갖추고 있으며, ', '육군 수색대 복무로 다진 체력 덕분에 교대 근무도 자신 있으며, '])
      : '';
  const nearLine = !r.near || !place ? '' : sameGu
    ? pick(['근무지가 제가 사는 북구 안에 있어 오래 다닐 수 있습니다. ', '근무지가 집과 같은 북구라 출퇴근 걱정 없이 오래 다닐 수 있습니다. '])
    : pick([`근무지인 ${eun(place)} 제가 사는 북구 칠곡 지역과 가까워 오래 다닐 수 있습니다. `, `${eun(place)} 집에서 가까워 출퇴근 부담 없이 오래 다닐 수 있습니다. `]);
  const skill = pick([
    `건설현장에서 자재 검수와 품질·안전 점검을 맡으며 익힌 꼼꼼함으로 ${eul(duty)} 성실히 해내겠습니다.`,
    `건설현장 현장관리를 하며 몸에 밴 점검 습관을 살려 ${eul(duty)} 빈틈없이 챙기겠습니다.`,
    `자재 검수와 품질·안전 점검을 해 온 경험을 바탕으로 ${eul(duty)} 꼼꼼하게 맡겠습니다.`,
  ]);
  const gapMail = gap.length ? ' ' + pick([`${gap[0]}하겠습니다.`, `우대 사항에 맞춰 ${gap[0]}하겠습니다.`]) : '';
  const closing = pick(['현재 재직 중인 곳이 없어 바로 근무를 시작할 수 있습니다.', '지금 재직 중인 곳이 없어 채용되면 곧바로 출근할 수 있습니다.', '채용이 확정되면 바로 근무를 시작할 수 있습니다.']);
  const mail = [
    '안녕하세요.',
    ...(r.requiredPhrase ? [r.requiredPhrase] : []),
    '',
    pick([`${site} ${title} 채용 공고를 보고 지원하고자 메일 드립니다.`, `${site}에서 ${eul(title)} 모집하신다는 공고를 보고 지원합니다.`, `${site} ${title} 자리에 지원하고자 연락드립니다.`]),
    `${nearLine}${shiftLine}${skill}${gapMail} ${closing}`,
    '',
    pick(['이력서와 자기소개서를 첨부하였습니다. 검토 부탁드립니다.', '첨부한 이력서와 자기소개서를 살펴봐 주시면 감사하겠습니다.']),
    '',
    '감사합니다.',
  ].join('\n');

  const cur = Object.fromEntries(r.sections.map((sec) => [sec.key, sec.text])) as Record<SectionKey, string>;
  const expHead = cur.experience.match(EXP_HEAD_RE)?.[1];
  const experience = expHead
    ? `${expHead}습니다. ` +
      pick([
        `이러한 경험을 바탕으로 ${euro(title)}서 ${eul(duty)} 꼼꼼히 해내고, ${people} 차분하고 정확하게 응대하겠습니다.`,
        `${title} 업무에서도 이 습관을 살려 ${eul(duty)} 빠짐없이 챙기고, ${people} 친절하고 정확하게 응대하겠습니다.`,
        `이 경험은 ${duty}처럼 꼼꼼함이 필요한 ${title} 업무와 ${apt ? '입주민' : '고객'} 응대에도 그대로 이어질 것이라 생각합니다.`,
      ])
    : cur.experience;
  const motive = [
    !r.near || !place
      ? ''
      : sameGu
        ? `${eun(site)} 제가 사는 북구 안에 있어, ${gyeogil ? '격일 근무에도 ' : ''}무리 없이 오래 다닐 수 있는 곳입니다.`
        : pick([`${site}의 근무지인 ${eun(place)} 제가 사는 북구 칠곡 지역과 가까워, ${gyeogil ? '격일 근무에도 ' : ''}무리 없이 오래 다닐 수 있는 곳입니다.`, `${eun(site)} 집에서 가까운 ${place}에 있어 출퇴근 걱정 없이 오래 일할 수 있는 곳입니다.`]),
    urgent ? pick(['급히 사람을 구하고 계신 만큼, 바로 투입되어 공백 없이 업무를 이어갈 수 있다는 점도 지원하게 된 이유입니다.', '급하게 사람이 필요하신 상황이라 들었고, 바로 출근해 공백을 메울 수 있다는 점에서 지원하게 되었습니다.']) : '',
    pick([
      `${eun(title)} ${duty}처럼 꾸준함과 책임감을 갖춘 사람이 오래 자리를 지키며 신뢰를 쌓아가는 일이라고 생각하며, 장기적으로 한 자리에서 성장하고 싶은 저의 방향과도 잘 맞아 지원하게 되었습니다.`,
      `${eun(duty)} 눈에 띄지 않아도 매일 꾸준히 챙겨야 하는 일이라고 생각합니다. 맡은 일을 끝까지 해내는 제 성격을 이 자리에서 살리고, 한곳에서 오래 일하고 싶어 지원하게 되었습니다.`,
      `${site}의 ${title} 공고를 보고, 성실하게 오래 일할 사람이 필요한 자리라는 점에서 끝까지 책임지고 해내는 제가 잘 맞을 것이라 생각해 지원하게 되었습니다.`,
    ]),
    pick(['현재 별도의 재직 중인 곳이 없어 **즉시 출근이 가능**하며, 채용이 확정되는 대로 바로 근무를 시작할 수 있습니다.', '현재 재직 중인 곳이 없어 **즉시 출근이 가능**하며, 채용이 정해지면 바로 일을 시작하겠습니다.']),
  ]
    .filter(Boolean)
    .join(' ');
  const gapGoal = gap.length
    ? `${gap.map((g, i) => (i < gap.length - 1 ? `${g}하고, ` : `${g}하여 `)).join('')}업무 전문성을 넓혀가고,`
    : pick(['업무에 필요한 관련 자격을 하나씩 취득해 업무 범위를 넓혀가고,', '필요한 자격도 하나씩 갖춰 맡을 수 있는 일을 넓혀가고,']);
  const goal = `${pick([
    `입사 후에는 ${gyeogil ? '격일 근무에 빠르게 적응하며 ' : ''}${site}의 설비 특성과 업무 순서를 성실히 익히겠습니다.`,
    `입사 후에는 선임분들께 ${site}의 설비와 업무 방식을 꼼꼼히 배우며 빠르게 자리를 잡겠습니다.`,
    `입사 후에는 ${duty}의 기본부터 차근차근 익혀 믿고 맡길 수 있는 사람이 되겠습니다.`,
  ])} ${gapGoal} ${pick([
    '단기간 근무가 아닌 장기적으로 함께할 수 있는 사람이 되는 것이 목표이며, **즉시 출근이 가능한 만큼** 빠르게 업무에 적응해 조속히 제 몫을 해내겠습니다.',
    '오래 함께할 수 있는 사람이 되는 것이 목표이며, **즉시 출근이 가능한 만큼** 하루라도 빨리 제 몫을 해내겠습니다.',
  ])}`;
  const intro = [
    ...r.intro.slice(0, 2),
    pick([
      `${site} ${euro(title)}서 즉시 출근이 가능하며, 단기간이 아닌 장기 근속을 목표로 ${eul(duty)} 성실하게 해내겠습니다.`,
      `즉시 출근이 가능하며, ${site}에서 오래 일하며 ${eul(duty)} 책임 있게 맡겠습니다.`,
      `${site}의 ${euro(title)}서 바로 근무할 수 있으며, 장기 근속을 목표로 성실하게 일하겠습니다.`,
    ]),
  ];

  const answer = {
    mail_body: mail,
    sections: { growth: cur.growth, strength: cur.strength, experience, motive, goal },
    intro,
    summary: `${site} ${title}의 ${[gyeogil ? '격일 근무' : gyodae ? '교대 근무' : '', duties.length ? '업무 내용' : '', r.near ? '가까운 근무지' : '', urgent ? '긴급 채용' : '', gap.length ? '우대 자격' : ''].filter(Boolean).join('·') || '직무'}에 맞춰 썼습니다.`,
  };
  return checkTailored(answer, r);
}
