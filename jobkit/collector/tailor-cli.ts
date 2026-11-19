// 공고 맞춤 글 도구 (클라우드 작업용). 페이지의 [지원]과 같은 기본 서류를 만들고, 다시 쓴 글을 검사한다.
// 사용법 (DATA = ArtifactData 로 받은 shared 폴더, 맞춤 글은 DATA/tailor/list/<id>.json):
//   node collector/bin/tailor.cjs list   DATA                      → 맞춤 글이 필요한 공고 목록(JSON)
//   node collector/bin/tailor.cjs prompt DATA <공고id>             → 다시 쓰기 요청문(이대로 써서 JSON 답을 만든다)
//   node collector/bin/tailor.cjs check  DATA <공고id> <답.json> <결과.json>  → 검사해 저장할 문서를 만든다

import fs from 'node:fs';
import path from 'node:path';
import { commuteVerdict, DEFAULT_CRITERIA, filterJob, type Criteria } from '../artifact/src/criteria';
import { finalMinutes } from '../artifact/src/commute';
import { baseDocs, checkTailored, tailorPrompt, textHash, type TailorDoc, type TailorInput } from '../artifact/src/tailor';
import type { JobItem } from './extract';

const SOURCES = ['dghma', 'jobkorea', 'saramin', 'work24', 'manual'];

function readJson<T>(file: string, fallback: T): T {
  try {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (d && typeof d === 'object') delete d.version;
    return d as T;
  } catch {
    return fallback;
  }
}

function load(dir: string) {
  const profile = readJson<any>(path.join(dir, 'profile.json'), null);
  const blocks = readJson<any>(path.join(dir, 'blocks.json'), null);
  const quals = readJson<any>(path.join(dir, 'quals.json'), { list: [] }).list ?? [];
  const prefs = readJson<any>(path.join(dir, 'prefs.json'), {});
  const criteria: Criteria = { ...DEFAULT_CRITERIA, ...readJson<any>(path.join(dir, 'criteria.json'), {}) };
  const jobEmails: Record<string, string> = readJson<any>(path.join(dir, 'job_emails.json'), {}).map ?? {};
  if (!profile || !blocks) throw new Error('profile.json / blocks.json 이 없습니다');
  const items: JobItem[] = [];
  for (const s of SOURCES) for (const it of readJson<any>(path.join(dir, `jobs_${s}.json`), { items: [] }).items ?? []) items.push(it);
  const tdir = path.join(dir, 'tailor', 'list');
  const tailors = new Map<string, TailorDoc>();
  if (fs.existsSync(tdir)) for (const f of fs.readdirSync(tdir)) if (f.endsWith('.json')) tailors.set(f.slice(0, -5), readJson<TailorDoc>(path.join(tdir, f), null as any));
  return { profile, blocks, quals, prefs, criteria, jobEmails, items, tailors };
}

type Data = ReturnType<typeof load>;

/** 직접 넣은 접수 이메일까지 붙인 공고 글 (페이지와 같게) */
const textOf = (it: JobItem, d: Data) => {
  const e = d.jobEmails[it.id] ?? '';
  return e && !it.text.includes(e) ? `${it.text}\n이메일 : ${e}` : it.text;
};

function judge(it: JobItem, d: Data) {
  const fm = finalMinutes(it.commute.min, d.prefs.home_geo, it.geo);
  const verdict = commuteVerdict(fm.min, d.criteria);
  const text = textOf(it, d);
  const base = baseDocs({ profile: d.profile, blocks: d.blocks, quals: d.quals, prefs: d.prefs, item: { ...it, text }, near: verdict === 'ok' });
  const title = base.parsed.title || it.title;
  const multi = /(주임|기사|책임|과장|반장|직원|계장|소장|대리)\s*[\/,]\s*\S*?(주임|기사|책임|과장|반장|직원|계장|소장|대리)/.test(title) && !/전기기사|산업기사|전기안전관리자|선임/.test(title);
  const f = filterJob(
    { ...it, commute: { min: fm.min } },
    { title, shift: base.parsed.shift, salary_text: base.parsed.salary_text, emails: base.parsed.emails },
    d.criteria,
    { blockers: multi ? [] : base.blockers },
  );
  return { show: f.show, verdict, text, base };
}

function main() {
  const [cmd, dir, id, answer, out] = process.argv.slice(2);
  if (!cmd || !dir) throw new Error('사용법: tailor.cjs list|prompt|check DATA [id] [answer] [out]');
  const d = load(dir);
  if (cmd === 'list') {
    const need = [];
    for (const it of d.items) {
      const j = judge(it, d);
      if (!j.show) continue;
      const t = d.tailors.get(it.id);
      if (t && t.text_hash === textHash(j.text)) continue;
      need.push({ id: it.id, site: it.site || it.company, title: it.title });
    }
    process.stdout.write(JSON.stringify(need, null, 1) + '\n');
    return;
  }
  const it = d.items.find((x) => x.id === id);
  if (!it) throw new Error(`공고 ${id} 가 없습니다`);
  const j = judge(it, d);
  const input: TailorInput = {
    profile: d.profile,
    quals: d.quals,
    posting: j.text,
    site: j.base.parsed.site,
    title: j.base.parsed.title,
    shift: j.base.parsed.shift,
    requiredPhrase: j.base.parsed.required_phrase,
    near: j.verdict === 'ok',
    mailBody: j.base.mailNoSig,
    sections: j.base.letter.sections,
    intro: j.base.resume.intro,
  };
  if (cmd === 'prompt') {
    process.stdout.write(tailorPrompt(input) + '\n');
    return;
  }
  if (cmd === 'check') {
    if (!answer || !out) throw new Error('check 에는 답 파일과 결과 파일이 필요합니다');
    const res = checkTailored(JSON.parse(fs.readFileSync(answer, 'utf8')), input);
    const doc: TailorDoc = { job_id: it.id, text_hash: textHash(j.text), at: new Date().toISOString(), ...res };
    fs.writeFileSync(out, JSON.stringify(doc));
    const changed = Object.entries(res.sections).filter(([k, v]) => v !== input.sections.find((s) => s.key === k)?.text).length;
    console.log(`${it.id}: 자기소개서 ${changed}/5 항목·메일 ${res.mail_body !== input.mailBody ? '바뀜' : '그대로'}${res.kept.length ? ` · 원래 글 유지: ${res.kept.map((k) => `${k.what}(${k.why})`).join(', ')}` : ''}`);
    return;
  }
  throw new Error(`모르는 명령: ${cmd}`);
}

try {
  main();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
