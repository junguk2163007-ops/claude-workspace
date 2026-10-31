// 화면 그리기 담당. 규칙(world)을 "읽기만" 하고 절대 바꾸지 않는다.

import { CONFIG } from '../config.js';
import { canInvest } from '../core/spots.js';
import { createEffects, easeOut } from './effects.js';

const VIEW_H = 270;   // 화면 높이에 들어가는 월드 픽셀 수
const VIEW_MIN_W = 420;
const VIEW_MIN_W_PORTRAIT = 250;

const COLORS = {
  skyTop: '#07070f',
  skyMid: '#1b1630',
  skyLow: '#3a2541',
  mountain: '#151121',
  ruin: '#211a2e',
  ground: '#272020',
  groundDeep: '#1a1515',
  grass: '#4a5a33',
  gold: '#ffd34d',
  goldDark: '#b07a12',
  goldLight: '#fff1a8',
};

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const fx = createEffects();
  const r = {
    W: 0, H: 0, dpr: 1, S: 1, groundY: 0, ui: 1, safeL: 0, safeT: 0,
    camX: 0, shake: 0, flash: 0, time: 0,
    hudBump: 0, flyCoins: [], banner: null, toast: null,
    kingPhase: 0, dustAcc: 0,
    spotAlpha: new Map(), slotPulse: new Map(), wallWobble: new Map(),
    touchMode: false,
    sky: null, vignette: null, stars: [],
  };

  for (let i = 0; i < 90; i++) {
    r.stars.push({ x: Math.random(), y: Math.random() * 0.6, s: rand(0.4, 1.2), tw: rand(0, 6) });
  }

  function resize() {
    r.dpr = Math.min(window.devicePixelRatio || 1, 2);
    r.W = window.innerWidth;
    r.H = window.innerHeight;
    canvas.width = Math.round(r.W * r.dpr);
    canvas.height = Math.round(r.H * r.dpr);
    canvas.style.width = r.W + 'px';
    canvas.style.height = r.H + 'px';
    // 세로 화면에선 좁게 보더라도 캐릭터를 크게
    r.S = Math.min(r.H / VIEW_H, r.W / (r.W < r.H ? VIEW_MIN_W_PORTRAIT : VIEW_MIN_W));
    r.groundY = Math.min(r.H - 62 * r.S, r.H * 0.5 + 135 * r.S);
    r.ui = clamp(Math.min(r.W, r.H) / 300, 1.2, 2.6);
    const cs = getComputedStyle(document.documentElement);
    r.safeL = parseFloat(cs.getPropertyValue('--sal')) || 0;
    r.safeT = parseFloat(cs.getPropertyValue('--sat')) || 0;

    r.sky = ctx.createLinearGradient(0, 0, 0, r.groundY);
    r.sky.addColorStop(0, COLORS.skyTop);
    r.sky.addColorStop(0.6, COLORS.skyMid);
    r.sky.addColorStop(1, COLORS.skyLow);
    const R = Math.hypot(r.W, r.H) / 2;
    r.vignette = ctx.createRadialGradient(r.W / 2, r.groundY - 60 * r.S, R * 0.35, r.W / 2, r.groundY - 60 * r.S, R * 1.1);
    r.vignette.addColorStop(0, 'rgba(0,0,0,0)');
    r.vignette.addColorStop(1, 'rgba(0,0,0,0.65)');
  }

  // 월드 좌표 → 화면(CSS 픽셀) 좌표
  function toScreen(x, y) {
    return { x: (x - r.camX) * r.S + r.W / 2, y: r.groundY + y * r.S };
  }

  function hudAnchor() {
    const u = r.ui;
    return { x: 14 * u + r.safeL + 8 * u, y: 14 * u + r.safeT + 24 * u };
  }

  // ───────────────────────── 이벤트 → 연출 ─────────────────────────
  function handleEvent(ev, world) {
    const J = CONFIG.juice;
    if (J.shake[ev.type]) r.shake = Math.max(r.shake, J.shake[ev.type]);

    switch (ev.type) {
      case 'coinSpawned':
        fx.sparkle(ev.x, ev.y, 4 + ev.count * 2);
        break;
      case 'coinBounce':
        if (ev.strength > 150) fx.dust(ev.x, 1);
        break;
      case 'coinCollected': {
        const s = toScreen(ev.x, ev.y - 3);
        r.flyCoins.push({ sx: s.x, sy: s.y, t: 0, dur: 0.42 + Math.random() * 0.08 });
        fx.sparkle(ev.x, ev.y - 3, 5, COLORS.goldLight);
        break;
      }
      case 'coinSlotted':
        fx.sparkle(ev.x, ev.y, 6);
        fx.ring(ev.x, ev.y, COLORS.gold, 7);
        for (const s of world.spots) if (Math.abs(s.x - ev.x) < 30) r.slotPulse.set(s.id, 1);
        break;
      case 'spotComplete':
        fx.confetti(ev.x, -36);
        fx.ring(ev.x, -20, COLORS.goldLight, 40);
        fx.dust(ev.x, 10);
        fx.text(ev.x, -60, { archerPost: '궁수 합류!', swordPost: '검사 합류!', barricade: '방벽 완성!' }[ev.kind], COLORS.goldLight, 9);
        break;
      case 'arrowHit':
        fx.sparks(ev.x, ev.y, ev.target === 'enemy' ? '#d9b8ff' : '#fff6d0');
        break;
      case 'arrowMiss':
        fx.dust(ev.x, 2);
        break;
      case 'animalKilled': {
        const golden = ev.kind === 'goldenChicken';
        fx.feathers(ev.x, ev.y, golden ? COLORS.gold : '#f4f1e8', golden ? 18 : 12);
        fx.ring(ev.x, ev.y, golden ? COLORS.gold : '#ffffff', golden ? 30 : 14);
        fx.text(ev.x, ev.y - 12, `+${ev.coins}`, COLORS.gold, golden ? 12 : 8);
        if (golden) fx.sparkle(ev.x, ev.y, 20);
        break;
      }
      case 'animalStartled':
        fx.text(ev.x, -14, '!', '#ffffff', 7);
        break;
      case 'enemyHit':
        fx.smoke(ev.x, ev.y, 3);
        break;
      case 'enemyKilled':
        fx.smoke(ev.x, ev.y, ev.kind === 'bigShade' ? 22 : 13);
        fx.sparkle(ev.x, ev.y, 10, '#c9a6ff');
        fx.ring(ev.x, ev.y, '#a77bff', ev.kind === 'bigShade' ? 36 : 22);
        fx.text(ev.x, ev.y - 14, `+${ev.coins}`, COLORS.gold, 9);
        break;
      case 'kingHit':
        r.flash = 0.35;
        if (ev.lost) fx.text(ev.x, ev.y - 14, '-1', '#ff6b6b', 9);
        fx.sparks(ev.x, ev.y, '#ff9a9a', 8);
        break;
      case 'wallHit':
        fx.chips(ev.x, 4);
        for (const s of world.spots) if (s.x === ev.x) r.wallWobble.set(s.id, 1);
        break;
      case 'wallBroken':
        fx.chips(ev.x, 18);
        fx.smoke(ev.x, -10, 8);
        fx.text(ev.x, -40, '방벽 파괴!', '#ff6b6b', 9);
        break;
      case 'waveIncoming': {
        const s = ev.sides;
        const dir = s.length > 1 ? '양쪽' : s[0] < 0 ? '왼쪽' : '오른쪽';
        const fresh = ev.fresh.map((k) => CONFIG.enemies.kinds[k].name).join(', ');
        r.banner = {
          text: `습격 ${ev.level}단계 — ${dir}에서 어둠이 몰려온다!`,
          sub: fresh ? `새로운 적: ${fresh}` : null,
          life: 0, max: fresh ? 4.6 : 3.6, sides: s,
        };
        break;
      }
      case 'swordSwing':
        fx.slash(ev.x, ev.y, ev.facing);
        fx.sparks(ev.x + ev.facing * 3, ev.y, '#f4f7ff', 3);
        break;
      case 'swordsmanHit':
        fx.sparks(ev.x, ev.y, '#ffb0a0', 4);
        break;
      case 'swordsmanDown':
        fx.text(ev.x, -32, '후퇴!', '#ff9a8a', 8);
        fx.dust(ev.x, 6);
        break;
      case 'swordsmanRecovered':
        fx.text(ev.x, -32, '복귀!', '#a8f0a0', 8);
        fx.sparkle(ev.x, -14, 8, '#c8ffc0');
        break;
      case 'flyerDive':
        fx.sparks(ev.x, ev.y, '#d9b8ff', 4);
        break;
      case 'coinStolen':
        fx.text(ev.x, ev.y - 8, ev.fromKing ? '도둑맞음!' : '-1', '#c99bff', ev.fromKing ? 8 : 7);
        fx.sparkle(ev.x, ev.y, 6, '#c99bff');
        if (ev.fromKing) r.shake = Math.max(r.shake, 2);
        break;
      case 'thiefEscaped':
        r.toast = { text: `코인 도둑이 코인 ${ev.coins}개를 들고 달아났다…`, life: 0, max: 3 };
        break;
    }
  }

  // ───────────────────────── 매 프레임 그리기 ─────────────────────────
  function render(world, dt, frozen) {
    r.time += dt;
    const fdt = frozen ? 0 : dt;
    const { W, H, S, dpr } = r;
    const king = world.king;

    // 카메라: 왕을 따라가되 진행 방향을 조금 더 보여줌
    const viewW = W / S;
    const lim = CONFIG.world.halfWidth - viewW / 2;
    const target = clamp(king.x + king.facing * 28 + king.vx * 0.25, -lim, lim);
    r.camX += (target - r.camX) * Math.min(1, dt * 4);

    // 왕 발밑 흙먼지
    const moving = Math.abs(king.vx) > 20;
    r.kingPhase += Math.abs(king.vx) * fdt * 0.16;
    if (moving && !frozen) {
      r.dustAcc += Math.abs(king.vx) * dt;
      if (r.dustAcc > 16) { r.dustAcc = 0; fx.dust(king.x - king.facing * 3, 2, king.facing); }
    }
    for (const a of world.animals) {
      if (a.kind === 'goldenChicken' && Math.random() < dt * 4) fx.sparkle(a.x + rand(-5, 5), -rand(3, 10), 1);
    }

    fx.update(fdt);
    r.shake *= Math.exp(-dt * 9);
    r.flash = Math.max(0, r.flash - dt);
    r.hudBump = Math.max(0, r.hudBump - dt * 5);
    for (const [k, v] of r.slotPulse) r.slotPulse.set(k, Math.max(0, v - dt * 4));
    for (const [k, v] of r.wallWobble) r.wallWobble.set(k, Math.max(0, v - dt * 5));

    const shx = (Math.random() - 0.5) * 2 * r.shake * S;
    const shy = (Math.random() - 0.5) * 2 * r.shake * S;

    // 1) 배경 (화면 좌표)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground(world);

    // 2) 월드 (월드 좌표)
    ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * (W / 2 - r.camX * S + shx), dpr * (r.groundY + shy));
    drawGroundDetails(viewW);
    drawGenerator();
    for (const s of world.spots) drawSpot(world, s);
    for (const a of world.arrows) if (a.stuck) drawArrow(a);
    for (const c of world.coins) if (c.grounded) drawCoin(c.x, c.y, c.spin, c.id, true);
    for (const a of world.animals) drawAnimal(world, a);
    for (const e of world.enemies) drawEnemy(e);
    for (const s of world.swordsmen) drawSwordsman(s);
    for (const a of world.archers) drawArcher(a);
    drawKing(king, world);
    for (const a of world.arrows) if (!a.stuck) drawArrow(a);
    for (const c of world.coins) if (!c.grounded) drawCoin(c.x, c.y, c.spin, c.id, false);
    for (const c of world.thrownCoins) drawCoin(c.x, c.y + 3, c.t * 30, 0, false);
    for (const s of world.spots) drawSpotSlots(world, s, dt);
    fx.draw(ctx);

    // 3) 화면 위 UI
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = r.vignette;
    ctx.fillRect(0, 0, W, H);
    drawEdgeWarnings(world);
    if (r.flash > 0) {
      ctx.fillStyle = `rgba(255,60,60,${r.flash * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
    drawBanner(dt);
    drawHud(world, dt);
    drawHint(world);
  }

  // ───────────────────────── 배경 ─────────────────────────
  function drawBackground(world) {
    const { W, H, S, groundY, camX } = r;
    ctx.fillStyle = r.sky;
    ctx.fillRect(0, 0, W, groundY);

    // 별 (정전돼서 별이 잘 보임)
    for (const st of r.stars) {
      const x = ((st.x * W - camX * S * 0.03) % W + W) % W;
      ctx.globalAlpha = 0.35 + Math.sin(r.time * 1.5 + st.tw) * 0.25;
      ctx.fillStyle = '#cfd6ff';
      ctx.fillRect(x, st.y * groundY, st.s * S * 0.5, st.s * S * 0.5);
    }
    ctx.globalAlpha = 1;

    // 먼 산
    ctx.fillStyle = COLORS.mountain;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    const step = 6 * S;
    for (let sx = 0; sx <= W + step; sx += step) {
      const wx = camX * 0.15 + (sx - W / 2) / S;
      const h = 46 + 20 * Math.sin(wx * 0.006) + 11 * Math.sin(wx * 0.017 + 1.3) + 4 * Math.sin(wx * 0.05 + 2);
      ctx.lineTo(sx, groundY - h * S);
    }
    ctx.lineTo(W, groundY);
    ctx.fill();

    // 중간: 꺼진 송전탑과 늘어진 전선, 폐허 (세계관 복선)
    const p = 0.45;
    const spacing = 210;
    const leftW = camX * p - W / 2 / S - spacing;
    const first = Math.floor(leftW / spacing);
    ctx.fillStyle = COLORS.ruin;
    ctx.strokeStyle = COLORS.ruin;
    for (let i = first; i < first + W / S / spacing + 3; i++) {
      const wx = i * spacing;
      const sx = (wx - camX * p) * S + W / 2;
      const hgt = (62 + hash(i) * 14) * S;
      // 탑
      ctx.lineWidth = Math.max(1, 1.2 * S);
      ctx.beginPath();
      ctx.moveTo(sx - 9 * S, groundY);
      ctx.lineTo(sx - 1.5 * S, groundY - hgt);
      ctx.lineTo(sx + 1.5 * S, groundY - hgt);
      ctx.lineTo(sx + 9 * S, groundY);
      ctx.moveTo(sx - 7 * S, groundY - hgt * 0.25);
      ctx.lineTo(sx + 5 * S, groundY - hgt * 0.55);
      ctx.moveTo(sx + 7 * S, groundY - hgt * 0.25);
      ctx.lineTo(sx - 5 * S, groundY - hgt * 0.55);
      ctx.moveTo(sx - 10 * S, groundY - hgt * 0.82);
      ctx.lineTo(sx + 10 * S, groundY - hgt * 0.82);
      ctx.stroke();
      // 전선 (다음 탑까지 축 늘어짐, 가끔 끊어져 있음)
      if (hash(i + 0.5) > 0.25) {
        const nx = sx + spacing * S;
        const nh = (62 + hash(i + 1) * 14) * S;
        ctx.lineWidth = Math.max(0.6, 0.5 * S);
        ctx.beginPath();
        ctx.moveTo(sx + 9 * S, groundY - hgt * 0.82);
        ctx.quadraticCurveTo((sx + nx) / 2, groundY - hgt * 0.4, nx - 9 * S, groundY - nh * 0.82);
        ctx.stroke();
      }
      // 폐허 건물
      if (hash(i * 3.7) > 0.45) {
        const bx = sx + (60 + hash(i * 1.3) * 60) * S;
        const bw = (30 + hash(i * 2.1) * 30) * S;
        const bh = (24 + hash(i * 5.3) * 30) * S;
        ctx.fillRect(bx, groundY - bh, bw, bh);
        ctx.fillStyle = '#0c0a12';
        for (let wy = 0; wy < 3; wy++) {
          for (let wx2 = 0; wx2 < 3; wx2++) {
            if (hash(i * 7 + wy * 3 + wx2) > 0.5) ctx.fillRect(bx + (5 + wx2 * 9) * S, groundY - bh + (5 + wy * 9) * S, 4 * S, 5 * S);
          }
        }
        ctx.fillStyle = COLORS.ruin;
      }
    }

    // 땅
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = COLORS.groundDeep;
    ctx.fillRect(0, groundY + 10 * S, W, H - groundY);
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, groundY - 0.5 * S, W, 2 * S);
  }

  function drawGroundDetails(viewW) {
    const from = Math.floor((r.camX - viewW / 2 - 20) / 11);
    const to = Math.ceil((r.camX + viewW / 2 + 20) / 11);
    for (let i = from; i < to; i++) {
      const h = hash(i);
      if (h < 0.45) continue;
      const x = i * 11 + h * 6;
      ctx.fillStyle = h > 0.8 ? '#5d7040' : COLORS.grass;
      ctx.fillRect(x, -2 - h * 2, 1, 2 + h * 2);
      ctx.fillRect(x + 1.5, -1.5 - h, 1, 1.5 + h);
      if (h > 0.93) { ctx.fillStyle = '#3a302a'; ctx.fillRect(x + 4, -1.5, 3, 1.5); }
    }
  }

  // 마을 중심의 꺼진 발전기 (M2에서 켜질 예정)
  function drawGenerator() {
    ctx.fillStyle = '#2a2633';
    ctx.fillRect(-12, -16, 24, 16);
    ctx.fillStyle = '#1d1a24';
    ctx.fillRect(-10, -14, 8, 10);
    ctx.fillRect(6, -26, 4, 10);
    ctx.fillStyle = '#3a3546';
    ctx.fillRect(-12, -17, 24, 2);
    for (let i = 0; i < 4; i++) ctx.fillRect(1 + i * 2.5, -13, 1, 8);
    const blink = Math.sin(r.time * 2.2) > 0.85;
    ctx.fillStyle = blink ? '#ff4d4d' : '#4a1d22';
    ctx.fillRect(-7, -11, 2, 2);
  }

  // ───────────────────────── 투자 자리 ─────────────────────────
  function drawSpot(world, s) {
    const wob = (r.wallWobble.get(s.id) || 0);
    ctx.save();
    ctx.translate(s.x + Math.sin(r.time * 60) * wob * 1.2, 0);
    if (s.kind === 'archerPost') {
      ctx.fillStyle = '#5b3d22';
      ctx.fillRect(-1, -30, 2, 30);
      const wave = Math.sin(r.time * 3) * 1.2;
      ctx.fillStyle = '#3f7a45';
      ctx.beginPath();
      ctx.moveTo(1, -30);
      ctx.lineTo(14, -28 + wave);
      ctx.lineTo(13, -21 + wave);
      ctx.lineTo(1, -20);
      ctx.fill();
      // 깃발의 활 무늬
      ctx.strokeStyle = '#d9c38a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(6, -25 + wave * 0.5, 3, -1.2, 1.2);
      ctx.stroke();
      ctx.fillStyle = '#4a321c';
      ctx.fillRect(-4, -1.5, 8, 1.5);
    } else if (s.kind === 'swordPost') {
      // 무기 거치대: 기둥 + 둥근 방패 + 엇갈린 칼
      ctx.fillStyle = '#5b3d22';
      ctx.fillRect(-1, -24, 2, 24);
      ctx.fillRect(-6, -18, 12, 1.5);
      ctx.strokeStyle = '#cfd6e0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, -27); ctx.lineTo(5, -12);
      ctx.moveTo(6, -27); ctx.lineTo(-5, -12);
      ctx.stroke();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(0, -19, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a2e2e';
      ctx.beginPath();
      ctx.arc(0, -19, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(-0.5, -21.5, 1, 5);
      ctx.fillStyle = '#4a321c';
      ctx.fillRect(-4, -1.5, 8, 1.5);
    } else if (s.kind === 'barricade') {
      if (s.built) {
        const dmg = 1 - s.hp / s.maxHp;
        for (let i = 0; i < 4; i++) {
          const x = -7 + i * 4.5;
          const h = 22 - (i % 2) * 3;
          ctx.fillStyle = i % 2 ? '#6e4828' : '#7d5430';
          ctx.fillRect(x - 1.8, -h, 3.6, h);
          ctx.beginPath();
          ctx.moveTo(x - 1.8, -h);
          ctx.lineTo(x, -h - 3.5);
          ctx.lineTo(x + 1.8, -h);
          ctx.fill();
          if (dmg > 0.3 + i * 0.15) {
            ctx.strokeStyle = '#2a1a0c';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(x - 1, -h * 0.7);
            ctx.lineTo(x + 0.8, -h * 0.5);
            ctx.lineTo(x - 0.5, -h * 0.3);
            ctx.stroke();
          }
        }
        ctx.fillStyle = '#4e3218';
        ctx.fillRect(-10, -13, 20, 2.5);
        ctx.fillRect(-10, -6, 20, 2.5);
      } else {
        ctx.strokeStyle = 'rgba(220,200,150,0.22)';
        ctx.setLineDash([1.5, 1.5]);
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 4; i++) ctx.strokeRect(-8.8 + i * 4.5, -20 + (i % 2) * 3, 3.6, 20 - (i % 2) * 3);
        ctx.setLineDash([]);
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(-1.5, -6, 3, 6);
      }
    }
    ctx.restore();
  }

  function drawSpotSlots(world, s, dt) {
    const king = world.king;
    const near = Math.abs(king.x - s.x) < 42;
    const a0 = r.spotAlpha.get(s.id) || 0;
    const a = clamp(a0 + (near ? dt * 6 : -dt * 4), 0, 1);
    r.spotAlpha.set(s.id, a);
    if (a <= 0) return;

    const open = canInvest(world, s) || s.pending > 0;
    const pulse = r.slotPulse.get(s.id) || 0;
    ctx.globalAlpha = easeOut(a);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 6px system-ui, sans-serif';

    let label;
    if (s.kind === 'archerPost') label = world.archers.length >= CONFIG.archer.max ? '궁수 가득' : '궁수 고용';
    else if (s.kind === 'swordPost') label = world.swordsmen.length >= CONFIG.swordsman.max ? '검사 가득' : '검사 고용';
    else label = s.built ? `방벽 ${s.hp}/${s.maxHp}` : '방벽 짓기';
    ctx.fillStyle = '#120c18';
    ctx.fillText(label, s.x + 0.5, -59.5);
    ctx.fillStyle = open ? '#f3e6c4' : '#9a8f80';
    ctx.fillText(label, s.x, -60);

    if (open) {
      const lift = (1 - easeOut(a)) * 6;
      for (let i = 0; i < s.cost; i++) {
        const x = s.x + (i - (s.cost - 1) / 2) * 8;
        const y = -48 + lift;
        if (i < s.paid) {
          const pop = i === s.paid - 1 ? pulse * 0.6 : 0;
          drawCoinShape(x, y, 3 * (1 + pop), 3 * (1 + pop), true);
        } else {
          ctx.strokeStyle = 'rgba(255,230,160,0.55)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.arc(x, y, 2.8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ───────────────────────── 코인 ─────────────────────────
  function drawCoinShape(x, cy, w, h, glow) {
    if (glow) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,190,60,0.14)';
      ctx.beginPath();
      ctx.arc(x, cy, h * 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = COLORS.goldDark;
    ctx.beginPath();
    ctx.ellipse(x, cy, Math.max(0.5, w), h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.ellipse(x, cy, Math.max(0.3, w * 0.75), h * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    if (w > 1.4) {
      ctx.fillStyle = COLORS.goldLight;
      ctx.fillRect(x - w * 0.35, cy - h * 0.45, Math.max(0.5, w * 0.25), h * 0.5);
    }
  }

  function drawCoin(x, y, spin, id, grounded) {
    const R = 3;
    const w = grounded ? R * 0.92 : R * Math.max(0.12, Math.abs(Math.cos(spin)));
    drawCoinShape(x, y - R, w, R, true);
    // 반짝 (땅에 놓인 코인이 가끔 빛남)
    const ph = (r.time * 0.7 + id * 0.37) % 1;
    if (grounded && ph < 0.1) {
      const k = Math.sin((ph / 0.1) * Math.PI);
      ctx.fillStyle = `rgba(255,255,230,${k})`;
      const s = 3.5 * k;
      ctx.fillRect(x + 1.5 - s, y - R * 1.6 - 0.3, s * 2, 0.6);
      ctx.fillRect(x + 1.5 - 0.3, y - R * 1.6 - s, 0.6, s * 2);
    }
  }

  // ───────────────────────── 캐릭터 ─────────────────────────
  function shadow(x, w) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, 0, w, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function legs(phase, moving, color) {
    const l = moving ? Math.sin(phase) * 2.2 : 0;
    ctx.fillStyle = color;
    ctx.fillRect(-2.8 + l, -6, 2.3, 6);
    ctx.fillRect(0.5 - l, -6, 2.3, 6);
  }

  function drawKing(k, world) {
    shadow(k.x, 6);
    if (k.hurtTimer > 0 && Math.floor(r.time * 18) % 2) return;
    const moving = Math.abs(k.vx) > 5;
    const bob = moving ? -Math.abs(Math.sin(r.kingPhase)) * 1.3 : Math.sin(r.time * 2) * 0.3;
    ctx.save();
    ctx.translate(k.x, bob);
    ctx.scale(k.facing, 1);

    // 망토
    const sway = clamp(Math.abs(k.vx) / CONFIG.king.speed, 0, 1) * 3.5 + Math.sin(r.time * 3) * 0.5;
    ctx.fillStyle = '#8e2a3c';
    ctx.beginPath();
    ctx.moveTo(-1, -17);
    ctx.lineTo(-6 - sway, -4 + sway * 0.4);
    ctx.lineTo(-1, -5);
    ctx.fill();

    legs(r.kingPhase, moving, '#2b2238');
    // 몸
    ctx.fillStyle = '#3b5bb5';
    ctx.fillRect(-4, -15.5, 8, 10);
    ctx.fillStyle = '#2a1f14';
    ctx.fillRect(-4, -8.5, 8, 1.5);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-0.7, -8.5, 1.4, 1.5);
    // 코인 주머니 (코인이 많을수록 빵빵해짐)
    const purse = 1.3 + Math.min(k.coins, 40) * 0.045;
    ctx.fillStyle = '#7a5a2e';
    ctx.beginPath();
    ctx.ellipse(-3.2, -6.3 + purse * 0.3, purse, purse * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a3f1c';
    ctx.fillRect(-3.8, -7.4, 1.2, 0.8);

    // 머리
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(-3.2, -21.5, 6.4, 6);
    ctx.fillStyle = '#1a1020';
    ctx.fillRect(1.2, -19.5, 1, 1.3);
    ctx.fillStyle = '#d9d2c2';
    ctx.fillRect(-1, -16.5, 4.2, 1.6);
    // 왕관
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-3.5, -23.5, 7, 2.2);
    ctx.beginPath();
    ctx.moveTo(-3.5, -23.4); ctx.lineTo(-3.5, -26); ctx.lineTo(-1.8, -23.4);
    ctx.moveTo(-1.2, -23.4); ctx.lineTo(0, -26.8); ctx.lineTo(1.2, -23.4);
    ctx.moveTo(1.8, -23.4); ctx.lineTo(3.5, -26); ctx.lineTo(3.5, -23.4);
    ctx.fill();
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(-0.5, -23, 1, 1);
    if (Math.sin(r.time * 1.3) > 0.97) {
      ctx.fillStyle = '#fffbe0';
      ctx.fillRect(-0.2, -29, 0.4, 3);
      ctx.fillRect(-1.5, -27.7, 3, 0.4);
    }

    // 팔: 투자할 땐 앞으로 쭉 내밈
    ctx.fillStyle = '#2f4a96';
    if (k.investing) {
      const flick = Math.sin(r.time * 30) * 0.8;
      ctx.fillRect(1.5, -15 + flick, 5.5, 2);
      ctx.fillStyle = '#f2c9a0';
      ctx.fillRect(6.5, -15.3 + flick, 1.8, 2.2);
    } else {
      const swing = moving ? Math.sin(r.kingPhase) * 1.5 : 0;
      ctx.fillRect(0.5 + swing * 0.5, -14.5, 2, 6);
    }
    ctx.restore();
  }

  function drawArcher(a) {
    shadow(a.x, 4.5);
    const moving = Math.abs(a.vx) > 3;
    const phase = r.time * 12 + a.id;
    ctx.save();
    ctx.translate(a.x, moving ? -Math.abs(Math.sin(phase)) : 0);
    ctx.scale(a.facing, 1);
    legs(phase, moving, '#3a2c20');
    // 화살통
    ctx.fillStyle = '#6e4a2a';
    ctx.fillRect(-4.2, -15, 2, 7);
    ctx.fillStyle = '#e3d3a8';
    ctx.fillRect(-4, -16.5, 0.6, 1.5);
    ctx.fillRect(-3.2, -17, 0.6, 2);
    // 몸, 후드
    ctx.fillStyle = '#5a4632';
    ctx.fillRect(-3, -13, 6, 7.5);
    ctx.fillStyle = '#3f7a45';
    ctx.fillRect(-3.4, -18.5, 6.8, 6);
    ctx.fillRect(-3.4, -13.5, 6.8, 2.5);
    ctx.fillStyle = '#e9c39b';
    ctx.fillRect(0.4, -16.6, 2.6, 3);
    ctx.fillStyle = '#1a1020';
    ctx.fillRect(1.8, -15.8, 0.8, 0.9);

    // 활과 시위 (쏘기 직전에 당김)
    const pull = a.aiming ? clamp(1 - a.cooldown / 0.55, 0, 1) : 0;
    ctx.strokeStyle = '#a87b3f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(2.5, -11, 6, -1.15, 1.15);
    ctx.stroke();
    const tx = 2.5 + Math.cos(-1.15) * 6;
    const ty = -11 + Math.sin(-1.15) * 6;
    const by = -11 + Math.sin(1.15) * 6;
    ctx.strokeStyle = '#e8e2d0';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - pull * 4, -11);
    ctx.lineTo(tx, by);
    ctx.stroke();
    if (pull > 0.05) {
      ctx.fillStyle = '#e3d3a8';
      ctx.fillRect(tx - pull * 4, -11.3, 9, 0.6);
      ctx.fillStyle = '#dfe6ee';
      ctx.fillRect(tx - pull * 4 + 9, -11.7, 1.6, 1.4);
    }
    ctx.restore();
  }

  function drawSwordsman(s) {
    const downed = s.state === 'downed';
    const moving = Math.abs(s.vx) > 3;
    const phase = r.time * (downed ? 6 : 12) + s.id;
    shadow(s.x, 5);
    ctx.save();
    ctx.translate(s.x, moving && !downed ? -Math.abs(Math.sin(phase)) : 0);
    ctx.scale(s.facing, 1);
    if (s.flash > 0 && Math.floor(r.time * 30) % 2) ctx.globalAlpha = 0.45;
    if (downed) {
      // 비틀거리며 후퇴 (몸을 숙이고 흐릿하게)
      ctx.rotate(0.25);
      ctx.globalAlpha *= 0.7;
    }
    legs(phase, moving, '#3a3440');
    // 갑옷과 붉은 겉옷
    ctx.fillStyle = '#8c95a3';
    ctx.fillRect(-3.6, -14.5, 7.2, 9);
    ctx.fillStyle = '#9a3b3b';
    ctx.fillRect(-1.4, -14, 2.8, 7);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(-3.6, -7.8, 7.2, 1.3);
    // 투구와 깃털 장식
    ctx.fillStyle = '#b9c2cf';
    ctx.fillRect(-3.1, -20.5, 6.2, 6.2);
    ctx.fillStyle = '#1a1020';
    ctx.fillRect(0.4, -18.4, 2.7, 0.9);
    ctx.fillStyle = '#c0392b';
    const plume = Math.sin(r.time * 4 + s.id) * 0.6;
    ctx.fillRect(-1.2, -22.5, 1.6, 2.2);
    ctx.fillRect(-3 + plume, -23.2, 2.4, 1.4);
    // 칼: 휘두를 땐 위에서 아래로 크게 내리침
    ctx.save();
    ctx.translate(1.2, -12.5);
    const ang = s.swing > 0 ? -2.0 + (1 - s.swing) * 2.9 : downed ? 0.9 : -0.7;
    ctx.rotate(ang);
    ctx.fillStyle = '#e6ebf2';
    ctx.fillRect(1, -0.55, 9, 1.1);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0.6, -1.7, 0.9, 3.4);
    ctx.fillStyle = '#5a3f1c';
    ctx.fillRect(-1.2, -0.5, 1.8, 1);
    ctx.restore();
    // 방패 (앞쪽)
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.ellipse(3.8, -10, 2.4, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b4a2b';
    ctx.beginPath();
    ctx.ellipse(3.9, -10, 1.7, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;

    if (downed) {
      // 회복 중: 머리 위에 회복 게이지
      const p = 1 - s.recover / CONFIG.swordsman.recoverTime;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(s.x - 7, -29, 14, 2);
      ctx.fillStyle = '#a8f0a0';
      ctx.fillRect(s.x - 7, -29, 14 * clamp(p, 0, 1), 2);
    } else if (s.hp < s.maxHp - 0.01) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(s.x - 7, -29, 14, 2);
      ctx.fillStyle = '#7fd36b';
      ctx.fillRect(s.x - 7, -29, 14 * (s.hp / s.maxHp), 2);
    }
  }

  function drawAnimal(world, a) {
    const golden = a.kind === 'goldenChicken';
    const moving = Math.abs(a.vx) > 1;
    const t = r.time;
    const hop = a.fleeing ? -Math.abs(Math.sin(t * 18 + a.id)) * 3 : moving ? -Math.abs(Math.sin(t * 10 + a.id)) * 0.6 : 0;
    shadow(a.x, 4);
    ctx.save();
    ctx.translate(a.x, hop);
    ctx.scale(a.facing, 1);
    const body = golden ? COLORS.gold : '#f4f1e8';
    const wing = golden ? '#e0a020' : '#d8d0c0';
    // 다리
    ctx.fillStyle = '#e0a040';
    const l = moving ? Math.sin(t * 20 + a.id) * 1.2 : 0;
    ctx.fillRect(-1.2 + l, -2.6, 0.8, 2.6);
    ctx.fillRect(0.8 - l, -2.6, 0.8, 2.6);
    // 꼬리
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-3.5, -5);
    ctx.lineTo(-6.5, -9);
    ctx.lineTo(-5, -4.5);
    ctx.fill();
    // 몸
    ctx.beginPath();
    ctx.ellipse(0, -5.3, 4.6, 3.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // 날개 (도망칠 땐 퍼덕)
    const flap = a.fleeing ? Math.sin(t * 40) * 1.4 : 0;
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.ellipse(-0.8, -5.6 - flap * 0.5, 2.6, 1.6 + Math.abs(flap), -0.2, 0, Math.PI * 2);
    ctx.fill();
    // 머리 (쪼는 중이면 아래로)
    const peck = a.state === 'peck' && !a.fleeing ? Math.max(0, Math.sin(t * 9 + a.id)) : 0;
    const hx = 3.6 + peck * 1.2;
    const hy = -8.2 + peck * 4.5;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(hx, hy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8433a';
    ctx.fillRect(hx - 1, hy - 3, 1.2, 1.4);
    ctx.fillRect(hx + 0.2, hy - 3.3, 1.2, 1.6);
    ctx.fillRect(hx + 1.3, hy + 0.6, 0.8, 1.4);
    ctx.fillStyle = '#f39c34';
    ctx.beginPath();
    ctx.moveTo(hx + 1.8, hy - 0.6);
    ctx.lineTo(hx + 3.6, hy + 0.1);
    ctx.lineTo(hx + 1.8, hy + 0.7);
    ctx.fill();
    ctx.fillStyle = '#1a1020';
    ctx.fillRect(hx + 0.5, hy - 1, 0.8, 0.8);
    ctx.restore();
  }

  function drawEnemy(e) {
    if (e.kind === 'bat') drawBat(e);
    else if (e.kind === 'wraith') drawWraith(e);
    else if (e.kind === 'crawler') drawCrawler(e);
    else if (e.kind === 'thief') drawThief(e);
    else drawShade(e);
    // 튼튼한 적은 체력바
    if (e.maxHp >= 3 && e.hp < e.maxHp) {
      const top = e.y - e.h - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - 8, top, 16, 2);
      ctx.fillStyle = '#b48cff';
      ctx.fillRect(e.x - 8, top, 16 * (e.hp / e.maxHp), 2);
    }
  }

  function enemyRim() {
    ctx.strokeStyle = 'rgba(160,110,235,0.85)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  function eyeGlow(x, y, rad, color) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  // 하늘에 있는 적의 그림자는 높을수록 작고 흐리게
  function flyerShadow(e) {
    const k = clamp(1 + e.y / 110, 0.2, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.3 * k})`;
    ctx.beginPath();
    ctx.ellipse(e.x, 0, e.w * 0.45 * k + 1, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 날개 그림자: 퍼덕이는 박쥐 모양. 급강하할 땐 날개를 접고 눈이 붉어짐
  function drawBat(e) {
    const t = r.time;
    const dive = e.state === 'dive';
    const body = e.flash > 0 ? '#ffffff' : '#0b0712';
    flyerShadow(e);
    ctx.save();
    ctx.translate(e.x, e.y - e.h / 2);
    ctx.scale(e.facing, 1);
    if (dive) ctx.rotate(0.5);
    const flap = dive ? -0.6 : Math.sin(t * 22 + e.id);
    const wy = -flap * 5;
    ctx.fillStyle = body;
    ctx.beginPath();
    for (const sd of [-1, 1]) {
      ctx.moveTo(sd * 1.5, -1);
      ctx.lineTo(sd * 8.5, wy - 1);
      ctx.lineTo(sd * 7, wy + 1.8);
      ctx.lineTo(sd * 5.3, wy + 0.6);
      ctx.lineTo(sd * 3.8, wy + 2);
      ctx.lineTo(sd * 2.5, 1.5);
      ctx.closePath();
    }
    ctx.fill();
    enemyRim();
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.6, 3.2, 0, 0, Math.PI * 2);
    ctx.moveTo(-1.8, -2.4); ctx.lineTo(-1.2, -4.6); ctx.lineTo(-0.4, -2.8);
    ctx.moveTo(1.8, -2.4); ctx.lineTo(1.2, -4.6); ctx.lineTo(0.4, -2.8);
    ctx.fill();
    if (e.flash <= 0) {
      const eye = dive ? '#ff5c7a' : '#9ff3ff';
      eyeGlow(0.8, -0.8, 2.2, dive ? 'rgba(255,80,110,0.4)' : 'rgba(150,240,255,0.3)');
      ctx.fillStyle = eye;
      ctx.fillRect(0, -1.2, 0.9, 0.9);
      ctx.fillRect(1.5, -1.2, 0.9, 0.9);
    }
    ctx.restore();
  }

  // 망령: 반투명한 유령. 너덜너덜한 옷자락이 뒤로 흩날림
  function drawWraith(e) {
    const t = r.time;
    flyerShadow(e);
    ctx.save();
    ctx.translate(e.x, e.y - e.h / 2 + Math.sin(t * 2 + e.id) * 1.2);
    ctx.scale(e.facing, 1);
    eyeGlow(0, 0, 13, 'rgba(140,80,220,0.13)');
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    ctx.arc(0, -2.5, 6.5, Math.PI, 0);
    ctx.lineTo(6.5, 3);
    const N = 6;
    for (let i = 0; i <= N; i++) {
      const p = i / N;
      const x = 6.5 - p * 13 - p * 4;
      const y = 7 + Math.sin(t * 9 + i * 1.6 + e.id) * 1.6 + (i % 2) * 1.5;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#170c26';
    ctx.fill();
    enemyRim();
    ctx.globalAlpha = 1;
    if (e.flash <= 0) {
      ctx.fillStyle = '#efe6ff';
      ctx.beginPath();
      ctx.ellipse(1.2, -3, 1, 1.5, 0, 0, Math.PI * 2);
      ctx.ellipse(4, -3, 1, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#05030a';
      ctx.beginPath();
      ctx.ellipse(2.8, 0.8, 1.1, 1.6 + Math.sin(t * 3) * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 기는 그림자: 낮고 길쭉, 다리가 바글바글
  function drawCrawler(e) {
    const t = r.time;
    const body = e.flash > 0 ? '#ffffff' : '#0b0712';
    shadow(e.x, 6);
    ctx.save();
    ctx.translate(e.x, 0);
    ctx.scale(e.facing, 1);
    ctx.strokeStyle = body;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const lx = -3 + i * 3;
      const ph = Math.sin(t * 28 + i * 2 + e.id) * 1.5;
      ctx.beginPath();
      ctx.moveTo(lx, -3.5); ctx.lineTo(lx - 2 + ph, -5.5); ctx.lineTo(lx - 3 + ph, 0);
      ctx.moveTo(lx, -3.5); ctx.lineTo(lx + 2 - ph, -5.5); ctx.lineTo(lx + 3 - ph, 0);
      ctx.stroke();
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(-0.5, -4.2, 5.5, 2.8, 0, 0, Math.PI * 2);
    ctx.ellipse(4.6, -4.4, 2.5, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
    enemyRim();
    if (e.flash <= 0) {
      eyeGlow(5.5, -5, 2.5, 'rgba(255,120,80,0.35)');
      ctx.fillStyle = '#ff9a6b';
      ctx.fillRect(4.8, -5.3, 0.9, 0.9);
      ctx.fillRect(6.2, -5.3, 0.9, 0.9);
    }
    ctx.restore();
  }

  // 코인 도둑: 깡마른 두건 그림자, 등에 자루 (훔칠수록 불룩 + 반짝)
  function drawThief(e) {
    const t = r.time;
    const run = Math.abs(e.vx) > 1;
    const phase = t * 16 + e.id;
    const body = e.flash > 0 ? '#ffffff' : '#0b0712';
    shadow(e.x, 4);
    ctx.save();
    ctx.translate(e.x, run ? -Math.abs(Math.sin(phase)) * 1.2 : 0);
    ctx.scale(e.facing, 1);
    legs(phase, run, body);
    const sack = 2.2 + Math.min(e.carrying, 4) * 0.7;
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#2a1d33';
    ctx.beginPath();
    ctx.ellipse(-4.2, -9.5, sack, sack * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    if (e.carrying > 0 && Math.sin(t * 6 + e.id) > 0.3) {
      ctx.fillStyle = COLORS.goldLight;
      ctx.fillRect(-4.8, -11, 1, 1);
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-3.5, -5.5);
    ctx.lineTo(3.5, -5.5);
    ctx.lineTo(2.6, -13);
    ctx.lineTo(0.5, -15.5);
    ctx.lineTo(-4, -14.8 + Math.sin(t * 8) * 0.6);
    ctx.lineTo(-2.2, -12);
    ctx.closePath();
    ctx.fill();
    enemyRim();
    if (e.flash <= 0) {
      eyeGlow(2, -12, 2.4, 'rgba(255,220,90,0.3)');
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(1, -12.6, 1, 0.8);
      ctx.fillRect(2.5, -12.6, 1, 0.8);
    }
    ctx.restore();
  }

  function drawShade(e) {
    const t = r.time;
    const big = e.kind === 'bigShade';
    const w = e.w;
    const h = e.h;
    shadow(e.x, w * 0.55);
    ctx.save();
    const lean = e.attacking ? Math.max(0, Math.sin(t * 8)) * 2 : 0;
    ctx.translate(e.x + e.facing * lean, 0);
    ctx.scale(e.facing, 1);

    // 몸: 흔들리는 그림자 덩어리
    ctx.beginPath();
    const N = 12;
    ctx.moveTo(-w / 2, 0);
    for (let i = 0; i <= N; i++) {
      const p = i / N;
      const ang = Math.PI - p * Math.PI;
      const wob = Math.sin(t * 6 + i * 1.7 + e.id) * (big ? 1.4 : 0.9);
      ctx.lineTo(Math.cos(ang) * (w / 2 + wob * 0.4), -Math.sin(ang) * (h + wob) - (p > 0.4 && p < 0.6 ? 1 : 0));
    }
    // 아래쪽 촉수
    for (let i = 0; i <= 4; i++) {
      const x = w / 2 - (i / 4) * w;
      ctx.lineTo(x, Math.sin(t * 10 + i * 2 + e.id) * 0.9 + 0.5);
    }
    ctx.closePath();
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#0b0712';
    ctx.fill();
    enemyRim();

    // 눈 (가끔 깜빡임)
    const blink = Math.sin(t * 0.9 + e.id * 3) > 0.96;
    if (!blink && e.flash <= 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = big ? 'rgba(255,120,180,0.35)' : 'rgba(150,240,255,0.3)';
      ctx.beginPath();
      ctx.arc(w * 0.18, -h * 0.62, big ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = big ? '#ffd0e6' : '#c9f6ff';
      const ey = -h * 0.65;
      ctx.fillRect(w * 0.05, ey, 1.4, big ? 1.6 : 1.3);
      ctx.fillRect(w * 0.28, ey, 1.4, big ? 1.6 : 1.3);
      if (big) ctx.fillRect(w * 0.16, ey - 3, 1.2, 1.2);
    }
    ctx.restore();
  }

  function drawArrow(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.angle);
    if (a.stuck) {
      ctx.globalAlpha = clamp(2.5 - a.life, 0, 1);
      ctx.translate(-3, 0);
    } else {
      // 궤적 잔상
      const grad = ctx.createLinearGradient(-22, 0, -5, 0);
      grad.addColorStop(0, 'rgba(255,240,200,0)');
      grad.addColorStop(1, 'rgba(255,240,200,0.45)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(-5, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#e3d3a8';
    ctx.fillRect(-5, -0.35, 9, 0.7);
    ctx.fillStyle = '#dfe6ee';
    ctx.beginPath();
    ctx.moveTo(4, -1.1);
    ctx.lineTo(6.5, 0);
    ctx.lineTo(4, 1.1);
    ctx.fill();
    ctx.fillStyle = '#d24b4b';
    ctx.fillRect(-5.5, -1.1, 2, 0.8);
    ctx.fillRect(-5.5, 0.3, 2, 0.8);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ───────────────────────── 화면 UI ─────────────────────────
  function drawHud(world, dt) {
    const u = r.ui;
    const base = hudAnchor();
    const target = { x: base.x, y: base.y - 10 * u };

    // 날아오는 코인
    for (let i = r.flyCoins.length - 1; i >= 0; i--) {
      const f = r.flyCoins[i];
      f.t += dt;
      const p = Math.min(1, f.t / f.dur);
      const e = p * p * (3 - 2 * p);
      const cx = (f.sx + target.x) / 2;
      const cy = Math.min(f.sy, target.y) - 60 * u;
      const x = (1 - e) * (1 - e) * f.sx + 2 * (1 - e) * e * cx + e * e * target.x;
      const y = (1 - e) * (1 - e) * f.sy + 2 * (1 - e) * e * cy + e * e * target.y;
      const s = (1 - p * 0.3) * 3.2 * r.S * 0.9;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      drawCoinShape(0, 0, 3 * Math.abs(Math.cos(f.t * 18)) + 0.4, 3, true);
      ctx.restore();
      if (p >= 1) {
        r.flyCoins.splice(i, 1);
        r.hudBump = 1;
      }
    }

    const shown = Math.max(0, world.king.coins - r.flyCoins.length);
    // 코인 더미 (쌓이는 느낌)
    const n = Math.min(shown, 14);
    const bump = 1 + easeOut(r.hudBump) * 0.25;
    ctx.save();
    ctx.translate(base.x, base.y);
    for (let i = 0; i < n; i++) {
      const top = i === n - 1;
      const y = -i * 1.9 * u - (top ? r.hudBump * 3 * u : 0);
      const wob = Math.sin(i * 2.3) * 0.8 * u;
      ctx.fillStyle = COLORS.goldDark;
      ctx.beginPath();
      ctx.ellipse(wob, y + 1.2 * u, 7 * u, 2.6 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = top ? COLORS.goldLight : COLORS.gold;
      ctx.beginPath();
      ctx.ellipse(wob, y, 7 * u, 2.6 * u, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (n === 0) {
      ctx.strokeStyle = 'rgba(255,220,140,0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7 * u, 2.6 * u, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(base.x + 13 * u, base.y - 6 * u);
    ctx.scale(bump, bump);
    ctx.font = `bold ${15 * u}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(String(shown), 1.5, 1.5);
    ctx.fillStyle = r.hudBump > 0.5 ? COLORS.goldLight : '#ffffff';
    ctx.fillText(String(shown), 0, 0);
    ctx.restore();

    // 습격 단계와 다음 습격까지 남은 시간
    const w = world.waves;
    const next = Math.max(0, Math.ceil(w.timer));
    const info = `습격 ${w.level}단계 · 다음 습격 ${next}초`;
    ctx.font = `${8.5 * u}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const iy = base.y + 12 * u;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(info, base.x - 7 * u + 1, iy + 1);
    ctx.fillStyle = next <= CONFIG.waves.warnTime ? '#ffb3d9' : '#bfb3d6';
    ctx.fillText(info, base.x - 7 * u, iy);

    if (r.toast) {
      r.toast.life += dt;
      if (r.toast.life > r.toast.max) r.toast = null;
      else {
        const p = r.toast.life / r.toast.max;
        ctx.globalAlpha = p > 0.75 ? (1 - p) / 0.25 : 1;
        ctx.fillStyle = '#d9b8ff';
        ctx.fillText(r.toast.text, base.x - 7 * u, iy + 13 * u);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawBanner(dt) {
    const b = r.banner;
    if (!b) return;
    b.life += dt;
    if (b.life > b.max) { r.banner = null; return; }
    const p = b.life / b.max;
    const alpha = p < 0.1 ? p / 0.1 : p > 0.8 ? (1 - p) / 0.2 : 1;
    const u = r.ui;
    // 다가오는 쪽 가장자리가 붉게 맥박침
    for (const side of b.sides) {
      const pulse = (0.5 + 0.5 * Math.sin(b.life * 8)) * alpha * 0.5;
      const x0 = side < 0 ? 0 : r.W;
      const g = ctx.createLinearGradient(x0, 0, x0 - side * r.W * 0.25, 0);
      g.addColorStop(0, `rgba(120,40,160,${pulse})`);
      g.addColorStop(1, 'rgba(120,40,160,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, r.W, r.H);
    }
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${13 * u}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = r.H * 0.2 + (1 - Math.min(1, p * 6)) * -10;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(b.text, r.W / 2 + 2, y + 2);
    ctx.fillStyle = '#e4ccff';
    ctx.fillText(b.text, r.W / 2, y);
    if (b.sub) {
      ctx.font = `bold ${10 * u}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(b.sub, r.W / 2 + 1.5, y + 18 * u + 1.5);
      ctx.fillStyle = '#ffb3d9';
      ctx.fillText(b.sub, r.W / 2, y + 18 * u);
    }
    ctx.globalAlpha = 1;
  }

  // 화면 밖에 있는 적을 가장자리 화살표로 알려줌
  function drawEdgeWarnings(world) {
    const counts = { '-1': 0, '1': 0 };
    for (const e of world.enemies) {
      const s = toScreen(e.x, 0);
      if (s.x < 0) counts['-1']++;
      else if (s.x > r.W) counts['1']++;
    }
    const u = r.ui;
    for (const side of [-1, 1]) {
      const n = counts[side];
      if (!n) continue;
      const pulse = 0.6 + 0.4 * Math.sin(r.time * 7);
      const x = side < 0 ? 14 * u + r.safeL : r.W - 14 * u;
      const y = r.groundY - 22 * r.S;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#b48cff';
      ctx.beginPath();
      ctx.moveTo(x + side * 7 * u, y);
      ctx.lineTo(x - side * 3 * u, y - 7 * u);
      ctx.lineTo(x - side * 3 * u, y + 7 * u);
      ctx.fill();
      ctx.font = `bold ${10 * u}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e4ccff';
      ctx.fillText(String(n), x - side * 1 * u, y - 13 * u);
      ctx.globalAlpha = 1;
    }
  }

  function drawHint(world) {
    const king = world.king;
    const spot = world.spots.find((s) => s.id === king.spotId);
    let text = null;
    const investKey = r.touchMode ? '투자 버튼' : '↓ 키';
    if (spot) {
      if (!canInvest(world, spot) && spot.pending === 0) text = null;
      else if (king.coins === 0) text = '코인이 없어요 — 사냥감이 떨군 코인을 주워 오세요';
      else text = `${investKey}를 꾹 눌러 코인 넣기`;
    } else if (world.time < 14) {
      text = r.touchMode ? '◀ ▶ 로 이동 · 궁수가 사냥한 코인을 주우세요' : '← → 로 이동 · 궁수가 사냥한 코인을 주우세요';
    }
    if (!text) return;
    const u = r.ui;
    ctx.font = `${9 * u}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = r.touchMode ? r.groundY + 14 * r.S : r.H - 18 * u;
    const w = ctx.measureText(text).width + 16 * u;
    ctx.fillStyle = 'rgba(10,6,16,0.55)';
    ctx.fillRect(r.W / 2 - w / 2, y - 8 * u, w, 16 * u);
    ctx.fillStyle = '#f3e6c4';
    ctx.fillText(text, r.W / 2, y + 0.5);
  }

  resize();
  r.camX = 0;
  return {
    resize,
    handleEvent,
    render,
    set touchMode(v) { r.touchMode = v; },
  };
}
