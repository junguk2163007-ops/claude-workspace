// localStorage 저장. 사파리 개인정보 보호 모드처럼 저장이 막혀도 앱은 돌아가게 한다.
(function (G) {
  'use strict';
  const KEY = 'gisa.v1';
  let available = true;

  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      return G.progress.normalize(raw ? JSON.parse(raw) : null);
    } catch (e) {
      available = false;
      return G.progress.emptyState();
    }
  }

  function save(state) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
      available = true;
      return true;
    } catch (e) {
      available = false;
      return false;
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(KEY);
    } catch (e) {
      /* 저장소가 막혀 있으면 지울 것도 없음 */
    }
  }

  G.store = { KEY, load, save, clear, isAvailable: () => available };
})(globalThis.GISA);
