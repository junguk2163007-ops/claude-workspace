// "이 공고에 맞춰 다시 쓰기": 공고(단지·직무·근무형태·업무·우대사항)에 맞춰
// 메일 본문·자기소개서 다섯 항목·이력서 자기소개를 다시 쓴다.
// 사실(경력·자격·학력·병역·숫자)은 바꾸지 못하게 검사하고, 어긋난 항목은 원래 글을 그대로 둔다.

import type { LetterSection } from '../../lib/render/compose';
import type { ProfileData, Qualification } from '../../lib/types';

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
