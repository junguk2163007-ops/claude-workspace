// 우주 장면: space(기울어진 자전축의 지구 + 대기 + 달 궤도/유령 달), sun(광선이 있는 우주 시점 태양)
(function (WI) {
  const { PI } = WI;

  // 블록형 대륙이 붙은 지구. tiltG(자전축 기울기) > spinG(자전)
  WI.makeEarth = function (W, o = {}) {
    const { M, CY, SP, mesh } = W;
    const tiltG = new THREE.Group();
    const spinG = new THREE.Group();
    const oceanMat = M(o.ocean || 0x1e5fb4);
    spinG.add(mesh(SP(3, 36, 28), oceanMat));
    const lands = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * PI * 2, b = ((i * 7) % 5 - 2) * 0.4;
      const landMat = M(o.land || 0x2f9e55);
      const land = mesh(SP(0.7 + (i % 3) * 0.3, 10, 8), landMat, Math.cos(a) * Math.cos(b) * 3, Math.sin(b) * 3, Math.sin(a) * Math.cos(b) * 3);
      land.lookAt(0, 0, 0);
      land.scale.set(1, 1, 0.3);
      spinG.add(land); lands.push(land);
    }
    tiltG.add(spinG);
    const axis = mesh(CY(0.03, 0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 0, 0);
    tiltG.add(axis);
    const atmoMat = new THREE.MeshBasicMaterial({ color: 0x6fb7ff, transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const atmo = mesh(SP(3.25, 32, 24), atmoMat);
    return { tiltG, spinG, axis, atmo, atmoMat, oceanMat, lands };
  };

  WI.defineRig('space', {
    build(W, o) {
      const group = new THREE.Group();
      const earth = WI.makeEarth(W, o);
      group.add(earth.tiltG, earth.atmo);
      const orbitG = new THREE.Group();
      const orbitRingMat = new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.5 });
      const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.025, 6, 120), orbitRingMat);
      orbitRing.rotation.x = PI / 2;
      const ghostMoonMat = new THREE.MeshBasicMaterial({ map: WI.moonTex(W), transparent: true });
      const ghostMoon = new THREE.Mesh(W.SP(0.8, 20, 16), ghostMoonMat);
      orbitG.add(orbitRing, ghostMoon);
      orbitG.rotation.x = 0.28;
      group.add(orbitG);
      return Object.assign({ group, orbitG, orbitRing, orbitRingMat, ghostMoon, ghostMoonMat }, earth);
    },
  });

  // 광선 텍스처: 방사형 줄기
  function raysTex() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.translate(128, 128);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * PI * 2, len = 70 + ((i * 37) % 11) * 5, w = 0.035 + ((i * 13) % 5) * 0.008;
      const gr = g.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, 0);
      g.arc(0, 0, len, a - w, a + w); g.closePath(); g.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  // --- 우주 시점 태양 (원반 + 코로나 + 회전 광선) ---
  WI.defineRig('sun', {
    build(W, o) {
      const group = new THREE.Group();
      const r = o.radius || 4;
      const discMat = new THREE.MeshBasicMaterial({ color: 0xfff4d6, transparent: true, fog: false });
      const disc = new THREE.Mesh(W.SP(r, 40, 30), discMat);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex(), color: 0xffc46b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      glow.scale.setScalar(r * 7);
      const rt = W.tex('rays', raysTex);
      const rays = new THREE.Sprite(new THREE.SpriteMaterial({ map: rt, color: 0xffd58a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      rays.scale.setScalar(r * 9);
      const rays2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: rt, color: 0xff9d4a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      rays2.scale.setScalar(r * 6.5);
      group.add(glow, rays2, rays, disc);
      group.position.set(...(o.pos || [0, 0, 0]));
      // 밝기 a(0~1), 시간 t로 광선 회전
      function set(a, t) {
        discMat.opacity = a;
        disc.visible = a > 0.01;
        glow.material.opacity = 0.95 * a;
        rays.material.opacity = 0.8 * a;
        rays2.material.opacity = 0.6 * a;
        rays.material.rotation = t * 0.05;
        rays2.material.rotation = -t * 0.08;
      }
      return { group, disc, discMat, glow, rays, rays2, set };
    },
  });
})(window.WI = window.WI || {});
