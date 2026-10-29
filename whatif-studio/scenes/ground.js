// 지상 장면: 들판·언덕·나무·사람들·랜턴. 밤/낮/일식 공용.
(function (WI) {
  const { S, PI } = WI;

  // 블록형 사람 (레퍼런스 makePerson)
  WI.makePerson = function (W, shirtCol, scale = 0.9) {
    const { M, BX, mesh } = W;
    const root = new THREE.Group();
    root.scale.setScalar(scale);
    const body = new THREE.Group();
    root.add(body);
    const skin = M(0xe8be9e), hair = M(0x1d1512), shirt = M(shirtCol), pants = M(0x1e293b);
    const head = new THREE.Group();
    head.position.set(0, 1.55, 0);
    head.add(mesh(BX(0.75, 0.75, 0.75), skin));
    head.add(mesh(BX(0.78, 0.25, 0.78), hair, 0, 0.3, 0));
    head.add(mesh(BX(0.78, 0.5, 0.25), hair, 0, 0.1, -0.28));
    head.add(mesh(BX(0.12, 0.12, 0.05), M(0x111111), -0.16, 0.02, 0.38));
    head.add(mesh(BX(0.12, 0.12, 0.05), M(0x111111), 0.16, 0.02, 0.38));
    const mouth = mesh(BX(0.14, 0.09, 0.06), M(0x7f1d1d), 0, -0.14, 0.38);
    head.add(mouth);
    body.add(head);
    body.add(mesh(BX(0.8, 1.0, 0.45), shirt, 0, 0.7, 0));
    const armL = new THREE.Group(); armL.position.set(0.55, 1.1, 0);
    armL.add(mesh(BX(0.3, 0.85, 0.3), shirt, 0, -0.35, 0), mesh(BX(0.28, 0.2, 0.28), skin, 0, -0.8, 0));
    const armR = new THREE.Group(); armR.position.set(-0.55, 1.1, 0);
    armR.add(mesh(BX(0.3, 0.85, 0.3), shirt, 0, -0.35, 0), mesh(BX(0.28, 0.2, 0.28), skin, 0, -0.8, 0));
    body.add(armL, armR);
    body.add(mesh(BX(0.34, 0.8, 0.36), pants, 0.2, -0.2, 0), mesh(BX(0.34, 0.8, 0.36), pants, -0.2, -0.2, 0));
    return { root, body, head, mouth, armL, armR };
  };

  WI.defineRig('ground', {
    build(W, o) {
      const { M, BX, CY, SP, mesh } = W;
      const group = new THREE.Group();
      const floorMat = M(o.floor || 0x22302a);
      group.add(mesh(BX(300, 1, 300), floorMat, 0, -0.5, -40));
      const hillMats = [];
      [[-34, -4, -48, 14, 1.7], [28, -5, -58, 16, 1.5], [0, -6, -80, 22, 2.2]].forEach(([x, y, z, r, sx]) => {
        const m = M(o.hill || 0x15211d); hillMats.push(m);
        const h = mesh(SP(r, 24, 16), m, x, y, z); h.scale.set(sx, 0.5, 1); group.add(h);
      });
      const trees = [];
      for (let i = 0; i < 16; i++) {
        const x = (i % 2 ? 1 : -1) * (6 + (i * 7919 % 13)), z = -12 - (i * 104729 % 26);
        const trunk = mesh(CY(0.2, 0.28, 1.4, 6), M(0x2a1d14), x, 0.7, z);
        const crown = mesh(CY(0, 1.5, 4.2, 7), M(o.leaf || 0x10231a), x, 3.2, z);
        group.add(trunk, crown);
        trees.push({ trunk, crown });
      }
      const people = [];
      (o.people || [[-2.4, -7, 0xd97706], [-1.0, -6.2, 0x38bdf8], [0.4, -7.4, 0xf43f5e], [1.8, -6.4, 0x34d399], [-3.6, -9, 0xa78bfa], [3.2, -8.6, 0xfb923c]]).forEach(([x, z, c]) => {
        const p = WI.makePerson(W, c, 0.9);
        p.root.position.set(x, 0.54, z);
        p.root.rotation.y = PI;
        p.baseX = x;
        group.add(p.root);
        people.push(p);
      });
      const lamp = new THREE.PointLight(0xffc875, 0, 22);
      lamp.position.set(0.2, 1.6, -4.6);
      group.add(lamp);
      const lampBox = mesh(BX(0.3, 0.4, 0.3), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), 0.2, 0.2, -4.6);
      group.add(lampBox);
      W.lamp = lamp;

      // 사람들 기본 자세: 고개(lookX), 입 벌림
      function pose(t, lookX, mouthOpen) {
        people.forEach((p, i) => {
          p.head.rotation.x = lookX;
          p.head.rotation.y = S(t * 1.3 + i) * 0.12;
          p.mouth.scale.set(mouthOpen ? 1.5 : 1, mouthOpen ? 2.4 + S(t * 8 + i) * 0.4 : 1, 1);
          p.armL.rotation.z = 0.1; p.armR.rotation.z = -0.1;
          p.armL.rotation.x = 0; p.armR.rotation.x = 0;
        });
      }
      return { group, floorMat, hillMats, trees, people, lamp, lampBox, pose };
    },
  });
})(window.WI = window.WI || {});
