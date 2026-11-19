import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { zipSync } from 'fflate';
import { parsePosting, parseSalaryAmount, type ParsedPosting, type Category } from '../../lib/parser';
import { analyze, type Analysis, type HistoryEntry, type ReqRow, type Verdict } from '../../lib/analyze';
import { checkProfile, composeLetter, composeResume, type LetterData, type ResumeData } from '../../lib/render/compose';
import { gmailComposeUrl, isPortalOnly, mailBody, mailSubject, mailtoUrl } from '../../lib/mail';
import { koreanDate, todaySeoul } from '../../lib/util/date';
import { docFileName } from '../../lib/util/filename';
import { digitsOnly, normalizeSite } from '../../lib/util/text';
import {
  APPLICATION_STATUSES,
  BARRIERS,
  EXTRA_DOC_OPTIONS,
  SHIFTS,
  type ApplicationStatus,
  type Barrier,
  type BlockKey,
  type Blocks,
  type ProfileData,
  type Qualification,
  type Settings,
} from '../../lib/types';
import { drawPage, FONT_FAMILY, layoutLetter, layoutResume, loadFonts, toPdf, type Fonts, type Laid, type Page, type Photo } from './pdfdoc';
import { EMPTY_PROFILE, useStore, type AppRec, type JobItem, type JobSource, type Prefs, type Store } from './store';
import { DEFAULT_BLOCKS } from './defaults';
import { SAMPLE_POSTING } from './sample';
import { applyChanges, criteriaPrompt, filterJob, type ChatMessage, type Criteria, type FilterResult, type JobVerdict } from './criteria';
import { isRelaySignal, newKey, pingUrl, relayScript, submitRelay, validRelayBase, RELAY_VERSION } from './relay';
import { recommend } from './criteria';
import { estimateCommute, finalMinutes, kakaoRouteUrl, type CommuteResult, type Geo } from './commute';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------- 공용 ----------

function useFonts() {
  const [fonts, setFonts] = useState<Fonts | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const [r, b] = await Promise.all(['fonts/kr-Regular.ttf', 'fonts/kr-Bold.ttf'].map((u) => fetch(u).then((x) => x.arrayBuffer())));
        const faces = [new FontFace(FONT_FAMILY, r.slice(0), { weight: '400' }), new FontFace(FONT_FAMILY, b.slice(0), { weight: '700' })];
        for (const f of faces) document.fonts.add(await f.load());
        setFonts(loadFonts(new Uint8Array(r), new Uint8Array(b)));
      } catch {
        setError('한글 폰트를 불러오지 못했습니다. 새로고침해 보세요.');
      }
    })();
  }, []);
  return { fonts, error };
}

const capUse = async (name: string): Promise<any> => {
  const c = (window as any).claude;
  if (!c?.use) return null;
  try {
    return await c.use(name);
  } catch {
    return null;
  }
};
/** saveFile 이 이 값을 돌려주면 이 화면에서 '저장' 자체가 안 되는 것 (대신 링크로 연다) */
const SAVE_UNAVAILABLE = '이 화면에서는 바로 저장이 안 됩니다.';
async function downloadsNs(): Promise<any> {
  let dl = await capUse('downloads');
  if (dl) return dl;
  // 권한이 꺼져 있거나 아직 묻지 않았으면 한 번 묻는다 (버튼을 누른 순간에만 호출됨)
  const perms = await capUse('permissions');
  if (!perms) return null;
  const st = await perms.state('downloads').catch(() => 'unavailable');
  if (st === 'prompt') await perms.request(['downloads']).catch(() => {});
  else if (st === 'denied') await perms.manage().catch(() => {});
  else return null;
  dl = await capUse('downloads');
  return dl;
}
async function saveFile(filename: string, data: Uint8Array | string): Promise<string | null> {
  const dl = await downloadsNs();
  if (!dl) return SAVE_UNAVAILABLE;
  try {
    const blob = typeof data === 'string' ? new Blob([data]) : new Blob([data as BlobPart]);
    await dl.save({ filename, data: blob });
    return null;
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === 'declined') return null;
    if (code === 'rate_limited') return '저장 창이 이미 열려 있습니다. 잠시 뒤 다시 누르세요.';
    if (code === 'unavailable' || code === 'not_granted' || code === 'capability_disabled' || code === 'capability_removed') return SAVE_UNAVAILABLE;
    return '파일을 저장하지 못했습니다.';
  }
}

/** 저장이 안 되는 화면용: PDF 를 이 페이지 보관함에 올리고 새 창에서 열 수 있는 주소를 받는다 */
async function pdfLink(bytes: Uint8Array): Promise<string | null> {
  const assets = await capUse('assets');
  if (!assets) return null;
  try {
    const r = await assets.upload(new Blob([bytes as BlobPart], { type: 'application/pdf' }), { type: 'application/pdf' });
    return r.url as string;
  } catch {
    return null;
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function dataUrlToPhoto(url: string | null): Photo | null {
  if (!url) return null;
  const m = url.match(/^data:image\/(jpeg|png);base64,(.+)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, type: m[1] === 'png' ? 'png' : 'jpg' };
}

function useImage(url: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) return setImg(null);
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = url;
  }, [url]);
  return img;
}

function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

function Btn({ kind = 'plain', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'plain' | 'danger' | 'quiet' }) {
  return <button {...p} className={cx('btn', `btn-${kind}`, p.className)} />;
}

function Field({ label, hint, warn, children, wide }: { label: string; hint?: React.ReactNode; warn?: boolean; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={cx('field', wide && 'wide', warn && 'warn')}>
      <span className="field-label">
        {label}
        {warn && <em> 비어 있음</em>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function splitList(s: string) {
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function ListInput({ value, onChange, id }: { value: string[]; onChange: (v: string[]) => void; id: string }) {
  const [raw, setRaw] = useState(value.join(', '));
  useEffect(() => {
    if (splitList(raw).join('\u0000') !== value.join('\u0000')) setRaw(value.join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      id={id}
      value={raw}
      onChange={(e) => {
        setRaw(e.target.value);
        onChange(splitList(e.target.value));
      }}
    />
  );
}

function Notice({ level = 'info', children }: { level?: 'info' | 'warn' | 'danger' | 'ok'; children: React.ReactNode }) {
  return <div className={cx('notice', `notice-${level}`)}>{children}</div>;
}

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={cx('pill', `pill-${tone}`)}>{children}</span>;
}

/** 배치된 문서 쪽들을 캔버스로 그린다 */
function Preview({ pages, photo }: { pages: Page[]; photo: string | null }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const img = useImage(photo);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(240, Math.floor(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={wrap} className="preview">
      {pages.map((p, i) => (
        <PageCanvas key={i} page={p} photo={img} width={width} />
      ))}
    </div>
  );
}

function PageCanvas({ page, photo, width }: { page: Page; photo: HTMLImageElement | null; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawPage(ref.current, page, photo, width);
  }, [page, photo, width]);
  return <canvas ref={ref} className="page-canvas" />;
}

// ---------- 문서 내보내기 ----------

interface Built {
  resume: Laid;
  letter: Laid;
  resumeData: ResumeData;
  letterData: LetterData;
  photo: string | null;
}

function buildFromData(fonts: Fonts, resumeData: ResumeData, letterData: LetterData, photo: string | null): Built {
  return { resume: layoutResume(fonts, resumeData, !!photo), letter: layoutLetter(fonts, letterData), resumeData, letterData, photo };
}

function DocActions({ fonts, built, name, site }: { fonts: Fonts; built: Built; name: string; site: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const files = {
    resume: docFileName('이력서', name || '지원자', site, 'pdf'),
    letter: docFileName('자기소개서', name || '지원자', site, 'pdf'),
    zip: docFileName('지원서류', name || '지원자', site, 'zip'),
  };
  const photo = dataUrlToPhoto(built.photo);
  async function run(kind: 'resume' | 'letter' | 'zip') {
    setBusy(kind);
    setMsg(null);
    try {
      const r = kind !== 'letter' ? await toPdf(fonts, built.resume.pages, '이력서', photo) : null;
      const l = kind !== 'resume' ? await toPdf(fonts, built.letter.pages, '자기소개서', null) : null;
      let err: string | null;
      if (kind === 'zip') err = await saveFile(files.zip, zipSync({ [files.resume]: r!, [files.letter]: l! }));
      else err = await saveFile(kind === 'resume' ? files.resume : files.letter, (r ?? l)!);
      setMsg(err);
    } catch {
      setMsg('PDF를 만들지 못했습니다.');
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="stack-s">
      <div className="row wrap">
        <Btn kind="primary" onClick={() => run('resume')} disabled={!!busy}>
          {busy === 'resume' ? '만드는 중…' : '이력서 PDF 저장'}
        </Btn>
        <Btn kind="primary" onClick={() => run('letter')} disabled={!!busy}>
          {busy === 'letter' ? '만드는 중…' : '자기소개서 PDF 저장'}
        </Btn>
        <Btn onClick={() => run('zip')} disabled={!!busy}>
          {busy === 'zip' ? '만드는 중…' : '두 파일 zip'}
        </Btn>
      </div>
      <div className="muted small">
        {files.resume} · {files.letter}
      </div>
      {msg && <Notice level="warn">{msg}</Notice>}
    </div>
  );
}

function DocPreviewCard({ fonts, built, name, site, title = '생성된 서류' }: { fonts: Fonts; built: Built; name: string; site: string; title?: string }) {
  const [tab, setTab] = useState<'resume' | 'letter'>('resume');
  const warnings = [
    built.resume.overflow && `이력서가 최소 글자 크기(9pt)로도 1페이지를 넘습니다. 경력·소개 문구를 줄여 주세요.`,
    built.letter.overflow && `자기소개서가 2페이지를 넘습니다. 문구 블록을 줄여 주세요.`,
  ].filter(Boolean) as string[];
  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
        <div className="seg">
          <button className={cx(tab === 'resume' && 'on')} onClick={() => setTab('resume')}>
            이력서 <span className="muted">{built.resume.pages.length}쪽</span>
          </button>
          <button className={cx(tab === 'letter' && 'on')} onClick={() => setTab('letter')}>
            자기소개서 <span className="muted">{built.letter.pages.length}쪽</span>
          </button>
        </div>
      </div>
      {warnings.map((w) => (
        <Notice key={w} level="warn">
          {w}
        </Notice>
      ))}
      <Preview pages={tab === 'resume' ? built.resume.pages : built.letter.pages} photo={tab === 'resume' ? built.photo : null} />
      <div className="muted small">
        본문 {tab === 'resume' ? built.resume.level.fs : built.letter.level.fs}pt · A4
      </div>
      <DocActions fonts={fonts} built={built} name={name} site={site} />
    </section>
  );
}

// ---------- 지원서 작성 ----------

const CAT_TONE: Record<Category, string> = { 우대: 'blue', '필수(명시)': 'purple', 완화: 'green', '필수로 보임': 'orange' };
const VERDICT_TONE: Record<Verdict, string> = { 충족: 'green', '미충족-보완가능': 'yellow', '미충족-장벽': 'red', '직접 확인': 'gray' };
const SHIFT_TONE = { 격일: 'red', '3교대': 'orange', 주야교대: 'orange', 상근: 'green', 기타: 'gray' } as const;
const CHANNELS = ['email', '고용24', '잡코리아', '사람인', '방문', '우편', '팩스'];
const CH_LABEL: Record<string, string> = { email: '이메일' };

function ParsedForm({ value, onChange }: { value: ParsedPosting; onChange: (p: ParsedPosting) => void }) {
  const set = <K extends keyof ParsedPosting>(k: K, v: ParsedPosting[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid2">
      <Field label="단지/사업장명 *" warn={!value.site.trim()}>
        <input id="pf-site" value={value.site} onChange={(e) => set('site', e.target.value)} />
      </Field>
      <Field label="직책 *" warn={!value.title.trim()}>
        <input id="pf-title" value={value.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field
        wide
        label="필수 기재 문구 (이력서 상단·메일 제목에 글자 그대로)"
        hint={value.required_phrase ? undefined : `비어 있으면 "${value.site} ${value.title} 지원"으로 씁니다. 공고에 필수 문구가 있는데 비어 있다면 직접 넣으세요.`}
      >
        <input id="pf-rp" value={value.required_phrase ?? ''} onChange={(e) => set('required_phrase', e.target.value || null)} />
      </Field>
      <Field label="위탁사명">
        <input id="pf-company" value={value.company} onChange={(e) => set('company', e.target.value)} />
      </Field>
      <Field label="총세대수">
        <input id="pf-hh" inputMode="numeric" value={value.households ?? ''} onChange={(e) => set('households', e.target.value ? parseInt(e.target.value, 10) || null : null)} />
      </Field>
      <Field wide label="주소" warn={!value.address.trim()} hint="근거리 판정과 지원동기 거리 문장에 쓰입니다.">
        <input id="pf-addr" value={value.address} onChange={(e) => set('address', e.target.value)} />
      </Field>
      <Field label="급여 (공고 표기 그대로)">
        <input id="pf-salary" value={value.salary_text} onChange={(e) => set('salary_text', e.target.value)} />
      </Field>
      <Field label="근무형태">
        <select id="pf-shift" value={value.shift} onChange={(e) => set('shift', e.target.value as ParsedPosting['shift'])}>
          {SHIFTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="근무시간 문구">
        <input id="pf-shifttext" value={value.shift_text} onChange={(e) => set('shift_text', e.target.value)} />
      </Field>
      <Field label="휴게시간">
        <input id="pf-break" value={value.break_time} onChange={(e) => set('break_time', e.target.value)} />
      </Field>
      <Field label="마감일 (채용시까지면 비움)">
        <input id="pf-deadline" type="date" value={value.deadline ?? ''} onChange={(e) => set('deadline', e.target.value || null)} />
      </Field>
      <Field label="출근예정일">
        <input id="pf-start" type="date" value={value.start_date ?? ''} onChange={(e) => set('start_date', e.target.value || null)} />
      </Field>
      <Field label="이메일 (쉼표로 구분)">
        <ListInput id="pf-emails" value={value.emails} onChange={(v) => set('emails', v)} />
      </Field>
      <Field label="연락처 (담당자/근무처)">
        <input id="pf-phone" value={value.phone} onChange={(e) => set('phone', e.target.value)} />
      </Field>
      <Field wide label="제출서류 (쉼표로 구분)">
        <ListInput id="pf-docs" value={value.submit_docs} onChange={(v) => set('submit_docs', v)} />
      </Field>
      <div className="field wide">
        <span className="field-label">접수방식</span>
        <div className="row wrap checks">
          {CHANNELS.map((c) => (
            <label key={c} className="check">
              <input
                type="checkbox"
                id={`pf-ch-${c}`}
                checked={value.apply_channels.includes(c)}
                onChange={(e) => set('apply_channels', e.target.checked ? [...value.apply_channels, c] : value.apply_channels.filter((x) => x !== c))}
              />
              {CH_LABEL[c] ?? c}
            </label>
          ))}
        </div>
      </div>
      <Field wide label="수습/평가 문구">
        <input id="pf-prob" value={value.flags.probation ?? ''} onChange={(e) => set('flags', { probation: e.target.value || null })} />
      </Field>
    </div>
  );
}

function KV({ k, children }: { k: string; children: React.ReactNode }) {
  const empty = children === '' || children === null || children === undefined || children === false;
  return (
    <div className="kv">
      <dt>{k}</dt>
      <dd>{empty ? <span className="muted">-</span> : children}</dd>
    </div>
  );
}

function Summary({ p }: { p: ParsedPosting }) {
  return (
    <section className="card">
      <h2>공고 요약</h2>
      <dl className="kvs">
        <KV k="단지">{p.site}</KV>
        <KV k="직책">{p.title}</KV>
        <KV k="위탁사">{p.company}</KV>
        <KV k="세대수">{p.households ? `${p.households.toLocaleString()}세대` : ''}</KV>
        <KV k="주소">
          {p.address && (
            <>
              {p.address}{' '}
              <a href={`https://map.naver.com/p/search/${encodeURIComponent(p.address)}`} target="_blank" rel="noreferrer noopener">
                네이버지도
              </a>
            </>
          )}
        </KV>
        <KV k="급여">{p.salary_text}</KV>
        <KV k="근무형태">
          <Pill tone={SHIFT_TONE[p.shift]}>{p.shift}</Pill> <span className="muted">{p.shift_text}</span>
          {p.break_time && <span className="muted"> · 휴게 {p.break_time}</span>}
        </KV>
        <KV k="마감일">{p.deadline ? koreanDate(p.deadline) : p.deadline_text || '채용시까지/미기재'}</KV>
        <KV k="출근예정일">{p.start_date ? koreanDate(p.start_date) : ''}</KV>
        <KV k="접수방식">{p.apply_channels.map((c) => CH_LABEL[c] ?? c).join(', ')}</KV>
        <KV k="연락처">{p.phone}</KV>
        <KV k="이메일">{p.emails.join(', ')}</KV>
        <KV k="제출서류">{p.submit_docs.join(', ')}</KV>
      </dl>
    </section>
  );
}

function ReqTable({ rows }: { rows: ReqRow[] }) {
  return (
    <section className="card">
      <h2>요건 비교표</h2>
      {rows.length === 0 ? (
        <p className="muted">자격·경력 요건으로 보이는 줄을 찾지 못했습니다. 공고를 직접 확인하세요.</p>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>구분</th>
                <th>공고 문구</th>
                <th>매칭 항목</th>
                <th>판정</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={cx(r.verdict === '직접 확인' && 'dim')}>
                  <td>
                    <Pill tone={CAT_TONE[r.category]}>{r.category}</Pill>
                  </td>
                  <td>{r.line}</td>
                  <td>{r.qualification_name ?? '-'}</td>
                  <td>
                    <Pill tone={VERDICT_TONE[r.verdict]}>{r.verdict}</Pill>
                  </td>
                  <td className="small muted">{r.hint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Signal({ s }: { s: Analysis['signal'] }) {
  return (
    <section className="card signal">
      <div className={cx('lamp', `lamp-${s.level}`)} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div>
        <strong>{s.title}</strong>
        <p>{s.detail}</p>
        <p className="muted small">분석은 참고용입니다. 결과와 관계없이 서류 생성과 지원은 항상 할 수 있습니다.</p>
      </div>
    </section>
  );
}

function MailCard({
  parsed,
  subject,
  body,
  to,
  onSubject,
  onBody,
  onTo,
  onBlur,
}: {
  parsed: ParsedPosting;
  subject: string;
  body: string;
  to: string;
  onSubject: (s: string) => void;
  onBody: (s: string) => void;
  onTo: (s: string) => void;
  onBlur: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (k: string, t: string, fallbackId: string) => {
    if (await copyText(t)) {
      setCopied(k);
      setTimeout(() => setCopied(null), 1500);
    } else {
      const el = document.getElementById(fallbackId) as HTMLInputElement | HTMLTextAreaElement | null;
      el?.select();
      setCopied(`${k}-sel`);
    }
  };
  if (isPortalOnly(parsed))
    return (
      <section className="card">
        <h2>지원 메일</h2>
        <Notice>
          이 공고는 이메일 접수가 없습니다({parsed.apply_channels.join(', ')}). 해당 사이트에서 직접 지원하고 저장한 PDF를 첨부하세요.
        </Notice>
      </section>
    );
  return (
    <section className="card stack">
      <h2>지원 메일</h2>
      {parsed.emails.length > 1 && (
        <div className="field">
          <span className="field-label">받는 사람 선택</span>
          <div className="row wrap checks">
            {parsed.emails.map((e) => (
              <label key={e} className="check">
                <input type="radio" name="mail-to" checked={to === e} onChange={() => onTo(e)} />
                {e}
              </label>
            ))}
          </div>
        </div>
      )}
      {parsed.emails.length === 0 && <Notice level="warn">공고에서 이메일 주소를 찾지 못했습니다. 위 폼에 직접 넣으세요.</Notice>}
      <Field label="받는 사람">
        <input id="mail-to" readOnly value={to} />
      </Field>
      <Field label="제목">
        <input id="mail-subject" value={subject} onChange={(e) => onSubject(e.target.value)} onBlur={onBlur} />
      </Field>
      <Field label="본문">
        <textarea id="mail-body" rows={15} value={body} onChange={(e) => onBody(e.target.value)} onBlur={onBlur} />
      </Field>
      <div className="row wrap">
        <Btn onClick={() => copy('s', subject, 'mail-subject')}>{copied === 's' ? '복사됨' : '제목 복사'}</Btn>
        <Btn onClick={() => copy('b', body, 'mail-body')}>{copied === 'b' ? '복사됨' : '본문 복사'}</Btn>
        <Btn onClick={() => copy('t', to, 'mail-to')} disabled={!to}>
          {copied === 't' ? '복사됨' : '수신 주소 복사'}
        </Btn>
        <a className="btn btn-primary" href={gmailComposeUrl(to, subject, body)} target="_blank" rel="noreferrer noopener">
          Gmail 새 메일 열기
        </a>
        <a className="btn btn-quiet" href={mailtoUrl(to, subject, body)}>
          기본 메일앱
        </a>
      </div>
      {copied?.endsWith('-sel') && <div className="small muted">자동 복사가 막혀 있어 글자를 선택해 두었습니다. Ctrl+C 로 복사하세요.</div>}
      <Notice level="warn">
        첨부파일은 자동으로 넣을 수 없습니다. <b>위에서 PDF를 저장한 뒤 메일에 직접 첨부하세요.</b> 기본 메일앱 버튼은 환경에 따라 열리지 않을 수 있습니다.
      </Notice>
    </section>
  );
}

function newId() {
  return `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function historyOf(apps: AppRec[]): HistoryEntry[] {
  return apps.map((a) => ({ id: idNum(a.id), created_at: a.created_at.replace('T', ' '), site: a.site, company: a.company, emails: a.emails, status: a.status }));
}
function idNum(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) || 1;
}

/** 통근 기준 안이면 근거리 (지원동기 거리 문장·통근 경고에 쓰임). near 를 주면 그 판정을 쓴다 */
function analysisSettings(store: Store, parsed: ParsedPosting, near?: boolean) {
  const ok = near ?? (() => {
    const t = estimateCommute(parsed.address, parsed.site);
    return t.min !== null && t.min <= store.criteria.commute_limit;
  })();
  return { ...store.prefs, near_keywords: ok && parsed.address.trim() ? [parsed.address.trim()] : [] };
}

function analyzeFor(store: Store, text: string, parsed: ParsedPosting, currentId: string | null, near?: boolean) {
  return analyze(text, parsed, {
    qualifications: store.quals,
    settings: analysisSettings(store, parsed, near),
    history: historyOf(store.apps),
    today: todaySeoul(),
    currentApplicationId: currentId ? idNum(currentId) : null,
  });
}

/** 공고 하나로 이력서·자소서·메일을 만들어 "작성중" 지원 건으로 만든다 */
/** 서류 양식 버전: 2 = 원본 이력서 부제 형식(「직책」)·경력 문구 바로잡음 */
const SNAPSHOT_V = 2;

function buildDraft(store: Store, text: string, parsed: ParsedPosting, extraDocs: string[], reuse: AppRec | null, near?: boolean) {
  const today = todaySeoul();
  const analysis = analyzeFor(store, text, parsed, reuse?.id ?? null, near);
  const profile = { ...store.profile, photo_file: store.photo ? 'photo' : null };
  const input = { profile, blocks: store.blocks, parsed, analysis, today };
  const resumeData = composeResume(input);
  const letterData = composeLetter(input);
  const subj = mailSubject(parsed, store.profile.name);
  const mb = mailBody({ template: store.blocks.mail_body, parsed, profile: store.profile, settings: store.prefs, extraDocs });
  const recipient = parsed.emails[0] ?? '';
  const now = new Date().toISOString();
  const keep = reuse && reuse.status === '작성중' ? reuse : null;
  const rec: AppRec = {
    id: keep ? keep.id : newId(),
    created_at: keep ? keep.created_at : now,
    updated_at: now,
    site: parsed.site.trim(),
    title: parsed.title.trim(),
    company: parsed.company.trim(),
    address: parsed.address.trim(),
    phone: parsed.phone.trim(),
    emails: parsed.emails,
    deadline: parsed.deadline,
    shift: parsed.shift,
    salary_text: parsed.salary_text,
    required_phrase: parsed.required_phrase,
    posting_text: text,
    parsed,
    mail_subject: subj,
    mail_body: mb,
    selected_email: recipient || null,
    extra_docs: extraDocs,
    status: '작성중',
    memo: keep ? keep.memo : '',
    snapshot: { resume: resumeData, letter: letterData, photo: store.photo },
    snapshot_v: SNAPSHOT_V,
  };
  return { rec, resumeData, letterData, subj, mb, recipient };
}

function ApplyView({ store, fonts }: { store: Store; fonts: Fonts | null }) {
  const [text, setText] = useState('');
  const [analyzedText, setAnalyzedText] = useState('');
  const [parsed, setParsed] = useState<ParsedPosting | null>(null);
  const [extra, setExtra] = useState<Record<string, boolean>>({});
  const [otherOn, setOtherOn] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [appId, setAppId] = useState<string | null>(null);
  const [built, setBuilt] = useState<Built | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todaySeoul();
  const app = store.apps.find((a) => a.id === appId) ?? null;

  const analysis = useMemo(() => (parsed ? analyzeFor(store, analyzedText, parsed, appId) : null), [parsed, analyzedText, store.quals, store.prefs, store.apps, appId, today]);
  const commute = parsed ? estimateCommute(parsed.address, parsed.site) : null;

  const check = checkProfile({ ...store.profile, photo_file: store.photo ? 'photo' : null });

  function doAnalyze(src = text) {
    if (!src.trim()) return;
    const p = parsePosting(src, today);
    setParsed(p);
    setAnalyzedText(src);
    setExtra({ '자격증 사본': p.submit_docs.includes('자격증 사본') });
    setOtherOn(false);
    setOtherText('');
    setAppId(null);
    setBuilt(null);
    setError(null);
  }

  const extraDocs = [...EXTRA_DOC_OPTIONS.filter((d) => extra[d]), ...(otherOn && otherText.trim() ? [otherText.trim()] : [])];

  async function generate() {
    if (!parsed || !analysis || !fonts) return;
    if (!parsed.site.trim() || !parsed.title.trim()) return setError('단지/사업장명과 직책을 먼저 입력하세요.');
    setBusy(true);
    setError(null);
    const { rec, resumeData, letterData, subj, mb, recipient } = buildDraft(store, analyzedText, parsed, extraDocs, app);
    setBuilt(buildFromData(fonts, resumeData, letterData, store.photo));
    setSubject(subj);
    setBody(mb);
    setTo(recipient);
    setAppId(rec.id);
    try {
      await store.saveApp(rec);
    } catch {
      /* store.error 에 표시 */
    } finally {
      setBusy(false);
    }
  }

  const saveMail = () => {
    if (app) void store.patchApp(app.id, { mail_subject: subject, mail_body: body, selected_email: to || null }).catch(() => {});
  };

  return (
    <div className="split">
      <div className="col stack">
        <a className="small" href="#jobs">← 공고 찾기로 돌아가기</a>
        <section className="card stack">
          <div className="card-head">
            <h2>공고 붙여넣기</h2>
            <Btn
              kind="quiet"
              onClick={() => {
                setText(SAMPLE_POSTING);
                doAnalyze(SAMPLE_POSTING);
              }}
            >
              예시 공고로 해보기
            </Btn>
          </div>
          <textarea id="posting" rows={11} placeholder="채용 공고 내용을 통째로 붙여넣으세요." value={text} onChange={(e) => setText(e.target.value)} />
          <div className="row">
            <Btn kind="primary" onClick={() => doAnalyze()} disabled={!text.trim()}>
              분석
            </Btn>
            {parsed && text !== analyzedText && <span className="small warn-text">원문이 바뀌었습니다. 다시 [분석]을 누르세요.</span>}
          </div>
        </section>

        {!parsed && (
          <section className="card how">
            <h2>사용 순서</h2>
            <ol>
              <li>공고를 붙여넣고 [분석]</li>
              <li>단지·직책·필수 기재 문구 확인, 요건 비교 보기</li>
              <li>[서류 생성] → 이력서·자기소개서 PDF 저장</li>
              <li><a href="#final">최종확인</a> 탭에서 받는 사람·제목·첨부를 확인하고 [발송]</li>
            </ol>
            {check.required.length > 0 && (
              <Notice level="warn">
                프로필 필수 항목이 비어 있습니다: <b>{check.required.join(', ')}</b>. <a href="#profile">프로필 입력</a>
              </Notice>
            )}
          </section>
        )}

        {parsed && analysis && (
          <>
            <section className="card stack">
              <div className="card-head">
                <h2>공고 정보 확인·수정</h2>
                <span className="muted small">고치면 분석이 바로 바뀝니다</span>
              </div>
              <ParsedForm value={parsed} onChange={setParsed} />
            </section>
            <Summary p={parsed} />
            {commute && (
              <section className="card">
                <h2>통근</h2>
                <CommuteLine c={commute} from={store.profile.address} to={parsed.address || parsed.site} />
              </section>
            )}
            <ReqTable rows={analysis.rows} />
            <Signal s={analysis.signal} />
            {analysis.warnings.length > 0 && (
              <div className="stack-s">
                {analysis.warnings.map((w, i) => (
                  <Notice key={i} level={w.level}>
                    {w.text}
                  </Notice>
                ))}
              </div>
            )}
            <section className="card stack">
              <h2>서류 생성</h2>
              <div className="field">
                <span className="field-label">추가 첨부 서류 (메일 문구에만 쓰입니다. 파일은 받지 않습니다)</span>
                <div className="row wrap checks">
                  {EXTRA_DOC_OPTIONS.map((d) => (
                    <label key={d} className="check">
                      <input type="checkbox" id={`ex-${d}`} checked={!!extra[d]} onChange={(e) => setExtra({ ...extra, [d]: e.target.checked })} />
                      {d}
                    </label>
                  ))}
                  <label className="check">
                    <input type="checkbox" id="ex-other" checked={otherOn} onChange={(e) => setOtherOn(e.target.checked)} />
                    기타
                  </label>
                  {otherOn && <input id="ex-other-text" className="short" placeholder="예: 경력증명서" value={otherText} onChange={(e) => setOtherText(e.target.value)} />}
                </div>
              </div>
              {check.required.length > 0 && (
                <Notice level="warn">
                  프로필 필수 항목이 비어 있습니다: <b>{check.required.join(', ')}</b>. 생성은 되지만 PDF에는 &quot;-&quot;(사진은 빈 칸)으로 나옵니다. <a href="#profile">프로필 입력</a>
                </Notice>
              )}
              {check.optional.length > 0 && <div className="small muted">PDF에 &quot;-&quot;로 나올 빈 항목: {check.optional.join(', ')}</div>}
              {(!parsed.site.trim() || !parsed.title.trim()) && <Notice level="warn">단지/사업장명과 직책을 넣어야 서류를 만들 수 있습니다.</Notice>}
              {error && <Notice level="danger">{error}</Notice>}
              <div>
                <Btn kind="primary" className="big" onClick={generate} disabled={busy || !fonts}>
                  {!fonts ? '폰트 불러오는 중…' : busy ? '만드는 중…' : built ? '서류 다시 생성' : '서류 생성'}
                </Btn>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="col">
        <div className="sticky stack">
          {built && fonts && parsed ? (
            <>
              <DocPreviewCard fonts={fonts} built={built} name={store.profile.name} site={parsed.site} />
              <MailCard
                parsed={parsed}
                subject={subject}
                body={body}
                to={to}
                onSubject={setSubject}
                onBody={setBody}
                onTo={(e) => {
                  setTo(e);
                  if (app) void store.patchApp(app.id, { selected_email: e }).catch(() => {});
                }}
                onBlur={saveMail}
              />
              <section className="card row wrap">
                <Btn
                  kind="primary"
                  disabled={!app || app.status !== '작성중'}
                  onClick={() => app && store.patchApp(app.id, { status: '지원함', mail_subject: subject, mail_body: body, selected_email: to || null }).catch(() => {})}
                >
                  지원함으로 기록
                </Btn>
                <span className="small">
                  상태 <Pill tone={app?.status === '작성중' || !app ? 'gray' : 'green'}>{app?.status ?? '저장 안 됨'}</Pill>
                </span>
                {app && app.status !== '작성중' && <span className="small muted">지원 이력에 기록했습니다. 다시 생성하면 새 건으로 저장됩니다.</span>}
                {app && app.status === '작성중' && (
                  <a className="btn btn-primary" href="#final" onClick={saveMail}>
                    최종확인 →
                  </a>
                )}
              </section>
            </>
          ) : (
            <section className="card empty">
              <p>
                공고를 분석하고 <b>[서류 생성]</b>을 누르면
                <br />
                여기에 이력서·자기소개서 미리보기와 지원 메일이 나옵니다.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- 공고 찾기 ----------

/** 예약 작업(공고 수집)의 id. [지금 새로 찾기]가 이 작업을 바로 실행한다. 비어 있으면 버튼을 숨긴다. */
const REFRESH_TRIGGER_ID = '';

const SOURCES: { id: JobSource; label: string; short: string; home: string }[] = [
  { id: 'dghma', label: '대구주택관리사협회', short: '협회', home: 'https://www.dghma.org/pg/bbs/board.php?bo_table=recruit_new_3' },
  { id: 'jobkorea', label: '잡코리아', short: '잡코리아', home: 'https://www.jobkorea.co.kr/' },
  { id: 'saramin', label: '사람인', short: '사람인', home: 'https://www.saramin.co.kr/' },
  { id: 'work24', label: '그 외 (고용24)', short: '고용24', home: 'https://www.work24.go.kr/' },
  { id: 'manual', label: '직접 추가', short: '직접', home: '' },
];
type Tab = JobSource | 'all';

function CommuteBadge({ c }: { c: Pick<CommuteResult, 'verdict' | 'min'> }) {
  if (c.verdict === 'ok') return <Pill tone="green">약 {c.min}분</Pill>;
  if (c.verdict === 'edge') return <Pill tone="yellow">약 {c.min}분 · 경계</Pill>;
  if (c.verdict === 'far') return <Pill tone="red">약 {c.min}분 · 멂</Pill>;
  return <Pill tone="gray">통근 확인 필요</Pill>;
}

function CommuteLine({
  c,
  from,
  to,
  fromGeo,
  toGeo,
}: {
  c: Pick<CommuteResult, 'verdict' | 'min' | 'area' | 'route'> & { km?: number | null };
  from: string;
  to: string;
  fromGeo?: Geo | null;
  toGeo?: Geo | null;
}) {
  return (
    <div className="row wrap small commute-line">
      <CommuteBadge c={c} />
      <span className="muted">
        {c.km != null ? `직선 ${c.km.toFixed(1)}km` : c.area ? c.area : '위치 미상'}
        {c.route ? ` · ${c.route}` : ''}
      </span>
      {from && to && (
        <a href={kakaoRouteUrl(from, to, fromGeo, toGeo)} target="_blank" rel="noreferrer noopener">
          {fromGeo && toGeo ? '카카오맵 대중교통 길찾기' : '카카오맵 길찾기'}
        </a>
      )}
    </div>
  );
}

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  if (m < 60 * 24) return `${Math.round(m / 60)}시간 전`;
  return `${Math.round(m / 1440)}일 전`;
}

function JobCard({ it, also, why, verdict, min, km, store, fonts, onDrafted }: { it: JobItem; also?: JobSource[]; why?: string[]; verdict: JobVerdict; min: number | null; km: number | null; store: Store; fonts: Fonts | null; onDrafted: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const today = todaySeoul();
  // 공고에 없던 이메일을 직접 알아내 넣었으면 공고 글 끝에 붙여서 읽는다
  const extraEmail = store.jobEmails[it.id] ?? '';
  const text = jobText(it, store);
  const parsed = useMemo(() => parsePosting(text, today), [text, today]);
  const p: ParsedPosting = { ...parsed, site: parsed.site || it.site, title: parsed.title || it.title, address: parsed.address || it.address, company: parsed.company || it.company };
  const analysis = useMemo(() => analyzeFor(store, text, p, null), [text, store.quals, store.prefs, store.apps]); // eslint-disable-line react-hooks/exhaustive-deps
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailIn, setEmailIn] = useState(extraEmail);
  const ct = it.contact;
  const method = ct?.method?.replace(/\s*\(?개인회원 로그인 후 조회가능\)?/g, '').replace(/,\s*,/g, ',').trim();
  const applied = store.apps.find((a) => a.status !== '작성중' && normalizeSite(a.site) === normalizeSite(p.site) && normalizeSite(a.title) === normalizeSite(p.title));
  const draft = store.apps.find((a) => a.status === '작성중' && (a.posting_text === text || a.posting_text === it.text));
  const lamp = { green: '🟢', yellow: '🟡', red: '🔴' }[analysis.signal.level];
  const req = analysis.rows.filter((r) => r.category !== '우대' && r.verdict !== '충족' && r.qualification_name).map((r) => r.qualification_name);

  async function apply() {
    if (!fonts) return;
    if (!p.site.trim() || !p.title.trim()) return setErr('단지명이나 직책을 읽지 못했습니다. [직접 확인]으로 지원서 작성에서 고쳐 주세요.');
    setBusy(true);
    setErr(null);
    try {
      const { rec } = buildDraft(store, text, p, p.submit_docs.includes('자격증 사본') ? ['자격증 사본'] : [], draft ?? null, verdict === 'ok');
      await store.saveApp(rec);
      onDrafted(rec.id);
    } catch {
      setErr('서류를 저장하지 못했습니다. 잠시 뒤 다시 누르세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card job">
      <div className="job-head">
        <div className="job-title">
          <span className={cx('origin', `src-${it.source}`)}>{it.origin || SOURCES.find((x) => x.id === it.source)?.short}</span>
          {also?.map((a) => (
            <span key={a} className={cx('origin', 'origin-also', `src-${a}`)} title="같은 공고가 이 사이트에도 있습니다">
              +{SOURCES.find((x) => x.id === a)?.short}
            </span>
          ))}
          {isFresh(it) && <span className="new-badge">NEW</span>}
          <strong>{p.site || it.company || '(단지명 미상)'}</strong> <span>{p.title || it.list_title}</span>
          {applied && <Pill tone="blue">{applied.created_at.slice(5, 10).replace('-', '/')} {applied.status}</Pill>}
        </div>
        <span className="small muted">{it.posted || ''}</span>
      </div>
      {why && why.some((w) => !w.startsWith('⚠')) && <div className="why small">👍 {why.filter((w) => !w.startsWith('⚠')).join(' · ')}</div>}
      {why?.filter((w) => w.startsWith('⚠')).map((w) => (
        <div key={w} className="why-warn small">
          {w}
        </div>
      ))}
      <CommuteLine c={{ ...it.commute, verdict, min, km }} from={store.profile.address} to={p.address || p.site} fromGeo={store.prefs.home_geo} toGeo={it.geo} />
      <dl className="job-facts">
        <div>
          <dt>주소</dt>
          <dd>{p.address || '-'}</dd>
        </div>
        <div>
          <dt>급여</dt>
          <dd>{p.salary_text || '-'}</dd>
        </div>
        <div>
          <dt>근무</dt>
          <dd>
            {p.shift}
            {p.shift_text ? ` · ${p.shift_text}` : ''}
          </dd>
        </div>
        <div>
          <dt>마감</dt>
          <dd>{p.deadline ? koreanDate(p.deadline) : p.deadline_text || '채용시까지'}</dd>
        </div>
        <div>
          <dt>접수</dt>
          <dd>
            {p.emails.length ? `이메일 ${p.emails[0]}` : method || p.apply_channels.filter((c) => c !== 'email').join(', ') || '사이트 지원'}
            {ct?.phone && <span className="muted"> · 담당 {ct.name ? `${ct.name.replace(/^채용대행\s*/, '')} ` : ''}☎ {ct.phone}</span>}
          </dd>
        </div>
        <div>
          <dt>서류 통과</dt>
          <dd>
            {lamp} {analysis.signal.title.replace('서류 통과 예상 난이도: ', '')}
            {req.length > 0 && <span className="muted"> · 부족: {req.join(', ')}</span>}
          </dd>
        </div>
      </dl>
      {err && <Notice level="danger">{err}</Notice>}
      {!p.emails.length && emailOpen && (
        <div className="stack-s email-in">
          <span className="small">
            {it.source === 'work24'
              ? '고용24는 담당자 이메일을 로그인해야 보여 줍니다. 고용24에 로그인해 공고 원문의 "채용 담당자 → 이메일"을 복사하거나, 담당자에게 전화로 물어 적으세요.'
              : '공고 원문이나 전화로 알아낸 접수 이메일을 적으세요.'}{' '}
            넣으면 <b>지원</b> 버튼이 켜지고, 이 주소로 이력서·자기소개서를 보냅니다.
          </span>
          <div className="row">
            <input type="email" value={emailIn} onChange={(e) => setEmailIn(e.target.value.trim())} placeholder="예: hr@example.com" aria-label="접수 이메일" />
            <Btn
              kind="primary"
              disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailIn)}
              onClick={async () => {
                await store.saveJobEmail(it.id, emailIn).catch(() => setErr('저장하지 못했습니다.'));
                setEmailOpen(false);
              }}
            >
              저장
            </Btn>
          </div>
        </div>
      )}
      {extraEmail && (
        <span className="small muted">
          직접 넣은 접수 이메일: {extraEmail}{' '}
          <button className="linklike" onClick={() => store.saveJobEmail(it.id, null)}>
            지우기
          </button>
        </span>
      )}
      <div className="row wrap">
        {p.emails.length > 0 ? (
          draft ? (
            <a className="btn btn-primary" href="#final">
              최종확인에서 보내기 →
            </a>
          ) : (
            <Btn kind="primary" onClick={apply} disabled={busy || !fonts || !!applied}>
              {busy ? '서류 만드는 중…' : applied ? '이미 지원함' : '지원'}
            </Btn>
          )
        ) : (
          <>
            <a className="btn btn-primary" href={it.url} target="_blank" rel="noreferrer noopener">
              {it.source === 'work24' ? '고용24에서 지원' : '사이트에서 지원'}
            </a>
            {ct?.phone && (
              <a className="btn btn-plain" href={`tel:${ct.phone}`}>
                ☎ {ct.phone}
              </a>
            )}
            <Btn kind="plain" onClick={() => setEmailOpen((v) => !v)}>
              이메일 주소 넣기
            </Btn>
          </>
        )}
        <a className="btn btn-quiet" href={it.url} target="_blank" rel="noreferrer noopener">
          공고 원문
        </a>
      </div>
    </article>
  );
}

function CriteriaPanel({ c }: { c: Criteria }) {
  return (
    <aside className="card crit">
      <div className="crit-head">
        <span className="crit-kicker">지원 기준</span>
        {c.updated_at && <span className="small muted">{ago(c.updated_at)} 수정</span>}
      </div>
      <p className="crit-goal">{c.goal}</p>
      <dl className="crit-list">
        <div>
          <dt>통근</dt>
          <dd>
            대중교통 편도 <b>{c.commute_limit}분 이내</b>
            {c.commute_max > c.commute_limit && <span className="muted"> (최대 {c.commute_max}분까지 표시)</span>}
          </dd>
        </div>
        <div>
          <dt>찾는 직무</dt>
          <dd className="chips">
            {c.roles_include.length ? c.roles_include.map((r) => <span key={r} className="chip chip-in">{r}</span>) : <span className="muted">제한 없음</span>}
          </dd>
        </div>
        <div>
          <dt>제외</dt>
          <dd className="chips">
            {c.roles_exclude.length ? c.roles_exclude.map((r) => <span key={r} className="chip chip-out">{r}</span>) : <span className="muted">없음</span>}
          </dd>
        </div>
        <div>
          <dt>근무형태</dt>
          <dd>{c.shifts.length ? c.shifts.join(', ') : '전부'}</dd>
        </div>
        <div>
          <dt>급여</dt>
          <dd>{c.salary_min_man ? `월 ${c.salary_min_man}만원 이상` : '제한 없음'}</dd>
        </div>
        <div>
          <dt>접수</dt>
          <dd>{c.email_only ? '이메일 접수만' : '이메일·사이트 지원 모두'}</dd>
        </div>
        <div>
          <dt>자격</dt>
          <dd>{(c.hide_unqualified ?? true) ? '기사급처럼 곧 딸 수 없는 자격이 필수면 숨김' : '자격과 상관없이 모두 표시'}</dd>
        </div>
        <div>
          <dt>중복</dt>
          <dd>{(c.hide_applied ?? true) ? '이미 지원한 공고는 숨김' : '지원한 공고도 표시'}</dd>
        </div>
      </dl>
      <div className="crit-notes">
        <span className="crit-kicker">지원 지침</span>
        <ul>
          {c.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </div>
      <p className="small muted">오른쪽 대화창에서 말하면 기준이 바뀌고, 공고 목록에 바로 반영됩니다.</p>
    </aside>
  );
}

const CHAT_EXAMPLES = [
  '통근 40분까지 넓혀줘',
  '격일 근무만 보여줘',
  '월 330만원 이상만',
  '이메일로 받는 공고만 보여줘',
  '경비직도 포함해줘',
  '지금 기준에서 제일 괜찮은 공고는?',
];

function ChatPanel({ store, stats }: { store: Store; stats: string }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [store.chat.length, busy]);

  async function send(text: string) {
    const ask = text.trim();
    if (!ask || busy) return;
    setBusy(true);
    setErr(null);
    setInput('');
    const now = new Date().toISOString();
    const withUser: ChatMessage[] = [...store.chat, { role: 'user', text: ask, at: now }];
    try {
      const sample = await (window as any).claude?.use?.('sample');
      if (!sample) {
        setDisabled(true);
        throw { code: 'not_granted' };
      }
      const out = (await sample.json(criteriaPrompt(store.criteria, store.chat, ask, stats), { modelTier: 'default' })) as { reply?: unknown; changes?: unknown };
      const { next, changed } = applyChanges(store.criteria, out?.changes);
      const reply = typeof out?.reply === 'string' && out.reply.trim() ? out.reply.trim() : changed.length ? '기준을 바꿨습니다.' : '바꿀 내용을 찾지 못했습니다.';
      const note = changed.length ? `\n(바뀐 항목: ${changed.join(', ')})` : '';
      if (changed.length) await store.saveCriteria(next);
      await store.saveChat([...withUser, { role: 'assistant', text: reply + note, at: new Date().toISOString() }]);
    } catch (e) {
      const code = (e as { code?: string })?.code ?? 'upstream_error';
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) {
        setDisabled(true);
        setErr('이 화면에서는 AI 대화를 쓸 수 없습니다. claude.ai에서 이 페이지를 열고, AI 사용을 허락해 주세요.');
      } else if (code === 'rate_limited') setErr('요청이 많아 잠시 쉬어야 합니다. 조금 뒤에 다시 보내 주세요.');
      else if (code === 'session_expired') setErr('claude.ai 로그인이 끊겼습니다. 다시 로그인한 뒤 보내 주세요.');
      else if (code === 'invalid_json') setErr('AI 답을 읽지 못했습니다. 조금 다르게 말해서 다시 보내 주세요.');
      else setErr('AI가 지금 답하지 못했습니다. 잠시 뒤 다시 보내 주세요.');
      setInput(ask);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="card chat">
      <div className="crit-head">
        <span className="crit-kicker">AI와 기준 바꾸기</span>
        {store.chat.length > 0 && (
          <button className="link-btn" onClick={() => void store.saveChat([]).catch(() => {})}>
            대화 지우기
          </button>
        )}
      </div>
      <div className="chat-log">
        {store.chat.length === 0 && (
          <div className="bubble bubble-ai">
            어떤 공고를 찾을지 말로 알려 주세요. 통근 시간, 직무, 근무형태, 급여, 지원 지침을 바꿀 수 있고, 공고에 대해 물어봐도 됩니다.
          </div>
        )}
        {store.chat.map((m, i) => (
          <div key={i} className={cx('bubble', m.role === 'user' ? 'bubble-me' : 'bubble-ai')}>
            {m.text}
          </div>
        ))}
        {busy && <div className="bubble bubble-ai typing">생각하는 중…</div>}
        <div ref={endRef} />
      </div>
      <div className="chat-examples">
        {CHAT_EXAMPLES.map((q) => (
          <button key={q} className="example" disabled={busy || disabled} onClick={() => void send(q)}>
            {q}
          </button>
        ))}
      </div>
      {err && <Notice level="warn">{err}</Notice>}
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          id="chat-input"
          rows={2}
          placeholder="예: 수성구는 빼고, 상근 자리도 보고 싶어"
          value={input}
          disabled={busy || disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <Btn kind="primary" type="submit" disabled={busy || disabled || !input.trim()}>
          보내기
        </Btn>
      </form>
    </aside>
  );
}

/** 필수로 요구하는데 곧 딸 수도 없는 자격(기사급 등). 같은 줄에 대안(기능사 등)이 있으면 막지 않는다 */
function hardBlockers(rows: ReturnType<typeof analyze>['rows'], quals: Qualification[]): string[] {
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

/** 직접 넣은 접수 이메일을 공고 글 끝에 붙인다 */
function jobText(it: JobItem, store: Store) {
  const e = store.jobEmails[it.id] ?? '';
  return e && !it.text.includes(e) ? `${it.text}\n이메일 : ${e}` : it.text;
}

const isFresh = (it: JobItem) => !!it.first_seen && Date.now() - Date.parse(it.first_seen) < 36 * 3600 * 1000;

function JobsView({ store, fonts }: { store: Store; fonts: Fonts | null }) {
  const [src, setSrc] = useState<Tab>('all');
  const [showEdge, setShowEdge] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [refresh, setRefresh] = useState<{ level: 'ok' | 'warn' | 'danger'; text: string } | null>(null);
  const c = store.criteria;
  const today = todaySeoul();
  const list = src === 'all' ? null : store.jobs[src];
  const lastUpdate = SOURCES.map((s) => store.jobs[s.id]?.updated_at).filter(Boolean).sort().pop();

  type Row = { it: JobItem; f: FilterResult; min: number | null; km: number | null; also?: JobSource[]; score: number; why: string[] };
  /** 종합 탭: 여러 사이트에 같이 올라온 공고는 하나로 묶고 다른 출처를 배지로 보인다 */
  const mergeDupes = (all: Row[]): Row[] => {
    // 사이트마다 주소 쓰는 방식이 달라 제목(공백·기호 뺀 것)으로 묶는다. 너무 짧은 제목은 단지명까지 본다
    const key = (it: JobItem) => {
      const t = (it.title || it.list_title).replace(/[\s()[\]·,/（）]/g, '');
      return t.length >= 8 ? t : `${t}|${(it.site || it.company).replace(/\s/g, '')}`;
    };
    const seen = new Map<string, Row>();
    const out: Row[] = [];
    for (const r of all) {
      const k = key(r.it);
      const first = seen.get(k);
      if (first) {
        if (first.it.source !== r.it.source) first.also = [...(first.also ?? []), r.it.source];
        continue;
      }
      const copy = { ...r };
      seen.set(k, copy);
      out.push(copy);
    }
    return out;
  };
  const judged = useMemo(() => {
    const out: Record<JobSource, Row[]> = { dghma: [], jobkorea: [], saramin: [], work24: [], manual: [] };
    for (const s of SOURCES) {
      for (const it of store.jobs[s.id]?.items ?? []) {
        const text = jobText(it, store);
        const p0 = parsePosting(text, today);
        const p: ParsedPosting = { ...p0, site: p0.site || it.site, title: p0.title || it.title, address: p0.address || it.address, company: p0.company || it.company };
        // 집↔근무지 좌표 거리와 동별 표를 함께 본 통근 추정
        const fm = finalMinutes(it.commute.min, store.prefs.home_geo, it.geo);
        const an = analyzeFor(store, text, p, null, fm.min !== null && fm.min <= c.commute_limit);
        const allBlockers = hardBlockers(an.rows, store.quals);
        // 직책이 여럿인 공고(시설책임/시설주임 등)는 기사급 요건이 한 직책에만 걸린 경우가 많아 숨기지 않고 알려만 준다
        const titleText = p.title || it.title;
        const multi = /(주임|기사|책임|과장|반장|직원|계장|소장|대리)\s*[\/,]\s*\S*?(주임|기사|책임|과장|반장|직원|계장|소장|대리)/.test(titleText) && !/전기기사|산업기사|전기안전관리자|선임/.test(titleText);
        const blockers = multi ? [] : allBlockers;
        const app = store.apps.find((a) => a.status !== '작성중' && normalizeSite(a.site) === normalizeSite(p.site) && normalizeSite(a.title) === normalizeSite(p.title));
        const f = filterJob(
          { ...it, commute: { min: fm.min } },
          { title: p.title, shift: p.shift, salary_text: p.salary_text, emails: p.emails },
          c,
          { blockers, applied: app ? `${app.created_at.slice(5, 10).replace('-', '/')} ${app.status}` : null },
        );
        const amt = p.salary_text ? parseSalaryAmount(p.salary_text) : null;
        // 연봉 표기는 월로 바꿔 비교한다
        const salary = amt !== null && (/연봉|년봉|연\s*\d/.test(p.salary_text) || amt >= 10000000) ? Math.round(amt / 12) : amt;
        const daysLeft = p.deadline ? Math.round((Date.parse(p.deadline) - Date.parse(today)) / 86400000) : null;
        const r = recommend({ min: fm.min, verdict: f.verdict, signal: an.signal.level, email: p.emails.length > 0, salaryWon: salary, daysLeft, isNew: isFresh(it) }, c);
        if (multi && allBlockers.length) {
          r.score -= 10;
          r.why.push(`⚠ 일부 직책은 ${allBlockers.join(', ')} 필요`);
        }
        out[s.id].push({ it, f, min: fm.min, km: fm.km, score: r.score, why: r.why });
      }
    }
    for (const k of Object.keys(out) as JobSource[]) out[k].sort((a, b) => b.score - a.score || (a.min ?? 99) - (b.min ?? 99));
    return out;
  }, [store.jobs, store.prefs.home_geo, store.jobEmails, store.apps, store.quals, c, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = src === 'all' ? mergeDupes(SOURCES.flatMap((s) => judged[s.id])).sort((a, b) => b.score - a.score || (a.min ?? 99) - (b.min ?? 99)) : judged[src];
  const shown = rows.filter((r) => r.f.show && (showEdge || r.f.verdict === 'ok'));
  const hidden = rows.filter((r) => !r.f.show);
  const stats = SOURCES.map((s) => `${s.label} ${judged[s.id].filter((r) => r.f.show).length}건`).join(', ');
  const hiddenCount = (r: Row[]) => r.filter((x) => !x.f.show).length;
  void hiddenCount;

  async function runNow() {
    setRefresh(null);
    try {
      const mcp = await (window as any).claude?.use?.('mcp');
      if (!mcp) throw { code: 'not_granted' };
      await mcp.callTool('Claude Code Remote', 'fire_trigger', { trigger_id: REFRESH_TRIGGER_ID });
      setRefresh({ level: 'ok', text: '새로 찾기를 시작했습니다. 5~10분 뒤 이 목록이 저절로 바뀝니다.' });
    } catch {
      setRefresh({ level: 'warn', text: '지금은 새로 찾기를 시작하지 못했습니다.' });
    }
  }

  return (
    <div className="jobs-layout">
      <CriteriaPanel c={c} />

      <div className="jobs-main stack">
        <section className="card stack-s hero">
          <div className="card-head">
            <h2>공고 찾기</h2>
            <div className="row">
              <a className="btn btn-plain" href="#apply">
                공고 직접 붙여넣기
              </a>
              {REFRESH_TRIGGER_ID && <Btn onClick={runNow}>지금 새로 찾기</Btn>}
            </div>
          </div>
          <p className="small">
            {store.profile.address || '집 주소 미입력'} 출발 · 통근 시간은 집과 근무지 사이 거리와 지하철 3호선·버스 노선으로 추정합니다(±5분). 정확한 시간은 각 공고의 카카오맵 대중교통 길찾기로 확인하세요.
          </p>
          <div className="source-tabs">
            <button className={cx('source-tab', 'src-all', src === 'all' && 'on')} onClick={() => setSrc('all')}>
              <span className="source-name">종합</span>
              <span className="source-count">{mergeDupes(SOURCES.flatMap((s) => judged[s.id])).filter((r) => r.f.show).length}건 · 추천순</span>
            </button>
            {SOURCES.filter((s) => s.id !== 'manual' || store.jobs.manual?.items?.length).map((s) => {
              const n = judged[s.id].filter((r) => r.f.show).length;
              return (
                <button key={s.id} className={cx('source-tab', `src-${s.id}`, src === s.id && 'on')} onClick={() => setSrc(s.id)}>
                  <span className="source-name">{s.label}</span>
                  <span className="source-count">{store.jobs[s.id] ? `${n}건` : '아직 없음'}</span>
                </button>
              );
            })}
          </div>
          {refresh && <Notice level={refresh.level}>{refresh.text}</Notice>}
        </section>

        <div className="row wrap small list-bar">
          <span className="muted">
            {src === 'all'
              ? `${lastUpdate ? `${ago(lastUpdate)} 갱신 · ` : ''}모든 사이트 합쳐 기준에 맞는 ${shown.length}건 · 통근·자격·접수 방법·급여·마감을 함께 본 추천순`
              : list
                ? `${ago(list.updated_at)} 갱신 · ${list.scanned}건 확인 → 기준에 맞는 ${shown.length}건`
                : '아직 이 사이트에서 모은 공고가 없습니다.'}
          </span>
          <label className="check">
            <input type="checkbox" id="jobs-edge" checked={showEdge} onChange={(e) => setShowEdge(e.target.checked)} />
            {c.commute_limit + 1}~{c.commute_max}분·확인 필요도 보기
          </label>
          {src !== 'all' && (
            <a href={SOURCES.find((s) => s.id === src)!.home} target="_blank" rel="noreferrer noopener">
              사이트 열기
            </a>
          )}
        </div>

        {shown.length === 0 ? (
          <section className="card empty">
            <p>{rows.length ? '지금 기준에 맞는 공고가 없습니다. 오른쪽에서 기준을 넓혀 보세요.' : '아직 모은 공고가 없습니다.'}</p>
          </section>
        ) : (
          shown.map(({ it, f, min, km, also, why }) => <JobCard key={it.id} it={it} also={also} why={why} verdict={f.verdict} min={min} km={km} store={store} fonts={fonts} onDrafted={() => (location.hash = '#final')} />)
        )}

        {hidden.length > 0 && (
          <section className="card stack-s hidden-list">
            <button className="link-btn" onClick={() => setShowHidden(!showHidden)}>
              기준에 안 맞아 숨긴 공고 {hidden.length}건 {showHidden ? '접기' : '보기'}
            </button>
            {showHidden && (
              <ul>
                {hidden.map(({ it, f }) => (
                  <li key={it.id}>
                    <span className={cx('origin', `src-${it.source}`)}>{it.origin || SOURCES.find((x) => x.id === it.source)?.short}</span>{' '}
                    <a href={it.url} target="_blank" rel="noreferrer noopener">
                      {it.site || it.company} · {it.title || it.list_title}
                    </a>{' '}
                    <span className="muted">— {f.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <ChatPanel store={store} stats={stats} />
    </div>
  );
}

// ---------- 최종확인 · 발송 ----------

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 메일 본문의 "요청하신 ○○도 함께 첨부하였습니다." 문장 */
const EXTRA_SENTENCE = /\s?요청하신 [^\n]*?도 함께 첨부하였습니다\./;
/** connector 호출 입력 한도(1 MiB) 안에 들어가도록 잡은 추가 첨부 상한 */
const EXTRA_LIMIT_BYTES = 380 * 1024;

interface ExtraFile {
  name: string;
  type: string;
  b64: string;
  size: number;
}

interface Check {
  level: 'ok' | 'warn' | 'block';
  text: string;
  /** 'extra' = 본문의 "함께 첨부" 문장 관련 (직접 보낼 때는 파일을 직접 붙이면 되므로 막지 않음) */
  id?: 'extra';
}

/** 보내기 전에 볼 항목. block 이 하나라도 있으면 보낼 수 없다. */
function checksFor(a: AppRec, store: Store, built: Built | null, to: string, subject: string, body: string, extras: ExtraFile[]): Check[] {
  const out: Check[] = [];
  const sender = (store.prefs.sender_email ?? '').trim().toLowerCase();
  const profileEmail = store.profile.email.trim().toLowerCase();
  out.push(EMAIL_OK.test(to) ? { level: 'ok', text: `받는 사람: ${to}` } : { level: 'block', text: '받는 사람 이메일이 없거나 형식이 틀렸습니다.' });
  if (a.required_phrase) {
    out.push(
      subject.includes(a.required_phrase)
        ? { level: 'ok', text: `메일 제목에 필수 문구 "${a.required_phrase}" 포함` }
        : { level: 'block', text: `메일 제목에 필수 문구 "${a.required_phrase}"가 없습니다.` },
    );
    if (a.snapshot)
      out.push(
        a.snapshot.resume.target === a.required_phrase
          ? { level: 'ok', text: '이력서 상단에 필수 문구 그대로 표기' }
          : { level: 'block', text: '이력서 상단 표기가 필수 문구와 다릅니다. 지원서 작성에서 서류를 다시 만드세요.' },
      );
  }
  if (!a.snapshot || !built) out.push({ level: 'block', text: '첨부할 서류가 없습니다. 지원서 작성에서 [서류 생성]을 다시 누르세요.' });
  else {
    out.push(
      built.resume.pages.length === 1 && !built.resume.overflow
        ? { level: 'ok', text: '이력서 1페이지' }
        : { level: 'warn', text: `이력서가 ${built.resume.pages.length}페이지입니다.` },
    );
    out.push(a.snapshot.photo ? { level: 'ok', text: '이력서에 증명사진 들어감' } : { level: 'warn', text: '이력서에 사진이 없습니다(빈 칸으로 나감).' });
    const r = a.snapshot.resume;
    const missing = [!r.name && '이름', !r.phone && '연락처', !r.email && '이메일', !r.address && '주소', !r.birth && '생년월일'].filter(Boolean);
    if (missing.length) out.push({ level: 'warn', text: `이력서 인적사항이 비어 있습니다: ${missing.join(', ')}` });
  }
  const extraSize = extras.reduce((n, f) => n + f.size, 0);
  if (EXTRA_SENTENCE.test(body) && extras.length === 0)
    out.push({ level: 'block', id: 'extra', text: '본문에 추가 서류를 "함께 첨부"했다고 적혀 있는데 추가 첨부 파일이 없습니다. 파일을 넣거나 그 문장을 빼세요. (Gmail 작성창으로 직접 보낼 때는 그 파일을 직접 첨부하면 됩니다)' });
  else if (extras.length)
    out.push(
      extraSize > EXTRA_LIMIT_BYTES
        ? { level: 'block', text: '추가 첨부가 너무 커서 여기서는 보낼 수 없습니다. 사진을 줄이거나 Gmail 작성창으로 직접 보내세요.' }
        : { level: 'ok', text: `추가 첨부 ${extras.length}개: ${extras.map((f) => f.name).join(', ')}` },
    );
  const today = todaySeoul();
  if (a.deadline && a.deadline < today) out.push({ level: 'warn', text: `마감일이 지났습니다 (${koreanDate(a.deadline)}).` });
  const docs = a.parsed?.submit_docs ?? [];
  if (docs.includes('주민등록등본') || docs.includes('통장 사본'))
    out.push({ level: 'warn', text: '공고가 등본·통장 사본을 요구합니다. 이 메일에는 들어가지 않습니다. 따로 보내거나 합격 후 제출 가능한지 문의하세요.' });
  const dup = store.apps.filter((x) => x.id !== a.id && x.status !== '작성중' && normalizeSite(x.site) === normalizeSite(a.site));
  if (dup.length) out.push({ level: 'warn', text: `같은 단지에 이미 지원한 기록이 있습니다 (${dup.map((d) => d.created_at.slice(0, 10)).join(', ')}).` });
  if (!sender) out.push({ level: 'block', text: '설정에서 "발송 Gmail 계정"을 먼저 적어 주세요. 어느 주소로 나가는지 확인한 뒤에만 보낼 수 있습니다.' });
  else if (sender !== profileEmail)
    out.push({
      level: 'warn',
      text: `보내는 계정(${sender})이 이력서 이메일(${profileEmail || '-'})과 다릅니다. 받는 쪽에는 ${sender}에서 온 메일로 보입니다. 본문 끝에 이력서 이메일을 회신 주소로 덧붙입니다.`,
    });
  else out.push({ level: 'ok', text: `보내는 계정: ${sender}` });
  return out;
}

/** 보내는 계정을 지정한 Gmail 작성창 (브라우저에 그 계정이 로그인돼 있어야 함) */
function fixedComposeUrl(sender: string, to: string, subject: string, body: string): string {
  const u = gmailComposeUrl(to, subject, body);
  return sender ? u.replace('https://mail.google.com/mail/?', `https://mail.google.com/mail/?authuser=${encodeURIComponent(sender)}&`) : u;
}

function finalBodyFor(body: string, store: Store): string {
  const sender = (store.prefs.sender_email ?? '').trim().toLowerCase();
  const email = store.profile.email.trim();
  if (sender && email && sender !== email.toLowerCase() && !body.includes(email)) return `${body.replace(/\s+$/, '')}\n이메일: ${email}`;
  return body;
}

function sendErrorText(e: unknown): { text: string; ambiguous: boolean } {
  const code = (e as { code?: string })?.code ?? 'upstream_error';
  const msg = (e as { message?: string })?.message ?? '';
  switch (code) {
    case 'needs_reauth':
      return { text: 'Gmail 연결이 만료됐습니다. claude.ai 설정 → 커넥터에서 Gmail을 다시 연결한 뒤 보내세요. 메일은 나가지 않았습니다.', ambiguous: false };
    case 'server_not_connected':
    case 'server_not_found':
      return { text: '이 claude.ai 계정에 Gmail이 연결되어 있지 않습니다. 설정 → 커넥터에서 Gmail을 추가하세요. 메일은 나가지 않았습니다.', ambiguous: false };
    case 'selection_required':
      return { text: 'Gmail 연결이 여러 개라 어느 것을 쓸지 골라야 합니다. 화면에 뜨는 선택 창에서 고른 뒤 다시 누르세요.', ambiguous: false };
    case 'not_in_manifest':
    case 'approval_required':
    case 'consent_required':
      return { text: '이 페이지가 Gmail을 쓰도록 허락해야 보낼 수 있습니다. 다시 누르면 허락 창이 뜹니다. 메일은 나가지 않았습니다.', ambiguous: false };
    case 'blocked_by_policy':
      return { text: '조직 정책으로 이 페이지에서 Gmail 발송이 막혀 있습니다.', ambiguous: false };
    case 'tool_error':
      return { text: `Gmail이 발송을 거절했습니다${msg ? `: ${msg.slice(0, 200)}` : ''}`, ambiguous: false };
    case 'bad_request':
    case 'transform_error':
      return { text: '보낼 내용을 만들지 못했습니다(첨부 크기 등). 메일은 나가지 않았습니다.', ambiguous: false };
    default:
      return { text: '발송됐는지 확실하지 않습니다. Gmail 보낸편지함을 먼저 확인하고, 없을 때만 다시 보내세요.', ambiguous: true };
  }
}

type AccountCheck = { state: 'idle' | 'checking' } | { state: 'found'; email: string } | { state: 'unknown'; why: string };

/** 연결된 Gmail 계정의 실제 주소: 보낸편지함 최근 메일의 발신 주소로 확인한다 */
async function connectedGmail(): Promise<AccountCheck> {
  const mcp = await (window as any).claude?.use?.('mcp');
  if (!mcp) return { state: 'unknown', why: '이 화면에서는 Gmail을 쓸 수 없습니다.' };
  try {
    const r = await mcp.callTool('Gmail', 'search_threads', { query: 'in:sent', pageSize: 1, view: 'THREAD_VIEW_METADATA_ONLY' }, { cache: false });
    const p = (r?.payload ?? {}) as { threads?: { messages?: { sender?: string }[] }[] };
    const sender = p.threads?.[0]?.messages?.[0]?.sender;
    const email = sender?.match(/[^\s<>]+@[^\s<>]+/)?.[0]?.toLowerCase();
    return email ? { state: 'found', email } : { state: 'unknown', why: '보낸편지함이 비어 있어 주소를 확인하지 못했습니다.' };
  } catch (e) {
    return { state: 'unknown', why: sendErrorText(e).text };
  }
}

function FinalCard({ a, store, fonts }: { a: AppRec; store: Store; fonts: Fonts }) {
  const [account, setAccount] = useState<AccountCheck>({ state: 'idle' });
  const [ackAccount, setAckAccount] = useState(false);
  const [to, setTo] = useState(a.selected_email ?? a.emails[0] ?? '');
  const [subject, setSubject] = useState(a.mail_subject);
  const [body, setBody] = useState(a.mail_body);
  const [ackWarn, setAckWarn] = useState(false);
  const [stage, setStage] = useState<'edit' | 'confirm' | 'sending'>('edit');
  const [error, setError] = useState<{ text: string; ambiguous: boolean } | null>(null);
  const [ackUnknown, setAckUnknown] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [extras, setExtras] = useState<ExtraFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedPdfs, setSavedPdfs] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const built = useMemo(() => (a.snapshot ? buildFromData(fonts, a.snapshot.resume, a.snapshot.letter, a.snapshot.photo) : null), [a.snapshot, fonts]);
  const checks = checksFor(a, store, built, to, subject, body, extras);
  const blocks = checks.filter((c) => c.level === 'block');
  /** 직접 보내기에서 막을 항목 ("함께 첨부" 문장은 직접 첨부하면 되므로 제외) */
  const manualBlocked = blocks.some((c) => c.id !== 'extra');
  const warns = checks.filter((c) => c.level === 'warn');
  const finalBody = finalBodyFor(body, store);
  const name = store.profile.name || '지원자';
  const files = { resume: docFileName('이력서', name, a.site, 'pdf'), letter: docFileName('자기소개서', name, a.site, 'pdf') };
  const unknownLock = a.send_state === 'unknown' && !ackUnknown;
  const canSend = !blocks.length && (!warns.length || ackWarn) && !unknownLock && store.mode === 'db';

  const [pdfLinks, setPdfLinks] = useState<{ resume: string; letter: string } | null>(null);
  async function saveBoth() {
    if (!built) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await toPdf(fonts, built.resume.pages, '이력서', dataUrlToPhoto(built.photo));
      const e1 = await saveFile(files.resume, r);
      const l = await toPdf(fonts, built.letter.pages, '자기소개서', null);
      const e2 = e1 === SAVE_UNAVAILABLE ? e1 : await saveFile(files.letter, l);
      if (e1 === SAVE_UNAVAILABLE || e2 === SAVE_UNAVAILABLE) {
        // 바로 저장이 안 되는 화면 → PDF 를 링크로 만들어 새 창에서 열게 한다
        const [u1, u2] = [await pdfLink(r), await pdfLink(l)];
        if (u1 && u2) {
          setPdfLinks({ resume: u1, letter: u2 });
          setSaveMsg(null);
        } else setSaveMsg('이 화면에서는 PDF를 저장할 수 없습니다. 컴퓨터의 크롬에서 claude.ai 에 로그인한 뒤 이 페이지 주소를 직접 열어 주세요.');
      } else if (e1 || e2) setSaveMsg(e1 || e2);
      else setSavedPdfs(true);
    } catch {
      setSaveMsg('PDF를 만들지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  // 최신 프로필·문구로 서류를 다시 만든다 (받는 사람은 유지)
  const [rebuilt, setRebuilt] = useState(false);
  async function rebuild() {
    const { rec } = buildDraft(store, a.posting_text, a.parsed, a.extra_docs ?? [], a);
    await store.saveApp({ ...rec, selected_email: a.selected_email ?? rec.selected_email }).catch(() => {});
    setSubject(rec.mail_subject);
    setBody(rec.mail_body);
    setRebuilt(true);
  }
  // 예전 양식으로 만든 작성중 서류는 한 번 저절로 새로 만든다
  useEffect(() => {
    if (a.status === '작성중' && (a.snapshot_v ?? 1) < SNAPSHOT_V && store.access !== 'none' && store.mode === 'db') void rebuild();
  }, [a.id, a.snapshot_v]); // eslint-disable-line react-hooks/exhaustive-deps

  const relayReady = !!(store.prefs.relay_url && store.prefs.relay_key && store.prefs.sender_email);
  const [relayMsg, setRelayMsg] = useState<{ text: string; level: 'info' | 'warn' | 'danger' | 'ok' } | null>(null);
  // 버튼을 누른 순간 바로 보낼 수 있게 PDF 를 미리 만들어 둔다 (기다렸다 보내면 브라우저가 새 창을 막는다)
  const [ready, setReady] = useState<{ resume: string; letter: string } | null>(null);
  useEffect(() => {
    let off = false;
    setReady(null);
    if (!built || !relayReady) return;
    (async () => {
      try {
        const r = await toPdf(fonts, built.resume.pages, '이력서', dataUrlToPhoto(built.photo));
        const l = await toPdf(fonts, built.letter.pages, '자기소개서', null);
        if (!off) setReady({ resume: toBase64(r), letter: toBase64(l) });
      } catch {
        if (!off) setRelayMsg({ text: 'PDF를 만들지 못했습니다. 새로고침해 보세요.', level: 'danger' });
      }
    })();
    return () => {
      off = true;
    };
  }, [built, relayReady]); // eslint-disable-line react-hooks/exhaustive-deps

  function relaySend() {
    if (!ready || !relayReady) return;
    const rid = `${a.id}-${Date.now().toString(36)}`;
    try {
      // await 없이 바로 보낸다
      submitRelay(store.prefs.relay_url!, store.prefs.relay_key!, {
        rid,
        to,
        subject,
        body: finalBody,
        from_name: store.profile.name || '정민욱',
        site: a.site,
        files: [
          { name: files.resume, type: 'application/pdf', b64: ready.resume },
          { name: files.letter, type: 'application/pdf', b64: ready.letter },
          ...extras.map((x) => ({ name: x.name, type: x.type, b64: x.b64 })),
        ],
      });
    } catch {
      setRelayMsg({ text: '발송 창을 열지 못했습니다. 메일은 나가지 않았습니다.', level: 'danger' });
      return;
    }
    setRelayMsg(null);
    // 발송기 창이 "보냈습니다" 신호를 보내면 그때 지원함으로 바꾼다 (App 의 신호 처리)
    store.patchApp(a.id, { mail_subject: subject, mail_body: finalBody, selected_email: to, send_state: 'relay', relay_job: rid }).catch(() => {});
  }

  // 보내는 중 상태가 오래가면 직접 확인하게 한다
  const [, setTick] = useState(0);
  useEffect(() => {
    if (a.send_state !== 'relay') return;
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, [a.send_state]);
  const pendingFor = a.send_state === 'relay' ? Date.now() - Date.parse(a.updated_at || a.created_at) : 0;

  async function markSent() {
    await store
      .patchApp(a.id, { status: '지원함', mail_subject: subject, mail_body: finalBody, selected_email: to, sent_at: new Date().toISOString(), send_state: 'sent', gmail_url: null })
      .catch(() => {});
    setConfirmSent(false);
  }

  async function persistEdits() {
    if (subject !== a.mail_subject || body !== a.mail_body || to !== (a.selected_email ?? ''))
      await store.patchApp(a.id, { mail_subject: subject, mail_body: body, selected_email: to || null }).catch(() => {});
  }

  async function send() {
    if (!built || !a.snapshot) return;
    setStage('sending');
    setError(null);
    try {
      const mcp = await (window as any).claude?.use?.('mcp');
      if (!mcp) {
        setError({ text: '이 화면에서는 Gmail로 보낼 수 없습니다. claude.ai에서 이 페이지를 열어 주세요. 메일은 나가지 않았습니다.', ambiguous: false });
        setStage('edit');
        return;
      }
      const resume = await toPdf(fonts, built.resume.pages, '이력서', dataUrlToPhoto(built.photo));
      const letter = await toPdf(fonts, built.letter.pages, '자기소개서', null);
      const res = await mcp.callTool('Gmail', 'send_message', {
        to: [to],
        subject,
        body: finalBody,
        attachments: [
          { content: toBase64(resume), filename: files.resume, mimeType: 'application/pdf' },
          { content: toBase64(letter), filename: files.letter, mimeType: 'application/pdf' },
          ...extras.map((f) => ({ content: f.b64, filename: f.name, mimeType: f.type })),
        ],
      });
      const p = (res?.payload ?? {}) as { viewUrl?: string };
      await store
        .patchApp(a.id, {
          status: '지원함',
          mail_subject: subject,
          mail_body: finalBody,
          selected_email: to,
          sent_at: new Date().toISOString(),
          send_state: 'sent',
          gmail_url: p.viewUrl ?? null,
        })
        .catch(() => {});
    } catch (e) {
      const err = sendErrorText(e);
      setError(err);
      if (err.ambiguous) await store.patchApp(a.id, { send_state: 'unknown', mail_subject: subject, mail_body: finalBody, selected_email: to }).catch(() => {});
      setStage('edit');
    }
  }

  return (
    <section className="card stack final-card">
      <div className="card-head">
        <h2>
          {a.site} <span className="muted">{a.title}</span>
        </h2>
        <span className="small muted">
          {a.send_state === 'queued' && <Pill tone="orange">정민욱 계정에서 발송 대기</Pill>} {a.created_at.slice(0, 10)} 작성
        </span>
      </div>

      <ul className="checks-list">
        {checks.map((c, i) => (
          <li key={i} className={`chk chk-${c.level}`}>
            <span aria-hidden="true">{c.level === 'ok' ? '✓' : c.level === 'warn' ? '!' : '✕'}</span>
            {c.text}
          </li>
        ))}
      </ul>

      {a.emails.length > 1 ? (
        <Field label="받는 사람">
          <select id={`fin-to-${a.id}`} value={to} onChange={(e) => setTo(e.target.value)} onBlur={persistEdits}>
            {a.emails.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="받는 사람">
          <input id={`fin-to-${a.id}`} value={to} onChange={(e) => setTo(e.target.value.trim())} onBlur={persistEdits} />
        </Field>
      )}
      <Field label="제목">
        <input id={`fin-subj-${a.id}`} value={subject} onChange={(e) => setSubject(e.target.value)} onBlur={persistEdits} />
      </Field>
      <Field label="본문 (보낼 때 이대로 나갑니다)">
        <textarea id={`fin-body-${a.id}`} rows={12} value={body} onChange={(e) => setBody(e.target.value)} onBlur={persistEdits} />
      </Field>
      {finalBody !== body && <div className="small muted">보낼 때 본문 끝에 &quot;이메일: {store.profile.email}&quot;이 덧붙습니다.</div>}

      <div className="attach">
        <span className="field-label">첨부</span>
        <div className="row wrap">
          <span className="file-chip">📄 {files.resume}</span>
          <span className="file-chip">📄 {files.letter}</span>
          {extras.map((f, i) => (
            <span key={i} className="file-chip">
              📎 {f.name}{' '}
              <button className="chip-x" aria-label={`${f.name} 빼기`} onClick={() => setExtras(extras.filter((_, j) => j !== i))}>
                ×
              </button>
            </span>
          ))}
          <Btn kind="quiet" onClick={() => setShowDocs(!showDocs)}>
            {showDocs ? '서류 접기' : '서류 보기'}
          </Btn>
          <Btn kind="quiet" onClick={rebuild} disabled={a.send_state === 'relay'}>
            최신 정보로 다시 만들기
          </Btn>
          {rebuilt && <span className="small ok-text">✓ 최신 프로필·문구로 다시 만들었습니다</span>}
        </div>
        <div className="row wrap">
          <label className="btn btn-plain file-btn">
            + 추가 서류 첨부 (자격증 사본 등)
            <input
              id={`fin-extra-${a.id}`}
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png"
              onChange={async (e) => {
                const list = Array.from(e.target.files ?? []);
                e.target.value = '';
                const read = await Promise.all(
                  list.map(async (f) => ({ name: f.name, type: f.type || 'application/octet-stream', size: f.size, b64: toBase64(new Uint8Array(await f.arrayBuffer())) })),
                );
                setExtras([...extras, ...read]);
              }}
            />
          </label>
          {EXTRA_SENTENCE.test(body) && (
            <Btn kind="quiet" onClick={() => setBody(body.replace(EXTRA_SENTENCE, ''))}>
              본문에서 &quot;함께 첨부&quot; 문장 빼기
            </Btn>
          )}
          <span className="small muted">추가 첨부 파일은 이 화면에서만 쓰고 저장하지 않습니다.</span>
        </div>
      </div>
      {showDocs && built && <DocPreviewCard fonts={fonts} built={built} name={name} site={a.site} title="첨부할 서류" />}

      {warns.length > 0 && (
        <label className="check ack">
          <input type="checkbox" id={`fin-ack-${a.id}`} checked={ackWarn} onChange={(e) => setAckWarn(e.target.checked)} />위 ! 항목을 확인했고 그대로 보냅니다
        </label>
      )}
      {a.send_state === 'unknown' && (
        <label className="check ack">
          <input type="checkbox" id={`fin-unk-${a.id}`} checked={ackUnknown} onChange={(e) => setAckUnknown(e.target.checked)} />
          Gmail 보낸편지함을 확인했는데 이 메일이 없습니다
        </label>
      )}
      {error && <Notice level={error.ambiguous ? 'warn' : 'danger'}>{error.text}</Notice>}
      {store.mode !== 'db' && <Notice level="warn">저장소에 연결된 claude.ai 화면에서만 보낼 수 있습니다.</Notice>}

      {stage === 'confirm' ? (
        <div className="confirm stack-s">
          <strong>정말 보낼까요? 보낸 메일은 되돌릴 수 없습니다.</strong>
          <div className="small">
            {store.prefs.sender_email} → {to}
            <br />
            제목: {subject}
            <br />
            첨부 2개 (이력서·자기소개서 PDF)
          </div>
          {account.state === 'checking' && <div className="small">연결된 Gmail 주소를 확인하는 중…</div>}
          {account.state === 'found' && account.email === (store.prefs.sender_email ?? '').toLowerCase() && (
            <div className="small ok-text">✓ 연결된 Gmail: {account.email}</div>
          )}
          {account.state === 'found' && account.email !== (store.prefs.sender_email ?? '').toLowerCase() && (
            <>
              <Notice level="warn">
                이 claude.ai 계정에 연결된 Gmail은 <b>{account.email}</b>이라 여기서는 보내지 않습니다. 지원 메일은 항상 <b>{store.prefs.sender_email}</b>에서만 나갑니다.
              </Notice>
              <div className="row wrap">
                <Btn
                  kind="primary"
                  onClick={async () => {
                    await store.patchApp(a.id, { send_state: 'queued', mail_subject: subject, mail_body: finalBody, selected_email: to }).catch(() => {});
                    setStage('edit');
                  }}
                >
                  정민욱 계정에서 보내도록 넘기기
                </Btn>
                <a className="btn btn-plain" href={fixedComposeUrl(store.prefs.sender_email ?? '', to, subject, finalBody)} target="_blank" rel="noreferrer noopener">
                  {store.prefs.sender_email} Gmail로 작성창 열기
                </a>
              </div>
              <div className="small muted">작성창은 이 브라우저에 {store.prefs.sender_email} 계정이 로그인돼 있을 때 열립니다. PDF는 위 [서류 보기]에서 저장해 직접 첨부하세요.</div>
            </>
          )}
          {account.state === 'unknown' && (
            <>
              <Notice level="warn">연결된 Gmail 주소를 확인하지 못했습니다. {account.why}</Notice>
              <label className="check ack">
                <input type="checkbox" id={`fin-acc-${a.id}`} checked={ackAccount} onChange={(e) => setAckAccount(e.target.checked)} />
                연결된 Gmail이 {store.prefs.sender_email} 인 것을 직접 확인했습니다
              </label>
            </>
          )}
          <div className="row">
            <Btn
              kind="primary"
              onClick={send}
              disabled={
                !(
                  (account.state === 'found' && account.email === (store.prefs.sender_email ?? '').toLowerCase()) ||
                  (account.state === 'unknown' && ackAccount)
                )
              }
            >
              지금 보내기
            </Btn>
            <Btn kind="quiet" onClick={() => setStage('edit')}>
              취소
            </Btn>
          </div>
        </div>
      ) : relayReady ? (
        <div className="stack-s">
          <div className="row wrap">
            <Btn kind="primary" className="big" disabled={!canSend || !ready || a.send_state === 'relay'} onClick={relaySend}>
              {a.send_state === 'relay' ? '보내는 중…' : ready ? `📨 ${store.prefs.sender_email}로 보내기` : 'PDF 준비 중…'}
            </Btn>
            {blocks.length > 0 && <span className="small warn-text">✕ 항목을 먼저 해결해야 보낼 수 있습니다.</span>}
          </div>
          <span className="small muted">
            누르면 새 창이 열리며 {store.prefs.sender_email} Gmail에서 이력서·자기소개서를 첨부해 보내고, 정민욱 Drive의 &quot;jobkit 지원서&quot; 폴더에 사본을 남깁니다. 지원 이력에도 바로 기록됩니다.
          </span>
          {relayMsg && <Notice level={relayMsg.level}>{relayMsg.text}</Notice>}
          {a.send_state === 'relay' && pendingFor < 25000 && <Notice level="info">보내는 중입니다… 새로 열린 창에서 발송기가 메일을 보내고 있습니다. 끝나면 여기에 &quot;완료했습니다&quot;가 뜹니다.</Notice>}
          {a.send_state === 'relay' && pendingFor >= 25000 && (
            <Notice level="warn">
              완료 신호가 오지 않았습니다. 새로 열린 창을 확인해 주세요.
              <span className="row wrap" style={{ marginTop: 8 }}>
                <Btn
                  kind="primary"
                  onClick={() =>
                    store
                      .patchApp(a.id, { status: '지원함', send_state: 'sent', sent_at: new Date().toISOString(), gmail_url: `https://mail.google.com/mail/?authuser=${encodeURIComponent(store.prefs.sender_email ?? '')}#sent` })
                      .catch(() => {})
                  }
                >
                  &quot;보냈습니다 ✓&quot;가 떴어요
                </Btn>
                <Btn onClick={() => store.patchApp(a.id, { send_state: null, relay_job: null }).catch(() => {})}>안 됐어요 — 다시 보내기</Btn>
              </span>
              <span className="small">
                창에 &quot;doPost&quot;나 &quot;함수를 찾을 수 없음&quot;이 보이면 발송기 코드가 옛 버전입니다. 설정 → 원클릭 발송 연결에서 코드를 다시 붙여넣고 새 버전으로 배포하세요.
              </span>
            </Notice>
          )}
        </div>
      ) : (
        <div className="stack-s">
          <div className="row wrap">
            <a className="btn btn-primary big" href="#prefs">
              📨 버튼 한 번 발송 켜기 (처음 한 번 설정)
            </a>
            {blocks.length > 0 && <span className="small warn-text">✕ 항목을 먼저 해결해야 보낼 수 있습니다.</span>}
          </div>
          <span className="small muted">
            이 claude.ai 에 연결된 Gmail은 개인 계정이라 여기서 바로 보내면 보낸 사람이 {store.prefs.sender_email}이 되지 않습니다. 설정 → &quot;원클릭 발송 연결&quot;에서 {store.prefs.sender_email} 계정에 발송기를 한 번 설치하면, 이
            자리에 [📨 {store.prefs.sender_email}로 보내기] 버튼이 생깁니다. 그 전까지는 아래 &quot;직접 보내기&quot;로 보낼 수 있습니다.
          </span>
        </div>
      )}

      {stage !== 'confirm' && (
        <details className="manual stack-s" open={!relayReady}>
          <summary>
            <strong>{store.prefs.sender_email || '정민욱'} Gmail로 직접 보내기{relayReady ? ' (예비 방법)' : ''}</strong>
          </summary>
          <span className="small muted">
            브라우저에 {store.prefs.sender_email} 구글 계정이 로그인돼 있으면 어느 컴퓨터에서든 됩니다.
            {EXTRA_SENTENCE.test(finalBody) ? ' 본문에 적힌 추가 서류(자격증 사본 등)도 직접 첨부하세요.' : ''}
          </span>
          <div className="row wrap">
            <Btn onClick={saveBoth} disabled={manualBlocked || saving}>
              {saving ? 'PDF 만드는 중…' : savedPdfs ? '① PDF 2개 저장됨 ✓' : '① PDF 2개 저장'}
            </Btn>
            {manualBlocked ? (
              <span className="btn btn-plain disabled-link">② 작성창 열기</span>
            ) : (
              <a className="btn btn-plain" href={fixedComposeUrl(store.prefs.sender_email ?? '', to, subject, finalBody)} target="_blank" rel="noreferrer noopener" onClick={persistEdits}>
                ② {store.prefs.sender_email || 'Gmail'} 작성창 열기
              </a>
            )}
            {confirmSent ? (
              <>
                <Btn kind="primary" onClick={markSent}>
                  보냄 확인 — 지원함으로 기록
                </Btn>
                <Btn kind="quiet" onClick={() => setConfirmSent(false)}>
                  취소
                </Btn>
              </>
            ) : (
              <Btn kind="primary" disabled={manualBlocked} onClick={() => setConfirmSent(true)}>
                ③ 보냄
              </Btn>
            )}
          </div>
          {pdfLinks && (
            <Notice level="info">
              이 화면에서는 바로 저장이 안 돼서 PDF를 링크로 만들었습니다. 아래를 눌러 새 창에서 열고 <b>다운로드(⬇)</b> 하세요.
              <span className="row wrap" style={{ marginTop: 6 }}>
                <a className="btn btn-plain" href={pdfLinks.resume} download={files.resume} target="_blank" rel="noreferrer noopener">
                  이력서 PDF 열기
                </a>
                <a className="btn btn-plain" href={pdfLinks.letter} download={files.letter} target="_blank" rel="noreferrer noopener">
                  자기소개서 PDF 열기
                </a>
              </span>
            </Notice>
          )}
          {saveMsg && <Notice level="warn">{saveMsg}</Notice>}
          <details className="small">
            <summary>보내는 방법 자세히</summary>
            <ol className="howto">
              <li>
                <b>① PDF 2개 저장</b>: 누르면 &quot;저장할까요?&quot; 확인 창이 뜹니다 → <b>저장</b>. 이력서·자기소개서가 &apos;다운로드&apos; 폴더에 들어갑니다.
              </li>
              <li>
                <b>② 작성창 열기</b>: 새 탭에 {store.prefs.sender_email || '정민욱'} Gmail 새 메일이 받는 사람·제목·본문이 채워진 채로 열립니다. 다른 계정으로 열리면 Gmail 오른쪽
                위 동그라미에서 {store.prefs.sender_email || '정민욱 계정'}으로 바꾸세요.
              </li>
              <li>
                Gmail 작성창 아래 <b>📎(파일 첨부)</b>를 눌러 다운로드 폴더의 PDF 2개를 고르고(또는 끌어다 놓고) <b>보내기</b>.
              </li>
              <li>
                이 페이지로 돌아와 <b>③ 보냄</b> → <b>지원함으로 기록</b>.
              </li>
            </ol>
            <p className="muted">
              휴대폰이나 Claude 앱 옆 창에서는 저장이 막힐 수 있습니다. 컴퓨터 크롬에서 claude.ai 에 로그인해 이 페이지 주소를 열면 가장 확실합니다.
            </p>
          </details>
          {manualBlocked && <span className="small warn-text">✕ 항목을 먼저 해결하세요.</span>}
        </details>
      )}
    </section>
  );
}

function FinalView({ store, fonts }: { store: Store; fonts: Fonts | null }) {
  const drafts = store.apps.filter((a) => a.status === '작성중');
  const sent = store.apps.filter((a) => a.send_state === 'sent' || (a.status !== '작성중' && a.sent_at)).slice(0, 15);
  const [delId, setDelId] = useState<string | null>(null);
  return (
    <div className="final stack">
      <section className="card stack-s">
        <h2>보낼 지원서</h2>
        <p className="small">
          공고 찾기에서 <b>지원</b>을 누르면 만든 서류가 여기에 모입니다. 받는 사람·제목·본문·첨부를 확인하고 <b>📨 보내기</b> 버튼 한 번이면 정민욱 Gmail로 나갑니다. 보내면 지원 이력에 &quot;지원함&quot;으로 기록됩니다.
        </p>
        <p className="small muted">
          보내는 계정: {store.prefs.sender_email ? <b>{store.prefs.sender_email}</b> : <a href="#prefs">설정에서 먼저 지정하세요</a>} ·{' '}
          {store.prefs.relay_url && store.prefs.relay_key ? (
            '원클릭 발송 연결됨'
          ) : (
            <>
              원클릭 발송 아직 안 됨 — <a href="#prefs">설정에서 한 번 연결</a>
            </>
          )}
        </p>
      </section>
      {!fonts && <Notice>폰트를 불러오는 중입니다.</Notice>}
      {fonts && drafts.length === 0 && (
        <section className="card empty">
          <p>
            보낼 준비가 된 지원서가 없습니다.
            <br />
            <a href="#jobs">공고 찾기</a>에서 마음에 드는 공고의 [지원]을 누르세요.
          </p>
        </section>
      )}
      {fonts && drafts.map((a) => <FinalCard key={a.id} a={a} store={store} fonts={fonts} />)}

      {sent.length > 0 && (
        <section className="card stack-s">
          <h2>보낸 지원</h2>
          <p className="small muted">기록을 삭제하면 지원 이력에서 빠지고, 그 공고가 공고 찾기에 다시 나옵니다. 이미 보낸 메일은 취소되지 않습니다.</p>
          {sent.map((a) => (
            <div key={a.id} className="row wrap small">
              <Pill tone="green">발송</Pill>
              <span>{a.sent_at ? a.sent_at.slice(0, 16).replace('T', ' ') : ''}</span>
              <b>{a.site}</b>
              <span className="muted">{a.selected_email}</span>
              {a.gmail_url && (
                <a href={a.gmail_url} target="_blank" rel="noreferrer noopener">
                  Gmail에서 보기
                </a>
              )}
              {delId === a.id ? (
                <>
                  <Btn
                    kind="danger"
                    onClick={() => {
                      void store.deleteApp(a.id).catch(() => {});
                      setDelId(null);
                    }}
                  >
                    삭제 확인
                  </Btn>
                  <Btn kind="quiet" onClick={() => setDelId(null)}>
                    취소
                  </Btn>
                </>
              ) : (
                <Btn kind="quiet" className="del-btn" onClick={() => setDelId(a.id)} aria-label={`${a.site} 지원 기록 삭제`}>
                  삭제
                </Btn>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ---------- 지원 이력 ----------

const STATUS_TONE: Record<ApplicationStatus, string> = { 작성중: 'gray', 지원함: 'blue', 연락옴: 'purple', 면접: 'orange', 합격: 'green', 불합격: 'red', 포기: 'gray' };

function csvCell(v: unknown) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function HistoryView({ store, fonts }: { store: Store; fonts: Fonts | null }) {
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [tab, setTab] = useState<'docs' | 'mail' | 'posting'>('docs');
  const [memo, setMemo] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const sel = store.apps.find((a) => a.id === selId) ?? null;

  const list = useMemo(() => {
    const t = q.trim();
    if (!t) return store.apps;
    const d = digitsOnly(t);
    const s = normalizeSite(t);
    return store.apps.filter(
      (a) => (d.length >= 3 && digitsOnly(a.phone).includes(d)) || normalizeSite(a.site).includes(s) || normalizeSite(a.company).includes(s) || a.emails.some((e) => e.includes(t.toLowerCase())),
    );
  }, [store.apps, q]);

  const built = useMemo(() => (sel?.snapshot && fonts ? buildFromData(fonts, sel.snapshot.resume, sel.snapshot.letter, sel.snapshot.photo) : null), [sel?.snapshot, fonts]);

  function open(a: AppRec) {
    setSelId(a.id);
    setMemo(a.memo);
    setSaved(false);
    setConfirmDel(false);
    setTab(a.snapshot ? 'docs' : 'posting');
  }

  async function exportCsv() {
    const header = ['날짜', '단지/사업장', '직책', '위탁사', '주소', '전화', '이메일', '마감일', '근무형태', '급여', '상태', '메모', '메일 제목'];
    const rows = store.apps.map((a) =>
      [a.created_at.slice(0, 10), a.site, a.title, a.company, a.address, a.phone, a.emails.join(' '), a.deadline ?? '', a.shift, a.salary_text, a.status, a.memo, a.mail_subject].map(csvCell).join(','),
    );
    setMsg(await saveFile(`지원이력_${todaySeoul()}.csv`, '﻿' + [header.map(csvCell).join(','), ...rows].join('\r\n')));
  }

  return (
    <div className="split history">
      <div className="col stack">
        <section className="card stack">
          <div className="card-head">
            <h2>지원 이력 <span className="muted">{store.apps.length}건</span></h2>
            <Btn onClick={exportCsv} disabled={!store.apps.length}>
              CSV 내보내기
            </Btn>
          </div>
          <input id="hist-q" placeholder="전화번호나 단지명으로 찾기 (예: 053-123-4567, 도남)" value={q} onChange={(e) => setQ(e.target.value)} />
          {msg && <Notice level="warn">{msg}</Notice>}
          <div className="table-wrap">
            <table className="tbl hover">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>단지</th>
                  <th>직책</th>
                  <th>위탁사</th>
                  <th>전화</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className={cx(a.id === selId && 'sel')} onClick={() => open(a)}>
                    <td className="nowrap num">{a.created_at.slice(0, 10)}</td>
                    <td>{a.site}</td>
                    <td>{a.title}</td>
                    <td className="small">{a.company}</td>
                    <td className="nowrap small num">{a.phone}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        className="mini"
                        aria-label="상태"
                        value={a.status}
                        onChange={(e) => store.patchApp(a.id, { status: e.target.value as ApplicationStatus }).catch(() => {})}
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      {store.apps.length ? '찾는 결과가 없습니다.' : '아직 지원 이력이 없습니다. 지원서 작성에서 서류를 만들면 여기에 쌓입니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div className="col">
        <div className="sticky stack">
          {sel ? (
            <>
              <section className="card stack">
                <div className="card-head">
                  <h2>
                    {sel.site} <span className="muted">{sel.title}</span> <Pill tone={STATUS_TONE[sel.status]}>{sel.status}</Pill>
                  </h2>
                  {confirmDel ? (
                    <div className="row">
                      <Btn
                        kind="danger"
                        onClick={() => {
                          void store.deleteApp(sel.id).catch(() => {});
                          setSelId(null);
                        }}
                      >
                        삭제 확인
                      </Btn>
                      <Btn kind="quiet" onClick={() => setConfirmDel(false)}>
                        취소
                      </Btn>
                    </div>
                  ) : (
                    <Btn kind="quiet" onClick={() => setConfirmDel(true)}>
                      삭제
                    </Btn>
                  )}
                </div>
                <dl className="kvs">
                  <KV k="위탁사">{sel.company}</KV>
                  <KV k="전화">{sel.phone}</KV>
                  <KV k="주소">{sel.address}</KV>
                  <KV k="마감">{sel.deadline ? koreanDate(sel.deadline) : ''}</KV>
                  <KV k="이메일">{sel.emails.join(', ')}</KV>
                </dl>
                <div className="seg">
                  {(
                    [
                      ['docs', '보낸 서류'],
                      ['mail', '메일'],
                      ['posting', '공고 원문'],
                    ] as const
                  ).map(([k, l]) => (
                    <button key={k} className={cx(tab === k && 'on')} onClick={() => setTab(k)}>
                      {l}
                    </button>
                  ))}
                </div>
                {tab === 'posting' && <pre className="pre">{sel.posting_text || '(원문 없음)'}</pre>}
                {tab === 'mail' && (
                  <div className="stack-s">
                    <div className="small">
                      <span className="muted">받는 사람</span> {sel.selected_email ?? sel.emails[0] ?? '-'}
                    </div>
                    <div className="small">
                      <span className="muted">제목</span> {sel.mail_subject}
                    </div>
                    {sel.sent_at && (
                      <div className="small">
                        <span className="muted">발송</span> {sel.sent_at.slice(0, 16).replace('T', ' ')}{' '}
                        {sel.gmail_url && (
                          <a href={sel.gmail_url} target="_blank" rel="noreferrer noopener">
                            Gmail에서 보기
                          </a>
                        )}
                      </div>
                    )}
                    <pre className="pre">{sel.mail_body}</pre>
                  </div>
                )}
                {tab === 'docs' && !built && <Notice>{fonts ? '저장된 서류 내용이 없습니다.' : '폰트를 불러오는 중입니다.'}</Notice>}
                <Field label="메모 (면접 일정, 통화 내용 등)">
                  <textarea id="hist-memo" rows={4} value={memo} onChange={(e) => (setMemo(e.target.value), setSaved(false))} />
                </Field>
                <div className="row">
                  <Btn
                    kind="primary"
                    onClick={async () => {
                      await store.patchApp(sel.id, { memo }).catch(() => {});
                      setSaved(true);
                    }}
                  >
                    메모 저장
                  </Btn>
                  {saved && <span className="small ok-text">저장했습니다</span>}
                </div>
              </section>
              {tab === 'docs' && built && fonts && <DocPreviewCard title="보낸 서류 (당시 내용 그대로)" fonts={fonts} built={built} name={sel.snapshot!.resume.name} site={sel.site} />}
            </>
          ) : (
            <section className="card empty">
              <p>목록에서 지원 건을 누르면 그때 만든 이력서·자기소개서와 공고 원문을 볼 수 있습니다.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- 프로필·문구 ----------

const BLOCK_GROUPS: { title: string; items: { key: BlockKey; label: string; help?: string }[] }[] = [
  { title: '성장과정', items: [{ key: 'growth', label: '성장과정 (고정)' }] },
  {
    title: '성격의 장점 및 보완점 = S1 + S2 + S3(근무형태별) + S4',
    items: [
      { key: 'strength_s1', label: 'S1' },
      { key: 'strength_s2', label: 'S2' },
      { key: 'strength_s3_gyeogil', label: 'S3 — 격일 근무 공고' },
      { key: 'strength_s3_gyodae', label: 'S3 — 3교대·주야교대 공고' },
      { key: 'strength_s3_default', label: 'S3 — 상근·기타 공고' },
      { key: 'strength_s4', label: 'S4' },
    ],
  },
  {
    title: '직무 관련 경험',
    items: [
      { key: 'experience', label: '본문', help: '{sales_years} 자리에 분양 경력 연수가 들어갑니다.' },
      { key: 'experience_no_apt_prefix', label: '접두어', help: '공고에서 아파트 근무 경력이 필수인데 없을 때 본문 앞에 붙습니다.' },
    ],
  },
  {
    title: '지원동기 = (근거리면 M1) + M2 + M3',
    items: [
      { key: 'motive_m1', label: 'M1 거리 문장', help: '주소가 근거리 지역일 때만 들어갑니다.' },
      { key: 'motive_m2', label: 'M2' },
      { key: 'motive_m3', label: 'M3 — 출근예정일 없을 때' },
      { key: 'motive_m3_start', label: 'M3 — 출근예정일 있을 때', help: '{start_date} = "2026년 10월 1일"' },
    ],
  },
  {
    title: '입사 후 포부 = G1({GAP}) + G2',
    items: [
      { key: 'goal_g1', label: 'G1', help: '{GAP} 자리에 약속 가능한 자격 문구가 들어갑니다.' },
      { key: 'goal_gap_suffix', label: 'GAP 끝맺음', help: '여러 개면 "A하고, B" + 끝맺음' },
      { key: 'goal_gap_default', label: 'GAP 기본 문구', help: '약속할 자격이 없을 때' },
      { key: 'goal_g2', label: 'G2' },
    ],
  },
  {
    title: '이력서 하단 "지원동기 및 자기소개"',
    items: [
      { key: 'resume_intro_1', label: '1문단' },
      { key: 'resume_intro_2', label: '2문단' },
      { key: 'resume_intro_3', label: '3문단' },
    ],
  },
  { title: '지원 메일 본문', items: [{ key: 'mail_body', label: '본문 틀', help: '{site} {title} {START} {DOCS} {SIGNATURE}' }] },
];

const BARRIER_LABEL: Record<Barrier, string> = { none: '없음', low: '낮음', medium: '중간', high: '높음' };

function ListEditor<T extends object>({ items, onChange, empty, render, addLabel }: { items: T[]; onChange: (v: T[]) => void; empty: T; render: (it: T, set: (p: Partial<T>) => void, i: number) => React.ReactNode; addLabel: string }) {
  return (
    <div className="stack-s">
      {items.map((it, i) => (
        <div key={i} className="list-item">
          <div className="grid-fields">{render(it, (p) => onChange(items.map((x, j) => (j === i ? { ...x, ...p } : x))), i)}</div>
          <div className="list-ctl">
            <Btn kind="quiet" aria-label="위로" disabled={i === 0} onClick={() => onChange(items.map((x, j) => (j === i - 1 ? items[i] : j === i ? items[i - 1] : x)))}>
              ↑
            </Btn>
            <Btn kind="quiet" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              삭제
            </Btn>
          </div>
        </div>
      ))}
      <div>
        <Btn onClick={() => onChange([...items, { ...empty }])}>+ {addLabel}</Btn>
      </div>
    </div>
  );
}

/** 밝은 배경 증명사진에서 인물(머리~목)의 가로 중심. 배경이 밝지 않으면 사진 가운데. */
function subjectCenterX(img: HTMLImageElement): number {
  const sw = Math.min(400, img.width);
  const sh = Math.round((img.height * sw) / img.width);
  const c = document.createElement('canvas');
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);
  const lum = (x: number, y: number) => {
    const i = (y * sw + x) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };
  const corners = [lum(2, 2), lum(sw - 3, 2)];
  if (corners.some((v) => v < 200)) return img.width / 2;
  const centers: number[] = [];
  for (let y = Math.floor(sh * 0.2); y < Math.floor(sh * 0.65); y++) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < sw; x++)
      if (lum(x, y) < 200) {
        if (l < 0) l = x;
        r = x;
      }
    if (l >= 0) centers.push((l + r) / 2);
  }
  if (centers.length < 5) return img.width / 2;
  centers.sort((a, b) => a - b);
  return (centers[Math.floor(centers.length / 2)] * img.width) / sw;
}

async function toPhotoDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const W = 354;
    const H = 472;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    const r = Math.max(W / img.width, H / img.height);
    const w = img.width * r;
    const h = img.height * r;
    // 가로가 남는 사진은 인물 중심에 맞춰 자른다 (사진 한가운데로 자르면 좌우가 틀어짐)
    const cx = subjectCenterX(img) * r;
    const x = w > W ? Math.min(0, Math.max(W - w, W / 2 - cx)) : (W - w) / 2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, x, (H - h) / 2, w, h);
    return c.toDataURL('image/jpeg', 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ProfileView({ store }: { store: Store }) {
  const [p, setP] = useState<ProfileData>(store.profile);
  const [quals, setQuals] = useState<Qualification[]>(store.quals);
  const [blocks, setBlocks] = useState<Blocks>(store.blocks);
  const [msg, setMsg] = useState<{ at: string; text: string; level: 'ok' | 'warn' | 'danger' } | null>(null);
  const dirtyP = JSON.stringify(p) !== JSON.stringify(store.profile);
  const dirtyB = JSON.stringify(blocks) !== JSON.stringify(store.blocks);
  const dirtyQ = JSON.stringify(quals) !== JSON.stringify(store.quals);

  // 저장소 값이 늦게 도착하면, 아직 손대지 않은 폼에 반영
  const prevStore = useRef(store);
  useEffect(() => {
    const prev = prevStore.current;
    if (JSON.stringify(p) === JSON.stringify(prev.profile)) setP(store.profile);
    if (JSON.stringify(blocks) === JSON.stringify(prev.blocks)) setBlocks(store.blocks);
    if (JSON.stringify(quals) === JSON.stringify(prev.quals)) setQuals(store.quals);
    prevStore.current = store;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.profile, store.blocks, store.quals]);

  const check = checkProfile({ ...p, photo_file: store.photo ? 'photo' : null });
  const req = new Set(check.required);
  const say = (at: string, text: string, level: 'ok' | 'warn' | 'danger' = 'ok') => setMsg({ at, text, level });
  const Msg = ({ at }: { at: string }) => (msg?.at === at ? <Notice level={msg.level}>{msg.text}</Notice> : null);
  const setM = (k: keyof ProfileData['military'], v: string) => setP({ ...p, military: { ...p.military, [k]: v } });

  async function saveProfile() {
    try {
      await store.saveProfile(p);
      const c = checkProfile({ ...p, photo_file: store.photo ? 'photo' : null });
      say('profile', c.required.length ? `저장했습니다. 비어 있는 필수 항목: ${c.required.join(', ')}` : '저장했습니다.', c.required.length ? 'warn' : 'ok');
    } catch {
      say('profile', store.mode === 'memory' ? '이 화면에서는 저장되지 않습니다.' : '저장하지 못했습니다.', 'danger');
    }
  }

  async function saveQuals(list = quals) {
    if (list.some((q) => !q.name.trim())) return say('quals', '이름이 빈 항목이 있습니다.', 'danger');
    try {
      await store.saveQuals(list);
      say('quals', '저장했습니다. 분석·판정·포부 문구에 바로 반영됩니다.');
    } catch {
      say('quals', '저장하지 못했습니다.', 'danger');
    }
  }

  return (
    <div className="stack">
      {check.required.length > 0 && <Notice level="warn">필수 입력이 비어 있습니다: {check.required.join(', ')}</Notice>}
      <div className="split">
        <div className="col stack">
          <section className="card stack">
            <div className="card-head">
              <h2>인적사항</h2>
              <Btn kind="primary" onClick={saveProfile} disabled={!dirtyP}>
                {dirtyP ? '프로필 저장' : '저장됨'}
              </Btn>
            </div>
            <p className="small muted">주민등록번호·계좌번호는 받지 않습니다. 생년월일까지만 저장합니다. 이 정보는 본인 계정으로만 볼 수 있습니다.</p>
            <div className="grid2">
              <Field label="이름 *" warn={req.has('이름')}>
                <input id="p-name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
              </Field>
              <Field label="생년월일 *" warn={req.has('생년월일')}>
                <input id="p-birth" type="date" value={p.birth} onChange={(e) => setP({ ...p, birth: e.target.value })} />
              </Field>
              <Field label="연락처 *" warn={req.has('연락처')}>
                <input id="p-phone" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} />
              </Field>
              <Field label="이메일 *" warn={req.has('이메일')}>
                <input id="p-email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} />
              </Field>
              <Field wide label="주소 *" warn={req.has('주소')}>
                <input id="p-addr" value={p.address} onChange={(e) => setP({ ...p, address: e.target.value })} />
              </Field>
            </div>
            <Msg at="profile" />
          </section>

          <section className="card stack">
            <h2>학력</h2>
            <ListEditor
              items={p.education}
              onChange={(education) => setP({ ...p, education })}
              empty={{ school: '', status: '졸업', major: '', start: '', end: '' }}
              addLabel="학력 추가"
              render={(e, set, i) => (
                <>
                  <Field label="학교명">
                    <input id={`edu-${i}-s`} value={e.school} onChange={(x) => set({ school: x.target.value })} />
                  </Field>
                  <Field label="전공">
                    <input id={`edu-${i}-m`} value={e.major} onChange={(x) => set({ major: x.target.value })} />
                  </Field>
                  <Field label="입학 (YYYY-MM)">
                    <input id={`edu-${i}-a`} value={e.start} onChange={(x) => set({ start: x.target.value })} />
                  </Field>
                  <Field label="졸업 (YYYY-MM)">
                    <input id={`edu-${i}-b`} value={e.end} onChange={(x) => set({ end: x.target.value })} />
                  </Field>
                  <Field label="구분">
                    <input id={`edu-${i}-st`} value={e.status} onChange={(x) => set({ status: x.target.value })} />
                  </Field>
                </>
              )}
            />
            <p className="small muted">마지막 줄이 이력서의 &quot;최종학력&quot;이 됩니다.</p>
          </section>

          <section className="card stack">
            <h2>병역</h2>
            <div className="grid3">
              <Field label="군별">
                <input id="m-branch" value={p.military.branch} onChange={(e) => setM('branch', e.target.value)} />
              </Field>
              <Field label="병과">
                <input id="m-corps" value={p.military.corps} onChange={(e) => setM('corps', e.target.value)} />
              </Field>
              <Field label="계급">
                <input id="m-rank" value={p.military.rank} onChange={(e) => setM('rank', e.target.value)} />
              </Field>
              <Field label="입대 (YYYY-MM)">
                <input id="m-start" value={p.military.start} onChange={(e) => setM('start', e.target.value)} />
              </Field>
              <Field label="전역 (YYYY-MM)">
                <input id="m-end" value={p.military.end} onChange={(e) => setM('end', e.target.value)} />
              </Field>
              <Field label="전역구분">
                <input id="m-dis" value={p.military.discharge} onChange={(e) => setM('discharge', e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="card stack">
            <h2>자격 및 면허 (이력서 표)</h2>
            <ListEditor
              items={p.licenses}
              onChange={(licenses) => setP({ ...p, licenses })}
              empty={{ name: '', issuer: '', date: '' }}
              addLabel="자격 추가"
              render={(l, set, i) => (
                <>
                  <Field label="자격/면허명">
                    <input id={`lic-${i}-n`} value={l.name} onChange={(x) => set({ name: x.target.value })} />
                  </Field>
                  <Field label="발급기관" warn={!l.issuer.trim()}>
                    <input id={`lic-${i}-i`} value={l.issuer} onChange={(x) => set({ issuer: x.target.value })} />
                  </Field>
                  <Field label="취득 (YYYY)" warn={!l.date.trim()}>
                    <input id={`lic-${i}-d`} value={l.date} onChange={(x) => set({ date: x.target.value })} />
                  </Field>
                </>
              )}
            />
            <p className="small muted">빈 칸은 PDF에 &quot;-&quot;로 나옵니다. 분석용 보유 여부는 오른쪽 &quot;보유 자격·경력&quot;에서 관리합니다.</p>
          </section>

          <section className="card stack">
            <h2>경력 (입력 순서대로 이력서에 표시)</h2>
            <ListEditor
              items={p.careers}
              onChange={(careers) => setP({ ...p, careers })}
              empty={{ start: '', end: '', company: '', duties: '' }}
              addLabel="경력 추가"
              render={(c, set, i) => (
                <>
                  <Field label="시작 (YYYY)">
                    <input id={`car-${i}-a`} value={c.start} onChange={(x) => set({ start: x.target.value })} />
                  </Field>
                  <Field label="종료 (YYYY)">
                    <input id={`car-${i}-b`} value={c.end} onChange={(x) => set({ end: x.target.value })} />
                  </Field>
                  <Field label="근무처">
                    <input id={`car-${i}-c`} value={c.company} onChange={(x) => set({ company: x.target.value })} />
                  </Field>
                  <Field wide label="담당업무">
                    <textarea id={`car-${i}-d`} rows={2} value={c.duties} onChange={(x) => set({ duties: x.target.value })} />
                  </Field>
                </>
              )}
            />
            <div className="row end">
              <Btn kind="primary" onClick={saveProfile} disabled={!dirtyP}>
                {dirtyP ? '프로필 저장' : '저장됨'}
              </Btn>
            </div>
          </section>
        </div>

        <div className="col stack">
          <section className="card stack">
            <h2>증명사진 (3×4)</h2>
            <div className="row top">
              <div className={cx('photo-box', !store.photo && 'empty')}>{store.photo ? <img src={store.photo} alt="증명사진" /> : '사진 없음'}</div>
              <div className="stack-s">
                <label className="btn btn-plain file-btn">
                  {store.photo ? '사진 바꾸기' : '사진 고르기'}
                  <input
                    id="photo-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (!f) return;
                      if (f.size > 15 * 1024 * 1024) return say('photo', '15MB 이하 사진을 고르세요.', 'danger');
                      try {
                        await store.savePhoto(await toPhotoDataUrl(f));
                        say('photo', '사진을 저장했습니다.');
                      } catch {
                        say('photo', '사진을 저장하지 못했습니다.', 'danger');
                      }
                    }}
                  />
                </label>
                <span className="small muted">3:4 비율로 가운데를 잘라 저장합니다.</span>
                {store.photo && (
                  <Btn kind="quiet" onClick={() => store.savePhoto(null).catch(() => {})}>
                    사진 지우기
                  </Btn>
                )}
                <Msg at="photo" />
              </div>
            </div>
          </section>

          <section className="card stack">
            <div className="card-head">
              <h2>보유 자격·경력 (분석 기준)</h2>
              <Btn kind="primary" onClick={() => saveQuals()} disabled={!dirtyQ}>
                {dirtyQ ? '목록 저장' : '저장됨'}
              </Btn>
            </div>
            <p className="small muted">&quot;보유&quot;를 바꾸면 바로 저장되어 판정과 포부 문구가 바뀝니다. 약속 가능 항목만 자기소개서에 &quot;취득 예정&quot;으로 들어갑니다.</p>
            {quals.map((q, i) => {
              const set = (patch: Partial<Qualification>) => setQuals(quals.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={q.id} className={cx('qual', q.have && 'have')}>
                  <div className="qual-top">
                    <input id={`q-${q.id}-n`} className="qual-name" value={q.name} onChange={(e) => set({ name: e.target.value })} aria-label="이름" />
                    <label className="check">
                      <input
                        type="checkbox"
                        id={`q-${q.id}-h`}
                        checked={q.have}
                        onChange={(e) => {
                          const next = quals.map((x, j) => (j === i ? { ...x, have: e.target.checked } : x));
                          setQuals(next);
                          void saveQuals(next);
                        }}
                      />
                      보유
                    </label>
                    <select id={`q-${q.id}-b`} aria-label="장벽" value={q.barrier} onChange={(e) => set({ barrier: e.target.value as Barrier })}>
                      {BARRIERS.map((b) => (
                        <option key={b} value={b}>
                          장벽 {BARRIER_LABEL[b]}
                        </option>
                      ))}
                    </select>
                    <label className="check">
                      <input type="checkbox" id={`q-${q.id}-p`} checked={q.promisable} onChange={(e) => set({ promisable: e.target.checked })} />
                      약속 가능
                    </label>
                    <Btn kind="quiet" onClick={() => setQuals(quals.filter((_, j) => j !== i))}>
                      삭제
                    </Btn>
                  </div>
                  <Field label="별칭 (쉼표로 구분 — 공고에 이 말이 있으면 매칭)">
                    <ListInput id={`q-${q.id}-a`} value={q.aliases} onChange={(aliases) => set({ aliases })} />
                  </Field>
                  {q.promisable && (
                    <Field label="포부 문구 (뒤에 '하여 업무 전문성을…'이 붙음)">
                      <input id={`q-${q.id}-pp`} value={q.promise_phrase} onChange={(e) => set({ promise_phrase: e.target.value })} />
                    </Field>
                  )}
                  <Field label="비고 (분석 표에만 표시)">
                    <input id={`q-${q.id}-hint`} value={q.hint} onChange={(e) => set({ hint: e.target.value })} />
                  </Field>
                </div>
              );
            })}
            <div>
              <Btn onClick={() => setQuals([...quals, { id: Date.now(), key: null, name: '', aliases: [], have: false, barrier: 'medium', promisable: false, promise_phrase: '', hint: '' }])}>+ 항목 추가</Btn>
            </div>
            <Msg at="quals" />
          </section>
        </div>
      </div>

      <section className="card stack">
        <div className="card-head">
          <h2>자기소개서·이력서·메일 문구</h2>
          <div className="row">
            <Btn kind="quiet" onClick={() => setBlocks(DEFAULT_BLOCKS)}>
              기본 문구로 되돌리기
            </Btn>
            <Btn
              kind="primary"
              disabled={!dirtyB}
              onClick={async () => {
                try {
                  await store.saveBlocks(blocks);
                  say('blocks', '문구를 저장했습니다. 다음 서류부터 적용됩니다.');
                } catch {
                  say('blocks', '저장하지 못했습니다.', 'danger');
                }
              }}
            >
              {dirtyB ? '문구 저장' : '저장됨'}
            </Btn>
          </div>
        </div>
        <Msg at="blocks" />
        <p className="small muted">사실만 적으세요. 공고마다 바뀌는 건 아래 변형 슬롯뿐입니다. **굵게** 로 감싼 부분은 PDF에서 굵은 진한 파랑이 됩니다.</p>
        <div className="blocks">
          {BLOCK_GROUPS.map((g) => (
            <div key={g.title} className="stack-s">
              <h3>{g.title}</h3>
              {g.items.map((it) => (
                <Field key={it.key} label={it.label} hint={it.help}>
                  <textarea id={`b-${it.key}`} rows={it.key === 'mail_body' ? 14 : 3} value={blocks[it.key]} onChange={(e) => setBlocks({ ...blocks, [it.key]: e.target.value })} />
                </Field>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------- 설정 ----------

function RelaySetup({ store }: { store: Store }) {
  const sender = store.prefs.sender_email || 'mwjung2002@gmail.com';
  const [url, setUrl] = useState(store.prefs.relay_url ?? '');
  const [msg, setMsg] = useState<{ text: string; level: 'ok' | 'warn' | 'danger' | 'info' } | null>(null);
  const [showCode, setShowCode] = useState(false);
  useEffect(() => setUrl(store.prefs.relay_url ?? ''), [store.prefs.relay_url]);
  const key = store.prefs.relay_key ?? '';
  const ready = !!(store.prefs.relay_url && key);

  async function ensureKey() {
    if (key) return key;
    const k = newKey();
    await store.savePrefs({ ...store.prefs, relay_key: k });
    return k;
  }
  async function copyCode() {
    const k = await ensureKey().catch(() => '');
    if (!k) return setMsg({ text: '열쇠를 저장하지 못했습니다. 잠시 뒤 다시 누르세요.', level: 'danger' });
    const ok = await copyText(relayScript(k));
    setShowCode(!ok);
    setMsg(ok ? { text: '발송기 코드를 복사했습니다. Apps Script 편집기에 붙여넣으세요.', level: 'ok' } : { text: '복사가 막혀 아래에 코드를 펼쳤습니다. 전부 선택해 복사하세요.', level: 'warn' });
  }
  async function saveUrl() {
    if (!validRelayBase(url)) return setMsg({ text: '"https://script.google.com/macros/s/…/exec" 모양의 웹 앱 URL을 붙여넣으세요.', level: 'danger' });
    const k = await ensureKey();
    await store.savePrefs({ ...store.prefs, relay_url: url.trim(), relay_key: k });
    setMsg({ text: '저장했습니다. [연결 확인]을 눌러 새 창에 "연결됨 ✓"가 뜨는지 보세요.', level: 'ok' });
  }

  return (
    <section className="card stack relay-setup">
      <div className="card-head">
        <h2>원클릭 발송 연결 (처음 한 번만)</h2>
        {ready ? <Pill tone="green">연결됨</Pill> : <Pill tone="orange">아직 안 됨</Pill>}
      </div>
      <p className="small">
        연결해 두면 <b>보낼 지원서</b>에서 버튼 한 번으로 {sender} Gmail에서 이력서·자기소개서 PDF를 첨부해 보냅니다. {sender} 계정에 설치한 작은 발송기(Google Apps Script)가
        메일을 보내고, {sender} Google Drive의 &quot;jobkit 지원서&quot; 폴더에 보낸 서류 사본을 남깁니다. 다운로드·첨부는 필요 없고, 어느 컴퓨터·계정에서 이 페이지를 열어도 됩니다.
      </p>
      <ol className="howto">
        <li>
          <b>{sender}</b> 계정으로 로그인된 브라우저에서{' '}
          <a href={`https://script.google.com/create?authuser=${encodeURIComponent(sender)}`} target="_blank" rel="noreferrer noopener">
            Apps Script 새 프로젝트 열기
          </a>
          .
        </li>
        <li>
          <Btn onClick={copyCode}>발송기 코드 복사</Btn> → 편집기에 원래 있던 글을 모두 지우고 붙여넣기 → 💾 저장.
        </li>
        <li>
          오른쪽 위 <b>배포 → 새 배포</b> → 유형 선택(⚙) <b>웹 앱</b> → 실행 사용자 <b>나({sender})</b>, 액세스 권한이 있는 사용자 <b>모든 사용자</b> → <b>배포</b>.
        </li>
        <li>
          <b>액세스 승인</b> → {sender} 선택 → &quot;Google에서 확인하지 않은 앱&quot;이 뜨면 <b>고급 → (안전하지 않음)으로 이동 → 허용</b>. 직접 만든 발송기라 뜨는 안내입니다.
        </li>
        <li>
          나온 <b>웹 앱 URL</b>을 복사해 아래에 붙여넣고 저장 → <b>연결 확인</b>.
        </li>
      </ol>
      {showCode && key && <textarea readOnly rows={10} value={relayScript(key)} onFocus={(e) => e.currentTarget.select()} />}
      <Field label="웹 앱 URL" hint="https://script.google.com/macros/s/…/exec">
        <input id="relay-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
      </Field>
      <div className="row wrap">
        <Btn kind="primary" onClick={saveUrl}>
          저장
        </Btn>
        {validRelayBase(store.prefs.relay_url ?? '') && (
          <a className="btn btn-plain" href={pingUrl(store.prefs.relay_url!)} target="_blank" rel="noreferrer noopener">
            연결 확인
          </a>
        )}

      </div>
      {msg && <Notice level={msg.level}>{msg.text}</Notice>}
      <p className="small muted">
        <b>이미 배포했던 경우(코드 바꾸기):</b> 코드를 다시 복사해 붙여넣고 💾 저장 → <b>배포 → 배포 관리 → ✏(수정) → 버전: 새 버전 → 배포</b>. 웹 앱 URL은 그대로라 다시 넣을 필요 없습니다. 지금 코드는 v{RELAY_VERSION}이고,
        [연결 확인] 창에 &quot;연결됨 ✓ (v{RELAY_VERSION})&quot;이 보이면 최신입니다.
      </p>
    </section>
  );
}

function PrefsView({ store }: { store: Store }) {
  const [sig, setSig] = useState(store.prefs.mail_signature);
  const [sender, setSender] = useState(store.prefs.sender_email ?? '');
  const [msg, setMsg] = useState<{ text: string; level: 'ok' | 'warn' | 'danger' } | null>(null);
  const [importText, setImportText] = useState('');
  const [confirmImport, setConfirmImport] = useState(false);

  useEffect(() => {
    setSig(store.prefs.mail_signature);
    setSender(store.prefs.sender_email ?? '');
  }, [store.prefs]);

  async function save() {
    const s: Prefs = { ...store.prefs, mail_signature: sig, sender_email: sender.trim().toLowerCase() };
    try {
      await store.savePrefs(s);
      setMsg({ text: '저장했습니다.', level: 'ok' });
    } catch {
      setMsg({ text: '저장하지 못했습니다.', level: 'danger' });
    }
  }

  async function exportJson() {
    const body = JSON.stringify(
      { app: 'jobkit', version: 1, exported_at: new Date().toISOString(), profile: store.profile, photo: store.photo, quals: store.quals, blocks: store.blocks, prefs: store.prefs, apps: store.apps },
      null,
      1,
    );
    const err = await saveFile(`jobkit_백업_${todaySeoul()}.json`, body);
    setMsg(err ? { text: err, level: 'warn' } : null);
  }

  async function doImport() {
    try {
      const d = JSON.parse(importText);
      if (d.app !== 'jobkit') throw new Error('x');
      if (d.profile) await store.saveProfile({ ...EMPTY_PROFILE, ...d.profile });
      if ('photo' in d) await store.savePhoto(d.photo ?? null);
      if (Array.isArray(d.quals)) await store.saveQuals(d.quals);
      if (d.blocks) await store.saveBlocks({ ...DEFAULT_BLOCKS, ...d.blocks });
      if (d.prefs) await store.savePrefs(d.prefs);
      if (Array.isArray(d.apps)) for (const a of d.apps) await store.saveApp(a);
      setMsg({ text: '백업을 불러왔습니다.', level: 'ok' });
      setImportText('');
      setConfirmImport(false);
    } catch {
      setMsg({ text: 'jobkit 백업 파일 내용이 아닙니다. 파일 전체를 그대로 붙여넣으세요.', level: 'danger' });
      setConfirmImport(false);
    }
  }

  return (
    <div className="prefs stack">
      <div className="split">
        <section className="card stack">
          <h2>통근 계산</h2>
          <p className="small">
            지역 이름 목록 대신 <b>집 주소와 공고 주소 사이 거리</b>, 지하철 3호선·버스 노선으로 대중교통 편도 시간을 추정합니다. 정확한 시간은 공고마다 있는
            <b> 카카오맵 길찾기</b>로 확인하세요(집·근무지가 자동으로 채워집니다).
          </p>
          <div>
            <dl className="kv">
              <dt>출발지</dt>
              <dd>{store.profile.address || '내 정보에서 주소를 넣어 주세요'}</dd>
            </dl>
            <dl className="kv">
              <dt>좌표</dt>
              <dd>{store.prefs.home_geo ? `${store.prefs.home_geo.lat.toFixed(4)}, ${store.prefs.home_geo.lng.toFixed(4)}` : '없음 (동별 표로만 추정)'}</dd>
            </dl>
            <dl className="kv">
              <dt>기준</dt>
              <dd>
                목표 {store.criteria.commute_limit}분 · 최대 {store.criteria.commute_max}분 — <a href="#jobs">공고 찾기</a> 왼쪽 "지원 기준"에서 바꿉니다.
              </dd>
            </dl>
          </div>
        </section>
        <section className="card stack">
          <h2>메일 서명</h2>
          <Field label="메일 본문 끝 {SIGNATURE} 자리" hint="{name} {phone} {email} 은 프로필 값으로 바뀝니다.">
            <textarea id="pref-sig" rows={4} value={sig} onChange={(e) => setSig(e.target.value)} />
          </Field>
          <Field
            label="발송 Gmail 계정 (최종확인에서 바로 보낼 때 쓰는 주소)"
            hint="이 페이지를 연 claude.ai 계정에 연결된 Gmail 주소를 적으세요. 받는 쪽에는 이 주소가 보낸 사람으로 보입니다. 비워 두면 바로 보내기가 꺼집니다."
          >
            <input id="pref-sender" type="email" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="예: someone@gmail.com" />
          </Field>
          <div className="row">
            <Btn kind="primary" onClick={save}>
              설정 저장
            </Btn>
          </div>
          {msg && <Notice level={msg.level}>{msg.text}</Notice>}
        </section>
      </div>
      <RelaySetup store={store} />
      <section className="card stack">
        <h2>백업</h2>
        <p className="small">프로필·사진·문구·지원 이력 전체를 JSON 파일 하나로 저장합니다. 개인정보가 들어 있으니 안전한 곳에 보관하세요.</p>
        <div className="row">
          <Btn onClick={exportJson}>백업 파일 저장</Btn>
        </div>
        <Field label="백업 불러오기 (백업 파일 내용을 그대로 붙여넣기)">
          <textarea id="pref-import" rows={4} value={importText} onChange={(e) => setImportText(e.target.value)} />
        </Field>
        <div className="row">
          {confirmImport ? (
            <>
              <Btn kind="danger" onClick={doImport}>
                지금 데이터를 백업 내용으로 덮어쓰기
              </Btn>
              <Btn kind="quiet" onClick={() => setConfirmImport(false)}>
                취소
              </Btn>
            </>
          ) : (
            <Btn onClick={() => setConfirmImport(true)} disabled={!importText.trim()}>
              불러오기
            </Btn>
          )}
        </div>
      </section>
      <section className="card stack small">
        <h2>저장과 보안</h2>
        <p>이 페이지의 데이터(프로필·사진·공고·지원 이력·발송 설정)는 이 링크를 여는 모든 사람이 함께 봅니다. 링크는 정민욱 님과 관리하는 분만 가지고 있고, 다른 사람에게 주지 마세요.</p>
        <p>주민등록번호·등본·통장 사본·계좌번호는 입력받지도 저장하지도 않습니다. 추가 첨부 체크박스는 메일 문구용입니다.</p>
      </section>
    </div>
  );
}

// ---------- 앱 ----------

const VIEWS = [
  { id: 'jobs', label: '공고 찾기' },
  { id: 'final', label: '보낼 지원서' },
  { id: 'history', label: '지원 이력' },
  { id: 'profile', label: '내 정보·문구' },
  { id: 'prefs', label: '설정' },
] as const;
type ViewId = (typeof VIEWS)[number]['id'] | 'apply';

function readHash(): ViewId {
  const h = location.hash.replace('#', '');
  if (h === 'apply') return 'apply';
  return (VIEWS.find((v) => v.id === h)?.id ?? 'jobs') as ViewId;
}

function App() {
  const store = useStore();
  const { fonts, error: fontError } = useFonts();
  const [view, setView] = useState<ViewId>(readHash());
  const [toast, setToast] = useState<{ level: 'ok' | 'danger'; text: string } | null>(null);
  // 발송기 창이 보내는 완료 신호
  const appsRef = useRef(store);
  appsRef.current = store;
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (!isRelaySignal(e.data)) return;
      const st = appsRef.current;
      const app = st.apps.find((x) => x.relay_job === e.data.rid);
      if (!app) return;
      if (e.data.ok) {
        if (app.send_state !== 'sent')
          st.patchApp(app.id, {
            status: '지원함',
            send_state: 'sent',
            sent_at: new Date().toISOString(),
            gmail_url: `https://mail.google.com/mail/?authuser=${encodeURIComponent(st.prefs.sender_email ?? '')}#sent`,
          }).catch(() => {});
        setToast({ level: 'ok', text: `완료했습니다 ✓ ${app.site} 지원서를 ${app.selected_email ?? ''}(으)로 보냈습니다. 지원 이력에 기록했습니다.` });
      } else {
        st.patchApp(app.id, { send_state: null, relay_job: null }).catch(() => {});
        setToast({ level: 'danger', text: `보내지 못했습니다 — ${e.data.msg.slice(0, 200)}` });
      }
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);
  useEffect(() => {
    const on = () => setView(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return (
    <>
      <header className="top">
        <div className="top-in">
          <div className="brand">
            jobkit<span>구직 서류</span>
          </div>
          <nav>
            {VIEWS.map((v) => (
              <a key={v.id} href={`#${v.id}`} className={cx(view === v.id && 'on')}>
                {v.label}
              </a>
            ))}
          </nav>
          <div className="store-state small">
            {store.mode === 'loading' && '불러오는 중…'}
            {store.mode === 'db' && (store.slow ? '저장소 연결이 느립니다' : store.profile.name ? `${store.profile.name} 님` : '저장됨')}
            {store.mode === 'memory' && '저장 안 됨'}
          </div>
        </div>
      </header>
      <main className="page-main">
        {store.mode === 'db' && store.access === 'none' && (
          <Notice level="warn">
            이 계정은 이 페이지를 <b>보기만</b> 할 수 있습니다. 공고와 서류는 볼 수 있지만, 고치거나 지원 기록을 남기려면 페이지 주인이 공유 메뉴에서 이 계정을 <b>편집자(또는 참여자)</b>로 추가해야 합니다.
          </Notice>
        )}
        {store.mode === 'memory' && <Notice level="warn">이 화면에서는 저장소를 쓸 수 없어 입력 내용이 저장되지 않습니다. claude.ai에 로그인한 상태로 열어 주세요.</Notice>}
        {store.error && <Notice level="danger">{store.error}</Notice>}
        {toast && (
          <div className={cx('toast', `toast-${toast.level}`)} role="status">
            <span>{toast.text}</span>
            <button className="linklike" onClick={() => setToast(null)}>
              닫기
            </button>
          </div>
        )}
        {fontError && <Notice level="danger">{fontError}</Notice>}
        {view === 'apply' && <ApplyView store={store} fonts={fonts} />}
        {view === 'jobs' && <JobsView store={store} fonts={fonts} />}
        {view === 'final' && <FinalView store={store} fonts={fonts} />}
        {view === 'history' && <HistoryView store={store} fonts={fonts} />}
        {view === 'profile' && <ProfileView key={store.mode} store={store} />}
        {view === 'prefs' && <PrefsView store={store} />}
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
