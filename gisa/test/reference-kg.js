// 기출 분석 보강 문제의 독립 검산기(템플릿 식과 다른 방법으로 다시 계산)
'use strict';
const PI = Math.PI;
const EPS = 8.855e-12;
const rad = (d) => (d * PI) / 180;
const mean = (N, f) => {
  let s = 0;
  for (let i = 0; i < N; i++) s += f(((i + 0.5) / N) * 2 * PI);
  return s / N;
};
const C = {
  mul: (u, v) => [u[0] * v[0] - u[1] * v[1], u[0] * v[1] + u[1] * v[0]],
  div: (u, v) => {
    const d = v[0] * v[0] + v[1] * v[1];
    return [(u[0] * v[0] + u[1] * v[1]) / d, (u[1] * v[0] - u[0] * v[1]) / d];
  },
  abs: (u) => Math.hypot(u[0], u[1]),
  cis: (d) => [Math.cos((d * PI) / 180), Math.sin((d * PI) / 180)],
  add: (...us) => us.reduce((s, u) => [s[0] + u[0], s[1] + u[1]], [0, 0]),
};


// 다항식의 근(Durand-Kerner). coefs = [최고차, …, 상수]
function polyRoots(c) {
  const nn = c.length - 1;
  const co = c.map((x) => x / c[0]);
  let z = [];
  for (let i = 0; i < nn; i++) z.push([Math.cos((2 * PI * i) / nn + 0.4) * 2, Math.sin((2 * PI * i) / nn + 0.4) * 2]);
  const evalP = (x) => {
    let r = [1, 0];
    for (let i = 1; i < co.length; i++) {
      r = C.mul(r, x);
      r = [r[0] + co[i], r[1]];
    }
    return r;
  };
  for (let it = 0; it < 500; it++) {
    z = z.map((zi, i) => {
      let den = [1, 0];
      z.forEach((zj, j) => {
        if (i !== j) den = C.mul(den, [zi[0] - zj[0], zi[1] - zj[1]]);
      });
      const d = C.div(evalP(zi), den);
      return [zi[0] - d[0], zi[1] - d[1]];
    });
  }
  return z;
}
// K 에 따라 안정 ⇔ 모든 근의 실수부 < 0. 안정해지는 경계(이분법)를 찾는다.
function stableBoundary(coefsOf, lo, hi) {
  const stable = (K) => polyRoots(coefsOf(K)).every((r) => r[0] < -1e-9);
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (stable(mid)) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

module.exports = {
  // 정류 파형을 한 주기 직접 적분
  'ba-wave': (p) => {
    const N = 200000;
    const f = (w) => (p.half ? Math.max(0, p.Im * Math.sin(w)) : Math.abs(p.Im * Math.sin(w)));
    return p.rms ? Math.sqrt(mean(N, (w) => f(w) ** 2)) : mean(N, f);
  },
  // 복소 임피던스로 전류 최대값
  'ba-ci': (p) => {
    const w = 2 * PI * p.f;
    const Z = p.isC ? [0, -1 / (w * p.C * 1e-6)] : [0, w * p.L];
    return C.abs(C.div([p.Vm, 0], Z));
  },
  // 시간 영역에서 ½Li² 의 평균
  'ba-energy': (p) => {
    const L = p.LmH / 1000;
    const I = p.E / Math.hypot(0, 2 * PI * p.f * L);
    return mean(7200, (w) => 0.5 * L * (Math.SQRT2 * I * Math.sin(w)) ** 2);
  },
  // 고조파마다 복소 임피던스, 전력은 v(t)·i(t) 평균
  'ns-rl': (p) => {
    const comps = [[1, p.V1], [3, p.V3]].concat(p.V5 ? [[5, p.V5]] : []);
    const Zk = (k) => [p.R, k * p.X];
    if (!p.askP) {
      const Vk = p.k === 3 ? p.V3 : p.V5;
      return C.abs(C.div([Vk, 0], Zk(p.k)));
    }
    return mean(7200, (w) => {
      let v = 0;
      let i = 0;
      comps.forEach(([k, V]) => {
        const z = Zk(k);
        v += Math.SQRT2 * V * Math.sin(k * w);
        i += Math.SQRT2 * (V / C.abs(z)) * Math.sin(k * w - Math.atan2(z[1], z[0]));
      });
      return v * i;
    });
  },
  // 가지마다 (기전력, 저항)을 두고 마디 전압법으로 푼다
  'ohm-cells': (p) => {
    const Eb = (p.k ? p.k : 1) * (p.E0 || 0);
    const rb = p.k * p.r0;
    if (p.askR) return 1 / Array.from({ length: p.m }).reduce((s) => s + 1 / rb, 0);
    const g = p.m / rb;
    const Vn = ((p.m * Eb) / rb) / (g + 1 / p.R);
    return Vn / p.R;
  },
  'pa-susc': (p) => {
    const w = 2 * PI * p.f;
    const Y = p.isL ? C.div([1, 0], [0, w * (p.LmH / 1000)]) : [0, w * p.CuF * 1e-6];
    return Math.abs(Y[1]) * 1000;
  },
  // 주파수를 훑어 전류가 최대인 곳을 직접 찾는다
  'rs-vmax': (p) => {
    const L = p.LmH / 1000;
    const Cc = p.CuF * 1e-6;
    const cur = (w) => p.V / C.abs([p.R, w * L - 1 / (w * Cc)]);
    let lo = 1;
    let hi = 1e6;
    for (let i = 0; i < 400; i++) {
      const a = lo + (hi - lo) / 3;
      const b = hi - (hi - lo) / 3;
      if (cur(a) < cur(b)) lo = a;
      else hi = b;
    }
    const w = (lo + hi) / 2;
    return p.askI ? cur(w) : cur(w) * w * L;
  },
  // 각도 θ = atan(√3(P2−P1)/(P1+P2)) 로 돌려서 구한다
  'acp-2w': (p) => {
    const P = p.P1 + p.P2;
    const th = Math.atan2(Math.sqrt(3) * (p.P2 - p.P1), P);
    const S = P / Math.cos(th);
    if (p.ask === 'pf') return Math.cos(th);
    if (p.ask === 'S') return S;
    return S * Math.sin(th);
  },
  'acp-cplx': (p) => {
    const V = [p.a, p.b];
    const I = C.div(V, [p.R, p.X]);
    const S = C.mul(V, [I[0], -I[1]]);
    return p.askP ? S[0] : C.abs(S);
  },
  // n상 전압 벡터를 만들어 두 상의 차(선간)를 직접 구한다
  'yd-nphase': (p) => {
    const v0 = C.cis(0);
    const v1 = C.cis(-360 / p.N);
    const line = [v0[0] - v1[0], v0[1] - v1[1]];
    const ang = (Math.atan2(line[1], line[0]) * 180) / PI;
    return p.askAng ? ang : C.abs(line);
  },
  'sc-cur': (p) => {
    const a = C.cis(120);
    const a2 = C.mul(a, a);
    const comp = {
      0: C.add(p.Ia, p.Ib, p.Ic),
      1: C.add(p.Ia, C.mul(a, p.Ib), C.mul(a2, p.Ic)),
      2: C.add(p.Ia, C.mul(a2, p.Ib), C.mul(a, p.Ic)),
    }[p.which];
    return C.abs(comp) / 3;
  },

  'rh-k3': (p) => stableBoundary((K) => [1, p.a, K + p.d, p.c], 0.0001 - p.d, 1000),
  'rh-k2': (p) => stableBoundary((K) => [1, K, p.b * K - p.c0], 0.0001, 1000),
  'tf-dc': (p) => p.N / (1e-12 * 1e-12 + p.c), // s → 0 의 값(분모 상수항)
  'tf-char': (p) => {
    const mulPoly = (a, b) => {
      const o = Array(a.length + b.length - 1).fill(0);
      a.forEach((x, i) => b.forEach((y, j) => (o[i + j] += x * y)));
      return o;
    };
    const den = mulPoly([1, p.p1], [1, p.p2]); // s² + (p1+p2)s + p1p2
    const num = [0, 1, p.z]; // s + z (2차 자리 맞춤)
    const ch = den.map((x, i) => x + num[i]);
    return p.askS ? ch[1] : ch[2];
  },
  'bd-gain': (p) => {
    const G = p.diff ? [0, p.K * p.w] : C.div([1, 0], [0, p.K * p.w]);
    return 20 * Math.log10(C.abs(G));
  },
  'bd-corner': (p) => {
    // |G(jω)| = 1/√2 이 되는 ω 를 이분법으로 찾는다
    let lo = 1e-6;
    let hi = 1e6;
    for (let i = 0; i < 300; i++) {
      const mid = Math.sqrt(lo * hi);
      const mag = 1 / C.abs([1, mid * p.Tt]);
      if (mag > 1 / Math.SQRT2) lo = mid;
      else hi = mid;
    }
    return Math.sqrt(lo * hi);
  },
  'fp-image': (p) => {
    // B = 1 로 두고 C 를 AD − BC = 1 에서 만든 뒤 두 영상 임피던스의 비를 직접 구한다
    const B = 1;
    const Cc = (p.A * p.D - 1) / B;
    const z01 = Math.sqrt((p.A * B) / (Cc * p.D));
    const z02 = Math.sqrt((p.D * B) / (Cc * p.A));
    return p.Z02 * (z01 / z02);
  },
  'fp-theta': (p) => Math.acosh(p.A),
  'fp-c': (p) => {
    const ad = C.mul([p.Ar, 0], [p.Dr, p.Di]);
    const num = [ad[0] - 1, ad[1]];
    return C.abs(C.div(num, [p.Br, p.Bi]));
  },
  // 위상 조건 arg(R + jωL) = arg(G + jωC) 에서 맞추기
  'tx-g': (p) => {
    const w = 1000;
    if (p.askG) {
      const R = p.R;
      const L = p.L * 1e-6;
      const Cc = p.Cc * 1e-6;
      const th = Math.atan2(w * L, R);
      return (w * Cc) / Math.tan(th);
    }
    const th = Math.atan2(w * (p.Lm / 1000), p.Rr);
    return ((p.Gg * Math.tan(th)) / w) * 1e6;
  },
  'tx-i': (p) => {
    const w = 1e5;
    const Z = C.div([0, w * p.Lu * 1e-6], [0, w * p.Cu * 1e-6]); // jωL/(jωC) 의 제곱근
    return p.V / Math.sqrt(Z[0]);
  },
  // 기본파를 뺀 나머지의 실효값 ÷ 기본파의 실효값
  'ns-thdp': (p) => {
    const comps = p.usePct ? [[3, p.p3 / 100], [5, p.p5 / 100]] : [[2, p.A2 / p.A1], [3, p.A3 / p.A1], [4, p.A4 / p.A1]];
    const rmsRest = Math.sqrt(mean(7200, (w) => comps.reduce((s, [k, a]) => s + a * Math.sin(k * w), 0) ** 2));
    const rmsFund = Math.sqrt(mean(7200, (w) => Math.sin(w) ** 2));
    return rmsRest / rmsFund;
  },
  'ns-rlp': (p) => C.abs(C.div([p.Ak / Math.SQRT2, 0], [p.R, p.k * p.X])),
  'sc-unbal': (p) => {
    const a = C.cis(120);
    const a2 = C.mul(a, a);
    const V0 = [p.V0, 0];
    const V1 = [p.V1, 0];
    const V2 = [p.V2, 0];
    const Va = C.add(V0, V1, V2);
    const Vb = C.add(V0, C.mul(a2, V1), C.mul(a, V2));
    const Vc = C.add(V0, C.mul(a, V1), C.mul(a2, V2));
    const r1 = C.abs(C.add(Va, C.mul(a, Vb), C.mul(a2, Vc))) / 3;
    const r2 = C.abs(C.add(Va, C.mul(a2, Vb), C.mul(a, Vc))) / 3;
    return (r2 / r1) * 100;
  },
  // 단계 응답 i(τ) = 0.632 I∞ 가 되는 L 을 이분법으로
  'tr-inv': (p) => {
    let lo = 1e-9;
    let hi = 1e3;
    for (let i = 0; i < 300; i++) {
      const mid = Math.sqrt(lo * hi);
      const frac = 1 - Math.exp(-(p.R * p.tau) / mid); // t = τ 에서 진행률
      if (frac < 1 - Math.exp(-1)) hi = mid;
      else lo = mid;
    }
    return Math.sqrt(lo * hi) * 1000;
  },
  'tr-sol': (p) => {
    const L = (p.N * p.phi) / p.I;
    let lo = 1e-9;
    let hi = 1e3;
    for (let i = 0; i < 300; i++) {
      const t = Math.sqrt(lo * hi);
      const frac = 1 - Math.exp(-(p.R * t) / L);
      if (frac < 1 - Math.exp(-1)) lo = t;
      else hi = t;
    }
    return Math.sqrt(lo * hi);
  },
  'tr-phase': (p) => {
    // 과도항의 계수 sin(α − θ) 가 0 이 되는 α (0~90°)를 이분법으로 찾는다
    const th = Math.atan2(p.X, p.R);
    let lo = 0;
    let hi = 90;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (Math.sin(rad(mid) - th) < 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  },

  // ───────── 전기자기학 ─────────
  'cb-eps': (p) => {
    // 같은 전하·거리에서 F 는 1/ε 에 비례 → 힘의 비가 곧 유전율 비
    return p.F0 / p.F1;
  },
  'cb-pot': (p) => {
    const f1 = p.A / p.r1 + p.B;
    const f2 = p.A / p.r2 + p.B;
    // V = a·(1/r) + b 를 두 점으로 연립(크래머 공식)
    const det = 1 / p.r1 - 1 / p.r2;
    const a = (f1 - f2) / det;
    const b = f1 - a / p.r1;
    return a / p.r3 + b;
  },
  'cb-sq': (p) => {
    const R = p.R;
    const k = 1 / (4 * PI * (1 / (4 * PI * 9e9)));
    let v = 0;
    [[R, 0], [0, R], [-R, 0], [0, -R]].forEach(([x, y]) => (v += (k * p.Qn * 1e-9) / Math.hypot(x, y)));
    return v;
  },
  'cb-tri': (p) => {
    const Q = p.Qu * 1e-6;
    const pts = [[0, 0], [p.a, 0], [p.a / 2, (p.a * Math.sqrt(3)) / 2]];
    let fx = 0;
    let fy = 0;
    [1, 2].forEach((i) => {
      const dx = pts[0][0] - pts[i][0];
      const dy = pts[0][1] - pts[i][1];
      const d = Math.hypot(dx, dy);
      const f = (9e9 * Q * Q) / (d * d);
      fx += (f * dx) / d;
      fy += (f * dy) / d;
    });
    return Math.hypot(fx, fy);
  },
  'cb-wpair': (p) => {
    // 계 전체의 에너지 = ½ Σ qᵢ Vᵢ
    const a = p.q1 * 1e-9;
    const b = p.q2 * 1e-9;
    return 0.5 * (a * ((9e9 * b) / p.d) + b * ((9e9 * a) / p.d)) * 1e9;
  },
  'cb-img': (p) => {
    if (p.work) {
      // 힘 F(x) = kQ²/(2x)² 를 x = d → ∞ 로 적분(u = 1/x 치환, 심프슨)
      const Q = p.Qu * 1e-6;
      const N = 2000;
      const u1 = 1 / p.d;
      const h = u1 / N;
      let s = 0;
      for (let i = 0; i <= N; i++) {
        const w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2;
        s += w * ((9e9 * Q * Q) / 4);
      }
      return (s * h) / 3;
    }
    // 구 표면 두 점(가까운 점·먼 점)의 전위 0 조건으로 영상 전하를 푼다
    const b = (p.a * p.a) / p.d;
    return Math.abs(p.Qu * (p.a - b) / (p.d - p.a));
  },
  'lz-force': (p) => {
    const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
    const M = [[0, -p.B[2], p.B[1]], [p.B[2], 0, -p.B[0]], [-p.B[1], p.B[0], 0]]; // v × B = −[B]× v
    const vB = M.map((row) => -dot(row, p.v)); // v × B = −(B × v)
    const mode = p.mode;
    const F = [0, 1, 2].map((i) => p.qq * ((mode !== 'B' ? p.E[i] : 0) + (mode !== 'E' ? vB[i] : 0)));
    return Math.hypot(...F);
  },
  'ef-rho': (p) => {
    const V = (x, y, z) => p.a * x * x * y + p.b * y * y + z;
    const h = 1;
    const x0 = 0.7;
    const z0 = -1.3;
    const d2 = (f) => f(1) - 2 * f(0) + f(-1); // h = 1 이면 2차 곱 함수에서 정확
    const lap = d2((t) => V(x0 + t * h, p.y0, z0)) + d2((t) => V(x0, p.y0 + t * h, z0)) + d2((t) => V(x0, p.y0, z0 + t * h));
    return Math.abs(lap);
  },
  'ef-plates': (p) => {
    if (p.mode === 'V') return (p.s * p.d) / EPS;
    if (p.mode === 'f1') return 0.5 * (p.sg * 1e-6) * ((p.sg * 1e-6) / EPS);
    const E = p.Vv / (p.dc / 100);
    return 0.5 * EPS * E * E;
  },
  'ef-move': (p) => p.V0 - p.E * (p.dcm / 100),
  'ef-spheres': (p) => {
    if (p.mode === 'V') {
      const Q = p.a * p.V1 + p.b * p.V2; // C ∝ 반지름
      return Q / (p.a + p.b);
    }
    if (p.mode === 'loss') {
      const C1 = 1;
      const C2 = p.k;
      const Q = 1;
      const W0 = (Q * Q) / (2 * C1);
      const W1 = (Q * Q) / (2 * (C1 + C2));
      return (W0 - W1) / W0;
    }
    return p.Q * (p.r2 / (p.r1 + p.r2));
  },
  'ef-sigma': (p) => EPS * p.E * 1e9,
  'ef-dip': (p) => {
    // 전하 ±q, 간격 ℓ 을 아주 작게(Mq = qℓ) 두고 실제 두 점전하의 전위 차로 계산
    const l = 1e-6;
    const qq = p.M / l;
    const th = (p.th * PI) / 180;
    const r1 = Math.hypot(p.rr * Math.cos(th) - l / 2, p.rr * Math.sin(th));
    const r2 = Math.hypot(p.rr * Math.cos(th) + l / 2, p.rr * Math.sin(th));
    return 9e9 * qq * (1 / r1 - 1 / r2);
  },
  'ef-accel': (p) => Math.hypot(p.m * p.ax, p.m * p.ay) / p.qq,
  'ef-divd': (p) => {
    const D = [(x) => p.a * x * x, (y) => p.b * y * y, (z) => p.c * z * z];
    const dd = (f, x0) => (f(x0 + 1) - f(x0 - 1)) / 2; // 2차식은 중앙 차분이 정확
    return dd(D[0], p.px) + dd(D[1], p.py) + dd(D[2], p.pz);
  },
  'cap-ser-lim': (p) => {
    const Ceq = 1 / p.caps.reduce((s, c) => s + 1 / c, 0);
    return Math.min(...p.caps.map((c) => (p.Vr * c) / Ceq)); // 각 콘덴서가 내압에 닿는 전체 전압 중 최소
  },
  'cap-sph': (p) => {
    const k = 1 / (4 * PI * EPS);
    if (p.kind === 'single') return (p.a / 100 / k) * 1e12;
    if (p.kind === 'two') return (1 / (k * (1 / (p.a / 100) - 1 / (p.b / 100)))) * 1e12;
    // 원통: V = ∫ λ/(2πε r) dr (a→b) 를 로그 간격 심프슨 적분
    const a = p.a / 100;
    const b = p.b / 100;
    const N = 2000;
    let s = 0;
    for (let i = 0; i <= N; i++) {
      const w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2;
      s += w; // ∫ dr/r = ∫ d(ln r)
    }
    const lnr = (s * (Math.log(b / a) / N)) / 3;
    return ((2 * PI * EPS * (p.len / 100)) / lnr) * 1e12;
  },
  'cap-glass': (p) => {
    const Cair = p.C0 / (1 - p.f);
    const Cgl = (p.C0 * p.er) / p.f;
    return 1 / (1 / Cair + 1 / Cgl);
  },
  'cap-w': (p) => (p.mode === 'W' ? 0.5 * p.Cu * 1e-6 * p.V * p.V : ((p.W / (0.5 * p.V * p.V)) * 1e6)),
  'cap-pf': (p) => {
    const E = (p.Qu * 1e-6) / (EPS * p.S);
    return 0.5 * (p.Qu * 1e-6) * E;
  },
  'cap-eps': (p) => (p.D / ((2 * p.w) / p.D)) * 1e12,
  'cap-sheets': (p) => {
    // 간격 d 를 임의로 잡아 면적 A 를 C 로 맞춘 뒤 장수 = d / t
    const d = 1e-3;
    const A = (p.Cp * 1e-12 * d) / (EPS * p.er);
    return (EPS * p.er * (p.Scm * 1e-4)) / ((p.Cp * 1e-12) * (p.t * 1e-3)) * (A / A);
  },
  'cap-leak': (p) => {
    const d = 1e-3;
    const A = (p.Cu * 1e-6 * d) / (EPS * p.er);
    const R = (p.rho * d) / A;
    return (p.kV * 1e3) / R;
  },
  'cap-line': (p) => ((PI * EPS * p.len * 1000) / Math.log(p.D / (p.a * 1e-3))) * 1e6,
  'cap-share': (p) => {
    let q2 = p.Q2;
    let q1 = p.Q1;
    // 두 전위가 같아질 때까지 미소 전하를 옮겨 본다(이분법)
    let lo = -50;
    let hi = 50;
    for (let i = 0; i < 200; i++) {
      const m = (lo + hi) / 2;
      const v1 = (q1 - m) / p.C1;
      const v2 = (q2 + m) / p.C2;
      if (v1 > v2) lo = m;
      else hi = m;
    }
    return Math.abs((lo + hi) / 2);
  },
  'mg-force': (p) => p.B * p.I * p.L * Math.sin((p.th * PI) / 180),
  'mg-emf': (p) => (p.mode === 'v' ? p.B * (p.Lcm / 100) * p.v * Math.sin((p.th * PI) / 180) : (p.B * (p.Lcm / 100) * p.dx) / p.dt),
  'mg-torque': (p) => (p.mode === 'T' ? p.m * (p.lcm / 100) * p.H * Math.sin((p.th * PI) / 180) : p.M * p.H * (1 - Math.cos(PI / 2))),
  'mg-ring': (p) => {
    const mu0 = 4 * PI * 1e-7;
    if (p.mode === 'J') return mu0 * p.mu * p.H - mu0 * p.H;
    if (p.mode === 'mur') return (p.Ph * 1e-4) / (p.S * 1e-4) / (mu0 * p.Hh);
    const B = mu0 * p.mu * ((p.N * p.I) / (p.lc / 100));
    return p.mode === 'B' ? B : B * p.S * 1e-4;
  },
  'mc-rel': (p) => {
    const mu0 = 4 * PI * 1e-7;
    if (p.mode === 'R') return p.l / (mu0 * p.mu * p.S);
    if (p.mode === 'gap') {
      const Rfe = p.lc / (mu0 * p.mu);
      const Rg = (p.gap * 1e-3) / mu0;
      return (Rfe + Rg) / Rfe;
    }
    return p.phi * (p.l / (mu0 * p.mu * p.S * 1e-4));
  },
  'mg-w': (p) => {
    const mu0 = 4 * PI * 1e-7;
    if (p.mode === 'F') return 0.5 * p.Fm * p.Ph;
    if (p.mode === 'I') return 0.5 * p.I * p.Lam;
    const H = p.Bv / (mu0 * p.mu);
    return 0.5 * p.Bv * H * p.Vol;
  },
  'ind-n': (p) => {
    if (p.mode === 'M') {
      const L2 = p.L1 * (p.N2 / p.N1) ** 2;
      return Math.sqrt(p.L1 * L2);
    }
    if (p.mode === 'emf') return (p.L / 1000) * (p.dI / p.dt);
    return (p.H * 2 * PI * (p.rcm / 100)) / p.I;
  },
  'ew-n': (p) => {
    const mu0 = 4 * PI * 1e-7;
    const e0 = 1 / (mu0 * 9e16);
    const v = 1 / Math.sqrt(mu0 * p.mr * e0 * p.er);
    if (p.mode === 'v') return v / 1e8;
    if (p.mode === 'lam') return v / p.f;
    const eta = Math.sqrt((mu0 * (p.mr || 1)) / (e0 * (p.er || 1)));
    if (p.mode === 'eta') return 120 * PI * Math.sqrt(p.mr / p.er);
    if (p.mode === 'H') return p.Em / (120 * PI * Math.sqrt(p.mr / p.er));
    return p.P / (4 * PI * (p.dkm * 1000) ** 2);
  },
  'di-pol': (p) => {
    if (p.mode === 'P') return p.D - p.D / p.er;
    if (p.mode === 'chi') return (p.er - 1);
    return p.e1 * p.E1;
  },
};
