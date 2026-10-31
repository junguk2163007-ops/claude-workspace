// 화면 없이 규칙만으로 게임을 몇 분 돌려보는 시험.
// 실행: npm test
import { createWorld, stepWorld } from '../src/core/world.js';
import { spawnSwordsman } from '../src/core/swordsmen.js';
import { spawnEnemy } from '../src/core/enemies.js';

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures++;
}

const world = createWorld(12345);
const counts = {};
const spawnedKinds = {};
const killedKinds = {};
let justCompleted = false;
const dt = 1 / 60;

// 왕이 사냥터를 왔다 갔다 하면서 코인을 줍고, 가끔 궁수 깃발에 투자하는 시나리오
for (let i = 0; i < 60 * 300; i++) {
  const t = i * dt;
  // 20초마다 궁수 깃발과 검사 자리에 번갈아 투자
  const post = world.spots.find((s) => s.kind === (Math.floor(t / 40) % 2 ? 'swordPost' : 'archerPost'));
  let intent = { move: 0, invest: false };
  if (world.king.coins >= 3 && Math.floor(t / 20) % 2 === 1) {
    const dx = post.x - world.king.x;
    if (Math.abs(dx) > 4) intent.move = Math.sign(dx);
    else intent.invest = !justCompleted; // 사람처럼 완성되면 키를 한 번 뗌
  } else {
    intent.move = Math.sin(t / 9) > 0 ? 1 : -1;
  }
  const before = new Set(world.enemies.map((e) => e.id));
  stepWorld(world, dt, intent);
  for (const e of world.enemies) if (!before.has(e.id)) spawnedKinds[e.kind] = (spawnedKinds[e.kind] || 0) + 1;
  justCompleted = world.events.some((ev) => ev.type === 'spotComplete');
  for (const ev of world.events) {
    counts[ev.type] = (counts[ev.type] || 0) + 1;
    if (ev.type === 'enemyKilled') killedKinds[ev.kind] = (killedKinds[ev.kind] || 0) + 1;
  }
  world.events.length = 0;
}

const kindsSeen = new Set(Object.keys(spawnedKinds));
check('습격 단계가 올라감', world.waves.level >= 6, `${world.waves.level}단계`);
check('여러 종류의 적이 나옴', ['shade', 'crawler', 'thief', 'bigShade', 'bat', 'wraith'].every((k) => kindsSeen.has(k)), [...kindsSeen].join(','));

check('날아다니는 괴물을 쓰러뜨림', (killedKinds.bat || 0) + (killedKinds.wraith || 0) > 0, JSON.stringify(killedKinds));
const flyersOk = world.enemies.filter((e) => e.alt !== undefined).every((e) => e.y <= 0 && e.y > -200);
check('날아다니는 괴물이 땅 밑이나 하늘 끝으로 사라지지 않음', flyersOk);

// 검사 단독 시험: 궁수 없이 검사 1명 vs 그림자 2마리
{
  const w2 = createWorld(7);
  w2.archers.length = 0;
  w2.animals.length = 0;
  w2.king.x = -300;
  spawnSwordsman(w2, 30);
  spawnEnemy(w2, 'shade', 1);
  spawnEnemy(w2, 'shade', 1);
  const ev2 = {};
  for (let i = 0; i < 60 * 40; i++) {
    stepWorld(w2, dt, { move: 0, invest: false });
    for (const ev of w2.events) ev2[ev.type] = (ev2[ev.type] || 0) + 1;
    w2.events.length = 0;
  }
  check('검사가 적을 베었다', (ev2.swordSwing || 0) > 0, `${ev2.swordSwing}번`);
  check('검사가 적을 막고 쓰러뜨렸다', (ev2.enemyKilled || 0) >= 2, `${ev2.enemyKilled || 0}마리`);
  check('검사가 맞으면 체력이 줄거나 후퇴함', (ev2.swordsmanHit || 0) > 0, `${ev2.swordsmanHit || 0}번 맞음`);
}

// 궁수 피격 시험: 방벽 없이 궁수 1명에게 기는 그림자 떼가 닥침
{
  const w3 = createWorld(11);
  w3.animals.length = 0;
  w3.king.x = -600;
  w3.archers[0].x = 100;
  for (let i = 0; i < 6; i++) { spawnEnemy(w3, 'crawler', 1); w3.enemies[i].x = 130 + i * 6; }
  const ev3 = {};
  for (let i = 0; i < 60 * 20; i++) {
    stepWorld(w3, dt, { move: 0, invest: false });
    for (const ev of w3.events) ev3[ev.type] = (ev3[ev.type] || 0) + 1;
    w3.events.length = 0;
  }
  check('궁수가 맞으면 활을 잃음', (ev3.archerDisarmed || 0) > 0);
  check('맨손 궁수가 또 맞으면 사라짐', (ev3.archerLost || 0) > 0 && w3.archers.length === 0, `남은 궁수 ${w3.archers.length}`);

  // 다시 무장: 맨손 궁수가 있을 때 궁수 깃발에 투자
  const w4 = createWorld(12);
  w4.archers[0].armed = false;
  const post = w4.spots.find((s) => s.kind === 'archerPost');
  w4.king.x = post.x;
  w4.king.coins = 10;
  const cost = post.cost;
  for (let i = 0; i < 60 * 3; i++) {
    stepWorld(w4, dt, { move: 0, invest: true });
    w4.events.length = 0;
  }
  check('맨손 궁수가 다시 활을 듦 (새로 뽑지 않음, 가격 그대로)', w4.archers.length === 1 && w4.archers[0].armed && post.cost === cost);
}

// 수비탑 시험: 방벽을 3단계까지 올리면 스스로 화살을 쏨
{
  const w5 = createWorld(21);
  w5.archers.length = 0;
  w5.animals.length = 0;
  const wall = w5.spots.find((s) => s.kind === 'barricade' && s.x > 0);
  w5.king.x = wall.x;
  w5.king.coins = 40;
  let release = false;
  for (let i = 0; i < 60 * 12; i++) {
    stepWorld(w5, dt, { move: 0, invest: !release });
    release = w5.events.some((ev) => ev.type === 'spotComplete');
    w5.events.length = 0;
  }
  check('방벽이 3단계(수비탑)까지 강화됨', wall.level === 3 && wall.maxHp === 28, `단계 ${wall.level}, 체력 ${wall.maxHp}`);
  w5.king.x = -300;
  spawnEnemy(w5, 'shade', 1);
  w5.enemies[0].x = 300;
  let fired = 0;
  for (let i = 0; i < 60 * 10; i++) {
    stepWorld(w5, dt, { move: 0, invest: false });
    fired += w5.events.filter((ev) => ev.type === 'arrowFired').length;
    w5.events.length = 0;
  }
  check('수비탑이 스스로 화살을 쏨', fired > 0 && w5.enemies.length === 0, `${fired}발`);
}

const all = [world.king, ...world.archers, ...world.animals, ...world.enemies, ...world.coins, ...world.arrows];
check('숫자가 깨지지 않음 (NaN 없음)', all.every((e) => Number.isFinite(e.x) && Number.isFinite(e.y)));
check('화살을 쐈다', (counts.arrowFired || 0) > 20, `${counts.arrowFired}발`);
check('동물을 사냥했다', (counts.animalKilled || 0) > 3, `${counts.animalKilled}마리`);
check('코인을 주웠다', (counts.coinCollected || 0) > 3, `${counts.coinCollected}개`);
check('코인을 투자했다', (counts.coinSlotted || 0) > 0, `${counts.coinSlotted}개`);
check('궁수가 코인을 주웠다', (counts.archerPickup || 0) > 0, `${counts.archerPickup || 0}개`);
check('궁수가 왕에게 코인을 건넸다', (counts.coinGiven || 0) > 0, `${counts.coinGiven || 0}개`);
check('궁수를 고용했다', world.archers.length > 1, `궁수 ${world.archers.length}명`);
check('검사를 고용했다', world.swordsmen.length > 0, `검사 ${world.swordsmen.length}명`);
check('습격이 왔다', (counts.waveIncoming || 0) > 3, `${counts.waveIncoming}번`);
check('적을 쓰러뜨렸다', (counts.enemyKilled || 0) > 3, `${counts.enemyKilled}마리`);
check('왕의 코인이 음수가 아님', world.king.coins >= 0, `${world.king.coins}개`);
console.log('이벤트 통계:', counts);
console.log('등장한 적:', spawnedKinds);

if (failures) {
  console.log(`\n${failures}개 실패`);
  process.exit(1);
}
console.log('\n모두 통과');
