// WhatIf Studio — Web Audio 효과음·오르간 BGM
// scheduleScore 는 AudioContext / OfflineAudioContext 둘 다에서 돈다.
//   실시간: now = currentTime + 0.1 (재생 시작 여유)   오프라인: now = 0
// topic.audio.cues 의 각 항목 { fx, t, ... } 를 아래 FX 함수로 배치한다.
(function (WI) {
  WI.BGM_MAX = 0.42;
  WI.SFX_MAX = 0.80;

  WI.scheduleScore = function (actx, out, now, cues, seed) {
    const rand = WI.mulberry32(seed);
    const nb = actx.createBuffer(1, actx.sampleRate * 4, actx.sampleRate);
    const data = nb.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = rand() * 2 - 1;
    const sfx = out.sfx, bgm = out.bgm;

    const FX = {
      // 필터 걸린 노이즈 질감 (바람, 땅울림, 물속)
      noise({ t, dur, f1, f2, q, vol, type = 'bandpass' }) {
        const src = actx.createBufferSource();
        src.buffer = nb; src.loop = true;
        const flt = actx.createBiquadFilter();
        flt.type = type; flt.Q.value = q;
        flt.frequency.setValueAtTime(f1, now + t);
        flt.frequency.exponentialRampToValueAtTime(f2, now + t + dur);
        const g = actx.createGain();
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.linearRampToValueAtTime(vol, now + t + Math.min(0.6, dur / 3));
        g.gain.setValueAtTime(vol, now + t + dur - Math.min(0.6, dur / 3));
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
        src.connect(flt); flt.connect(g); g.connect(sfx);
        src.start(now + t); src.stop(now + t + dur + 0.05);
      },
      // 짧은 충격음 (깨짐, 틱, 숨소리)
      crash({ t, freq, dur, vol = 0.3 }) {
        const src = actx.createBufferSource();
        src.buffer = nb;
        const flt = actx.createBiquadFilter();
        flt.type = 'bandpass';
        flt.frequency.setValueAtTime(freq, now + t);
        flt.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.2), now + t + dur);
        flt.Q.value = 2.0;
        const g = actx.createGain();
        g.gain.setValueAtTime(vol, now + t);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
        src.connect(flt); flt.connect(g); g.connect(sfx);
        src.start(now + t); src.stop(now + t + dur + 0.05);
      },
      crickets({ t, dur, vol }) {
        const osc = actx.createOscillator();
        osc.type = 'sine'; osc.frequency.value = 4300;
        const g = actx.createGain();
        g.gain.value = vol * 0.5;
        const lfo = actx.createOscillator();
        lfo.frequency.value = 7;
        const lg = actx.createGain();
        lg.gain.value = vol * 0.5;
        lfo.connect(lg); lg.connect(g.gain);
        const env = actx.createGain();
        env.gain.setValueAtTime(0.0001, now + t);
        env.gain.linearRampToValueAtTime(1, now + t + 0.5);
        env.gain.setValueAtTime(1, now + t + dur - 0.2);
        env.gain.linearRampToValueAtTime(0.0001, now + t + dur);
        osc.connect(g); g.connect(env); env.connect(sfx);
        osc.start(now + t); lfo.start(now + t);
        osc.stop(now + t + dur + 0.05); lfo.stop(now + t + dur + 0.05);
      },
      // 상승 스웰 (긴장 고조)
      swell({ t, dur, vol = 0.2 }) {
        const src = actx.createBufferSource();
        src.buffer = nb; src.loop = true;
        const flt = actx.createBiquadFilter();
        flt.type = 'bandpass'; flt.Q.value = 3;
        flt.frequency.setValueAtTime(300, now + t);
        flt.frequency.exponentialRampToValueAtTime(3500, now + t + dur);
        const g = actx.createGain();
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(vol, now + t + dur);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + dur + 0.08);
        src.connect(flt); flt.connect(g); g.connect(sfx);
        src.start(now + t); src.stop(now + t + dur + 0.15);
      },
      // 저음 하강 (붕괴)
      subDrop({ t, dur, vol = 0.5, f1 = 120, f2 = 28 }) {
        const osc = actx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f1, now + t);
        osc.frequency.exponentialRampToValueAtTime(f2, now + t + dur);
        const g = actx.createGain();
        g.gain.setValueAtTime(vol, now + t);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
        osc.connect(g); g.connect(sfx);
        osc.start(now + t); osc.stop(now + t + dur + 0.05);
      },
      // 심장 박동
      thump({ t, vol = 0.4 }) {
        const osc = actx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(75, now + t);
        osc.frequency.exponentialRampToValueAtTime(40, now + t + 0.3);
        const g = actx.createGain();
        g.gain.setValueAtTime(vol, now + t);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.35);
        osc.connect(g); g.connect(sfx);
        osc.start(now + t); osc.stop(now + t + 0.4);
      },
      // 불안한 저음 드론
      drone({ t, dur, vol, freqs = [55, 82.4], cutoff = 260 }) {
        freqs.forEach(f => {
          const osc = actx.createOscillator();
          osc.type = 'sawtooth'; osc.frequency.value = f;
          const flt = actx.createBiquadFilter();
          flt.type = 'lowpass'; flt.frequency.value = cutoff;
          const g = actx.createGain();
          g.gain.setValueAtTime(0.0001, now + t);
          g.gain.linearRampToValueAtTime(vol, now + t + 1.5);
          g.gain.setValueAtTime(vol, now + t + dur - 1.5);
          g.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
          osc.connect(flt); flt.connect(g); g.connect(sfx);
          osc.start(now + t); osc.stop(now + t + dur + 0.05);
        });
      },
      waves({ t, dur, vol, cutoff = 900, rate = 0.2 }) {
        const src = actx.createBufferSource();
        src.buffer = nb; src.loop = true;
        const flt = actx.createBiquadFilter();
        flt.type = 'lowpass'; flt.frequency.value = cutoff;
        const g = actx.createGain();
        g.gain.value = vol * 0.5;
        const lfo = actx.createOscillator();
        lfo.frequency.value = rate;
        const lg = actx.createGain();
        lg.gain.value = vol * 0.5;
        lfo.connect(lg); lg.connect(g.gain);
        const env = actx.createGain();
        env.gain.setValueAtTime(0.0001, now + t);
        env.gain.linearRampToValueAtTime(1, now + t + 0.8);
        env.gain.setValueAtTime(1, now + t + dur - 0.8);
        env.gain.linearRampToValueAtTime(0.0001, now + t + dur);
        src.connect(flt); flt.connect(g); g.connect(env); env.connect(sfx);
        src.start(now + t); lfo.start(now + t);
        src.stop(now + t + dur + 0.05); lfo.stop(now + t + dur + 0.05);
      },
      bubble({ t, freq, vol = 0.1 }) {
        const osc = actx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + t);
        osc.frequency.exponentialRampToValueAtTime(freq * 2.2, now + t + 0.09);
        const g = actx.createGain();
        g.gain.setValueAtTime(vol, now + t);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.12);
        osc.connect(g); g.connect(sfx);
        osc.start(now + t); osc.stop(now + t + 0.15);
      },
      chime({ t, freq, vol = 0.09 }) {
        const osc = actx.createOscillator();
        osc.type = 'sine'; osc.frequency.value = freq;
        const g = actx.createGain();
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.linearRampToValueAtTime(vol, now + t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 1.8);
        osc.connect(g); g.connect(sfx);
        osc.start(now + t); osc.stop(now + t + 1.9);
      },
      // 오르간 화음 (BGM 버스)
      organ({ t, dur, notes, vol = 0.08 }) {
        notes.forEach(f => {
          ['sine', 'triangle'].forEach((type, idx) => {
            const osc = actx.createOscillator();
            const g = actx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(f * (idx === 1 ? 2 : 1), now + t);
            g.gain.setValueAtTime(0.0001, now + t);
            g.gain.linearRampToValueAtTime(vol * (idx === 1 ? 0.25 : 1), now + t + 1.2);
            g.gain.setValueAtTime(vol * (idx === 1 ? 0.25 : 1), now + t + dur - 1.2);
            g.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
            osc.connect(g); g.connect(bgm);
            osc.start(now + t); osc.stop(now + t + dur + 0.1);
          });
        });
      },
    };

    for (const c of cues) {
      if (!FX[c.fx]) throw new Error(`알 수 없는 효과음: ${c.fx}`);
      FX[c.fx](c);
    }
  };

  WI.AUDIO_FX = ['noise', 'crash', 'crickets', 'swell', 'subDrop', 'thump', 'drone', 'waves', 'bubble', 'chime', 'organ'];

  // 버스 구성: bgm/sfx → master → destination (+ 녹화용 스트림)
  function makeBuses(actx, bgmLevel, sfxLevel) {
    const master = actx.createGain();
    const bgm = actx.createGain(), sfx = actx.createGain();
    bgm.gain.value = bgmLevel * WI.BGM_MAX;
    sfx.gain.value = sfxLevel * WI.SFX_MAX;
    bgm.connect(master); sfx.connect(master);
    master.connect(actx.destination);
    return { master, bgm, sfx };
  }

  // 실시간 재생기
  WI.createLiveAudio = function (topic) {
    const live = { ctx: null, buses: null, stream: null };
    live.start = function (bgmLevel, sfxLevel) {
      if (live.ctx) live.ctx.close();
      const actx = new (window.AudioContext || window.webkitAudioContext)();
      const buses = makeBuses(actx, bgmLevel, sfxLevel);
      const dest = actx.createMediaStreamDestination();
      buses.master.connect(dest);
      const lead = 0.1;
      WI.scheduleScore(actx, buses, actx.currentTime + lead, topic.audio.cues, topic.audioSeed);
      Object.assign(live, { ctx: actx, buses, stream: dest.stream });
      return lead;
    };
    live.setLevels = function (bgmLevel, sfxLevel) {
      if (!live.buses) return;
      live.buses.bgm.gain.value = bgmLevel * WI.BGM_MAX;
      live.buses.sfx.gain.value = sfxLevel * WI.SFX_MAX;
    };
    live.stop = function () { if (live.ctx) { live.ctx.close(); live.ctx = null; live.buses = null; } };
    return live;
  };

  // 오프라인 렌더 → AudioBuffer. lead 는 레퍼런스 비교용(실시간과 같은 0.1초 앞당김), 렌더는 0.
  WI.renderAudioOffline = async function (topic, bgmLevel, sfxLevel, sampleRate = 48000, lead = 0) {
    const len = Math.ceil((topic.duration + lead) * sampleRate);
    const actx = new OfflineAudioContext(2, len, sampleRate);
    const buses = makeBuses(actx, bgmLevel, sfxLevel);
    WI.scheduleScore(actx, buses, lead, topic.audio.cues, topic.audioSeed);
    return actx.startRendering();
  };

  // AudioBuffer → 16bit PCM WAV (ArrayBuffer)
  WI.encodeWav = function (buf) {
    const ch = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length;
    const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE');
    w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
    w(36, 'data'); out.setUint32(40, n * ch * 2, true);
    const chans = [];
    for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
    let o = 44, peak = 0;
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < ch; c++) {
        const v = chans[c][i];
        if (Math.abs(v) > peak) peak = Math.abs(v);
        const s = Math.max(-1, Math.min(1, v));
        out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true); o += 2;
      }
    }
    return { wav: out.buffer, peak };
  };
})(window.WI = window.WI || {});
