// 계산기 검증: node test/calc-tests.js
// 카시오 fx-350ES PLUS 설명서의 예제와 수학적으로 확실한 값을 키 입력 순서 그대로 재현한다.
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
['engine/core.js', 'engine/rng.js', 'engine/format.js', 'engine/qnum.js', 'engine/calc-fmt.js', 'engine/calc-eval.js', 'engine/calc-stat.js', 'engine/calc.js'].forEach((f) => require(path.join(ROOT, f)));
const G = globalThis.GISA;

let checks = 0;
const failures = [];
function eq(got, want, label) {
  checks++;
  if (got !== want) failures.push(label + '\n      기대: ' + want + '\n      실제: ' + got);
}
function run(keys, opts) {
  const c = new G.Calc(opts);
  c.keys(keys);
  return c;
}
const res = (keys) => run(keys).result();
const txt = (keys) => run(keys).text();
const errOf = (keys) => {
  const c = run(keys);
  return c.screen === 'error' ? c.err.kind : '(no error) ' + c.text();
};

// ───────── 기본 계산·우선순위 ─────────
[
  ['4 * sin 3 0 ) * ( 3 0 + 1 0 * 3 ) =', '120'],
  ['2 + 3 * 4 =', '14'],
  ['( 2 + 3 ) * 4 =', '20'],
  ['2 ( 3 + 4 ) =', '14'],
  ['1 . 2 3 * 4 5 =', '55.35'],
  ['0 . 1 + 0 . 2 =', '0.3'],
  ['1 / 3 * 3 =', '1'],
  ['(-) 5 + 3 =', '−2'],
  ['(-) 2 x2 =', '−4'],
  ['2 x2 + 3 x2 =', '13'],
  ['2 x3 =', '8'],
  ['2 x^ 1 0 RIGHT =', '1024'],
  ['200 / 7 * 14 ='.replace('200', '2 0 0'), '400'],
  ['1 2 3 4 5 6 7 8 9 0 * 1 0 =', '1.23456789×10^10'],
  // 분수·근호·π (자연스러운 표시)
  ['FRAC 2 DOWN 3 RIGHT + FRAC 1 DOWN 2 RIGHT =', '7/6'],
  ['7 / 3 =', '7/3'],
  ['7 / 3 = SHIFT S<>D', '2 1/3'],
  ['SHIFT FRAC 2 RIGHT 1 DOWN 2 RIGHT + 1 =', '7/2'],
  ['1 / 2 0 0 =', '1/200'],
  ['1 / 2 0 0 = S<>D', '5×10^−3'],
  ['( SQRT 2 RIGHT + 2 ) * SQRT 3 =', '√6+2√3'],
  ['( SQRT 2 RIGHT + 2 ) * SQRT 3 = S<>D', '5.913591358'],
  ['SQRT 8 RIGHT =', '2√2'],
  ['SQRT 1 8 RIGHT =', '3√2'],
  ['SQRT 2 RIGHT * SQRT 3 RIGHT =', '√6'],
  ['SQRT 2 RIGHT * SQRT 2 RIGHT =', '2'],
  ['SQRT 3 RIGHT / 3 =', '√3/3'],
  ['1 / SQRT 3 RIGHT =', '√3/3'],
  ['SHIFT x10^x / 6 =', 'π/6'],
  ['SHIFT x10^x / 6 = S<>D', '0.5235987756'],
  ['SHIFT x10^x = S<>D', '3.141592654'],
  ['SHIFT SQRT 2 7 RIGHT =', '3'],
  ['Abs (-) 5 RIGHT =', '5'],
  ['Abs 3 - 8 RIGHT =', '5'],
  // 삼각·지수·로그
  ['sin 3 0 ) =', '1/2'],
  ['sin 4 5 ) =', '√2/2'],
  ['cos 6 0 ) =', '1/2'],
  ['tan 4 5 ) =', '1'],
  ['SHIFT sin 0 . 5 ) =', '30'],
  ['SHIFT sin 1 ) =', '90'],
  ['log 1 0 0 0 ) =', '3'],
  ['ln 2 ) =', '0.6931471806'],
  ['LOGAB 2 RIGHT 8 =', '3'],
  ['SHIFT log 3 RIGHT =', '1000'],
  ['SHIFT ln 1 RIGHT =', '2.718281828'],
  ['hyp 1 1 ) =', '1.175201194'],
  ['hyp 1 2 ) =', '3.626860408'],
  // 조합·순열·계승·%
  ['5 SHIFT x-1 =', '120'],
  ['5 SHIFT x-1 + 1 =', '121'],
  ['1 0 SHIFT * 3 =', '720'],
  ['1 0 SHIFT / 3 =', '120'],
  ['2 0 0 * 1 5 SHIFT ( =', '30'],
  // 극좌표·직교좌표 (설명서 Pol/Rec 예제)
  ['SHIFT + SQRT 2 RIGHT SHIFT ) SQRT 2 RIGHT ) =', 'r=2,θ=45'],
  ['SHIFT - 2 SHIFT ) 3 0 ) =', 'X=√3,Y=1'],
  // 60진수
  ['2 DMS 2 0 DMS 3 0 DMS + 0 DMS 3 9 DMS 3 0 DMS =', '3°0′0″'],
  ['2 . 2 5 8 = DMS', '2°15′28.8″'],
  // 소인수분해
  ['6 0 0 = SHIFT DMS', '2^3×3×5^2'],
  ['3 6 0 = SHIFT DMS', '2^3×3^2×5'],
  // ENG
  ['1 2 3 4 5 * 1 0 0 0 = ENG', '12.345×10^6'],
  ['1 2 3 4 5 * 1 0 0 0 = SHIFT ENG', '0.012345×10^9'],
].forEach(([k, want]) => eq(res(k), want, k));

// ───────── 표시 형식 설정 ─────────
eq(res('SHIFT MODE 6 3 1 / 7 = S<>D'), '0.143', 'Fix3: 1÷7 → 0.143');
eq(res('SHIFT MODE 7 5 1 / 7 = S<>D'), '1.4286×10^−1', 'Sci5(유효숫자 5자리): 1÷7');
eq(res('SHIFT MODE 8 1 1 / 2 0 0 = S<>D'), '5×10^−3', 'Norm1: 1÷200');
eq(res('SHIFT MODE 8 2 1 / 2 0 0 = S<>D'), '0.005', 'Norm2: 1÷200');
eq(res('SHIFT MODE 2 1 / 3 + 1 / 2 ='), '0.8333333333', 'LineIO: 소수로 표시');
eq(res('SHIFT MODE 2 1 FRAC 3 ='), '1⌟3', 'LineIO에서 분수로 입력하면 분수로');

// ───────── 메모리·Ans ─────────
eq(res('1 2 + 3 4 = * 2 ='), '92', 'Ans 이어서 계산');
eq(txt('1 2 + 3 4 = * 2 ='), 'Ans×2 => 92', 'Ans 표시');
eq(res('3 SHIFT RCL (-) = ALPHA (-) + 1 ='), '4', 'STO A → A+1');
eq(txt('3 + 5 SHIFT RCL (-)'), '3+5→A', '3+5→A 표시');
eq(res('3 + 5 SHIFT RCL (-) ='), '8', '3+5→A 결과');
eq(res('3 SHIFT RCL (-) = 4 SHIFT RCL DMS = ALPHA (-) + ALPHA DMS ='), '7', 'A+B');
eq(res('5 = M+ 7 = M+ RCL M+ ='), '12', 'M+ 두 번 → RCL M');
eq(res('5 = M+ 2 = SHIFT M+ RCL M+ ='), '3', 'M−');
eq(run('5 = M+').indicators().M, true, 'M 표시등');
eq(res('2 3 + 9 = SHIFT RCL (-) = RCL (-) + 1 ='), '33', 'RCL 값 불러와 계산');

// ───────── 오류 ─────────
eq(errOf('7 / 0 ='), 'Math', '0으로 나누기');
eq(errOf('1 + 2 + ='), 'Syntax', '식이 덜 끝남');
eq(errOf('1 + 2 ) ='), 'Syntax', '닫는 괄호만');
eq(errOf('SQRT (-) 4 RIGHT ='), 'Math', '√(−4)');
eq(errOf('tan 9 0 ) ='), 'Math', 'tan 90°');
eq(errOf('7 0 SHIFT x-1 ='), 'Math', '70!');
eq(errOf('MODE 2 2 1 = 2 = 3 = UP UP UP RIGHT 2 = 4 = 6 = AC SHIFT 1 5 4 ='), 'Syntax', 'x̂는 값이 필요');
{
  const c = run('1 + 2 + =');
  c.press('LEFT');
  eq(c.screen, 'input', '오류 후 ◀ → 편집으로');
  c.press('AC');
  c.keys('1 + 1 =');
  eq(c.result(), '2', '오류 뒤 정상 계산');
}

// ───────── 편집·이력 ─────────
{
  const c = run('1 2 3 4 DEL DEL');
  eq(c.text(), '12', 'DEL');
  c.keys('LEFT 5');
  eq(c.text(), '152', '◀ 로 이동 후 삽입');
}
{
  const c = run('1 + 2 = 3 * 4 =');
  c.press('UP');
  eq(c.text(), '1+2 => 3', '▲ 이전 계산 보기');
  c.press('DOWN');
  eq(c.text(), '3×4 => 12', '▼ 다시 최신');
  c.press('LEFT');
  eq(c.screen, 'input', '결과에서 ◀ 로 식 편집');
  c.keys('DEL 5 =');
  eq(c.result(), '15', '식 고쳐서 다시 계산');
}
{
  const c = run('1 + 2 = + 3 =');
  eq(c.text(), 'Ans+3 => 6', '연산자부터 시작하면 Ans');
}
{
  const c = run('SHIFT 9 3');
  eq(c.screen, 'confirm', 'CLR 확인 화면');
  c.press('=');
  eq(c.screen, 'input', '초기화 후 입력');
}
{
  // 멀티 문장
  const c = run('3 SHIFT RCL (-) ALPHA x3 ALPHA (-) x2 =');
  eq(c.result(), '3', '멀티 문장 첫 결과');
  c.press('=');
  eq(c.result(), '9', '멀티 문장 다음 결과');
}
{
  const c = run('MODE 3');
  eq(c.text(), 'f(X)=', 'TABLE 모드 진입');
  c.keys('ALPHA ) x2 = 1 = 3 = 1 =');
  eq(c.text(), '1:1,1 | 2:2,4 | 3:3,9 @1', 'TABLE f(X)=X² 표');
}

// ───────── STAT ─────────
const stat1 = 'MODE 2 1 1 = 2 = 3 = 4 = 5 = AC SHIFT 1';
eq(res(stat1 + ' 4 2 ='), '3', 'STAT x̄');
eq(res(stat1 + ' 4 3 ='), '1.414213562', 'STAT σx');
eq(res(stat1 + ' 4 4 ='), '1.58113883', 'STAT sx');
eq(res(stat1 + ' 3 1 ='), '55', 'STAT Σx²');
const stat2 = 'MODE 2 2 1 = 2 = 3 = UP UP UP RIGHT 2 = 4 = 6 = AC SHIFT 1 5';
eq(res(stat2 + ' 2 ='), '2', '선형회귀 B');
eq(res(stat2 + ' 3 ='), '1', '선형회귀 r');
eq(res('MODE 2 2 1 = 2 = 3 = UP UP UP RIGHT 2 = 4 = 6 = AC 5 SHIFT 1 5 5 ='), '10', 'ŷ(5)');
eq(res('MODE 2 3 1 = 2 = 3 = 4 = UP UP UP UP RIGHT 1 = 4 = 9 = 1 6 = AC SHIFT 1 5 3 ='), '1', '2차회귀 C');

// ───────── 저장·복원 ─────────
{
  const c = run('SHIFT MODE 6 3 2 5 = SHIFT RCL (-) =');
  const saved = JSON.parse(JSON.stringify(c.serialize()));
  const d = new G.Calc();
  d.restore(saved);
  eq(d.setup.fmt, 'fix', '설정 복원');
  d.keys('ALPHA (-) + 1 =');
  eq(d.result(), '26', '변수 복원');
}

console.log('계산기 검사 항목 ' + checks + '개');
if (failures.length) {
  console.log('\n실패 ' + failures.length + '건:');
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('✓ 계산기 전부 통과');
