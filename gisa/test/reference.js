// 독립 검산기: 템플릿 코드와 따로, 교과서 공식으로 정답을 다시 계산한다.
// 숫자형은 숫자를, 수식형은 s → 값 함수를 돌려준다.
const SQ3 = Math.sqrt(3);
const PI = Math.PI;
const MU0 = 4 * Math.PI * 1e-7;
const K9 = 9e9; // 1/(4πε₀) 시험용 근사값
const EPS_FROM_K = 1 / (4 * Math.PI * 9e9); // 위 근사와 일관된 ε₀
const hyp = (a, b) => Math.sqrt(a * a + b * b);
const fact = (k) => {
  let x = 1;
  for (let i = 2; i <= k; i++) x *= i;
  return x;
};


// 다항식의 근(Durand-Kerner). coefs = [최고차 계수, …, 상수항], 돌려주는 값은 [[실수부, 허수부], …]
function roots(c) {
  const n = c.length - 1;
  const lead = c[0];
  const co = c.map((x) => x / lead);
  let z = [];
  for (let i = 0; i < n; i++) z.push([Math.cos((2 * PI * i) / n + 0.4) * 1.3, Math.sin((2 * PI * i) / n + 0.4) * 1.3]);
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const div = (a, b) => {
    const d = b[0] * b[0] + b[1] * b[1];
    return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
  };
  const evalP = (x) => {
    let r = [1, 0];
    for (let i = 1; i <= n; i++) r = [mul(r, x)[0] + co[i], mul(r, x)[1]];
    return r;
  };
  for (let it = 0; it < 500; it++) {
    const next = z.map((zi, i) => {
      let den = [1, 0];
      for (let j = 0; j < n; j++) if (j !== i) den = mul(den, sub(zi, z[j]));
      return sub(zi, div(evalP(zi), den));
    });
    z = next;
  }
  return z;
}
const countRHP = (c) => roots(c).filter((r) => r[0] > 1e-7).length;

module.exports = {
  'ohm-current': (p) => p.V / p.R,
  'ohm-voltage': (p) => p.I * p.R,
  'ohm-resistance': (p) => p.V / (p.ImA * 1e-3),
  'series-total': (p) => p.Rs.reduce((a, b) => a + b, 0),
  'series-current': (p) => p.V / p.Rs.reduce((a, b) => a + b, 0),
  'parallel-two': (p) => 1 / (1 / p.R1 + 1 / p.R2),
  'parallel-three': (p) => 1 / p.Rs.reduce((a, r) => a + 1 / r, 0),
  'parallel-current': (p) => p.V * (1 / p.R1 + 1 / p.R2),
  'divider-two': (p) => (p.V / (p.R1 + p.R2)) * p.R2,
  'divider-three': (p) => (p.V / p.Rs.reduce((a, b) => a + b, 0)) * p.Rs[1],
  'power-i2r': (p) => p.I * p.I * p.R,
  'power-v2r': (p) => (p.V * p.V) / p.R,
  'power-ratio': (p) => {
    // 기준 V=10, R=5 회로에서 실제로 바꿔 보고 비율을 잰다
    const V0 = 10, R0 = 5, I0 = V0 / R0, P0 = V0 * I0;
    if (p.mode === 'V') return ((p.k * V0) ** 2 / R0) / P0;
    if (p.mode === 'I') return ((p.k * I0) ** 2 * R0) / P0;
    if (p.mode === 'R-constV') return (V0 ** 2 / (p.k * R0)) / P0;
    return (I0 ** 2 * (p.k * R0)) / P0;
  },
  'energy-kwh': (p) => (p.P * p.h * p.days) / 1000,
  'energy-cost': (p) => ((p.P * p.h * p.days) / 1000) * p.price,
  'energy-joule': (p) => (p.W * 1000 * 3600) / 1e6,
  'tp-power': (p) => (SQ3 * p.V * p.I * p.pf) / 1000,
  'tp-current': (p) => (p.PkW * 1000) / (SQ3 * p.V * p.pf),
  'ac-rms': (p) => (p.X * Math.SQRT2) / Math.SQRT2,
  'ac-average': (p) => {
    // 반주기 평균을 수치 적분으로
    const N = 20000;
    let s = 0;
    for (let i = 0; i < N; i++) s += p.Vm * Math.sin(((i + 0.5) / N) * PI);
    return s / N;
  },
  'ac-period': (p) => (p.mode === 'f2T' ? 1000 / p.f : 1 / (p.Tms / 1000)),
  'ac-omega': (p) => (2 * p.f * PI) / (2 * PI),
  'rlc-rl': (p) => hyp(p.R, p.X),
  'rlc-series': (p) => hyp(p.R, p.XL - p.XC),
  'rlc-omega': (p) => hyp(p.R, p.w * (p.LmH / 1000) - 1 / (p.w * (p.CuF / 1e6))),
  'rlc-current': (p) => p.V / hyp(p.R, p.X),
  'acp-active': (p) => p.V * p.I * p.pf,
  'acp-reactive': (p) => p.V * p.I * Math.sin(Math.acos(p.pf)),
  'acp-apparent': (p) => hyp(p.P, p.Q),
  'acp-pf': (p) => Math.cos(Math.atan2(p.X, p.R)),
  'acp-q-from-p': (p) => p.P * Math.tan(Math.acos(p.pf)),
  'res-omega': (p) => 1 / Math.sqrt((p.LmH / 1000) * (p.CuF / 1e6)),
  'res-f0': (p) => 1 / (2 * PI * Math.sqrt((p.LmH / 1000) * (p.CuF / 1e6))),
  'res-current': (p) => p.V / hyp(p.R, p.X - p.X),
  'res-scale': (p) => {
    const L0 = 0.01, C0 = 1e-6;
    const f = (L, C) => 1 / (2 * PI * Math.sqrt(L * C));
    const L1 = p.up ? L0 * p.a : L0 / p.a;
    const C1 = p.up ? C0 * p.b : C0 / p.b;
    return f(L1, C1) / f(L0, C0);
  },
  'res-q': (p) => {
    const L = p.LmH / 1000, C = p.CuF / 1e6;
    const w0 = 1 / Math.sqrt(L * C);
    return (w0 * L) / p.R;
  },
  'yd-voltage': (p) => (p.mode === 'p2l' ? SQ3 * p.Vp : p.VL / SQ3),
  'yd-current': (p) => (p.mode === 'p2l' ? SQ3 * p.Ip : p.IL / SQ3),
  'yd-load': (p) => (p.type === 'Y' ? p.VL / SQ3 / p.Z : (SQ3 * p.VL) / p.Z),
  'yd-convert': (p) => (p.mode === 'D2Y' ? p.Z / 3 : p.Z * 3),
  'lp-power': (p) => (s) => (p.K * fact(p.k)) / Math.pow(s, p.k + 1),
  'lp-exp': (p) => (s) => p.K / (s + p.a),
  'lp-trig': (p) => (s) => (p.fn === 'sin' ? (p.K * p.w) / (s * s + p.w * p.w) : (p.K * s) / (s * s + p.w * p.w)),
  'lp-final': (p) => {
    const sF = (s) => (s * (p.K * s + p.b)) / (s * (s + p.a));
    return p.ask === 'final' ? sF(1e-9) : sF(1e9);
  },
  'tf-rc': (p) => (s) => {
    const R = p.RkO * 1000, Zc = 1 / ((p.CuF / 1e6) * s);
    return p.out === 'C' ? Zc / (R + Zc) : R / (R + Zc);
  },
  'tf-rl': (p) => (s) => {
    const ZL = (p.LmH / 1000) * s;
    return p.out === 'R' ? p.R / (p.R + ZL) : ZL / (p.R + ZL);
  },
  'tf-feedback': (p) => p.K / (1 + p.K * p.h),
  'tf-feedback-s': (p) => (s) => {
    const Gs = p.K / (s + p.a);
    return Gs / (1 + Gs);
  },
  'tf-standard': (p) => (p.ask === 'T' ? p.c / p.d : p.b / p.d),

  // ───── 기초 수학 ─────
  'base-prefix': (p) => {
    const E = { G: 1e9, M: 1e6, k: 1e3, '': 1, m: 1e-3, μ: 1e-6, n: 1e-9, p: 1e-12 };
    return (p.v * E[p.from]) / E[p.to];
  },
  'base-trig': (p) => {
    const th = Math.acos(p.a / p.c);
    return p.ask === 'tan' ? Math.tan(th) : Math.sin(th);
  },
  'base-pythag': (p) => (p.ask === 'c' ? Math.hypot(p.a, p.b) : Math.sqrt(p.c ** 2 - p.a ** 2)),
  'base-ratio': (p) => {
    const A = (B, C) => B ** p.pa / C ** p.pb;
    return A(p.m, p.k) / A(1, 1);
  },

  // ───── 전기자기학 (ε₀ 정의값 기반 상수로 다시 계산) ─────
  'em-coulomb-force': (p) => (K9 * p.Q1 * 1e-6 * p.Q2 * 1e-6) / p.d ** 2,
  'em-coulomb-ratio': (p) => (p.a * 1) / (p.b ** 2),
  'em-point': (p) => (p.ask === 'E' ? (K9 * p.Q * 1e-9) / p.d ** 2 : (K9 * p.Q * 1e-9) / p.d),
  'em-line': (p) => (p.lam * 1e-9) / (2 * PI * EPS_FROM_K) / p.d,
  'em-cap-scale': (p) => (p.e * p.a) / p.b,
  'em-cap-plate': (p) => ((8.855e-12 * p.es * p.S) / (p.dmm / 1000)) * 1e12,
  'em-cap-combo': (p) => (p.how === 'series' ? 1 / (1 / p.C1 + 1 / p.C2) : p.C1 + p.C2),
  'em-cap-energy': (p) => 0.5 * (p.CuF * 1e-6) * p.V ** 2,
  'em-mag-wire': (p) => p.I / (2 * PI * p.d),
  'em-mag-coil': (p) => (p.N * p.I) / (2 * p.a),
  'em-mag-solenoid': (p) => (p.kind === 'toroid' ? (p.N * p.I) / (2 * PI * p.r) : (p.N / p.len) * p.I),
  'em-force-bil': (p) => p.B * p.I * p.l * Math.sin((p.th * PI) / 180),
  'em-force-parallel': (p) => (MU0 * p.I1 * p.I2) / (2 * PI * p.d),
  'em-faraday': (p) => (p.N * p.dP) / p.dt,
  'em-motional': (p) => p.B * p.l * p.v * Math.sin((p.th * PI) / 180),
  'em-ind-energy': (p) => 0.5 * (p.LmH / 1000) * p.I ** 2,
  'em-ind-self': (p) => ((p.N * p.PmWb * 1e-3) / p.I) * 1000,
  'em-ind-mutual': (p) => p.k * Math.sqrt(p.L1 * p.L2),
  'em-ind-series': (p) => p.L1 + p.L2 + (p.aid ? 2 : -2) * p.M,
  'em-mc-flux': (p) => ((p.N * p.I) / p.Rm) * 1000,
  'em-mc-scale': (p) => p.a / (p.b * p.c),

  // ───── 전력공학 ─────
  'pw-vdrop-3ph': (p) => {
    const s = Math.sqrt(1 - p.pf ** 2);
    const e = SQ3 * p.I * (p.R * p.pf + p.X * s);
    return p.ask === 'Vs' ? p.Vr + e : e;
  },
  'pw-vdrop-rate': (p) => ((p.Vs - p.Vr) / p.Vr) * 100,
  'pw-loss-3i2r': (p) => 3 * p.I ** 2 * p.R,
  'pw-loss-power': (p) => {
    const I = (p.PkW * 1000) / (SQ3 * p.VkV * 1000 * p.pf);
    return (3 * I * I * p.R) / 1000;
  },
  'pw-loss-ratio': (p) => {
    const loss = (P, V, pf) => (P * P) / (V * V * pf * pf);
    return p.mode === 'V' ? loss(1, p.k, 1) / loss(1, 1, 1) : loss(1, 1, p.b) / loss(1, 1, p.a);
  },
  'pw-short-current': (p) => p.In / (p.z / 100),
  'pw-short-capacity': (p) => p.Pn / (p.z / 100),
  'pw-pctz-calc': (p) => {
    // 정의로 계산: %Z = In·Z / E × 100
    const In = (p.P * 1000) / (SQ3 * p.V * 1000);
    const E = (p.V * 1000) / SQ3;
    return ((In * p.Z) / E) * 100;
  },
  'pw-pfc': (p) => p.P * (Math.tan(Math.acos(p.a)) - Math.tan(Math.acos(p.b))),
  'pw-sag-d': (p) => (p.W * p.S ** 2) / (8 * p.T),
  'pw-sag-len': (p) => (8 * p.D ** 2) / (3 * p.S),
  'pw-gmd': (p) => Math.cbrt(p.D1 * p.D2 * p.D3),
  'pw-line-lc': (p) => {
    const lg = Math.log10((p.Dm * 100) / p.rcm);
    return p.ask === 'L' ? 0.05 + 0.4605 * lg : 0.02413 / lg;
  },
  'pw-hydro': (p) => 9.8 * p.Q * p.H * p.eta,
  'pw-thermal': (p) => ((p.W * 860) / (p.m * p.H)) * 100,
  'pw-transformer-cap': (p) => p.loads.reduce((a, l) => a + l[0] * l[1], 0) / (p.div * p.pf),
  'pw-rates': (p) => (p.mode === 'demand' ? (p.Pm / p.Pi) * 100 : (p.Wd / 24 / p.Pm) * 100),

  // ───── 전기기기 ─────
  'mc-dc-emf': (p) => (p.p * p.Z * p.phi * (p.N / 60)) / p.a,
  'mc-dc-terminal': (p) => p.V0 - p.Ia * p.Ra,
  'mc-dc-torque': (p) => (p.PkW * 1000) / ((2 * PI * p.N) / 60),
  'mc-dc-speed': (p) => p.N1 * ((p.V - p.I2 * p.Ra) / (p.V - p.I1 * p.Ra)),
  'mc-tr-ratio': (p) => {
    const a = p.N1 / p.N2;
    return p.mode === 'V' ? p.x / a : p.mode === 'I' ? p.x / a : a * a * p.x;
  },
  'mc-tr-eff': (p) => {
    const out = p.m * p.S * p.pf;
    return (out / (out + p.Pi + p.m ** 2 * p.Pc)) * 100;
  },
  'mc-tr-maxeff': (p) => Math.sqrt(p.Pi / p.Pc) * 100,
  'mc-tr-reg': (p) => p.p * p.pf + p.q * Math.sqrt(1 - p.pf ** 2),
  'mc-im-slip': (p) => {
    const Ns = (120 * p.f) / p.P;
    return ((Ns - p.N) / Ns) * 100;
  },
  'mc-im-speed': (p) => ((120 * p.f) / p.P) * (1 - p.s / 100),
  'mc-im-power': (p) => (p.mode === 'P2' ? p.x / (1 - p.s) : p.mode === 'Pc' ? p.s * p.x : (1 - p.s) * p.x),
  'mc-im-torque-v': (p) => p.k ** 2,
  'mc-sync-speed': (p) => (120 * p.f) / p.P,
  'mc-sync-power': (p) => (3 * p.E * p.V * Math.sin((p.d * PI) / 180)) / p.Xs / 1000,
  'mc-sync-scr': (p) => (p.mode === 'z' ? 1 / (p.z / 100) : p.If1 / p.If2),
  'mc-rect': (p) => {
    // 정류 출력을 수치 적분으로 평균 (이상 다이오드, 저항 부하)
    const N = 60000;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const th = ((i + 0.5) / N) * 2 * PI;
      const vm = Math.SQRT2 * p.E;
      let v;
      if (p.type === 'h1') v = Math.max(0, vm * Math.sin(th));
      else if (p.type === 'f1') v = Math.abs(vm * Math.sin(th));
      else if (p.type === 'h3') v = Math.max(...[0, 1, 2].map((k) => vm * Math.sin(th - (2 * PI * k) / 3)));
      else {
        const ph = [0, 1, 2].map((k) => (vm / SQ3) * Math.sin(th - (2 * PI * k) / 3)); // 선간 E → 상전압 최댓값 √2E/√3
        v = Math.max(...ph) - Math.min(...ph);
      }
      sum += v;
    }
    return sum / N;
  },

  // ───────── 기출 빈출 보강 1차 (독립 검산기) ─────────
  'pw-breaker-current': (p) => p.Ps / (SQ3 * p.V),
  'pw-breaker-capacity': (p) => SQ3 * p.V * p.I,
  // 소호리액터: 병렬공진 조건 ωL = 1/(3ωC) 에서 L
  'pw-petersen': (p) => {
    const w = 2 * PI * p.f;
    const Xc3 = 1 / (w * 3 * p.C * 1e-6); // 세 선 정전용량 합의 리액턴스
    return Xc3 / w;
  },
  // 1선 지락(a상): 건전상 b, c의 대지전압은 a상과의 전위차(선간전압), 각 충전전류 I = jωC·v 를 벡터로 더한다
  'pw-ground-current': (p) => {
    const wC = 2 * PI * p.f * p.C * 1e-6;
    const E = (p.V * 1000) / SQ3;
    const ph = (ang) => [E * Math.cos(ang), E * Math.sin(ang)];
    const Va = ph(0);
    const Vb = ph((-2 * PI) / 3);
    const Vc = ph((2 * PI) / 3);
    const vb = [Vb[0] - Va[0], Vb[1] - Va[1]];
    const vc = [Vc[0] - Va[0], Vc[1] - Va[1]];
    const I = [-wC * (vb[1] + vc[1]), wC * (vb[0] + vc[0])];
    return Math.hypot(I[0], I[1]);
  },
  // 송전 전력: 페이저로 I = (Es − Er)/(jX), P = 3·Re(Er·conj(I))
  'pw-power-transfer': (p) => {
    const d = (p.d * PI) / 180;
    const Esr = (p.Vs / SQ3) * Math.cos(d);
    const Esi = (p.Vs / SQ3) * Math.sin(d);
    const Er = p.Vr / SQ3;
    const a = Esr - Er;
    const b = Esi;
    const Ir = b / p.X;
    return 3 * Er * Ir; // Er는 실수라서 Re(Er·conj(I)) = Er·Re(I)
  },
  'pw-charging': (p) => {
    const w = 2 * PI * p.f;
    const E = (p.V * 1000) / SQ3;
    const Ic = w * p.C * 1e-6 * E;
    return p.mode === 'Ic' ? Ic : (3 * E * Ic) / 1000; // kvar
  },
  // 루스 판별: 근을 직접 구해(Durand-Kerner) 실수부가 양수인 근을 센다
  'cs-routh-count': (p) => countRHP([1, p.a, p.b, p.c, p.d]),
  // 안정 한계 K: K를 키워 가며 가장 오른쪽 근의 실수부가 0이 되는 지점을 이분법으로 찾는다
  'cs-kmax': (p) => {
    const maxRe = (K) => Math.max(...roots([1, p.a + p.b, p.a * p.b, K]).map((z) => z[0]));
    let lo = 0;
    let hi = 10 * p.a * p.b * (p.a + p.b) + 10;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (maxRe(mid) < 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  },
  // 최대 오버슈트: 계단응답 y(t)를 직접 계산해 최댓값을 찾는다 (ωn = 1로 정규화)
  'cs-overshoot': (p) => {
    const z = p.useTf ? p.a / (2 * Math.sqrt(p.K)) : p.z;
    const wd = Math.sqrt(1 - z * z);
    const phi = Math.acos(z);
    const y = (t) => 1 - (Math.exp(-z * t) / wd) * Math.sin(wd * t + phi);
    let best = 0;
    const T = (8 * PI) / wd;
    const N = 4000;
    for (let i = 1; i <= N; i++) best = Math.max(best, y((T * i) / N));
    // 극값 주변 정밀화(황금분할)
    let tPk = PI / wd;
    let a = tPk - 0.01;
    let b = tPk + 0.01;
    for (let i = 0; i < 100; i++) {
      const c1 = b - (b - a) / 1.618033988749895;
      const c2 = a + (b - a) / 1.618033988749895;
      if (y(c1) > y(c2)) b = c2;
      else a = c1;
    }
    best = Math.max(best, y((a + b) / 2));
    return (best - 1) * 100;
  },
  // 감쇠비: 극점 위치에서 ζ = −Re(p)/|p|
  'cs-damping': (p) => {
    const D = p.a * p.a - 4 * p.K;
    const re = -p.a / 2;
    const im = D < 0 ? Math.sqrt(-D) / 2 : 0;
    return -re / Math.hypot(re, im);
  },
  // 위상제어 평균 출력: 전원 파형을 직접 적분
  'mc-thyristor': (p) => {
    const al = (p.alpha * PI) / 180;
    const vm = Math.SQRT2 * p.E;
    const integ = (f, a, b) => {
      const N = 20000;
      const h = (b - a) / N;
      let s = f(a) + f(b);
      for (let i = 1; i < N; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
      return (s * h) / 3;
    };
    const sin = (t) => vm * Math.sin(t);
    if (p.type === 'half-R') return integ(sin, al, PI) / (2 * PI);
    if (p.type === 'full-R') return integ(sin, al, PI) / PI;
    return integ(sin, al, PI + al) / PI; // 전류가 끊어지지 않는 유도성 부하
  },
  // 단권변압기: 직렬 권선의 전압 × 직렬 권선의 전류 (= 자기용량)
  'mc-autotr': (p) => {
    const Vh = Math.max(p.V1, p.V2);
    const Vl = Math.min(p.V1, p.V2);
    const Ih = p.S / Vh; // 높은 쪽 선로 전류 = 직렬 권선 전류
    return (Vh - Vl) * Ih;
  },
  // 병렬운전: 두 대의 전압강하(pu)가 같다는 조건과 부하 합 조건을 연립
  'mc-tr-parallel': (p) => {
    // P1·z1/S1 = P2·z2/S2,  P1 + P2 = P
    const k1 = p.z1 / p.S1;
    const k2 = p.z2 / p.S2;
    return (p.P * k2) / (k1 + k2);
  },
  'em-wave-impedance': (p) => 120 * PI * Math.sqrt(p.ur / p.er),
  'em-wave-speed': (p) => {
    const v = 3e8 / Math.sqrt(p.er * p.ur);
    return p.mode === 'v' ? v / 1e8 : v / (p.f * 1e6);
  },
};
Object.assign(module.exports, require('./reference-code'));
