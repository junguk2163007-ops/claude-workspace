// 달 편 전용: 음력 팻말 + 구간별 연출 (레퍼런스 updateWorld 를 구간 단위로 옮김)
(function (WI) {
  const { K, E, L, S, PI } = WI;

  // 음력 팻말 (ground 그룹에 붙는다)
  WI.defineRig('lunarSign', {
    build(W) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const g = c.getContext('2d');
      g.fillStyle = '#2a1f14'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#d6b892'; g.lineWidth = 8; g.strokeRect(6, 6, 244, 244);
      g.fillStyle = '#f3e3c8'; g.font = '700 30px "Noto Sans KR", sans-serif'; g.textAlign = 'center';
      g.fillText('음력 8월 15일', 128, 60);
      g.setLineDash([10, 9]); g.strokeStyle = '#e7d8c5'; g.lineWidth = 5;
      g.beginPath(); g.arc(128, 135, 56, 0, PI * 2); g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#a8a29e'; g.font = '700 26px "Noto Sans KR", sans-serif';
      g.fillText('보름달 없음', 128, 232);
      const group = new THREE.Group();
      group.add(W.mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }), 0, 0, 0));
      group.add(W.mesh(W.BX(0.1, 1.6, 0.1), W.M(0x4a3524), 0, -1.1, -0.06));
      group.position.set(-0.9, 2.2, -2.6);
      W.R.ground.group.add(group);
      return { group, noAdd: true };
    },
  });

  // 0~9초: 보름달 → 깜빡임 → 소멸
  WI.defineShot('moon.vanish', ({ t, W, R }) => {
    const moon = R.moon, stars = R.stars;
    W.setScene({ ground: true, moon: true });
    const a = t < 4.6 ? 1 : (t < 5.2 ? 0.55 + 0.45 * S(t * 70) : 1 - E(K(t, 5.2, 6.2)));
    moon.mat.opacity = a;
    moon.glow.material.opacity = 0.85 * a;
    const flash = (t > 5.1 && t < 5.5) ? 1 - K(t, 5.1, 5.5) : 0;
    moon.glow.scale.setScalar(26 + flash * 34);
    moon.group.visible = a > 0.01;
    W.setLights(0.16 + 0.42 * a, 1.0 * a, 0, 0);
    W.bgMix(0x0a1230, 0x04060e, 1 - a);
    W.setBG(W.sc.background.getHex(), 0x070b18, 0.004);
    stars.mat.opacity = 0.35 + 0.6 * (1 - a);
    R.ground.pose(t, -0.4, t > 5.2);
    const sh = (t > 5.1 && t < 5.5) ? (Math.random() - 0.5) * 0.12 : 0;
    W.look(S(t * 0.3) * 0.25 + sh, 2.0 + sh, 3, 0, L(12, 10, K(t, 4, 9)), -55);
  });

  // 9~15초: 칠흑 같은 밤 (정면 컷, 랜턴)
  WI.defineShot('moon.darkNight', ({ t, W, R }) => {
    W.setScene({ ground: true });
    const u = K(t, 9, 15);
    W.setBG(0x03050b, 0x03050b, 0.006);
    W.setLights(0.2, 0, 0, E(K(t, 9.4, 10.6)) * 1.9);
    R.stars.mat.opacity = 0.8;
    R.ground.pose(t, -0.5, true);
    R.ground.people.forEach((p, i) => { p.armL.rotation.x = -0.4 + S(t * 3 + i) * 0.2; });
    W.look(L(0.9, -0.4, u), 1.7, -12, 0, 1.9, -6.5);
  });

  // 15~22초: 조석 감소
  WI.defineShot('moon.tide', ({ t, W, R }) => {
    const oc = R.ocean;
    W.setScene({ ocean: true });
    const u = K(t, 15, 22);
    W.setBG(0x060c1e, 0x060c1e, 0.006);
    W.setLights(0.7, 0, 0, 0);
    R.stars.mat.opacity = 0.9;
    const level = L(0.5, -0.35, E(K(t, 16, 21))) + 0.06 * S(t * 1.1);
    oc.sea.position.y = level;
    oc.waves(t);
    oc.boat.position.y = Math.max(level, 0.08) + 0.15;
    oc.boat.rotation.z = level < 0.08 ? 0.12 * E(u) : 0;
    W.look(S(t * 0.2) * 0.8, 3.2, 16, 0, 0.3, -14);
  });

  // 22~29초: 산호 산란이 흩어짐
  WI.defineShot('moon.reef', ({ t, dt, W, R }) => {
    const rf = R.reef;
    W.setScene({ reef: true, stars: false });
    const u = K(t, 22, 29);
    W.setBG(0x0a2a44, 0x0a2a44, 0.045);
    W.setLights(L(0.95, 0.45, u), 0, 0, 0);
    W.hemi.color.setHex(0x4aa3c8); W.hemi.groundColor.setHex(0x1c3550);
    rf.shaftMat.opacity = 0.14 * (1 - E(K(t, 24, 27)));
    const spawning = t < 25.8;
    rf.spawn(t, dt, spawning);
    rf.spawnMat.opacity = spawning ? 0.9 : 0.9 * (1 - K(t, 25.8, 27.6));
    rf.swim(t);
    W.look(S(t * 0.25) * 1.2, 0.8, 2, 0, 0.3, -12);
  });

  // 29~41초: 자전축 흔들림 → 자전 브레이크 소멸
  WI.defineShot('moon.axis', ({ t, W, R }) => {
    const sp = R.space;
    W.setScene({ space: true });
    W.hemi.color.setHex(0x5b7fc0); W.hemi.groundColor.setHex(0x101a2a);
    W.setBG(0x02030a, 0x02030a, 0.0);
    W.setLights(0.18, 0, 1.5, 0);
    W.sunLight.position.set(12, 4, 14);
    R.stars.mat.opacity = 0.95;
    const ghostA = 1 - E(K(t, 29, 31.2));
    sp.ghostMoonMat.opacity = ghostA;
    sp.ghostMoon.visible = ghostA > 0.01;
    sp.orbitRingMat.opacity = L(0.5, 0.18, E(K(t, 29, 31.2)));
    const a = t * 0.7;
    sp.ghostMoon.position.set(5.5 * Math.cos(a), 0, 5.5 * Math.sin(a));
    let tilt;
    if (t < 35) {
      const u = E(K(t, 31, 35));
      tilt = L(0.41, 1.2, u) + 0.12 * S(t * 3) * u;
    } else {
      tilt = 1.2 + 0.1 * S(t * 3);
    }
    sp.tiltG.rotation.z = -tilt;
    sp.spinG.rotation.y = t * 0.6;
    if (t < 35) {
      W.hud = { big: `지축 기울기 ${(tilt * 180 / PI).toFixed(1)}°`, small: '현재 약 23.4°' };
    } else {
      const v = 1.7 * (1 - E(K(t, 36, 39)));
      W.hud = { big: `하루 +${v.toFixed(1)}ms / 100년`, small: '달 조석 마찰에 의한 자전 감속' };
    }
    W.look(S(t * 0.15) * 1.5, 4.5, 19, 0, 0, 0);
  });

  // 41~47초: 개기일식 → 가림 원반이 사라지며 빛이 돌아옴
  WI.defineShot('moon.eclipse', ({ t, W, R }) => {
    const ss = R.skysun;
    W.setScene({ ground: true, skysun: true });
    const reveal = E(K(t, 43.4, 44.8));
    W.bgMix(0x080c1c, 0x6db3f2, reveal);
    W.setBG(W.sc.background.getHex(), reveal > 0.5 ? 0x9cc8f0 : 0x080c1c, 0.003);
    W.setLights(L(0.22, 1.0, reveal), 0, L(0, 0.8, reveal), 0);
    W.sunLight.position.set(0, 40, -20);
    R.stars.mat.opacity = 0.9 * (1 - K(t, 43.3, 44.2));
    ss.occMat.opacity = 1 - reveal;
    ss.occluder.visible = reveal < 0.99;
    ss.glow.material.opacity = 0.95;
    ss.glow.scale.setScalar(t < 43.4 ? 20 + S(t * 5) * 1.0 : L(20, 60, reveal));
    ss.glow.material.color.setHex(reveal > 0.3 ? 0xfff6dc : 0xdfe8ff);
    ss.disc.material.color.setHex(0xfff1c9);
    R.ground.pose(t, -0.45, false);
    R.ground.people.forEach(p => { p.armL.rotation.x = -0.8; p.armR.rotation.x = -0.8; });
    W.look(0, 2.0, 2, 0, 8, -60);
  });

  // 47~53초: 음력 달력 팻말
  WI.defineShot('moon.calendar', ({ t, W, R }) => {
    W.setScene({ ground: true, lunarSign: true });
    const u = K(t, 47, 53);
    W.setBG(0x03050b, 0x03050b, 0.006);
    W.setLights(0.22, 0, 0, 1.9);
    R.stars.mat.opacity = 0.85;
    R.ground.pose(t, 0.12, false);
    W.look(L(0.6, 0.0, u), 2.0, 2.2, -0.2, 2.1, -6);
  });

  // 53~60초: 쏟아지는 별
  WI.defineShot('moon.starfall', ({ t, W, R }) => {
    W.setScene({ ground: true, meteors: true });
    const u = K(t, 53, 60);
    W.setBG(0x02030a, 0x02030a, 0.003);
    W.setLights(0.25, 0, 0, 1.2);
    R.stars.mat.opacity = 1.0;
    R.stars.mat.size = 3.2;
    R.stars.group.rotation.x = 0.25;
    R.ground.pose(t, -0.5, false);
    R.meteors.animate(t);
    W.look(S(t * 0.2) * 0.4, 1.2, 0, 0, L(11, 14, u), -30);
  });

  // 60~66초: 홀로 남은 지구
  WI.defineShot('moon.alone', ({ t, W, R }) => {
    const sp = R.space;
    W.setScene({ space: true });
    const u = E(K(t, 60, 63.5));
    R.stars.group.rotation.x = 0;
    W.hemi.color.setHex(0x5b7fc0); W.hemi.groundColor.setHex(0x101a2a);
    W.setBG(0x02030a, 0x02030a, 0.0);
    W.setLights(0.2, 0, 1.5, 0);
    W.sunLight.position.set(12, 4, 14);
    R.stars.mat.opacity = 0.95;
    sp.ghostMoon.visible = false;
    sp.orbitRingMat.opacity = 0.12;
    sp.tiltG.rotation.z = -0.41;
    sp.spinG.rotation.y = t * 0.5;
    W.look(0, L(3, 1, u), L(30, 15, u), 0, 0, 0);
  });
})(window.WI = window.WI || {});
