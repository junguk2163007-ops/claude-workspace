// 저장소: claude.ai Artifact 의 db 기능. 정민욱 님과 관리자가 함께 보고 고치도록 shared/ 아래에 둔다.
// 링크로 들어온 계정은 모두 읽을 수 있고(read: view), 고치기는 참여자(interact) 이상만 된다 — 게시할 때 규칙으로 정한다.
// db 를 쓸 수 없는 화면(로그아웃 상태, 미리보기)에서는 이 화면 안에서만 유지한다.

/** 공유 데이터 위치 (컬렉션) */
export const SHARED = 'shared';

import { useEffect, useRef, useState } from 'react';
import type { Blocks, ProfileData, Qualification, Settings, ApplicationStatus, Shift } from '../../lib/types';
import type { ParsedPosting } from '../../lib/parser';
import type { LetterData, ResumeData } from '../../lib/render/compose';
import { DEFAULT_BLOCKS, DEFAULT_PREFS, DEFAULT_QUALS } from './defaults';
import type { TailorDoc } from './tailor';
import { DEFAULT_CRITERIA, type ChatMessage, type Criteria } from './criteria';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyDb = any;

export const EMPTY_PROFILE: ProfileData = {
  name: '',
  birth: '',
  phone: '',
  email: '',
  address: '',
  education: [],
  military: { branch: '', corps: '', rank: '', start: '', end: '', discharge: '' },
  licenses: [],
  careers: [],
};

export interface Snapshot {
  resume: ResumeData;
  letter: LetterData;
  photo: string | null;
}

export interface AppRec {
  id: string;
  created_at: string;
  updated_at: string;
  site: string;
  title: string;
  company: string;
  address: string;
  phone: string;
  emails: string[];
  deadline: string | null;
  shift: Shift;
  salary_text: string;
  required_phrase: string | null;
  posting_text: string;
  parsed: ParsedPosting;
  mail_subject: string;
  mail_body: string;
  selected_email: string | null;
  extra_docs: string[];
  status: ApplicationStatus;
  memo: string;
  snapshot: Snapshot | null;
  /** 공고에 맞춰 다시 쓴 때 */
  tailored_at?: string | null;
  /** 어느 공고로 만든 서류인지 (공고 id) */
  job_id?: string | null;
  /** 맞춤 글 종류: rule = 공고 내용으로 바로 쓴 글, ai = 미리(또는 AI 로) 써 둔 글 */
  tailored_kind?: 'rule' | 'ai' | null;
  /** 바로 쓴 글의 표현 번호 (다시 쓰기마다 바뀐다) */
  tailor_variant?: number;
  /** 맞춤 글을 일부러 되돌렸으면 다시 저절로 입히지 않는다 */
  tailor_off?: boolean;
  /** 서류 양식 버전 (오르면 작성중 서류를 최신 정보로 다시 만든다) */
  snapshot_v?: number;
  /** 최종확인 화면에서 Gmail 로 보낸 기록 */
  sent_at?: string | null;
  /** sent 보냄 / unknown 보냈는지 불확실 / queued 정민욱 계정에서 보내도록 넘김 */
  send_state?: 'sent' | 'unknown' | 'queued' | 'relay' | null;
  /** 원클릭 발송 요청 파일 (Drive id) */
  relay_job?: string | null;
  gmail_url?: string | null;
}

/** 앱 설정 + 발송 계정 (최종확인 화면용) */
export type Prefs = Settings & {
  sender_email?: string;
  /** 테스트 공고의 접수 이메일 (보내지는지 확인용, 내 주소) */
  test_email?: string;
  home_geo?: { lat: number; lng: number } | null;
  /** 원클릭 발송기(정민욱 계정 Apps Script 웹앱) 주소와 열쇠 */
  relay_url?: string;
  relay_key?: string;
  /** 이 화면(claude.ai)이 페이지 안 상자(iframe)를 막는지 — 막으면 바로 새 탭으로 보낸다 */
  frames_blocked?: boolean;
  /** 마지막 [연결 확인]에서 확인한 발송기 코드 버전 */
  relay_version?: number;
  /** 서류를 올리는 Google Drive 폴더 */
  drive_folder_id?: string;
};

export type JobSource = 'dghma' | 'jobkorea' | 'saramin' | 'work24' | 'manual';

/** 수집기(collector/collect.ts)가 저장하는 공고 한 건 */
export interface JobItem {
  id: string;
  source: JobSource;
  /** 출처 사이트 이름 */
  origin?: string;
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
  email_apply: boolean;
  commute: { verdict: 'ok' | 'edge' | 'far' | 'unknown'; min: number | null; area: string | null; route: string | null; matched: string | null };
  geo?: { lat: number; lng: number } | null;
  /** 처음 발견한 때 (ISO). NEW 표시에 쓴다 */
  first_seen?: string;
  /** 이번에 스캔한 때 (ISO) */
  scanned_at?: string;
  posted: string;
  text: string;
}

export interface JobList {
  source: JobSource;
  updated_at: string;
  scanned: number;
  kept: number;
  errors: string[];
  items: JobItem[];
}

export interface StoreData {
  profile: ProfileData;
  photo: string | null;
  quals: Qualification[];
  blocks: Blocks;
  prefs: Prefs;
  apps: AppRec[];
  jobs: Partial<Record<JobSource, JobList>>;
  criteria: Criteria;
  chat: ChatMessage[];
  /** 공고에 없던 이메일을 직접 알아내 넣은 것 (공고 id → 주소) */
  jobEmails: Record<string, string>;
  /** 마지막 자동/수동 스캔 요약 */
  scanStatus: ScanStatus | null;
  /** 미리 써 둔 공고 맞춤 글 (공고 id → 글) */
  tailors: Record<string, TailorDoc>;
  /** 공고별 새로고침 요청 (공고 id → 요청 시각) */
  scanRequests: Record<string, string>;
}

export interface ScanStatus {
  last_scan_at: string;
  last_full_scan_at?: string;
  finished_at: string;
  kind: string;
  sources: Record<string, { scanned: number; kept: number; new: number; errors: number; kept_previous?: boolean }>;
  new_total: number;
  single: { job: string; source: string; found: boolean } | null;
}

export type StoreMode = 'loading' | 'db' | 'memory';
/** 'full' 읽기·쓰기 / 'none' 이 계정은 보기만 가능(고칠 수 없음) / 'unknown' 아직 모름 */
export type Access = 'unknown' | 'full' | 'none';

export interface Store extends StoreData {
  mode: StoreMode;
  access: Access;
  slow: boolean;
  error: string | null;
  saveProfile(p: ProfileData): Promise<void>;
  savePhoto(dataUrl: string | null): Promise<void>;
  saveQuals(q: Qualification[]): Promise<void>;
  saveBlocks(b: Blocks): Promise<void>;
  savePrefs(s: Prefs): Promise<void>;
  saveCriteria(c: Criteria): Promise<void>;
  saveChat(m: ChatMessage[]): Promise<void>;
  saveJobEmail(jobId: string, email: string | null): Promise<void>;
  saveScanRequest(jobId: string, at: string | null): Promise<void>;
  saveManualJobs(items: JobItem[]): Promise<void>;
  saveJobs(source: JobSource, items: JobItem[]): Promise<void>;
  saveApp(a: AppRec): Promise<void>;
  patchApp(id: string, patch: Partial<AppRec>): Promise<void>;
  deleteApp(id: string): Promise<void>;
}

const strip = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function errText(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === 'quota_exceeded') return '저장 공간이 가득 찼습니다. 오래된 지원 이력을 지워 주세요.';
  if (code === 'invalid_argument') return '저장하지 못했습니다. 이 계정은 이 페이지의 데이터를 고칠 권한이 없거나(공유 수준 확인), 사진이 너무 큽니다.';
  return '저장하지 못했습니다. 잠시 뒤 다시 시도하세요.';
}

export function useStore(): Store {
  const [data, setData] = useState<StoreData>({
    profile: EMPTY_PROFILE,
    photo: null,
    quals: DEFAULT_QUALS,
    blocks: DEFAULT_BLOCKS,
    prefs: DEFAULT_PREFS,
    apps: [],
    jobs: {},
    criteria: DEFAULT_CRITERIA,
    chat: [],
    jobEmails: {},
    scanStatus: null,
    tailors: {},
    scanRequests: {},
  });
  const [mode, setMode] = useState<StoreMode>('loading');
  const [access, setAccess] = useState<Access>('unknown');
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<{ db: AnyDb; base: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unsubs: (() => void)[] = [];
    const timer = setTimeout(() => !cancelled && setSlow(true), 10000);
    (async () => {
      const claude = (window as any).claude;
      const [db, user] = await Promise.all([claude?.use?.('db') ?? null, claude?.use?.('user') ?? null]);
      if (cancelled) return;
      if (!db) {
        clearTimeout(timer);
        setMode('memory');
        return;
      }
      const canWrite: boolean | null = user ? await user.can('data.write') : null;
      if (canWrite === false) setAccess('none');
      const base = SHARED;
      ref.current = { db, base };
      setMode('db');
      const pending = new Set(['profile', 'photo', 'quals', 'blocks', 'prefs', 'apps', 'criteria', 'criteria_chat', 'job_emails', 'scan_status', 'scan_requests']);
      for (const src of ['dghma', 'jobkorea', 'saramin', 'work24', 'manual'] as JobSource[])
        unsubs.push(
          db.doc(`${base}/jobs_${src}`).onSnapshot(
            (sn: any) => setData((prev) => ({ ...prev, jobs: { ...prev.jobs, [src]: sn.exists ? (sn.data() as JobList) : undefined } })),
            () => {},
          ),
        );
      const done = (k: string, fromCache: boolean) => {
        if (fromCache) return;
        pending.delete(k);
        if (!pending.size) {
          clearTimeout(timer);
          setSlow(false);
        }
      };
      const onErr = () => setError('저장된 데이터를 불러오지 못했습니다. 새로고침해 보세요.');
      const sub = (name: string, apply: (d: Record<string, unknown> | undefined) => Partial<StoreData>) =>
        unsubs.push(
          db.doc(`${base}/${name}`).onSnapshot((s: any) => {
            setData((prev) => ({ ...prev, ...apply(s.exists ? s.data() : undefined) }));
            done(name, s.metadata.fromCache);
          }, onErr),
        );
      sub('profile', (d) => ({ profile: d ? ({ ...EMPTY_PROFILE, ...(d as object) } as ProfileData) : EMPTY_PROFILE }));
      sub('photo', (d) => ({ photo: (d?.dataUrl as string) || null }));
      sub('quals', (d) => ({ quals: d && Array.isArray(d.list) ? (d.list as Qualification[]) : DEFAULT_QUALS }));
      sub('blocks', (d) => ({ blocks: d ? ({ ...DEFAULT_BLOCKS, ...(d as object) } as Blocks) : DEFAULT_BLOCKS }));
      sub('criteria', (d) => ({ criteria: d ? ({ ...DEFAULT_CRITERIA, ...(d as object) } as Criteria) : DEFAULT_CRITERIA }));
      sub('scan_status', (d) => ({ scanStatus: d && typeof d.last_scan_at === 'string' ? (d as unknown as ScanStatus) : null }));
      sub('scan_requests', (d) => ({ scanRequests: d && typeof d.map === 'object' && d.map ? (d.map as Record<string, string>) : {} }));
      sub('job_emails', (d) => ({ jobEmails: d && typeof d.map === 'object' && d.map ? (d.map as Record<string, string>) : {} }));
      sub('criteria_chat', (d) => ({ chat: d && Array.isArray(d.messages) ? (d.messages as ChatMessage[]) : [] }));
      sub('prefs', (d) => ({ prefs: d ? ({ ...DEFAULT_PREFS, ...(d as object) } as Prefs) : DEFAULT_PREFS }));
      unsubs.push(
        db
          .doc(`${base}/tailor`)
          .collection('list')
          .onSnapshot(
            (s: any) => {
              const map: Record<string, TailorDoc> = {};
              for (const d of s.docs) map[d.id] = d.data() as TailorDoc;
              setData((prev) => ({ ...prev, tailors: map }));
            },
            () => {},
          ),
      );
      unsubs.push(
        db
          .doc(`${base}/apps`)
          .collection('list')
          .onSnapshot((s: any) => {
            const apps = s.docs.map((d: any) => ({ ...(d.data() as AppRec), id: d.id }));
            apps.sort((a: AppRec, b: AppRec) => (a.created_at < b.created_at ? 1 : -1));
            setData((prev) => ({ ...prev, apps }));
            done('apps', s.metadata.fromCache);
          }, onErr),
      );
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubs.forEach((u) => u());
    };
  }, []);

  async function write(path: string, body: Record<string, unknown>) {
    const r = ref.current;
    if (!r) return;
    try {
      await r.db.doc(`${r.base}/${path}`).set(strip(body));
      setError(null);
    } catch (e) {
      setError(errText(e));
      throw e;
    }
  }

  const local = (patch: Partial<StoreData>) => setData((prev) => ({ ...prev, ...patch }));

  return {
    ...data,
    mode,
    access,
    slow,
    error,
    async saveProfile(p) {
      local({ profile: p });
      await write('profile', p as unknown as Record<string, unknown>);
    },
    async savePhoto(dataUrl) {
      local({ photo: dataUrl });
      await write('photo', { dataUrl });
    },
    async saveQuals(list) {
      local({ quals: list });
      await write('quals', { list });
    },
    async saveBlocks(b) {
      local({ blocks: b });
      await write('blocks', b as unknown as Record<string, unknown>);
    },
    async savePrefs(s) {
      local({ prefs: s });
      await write('prefs', s as unknown as Record<string, unknown>);
    },
    async saveCriteria(c) {
      local({ criteria: c });
      await write('criteria', c as unknown as Record<string, unknown>);
    },
    async saveChat(messages) {
      const keep = messages.slice(-40);
      local({ chat: keep });
      await write('criteria_chat', { messages: keep });
    },
    async saveJobEmail(jobId, email) {
      const map = { ...data.jobEmails };
      if (email) map[jobId] = email;
      else delete map[jobId];
      local({ jobEmails: map });
      await write('job_emails', { map });
    },
    async saveScanRequest(jobId, at) {
      const map = { ...data.scanRequests };
      if (at) map[jobId] = at;
      else delete map[jobId];
      local({ scanRequests: map });
      await write('scan_requests', { map });
    },
    async saveManualJobs(items) {
      const now = new Date().toISOString();
      const doc: JobList = { ...(data.jobs.manual ?? ({} as JobList)), source: 'manual', updated_at: now, scanned: items.length, kept: items.length, errors: [], items } as JobList;
      setData((prev) => ({ ...prev, jobs: { ...prev.jobs, manual: doc } }));
      await write('jobs_manual', doc as unknown as Record<string, unknown>);
    },
    async saveJobs(source, items) {
      const cur = data.jobs[source];
      if (!cur) return;
      const doc: JobList = { ...cur, kept: items.length, items };
      setData((prev) => ({ ...prev, jobs: { ...prev.jobs, [source]: doc } }));
      await write(`jobs_${source}`, doc as unknown as Record<string, unknown>);
    },
    async saveApp(a) {
      setData((prev) => ({ ...prev, apps: [a, ...prev.apps.filter((x) => x.id !== a.id)] }));
      const { id, ...body } = a;
      await write(`apps/list/${id}`, body as unknown as Record<string, unknown>);
    },
    async patchApp(id, patch) {
      const cur = data.apps.find((x) => x.id === id);
      if (!cur) return;
      const next = { ...cur, ...patch, updated_at: new Date().toISOString() };
      setData((prev) => ({ ...prev, apps: prev.apps.map((x) => (x.id === id ? next : x)) }));
      const { id: _i, ...body } = next;
      await write(`apps/list/${id}`, body as unknown as Record<string, unknown>);
    },
    async deleteApp(id) {
      local({ apps: data.apps.filter((x) => x.id !== id) });
      const r = ref.current;
      if (r) await r.db.doc(`${r.base}/apps/list/${id}`).delete();
    },
  };
}
