import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { zipSync } from 'fflate';
import { parsePosting, type ParsedPosting, type Category } from '../../lib/parser';
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
import { EMPTY_PROFILE, useStore, type AppRec, type Store } from './store';
import { DEFAULT_BLOCKS } from './defaults';
import { SAMPLE_POSTING } from './sample';

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

let downloadsNs: Promise<any> | null = null;
async function saveFile(filename: string, data: Uint8Array | string): Promise<string | null> {
  downloadsNs ??= (window as any).claude?.use?.('downloads') ?? Promise.resolve(null);
  const dl = await downloadsNs;
  if (!dl) return '이 화면에서는 파일을 저장할 수 없습니다. claude.ai에서 열어 주세요.';
  try {
    const blob = typeof data === 'string' ? new Blob([data]) : new Blob([data as BlobPart]);
    await dl.save({ filename, data: blob });
    return null;
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === 'declined') return null;
    if (code === 'rate_limited') return '저장 창이 이미 열려 있습니다. 잠시 뒤 다시 누르세요.';
    return '파일을 저장하지 못했습니다.';
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

  const analysis = useMemo(() => {
    if (!parsed) return null;
    return analyze(analyzedText, parsed, {
      qualifications: store.quals,
      settings: store.prefs,
      history: historyOf(store.apps),
      today,
      currentApplicationId: appId ? idNum(appId) : null,
    });
  }, [parsed, analyzedText, store.quals, store.prefs, store.apps, appId, today]);

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
    const profile = { ...store.profile, photo_file: store.photo ? 'photo' : null };
    const input = { profile, blocks: store.blocks, parsed, analysis, today };
    const resumeData = composeResume(input);
    const letterData = composeLetter(input);
    const b = buildFromData(fonts, resumeData, letterData, store.photo);
    setBuilt(b);
    const subj = mailSubject(parsed, store.profile.name);
    const mb = mailBody({ template: store.blocks.mail_body, parsed, profile: store.profile, settings: store.prefs, extraDocs });
    setSubject(subj);
    setBody(mb);
    const recipient = parsed.emails[0] ?? '';
    setTo(recipient);
    const now = new Date().toISOString();
    const reuse = app && app.status === '작성중';
    const rec: AppRec = {
      id: reuse ? app.id : newId(),
      created_at: reuse ? app.created_at : now,
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
      posting_text: analyzedText,
      parsed,
      mail_subject: subj,
      mail_body: mb,
      selected_email: recipient || null,
      extra_docs: extraDocs,
      status: '작성중',
      memo: reuse ? app.memo : '',
      snapshot: { resume: resumeData, letter: letterData, photo: store.photo },
    };
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
              <li>Gmail 새 메일 열기 → PDF 첨부 → 보내기 → [지원함으로 기록]</li>
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
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
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

function PrefsView({ store }: { store: Store }) {
  const [kw, setKw] = useState(store.prefs.near_keywords.join('\n'));
  const [sig, setSig] = useState(store.prefs.mail_signature);
  const [msg, setMsg] = useState<{ text: string; level: 'ok' | 'warn' | 'danger' } | null>(null);
  const [importText, setImportText] = useState('');
  const [confirmImport, setConfirmImport] = useState(false);

  useEffect(() => {
    setKw(store.prefs.near_keywords.join('\n'));
    setSig(store.prefs.mail_signature);
  }, [store.prefs]);

  async function save() {
    const s: Settings = { near_keywords: splitList(kw), mail_signature: sig };
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
          <h2>근거리 지역</h2>
          <Field label="한 줄에 하나씩 (공고 주소에 이 말이 있으면 근거리)" hint="근거리일 때만 지원동기에 거리 문장이 들어가고, 아니면 '통근 거리 직접 확인' 경고가 뜹니다.">
            <textarea id="pref-kw" rows={9} value={kw} onChange={(e) => setKw(e.target.value)} />
          </Field>
        </section>
        <section className="card stack">
          <h2>메일 서명</h2>
          <Field label="메일 본문 끝 {SIGNATURE} 자리" hint="{name} {phone} {email} 은 프로필 값으로 바뀝니다.">
            <textarea id="pref-sig" rows={4} value={sig} onChange={(e) => setSig(e.target.value)} />
          </Field>
          <div className="row">
            <Btn kind="primary" onClick={save}>
              설정 저장
            </Btn>
          </div>
          {msg && <Notice level={msg.level}>{msg.text}</Notice>}
        </section>
      </div>
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
        <p>이 페이지의 데이터는 claude.ai 계정별 비공개 저장소에 저장됩니다. 이 페이지를 다른 사람과 공유해도 그 사람은 내 프로필·사진·지원 이력을 볼 수 없습니다.</p>
        <p>주민등록번호·등본·통장 사본·계좌번호는 입력받지도 저장하지도 않습니다. 추가 첨부 체크박스는 메일 문구용입니다.</p>
      </section>
    </div>
  );
}

// ---------- 앱 ----------

const VIEWS = [
  { id: 'apply', label: '지원서 작성' },
  { id: 'history', label: '지원 이력' },
  { id: 'profile', label: '프로필·문구' },
  { id: 'prefs', label: '설정' },
] as const;
type ViewId = (typeof VIEWS)[number]['id'];

function readHash(): ViewId {
  const h = location.hash.replace('#', '');
  return (VIEWS.find((v) => v.id === h)?.id ?? 'apply') as ViewId;
}

function App() {
  const store = useStore();
  const { fonts, error: fontError } = useFonts();
  const [view, setView] = useState<ViewId>(readHash());
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
        {store.mode === 'memory' && <Notice level="warn">이 화면에서는 저장소를 쓸 수 없어 입력 내용이 저장되지 않습니다. claude.ai에 로그인한 상태로 열어 주세요.</Notice>}
        {store.error && <Notice level="danger">{store.error}</Notice>}
        {fontError && <Notice level="danger">{fontError}</Notice>}
        {view === 'apply' && <ApplyView store={store} fonts={fonts} />}
        {view === 'history' && <HistoryView store={store} fonts={fonts} />}
        {view === 'profile' && <ProfileView key={store.mode} store={store} />}
        {view === 'prefs' && <PrefsView store={store} />}
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
