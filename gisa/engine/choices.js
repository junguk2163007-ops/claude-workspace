// 보기 4개 만들기: 정답 1개 + "흔한 착각" 오답 후보 중 겹치지 않는 3개
(function (G) {
  'use strict';

  const MIN_REL_GAP = 0.01; // 숫자 보기끼리 1% 이상 차이 나야 함
  const PROBE_S = [0.37, 1.91, 4.3]; // 수식 보기 동치 판정용 s 값

  function exprKey(fn) {
    return PROBE_S.map((s) => {
      const v = fn(s);
      return isFinite(v) ? Number(v.toPrecision(8)) : 'x';
    }).join('|');
  }

  function tooClose(a, b, gap) {
    return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) < gap;
  }

  // d: 템플릿 초안. kind 'num'(기본) 또는 'expr'
  // 반환: 섞인 보기 배열 또는 null(조건을 못 맞추면 템플릿이 숫자를 다시 뽑게 함)
  function build(rng, d) {
    const kind = d.kind || 'num';
    const labelOf = (v) => (d.label ? d.label(v) : G.fmt.q(v, d.unit, d.decimals));
    const picked = [];
    const gap = d.minGap || MIN_REL_GAP; // 효율처럼 값이 원래 몰려 있는 문제는 템플릿이 더 작게 지정
    let correct;

    if (kind === 'num') {
      if (typeof d.answer !== 'number' || !isFinite(d.answer) || d.answer <= 0) return null;
      correct = { label: labelOf(d.answer), value: d.answer };
      const labels = new Set([correct.label]);
      const values = [d.answer];
      for (const dis of d.distractors) {
        if (picked.length === 3) break;
        const v = dis.v;
        // 부동소수 오차로 생긴 0에 가까운 값(예: cos 90°)도 버린다
        if (!dis.why || typeof v !== 'number' || !isFinite(v) || v <= 1e-9 * d.answer) continue;
        const label = labelOf(v);
        if (/^0(\s|$)/.test(label)) continue;
        if (labels.has(label) || values.some((o) => tooClose(o, v, gap))) continue;
        labels.add(label);
        values.push(v);
        picked.push({ label, value: v, why: dis.why });
      }
    } else {
      correct = { label: d.answer.label, key: exprKey(d.answer.fn) };
      const labels = new Set([correct.label]);
      const keys = new Set([correct.key]);
      for (const dis of d.distractors) {
        if (picked.length === 3) break;
        if (!dis.why || !dis.label) continue;
        const key = exprKey(dis.fn);
        if (labels.has(dis.label) || keys.has(key)) continue;
        labels.add(dis.label);
        keys.add(key);
        picked.push({ label: dis.label, key, why: dis.why });
      }
    }
    if (picked.length < 3) return null;

    const all = [Object.assign({ correct: true, why: d.correctWhy || '' }, correct)].concat(
      picked.map((p) => Object.assign({ correct: false }, p))
    );
    return rng.shuffle(all);
  }

  G.choices = { build, exprKey, MIN_REL_GAP };
})(globalThis.GISA);
