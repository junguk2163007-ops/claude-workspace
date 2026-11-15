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
  // 212.3.4 표 212.3-1, 212.3-2 시간(분)
  'fuse-30': 60, 'fuse-100': 120, 'fuse-250': 180, 'fuse-500': 240, 'mccb-50': 60, 'mccb-100': 120,
  // 332.11 표 332.11-1, 332.11-2, 332.11의 2
  'lv-top': 2, 'lv-top-cable': 1, 'lv-side': 1.2, 'lv-side-safe': 0.8, 'lv-side-cable': 0.4,
  'hv-top': 2, 'hv-top-cable': 1, 'hv-side': 1.2, 'hv-side-cable': 0.4,
  'lv-below': 0.6, 'lv-below-cable': 0.3, 'hv-below': 0.8, 'hv-below-cable': 0.4,
  // 151.1, 152.1, 152.2 피뢰시스템
  scope: 20, side: 20, thatch: 0.15, other: 0.1, wall: 0.1, 'wall-area': 100, count: 2, 'gap-1': 10, 'gap-3': 15, 'gap-4': 20, rebar: 0.2,
  safety: 2.5, 'min-load': 4.31, strands: 3, dia: 2.6, 'road-h': 5, 'road-h-exc': 4.5, 'base-safety': 2, 'base-safety-tower': 1.33,
};
const byKey = (p) => {
  if (!(p.key in TABLE)) throw new Error('검산표에 없는 key: ' + p.key);
  return TABLE[p.key];
};
const near = (x) => Math.round(x * 1e6) / 1e6;

module.exports = {
  // ───────── 기출 보강 3차 ─────────
  // R-L-C 보강: 리액턴스 정의식을 거꾸로 풀어 찾는다(이분법), 위상은 복소 임피던스의 편각
  'rlc-xtol': (p) => {
    const w = 2 * Math.PI * p.f;
    let lo = 1e-12;
    let hi = 1e3;
    for (let i = 0; i < 300; i++) {
      const mid = Math.sqrt(lo * hi);
      const x = p.isL ? w * mid : 1 / (w * mid); // 기본 단위 H 또는 F
      if (p.isL ? x < p.X : x > p.X) lo = mid;
      else hi = mid;
    }
    return Math.sqrt(lo * hi) * (p.isL ? 1e3 : 1e6);
  },
  'rlc-lag': (p) => {
    const z = [p.R, 2 * Math.PI * p.f * (p.LmH / 1000)]; // R + jXL
    return (Math.atan2(z[1], z[0]) * 180) / Math.PI;
  },
  // 4단자: 소자별 행렬을 직접 곱한다
  'fp-t': (p) => {
    const mul = (m, n) => [
      [m[0][0] * n[0][0] + m[0][1] * n[1][0], m[0][0] * n[0][1] + m[0][1] * n[1][1]],
      [m[1][0] * n[0][0] + m[1][1] * n[1][0], m[1][0] * n[0][1] + m[1][1] * n[1][1]],
    ];
    const M = mul(mul([[1, p.Z1], [0, 1]], [[1, 0], [p.Y, 1]]), [[1, p.Z2], [0, 1]]);
    return p.ask === 'A' ? M[0][0] : p.ask === 'B' ? M[0][1] : M[1][1];
  },
  'fp-det': (p) => {
    // A·D − B·C = 1 을 만족하는 D 를 이분법으로 찾는다
    let lo = 0;
    let hi = 1000;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (p.A * mid - p.B * p.C > 1) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  },
  'tx-z0': (p) => {
    const L = p.L * 1e-3;
    const C = p.C * 1e-6;
    return p.mode === 'v' ? 1 / Math.sqrt(L * C) / 1e5 : Math.sqrt(1e3 * p.L / p.C);
  },
  'tx-gamma': (p) => (p.mode === 'vswr' ? Math.max(p.ZL, p.Z0) / Math.min(p.ZL, p.Z0) : Math.abs(p.ZL - p.Z0) / (p.ZL + p.Z0)),
  'sc-comp': (p) => {
    const cis = (d) => [Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180)];
    const mul = (u, v) => [u[0] * v[0] - u[1] * v[1], u[0] * v[1] + u[1] * v[0]];
    const sc = (k, u) => [k * u[0], k * u[1]];
    const add = (...us) => us.reduce((s, u) => [s[0] + u[0], s[1] + u[1]], [0, 0]);
    const a = cis(120);
    const a2 = mul(a, a);
    const Va = sc(p.Ma, cis(0));
    const Vb = sc(p.Mb, cis(-120));
    const Vc = sc(p.Mc, cis(120));
    const V0 = sc(1 / 3, add(Va, Vb, Vc));
    const V1 = sc(1 / 3, add(Va, mul(a, Vb), mul(a2, Vc)));
    const V2 = sc(1 / 3, add(Va, mul(a2, Vb), mul(a, Vc)));
    const V = p.which === '0' ? V0 : p.which === '1' ? V1 : V2;
    return Math.hypot(V[0], V[1]);
  },
  'sc-slg': (p) => {
    // 대칭분 회로를 직렬로 잇고 Ia = I0 + I1 + I2
    const Ea = (p.V * 1000) / Math.sqrt(3);
    const I = Ea / (p.Z0 + p.Z1 + p.Z2);
    return I + I + I;
  },
  // 비정현파: 한 주기를 쪼개 직접 적분
  'ns-rms': (p) => {
    const N = 720;
    let s = 0;
    for (let i = 0; i < N; i++) {
      const w = ((i + 0.5) / N) * 2 * Math.PI;
      const v = p.V0 + p.m1 * Math.sin(w) + p.m3 * Math.sin(3 * w) + p.m5 * Math.sin(5 * w);
      s += v * v;
    }
    return Math.sqrt(s / N);
  },
  'ns-thd': (p) => (Math.hypot(p.V3, p.V5) / p.V1) * 100,
  'ns-power': (p) => {
    const N = 720;
    const d = (x) => (x * Math.PI) / 180;
    let s = 0;
    for (let i = 0; i < N; i++) {
      const w = ((i + 0.5) / N) * 2 * Math.PI;
      const v = Math.SQRT2 * p.V1 * Math.sin(w) + Math.SQRT2 * p.V3 * Math.sin(3 * w);
      const c = Math.SQRT2 * p.I1 * Math.sin(w - d(p.t1)) + Math.SQRT2 * p.I3 * Math.sin(3 * w - d(p.t3));
      s += v * c;
    }
    return s / N;
  },
  // 정상 편차: G(s)를 직접 만들어 s→0 극한을 수치로 구한다
  'ce-kind': (p) => {
    const s = 1e-9;
    const G =
      p.kind === 0 ? p.K / ((1 + p.T1 * s) * (1 + p.T2 * s)) : p.kind === 1 ? p.K / (s * (s + p.a)) : p.K / (s * s * (s + p.a));
    const lim = p.kind === 0 ? G : p.kind === 1 ? s * G : s * s * G;
    return p.kind === 0 ? p.A / (1 + lim) : p.A / lim;
  },
  'bd-db': (p) => 20 * Math.log10(p.g1) + 20 * Math.log10(p.g2),
  'bd-lag': (p) => 20 * Math.log10(Math.hypot(1, p.w / p.w0)),
  // 2층 유전체: 각 층의 정전용량을 구해 직렬로 합성
  'di-two': (p) => {
    const e0 = 8.855e-12;
    const S = p.S * 1e-4;
    const c1 = (e0 * p.e1 * S) / (p.d1 * 1e-3);
    const c2 = (e0 * p.e2 * S) / (p.d2 * 1e-3);
    return ((c1 * c2) / (c1 + c2)) * 1e12;
  },
  // 경계: E 접선 성분 연속, D 법선 성분 연속에서 직접 각을 구한다
  'di-angle': (p) => {
    const t1 = (p.th1 * Math.PI) / 180;
    const Et = Math.sin(t1);
    const Dn = p.e1 * Math.cos(t1);
    const En2 = Dn / p.e2;
    return (Math.atan2(Et, En2) * 180) / Math.PI;
  },
  'cl-loss': (p) => {
    // f, Bm 이 바뀌는 비로 계산(전압 일정이면 Bm ∝ 1/f)
    const fr = p.mode === 'f' ? p.k : 1;
    const Br = p.mode === 'B' ? p.k : 1 / p.k;
    const Bratio = p.mode === 'B' ? Br : 1 / fr;
    return p.kind === 'hys' ? p.P1 * fr * Math.pow(Bratio, 1.6) : p.P1 * fr * fr * Bratio * Bratio;
  },
  // 동기발전기: 상전압(선간/√3)으로 1상 전력을 구해 3배
  'so-power': (p) => 3 * ((p.V / Math.sqrt(3)) * (p.E / Math.sqrt(3)) / p.Xs) * Math.sin((p.d * Math.PI) / 180),
  'so-scr': (p) => (p.mode === 'z' ? 1 / (p.z / 100) : p.If1 / p.If2),
  'rl-tap': (p) => (p.IL / (p.I1n / 5)) * p.k,
  'rl-ct': (p) => p.I1 / (p.I1n / 5),
  'sg-wave': (p) => {
    const er = ((p.Z2 - p.Z1) / (p.Z2 + p.Z1)) * p.Ei;
    return p.refl ? Math.abs(er) : p.Ei + er;
  },
  'sg-time': (p) => ((p.d * 1000) / (3e8 / Math.sqrt(p.er))) * 1e6,
  // 전선량: 부하 전압·전력·손실·길이 동일 → 전류와 도체 수로 직접 비교
  'wr-ratio': (p) => {
    // [도체 수, 전류가 흐르는 도체 수, 전선 하나의 전류(단상 2선 = 1)]
    const cfg = { '1p2w': [2, 2, 1], '1p3w': [3, 2, 0.5], '3p3w': [3, 3, 1 / Math.sqrt(3)], '3p4w': [4, 3, 1 / 3] };
    const weight = ([wires, loaded, I]) => wires * loaded * I * I; // 손실 일정 → 단면적 ∝ (전류가 흐르는 선 수)·I²
    return (p.W * weight(cfg[p.meth])) / weight(cfg['1p2w']);
  },
  // 과도현상: 시정수는 정의대로, 전류·전압은 미분방정식을 직접 적분(RK4)
  'tr-tau': (p) => (p.mode === 'rl' ? p.X / p.R : (p.R * p.X) / 1000),
  'tr-step': (p) => {
    const rl = p.mode === 'rl';
    const L = (p.X || 0) / 1000; // H
    const C = (p.X || 0) / 1e6; // F
    const T = p.t / 1000; // s
    const N = 20000;
    const h = T / N;
    // rl: di/dt = (V − R i)/L ,  rc: dv/dt = (V − v)/(R C)
    const f = (y) => (rl ? (p.V - p.R * y) / L : (p.V - y) / (p.R * C));
    let y = 0;
    for (let i = 0; i < N; i++) {
      const k1 = f(y);
      const k2 = f(y + (h / 2) * k1);
      const k3 = f(y + (h / 2) * k2);
      const k4 = f(y + h * k3);
      y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    }
    return y;
  },
  'cd-ocpd-time': byKey,
  'cd-bldg-lvhv': byKey,
  'cd-lps-fact': byKey,

  // 표 212.3-1 퓨즈(gG): 구간별 [상한 A, 불용단 배수, 용단 배수]
  'cd-fuse-trip': (p) => {
    const rows = [
      [4, 1.5, 2.1],
      [15.999, 1.5, 1.9],
      [Infinity, 1.25, 1.6],
    ];
    const row = rows.find((r) => p.I <= r[0]);
    return near(p.I * (p.blow ? row[2] : row[1]));
  },
  // 표 212.3-2(산업용), 표 212.3-4(주택용)
  'cd-mccb-trip': (p) => {
    const m = { 'ind-no': 1.05, 'ind-op': 1.3, 'home-no': 1.13, 'home-op': 1.45 }[p.kind];
    return near(p.I * m);
  },
  // 표 212.3-3 순시트립 범위
  'cd-mccb-inst': (p) => {
    const r = { B: [3, 5], C: [5, 10], D: [10, 20] }[p.type];
    return p.In * (p.hi ? r[1] : r[0]);
  },
  // 표 333.23-1(35 kV 이하) + 333.23의 1 다(35 kV 초과: 10 kV 또는 그 단수마다 0.15 m)
  'cd-bldg-ehv': (p) => {
    const base = { 'ins/top-up': 2.5, 'ins/top-side': 1.5, 'cable/top-up': 1.2, 'cable/top-side': 0.5, 'bare/top-up': 3 }[p.wire + '/' + p.part];
    let steps = 0;
    while (35 + steps * 10 < p.V - 1e-9) steps++;
    return near(base + (p.V > 35 ? steps * 0.15 : 0));
  },
  // 152.2의 2 나: 병렬 인하도선 최대 간격, 인하도선은 최소 2가닥
  'cd-downcond': (p) => {
    const d = { I: 10, II: 10, III: 15, IV: 20 }[p.grade];
    let n = 1;
    while (n * d < p.L - 1e-9) n++;
    return Math.max(2, n);
  },
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
