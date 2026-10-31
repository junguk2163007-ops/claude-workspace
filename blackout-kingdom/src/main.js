// 시작점: 규칙(core) · 화면(render) · 소리(audio) · 입력(input)을 연결한다.

import { CONFIG } from './config.js';
import { createWorld, stepWorld } from './core/world.js';
import { createRenderer } from './render/renderer.js';
import { createAudio } from './audio/audio.js';
import { createInput } from './input/input.js';

const canvas = document.getElementById('game');
const world = createWorld(Date.now() & 0xffffffff);
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput();

// 터치 기기면 화면 버튼 보이기
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
function setTouchMode(on) {
  document.body.classList.toggle('touch', on);
  renderer.touchMode = on;
}
setTouchMode(isTouch);
window.addEventListener('touchstart', () => setTouchMode(true), { once: true, passive: true });

// 소리는 사용자가 한 번 누른 뒤에만 켤 수 있음 (브라우저 규칙)
for (const type of ['pointerdown', 'keydown', 'touchend']) {
  window.addEventListener(type, () => audio.unlock(), { passive: true });
}

const muteBtn = document.getElementById('mute');
const musicBtn = document.getElementById('music');
function refreshMute() {
  muteBtn.textContent = audio.muted ? '🔇' : '🔊';
  musicBtn.classList.toggle('off', !audio.musicOn);
}
muteBtn.addEventListener('click', () => { audio.unlock(); audio.toggleMute(); refreshMute(); });
musicBtn.addEventListener('click', () => { audio.unlock(); audio.toggleMusic(); refreshMute(); });
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') { audio.toggleMute(); refreshMute(); }
  if (e.code === 'KeyN') { audio.toggleMusic(); refreshMute(); }
});
document.addEventListener('visibilitychange', () => audio.setSuspended(document.hidden));
refreshMute();

window.addEventListener('resize', () => renderer.resize());

// 게임 루프
const STEP = 1 / 60;
let last = performance.now();
let freeze = 0; // 히트스톱: 타격 순간 아주 잠깐 멈춰서 "묵직한" 느낌

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (freeze > 0) {
    freeze -= dt;
  } else {
    const intent = input.getIntent();
    let left = dt;
    while (left > 1e-6) {
      const step = Math.min(STEP, left);
      stepWorld(world, step, intent);
      left -= step;
    }
  }

  audio.setListener(world.king.x);
  // 배경음악 분위기: 적이 있으면 긴장, 습격 직전엔 살짝 긴장
  const foes = world.enemies.length;
  audio.setMusicIntensity(foes > 0 ? Math.min(1, 0.6 + foes * 0.08) : world.waves.timer < CONFIG.waves.warnTime ? 0.35 : 0);
  for (const ev of world.events) {
    renderer.handleEvent(ev, world);
    audio.handle(ev);
    const hs = CONFIG.juice.hitstop[ev.type];
    if (hs) freeze = Math.max(freeze, hs);
  }
  world.events.length = 0;

  renderer.render(world, dt, freeze > 0);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 디버그용 (브라우저 콘솔에서 __game.world 로 상태 확인 가능)
window.__game = { world };
