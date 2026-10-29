// WhatIf Studio — Three.js 월드: 렌더러·카메라·조명 + 장면(rig)·연출(shot) 레지스트리
//
// rig  = 재사용 3D 자산 묶음 (scenes/*.js). build(W, opts) → { group, reset?(t), ... }
// shot = 시간 구간의 연출 함수. ctx = { t, dt, lt, s, e, p, W, R }
//        t: 절대 시간(흔들림 위상용), lt: 구간 시작 기준 시간(사건 타이밍용)
(function (WI) {
  WI.rigs = {};
  WI.shots = {};
  WI.defineRig = (name, def) => { WI.rigs[name] = def; };
  WI.defineShot = (name, fn) => { WI.shots[name] = fn; };

  const hex = v => (typeof v === 'string' ? parseInt(v.replace('#', ''), 16) : v);

  WI.createWorld = function (topic, opts) {
    const { W: CW, H: CH, scale, ratioKey } = opts;
    const cfg = Object.assign({
      bg: 0x070b18, fog: [0x070b18, 0.004], fov: 50,
      hemi: [0x5b7fc0, 0x101a2a, 0.6],
      key: [0xbfd2ff, 1.0, [-12, 30, -20]],
      sun: [0xfff3d6, 0.0, [12, 4, 14]],
    }, topic.world || {});

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(scale);
    renderer.setSize(CW, CH);

    const sc = new THREE.Scene();
    sc.background = new THREE.Color(hex(cfg.bg));
    const fog = new THREE.FogExp2(hex(cfg.fog[0]), cfg.fog[1]);
    sc.fog = fog;
    const fov = (cfg.fovByRatio && cfg.fovByRatio[ratioKey]) || cfg.fov;
    const cam = new THREE.PerspectiveCamera(fov, CW / CH, 0.1, 1000);

    const hemi = new THREE.HemisphereLight(hex(cfg.hemi[0]), hex(cfg.hemi[1]), cfg.hemi[2]);
    const keyLight = new THREE.DirectionalLight(hex(cfg.key[0]), cfg.key[1]);
    keyLight.position.set(...cfg.key[2]);
    const sunLight = new THREE.DirectionalLight(hex(cfg.sun[0]), cfg.sun[1]);
    sunLight.position.set(...cfg.sun[2]);
    sc.add(hemi, keyLight, sunLight);

    const _tmpC = new THREE.Color();
    const W = {
      renderer, sc, cam, fog, hemi, keyLight, sunLight, lamp: null,
      W: CW, H: CH, ratioKey, hud: null, frameMul: 1, R: {}, order: [],
      bgMix(a, b, u) { sc.background.setHex(a).lerp(_tmpC.setHex(b), u); },
      setBG(h, fogHex, fogD) { sc.background.setHex(h); fog.color.setHex(fogHex); fog.density = fogD; },
      setLights(h, k, s, l) {
        hemi.intensity = h; keyLight.intensity = k; sunLight.intensity = s;
        if (W.lamp) W.lamp.intensity = l || 0;
      },
      // 카메라 배치. 비율별 frame 배율(카메라 거리)을 target 기준으로 적용한다.
      look(px, py, pz, tx, ty, tz) {
        const m = W.frameMul;
        if (m === 1) cam.position.set(px, py, pz);
        else cam.position.set(tx + (px - tx) * m, ty + (py - ty) * m, tz + (pz - tz) * m);
        cam.lookAt(tx, ty, tz);
      },
      setScene(o) {
        for (const name of W.order) {
          const r = W.R[name];
          r.group.visible = r.defaultOn ? o[name] !== false : !!o[name];
        }
      },
    };

    // --- 지오메트리/머티리얼 헬퍼 (레퍼런스와 동일) ---
    W.M = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
    W.BX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    W.CY = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);
    W.SP = (r, w = 20, h = 16) => new THREE.SphereGeometry(r, w, h);
    W.mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };

    // 공유 텍스처 캐시 (처음 요청할 때 생성 → 난수 소비 순서가 rig 순서를 따름)
    const texCache = {};
    W.tex = (name, make) => texCache[name] || (texCache[name] = make(W));
    W.glowTex = () => W.tex('glow', () => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 128;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    });

    // --- rig 생성 (topic.rigs 순서대로) ---
    for (const spec of topic.rigs) {
      const name = typeof spec === 'string' ? spec : spec.name;
      const type = typeof spec === 'string' ? spec : (spec.type || spec.name);
      const def = WI.rigs[type];
      if (!def) throw new Error(`알 수 없는 장면(rig): ${type}`);
      const r = def.build(W, (typeof spec === 'object' && spec.opts) || {});
      r.defaultOn = !!def.defaultOn;
      W.R[name] = r;
      W.order.push(name);
      if (r.group && !r.noAdd) sc.add(r.group);
    }

    const shots = topic.shots;
    for (const s of shots) if (!WI.shots[s.shot]) throw new Error(`알 수 없는 연출(shot): ${s.shot}`);

    W.update = function (t, dt) {
      W.hud = null;
      for (const name of W.order) { const r = W.R[name]; if (r.reset) r.reset(t); }
      const shot = shots.find(s => t < s.e) || shots[shots.length - 1];
      const f = shot.frame && shot.frame[ratioKey];
      W.frameMul = f || 1;
      WI.shots[shot.shot]({ t, dt, lt: t - shot.s, s: shot.s, e: shot.e, p: shot.p || {}, W, R: W.R });
    };

    W.render = () => renderer.render(sc, cam);
    return W;
  };
})(window.WI = window.WI || {});
