// 하늘 장면: stars(별), moon(밤하늘의 달), meteors(유성), skysun(하늘의 태양 + 가림 원반)
(function (WI) {
  const { PI } = WI;

  // 달 표면 텍스처 (달 rig, space rig의 유령 달이 공유)
  WI.moonTex = W => W.tex('moon', () => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#d8d5cb'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = `rgba(${150 + Math.random() * 80 | 0},${148 + Math.random() * 80 | 0},${140 + Math.random() * 70 | 0},0.5)`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.fillStyle = 'rgba(120,118,112,0.55)';
    [[90, 90, 42, 30], [150, 70, 30, 22], [110, 150, 48, 34], [185, 140, 28, 36], [70, 190, 26, 18]].forEach(([x, y, rx, ry]) => {
      g.beginPath(); g.ellipse(x, y, rx, ry, Math.random(), 0, PI * 2); g.fill();
    });
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = 3 + Math.random() * 10;
      g.strokeStyle = 'rgba(95,93,88,0.6)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.stroke();
      g.fillStyle = 'rgba(255,255,250,0.18)';
      g.beginPath(); g.arc(x - 1, y - 1, r * 0.6, 0, PI * 2); g.fill();
    }
    return new THREE.CanvasTexture(c);
  });

  // --- 별 (기본 표시, setScene({stars:false})로 숨김) ---
  WI.defineRig('stars', {
    defaultOn: true,
    build(W, o) {
      const N = o.count || 2200, R = o.radius || 300;
      const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const th = Math.random() * PI * 2, ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = R * Math.sin(ph) * Math.cos(th);
        pos[i * 3 + 1] = R * Math.cos(ph);
        pos[i * 3 + 2] = R * Math.sin(ph) * Math.sin(th);
        const k = 0.65 + Math.random() * 0.35, warm = Math.random();
        col[i * 3] = k * (warm > 0.8 ? 1 : 0.85);
        col[i * 3 + 1] = k * 0.92;
        col[i * 3 + 2] = k * (warm < 0.3 ? 1 : 0.9);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.4, fog: false, depthWrite: false });
      const group = new THREE.Points(geo, mat);
      const spin = o.spin == null ? 0.012 : o.spin;
      return { group, mat, reset(t) { group.rotation.y = t * spin; mat.size = 2.4; } };
    },
  });

  // --- 밤하늘의 달 ---
  WI.defineRig('moon', {
    build(W, o) {
      const group = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ map: WI.moonTex(W), transparent: true, fog: false });
      const ball = new THREE.Mesh(W.SP(4, 32, 24), mat);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex(), color: 0xcfe0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      glow.scale.setScalar(26);
      group.add(ball, glow);
      group.position.set(...(o.pos || [-3, 16.5, -55]));
      return { group, mat, ball, glow };
    },
  });

  // --- 유성 ---
  WI.defineRig('meteors', {
    build(W, o) {
      const group = new THREE.Group();
      const list = [];
      for (let i = 0; i < (o.count || 6); i++) {
        const m = W.mesh(W.BX(0.14, 0.14, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false }));
        group.add(m); list.push(m);
      }
      // 레퍼런스의 유성 궤적 (ph: 0~1 진행도)
      function animate(t, rate = 0.45) {
        list.forEach((m, i) => {
          const ph = ((t * rate + i * 0.37) % 1);
          const sx = -60 + i * 22, sy = 70 - (i % 3) * 8, sz = -90;
          m.position.set(sx + ph * 70, sy - ph * 40, sz);
          m.lookAt(sx + (ph + 0.01) * 70, sy - (ph + 0.01) * 40, sz);
          m.visible = ph < 0.4;
          m.material.opacity = 0.9 * (1 - ph / 0.4);
        });
      }
      return { group, list, animate };
    },
  });

  // --- 하늘의 태양 + 가림 원반 (개기일식, 일출 등) ---
  WI.defineRig('skysun', {
    build(W, o) {
      const group = new THREE.Group();
      const p = o.pos || [0, 14, -60];
      const disc = new THREE.Mesh(W.SP(2.3, 28, 20), new THREE.MeshBasicMaterial({ color: 0xfff1c9, fog: false }));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex(), color: 0xffe2a8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      const occMat = new THREE.MeshBasicMaterial({ color: 0x050507, transparent: true, fog: false });
      const occluder = new THREE.Mesh(W.SP(2.38, 28, 20), occMat);
      disc.position.set(p[0], p[1], p[2]); glow.position.set(p[0], p[1], p[2] - 0.5); occluder.position.set(p[0], p[1], p[2] + 1);
      group.add(disc, glow, occluder);
      return { group, disc, glow, occluder, occMat };
    },
  });
})(window.WI = window.WI || {});
