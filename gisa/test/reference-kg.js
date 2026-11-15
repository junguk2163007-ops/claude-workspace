// 기출 분석 보강 문제의 독립 검산기(템플릿 식과 다른 방법으로 다시 계산)
'use strict';
const PI = Math.PI;
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
};
