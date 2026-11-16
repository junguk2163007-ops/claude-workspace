// 3D 장면 배경음악. ElevenLabs 로 만든 가사 없는 연주곡 8곡(app/anim-music-data.js)을 장면마다 깔고,
// 구간이 바뀔 때만 아주 작은 효과음(톡·딸깍·슉·딩동)을 WebAudio 로 낸다.
// 재생 버튼을 눌러야 소리가 시작되고, 플레이어의 "배경음악" 버튼으로 켜고 끈다(선택은 기억).
(function (G) {
  'use strict';
  if (typeof window === 'undefined') return;
  const KEY = 'gisa-anim-sound';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let on = true;
  try {
    on = localStorage.getItem(KEY) !== 'off';
  } catch (e) {
    /* 저장소를 못 쓰면 기본값(켜짐) */
  }
  let ac = null;
  let master = null;
  let white = null;

  function ctxOk() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.5;
      master.connect(ac.destination);
      const len = ac.sampleRate;
      white = ac.createBuffer(1, len, ac.sampleRate);
      const d = white.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      ac = null;
    }
    return ac;
  }

  // ───────── 아주 작은 효과음 ─────────
  function env(g, a, d, peak) {
    const t = ac.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  const sfx = {
    drop() {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(330, ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(140, ac.currentTime + 0.12);
      env(g, 0.005, 0.14, 0.12);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(ac.currentTime + 0.25);
    },
    click() {
      const s = ac.createBufferSource();
      s.buffer = white;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2200;
      bp.Q.value = 1.5;
      const g = ac.createGain();
      env(g, 0.001, 0.035, 0.12);
      s.connect(bp);
      bp.connect(g);
      g.connect(master);
      s.start(ac.currentTime, Math.random() * 0.5);
      s.stop(ac.currentTime + 0.08);
    },
    swoosh() {
      const s = ac.createBufferSource();
      s.buffer = white;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 0.9;
      bp.frequency.setValueAtTime(400, ac.currentTime);
      bp.frequency.exponentialRampToValueAtTime(1800, ac.currentTime + 0.4);
      const g = ac.createGain();
      env(g, 0.1, 0.35, 0.07);
      s.connect(bp);
      bp.connect(g);
      g.connect(master);
      s.start(ac.currentTime, Math.random() * 0.5);
      s.stop(ac.currentTime + 0.6);
    },
    chime() {
      [784, 1047].forEach((f, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        const t0 = ac.currentTime + i * 0.12;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
        o.connect(g);
        g.connect(master);
        o.start(t0);
        o.stop(t0 + 1);
      });
    },
  };

  // ───────── 장면 ↔ 곡 연결 ─────────
  const SCENES = {
    'ohm-water': { track: 'ohm', events: [[8, 'chime'], [8.3, 'click'], [8.6, 'click'], [8.9, 'click'], [9.2, 'click'], [16, 'chime'], [16.2, 'swoosh'], [17.45, 'drop'], [24, 'chime']] },
    'wire-field': { track: 'wire', events: [[8, 'chime'], [16, 'chime']] },
    'fleming-left': { track: 'fleming', events: [[6, 'chime'], [12, 'chime'], [20, 'chime']] },
    induction: { track: 'induction', events: [[8, 'chime'], [16, 'chime']] },
    'three-phase-field': { track: 'threephase', events: [[8, 'chime'], [16, 'chime']] },
    'im-slip': { track: 'motor', events: [[8, 'chime'], [16, 'chime']] },
    transformer: { track: 'transformer', events: [[8, 'chime'], [16, 'chime']] },
    capacitor: { track: 'capacitor', events: [[10, 'chime'], [16, 'chime'], [16.2, 'swoosh'], [17.6, 'drop']] },
  };
  const NAMES = { ohm: '모던 피아노', wire: '유리 아트리움', fleming: '경쾌한 아침 오피스', induction: '스파 라운지', threephase: '임원층의 밤', motor: '펜트하우스 바', transformer: '도시의 황혼', capacitor: '차오르는 프레젠테이션' };
  const VOL = 0.5; // 배경음악 크기(0~1)
  const XFADE = 2.5; // 곡이 끝나기 전에 다음 복사본과 겹치는 시간(초)

  // ───────── 연주(오디오 파일) ─────────
  let music = null; // { id, a, b, active, playing, swapping, last }
  const dataOf = (track) => G.animMusicData && G.animMusicData[track];
  function mkAudio(src) {
    const au = new Audio(src);
    au.preload = 'auto';
    au.volume = 0;
    return au;
  }
  // 부드럽게 소리 키우기/줄이기
  function ramp(au, to, secs) {
    const from = au.volume;
    const t0 = performance.now();
    if (au._ramp) cancelAnimationFrame(au._ramp);
    const step = (now) => {
      const k = clamp((now - t0) / (secs * 1000), 0, 1);
      au.volume = clamp(from + (to - from) * k, 0, 1);
      au._ramp = k < 1 ? requestAnimationFrame(step) : 0;
    };
    au._ramp = requestAnimationFrame(step);
  }
  function release() {
    if (!music) return;
    const m = music;
    music = null;
    [m.a, m.b].forEach((au) => {
      ramp(au, 0, 0.25);
      setTimeout(() => {
        try {
          au.pause();
          au.removeAttribute('src');
          au.load();
        } catch (e) {
          /* 이미 정리됨 */
        }
      }, 320);
    });
  }
  function pause() {
    if (!music || !music.playing) return;
    const m = music;
    m.playing = false;
    [m.a, m.b].forEach((au) => {
      if (au.paused) return;
      ramp(au, 0, 0.2);
      setTimeout(() => {
        if (music === m && !m.playing) au.pause();
      }, 240);
    });
  }
  function resume(m) {
    m.playing = true;
    const au = m.active === 'a' ? m.a : m.b;
    const pr = au.play();
    if (pr && pr.catch) pr.catch(() => {});
    ramp(au, VOL, 0.6);
  }
  // 곡이 끝나 가면 다음 복사본을 겹쳐서 이어 붙인다(끊김 없는 반복)
  function loopTick(m) {
    const cur = m.active === 'a' ? m.a : m.b;
    const nxt = m.active === 'a' ? m.b : m.a;
    const d = cur.duration;
    if (!isFinite(d) || d < XFADE * 2 || m.swapping) return;
    if (cur.currentTime >= d - XFADE) {
      m.swapping = true;
      nxt.currentTime = 0;
      const pr = nxt.play();
      if (pr && pr.catch) pr.catch(() => {});
      ramp(nxt, VOL, XFADE);
      ramp(cur, 0, XFADE);
      setTimeout(() => {
        if (music !== m) return;
        cur.pause();
        m.active = m.active === 'a' ? 'b' : 'a';
        m.swapping = false;
      }, XFADE * 1000 + 50);
    }
  }
  function frame(id, t, playing) {
    if (!on || !SCENES[id]) {
      release();
      return;
    }
    if (!playing) {
      pause();
      return;
    }
    if (music && music.id !== id) release();
    if (!music) {
      const src = dataOf(SCENES[id].track);
      if (!src) return;
      music = { id, a: mkAudio(src), b: mkAudio(src), active: 'a', playing: false, swapping: false, last: t };
    }
    const m = music;
    if (!m.playing) resume(m);
    loopTick(m);
    // 구간이 바뀔 때만 아주 작은 효과음
    if (ctxOk()) {
      if (ac.state === 'suspended') ac.resume();
      const dt = t - m.last;
      if (dt >= 0 && dt <= 0.6) {
        SCENES[id].events.forEach((e) => {
          if (e[0] > m.last && e[0] <= t) sfx[e[1]]();
        });
      }
    }
    m.last = t;
  }

  G.animSound = {
    enabled: () => on,
    set(v) {
      on = !!v;
      try {
        localStorage.setItem(KEY, on ? 'on' : 'off');
      } catch (e) {
        /* 저장 못 해도 이번엔 적용됨 */
      }
      if (!on) release();
    },
    toggle() {
      G.animSound.set(!on);
      return on;
    },
    // 재생 버튼을 누른 순간(사용자 조작) 효과음용 오디오를 깨운다
    unlock() {
      if (on && ctxOk() && ac.state === 'suspended') ac.resume();
    },
    has: (id) => !!SCENES[id] && !!dataOf(SCENES[id].track),
    trackOf: (id) => (SCENES[id] ? NAMES[SCENES[id].track] || '' : ''),
    frame,
    pause,
    stop: release,
    // 시험용
    _state: () => ({ on, cur: music && music.playing ? music.id : null, loaded: music ? music.id : null, track: music ? NAMES[SCENES[music.id].track] : null }),
    _count: () => ({ tracks: Object.keys(NAMES).filter((k) => dataOf(k)).length, sfx: Object.keys(sfx).length }),
  };
})(globalThis.GISA);
