// 저장소: claude.ai Artifact 의 db 기능. 모든 데이터는 본인만 읽을 수 있는 data/users/<id>/ 아래에 둔다.
// db 를 쓸 수 없는 화면(로그아웃 상태, 미리보기)에서는 이 화면 안에서만 유지한다.

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
}

export interface StoreData {
  profile: ProfileData;
  photo: string | null;
  quals: Qualification[];
  blocks: Blocks;
  prefs: Settings;
  apps: AppRec[];
}

export type StoreMode = 'loading' | 'db' | 'memory';

export interface Store extends StoreData {
  mode: StoreMode;
  slow: boolean;
  error: string | null;
  saveProfile(p: ProfileData): Promise<void>;
  savePhoto(dataUrl: string | null): Promise<void>;
  saveQuals(q: Qualification[]): Promise<void>;
  saveBlocks(b: Blocks): Promise<void>;
  savePrefs(s: Settings): Promise<void>;
  saveApp(a: AppRec): Promise<void>;
  patchApp(id: string, patch: Partial<AppRec>): Promise<void>;
  deleteApp(id: string): Promise<void>;
}

const strip = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function errText(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === 'quota_exceeded') return '저장 공간이 가득 찼습니다. 오래된 지원 이력을 지워 주세요.';
  if (code === 'invalid_argument') return '저장할 수 없는 값이 있습니다(사진이 너무 크거나 권한 없음).';
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
  });
  const [mode, setMode] = useState<StoreMode>('loading');
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
      const uid = user ? await user.id() : null;
      if (cancelled) return;
      if (!db || !uid) {
        clearTimeout(timer);
        setMode('memory');
        return;
      }
      const base = `data/users/${uid}`;
      ref.current = { db, base };
      setMode('db');
      const pending = new Set(['profile', 'photo', 'quals', 'blocks', 'prefs', 'apps']);
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
      sub('prefs', (d) => ({ prefs: d ? ({ ...DEFAULT_PREFS, ...(d as object) } as Settings) : DEFAULT_PREFS }));
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
