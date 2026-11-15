// AI에게 물어본 내용 저장: 매일 복습 알림(예약 작업)이 읽어 갈 수 있게 한다.
//  - 이 브라우저(localStorage)에 먼저 쌓고, claude.ai에서 열었으면 아티팩트 db의 aiqa/ 아래에도 올린다.
//  - aiqa/ 는 주인(owner)만 읽고 쓸 수 있게 열어 둔다(공개 링크로 보는 사람에게는 안 보임).
//  - 주인이 아니거나 db를 못 쓰면 이 브라우저에만 남긴다.
(function (G) {
  'use strict';

  const KEY = 'gisa-aiqa';
  const MAX_LOCAL = 300;
  let db = null;
  let ownerOk = false;
  let status = 'starting'; // starting | cloud | local

  const read = () => {
    try {
      const a = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  };
  const write = (a) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(a.slice(-MAX_LOCAL)));
    } catch (e) {
      /* 저장소를 못 쓰는 환경이면 이번 화면에서만 */
    }
  };

  async function push(rec) {
    if (!db || !ownerOk) return false;
    try {
      await db.doc('aiqa/' + rec.id).set({ id: rec.id, ts: rec.ts, q: rec.q, a: rec.a, where: rec.where || '', key: rec.key || '', sentCount: 0, lastSent: '' });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function flush() {
    const a = read();
    let changed = false;
    for (const r of a) {
      if (!r.synced && (await push(r))) {
        r.synced = true;
        changed = true;
      }
    }
    if (changed) write(a);
  }

  // 질문과 답을 저장(답이 끝난 뒤에 부른다)
  function save(o) {
    const q = String((o && o.q) || '').trim();
    const a = String((o && o.a) || '').trim();
    if (!q || !a) return;
    const ts = Date.now();
    const rec = { id: ts.toString(36) + Math.random().toString(36).slice(2, 6), ts, q: q.slice(0, 800), a: a.slice(0, 3000), where: (o.where || '').slice(0, 80), key: o.key || '', synced: false };
    const list = read();
    list.push(rec);
    write(list);
    push(rec).then((ok) => {
      if (ok) {
        const cur = read();
        const it = cur.find((x) => x.id === rec.id);
        if (it) {
          it.synced = true;
          write(cur);
        }
      }
    });
  }

  async function init() {
    try {
      if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') return (status = 'local');
      const [d, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      ownerOk = !!(user && user.isOwner && user.isOwner());
      db = d;
      status = db && ownerOk ? 'cloud' : 'local';
      if (status === 'cloud') await flush();
    } catch (e) {
      status = 'local';
    }
  }

  G.aiqa = { save, init, count: () => read().length, pending: () => read().filter((r) => !r.synced).length, status: () => status, list: read };
  init();
})(globalThis.GISA);
