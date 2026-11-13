// 수식 조판 검증: node test/typeset-tests.js
// 글 속 수식이 분수·제곱근으로 바뀌는지, 바뀌면 안 되는 글(단위, 진행 표시, 한글 낱말)은 그대로인지 확인한다.
'use strict';
const path = require('path');
const FILES = require('../files');
const ROOT = path.join(__dirname, '..');
[...FILES.engine, ...FILES.content].forEach((f) => require(path.join(ROOT, f)));
const G = globalThis.GISA;

let checks = 0;
const failures = [];
const eq = (text, want) => {
  checks++;
  const got = G.typesetDebug(text);
  if (got !== want) failures.push('"' + text + '"\n      기대: ' + want + '\n      실제: ' + got);
};

// 바뀌는 것 (⟦분자|분모⟧, √⟦…⟧, ^⟦…⟧)
eq('ωL = 1/(ωC)를 풀면 ω₀ = 1/√(LC), f₀ = 1/(2π√(LC)).', 'ωL = ⟦1|ωC⟧를 풀면 ω₀ = ⟦1|√⟦LC⟧⟧, f₀ = ⟦1|2π√⟦LC⟧⟧.');
eq('V₂ = V × R₂ / (R₁ + R₂)', 'V₂ = ⟦V × R₂|R₁ + R₂⟧');
eq('I = V / (R₁ + R₂ + …)', 'I = ⟦V|R₁ + R₂ + …⟧');
eq('R = R₁R₂ / (R₁ + R₂)  (곱 나누기 합)', 'R = ⟦R₁R₂|R₁ + R₂⟧  (곱 나누기 합)');
eq('1/R = 1/R₁ + 1/R₂ + 1/R₃', '⟦1|R⟧ = ⟦1|R₁⟧ + ⟦1|R₂⟧ + ⟦1|R₃⟧');
eq('F = 9×10⁹ × Q₁Q₂ / r²  [N]', 'F = ⟦9×10⁹ × Q₁Q₂|r²⟧  [N]');
eq('Ns = 120 f / P  [rpm]', 'Ns = ⟦120 f|P⟧  [rpm]');
eq('Is = (100 / %Z) × In', 'Is = ⟦100|%Z⟧ × In');
eq('ε = (Vs − Vr) / Vr × 100  [%]', 'ε = ⟦Vs − Vr|Vr⟧ × 100  [%]');
eq('Z = √(R² + (XL − XC)²)', 'Z = √⟦R² + (XL − XC)²⟧');
eq('C / R = G / (1 + G H)', '⟦C|R⟧ = ⟦G|1 + G H⟧');
eq('L[e^(−at)] = 1/(s + a)', 'L[e^⟦−at⟧] = ⟦1|s + a⟧');
eq('L = S + 8D² / (3S)', 'L = S + ⟦8D²|3S⟧');
eq('Q = (1/R)·√(L/C)', 'Q = ⟦1|R⟧·√⟦⟦L|C⟧⟧');
eq('D = ∛(D₁·D₂·D₃)', 'D = ∛⟦D₁·D₂·D₃⟧');
eq('F(s) = (4s + 16) / {s(s + 2)}', 'F(s) = ⟦4s + 16|s(s + 2)⟧');
eq('수용률 = 최대 수요전력 / 설비용량 × 100  [%]', '수용률 = ⟦최대 수요전력|설비용량⟧ × 100  [%]');
eq('역률 0.6 → tan 4/3', '역률 0.6 → tan ⟦4|3⟧');
eq('× 100/%Z 배', '× ⟦100|%Z⟧ 배');
eq('실효값 = 최댓값 / √2', '실효값 = ⟦최댓값|√⟦2⟧⟧');
eq('I = 22,000/(√3 × 20)', 'I = ⟦22,000|√⟦3⟧ × 20⟧');

// 바뀌면 안 되는 것
[
  '1 A = 1 C/s 이고 전계는 12 V/m 야',
  'H = 3 AT/m, Wb/m², kcal/kg, rad/s, 288 V/m',
  'λ = 5 nC/m',
  'N·m/rad',
  '직렬/병렬을 확인하고',
  '높이/빗변 비율',
  '읽은 레슨 0 / 44',
  'Y: VL = √3 Vp   /   Δ: VL = Vp',
  '상전압²/Z',
  '글자만 있는 문장',
].forEach((t) => {
  checks++;
  const got = G.typesetDebug(t);
  // √만 있는 경우(Y: …)는 분수만 없으면 통과
  if (got && /⟦[^⟦⟧]*\|/.test(got)) failures.push('분수로 바뀌면 안 되는 글: "' + t + '" → ' + got);
});

// 모든 내용을 훑어서 오류 없이 돌고 이상한 결과(빈 분자·분모, 단위가 분수가 됨)가 없는지
const strings = [];
const add = (s) => typeof s === 'string' && /[/√∛^]/.test(s) && strings.push(s);
const walk = (o, d) => {
  if (d > 6 || o == null) return;
  if (typeof o === 'string') return add(o);
  if (Array.isArray(o)) return o.forEach((x) => walk(x, d + 1));
  if (typeof o === 'object') Object.keys(o).forEach((k) => k !== 'svg' && walk(o[k], d + 1));
};
G.concepts.forEach((c) => walk(c, 0));
G.lessons.forEach((l) => walk(l, 0));
Object.values(G.points).forEach((p) => walk(p, 0));
G.glossary.terms.forEach((t) => walk(t, 0));
G.templateList.forEach((t) => {
  for (let seed = 1; seed <= 20; seed++) {
    const q = G.generate(t.id, seed);
    walk({ text: q.text, hints: q.hints, explain: q.explain, choices: q.choices.map((c) => c.label) }, 0);
  }
});
let converted = 0;
strings.forEach((s) => {
  checks++;
  let nodes;
  try {
    nodes = G.typeset(s);
  } catch (e) {
    failures.push('조판 중 오류: ' + s.slice(0, 80) + ' → ' + e.message);
    return;
  }
  if (!nodes) return;
  converted++;
  const d = G.typesetDebug(s);
  // 원문과 같은 글자가 남아야 한다(분수 기호만 바뀌고 내용이 사라지지 않음)
  const strip = (x) => x.replace(/[\s/()⟦⟧|^{}√∛]/g, '');
  const back = strip(d.replace(/\|/g, '/'));
  if (strip(s).length - back.length > 12) failures.push('내용이 줄어듦: ' + s.slice(0, 80) + ' → ' + d.slice(0, 80));
  if (/⟦\s*\|/.test(d) || /\|\s*⟧/.test(d)) failures.push('빈 분자/분모: ' + s.slice(0, 80) + ' → ' + d.slice(0, 80));
  // 단위가 분수가 된 흔적: 숫자 + 단위 / 소문자 단위
  if (/⟦[^⟦⟧]*\b(?:V|A|N|W|AT|rad|kcal)\|(?:m|s|kg|m²|m³)⟧/.test(d)) failures.push('단위가 분수가 됨: ' + s.slice(0, 80) + ' → ' + d.slice(0, 80));
});

console.log('수식 조판 검사 항목 ' + checks + '개 (글 ' + strings.length + '개 중 ' + converted + '개가 분수·제곱근으로 바뀜)');
if (failures.length) {
  console.log('\n실패 ' + failures.length + '건:');
  failures.slice(0, 40).forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('✓ 수식 조판 전부 통과');
