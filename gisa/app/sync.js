// 기록 동기화: claude.ai 계정의 개인 저장소(db의 data/users/<내 id>/save)에 기록을 올리고 내려받는다.
//  - 이 계정으로 로그인해서 연 모든 기기(아이폰·맥)가 같은 기록을 이어 쓴다. 다른 사람과는 섞이지 않는다.
//  - 그냥 파일로 열었거나(window.claude 없음) 로그인이 안 돼 있으면 쓸 수 없고, 기록은 이 브라우저에만 저장된다.
//  - 올리기 전에 항상 서버 기록을 읽어 와 합친다(P.merge). 그래서 한 기기가 다른 기기 기록을 덮어쓰지 않는다.
(function (G) {
  'use strict';
  const P = G.progress;
  const DEBOUNCE_MS = 3000;
  const MAX_JSON = 220000; // 문서 한도(256 KiB) 아래로 유지

  let hooks = null; // { getState(), apply(merged, info), onStatus() }
  let ref = null;
  let timer = null;
  let chain = Promise.resolve(); // 동시에 두 번 돌지 않게 한 줄로 세움
  const status = { state: 'starting', at: 0, message: '' };
  // starting | unavailable | syncing | ok | readonly | error | off

  function set(state, message) {
    status.state = state;
    status.message = message || '';
    if (state === 'ok') status.at = Date.now();
    if (hooks && hooks.onStatus) hooks.onStatus(status);
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function withRetry(fn) {
    try {
      return await fn();
    } catch (e) {
      if (e && e.code === 'unavailable') {
        await wait(400 + Math.random() * 600);
        return fn();
      }
      throw e;
    }
  }

  function encode(state) {
    let json = P.canon(P.syncView(state));
    if (json.length > MAX_JSON) {
      const slim = P.syncView(state);
      slim.history = slim.history.slice(-150);
      json = P.canon(slim);
    }
    return json;
  }

  function enabled() {
    const st = hooks && hooks.getState();
    return !!st && st.settings.syncOn !== false;
  }

  // 한 번의 동기화: 서버 읽기 → 합치기 → (바뀌었으면) 이 기기 적용 → (서버와 다르면) 올리기
  async function runOnce() {
    if (!ref || !enabled()) return;
    set('syncing');
    try {
      const snap = await withRetry(() => ref.get());
      const local = hooks.getState();
      let remote = null;
      let remoteJson = '';
      if (snap.exists) {
        const body = snap.data() || {};
        remoteJson = typeof body.json === 'string' ? body.json : '';
        try {
          remote = P.normalize(JSON.parse(remoteJson));
        } catch (e) {
          remote = null; // 깨진 서버 기록은 이 기기 기록으로 덮어쓴다
        }
      }
      const merged = remote ? P.merge(local, remote) : local;
      const localJson = P.canon(P.syncView(local));
      const mergedJson = P.canon(P.syncView(merged));
      const changedHere = mergedJson !== localJson;
      if (changedHere) hooks.apply(merged, { hadLocal: local.total.n > 0, hadRemote: !!remote });
      const out = changedHere ? merged : local;
      const outJson = encode(out);
      if (!remote || outJson !== remoteJson) {
        await withRetry(() => ref.set({ json: outJson, t: Date.now() }));
      }
      set('ok');
    } catch (e) {
      const code = (e && e.code) || '';
      if (code === 'invalid_argument') set('readonly', '이 계정은 기록을 저장할 권한이 없어(보기 전용으로 열었을 수 있어).');
      else if (code === 'quota_exceeded') set('error', '저장 공간이 가득 찼어.');
      else if (code === 'revoked') set('error', '접근 권한이 바뀌었어. 페이지를 새로 열어 줘.');
      else set('error', '서버와 연결이 잠깐 끊겼어. 기록은 이 기기에 저장돼 있어.');
    }
  }

  function syncNow() {
    chain = chain.then(runOnce, runOnce);
    return chain;
  }

  // 기록이 바뀔 때마다 부르면, 잠깐 모았다가 한 번만 동기화한다
  function schedule() {
    if (!ref || !enabled()) return;
    clearTimeout(timer);
    timer = setTimeout(syncNow, DEBOUNCE_MS);
  }

  async function init(h) {
    hooks = h;
    try {
      if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') return set('unavailable');
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return set('unavailable');
      const id = await user.id();
      if (!id) return set('unavailable');
      ref = db.doc('data/users/' + id + '/save');
    } catch (e) {
      return set('unavailable');
    }
    if (!enabled()) {
      set('off');
    } else {
      await syncNow();
    }
    // 다른 기기에서 쓰다 돌아왔을 때 최신 기록을 받아 온다
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && enabled()) syncNow();
      else if (document.visibilityState === 'hidden' && timer) {
        clearTimeout(timer);
        syncNow(); // 탭을 떠나기 전에 밀린 기록을 올린다
      }
    });
  }

  // 설정에서 켜고 끌 때
  function setEnabled(on) {
    if (!ref) return;
    if (on) syncNow();
    else set('off');
  }

  G.sync = { init, schedule, syncNow, setEnabled, status: () => status, available: () => !!ref };
})(globalThis.GISA);
