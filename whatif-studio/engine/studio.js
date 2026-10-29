// WhatIf Studio — 스튜디오 UI: 미리보기·녹화·다운로드·비율 토글 + 오프라인 렌더 훅
// build.mjs 가 window.TOPIC / window.META 를 주입한 뒤 이 파일이 실행된다.
(function (WI) {
  const $ = id => document.getElementById(id);
  const topic = window.TOPIC, META = window.META;
  const P = WI.params;

  const ratioKey = WI.ratioKey(P.get('ratio') || META.defaultRatio);
  const R = WI.RATIOS[ratioKey];
  const renderMode = P.get('render') === '1';
  const scale = Number(P.get('scale') || (renderMode ? R.exportScale : 1));
  const lang = P.get('lang') || META.langs[0];
  const view = WI.localize(topic, lang);
  const DUR = topic.duration;

  document.body.classList.add(R.profile);
  if (renderMode) document.body.classList.add('render');
  const outCanvas = $('outCanvas');
  outCanvas.width = Math.round(R.W * scale);
  outCanvas.height = Math.round(R.H * scale);

  let W, composite;
  let playing = false, t0 = 0, last = 0;
  let recorder = null, chunks = [], isRecording = false;
  const live = WI.createLiveAudio(topic);
  const levels = () => [Number($('bgmSlider').value) / 100, Number($('sfxSlider').value) / 100];
  const fmt = t => `${t.toFixed(1)}s / ${DUR.toFixed(1)}s`;

  function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function setStatus(msg, color) { $('recStatus').textContent = msg; $('recStatus').style.color = color || '#dfe6f5'; }

  function start(recordMode) {
    $('go').style.display = 'none';
    const [b, s] = levels();
    const lead = live.start(b, s);
    t0 = performance.now() / 1000 + lead;
    last = 0;
    playing = true;
    if (recordMode) {
      chunks = [];
      const vStream = outCanvas.captureStream(60);
      const mixed = new MediaStream([...vStream.getVideoTracks(), ...live.stream.getAudioTracks()]);
      const mimes = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
      const mime = mimes.find(m => MediaRecorder.isTypeSupported(m)) || '';
      recorder = new MediaRecorder(mixed, { mimeType: mime, videoBitsPerSecond: 8000000 });
      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        const name = `${topic.fileStem}_${ratioKey}_live.${ext}`;
        download(name, new Blob(chunks, { type: mime || 'video/webm' }));
        setStatus(`✅ 저장 완료! (${name})`, '#4ade80');
        isRecording = false;
      };
      recorder.start(200);
      isRecording = true;
      setStatus(`🔴 ${DUR}초 실시간 렌더링 & 사운드 녹화 중...`, '#f87171');
    } else {
      setStatus('▶ 시뮬레이션 재생 중', '#a9bde6');
    }
  }

  function stopRecording() {
    if (isRecording && recorder && recorder.state !== 'inactive') { recorder.stop(); playing = false; return true; }
    return false;
  }

  function loop() {
    requestAnimationFrame(loop);
    if (!playing) {
      W.update(0, 0.016);
      composite(0);
      return;
    }
    const t = Math.max(0, performance.now() / 1000 - t0);
    const dt = Math.min(0.05, Math.max(0.001, t - last));
    last = t;
    if (t >= DUR) {
      if (stopRecording()) { live.stop(); return; }
      start(false);
      return;
    }
    W.update(t, dt);
    composite(t);
    $('timeLabel').textContent = fmt(t);
  }

  function wireUI() {
    const upd = () => {
      const [b, s] = levels();
      live.setLevels(b, s);
      $('volLabel').textContent = `BGM ${Math.round(b * 100)}% / 효과음 ${Math.round(s * 100)}%`;
    };
    $('bgmSlider').oninput = upd; $('sfxSlider').oninput = upd; upd();
    $('btnPreview').onclick = () => start(false);
    $('btnRecordStart').onclick = () => start(true);
    $('btnRecPanel').onclick = () => { stopRecording(); start(true); };
    $('btnStopSave').onclick = () => { stopRecording(); };
    $('timeLabel').textContent = fmt(0);

    document.querySelectorAll('[data-ratio]').forEach(btn => {
      btn.classList.toggle('on', btn.dataset.ratio === ratioKey);
      btn.onclick = () => {
        if (btn.dataset.ratio === ratioKey) return;
        const q = new URLSearchParams(location.search);
        q.set('ratio', btn.dataset.ratio);
        location.search = q.toString();
      };
    });

    // 다운로드: SRT(언어별 2종), 메타데이터 3종
    const srtBox = $('srtGrid');
    const files = WI.srtFiles(topic, META.langs);
    Object.entries(files).forEach(([name, body], i) => {
      const b = document.createElement('button');
      b.className = 'dl-btn';
      b.innerHTML = `${i + 1}. ${name}<span>${name.includes('_Full') ? '상단 팩트 + 자막 통합' : '대형 자막만'}</span>`;
      b.onclick = () => download(name, body);
      srtBox.appendChild(b);
    });
    const meta = META.byRatio[ratioKey] || META.byRatio[META.defaultRatio];
    $('dlTitle').onclick = () => download('title.txt', meta.title + '\n');
    $('dlDesc').onclick = () => download('description.txt', meta.description + '\n');
    $('dlMeta').onclick = () => download('metadata.json', JSON.stringify(META.json, null, 2) + '\n', 'application/json');
  }

  async function loadFonts() {
    const faces = ['400 20px "Nanum Myeongjo"', '500 20px "Nanum Myeongjo"', '700 20px "Nanum Myeongjo"', '800 20px "Nanum Myeongjo"',
      '400 20px "Noto Sans KR"', '500 20px "Noto Sans KR"', '700 20px "Noto Sans KR"'];
    await Promise.all(faces.map(f => document.fonts.load(f, '가A1').catch(() => null)));
    await document.fonts.ready;
  }

  WI.ready = (async () => {
    await loadFonts();
    WI.seedVisualRandom(topic.seed);
    W = WI.createWorld(topic, { W: R.W, H: R.H, scale, ratioKey });
    composite = WI.createCompositor(outCanvas, W, view, WI.makeLayout(R.W, R.H), scale);
    WI.world = W;
    if (renderMode) {
      W.update(0, 0.016);
      composite(0);
    } else {
      wireUI();
      loop();
    }
    return true;
  })();

  // --- 오프라인 렌더 훅 (render.mjs) ---
  let lastT = null;
  // 프레임 t를 그리고 JPEG/PNG dataURL 반환. 순서대로 호출해야 상태(입자 등)가 결정적이다.
  window.__renderFrame = function (t, type = 'image/jpeg', quality = 0.95) {
    const dt = lastT == null ? 0.016 : Math.min(0.05, Math.max(0.001, t - lastT));
    lastT = t;
    W.update(t, dt);
    composite(t);
    return outCanvas.toDataURL(type, quality);
  };
  window.__renderFrames = function (ts, type, quality) { return ts.map(t => window.__renderFrame(t, type, quality)); };
  // 여러 프레임을 순서대로 진행하고 마지막 프레임만 반환 (검증용)
  window.__renderSeq = function (ts, type = 'image/png', quality) {
    for (let i = 0; i < ts.length - 1; i++) {
      const t = ts[i];
      const dt = lastT == null ? 0.016 : Math.min(0.05, Math.max(0.001, t - lastT));
      lastT = t; W.update(t, dt); composite(t);
    }
    return window.__renderFrame(ts[ts.length - 1], type, quality);
  };
  // 전체 오디오를 오프라인으로 렌더해 WAV(base64)를 조각으로 반환
  window.__renderAudio = async function (bgm = 0.3, sfx = 0.8) {
    const buf = await WI.renderAudioOffline(topic, bgm, sfx, 48000);
    const { wav, peak } = WI.encodeWav(buf);
    const bytes = new Uint8Array(wav);
    const parts = [];
    const CH = 3 * 1024 * 1024;
    for (let i = 0; i < bytes.length; i += CH) {
      let s = '';
      const sub = bytes.subarray(i, i + CH);
      for (let j = 0; j < sub.length; j += 0x8000) s += String.fromCharCode.apply(null, sub.subarray(j, j + 0x8000));
      parts.push(btoa(s));
    }
    return { parts, peak, duration: buf.duration };
  };
  window.__info = () => ({ ratioKey, W: R.W, H: R.H, scale, duration: DUR, lang, fps: topic.fps || 30 });
})(window.WI = window.WI || {});
