// 소리 담당. 지금은 파일 없이 브라우저가 직접 합성한 간단한 소리를 쓴다.
// 나중에 진짜 효과음 파일로 바꿀 땐 SOUNDS 표에서 해당 이벤트의 함수만 바꾸면 된다.

export function createAudio() {
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let muted = false;
  let listenerX = 0;
  const lastPlayed = {};
  let combo = 0;
  let lastPickup = 0;

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.45;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone({ freq, to, type = 'sine', dur = 0.1, vol = 0.3, delay = 0, attack = 0.004 }) {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise({ dur = 0.1, vol = 0.2, freq = 1200, q = 1, type = 'bandpass', delay = 0, to }) {
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.02);
  }

  // 이벤트 이름 → 소리. v = 거리에 따른 볼륨(멀면 작게)
  const SOUNDS = {
    coinCollected: (ev, v) => {
      const now = ctx.currentTime;
      combo = now - lastPickup < 0.6 ? Math.min(combo + 1, 12) : 0;
      lastPickup = now;
      const k = Math.pow(2, combo / 12); // 연속으로 주우면 음이 점점 올라감
      tone({ freq: 1568 * k, type: 'square', dur: 0.06, vol: 0.08 * v });
      tone({ freq: 2093 * k, type: 'square', dur: 0.18, vol: 0.07 * v, delay: 0.05 });
      tone({ freq: 4186 * k, type: 'sine', dur: 0.12, vol: 0.04 * v, delay: 0.05 });
    },
    coinSpawned: (ev, v) => {
      for (let i = 0; i < Math.min(ev.count, 5); i++) {
        tone({ freq: 2400 + Math.random() * 600, type: 'triangle', dur: 0.08, vol: 0.06 * v, delay: i * 0.035 });
      }
    },
    coinBounce: (ev, v) => {
      const s = Math.min(1, ev.strength / 250);
      tone({ freq: 3000 + Math.random() * 900, type: 'triangle', dur: 0.04, vol: 0.05 * s * v });
    },
    coinThrown: (ev, v) => noise({ dur: 0.08, vol: 0.06 * v, freq: 3000, to: 6000, q: 2 }),
    coinSlotted: (ev, v) => {
      const k = Math.pow(2, (ev.paid - 1) * 2 / 12);
      tone({ freq: 1046 * k, type: 'triangle', dur: 0.12, vol: 0.14 * v });
      tone({ freq: 2093 * k, type: 'sine', dur: 0.08, vol: 0.05 * v });
    },
    spotComplete: (ev, v) => {
      [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.35, vol: 0.12 * v, delay: i * 0.06 }));
      noise({ dur: 0.25, vol: 0.08 * v, freq: 400, type: 'lowpass' });
    },
    arrowFired: (ev, v) => {
      tone({ freq: 380, to: 140, type: 'triangle', dur: 0.09, vol: 0.12 * v });
      noise({ dur: 0.12, vol: 0.05 * v, freq: 2500, to: 900, q: 3, delay: 0.01 });
    },
    arrowHit: (ev, v) => noise({ dur: 0.07, vol: 0.18 * v, freq: 900, q: 1.5 }),
    arrowMiss: (ev, v) => noise({ dur: 0.05, vol: 0.06 * v, freq: 500, type: 'lowpass' }),
    animalStartled: (ev, v) => {
      if (ev.kind === 'goldenChicken') tone({ freq: 1400, to: 2000, type: 'sine', dur: 0.12, vol: 0.06 * v });
      tone({ freq: 900, to: 1300, type: 'square', dur: 0.06, vol: 0.04 * v });
      tone({ freq: 1200, to: 800, type: 'square', dur: 0.08, vol: 0.04 * v, delay: 0.07 });
    },
    animalKilled: (ev, v) => {
      tone({ freq: 1100, to: 500, type: 'square', dur: 0.12, vol: 0.06 * v });
      noise({ dur: 0.15, vol: 0.1 * v, freq: 3500, q: 0.7 });
    },
    enemyHit: (ev, v) => tone({ freq: 160, to: 90, type: 'sawtooth', dur: 0.1, vol: 0.07 * v }),
    enemyKilled: (ev, v) => {
      tone({ freq: 220, to: 50, type: 'sawtooth', dur: 0.35, vol: 0.12 * v });
      noise({ dur: 0.4, vol: 0.14 * v, freq: 700, to: 150, type: 'lowpass' });
    },
    kingHit: (ev, v) => {
      tone({ freq: 300, to: 120, type: 'square', dur: 0.18, vol: 0.12 * v });
      noise({ dur: 0.12, vol: 0.12 * v, freq: 1500 });
    },
    wallHit: (ev, v) => noise({ dur: 0.1, vol: 0.14 * v, freq: 300, q: 2 }),
    wallBroken: (ev, v) => {
      noise({ dur: 0.5, vol: 0.25 * v, freq: 500, to: 100, type: 'lowpass' });
      tone({ freq: 120, to: 40, type: 'sawtooth', dur: 0.4, vol: 0.1 * v });
    },
    coinStolen: (ev, v) => {
      // 낄낄거리듯 내려가는 음
      [1800, 1500, 1200].forEach((f, i) => tone({ freq: f, to: f * 0.8, type: 'square', dur: 0.06, vol: 0.05 * v, delay: i * 0.06 }));
    },
    thiefEscaped: () => {
      tone({ freq: 392, to: 370, type: 'triangle', dur: 0.3, vol: 0.08 });
      tone({ freq: 311, to: 294, type: 'triangle', dur: 0.5, vol: 0.08, delay: 0.25 });
    },
    swordSwing: (ev, v) => {
      // 쇳소리 "챙!"
      noise({ dur: 0.08, vol: 0.12 * v, freq: 5000, q: 2 });
      tone({ freq: 2200 + Math.random() * 300, type: 'square', dur: 0.05, vol: 0.05 * v });
      tone({ freq: 1250, type: 'triangle', dur: 0.25, vol: 0.06 * v, delay: 0.01 });
    },
    swordsmanHit: (ev, v) => {
      noise({ dur: 0.08, vol: 0.12 * v, freq: 600, q: 1.5 });
      tone({ freq: 180, to: 120, type: 'square', dur: 0.08, vol: 0.05 * v });
    },
    swordsmanDown: (ev, v) => {
      tone({ freq: 440, to: 220, type: 'triangle', dur: 0.4, vol: 0.1 * v });
    },
    swordsmanRecovered: (ev, v) => {
      tone({ freq: 523, type: 'triangle', dur: 0.12, vol: 0.09 * v });
      tone({ freq: 784, type: 'triangle', dur: 0.2, vol: 0.09 * v, delay: 0.1 });
    },
    flyerDive: (ev, v) => {
      tone({ freq: 1500, to: 500, type: 'sawtooth', dur: 0.35, vol: 0.05 * v });
      noise({ dur: 0.3, vol: 0.06 * v, freq: 4000, to: 1200, q: 4 });
    },
    waveIncoming: () => {
      tone({ freq: 55, to: 45, type: 'sawtooth', dur: 1.6, vol: 0.14, attack: 0.4 });
      tone({ freq: 82, to: 70, type: 'sine', dur: 1.6, vol: 0.12, attack: 0.4 });
      noise({ dur: 1.4, vol: 0.06, freq: 200, type: 'lowpass', delay: 0.2 });
    },
  };

  // 같은 소리가 한순간에 너무 많이 겹치지 않게
  const MIN_GAP = { coinBounce: 0.03, coinCollected: 0.02, arrowFired: 0.03, arrowMiss: 0.05, animalStartled: 0.15, wallHit: 0.08 };

  function handle(ev) {
    if (!ctx || muted || ctx.state !== 'running') return;
    const fn = SOUNDS[ev.type];
    if (!fn) return;
    const now = ctx.currentTime;
    if (MIN_GAP[ev.type] && now - (lastPlayed[ev.type] || 0) < MIN_GAP[ev.type]) return;
    lastPlayed[ev.type] = now;
    // 왕에게서 멀리서 난 소리는 작게
    const v = ev.x === undefined ? 1 : Math.max(0.12, 1 - Math.abs(ev.x - listenerX) / 450);
    fn(ev, v);
  }

  return {
    unlock,
    handle,
    setListener(x) { listenerX = x; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.45;
      return muted;
    },
    get muted() { return muted; },
  };
}
