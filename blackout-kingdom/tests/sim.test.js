// 화면 없이 규칙만으로 게임을 몇 분 돌려보는 시험.
// 실행: npm test
import { createWorld, stepWorld } from '../src/core/world.js';

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures++;
}

const world = createWorld(12345);
const counts = {};
const dt = 1 / 60;

// 왕이 사냥터를 왔다 갔다 하면서 코인을 줍고, 가끔 궁수 깃발에 투자하는 시나리오
for (let i = 0; i < 60 * 300; i++) {
  const t = i * dt;
  const archerPost = world.spots[0];
  let intent = { move: 0, invest: false };
  if (world.king.coins >= 3 && Math.floor(t / 20) % 2 === 1) {
    const dx = archerPost.x - world.king.x;
    if (Math.abs(dx) > 4) intent.move = Math.sign(dx);
    else intent.invest = true;
  } else {
    intent.move = Math.sin(t / 9) > 0 ? 1 : -1;
  }
  stepWorld(world, dt, intent);
  for (const ev of world.events) counts[ev.type] = (counts[ev.type] || 0) + 1;
  world.events.length = 0;
}

const all = [world.king, ...world.archers, ...world.animals, ...world.enemies, ...world.coins, ...world.arrows];
check('숫자가 깨지지 않음 (NaN 없음)', all.every((e) => Number.isFinite(e.x) && Number.isFinite(e.y)));
check('화살을 쐈다', (counts.arrowFired || 0) > 20, `${counts.arrowFired}발`);
check('동물을 사냥했다', (counts.animalKilled || 0) > 3, `${counts.animalKilled}마리`);
check('코인을 주웠다', (counts.coinCollected || 0) > 3, `${counts.coinCollected}개`);
check('코인을 투자했다', (counts.coinSlotted || 0) > 0, `${counts.coinSlotted}개`);
check('궁수를 고용했다', world.archers.length > 1, `궁수 ${world.archers.length}명`);
check('습격이 왔다', (counts.waveIncoming || 0) > 3, `${counts.waveIncoming}번`);
check('적을 쓰러뜨렸다', (counts.enemyKilled || 0) > 3, `${counts.enemyKilled}마리`);
check('왕의 코인이 음수가 아님', world.king.coins >= 0, `${world.king.coins}개`);
console.log('이벤트 통계:', counts);

if (failures) {
  console.log(`\n${failures}개 실패`);
  process.exit(1);
}
console.log('\n모두 통과');
