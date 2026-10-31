// 배경음악: 파일 없이 브라우저가 실시간으로 연주하는 음악 (저작권 걱정 없음, 매번 조금씩 다름).
// - 평온: 느린 화음(패드) + 하프 같은 아르페지오 + 가끔 피리 선율 + 낮은 베이스
// - 긴장(습격): 북소리, 낮게 반복되는 현악, 어두운 화음이 서서히 겹쳐 들어온다
// setIntensity(0~1)로 평온 ↔ 긴장 사이를 부드럽게 오간다.

const MUSIC_VOLUME = 1.1;
const BPM = 68;
const STEP = 60 / BPM / 2;   // 8분음표 길이(초)
const STEPS_PER_CHORD = 16;  // 화음 하나 = 2마디

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 화음 진행 (root = 베이스음, pad = 화음 구성음, MIDI 번호)
const CALM = [
  { root: 45, pad: [57, 60, 64, 71] }, // Am(add9)
  { root: 41, pad: [53, 57, 60, 64] }, // Fmaj7
  { root: 48, pad: [55, 60, 64, 74] }, // C(add9)
  { root: 43, pad: [55, 59, 62, 64] }, // G6
];
const TENSE = [
  { root: 45, pad: [57, 60, 64] },     // Am
  { root: 46, pad: [58, 62, 65] },     // Bb
  { root: 45, pad: [57, 60, 64] },     // Am
  { root: 40, pad: [56, 59, 64] },     // E
];
const SCALE = [69, 72, 74, 76, 79, 81, 84]; // A 단조 5음계 (피리 선율용)

function makeImpulse(ctx, seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export function createMusic(ctx, out) {
  // 신호 흐름: 악기 → (calm | tense) → dry + 잔향 → bus → out
  const bus = ctx.createGain();
  bus.gain.value = 0;
  bus.connect(out);
  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx, 3.2, 2.4);
  const wet = ctx.createGain();
  wet.gain.value = 0.6;
  reverb.connect(wet).connect(bus);
  const dry = ctx.createGain();
  dry.gain.value = 0.75;
  dry.connect(bus);

  const calm = ctx.createGain();
  calm.connect(dry);
  calm.connect(reverb);
  const tense = ctx.createGain();
  tense.gain.value = 0;
  tense.connect(dry);
  tense.connect(reverb);

  // 아르페지오용 메아리(딜레이)
  const delay = ctx.createDelay(2);
  delay.delayTime.value = STEP * 3;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const delayOut = ctx.createGain();
  delayOut.gain.value = 0.35;
  delay.connect(feedback).connect(delay);
  delay.connect(delayOut).connect(reverb);

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  // ───────── 악기들 ─────────
  function env(g, t, vol, attack, hold, release) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + attack + hold);
    g.gain.linearRampToValueAtTime(0.0001, t + attack + hold + release);
    return t + attack + hold + release + 0.05;
  }

  function pad(notes, t, dur, dest, dark) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 0.4;
    f.frequency.setValueAtTime(dark ? 500 : 700, t);
    f.frequency.linearRampToValueAtTime(dark ? 800 : 1300, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(dark ? 500 : 750, t + dur);
    const g = ctx.createGain();
    const end = env(g, t, 0.018, 2.2, Math.max(0, dur - 2.2), 2.2);
    f.connect(g).connect(dest);
    for (const n of notes) {
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = midi(n);
        o.detune.value = det;
        o.connect(f);
        o.start(t);
        o.stop(end);
      }
    }
  }

  function pluck(m, t, vol, dest) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    g.connect(dest);
    g.connect(delay);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = midi(m);
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = midi(m) * 2;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.35, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    o2.connect(g2).connect(g);
    for (const osc of [o, o2]) { osc.start(t); osc.stop(t + 1.9); }
  }

  function flute(m, t, dur, dest) {
    const f0 = midi(m);
    const g = ctx.createGain();
    const end = env(g, t, 0.06, 0.12, Math.max(0.05, dur - 0.12), 0.45);
    g.connect(dest);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f0;
    // 비브라토: 음이 길어질수록 살짝 떨림
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(f0 * 0.007, t + 0.5);
    lfo.connect(depth).connect(o.frequency);
    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.value = f0;
    const bodyG = ctx.createGain();
    bodyG.gain.value = 0.25;
    body.connect(bodyG).connect(g);
    o.connect(g);
    // 숨소리
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = f0 * 2;
    nf.Q.value = 3;
    const ng = ctx.createGain();
    env(ng, t, 0.05, 0.08, 0.05, 0.3);
    n.connect(nf).connect(ng).connect(g);
    for (const osc of [o, lfo, body]) { osc.start(t); osc.stop(end); }
    n.start(t, Math.random() * 0.5);
    n.stop(t + 0.5);
  }

  function bass(m, t, dur, dest, vol = 0.045) {
    const g = ctx.createGain();
    const end = env(g, t, vol, 0.08, Math.max(0, dur - 0.9), 0.9);
    g.connect(dest);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = midi(m);
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = midi(m + 12);
    const g2 = ctx.createGain();
    g2.gain.value = 0.15;
    o.connect(g);
    o2.connect(g2).connect(g);
    for (const osc of [o, o2]) { osc.start(t); osc.stop(end); }
  }

  function drum(t, strong, dest) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(strong ? 0.5 : 0.28, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    g.connect(dest);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.65);
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 320;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(strong ? 0.18 : 0.09, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    n.connect(nf).connect(ng).connect(dest);
    n.start(t, Math.random() * 0.5);
    n.stop(t + 0.2);
  }

  function ostinato(m, t, dest) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 520;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.055, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 0.9);
    f.connect(g).connect(dest);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = midi(m);
    o.connect(f);
    o.start(t);
    o.stop(t + STEP);
  }

  // ───────── 작곡(즉흥) ─────────
  let melody = [];       // { step, m, dur }
  function makePhrase(startStep, chord) {
    const pcs = chord.pad.map((n) => n % 12);
    let idx = Math.floor(Math.random() * 4) + 1;
    let s = startStep + pick([2, 4]);
    const len = 4 + Math.floor(Math.random() * 4);
    const notes = [];
    for (let k = 0; k < len; k++) {
      const last = k === len - 1;
      if (last) {
        // 마지막 음은 화음 구성음으로 착지
        let best = idx;
        for (let d = 0; d < SCALE.length; d++) {
          for (const j of [idx - d, idx + d]) if (j >= 0 && j < SCALE.length && pcs.includes(SCALE[j] % 12)) { best = j; d = 99; break; }
        }
        idx = best;
      }
      const dur = last ? 6 : pick([2, 2, 2, 3, 4, 1]);
      notes.push({ step: s, m: SCALE[idx], dur });
      s += dur;
      idx = Math.max(0, Math.min(SCALE.length - 1, idx + pick([-1, 1, 1, -1, 2, -2, 0])));
    }
    return notes;
  }

  // ───────── 박자 맞춰 미리 예약하기 ─────────
  let enabled = true;
  let started = false;
  let step = 0;
  let nextTime = 0;
  let intensity = 0;
  let prog = CALM;

  function onStep(i, t) {
    const local = i % STEPS_PER_CHORD;
    const chordNo = Math.floor(i / STEPS_PER_CHORD);
    if (local === 0) prog = intensity > 0.5 ? TENSE : CALM;
    const chord = prog[chordNo % prog.length];
    const dark = prog === TENSE;

    if (local === 0) {
      pad(chord.pad, t, STEP * STEPS_PER_CHORD + 0.5, calm, dark);
      bass(chord.root, t, STEP * 8, calm);
      bass(chord.root, t + STEP * 8, STEP * 8, calm, 0.035);
      if (!dark && chordNo % 2 === 1 && Math.random() < 0.65) melody = makePhrase(i, chord);
    }

    // 아르페지오: 정박은 거의 항상, 엇박은 가끔 (긴장할수록 줄어듦)
    const arp = chord.pad.map((n) => n + 12);
    const pattern = [0, 1, 2, 3, 2, 1, 3, 2];
    const chance = local % 2 === 0 ? 0.9 : 0.3;
    if (Math.random() < chance * (1 - intensity * 0.5)) {
      pluck(arp[pattern[local % 8] % arp.length], t, local % 4 === 0 ? 0.075 : 0.05, calm);
    }

    for (const n of melody) if (n.step === i) flute(n.m, t, n.dur * STEP, calm);

    // 긴장 층: 북 + 낮은 반복음
    if (intensity > 0.05) {
      if ([0, 6, 8, 11, 12, 14].includes(local)) drum(t, local === 0 || local === 8, tense);
      ostinato(chord.root + (local % 4 === 3 ? 19 : 12), t, tense);
    }
  }

  function tick() {
    if (!enabled || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (nextTime < now - 0.1) nextTime = now + 0.05; // 탭을 다녀오면 밀린 음을 한꺼번에 치지 않게
    while (nextTime < now + 0.3) {
      onStep(step, nextTime);
      step++;
      nextTime += STEP;
    }
  }

  return {
    start() {
      if (started) return;
      started = true;
      nextTime = ctx.currentTime + 0.1;
      bus.gain.setValueAtTime(0, ctx.currentTime);
      bus.gain.linearRampToValueAtTime(MUSIC_VOLUME, ctx.currentTime + 4);
      setInterval(tick, 50);
    },
    setIntensity(x) {
      if (Math.abs(x - intensity) < 0.01) return;
      intensity = x;
      const now = ctx.currentTime;
      tense.gain.setTargetAtTime(x * 1.1, now, 1.2);
      calm.gain.setTargetAtTime(1 - x * 0.45, now, 1.2);
    },
    toggle() {
      enabled = !enabled;
      bus.gain.setTargetAtTime(enabled ? MUSIC_VOLUME : 0, ctx.currentTime, 0.3);
      if (enabled) nextTime = ctx.currentTime + 0.1;
      return enabled;
    },
    get enabled() { return enabled; },
  };
}
