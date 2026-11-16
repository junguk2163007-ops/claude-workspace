// 3D 장면 배경음악. 파일 없이 브라우저의 WebAudio 로 그 자리에서 연주한다(코드 진행 + 패드 + 멜로디 + 베이스 + 가벼운 드럼).
// 장면마다 분위기가 다른 곡이 깔리고, 구간이 바뀔 때만 아주 작은 효과음(톡·딸깍·슉·딩동)이 난다.
// 재생 버튼을 눌러야 소리가 시작되고, 플레이어의 "소리" 버튼으로 켜고 끈다(선택은 기억).
(function (G) {
  'use strict';
  if (typeof window === 'undefined') return;
  const KEY = 'gisa-anim-sound';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = (x) => {
    const k = clamp(x, 0, 1);
    return k * k * (3 - 2 * k);
  };
  let on = true;
  try {
    on = localStorage.getItem(KEY) !== 'off';
  } catch (e) {
    /* 저장소를 못 쓰면 기본값(켜짐) */
  }
  let ac = null;
  let master = null;
  let white = null;
  let cur = null; // { id, bus, timer, ... }

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
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const QUAL = {
    maj: [0, 4, 7],
    m: [0, 3, 7],
    maj7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10],
    dom7: [0, 4, 7, 10],
    sus: [0, 5, 7, 10],
  };

  // ───────── 악기 ─────────
  function pad(bus, freqs, t0, dur, o) {
    freqs.forEach((f) => {
      const g = ac.createGain();
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = o.lp;
      lp.connect(g);
      g.connect(bus);
      [-6, 6].forEach((c) => {
        const osc = ac.createOscillator();
        osc.type = o.type;
        osc.frequency.value = f;
        osc.detune.value = c;
        osc.connect(lp);
        osc.start(t0);
        osc.stop(t0 + dur + o.rel + 0.1);
      });
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(o.vol, t0 + o.att);
      g.gain.setValueAtTime(o.vol, t0 + Math.max(o.att, dur - 0.1));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + o.rel);
    });
  }
  function pluck(bus, f, t0, o) {
    const g = ac.createGain();
    g.connect(bus);
    const a = ac.createOscillator();
    a.type = o.type || 'sine';
    a.frequency.value = f;
    const b = ac.createOscillator();
    b.type = 'triangle';
    b.frequency.value = f * 2;
    const bg = ac.createGain();
    bg.gain.value = o.bright == null ? 0.25 : o.bright;
    a.connect(g);
    b.connect(bg);
    bg.connect(g);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.decay);
    a.start(t0);
    b.start(t0);
    a.stop(t0 + o.decay + 0.1);
    b.stop(t0 + o.decay + 0.1);
  }
  function bass(bus, f, t0, vol, len) {
    const g = ac.createGain();
    g.connect(bus);
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    o.start(t0);
    o.stop(t0 + len + 0.1);
  }
  function kick(bus, t0, vol) {
    const g = ac.createGain();
    g.connect(bus);
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t0);
    o.frequency.exponentialRampToValueAtTime(42, t0 + 0.12);
    o.connect(g);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
    o.start(t0);
    o.stop(t0 + 0.25);
  }
  function hat(bus, t0, vol) {
    const s = ac.createBufferSource();
    s.buffer = white;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    s.connect(hp);
    hp.connect(g);
    g.connect(bus);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + 0.08);
  }

  // ───────── 곡 10개 ─────────
  // prog: 한 마디(8분음표 8칸)씩 [뿌리 음(MIDI), 화음 종류]. melody: 화음의 몇 번째 음을 칠지(-1 쉼, 4 이상은 한 옥타브 위).
  const TRACKS = {
    lofi: { name: '로파이(공작실)', bpm: 78, swing: 0.14, prog: [[48, 'maj7'], [45, 'm7'], [50, 'm7'], [43, 'dom7']], pad: { type: 'triangle', lp: 900, vol: 0.05, att: 0.5, rel: 0.8 }, mel: { type: 'sine', vol: 0.085, decay: 0.7, oct: 1, pat: [0, -1, 2, -1, 3, -1, 2, 1], bright: 0.4 }, bass: { vol: 0.16, steps: [0, 5] }, kick: [0, 5], hat: [2, 6] },
    dream: { name: '몽환(자계)', bpm: 66, swing: 0, prog: [[45, 'm7'], [41, 'maj7'], [48, 'maj7'], [43, 'maj']], pad: { type: 'sawtooth', lp: 650, vol: 0.035, att: 1.2, rel: 1.4 }, mel: { type: 'sine', vol: 0.07, decay: 1.6, oct: 2, pat: [0, 2, 3, 4, 3, 2, 1, -1], bright: 0.15 }, bass: { vol: 0.12, steps: [0] } },
    bounce: { name: '경쾌(전자력)', bpm: 100, swing: 0.06, prog: [[48, 'maj'], [41, 'maj'], [43, 'maj'], [48, 'maj']], pad: { type: 'triangle', lp: 1000, vol: 0.035, att: 0.2, rel: 0.4 }, mel: { type: 'triangle', vol: 0.09, decay: 0.28, oct: 1, pat: [0, 2, 1, 2, 0, 2, 3, 2], bright: 0.1 }, bass: { vol: 0.15, steps: [0, 4] }, kick: [0, 4], hat: [1, 3, 5, 7] },
    flow: { name: '흐름(전자유도)', bpm: 84, swing: 0.05, prog: [[50, 'm7'], [46, 'maj7'], [41, 'maj7'], [48, 'maj']], pad: { type: 'triangle', lp: 800, vol: 0.045, att: 0.7, rel: 0.9 }, mel: { type: 'sine', vol: 0.08, decay: 0.9, oct: 1, pat: [0, 1, 2, 3, 2, 1, 0, -1], bright: 0.3 }, bass: { vol: 0.13, steps: [0] }, hat: [4] },
    pulse: { name: '3상 맥동(배전반실)', bpm: 92, swing: 0, prog: [[40, 'm7'], [48, 'maj7'], [43, 'maj'], [50, 'maj']], pad: { type: 'sawtooth', lp: 700, vol: 0.035, att: 0.6, rel: 0.7 }, mel: { type: 'triangle', vol: 0.075, decay: 0.45, oct: 1, pat: [0, 2, 1, -1, 2, 0], bright: 0.2 }, bass: { vol: 0.14, steps: [0, 2, 4, 6] }, kick: [0] },
    groove: { name: '그루브(공장)', bpm: 104, swing: 0.08, prog: [[45, 'm7'], [50, 'm7'], [43, 'dom7'], [48, 'maj7']], pad: { type: 'triangle', lp: 850, vol: 0.035, att: 0.2, rel: 0.4 }, mel: { type: 'triangle', vol: 0.08, decay: 0.3, oct: 1, pat: [0, -1, 2, -1, 1, -1, 3, -1], bright: 0.15 }, bass: { vol: 0.17, steps: [0, 3, 4, 6] }, kick: [0, 4], hat: [0, 2, 4, 6] },
    dusk: { name: '해질녘(변전소)', bpm: 58, swing: 0, prog: [[41, 'maj7'], [40, 'm7'], [38, 'm7'], [48, 'maj7']], pad: { type: 'sawtooth', lp: 600, vol: 0.04, att: 1.4, rel: 1.6 }, mel: { type: 'sine', vol: 0.075, decay: 2.2, oct: 2, pat: [0, -1, -1, -1, 2, -1, -1, -1], bright: 0.1 }, bass: { vol: 0.12, steps: [0] } },
    build: { name: '차오름(충전)', bpm: 72, swing: 0.04, prog: [[43, 'maj7'], [40, 'm7'], [48, 'maj7'], [50, 'maj']], pad: { type: 'triangle', lp: 900, vol: 0.04, att: 0.7, rel: 0.9 }, mel: { type: 'sine', vol: 0.085, decay: 0.8, oct: 1, pat: [0, 1, 2, 3, 4, 3, 2, 1], bright: 0.3 }, bass: { vol: 0.13, steps: [0, 4] }, hat: [2, 6] },
    calm: { name: '차분(공부)', bpm: 64, swing: 0.04, prog: [[48, 'maj'], [45, 'm7'], [41, 'maj7'], [43, 'sus']], pad: { type: 'triangle', lp: 800, vol: 0.045, att: 0.9, rel: 1.1 }, mel: { type: 'sine', vol: 0.075, decay: 1.1, oct: 1, pat: [0, -1, 1, -1, 2, -1, 1, -1], bright: 0.2 }, bass: { vol: 0.12, steps: [0] } },
    bright: { name: '밝음(새 개념)', bpm: 112, swing: 0.05, prog: [[43, 'maj'], [50, 'maj'], [40, 'm7'], [48, 'maj7']], pad: { type: 'triangle', lp: 1100, vol: 0.035, att: 0.2, rel: 0.4 }, mel: { type: 'triangle', vol: 0.085, decay: 0.3, oct: 1, pat: [0, 1, 2, 1, 3, 2, 1, 0], bright: 0.15 }, bass: { vol: 0.14, steps: [0, 4] }, kick: [0, 4], hat: [2, 6] },
  };

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
        g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
        o.connect(g);
        g.connect(master);
        o.start(t0);
        o.stop(t0 + 1);
      });
    },
  };

  // ───────── 장면 ↔ 곡 연결 ─────────
  // level(t): 0~1 로 멜로디·드럼 세기를 장면 진행에 맞춰 올리고 내림
  const SCENES = {
    'ohm-water': { track: 'lofi', level: (t) => 0.7 + 0.3 * ease((t - 8) / 4), events: [[8, 'chime'], [8.3, 'click'], [8.6, 'click'], [8.9, 'click'], [9.2, 'click'], [16, 'chime'], [16.2, 'swoosh'], [17.45, 'drop'], [24, 'chime']] },
    'wire-field': { track: 'dream', level: (t) => 0.7 + 0.3 * ease((t - 8) / 4) - (t >= 16 ? 0.3 * ease((t - 16) / 4) : 0), events: [[8, 'chime'], [16, 'chime']] },
    'fleming-left': { track: 'bounce', level: (t) => 0.6 + 0.4 * ease((t - 12) / 4), events: [[6, 'chime'], [12, 'chime'], [20, 'chime']] },
    induction: { track: 'flow', level: (t) => (t < 8 ? 0.7 : t < 16 ? 1 : 0.5), events: [[8, 'chime'], [16, 'chime']] },
    'three-phase-field': { track: 'pulse', level: (t) => 0.6 + 0.4 * ease((t - 16) / 4), events: [[8, 'chime'], [16, 'chime']] },
    'im-slip': { track: 'groove', level: (t) => (t < 8 ? 0.5 + 0.5 * ease(t / 8) : 1), events: [[8, 'chime'], [16, 'chime']] },
    transformer: { track: 'dusk', level: (t) => 0.8, events: [[8, 'chime'], [16, 'chime']] },
    capacitor: { track: 'build', level: (t) => (t < 10 ? 0.5 + 0.5 * (1 - Math.exp(-t / 3)) : 1), events: [[10, 'chime'], [16, 'chime'], [16.2, 'swoosh'], [17.6, 'drop']] },
  };

  // ───────── 연주 ─────────
  function startMusic(id) {
    const sc = SCENES[id];
    const tr = TRACKS[sc.track];
    const bus = ac.createGain();
    bus.gain.value = 0.0001;
    bus.connect(master);
    bus.gain.setTargetAtTime(1, ac.currentTime, 0.5); // 서서히 커지며 시작
    const c = { id, bus, tr, step: 0, next: ac.currentTime + 0.1, level: 0.8, last: 0, timer: 0 };
    const stepDur = 60 / tr.bpm / 2;
    const play = (n, t0) => {
      const bar = Math.floor(n / 8) % tr.prog.length;
      const s = n % 8;
      const [root, q] = tr.prog[bar];
      const tones = QUAL[q];
      const sw = s % 2 ? tr.swing * stepDur : 0;
      const T = t0 + sw;
      const lv = c.level;
      if (s === 0) pad(bus, tones.map((x) => mtof(root + 12 + x)), t0, stepDur * 8 - 0.1, tr.pad);
      const m = tr.mel;
      const idx = m.pat[n % m.pat.length];
      if (idx >= 0) {
        const note = root + 12 * m.oct + tones[idx % tones.length] + 12 * Math.floor(idx / tones.length);
        pluck(bus, mtof(note), T, { type: m.type, vol: m.vol * (0.5 + 0.5 * lv), decay: m.decay, bright: m.bright });
      }
      if (tr.bass && tr.bass.steps.indexOf(s) >= 0) bass(bus, mtof(root - 12 + (s === 6 ? 7 : 0)), T, tr.bass.vol, stepDur * 3);
      if (tr.kick && tr.kick.indexOf(s) >= 0) kick(bus, T, 0.2 * lv);
      if (tr.hat && tr.hat.indexOf(s) >= 0) hat(bus, T, 0.035 * lv);
    };
    c.timer = setInterval(() => {
      if (!ac) return;
      while (c.next < ac.currentTime + 0.4) {
        play(c.step, c.next);
        c.step += 1;
        c.next += stepDur;
      }
    }, 90);
    return c;
  }
  function stop() {
    if (!cur) return;
    const c = cur;
    cur = null;
    clearInterval(c.timer);
    try {
      c.bus.gain.setTargetAtTime(0.0001, ac.currentTime, 0.12);
      setTimeout(() => {
        try {
          c.bus.disconnect();
        } catch (e) {
          /* 이미 끊김 */
        }
      }, 900);
    } catch (e) {
      /* 이미 멈춤 */
    }
  }
  function frame(id, t, playing) {
    if (!on || !playing || !SCENES[id]) {
      if (cur) stop();
      return;
    }
    if (!ctxOk()) return;
    if (ac.state === 'suspended') ac.resume();
    if (!cur || cur.id !== id) {
      stop();
      cur = startMusic(id);
      cur.last = t;
    }
    const c = cur;
    const sc = SCENES[id];
    c.level = clamp(sc.level(t), 0, 1);
    const dt = t - c.last;
    if (dt >= 0 && dt <= 0.6) {
      (sc.events || []).forEach((e) => {
        if (e[0] > c.last && e[0] <= t) sfx[e[1]]();
      });
    }
    c.last = t;
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
      if (!on) stop();
    },
    toggle() {
      G.animSound.set(!on);
      return on;
    },
    // 재생 버튼을 누른 순간(사용자 조작) 오디오를 깨운다
    unlock() {
      if (on && ctxOk() && ac.state === 'suspended') ac.resume();
    },
    has: (id) => !!SCENES[id],
    trackOf: (id) => (SCENES[id] ? TRACKS[SCENES[id].track].name : ''),
    frame,
    stop,
    // 시험용
    _state: () => ({ on, ctx: ac ? ac.state : 'none', cur: cur ? cur.id : null, track: cur ? cur.tr.name : null, steps: cur ? cur.step : 0 }),
    _count: () => ({ tracks: Object.keys(TRACKS).length, sfx: Object.keys(sfx).length }),
  };
})(globalThis.GISA);
