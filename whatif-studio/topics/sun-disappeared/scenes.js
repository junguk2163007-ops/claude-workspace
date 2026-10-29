// 태양 편 전용: 빛의 파면, 태양 궤도, 눈, 숲, 바다 얼음, 심해 열수구 + 구간별 연출
(function (WI) {
  const { K, E, L, S, PI, clamp } = WI;
  const _c = new THREE.Color();
  const mixHex = (mat, a, b, u) => mat.color.setHex(a).lerp(_c.setHex(b), u);
  const portraitOf = W => W.ratioKey === '9x16';

  // ---------- 전용 rig ----------

  // 태양에서 퍼져 나가는 마지막 햇빛의 파면 (구 + 고리)
  WI.defineRig('lightShell', {
    build(W) {
      const group = new THREE.Group();
      const shellMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const shell = new THREE.Mesh(W.SP(1, 48, 32), shellMat);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.01, 8, 180), ringMat);
      group.add(shell, ring);
      function set(center, r, a, cam) {
        group.position.set(...center);
        shell.scale.setScalar(r); ring.scale.setScalar(r);
        ring.quaternion.copy(cam.quaternion);
        shellMat.opacity = 0.1 * a; ringMat.opacity = 0.9 * a;
        group.visible = a > 0.01;
      }
      return { group, set };
    },
  });

  // 위에서 본 공전 궤도 + 사라진 태양 자리 + 이탈 경로
  WI.defineRig('solarOrbit', {
    build(W) {
      const group = new THREE.Group();
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.45, depthWrite: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 6, 160), ringMat);
      ring.rotation.x = PI / 2;
      const ghostMat = new THREE.MeshBasicMaterial({ color: 0xff9d4a, transparent: true, opacity: 0.3, depthWrite: false });
      const ghost = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 6, 64), ghostMat);
      ghost.rotation.x = PI / 2;
      const path = new THREE.Group();
      const dashMat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0, depthWrite: false });
      for (let i = 0; i < 18; i++) path.add(W.mesh(W.BX(0.7, 0.05, 0.08), dashMat, 0.6 + i * 1.4, 0, 0));
      group.add(ring, ghost, path);
      return { group, ring, ringMat, ghost, ghostMat, path, dashMat };
    },
  });

  // 내리는 눈 (시간만으로 위치가 정해지는 무상태 입자)
  WI.defineRig('snow', {
    build(W) {
      const N = 1400, H = 14;
      const base = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) {
        base[i * 4] = (Math.random() - 0.5) * 34;
        base[i * 4 + 1] = Math.random() * H;
        base[i * 4 + 2] = -24 + Math.random() * 32;
        base[i * 4 + 3] = 0.6 + Math.random() * 0.9;
      }
      const pos = new Float32Array(N * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xe8f2ff, size: 0.12, transparent: true, opacity: 0.85, depthWrite: false });
      const group = new THREE.Points(geo, mat);
      function set(t, opacity, wind = 0.6) {
        for (let i = 0; i < N; i++) {
          const v = base[i * 4 + 3];
          const y = (((base[i * 4 + 1] - t * v) % H) + H) % H;
          pos[i * 3] = base[i * 4] + S(t * 0.7 + i) * 0.3 + wind * (H - y) * 0.15;
          pos[i * 3 + 1] = y;
          pos[i * 3 + 2] = base[i * 4 + 2];
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = opacity;
      }
      return { group, mat, set };
    },
  });

  // 바다 얼음: 떠다니는 얼음 조각이 생기고, 금 간 얼음판이 덮는다
  WI.defineRig('ice', {
    build(W) {
      const group = new THREE.Group();
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const g = c.getContext('2d');
      g.fillStyle = '#dbe8f3'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(120,160,200,0.55)'; g.lineWidth = 1.5;
      for (let i = 0; i < 26; i++) {
        let x = Math.random() * 256, y = Math.random() * 256;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 70; y += (Math.random() - 0.5) * 70; g.lineTo(x, y); }
        g.stroke();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(10, 10);
      const sheetMat = new THREE.MeshLambertMaterial({ map: tex, color: 0xffffff, transparent: true, opacity: 0, emissive: 0x1a2a3a });
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), sheetMat);
      sheet.rotation.x = -PI / 2;
      group.add(sheet);
      const floes = [];
      const floeMat = new THREE.MeshLambertMaterial({ color: 0xe6f0f8, emissive: 0x182838 });
      for (let i = 0; i < 70; i++) {
        const f = W.mesh(W.BX(1.2 + Math.random() * 2.6, 0.18, 0.9 + Math.random() * 2.2), floeMat, (Math.random() - 0.5) * 70, 0, -12 - Math.random() * 70);
        f.rotation.y = Math.random() * PI;
        f.userData.at = Math.random();
        group.add(f); floes.push(f);
      }
      // f: 0~1 결빙 진행도, level: 해수면 높이
      function set(f, level) {
        sheetMat.opacity = 0.92 * E(K(f, 0.45, 1));
        sheet.position.y = level + 0.03;
        floes.forEach(o => {
          const s = E(K(f, o.userData.at * 0.6, o.userData.at * 0.6 + 0.25));
          o.visible = s > 0.01;
          o.scale.setScalar(Math.max(0.01, s));
          o.position.y = level + 0.06;
        });
      }
      return { group, set };
    },
  });

  // 숲과 풀: 광합성이 멈추며 시든다
  WI.defineRig('grove', {
    build(W) {
      const { M, CY, mesh } = W;
      const group = new THREE.Group();
      const crowns = [], grass = [];
      [[-3.2, -9], [0.4, -12], [3.6, -10], [-1.6, -16], [2.2, -19], [-4.6, -21], [5.4, -17], [-0.4, -24]].forEach(([x, z], i) => {
        const tree = new THREE.Group();
        tree.add(mesh(CY(0.22, 0.32, 2.2, 7), M(0x3b2a1c), 0, 1.1, 0));
        for (let k = 0; k < 3; k++) {
          const cr = mesh(CY(0, 1.7 - k * 0.35, 1.9, 8), M(0x2f7d3a), 0, 2.6 + k * 1.05, 0);
          tree.add(cr); crowns.push({ mesh: cr, i, k });
        }
        tree.position.set(x, 0, z);
        tree.userData.i = i;
        group.add(tree);
      });
      for (let i = 0; i < 140; i++) {
        const x = (Math.random() - 0.5) * 16, z = -5 - Math.random() * 20;
        const tuft = mesh(CY(0, 0.09, 0.55 + Math.random() * 0.4, 4), M(0x3f9a46), x, 0.3, z);
        tuft.rotation.z = (Math.random() - 0.5) * 0.4;
        tuft.userData.z0 = tuft.rotation.z;
        group.add(tuft); grass.push(tuft);
      }
      // w: 시듦 0~1, frost: 서리 0~1
      function set(w, frost, t) {
        crowns.forEach(({ mesh: m, i, k }) => {
          const col = w < 0.5 ? [0x2f7d3a, 0x7a5a2a, w / 0.5] : [0x7a5a2a, 0x4d4b47, (w - 0.5) / 0.5];
          mixHex(m.material, col[0], col[1], col[2]);
          m.material.color.lerp(_c.setHex(0xd6e4ee), frost * 0.6);
          m.scale.set(1 - 0.3 * w, 1 - 0.25 * w, 1 - 0.3 * w);
          m.rotation.z = S(i * 1.7 + k) * 0.25 * w + S(t * 0.6 + i) * 0.02;
        });
        grass.forEach((g, i) => {
          mixHex(g.material, 0x3f9a46, 0x6d5a3a, clamp(w * 1.4));
          g.material.color.lerp(_c.setHex(0xd6e4ee), frost * 0.5);
          g.rotation.z = g.userData.z0 + (i % 2 ? 1 : -1) * 1.0 * E(clamp(w * 1.2));
          g.scale.y = 1 - 0.4 * w;
        });
      }
      return { group, set };
    },
  });

  // 심해 열수구: 굴뚝, 검은 연기, 관벌레, 바다눈
  WI.defineRig('vents', {
    build(W) {
      const { M, BX, CY, SP, mesh } = W;
      const group = new THREE.Group();
      group.add(mesh(BX(90, 1, 90), M(0x1d222b), 0, -0.5, -20));
      for (let i = 0; i < 14; i++) {
        const r = mesh(SP(0.6 + Math.random() * 1.4, 7, 5), M(0x262b33), (Math.random() - 0.5) * 26, 0, -4 - Math.random() * 26);
        r.scale.y = 0.5; group.add(r);
      }
      const chimneys = [[-3, -10, 5.5], [2.6, -14, 7], [6, -8, 4.2]];
      const lights = [];
      chimneys.forEach(([x, z, h]) => {
        const ch = new THREE.Group();
        for (let k = 0; k < 4; k++) {
          const seg = mesh(CY(0.55 - k * 0.1, 0.8 - k * 0.1, h / 4, 9), M(0x2e2824, { emissive: k === 0 ? 0x2a0d02 : 0x000000 }), (k % 2) * 0.08, h / 8 + k * h / 4, 0);
          ch.add(seg);
        }
        ch.position.set(x, 0, z);
        group.add(ch);
        const pl = new THREE.PointLight(0xff8a3d, 1.4, 16);
        pl.position.set(x, 1.0, z + 1.2);
        group.add(pl); lights.push(pl);
      });
      // 연기 입자
      const PER = 260, NS = PER * chimneys.length;
      const smPos = new Float32Array(NS * 3), smBase = new Float32Array(NS * 2);
      for (let i = 0; i < NS; i++) { smBase[i * 2] = Math.random(); smBase[i * 2 + 1] = 0.7 + Math.random() * 0.6; }
      const smGeo = new THREE.BufferGeometry();
      smGeo.setAttribute('position', new THREE.BufferAttribute(smPos, 3));
      const smMat = new THREE.PointsMaterial({ color: 0x7d838e, size: 0.55, transparent: true, opacity: 0.5, depthWrite: false });
      group.add(new THREE.Points(smGeo, smMat));
      // 관벌레 군락
      const worms = [];
      chimneys.forEach(([cx, cz]) => {
        for (let i = 0; i < 14; i++) {
          const w = new THREE.Group();
          const h = 0.7 + Math.random() * 1.0;
          w.add(mesh(CY(0.06, 0.08, h, 6), M(0xe8e2d6), 0, h / 2, 0));
          w.add(mesh(SP(0.13, 8, 6), M(0xd62828, { emissive: 0x3a0505 }), 0, h + 0.08, 0));
          const a = Math.random() * PI * 2, r = 1.0 + Math.random() * 1.6;
          w.position.set(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r);
          w.userData.ph = Math.random() * 6;
          group.add(w); worms.push(w);
        }
      });
      // 바다눈
      const NM = 700, msPos = new Float32Array(NM * 3), msBase = new Float32Array(NM * 3);
      for (let i = 0; i < NM; i++) { msBase[i * 3] = (Math.random() - 0.5) * 24; msBase[i * 3 + 1] = Math.random() * 10; msBase[i * 3 + 2] = -2 - Math.random() * 22; }
      const msGeo = new THREE.BufferGeometry();
      msGeo.setAttribute('position', new THREE.BufferAttribute(msPos, 3));
      const msMat = new THREE.PointsMaterial({ color: 0xcfe3ff, size: 0.06, transparent: true, opacity: 0.6, depthWrite: false });
      group.add(new THREE.Points(msGeo, msMat));

      function animate(t) {
        chimneys.forEach(([cx, cz, h], c) => {
          for (let j = 0; j < PER; j++) {
            const i = c * PER + j;
            const ph = (smBase[i * 2] + t * 0.12 * smBase[i * 2 + 1]) % 1;
            const y = h + ph * 11, spread = 0.15 + ph * 2.2;
            smPos[i * 3] = cx + S(smBase[i * 2] * 40 + t * 0.6) * spread + ph * 1.2;
            smPos[i * 3 + 1] = y;
            smPos[i * 3 + 2] = cz + Math.cos(smBase[i * 2] * 31 + t * 0.5) * spread;
          }
        });
        smGeo.attributes.position.needsUpdate = true;
        worms.forEach(w => { w.rotation.z = S(t * 1.4 + w.userData.ph) * 0.12; w.rotation.x = Math.cos(t * 1.1 + w.userData.ph) * 0.08; });
        for (let i = 0; i < NM; i++) {
          msPos[i * 3] = msBase[i * 3] + S(t * 0.3 + i) * 0.2;
          msPos[i * 3 + 1] = ((msBase[i * 3 + 1] - t * 0.25) % 10 + 10) % 10;
          msPos[i * 3 + 2] = msBase[i * 3 + 2];
        }
        msGeo.attributes.position.needsUpdate = true;
        lights.forEach((l, i) => { l.intensity = 2.2 + 0.35 * S(t * 6 + i * 2); });
      }
      return { group, animate };
    },
  });

  // ---------- 공통 도우미 ----------

  // 지상 색: frost(서리) 0~1. 사람 위치·표시도 매 프레임 초기화
  function groundStyle(R, { frost = 0, people = true }) {
    const g = R.ground;
    mixHex(g.floorMat, 0x22302a, 0x9fb3c6, frost);
    g.hillMats.forEach(m => mixHex(m, 0x15211d, 0x8095a8, frost));
    g.trees.forEach(({ crown }) => mixHex(crown.material, 0x10231a, 0xc9d9e6, frost * 0.85));
    g.people.forEach(p => { p.root.visible = people; p.root.position.x = p.baseX; });
    g.lampBox.visible = people;
  }

  // 우주 배치: 세로는 태양 위·지구 아래, 가로는 태양 왼쪽·지구 오른쪽
  function spaceLayout(W) {
    return portraitOf(W)
      ? { sun: [0, 0, 0], earth: [0, -20, 0], es: 1.5, cam: [0, -3, 60], look: [0, -3, 0] }
      : { sun: [-17, 0, 0], earth: [15, -1, 0], es: 1.3, cam: [0, 0, 40], look: [-1, 0, 0] };
  }

  function placeEarth(R, W, P, t, lit) {
    const sp = R.space;
    sp.orbitG.visible = false;
    sp.group.position.set(...P.earth);
    sp.group.scale.setScalar(P.es);
    sp.tiltG.rotation.z = -0.41;
    sp.spinG.rotation.y = t * 0.4;
    W.hemi.color.setHex(0x5b7fc0); W.hemi.groundColor.setHex(0x101a2a);
    W.sunLight.position.set(P.sun[0] - P.earth[0], P.sun[1] - P.earth[1], P.sun[2] - P.earth[2]);
    W.setLights(0.1 + 0.05 * (1 - lit), 0, 1.6 * lit, 0);
  }

  const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------- 연출 ----------

  // 0~10초: 우주에서 본 태양과 지구 → 태양 소멸 → 마지막 햇빛이 8분 20초 걸려 지구에 닿음
  WI.defineShot('sun.vanishSpace', ({ t, W, R }) => {
    const P = spaceLayout(W);
    W.setScene({ space: true, sun: true, lightShell: true });
    W.setBG(0x02030a, 0x02030a, 0);
    R.stars.mat.opacity = 0.9;
    const T0 = 5.0, ARRIVE = 9.6;
    const a = t < 4.4 ? 1 : t < T0 ? 1 + 0.25 * S(t * 60) : 1 - E(K(t, T0, T0 + 0.5));
    R.sun.group.position.set(...P.sun);
    R.sun.set(clamp(a), t);
    const flash = t > T0 && t < T0 + 0.4 ? 1 - K(t, T0, T0 + 0.4) : 0;
    R.sun.glow.scale.setScalar(28 * (1 + flash * 1.8));
    R.sun.glow.material.opacity = Math.max(R.sun.glow.material.opacity, 0.9 * flash);
    const lit = 1 - E(K(t, ARRIVE, ARRIVE + 0.4));
    placeEarth(R, W, P, t, lit);
    const sh = t > T0 && t < T0 + 0.4 ? (Math.random() - 0.5) * 0.5 : 0;
    W.look(P.cam[0] + S(t * 0.2) * 0.8 + sh, P.cam[1] + sh, P.cam[2], ...P.look);
    const dist = Math.hypot(P.earth[0] - P.sun[0], P.earth[1] - P.sun[1]);
    const u = K(t, T0, ARRIVE);
    R.lightShell.set(P.sun, L(4, dist - 3 * P.es, u), t > T0 ? 1 - E(K(t, ARRIVE - 0.2, ARRIVE + 0.5)) : 0, W.cam);
    if (t > T0 + 0.4) {
      const left = 500 * (1 - K(t, T0 + 0.4, ARRIVE));
      W.hud = left > 0
        ? { big: mmss(left), small: '마지막 햇빛이 지구로 가는 중' }
        : { big: '00:00', small: '지구에도 햇빛이 끊김' };
    }
  });

  // 10~16초: 한낮의 하늘에서 태양이 꺼짐
  WI.defineShot('sun.daylightOut', ({ t, W, R }) => {
    const ss = R.skysun;
    W.setScene({ ground: true, skysun: true });
    const off = E(K(t, 10.6, 11.3));
    W.bgMix(0x6db3f2, 0x02030a, off);
    const bg = W.sc.background.getHex();
    W.setBG(bg, bg, 0.003);
    W.hemi.color.setHex(0x5b7fc0); W.hemi.groundColor.setHex(0x101a2a);
    W.sunLight.position.set(0, 40, -20);
    W.setLights(L(1.0, 0.24, off), 0, L(0.8, 0, off), E(K(t, 12.2, 13.2)) * 1.8);
    ss.disc.position.set(0, 14, -60); ss.glow.position.set(0, 14, -60.5);
    ss.occluder.visible = false;
    ss.disc.visible = off < 0.6;
    ss.disc.material.color.setHex(0xfff1c9);
    ss.glow.material.color.setHex(0xfff6dc);
    ss.glow.material.opacity = 0.95 * (1 - off);
    ss.glow.scale.setScalar(L(48, 6, off));
    R.stars.mat.opacity = 0.9 * E(K(t, 11.0, 12.6));
    groundStyle(R, {});
    R.ground.pose(t, -0.45, t > 11.0);
    if (t > 11.3) R.ground.people.forEach((p, i) => { p.armL.rotation.x = -0.9 + S(t * 2 + i) * 0.15; });
    W.look(S(t * 0.3) * 0.3, 2.0, 2, 0, 8, -60);
  });

  // 16~22초: 밤하늘의 달도 몇 초 뒤 꺼짐
  WI.defineShot('sun.moonFades', ({ t, W, R }) => {
    const moon = R.moon;
    W.setScene({ ground: true, moon: true });
    const a = 1 - E(K(t, 18.0, 19.6));
    moon.mat.opacity = a;
    moon.glow.material.opacity = 0.85 * a;
    moon.glow.scale.setScalar(26);
    moon.group.visible = a > 0.01;
    W.bgMix(0x0a1230, 0x03050b, 1 - a);
    W.setBG(W.sc.background.getHex(), 0x070b18, 0.004);
    W.setLights(0.24 + 0.2 * a, 0.9 * a, 0, 1.4 * (1 - a));
    R.stars.mat.opacity = 0.5 + 0.5 * (1 - a);
    groundStyle(R, {});
    R.ground.pose(t, -0.4, t > 18.6);
    W.look(-2.5 + S(t * 0.25) * 0.3, 1.6, 3.5, -3, L(13, 11, K(t, 16, 22)), -55);
  });

  // 22~28초: 위에서 본 궤도 — 공전하던 지구가 접선 방향 직선으로 이탈
  WI.defineShot('sun.orbitBreak', ({ t, W, R }) => {
    const pt = portraitOf(W);
    const sp = R.space, so = R.solarOrbit;
    W.setScene({ space: true, solarOrbit: true });
    W.setBG(0x02030a, 0x02030a, 0);
    R.stars.mat.opacity = 0.95;
    const Rr = pt ? 8 : 12, w = 0.5, tb = 24.0;
    const th = tt => 0.6 + w * (tt - 22);
    let x, z;
    const thb = th(tb), bx = Rr * Math.cos(thb), bz = Rr * Math.sin(thb);
    const vx = -Rr * w * Math.sin(thb), vz = Rr * w * Math.cos(thb);
    if (t < tb) { x = Rr * Math.cos(th(t)); z = Rr * Math.sin(th(t)); }
    else { x = bx + vx * (t - tb); z = bz + vz * (t - tb); }
    sp.orbitG.visible = false;
    sp.group.position.set(x, 0, z);
    sp.group.scale.setScalar(pt ? 0.75 : 0.9);
    sp.tiltG.rotation.z = -0.41;
    sp.spinG.rotation.y = t * 0.6;
    W.hemi.color.setHex(0x8fb0e0); W.hemi.groundColor.setHex(0x101a2a);
    W.setLights(0.55, 0, 0, 0);
    so.ring.scale.setScalar(Rr);
    so.ringMat.opacity = t < tb ? 0.45 : L(0.45, 0.15, E(K(t, tb, tb + 1.5)));
    so.ghostMat.opacity = 0.3 + 0.08 * S(t * 3);
    so.path.position.set(bx, 0, bz);
    so.path.rotation.y = -Math.atan2(vz, vx);
    so.dashMat.opacity = 0.75 * E(K(t, tb - 0.3, tb + 0.6));
    const lx = L(0, x, 0.3), lz = L(pt ? 2 : 3, z, 0.3);
    if (pt) W.look(lx, 26, lz + 20, lx, 0, lz);
    else W.look(lx, 20, lz + 22, lx + 2, 0, lz);
    W.hud = { big: '초속 29.8km', small: t < tb ? '아직 공전 중 — 중력도 8분 20초 늦게 끊김' : '궤도 이탈 — 직선으로 나아감' };
  });

  // 28~34초: 서리와 눈, 떨리는 사람들, 기온 하강
  WI.defineShot('sun.deepFreeze', ({ t, W, R }) => {
    W.setScene({ ground: true, snow: true });
    const frost = E(K(t, 28.4, 32.5));
    W.setBG(0x04070e, 0x0b1322, 0.012);
    W.hemi.color.setHex(0x7aa7d9); W.hemi.groundColor.setHex(0x1a2433);
    W.setLights(0.32, 0, 0, 1.4);
    R.stars.mat.opacity = 0.8;
    groundStyle(R, { frost });
    R.snow.group.position.set(0, 0, -4);
    R.snow.set(t, 0.9 * E(K(t, 28, 29)));
    R.ground.pose(t, 0.05, false);
    R.ground.people.forEach((p, i) => {
      p.root.position.x = p.baseX + S(t * 45 + i) * 0.025 * frost;
      p.armL.rotation.x = -1.25; p.armR.rotation.x = -1.25;
      p.armL.rotation.z = -0.55; p.armR.rotation.z = 0.55;
    });
    W.look(3.5 + S(t * 0.2) * 0.4, 2.4, -13.5, 0, 1.5, -7);
    if (t < 32.2) {
      const temp = Math.round(L(15, -18, E(K(t, 28.4, 31.8))));
      W.hud = { big: `${temp < 0 ? '−' + Math.abs(temp) : temp}℃`, small: '지표 평균 기온 (추정)', color: '#9fd3ff' };
    } else {
      W.hud = { big: '1년 뒤 −73℃', small: '추정치', color: '#9fd3ff' };
    }
  });

  // 34~40초: 숲과 풀이 시든다
  WI.defineShot('sun.plantsFail', ({ t, W, R }) => {
    W.setScene({ ground: true, grove: true });
    const u = K(t, 34, 40), w = E(K(t, 34.6, 39.2));
    W.setBG(0x05080f, 0x05080f, 0.02);
    W.hemi.color.setHex(0x9ab8d8); W.hemi.groundColor.setHex(0x1a2030);
    W.setLights(0.75, 0, 0, 0);
    R.stars.mat.opacity = 0.7;
    groundStyle(R, { frost: 0.2 * u, people: false });
    R.grove.set(w, 0.2 * u, t);
    W.look(L(-2.5, 2.5, u), 3.2, 4, 0, 2.6, -16);
    if (t > 35.8) W.hud = { big: '작은 식물: 몇 주', small: '큰 나무: 수십 년 버틸 수도 (추정)', color: '#c8e6a0' };
  });

  // 40~46초: 바다가 표면부터 언다
  WI.defineShot('sun.oceanIce', ({ t, W, R }) => {
    const oc = R.ocean;
    W.setScene({ ocean: true, ice: true, snow: true });
    const u = K(t, 40, 46), f = E(K(t, 40.3, 45.2));
    W.setBG(0x060b16, 0x0a1424, 0.008);
    W.hemi.color.setHex(0x7aa7d9); W.hemi.groundColor.setHex(0x101a2a);
    W.setLights(0.75, 0, 0, 0);
    R.stars.mat.opacity = 0.9;
    oc.sea.position.y = 0;
    oc.waves(t, 1 - f);
    mixHex(oc.seaMat, 0x1a4a7a, 0x0d2236, f);
    oc.boat.position.y = 0.15;
    oc.boat.rotation.z = 0.12 * f;
    R.ice.set(f, 0);
    R.snow.group.position.set(0, 0, 2);
    R.snow.set(t, 0.6);
    W.look(S(t * 0.15) * 1.5, L(6, 9, u), 16, 0, 0, -30);
  });

  // 46~53초: 심해 열수구의 생명
  WI.defineShot('sun.vents', ({ t, W, R }) => {
    W.setScene({ vents: true, stars: false });
    const u = K(t, 46, 53);
    W.setBG(0x021024, 0x021024, 0.04);
    W.hemi.color.setHex(0x4a86c4); W.hemi.groundColor.setHex(0x0a1220);
    W.setLights(1.1, 0, 0, 0);
    R.vents.animate(t);
    W.look(L(-2.5, 1.5, u) + S(t * 0.2) * 0.6, L(1.6, 2.8, u), 5, 1, 2.6, -11);
  });

  // 53~60초: 반전 — 해돋이, 서리가 녹고 사람들이 팔을 든다
  WI.defineShot('sun.sunrise', ({ t, W, R }) => {
    const ss = R.skysun;
    W.setScene({ ground: true, skysun: true });
    const r = E(K(t, 53.3, 58.5));
    if (r < 0.5) W.bgMix(0x05070f, 0xf08a5d, r / 0.5); else W.bgMix(0xf08a5d, 0x7ab8ee, (r - 0.5) / 0.5);
    const bg = W.sc.background.getHex();
    W.setBG(bg, bg, 0.004);
    const y = L(-3, 11, r);
    ss.disc.position.set(0, y, -60); ss.glow.position.set(0, y, -60.5);
    ss.occluder.visible = false;
    ss.disc.visible = true;
    mixHex(ss.disc.material, 0xffb26b, 0xfff1c9, r);
    mixHex(ss.glow.material, 0xff8a4a, 0xfff1c9, r);
    ss.glow.material.opacity = 0.95;
    ss.glow.scale.setScalar(L(30, 44, r));
    W.hemi.color.setHex(0x5b7fc0); W.hemi.groundColor.setHex(0x101a2a);
    W.sunLight.position.set(0, L(5, 40, r), -30);
    W.setLights(L(0.15, 1.0, r), 0, L(0, 0.9, r), L(1.2, 0, r));
    R.stars.mat.opacity = 0.9 * (1 - E(K(t, 53.5, 56)));
    groundStyle(R, { frost: L(0.6, 0, r) });
    R.ground.pose(t, -0.25, false);
    const up = E(K(t, 55.5, 56.6));
    R.ground.people.forEach((p, i) => { p.armL.rotation.x = -2.7 * up + S(t * 3 + i) * 0.1 * up; p.armR.rotation.x = -2.7 * up; });
    W.look(S(t * 0.2) * 0.3, 1.8, 2.2, 0, L(3, 7, r), -60);
  });

  // 60~66초: 다시 빛나는 태양과 지구
  WI.defineShot('sun.returnSpace', ({ t, W, R }) => {
    const P = spaceLayout(W);
    W.setScene({ space: true, sun: true });
    W.setBG(0x02030a, 0x02030a, 0);
    R.stars.mat.opacity = 0.9;
    R.sun.group.position.set(...P.sun);
    R.sun.set(1, t);
    R.sun.glow.scale.setScalar(28);
    placeEarth(R, W, P, t, 1);
    const k = L(0.8, 1.05, E(K(t, 60, 63.5)));
    W.look(P.look[0] + (P.cam[0] - P.look[0]) * k, P.look[1] + (P.cam[1] - P.look[1]) * k, P.look[2] + (P.cam[2] - P.look[2]) * k, ...P.look);
  });
})(window.WI = window.WI || {});
