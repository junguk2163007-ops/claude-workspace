// 바다 장면: ocean(해변·파도·조위계·배), reef(산호·물고기·산란 입자·빛줄기)
(function (WI) {
  const { S, PI } = WI;

  WI.defineRig('ocean', {
    build(W, o) {
      const { M, BX, SP, mesh } = W;
      const group = new THREE.Group();
      const seaGeo = new THREE.PlaneGeometry(160, 160, 60, 60);
      seaGeo.rotateX(-PI / 2);
      const seaMat = new THREE.MeshLambertMaterial({ color: 0x1a4a7a, transparent: true, opacity: 0.9, emissive: 0x06182c });
      const sea = new THREE.Mesh(seaGeo, seaMat);
      const seaBase = Float32Array.from(seaGeo.attributes.position.array);
      const beach = mesh(new THREE.PlaneGeometry(160, 70), M(0xb8a07a), 0, 0.36, 0);
      beach.geometry.rotateX(-PI / 2);
      beach.rotation.x = -0.07;
      const gauge = new THREE.Group();
      gauge.add(mesh(BX(0.25, 6, 0.25), M(0xe2e8f0), 0, 1.0, 0));
      for (let i = 0; i < 6; i++) gauge.add(mesh(BX(0.6, 0.12, 0.3), M(i % 2 ? 0xef4444 : 0xf8fafc), 0, -1.5 + i * 1.0, 0.1));
      gauge.position.set(-3.2, 0, -3);
      const boat = new THREE.Group();
      boat.add(mesh(BX(1.8, 0.5, 4.2), M(0x7a4b2a), 0, 0, 0), mesh(BX(0.12, 2.6, 0.12), M(0xe2e8f0), 0, 1.4, 0.2), mesh(BX(0.05, 1.8, 1.2), M(0xf8fafc), 0, 1.5, -0.4));
      boat.position.set(4.2, 0, -4);
      group.add(sea, beach, gauge, boat);
      const rocks = [];
      for (let i = 0; i < 8; i++) {
        const r = mesh(SP(0.6 + (i % 3) * 0.3, 8, 6), M(0x3b3f4a), -9 + i * 2.6, 0.6, 4 - (i * 37 % 7));
        group.add(r); rocks.push(r);
      }
      // 파도 높이장 (amp: 파고 배율)
      function waves(t, amp = 1) {
        const arr = seaGeo.attributes.position.array;
        for (let i = 0; i < arr.length; i += 3) {
          const x = seaBase[i], z = seaBase[i + 2];
          arr[i + 1] = 0.18 * (S(x * 0.35 + t * 1.3) + S(z * 0.25 + t * 0.9)) * 0.5 * amp;
        }
        seaGeo.attributes.position.needsUpdate = true;
      }
      return { group, sea, seaMat, beach, gauge, boat, rocks, waves };
    },
  });

  WI.defineRig('reef', {
    build(W, o) {
      const { M, BX, CY, mesh } = W;
      const group = new THREE.Group();
      group.add(mesh(BX(80, 1, 80), M(0xb89a6a), 0, -1.2, -20));
      const coralCols = [0xff6f91, 0xffb347, 0xf9f871, 0xc780fa, 0xff8066];
      const bases = [], corals = [];
      for (let i = 0; i < 30; i++) {
        const cg = new THREE.Group();
        const x = ((i * 53) % 17) - 8.5, z = -4 - ((i * 31) % 19);
        const col = coralCols[i % 5];
        for (let j = 0; j < 4; j++) {
          const h = 0.8 + ((i + j) % 4) * 0.5;
          cg.add(mesh(CY(0.08, 0.2, h, 6), M(col), (j - 1.5) * 0.22, h / 2 - 0.7, (j % 2) * 0.2));
        }
        cg.position.set(x, 0, z);
        group.add(cg);
        bases.push([x, z]); corals.push(cg);
      }
      const fishes = [];
      for (let i = 0; i < 26; i++) {
        const f = new THREE.Group();
        const c = i % 2 ? 0xff9f43 : 0x4cc9f0;
        f.add(mesh(BX(0.5, 0.22, 0.12), M(c)), mesh(BX(0.16, 0.22, 0.1), M(c), -0.32, 0, 0));
        f.userData = { x0: (i * 29 % 16) - 8, y0: 0.2 + (i % 5) * 0.55, z0: -5 - (i * 13 % 14), spd: 0.4 + (i % 4) * 0.2, ph: i };
        group.add(f); fishes.push(f);
      }
      const N = 500;
      const spPos = new Float32Array(N * 3), spVel = new Float32Array(N);
      function resetSpawn(i, randomY) {
        const b = bases[i % bases.length];
        spPos[i * 3] = b[0] + (Math.random() - 0.5) * 0.8;
        spPos[i * 3 + 1] = randomY ? Math.random() * 8 : -0.3;
        spPos[i * 3 + 2] = b[1] + (Math.random() - 0.5) * 0.8;
        spVel[i] = 0.6 + Math.random() * 1.0;
      }
      for (let i = 0; i < N; i++) resetSpawn(i, true);
      const spawnGeo = new THREE.BufferGeometry();
      spawnGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
      const spawnMat = new THREE.PointsMaterial({ size: 0.16, color: 0xffd6e8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      group.add(new THREE.Points(spawnGeo, spawnMat));
      const shaftMat = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      [[-4, -12], [1, -16], [5, -10]].forEach(([x, z], i) => {
        const sh = mesh(BX(2.6, 30, 0.05), shaftMat, x, 11, z);
        sh.rotation.z = 0.18 + i * 0.05;
        group.add(sh);
      });

      // 산란 입자 상승 (spawning=false면 재생성 없이 흩어짐)
      function spawn(t, dt, spawning) {
        for (let i = 0; i < N; i++) {
          spPos[i * 3 + 1] += dt * spVel[i];
          spPos[i * 3] += S(t * 2 + i) * dt * 0.2;
          if (spPos[i * 3 + 1] > 8 && spawning) resetSpawn(i, false);
        }
        spawnGeo.attributes.position.needsUpdate = true;
      }
      function swim(t) {
        fishes.forEach(f => {
          const d = f.userData;
          const x = d.x0 + S(t * d.spd + d.ph) * 3;
          f.position.set(x, d.y0 + S(t * 1.3 + d.ph) * 0.15, d.z0);
          f.rotation.y = Math.cos(t * d.spd + d.ph) > 0 ? 0 : PI;
        });
      }
      return { group, corals, fishes, spawnMat, shaftMat, spawn, swim };
    },
  });
})(window.WI = window.WI || {});
