// 3D 장면 효과음. 파일 없이 브라우저의 WebAudio 로 그 자리에서 만든다(전기 웅웅 소리, 모터, 변압기 등 12가지).
// 소리는 재생 버튼을 눌러야 나고, 플레이어의 "소리" 버튼으로 켜고 끈다(선택은 기억).
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
  let noiseBuf = null;
  let cur = null; // { id, voices, last }

  function ctxOk() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.55;
      master.connect(ac.destination);
      const len = ac.sampleRate * 2;
      noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      let b = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b = (b + 0.02 * w) / 1.02; // 갈색 잡음
        d[i] = b * 3.5;
      }
    } catch (e) {
      ac = null;
    }
    return ac;
  }
  const now = () => ac.currentTime;

  // ───────── 계속 나는 소리(목소리) 6가지 ─────────
  // 각 목소리는 { set({vol, freq}), stop() }
  function mkGain() {
    const g = ac.createGain();
    g.gain.value = 0;
    g.connect(master);
    return g;
  }
  const smooth = (param, v, tc) => param.setTargetAtTime(v, now(), tc || 0.06);
  const voices = {
    // 1) 전기 웅웅(교류 60 Hz 느낌)
    hum() {
      const g = mkGain();
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;
      lp.connect(g);
      const o1 = ac.createOscillator();
      o1.type = 'sawtooth';
      o1.frequency.value = 60;
      const o2 = ac.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = 120;
      const g2 = ac.createGain();
      g2.gain.value = 0.5;
      o1.connect(lp);
      o2.connect(g2);
      g2.connect(lp);
      o1.start();
      o2.start();
      return {
        set(p) {
          smooth(g.gain, p.vol, 0.08);
          if (p.freq) {
            smooth(o1.frequency, p.freq, 0.1);
            smooth(o2.frequency, p.freq * 2, 0.1);
          }
        },
        stop() {
          [o1, o2].forEach((o) => o.stop(now() + 0.3));
        },
        g,
      };
    },
    // 2) 자기장 일렁임(대역 잡음)
    shimmer() {
      const g = mkGain();
      const src = ac.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 3;
      bp.frequency.value = 500;
      const lfo = ac.createOscillator();
      lfo.frequency.value = 0.7;
      const lg = ac.createGain();
      lg.gain.value = 140;
      lfo.connect(lg);
      lg.connect(bp.frequency);
      src.connect(bp);
      bp.connect(g);
      src.start();
      lfo.start();
      return {
        set(p) {
          smooth(g.gain, p.vol * 2.2, 0.1);
          if (p.freq) smooth(bp.frequency, p.freq, 0.1);
        },
        stop() {
          src.stop(now() + 0.3);
          lfo.stop(now() + 0.3);
        },
        g,
      };
    },
    // 3) 모터 윙(떨림 있는 톱니파)
    whirr() {
      const g = mkGain();
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1100;
      lp.connect(g);
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 80;
      const lfo = ac.createOscillator();
      lfo.frequency.value = 6;
      const lg = ac.createGain();
      lg.gain.value = 3;
      lfo.connect(lg);
      lg.connect(o.frequency);
      o.connect(lp);
      o.start();
      lfo.start();
      return {
        set(p) {
          smooth(g.gain, p.vol, 0.1);
          if (p.freq) {
            smooth(o.frequency, p.freq, 0.12);
            smooth(lp.frequency, 500 + p.freq * 5, 0.12);
          }
        },
        stop() {
          o.stop(now() + 0.3);
          lfo.stop(now() + 0.3);
        },
        g,
      };
    },
    // 4) 변압기 웅(120 Hz 맥동)
    buzz() {
      const g = mkGain();
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 650;
      lp.connect(g);
      const o1 = ac.createOscillator();
      o1.type = 'square';
      o1.frequency.value = 120;
      const o2 = ac.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = 240;
      const g2 = ac.createGain();
      g2.gain.value = 0.7;
      o1.connect(lp);
      o2.connect(g2);
      g2.connect(lp);
      o1.start();
      o2.start();
      return {
        set(p) {
          smooth(g.gain, p.vol * 0.7, 0.1);
          if (p.freq) {
            smooth(o1.frequency, p.freq, 0.1);
            smooth(o2.frequency, p.freq * 2, 0.1);
          }
        },
        stop() {
          [o1, o2].forEach((o) => o.stop(now() + 0.3));
        },
        g,
      };
    },
    // 5) 낮은 우르릉(큰 기계)
    rumble() {
      const g = mkGain();
      const src = ac.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 180;
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = 46;
      const og = ac.createGain();
      og.gain.value = 0.5;
      src.connect(lp);
      lp.connect(g);
      o.connect(og);
      og.connect(g);
      src.start();
      o.start();
      return {
        set(p) {
          smooth(g.gain, p.vol * 1.4, 0.12);
          if (p.freq) {
            smooth(o.frequency, p.freq, 0.15);
            smooth(lp.frequency, p.freq * 4, 0.15);
          }
        },
        stop() {
          src.stop(now() + 0.3);
          o.stop(now() + 0.3);
        },
        g,
      };
    },
    // 6) 충전음(전압에 따라 올라가는 맑은 소리)
    tone() {
      const g = mkGain();
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.value = 300;
      const lfo = ac.createOscillator();
      lfo.frequency.value = 5;
      const lg = ac.createGain();
      lg.gain.value = 4;
      lfo.connect(lg);
      lg.connect(o.frequency);
      o.connect(g);
      o.start();
      lfo.start();
      return {
        set(p) {
          smooth(g.gain, p.vol, 0.08);
          if (p.freq) smooth(o.frequency, p.freq, 0.1);
        },
        stop() {
          o.stop(now() + 0.3);
          lfo.stop(now() + 0.3);
        },
        g,
      };
    },
  };

  // ───────── 한 번 나는 소리 6가지 ─────────
  function env(g, a, d, peak) {
    const t = now();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  const events = {
    // 건전지가 "톡" 끼워지는 소리
    drop(v) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(260 * (v || 1), now());
      o.frequency.exponentialRampToValueAtTime(90, now() + 0.14);
      env(g, 0.005, 0.16, 0.5);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(now() + 0.3);
    },
    // 스위치 "딸깍"
    click() {
      const s = ac.createBufferSource();
      s.buffer = noiseBuf;
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const g = ac.createGain();
      env(g, 0.001, 0.05, 0.5);
      s.connect(hp);
      hp.connect(g);
      g.connect(master);
      s.start(now(), Math.random());
      s.stop(now() + 0.1);
    },
    // 부품을 들어 올리는 "슉"
    swoosh() {
      const s = ac.createBufferSource();
      s.buffer = noiseBuf;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(300, now());
      bp.frequency.exponentialRampToValueAtTime(2200, now() + 0.35);
      const g = ac.createGain();
      env(g, 0.08, 0.35, 0.7);
      s.connect(bp);
      bp.connect(g);
      g.connect(master);
      s.start(now(), Math.random());
      s.stop(now() + 0.6);
    },
    // 구간이 바뀔 때 부드러운 "딩동"
    chime() {
      [660, 880].forEach((f, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        const t0 = now() + i * 0.13;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
        o.connect(g);
        g.connect(master);
        o.start(t0);
        o.stop(t0 + 1);
      });
    },
    // 전하가 흐르는 "똑"
    blip(f) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.value = f || 700;
      env(g, 0.003, 0.07, 0.22);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(now() + 0.15);
    },
    // 유도 전류가 생길 때 "지직"
    zap() {
      const s = ac.createBufferSource();
      s.buffer = noiseBuf;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 4;
      bp.frequency.value = 1500 + Math.random() * 1500;
      const g = ac.createGain();
      env(g, 0.002, 0.08, 0.45);
      s.connect(bp);
      bp.connect(g);
      g.connect(master);
      s.start(now(), Math.random());
      s.stop(now() + 0.15);
    },
  };

  // ───────── 장면마다 들려줄 소리 ─────────
  // voices: t 를 받아 { 목소리이름: {vol, freq} }, ticks: 초당 "똑" 횟수, events: [[시각, 소리, 값]]
  const stepI = (t, vals) => {
    let v = vals[0];
    [8, 16, 24].forEach((b, i) => {
      v += (vals[i + 1] - vals[i]) * ease((t - b) / 1.2);
    });
    return v;
  };
  const SCENES = {
    'ohm-water': {
      voices: (t) => {
        const I = stepI(t, [2, 4, 2, 2]);
        return { hum: { vol: 0.03 + 0.016 * I, freq: 60 } };
      },
      ticks: (t) => stepI(t, [2, 4, 2, 2]) * 2.2,
      events: [[8, 'chime'], [8.85, 'drop', 1], [9.05, 'drop', 1.12], [16, 'chime'], [16.2, 'swoosh'], [17.45, 'click'], [24, 'chime']],
    },
    'wire-field': {
      voices: (t) => {
        const I = t < 8 ? 1 : 2;
        const far = t >= 16 ? 0.45 : 1;
        return { hum: { vol: 0.025 * I * far, freq: 50 }, shimmer: { vol: 0.02 * I * far, freq: 520 + 120 * I } };
      },
      events: [[8, 'chime'], [16, 'chime']],
    },
    'fleming-left': {
      voices: (t) => {
        const f = ease((t - 12) / 2);
        return { hum: { vol: t >= 6 ? 0.03 : 0.01, freq: 60 }, whirr: { vol: 0.055 * f, freq: 80 + 90 * ease((t - 12) / 8) } };
      },
      events: [[6, 'chime'], [6.1, 'click'], [12, 'chime'], [20, 'chime']],
    },
    induction: {
      voices: (t) => ({ shimmer: { vol: t < 8 ? 0.018 : t < 16 ? 0.036 : 0, freq: t < 8 ? 480 : 820 } }),
      ticks: (t) => (t < 8 ? 2.5 : t < 16 ? 6 : 0),
      events: [[8, 'chime'], [16, 'chime'], [16.2, 'click']],
    },
    'three-phase-field': {
      voices: (t) => ({ hum: { vol: 0.045, freq: 60 }, rumble: { vol: 0.04 * ease((t - 16) / 3), freq: 55 } }),
      events: [[8, 'chime'], [16, 'chime']],
    },
    'im-slip': {
      voices: (t) => {
        const f = t < 8 ? 70 + 100 * ease(t / 8) : t < 16 ? 170 : 170 + 30 * ease((t - 16) / 6);
        return { whirr: { vol: 0.05, freq: f }, rumble: { vol: t < 16 ? 0.05 : 0.025, freq: 50 } };
      },
      events: [[8, 'chime'], [16, 'chime']],
    },
    transformer: {
      voices: (t) => ({ buzz: { vol: t < 8 ? 0.05 : t < 16 ? 0.035 : 0.065, freq: t < 16 ? 120 : 128 } }),
      events: [[8, 'chime'], [8.1, 'click'], [16, 'chime'], [16.1, 'click']],
    },
    capacitor: {
      voices: (t) => {
        const q = t < 10 ? 1 - Math.exp(-t / 3) : 1;
        const jump = t >= 16 ? ease((t - 16) / 1.5) * 160 : 0;
        return { tone: { vol: t < 10 ? 0.035 : 0.02, freq: 260 + 520 * q + jump }, hum: { vol: 0.012, freq: 60 } };
      },
      ticks: (t) => (t < 10 ? 7 * Math.exp(-t / 3) : 0),
      events: [[10, 'chime'], [16, 'chime'], [16.2, 'swoosh'], [17.6, 'drop', 1]],
    },
  };

  // ───────── 바깥에서 쓰는 함수 ─────────
  function stop() {
    if (!cur || !ac) {
      cur = null;
      return;
    }
    const c = cur;
    cur = null;
    Object.keys(c.voices).forEach((k) => {
      const v = c.voices[k];
      try {
        smooth(v.g.gain, 0, 0.03);
        v.stop();
      } catch (e) {
        /* 이미 멈춤 */
      }
    });
  }
  function frame(id, t, playing) {
    if (!on || !playing || !SCENES[id]) {
      if (cur) stop();
      return;
    }
    if (!ctxOk()) return;
    if (ac.state === 'suspended') ac.resume();
    const sc = SCENES[id];
    if (!cur || cur.id !== id) {
      stop();
      cur = { id, voices: {}, last: t, tick: 0 };
    }
    const c = cur;
    const want = sc.voices(t);
    Object.keys(want).forEach((k) => {
      if (!c.voices[k]) c.voices[k] = voices[k]();
      c.voices[k].set(want[k]);
    });
    Object.keys(c.voices).forEach((k) => {
      if (!want[k]) c.voices[k].set({ vol: 0 });
    });
    const dt = t - c.last;
    if (dt < 0 || dt > 0.6) c.last = t; // 처음으로 되감기거나 건너뛴 경우: 그 사이 효과음은 건너뜀
    else {
      (sc.events || []).forEach((e) => {
        if (e[0] > c.last && e[0] <= t) events[e[1]](e[2]);
      });
      if (sc.ticks) {
        c.tick += sc.ticks(t) * dt;
        while (c.tick >= 1) {
          c.tick -= 1;
          events[id === 'induction' ? 'zap' : 'blip'](id === 'capacitor' ? 500 + 500 * (1 - Math.exp(-t / 3)) : 620 + Math.random() * 120);
        }
      }
      c.last = t;
    }
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
    frame,
    stop,
    // 시험용: 내부 상태
    _state: () => ({ on, ctx: ac ? ac.state : 'none', cur: cur ? cur.id : null, voices: cur ? Object.keys(cur.voices) : [] }),
    _count: () => ({ voices: Object.keys(voices).length, events: Object.keys(events).length }),
  };
})(globalThis.GISA);
