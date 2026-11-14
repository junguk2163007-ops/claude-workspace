// 전기설비기술기준 문제의 독립 검산기.
// 문제 템플릿이 쓰는 표와 따로, 공식 전문의 조항을 보고 다시 옮겨 적은 값과 조건 판정으로 답을 구한다.
'use strict';

// 표에서 값을 고르는 문제: key → 값 (공식 전문 조항 번호는 주석)
const TABLE = {
  // 111.1 전압의 구분
  'ac-low': 1, 'dc-low': 1.5, 'high-top': 7, 'extra-over': 7,
  // 142.2 접지극
  depth: 0.75, 'metal-gap': 1, 'pipe-top': 2, 'pipe-thick': 2, 'water-ohm': 3, 'steel-ohm': 2, 'water-dia': 75, 'water-branch': 5,
  // 142.3.1 접지도체
  neutral: 16, 'neutral-7kv': 6, 'neutral-25kv': 6, 'mobile-hv': 10, 'mobile-lv-cord': 0.75, 'mobile-lv-flex': 1.5,
  // 222.5, 332.4, 332.6, 332.10 전선 굵기·안전율
  'lv400-kn': 3.43, 'lv400-mm': 3.2, 'lv400-ins-kn': 2.3, 'lv400-ins-mm': 2.6,
  'lv-city-kn': 8.01, 'lv-city-mm': 5, 'lv-out-kn': 5.26, 'lv-out-mm': 4,
  'hv-ground-kn': 5.26, 'hv-sec-kn': 8.01, 'safety-cu': 2.2, 'safety-other': 2.5, 'wind-avg': 745, 'wind-min': 372,
  // 331.6 표 331.6-1 갑종 풍압하중
  wood: 588, 'steel-round': 588, 'steel-tri': 1412, 'steel-4pipe': 1117, 'rc-round': 588, 'rc-other': 882,
  'tower-single-round': 588, 'tower-single-other': 1117, 'tower-pipe': 1255, 'tower-other': 2157,
  'wire-multi': 666, 'wire-other': 745, insulator: 1039,
  // 222.7, 332.5 높이
  'lv-road': 6, 'lv-rail': 6.5, 'lv-bridge': 3.5, 'lv-bridge-ins': 3, 'lv-other': 5,
  'hv-road': 6, 'hv-rail': 6.5, 'hv-bridge': 3.5, 'hv-other': 5,
  // 222.10, 332.9, 332.10, 333.21 지지물 간 거리
  'lv-sec-wood': 100, 'lv-sec-b': 150, 'lv-sec-tower': 400,
  'hv-wood': 150, 'hv-b': 250, 'hv-tower': 600,
  'hv-sec-wood': 100, 'hv-sec-b': 150, 'hv-sec-tower': 400,
  'ehv-wood': 150, 'ehv-b': 250, 'ehv-tower': 600, 'ehv-tower-single': 400,
  // 331.11, 331.7 지지선·기초
  safety: 2.5, 'min-load': 4.31, strands: 3, dia: 2.6, 'road-h': 5, 'road-h-exc': 4.5, 'base-safety': 2, 'base-safety-tower': 1.33,
};
const byKey = (p) => {
  if (!(p.key in TABLE)) throw new Error('검산표에 없는 key: ' + p.key);
  return TABLE[p.key];
};
const near = (x) => Math.round(x * 1e6) / 1e6;

module.exports = {
  'cd-volt-limit': byKey,
  'cd-earth-fact': byKey,
  'cd-gnd-wire': byKey,
  'cd-wire-spec': byKey,
  'cd-wind-class': byKey,
  'cd-height-lvhv': byKey,
  'cd-span': byKey,
  'cd-guy-fact': byKey,

  // 표 132-1: 조건 판정 순서대로 계산
  'cd-insul-line': (p) => {
    const V = p.V;
    if (p.sys === 'multi') return near(0.92 * V); // 7 kV 초과 25 kV 이하 중성선 다중접지
    if (V <= 7) return near(1.5 * V);
    if (V <= 60) return Math.max(near(1.25 * V), 10.5);
    if (p.sys === 'unearthed') return near(1.25 * V);
    if (p.sys === 'earthed') return Math.max(near(1.1 * V), 75);
    if (p.sys === 'direct') return near(0.72 * V);
    if (p.sys === 'direct-sub') return near(0.64 * V);
    throw new Error('알 수 없는 sys ' + p.sys);
  },

  // 표 133-1, 134, 135-1, 136-1
  'cd-insul-eq': (p) => {
    const V = p.V;
    const k = p.kind;
    if (k === 'pv-dc') return near(1.5 * V);
    if (k === 'pv-ac' || k === 'rect') return Math.max(V, 0.5);
    // 회전기·변압기·기구: 7 kV 이하와 초과로 나뉜다
    if (V <= 7) return Math.max(near(1.5 * V), 0.5);
    return Math.max(near(1.25 * V), 10.5);
  },

  // 표 142.3-1 (선도체와 보호도체가 같은 재질)
  'cd-pe-section': (p) => {
    const S = p.S;
    if (S > 35) return S / 2;
    if (S > 16) return 16;
    return S;
  },

  // 333.7 표 333.7-1
  'cd-height-ehv': (p) => {
    const V = p.V;
    let base;
    if (p.place === 'rail') base = 6.5;
    else if (p.place === 'mountain') base = 5;
    else base = V <= 35 ? 5 : 6;
    let add = 0;
    if (V > 160) {
      let steps = 0;
      while (160 + steps * 10 < V - 1e-9) steps++; // 10 kV 또는 그 단수마다: 올림
      add = steps * 0.12;
    }
    return near(base + add);
  },

  // 331.7 1 가 (1)(2), 나
  'cd-embed': (p) => {
    const L = p.L;
    if (L > 16) return 2.8;
    if (L > 15) return 2.5;
    return near(L / 6);
  },

  // 331.6 1 다: 병종은 갑종의 2분의 1
  'cd-wind-byung': (p) => p.P * 0.5,
};
