// 게임의 모든 숫자(밸런스)를 한곳에 모아둔 파일.
// 단위: 거리는 "월드 픽셀"(화면 높이 ≈ 270), 시간은 초.
// 좌표: x는 가로(0 = 마을 중심), y는 세로(0 = 땅, 위로 갈수록 음수).

export const CONFIG = {
  world: {
    halfWidth: 1400,   // 맵은 -1400 ~ +1400
    gravity: 900,
  },

  king: {
    speed: 115,
    accel: 10,
    startCoins: 5,
    pickupRadius: 12,   // 이 거리 안의 코인은 바로 줍기
    magnetRadius: 38,   // 이 거리 안의 코인은 왕 쪽으로 톡 튀어옴
    investInterval: 0.2,// 코인 투자 간격
    hurtCooldown: 1.2,  // 맞은 뒤 무적 시간
  },

  coin: {
    popSpeedY: [150, 230],
    popSpeedX: 55,
    bounce: 0.45,
    pickupDelay: 0.35,  // 튀어나온 직후엔 잠깐 못 줍게 (튀는 걸 보는 맛)
    max: 250,
  },

  // 사냥감: 종류마다 보상과 위험도가 다름
  animals: {
    max: 12,
    initial: 9,
    respawnInterval: 5,
    zones: [[-1300, -230], [230, 1300]],
    kinds: {
      chicken:       { hp: 1, coins: 1, w: 10, h: 9,  walk: 18, flee: 70,  fleeRadius: 50, weight: 92 },
      goldenChicken: { hp: 1, coins: 5, w: 10, h: 9,  walk: 26, flee: 125, fleeRadius: 85, weight: 8 },
    },
  },

  archer: {
    startCount: 1,
    range: 230,
    cooldown: 1.3,
    arrowSpeed: 270,    // 비행 시간 계산용
    arrowGravity: 420,
    spread: 14,         // 멀수록 이만큼 빗나감
    walk: 32,
    huntRange: 650,     // 평소 사냥하러 돌아다니는 범위
    guardOffset: 18,    // 방벽 안쪽 몇 픽셀에서 지킬지
    guardDefault: 70,   // 방벽이 없으면 중심에서 이만큼
    max: 8,
  },

  // 어둠 생물. cost = 습격 예산에서 차지하는 값, unlock = 몇 단계부터 나오는지
  enemies: {
    spawnDistance: 700,
    chaseKingRadius: 90,
    kinds: {
      shade:    { name: '그림자',     hp: 2, coins: 1, w: 12, h: 13, speed: 34, attack: 1, attackInterval: 1.0, cost: 1, unlock: 1 },
      crawler:  { name: '기는 그림자', hp: 1, coins: 1, w: 11, h: 7,  speed: 64, attack: 1, attackInterval: 0.7, cost: 1, unlock: 2 },
      thief:    { name: '코인 도둑',  hp: 2, coins: 2, w: 9,  h: 15, speed: 44, attack: 0, attackInterval: 1.0, cost: 2, unlock: 3, steals: true },
      bigShade: { name: '덩치',       hp: 6, coins: 3, w: 18, h: 22, speed: 22, attack: 2, attackInterval: 1.4, cost: 3, unlock: 3 },
    },
  },

  // 습격 단계(레벨): 단계가 오를수록 예산이 커지고 새로운 괴물이 섞여 나온다
  waves: {
    firstDelay: 35,
    interval: 40,
    warnTime: 5,
    budgetBase: 2,
    budgetPerLevel: 2.2,
  },

  // 코인을 던져 투자하는 자리
  spots: [
    { kind: 'archerPost', x: -30, cost: 3, maxCost: 6 },
    { kind: 'barricade', x: -160, cost: 4, hp: 8 },
    { kind: 'barricade', x: 160, cost: 4, hp: 8 },
  ],
  spotReach: 14,        // 자리 중심에서 이 거리 안이면 투자 가능

  // 손맛 연출 (화면 쪽에서 쓰는 값)
  juice: {
    hitstop: { enemyKilled: 0.07, animalKilled: 0.035, spotComplete: 0.05 },
    shake: { enemyKilled: 2.5, kingHit: 4, spotComplete: 3, wallBroken: 5, wallHit: 0.8 },
  },
};
