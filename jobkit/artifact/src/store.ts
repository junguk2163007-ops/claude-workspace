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
  /** 최종확인 화면에서 Gmail 로 보낸 기록 */
  sent_at?: string | null;
  /** sent 보냄 / unknown 보냈는지 불확실 / queued 정민욱 계정에서 보내도록 넘김 */
  send_state?: 'sent' | 'unknown' | 'queued' | null;
  gmail_url?: string | null;
}

/** 앱 설정 + 발송 계정 (최종확인 화면용) */
export type Prefs = Settings & { sender_email?: string };

export type JobSource = 'dghma' | 'jobkorea' | 'saramin';

/** 수집기(collector/collect.ts)가 저장하는 공고 한 건 */
export interface JobItem {
  id: string;
  source: JobSource;
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
  apply_channels: string[];
  email_apply: boolean;
  commute: { verdict: 'ok' | 'edge' | 'far' | 'unknown'; min: number | null; area: string | null; route: string | null; matched: string | null };
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
      const pending = new Set(['profile', 'photo', 'quals', 'blocks', 'prefs', 'apps']);
      for (const src of ['dghma', 'jobkorea', 'saramin'] as JobSource[])
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
      sub('prefs', (d) => ({ prefs: d ? ({ ...DEFAULT_PREFS, ...(d as object) } as Prefs) : DEFAULT_PREFS }));
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
