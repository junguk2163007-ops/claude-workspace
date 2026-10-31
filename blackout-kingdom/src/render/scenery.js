// 풍경: 걸을 때마다 지나가는 배경 소품들. 화면 전용이며 규칙에는 영향이 없다.
// 층(레이어)마다 움직이는 속도가 달라 입체감이 생긴다.
//   near  (0.72배) : 나무, 무너진 집, 물탱크, 광고판 — 캐릭터 뒤 먼 배경
//   props (1배)    : 가로등, 자동차, 덤불, 바위, 꽃 — 캐릭터와 같은 땅
//   front (1.3배)  : 화면 맨 앞을 스치는 풀숲 실루엣
// 마을에서 멀어질수록 지역이 바뀐다: 마을 → 들판 → 숲 → 황무지(소굴 근처)

const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const NEAR_P = 0.72;
export const FRONT_P = 1.3;

function zoneAt(x) {
  const d = Math.abs(x);
  if (d < 220) return 'camp';
  if (d < 600) return 'field';
  if (d < 1000) return 'forest';
  return 'waste';
}

const NEAR_KINDS = {
  camp: ['tree', 'house', 'house', 'watertower'],
  field: ['tree', 'house', 'billboard', 'tree', 'pine'],
  forest: ['pine', 'pine', 'tree', 'pine', 'tree'],
  waste: ['deadtree', 'deadtree', 'house', 'deadtree'],
};
const PROP_KINDS = {
  camp: ['lamp', 'fence', 'crate', 'barrel', 'flowers', 'fence'],
  field: ['bush', 'rock', 'flowers', 'car', 'sign', 'pole', 'bush', 'flowers'],
  forest: ['bush', 'stump', 'mushroom', 'rock', 'mushroom', 'bush'],
  waste: ['bones', 'crystal', 'rock', 'deadbush', 'crystal', 'sign'],
};

function build() {
  const near = [];
  const props = [];
  const front = [];
  // near 층: 자기 좌표계(카메라 × 0.72)에서 배치
  for (let i = -70; i <= 70; i++) {
    const h = hash(i * 1.7 + 3);
    if (h < 0.35) continue;
    const x = i * 17 + hash(i) * 10;
    const worldX = x / NEAR_P;
    const list = NEAR_KINDS[zoneAt(worldX)];
    near.push({ x, kind: list[Math.floor(hash(i * 3.1) * list.length)], s: hash(i * 5.3), id: i });
  }
  for (let i = -160; i <= 160; i++) {
    const h = hash(i * 2.3 + 11);
    if (h < 0.45) continue;
    const x = i * 9 + hash(i * 0.7) * 6;
    if (Math.abs(x) < 50) continue; // 마을 한가운데는 비워 둠
    const list = PROP_KINDS[zoneAt(x)];
    props.push({ x, kind: list[Math.floor(hash(i * 4.7) * list.length)], s: hash(i * 6.1), id: i });
  }
  for (let i = -120; i <= 120; i++) {
    if (hash(i * 9.1) < 0.72) continue;
    front.push({ x: i * 19 + hash(i) * 12, s: hash(i * 2.9), id: i });
  }
  return { near, props, front };
}

export function createScenery() {
  const S = build();

  function visible(list, center, half) {
    return list.filter((o) => Math.abs(o.x - center) < half + 60);
  }

  // ───────── near 층 (먼 배경 실루엣, 살짝 디테일) ─────────
  function drawNear(ctx, camX, viewW, time) {
    for (const o of visible(S.near, camX * NEAR_P, viewW / 2)) {
      ctx.save();
      ctx.translate(o.x, 0);
      const k = 0.85 + o.s * 0.35;
      ctx.scale(k, k);
      NEAR_DRAW[o.kind](ctx, o, time);
      ctx.restore();
    }
  }

  function drawProps(ctx, camX, viewW, time) {
    for (const o of visible(S.props, camX, viewW / 2)) {
      ctx.save();
      ctx.translate(o.x, 0);
      PROP_DRAW[o.kind](ctx, o, time);
      ctx.restore();
    }
  }

  function drawFront(ctx, camX, viewW, time) {
    ctx.strokeStyle = '#08060c';
    ctx.lineCap = 'round';
    for (const o of visible(S.front, camX * FRONT_P, viewW / 2)) {
      const n = 5 + Math.floor(o.s * 6);
      ctx.lineWidth = 1.1;
      for (let i = 0; i < n; i++) {
        const bx = o.x - n + i * 2 + hash(o.id * 7 + i) * 1.5;
        const h = 4 + hash(o.id * 13 + i) * (o.s > 0.8 ? 11 : 7);
        const sway = Math.sin(time * 1.5 + o.id + i * 0.4) * 1.2;
        const lean = (i - n / 2) * 0.5;
        ctx.beginPath();
        ctx.moveTo(bx, 12);
        ctx.quadraticCurveTo(bx + lean * 0.5, 12 - h * 0.6, bx + lean + sway, 12 - h - 4);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  }

  return { drawNear, drawProps, drawFront };
}

// ───────── 먼 배경 그리기 ─────────
const NEAR_COL = '#1e1828';
const NEAR_COL2 = '#272033';

const NEAR_DRAW = {
  tree(ctx, o) {
    ctx.fillStyle = NEAR_COL;
    ctx.fillRect(-1.5, -22, 3, 22);
    ctx.fillStyle = NEAR_COL2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(-6 + i * 3 + hash(o.id + i) * 2, -26 - hash(o.id * 2 + i) * 10, 6 + hash(o.id * 3 + i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  pine(ctx, o) {
    ctx.fillStyle = NEAR_COL;
    ctx.fillRect(-1.2, -8, 2.4, 8);
    ctx.fillStyle = NEAR_COL2;
    const h = 34 + o.s * 16;
    for (let i = 0; i < 4; i++) {
      const y = -8 - i * (h / 5);
      const w = 11 - i * 2.3;
      ctx.beginPath();
      ctx.moveTo(-w, y);
      ctx.lineTo(0, y - h / 3);
      ctx.lineTo(w, y);
      ctx.fill();
    }
  },
  deadtree(ctx, o) {
    ctx.strokeStyle = NEAR_COL2;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1, -30);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      const y = -12 - i * 4;
      const sd = i % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(0.5, y);
      ctx.lineTo(sd * (6 + hash(o.id + i) * 6), y - 6 - hash(o.id * 2 + i) * 5);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  },
  house(ctx, o) {
    const w = 26 + o.s * 14;
    const h = 18 + o.s * 8;
    ctx.fillStyle = NEAR_COL;
    ctx.fillRect(-w / 2, -h, w, h);
    // 무너진 지붕 (한쪽이 꺼져 있음)
    ctx.fillStyle = NEAR_COL2;
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 2, -h);
    ctx.lineTo(-w / 6, -h - 12);
    ctx.lineTo(w / 8, -h - 6);
    ctx.lineTo(w / 4, -h - 9);
    ctx.lineTo(w / 2 + 2, -h);
    ctx.fill();
    ctx.fillStyle = '#0d0a13';
    ctx.fillRect(-w / 2 + 4, -h + 5, 5, 6);
    ctx.fillRect(w / 2 - 10, -h + 5, 5, 6);
    ctx.fillRect(-2.5, -9, 5, 9);
  },
  watertower(ctx) {
    ctx.strokeStyle = NEAR_COL;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(-6, -34);
    ctx.moveTo(8, 0); ctx.lineTo(6, -34);
    ctx.moveTo(-7, -12); ctx.lineTo(7, -22);
    ctx.moveTo(7, -12); ctx.lineTo(-7, -22);
    ctx.stroke();
    ctx.fillStyle = NEAR_COL2;
    ctx.fillRect(-10, -50, 20, 16);
    ctx.beginPath();
    ctx.moveTo(-11, -50);
    ctx.lineTo(0, -56);
    ctx.lineTo(11, -50);
    ctx.fill();
  },
  billboard(ctx, o) {
    ctx.fillStyle = NEAR_COL;
    ctx.fillRect(-12, -22, 2, 22);
    ctx.fillRect(10, -22, 2, 22);
    ctx.fillStyle = NEAR_COL2;
    ctx.fillRect(-18, -40, 36, 18);
    // 빛바랜 광고 줄무늬, 한쪽 귀퉁이 찢어짐
    ctx.fillStyle = '#2f2740';
    ctx.fillRect(-15, -36, 18, 3);
    ctx.fillRect(-15, -31, 26, 2);
    ctx.fillStyle = '#120e19';
    ctx.beginPath();
    ctx.moveTo(18, -40);
    ctx.lineTo(10 + o.s * 4, -40);
    ctx.lineTo(18, -30);
    ctx.fill();
  },
};

// ───────── 땅 위 소품 그리기 ─────────
const PROP_DRAW = {
  lamp(ctx, o, t) {
    // 꺼진 가로등 (M2에서 불이 들어올 예정)
    ctx.fillStyle = '#3a3644';
    ctx.fillRect(-0.8, -34, 1.6, 34);
    ctx.fillRect(-3, -1.5, 6, 1.5);
    ctx.fillRect(-0.8, -34, 7, 1.3);
    ctx.fillStyle = '#4a4556';
    ctx.fillRect(4.5, -33, 4, 2);
    // 가끔 깜빡 (전기가 아주 조금 남은 듯)
    if (Math.sin(t * 7 + o.id * 3) > 0.995) {
      ctx.fillStyle = 'rgba(255,230,160,0.7)';
      ctx.fillRect(5, -31, 3, 1);
    }
  },
  pole(ctx, o) {
    ctx.fillStyle = '#4a3828';
    ctx.save();
    ctx.rotate((o.s - 0.5) * 0.15); // 살짝 기울어진 전봇대
    ctx.fillRect(-1, -40, 2, 40);
    ctx.fillRect(-6, -36, 12, 1.5);
    ctx.fillStyle = '#6e6a78';
    ctx.fillRect(-5.5, -37.5, 1.2, 1.5);
    ctx.fillRect(4.3, -37.5, 1.2, 1.5);
    ctx.strokeStyle = 'rgba(30,24,40,0.9)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(5, -36);
    ctx.quadraticCurveTo(10, -20, 8, -6); // 끊어져 늘어진 전선
    ctx.stroke();
    ctx.restore();
  },
  fence(ctx, o) {
    ctx.fillStyle = '#4e3a26';
    for (let i = 0; i < 4; i++) ctx.fillRect(-9 + i * 6, -9 + (i % 2), 1.6, 9 - (i % 2));
    ctx.fillStyle = '#5d4630';
    ctx.fillRect(-10, -7, 20, 1.2);
    ctx.fillRect(-10, -3.5, 20, 1.2);
    if (o.s > 0.6) { ctx.fillStyle = '#2a2018'; ctx.fillRect(2, -7, 4, 1.2); } // 부러진 가로대
  },
  crate(ctx, o) {
    const w = 6 + o.s * 3;
    ctx.fillStyle = '#5a4128';
    ctx.fillRect(-w / 2, -w, w, w);
    ctx.strokeStyle = '#3e2c1a';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-w / 2 + 0.3, -w + 0.3, w - 0.6, w - 0.6);
    ctx.beginPath();
    ctx.moveTo(-w / 2, -w); ctx.lineTo(w / 2, 0);
    ctx.stroke();
    if (o.s > 0.5) {
      ctx.fillStyle = '#4e3822';
      ctx.fillRect(w / 2 + 0.5, -4.5, 4.5, 4.5);
    }
  },
  barrel(ctx) {
    ctx.fillStyle = '#4a4655';
    ctx.fillRect(-2.8, -7, 5.6, 7);
    ctx.fillStyle = '#5c5868';
    ctx.fillRect(-2.8, -5.5, 5.6, 0.8);
    ctx.fillRect(-2.8, -2.2, 5.6, 0.8);
    ctx.fillStyle = '#6b3b2a';
    ctx.fillRect(-1, -7, 2, 1.5);
  },
  flowers(ctx, o) {
    const colors = ['#d9d4e8', '#e8d38a', '#c99bd8'];
    for (let i = 0; i < 4; i++) {
      const x = -4 + i * 2.6 + hash(o.id + i) * 1.5;
      const h = 2.5 + hash(o.id * 2 + i) * 3;
      ctx.fillStyle = '#3d4a2c';
      ctx.fillRect(x, -h, 0.5, h);
      ctx.fillStyle = colors[(o.id + i) % 3];
      ctx.fillRect(x - 0.6, -h - 1, 1.6, 1.2);
    }
  },
  bush(ctx, o) {
    ctx.fillStyle = '#26301f';
    const w = 7 + o.s * 6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-w / 3 + i * (w / 3), -3 - (i === 1 ? 2 : 0), w / 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#323e28';
    ctx.beginPath();
    ctx.arc(-1, -5.5, w / 4, 0, Math.PI * 2);
    ctx.fill();
  },
  deadbush(ctx, o) {
    ctx.strokeStyle = '#3a3030';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-5 + i * 2, -4 - hash(o.id + i) * 5);
      ctx.stroke();
    }
  },
  rock(ctx, o) {
    const w = 4 + o.s * 6;
    ctx.fillStyle = '#3c3946';
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(-w * 0.6, -w * 0.7);
    ctx.lineTo(w * 0.2, -w * 0.85);
    ctx.lineTo(w, 0);
    ctx.fill();
    ctx.fillStyle = '#4c4858';
    ctx.beginPath();
    ctx.moveTo(-w * 0.6, -w * 0.7);
    ctx.lineTo(w * 0.2, -w * 0.85);
    ctx.lineTo(0, -w * 0.4);
    ctx.fill();
  },
  car(ctx, o) {
    // 버려진 자동차 (녹슨 색, 바퀴 하나 빠짐)
    const body = o.s > 0.5 ? '#4a3a3a' : '#33404a';
    ctx.fillStyle = body;
    ctx.fillRect(-14, -8, 28, 5.5);
    ctx.beginPath();
    ctx.moveTo(-8, -8); ctx.lineTo(-5, -13); ctx.lineTo(6, -13); ctx.lineTo(10, -8);
    ctx.fill();
    ctx.fillStyle = '#15121c';
    ctx.fillRect(-4, -12, 4.5, 3.5);
    ctx.fillRect(1.5, -12, 4.5, 3.5);
    ctx.fillStyle = '#5a3a28';
    ctx.fillRect(-12, -7, 3, 1.2);
    ctx.fillStyle = '#18151f';
    ctx.beginPath();
    ctx.arc(-8, -2, 2.6, 0, Math.PI * 2);
    ctx.arc(8, -1.2, 2.6, 0, Math.PI * 2);
    ctx.fill();
  },
  sign(ctx, o) {
    ctx.fillStyle = '#4e3a26';
    ctx.fillRect(-0.7, -14, 1.4, 14);
    ctx.save();
    ctx.rotate((o.s - 0.5) * 0.3);
    ctx.fillStyle = '#6b5a44';
    ctx.fillRect(-8, -16, 16, 6);
    ctx.fillStyle = '#2a2018';
    ctx.font = 'bold 3.6px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = Math.abs(o.x) > 1000 ? ['위험', '돌아가', '어둠'] : ['정전 구역', '출입 금지', '발전소 →'];
    ctx.fillText(words[o.id % 3 < 0 ? 0 : o.id % 3], 0, -12.8);
    ctx.restore();
  },
  stump(ctx) {
    ctx.fillStyle = '#4a3624';
    ctx.fillRect(-3, -4, 6, 4);
    ctx.fillStyle = '#6b5236';
    ctx.beginPath();
    ctx.ellipse(0, -4, 3, 1, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  mushroom(ctx, o, t) {
    // 어둠 속에서 은은하게 빛나는 버섯
    const glow = 0.5 + Math.sin(t * 1.5 + o.id) * 0.3;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(90,220,200,${0.12 * glow})`;
    ctx.beginPath();
    ctx.arc(0, -3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 3; i++) {
      const x = -3 + i * 3;
      const h = 2 + hash(o.id + i) * 2.5;
      ctx.fillStyle = '#c8d8d0';
      ctx.fillRect(x - 0.3, -h, 0.6, h);
      ctx.fillStyle = `rgba(120,240,215,${0.6 + glow * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(x, -h, 1.4, 0.8, 0, Math.PI, 0);
      ctx.fill();
    }
  },
  bones(ctx, o) {
    ctx.fillStyle = '#b8b0a0';
    ctx.fillRect(-4, -1, 6, 1);
    ctx.fillRect(1, -2, 4, 0.8);
    ctx.beginPath();
    ctx.arc(-5, -1.8, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1520';
    ctx.fillRect(-5.8, -2.4, 0.7, 0.7);
    ctx.fillRect(-4.6, -2.4, 0.7, 0.7);
  },
  crystal(ctx, o, t) {
    // 어둠이 굳어 생긴 보랏빛 수정
    const glow = 0.5 + Math.sin(t * 2 + o.id) * 0.3;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(160,90,240,${0.14 * glow})`;
    ctx.beginPath();
    ctx.arc(0, -5, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#3a2258';
    for (let i = 0; i < 3; i++) {
      const x = -3 + i * 3;
      const h = 4 + hash(o.id * 3 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(x - 1.4, 0);
      ctx.lineTo(x + (i - 1) * 0.8, -h);
      ctx.lineTo(x + 1.4, 0);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(200,150,255,${0.5 + glow * 0.3})`;
    ctx.fillRect(-0.3, -6, 0.6, 3);
  },
};
