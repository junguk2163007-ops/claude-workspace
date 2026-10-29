// 게임 규칙의 "본체". 화면과 상관없이 이 파일만으로 게임이 돌아간다.
// (그래서 Node에서 테스트할 수 있고, 나중에 Godot로 옮길 때 이 폴더만 번역하면 된다.)

import { CONFIG } from '../config.js';
import { createRng } from './util.js';
import { createKing, updateKing } from './king.js';
import { createSpot, updateThrownCoins } from './spots.js';
import { spawnArcher, updateArchers } from './archers.js';
import { updateArrows } from './arrows.js';
import { spawnAnimal, updateAnimals } from './animals.js';
import { updateEnemies } from './enemies.js';
import { updateCoins } from './coins.js';
import { createWaves, updateWaves } from './waves.js';

export function createWorld(seed = Date.now()) {
  const world = {
    seed,
    time: 0,
    rng: createRng(seed),
    nextId: 1,
    events: [],
    king: createKing(),
    spots: [],
    archers: [],
    arrows: [],
    animals: [],
    enemies: [],
    coins: [],
    thrownCoins: [],
    waves: createWaves(),
    animalSpawnTimer: CONFIG.animals.respawnInterval,
  };
  world.spots = CONFIG.spots.map((def) => createSpot(def, world.nextId++));
  for (let i = 0; i < CONFIG.animals.initial; i++) spawnAnimal(world);
  for (let i = 0; i < CONFIG.archer.startCount; i++) spawnArcher(world, 20 + i * 10);
  world.events.length = 0; // 시작할 때 생긴 이벤트는 버림
  return world;
}

export function stepWorld(world, dt, intent) {
  world.time += dt;
  updateKing(world, dt, intent);
  updateThrownCoins(world, dt);
  updateArchers(world, dt);
  updateArrows(world, dt);
  updateAnimals(world, dt);
  updateEnemies(world, dt);
  updateCoins(world, dt);
  updateWaves(world, dt);
}
