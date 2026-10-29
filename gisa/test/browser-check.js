// 브라우저 점검: node test/browser-check.js [스크린샷 폴더]
// dist/index.html을 아이폰 크기·맥 크기, 밝게·어둡게로 열어서 실제로 풀어 본다.
'use strict';
const path = require('path');
const fs = require('fs');
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}

const FILE = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const SHOTS = process.argv[2] || path.join(__dirname, '..', 'dist', 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const problems = [];
let passed = 0;
function check(cond, msg) {
  if (cond) passed++;
  else problems.push(msg);
}

async function newPage(browser, opts) {
  const ctx = await browser.newContext(opts);
  // 폰트는 오프라인일 수도 있으니 막고 기본 글꼴로 점검
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/fonts\.g|ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text());
  });
  await page.goto(FILE);
  await page.waitForSelector('#bar .tab');
  return { ctx, page, errors };
}

// 모바일 에뮬레이션은 넘친 만큼 innerWidth를 키우므로, 설정한 화면 폭과 직접 비교한다
const noOverflow = (page) => page.evaluate((w) => document.documentElement.scrollWidth <= w, page.viewportSize().width);

(async () => {
  const browser = await chromium.launch();
  const iphone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

  // ── 1. 아이폰 · 밝게: 기본 흐름 ──
  {
    const { ctx, page, errors } = await newPage(browser, Object.assign({ colorScheme: 'light' }, iphone));
    check((await page.evaluate(() => GISA.ui._view.tab)) === 'learn', '처음 쓰는 사람은 배우기 탭부터');
    await page.screenshot({ path: path.join(SHOTS, '00-iphone-light-first.png'), fullPage: false });
    await page.click('#continue-lesson');
    check((await page.evaluate(() => GISA.ui._view.lessonId)) === 'l-start', '처음부터 시작 → 첫 레슨');
    await page.click('#tab-practice');
    check((await page.$$('.choice')).length === 4, '첫 화면 보기 4개');
    check(await page.isVisible('.chip[aria-pressed="true"]:has-text("전체")'), '처음 과목 필터는 전체');
    check(await page.isVisible('#open-all'), '잠금 안내에 전부 열기 버튼');
    const firstOpen = await page.evaluate(() => GISA.concepts.filter((c) => GISA.progress.isUnlocked(GISA.ui._state(), c.id)).map((c) => c.subject));
    check(['circuit', 'em', 'power', 'machine'].every((s) => firstOpen.includes(s)), '처음부터 4과목 모두 열린 개념 있음');
    check(await noOverflow(page), '첫 화면 가로 넘침');
    await page.screenshot({ path: path.join(SHOTS, '01-iphone-light-question.png'), fullPage: true });

    await page.click('#hint1');
    await page.click('#hint2');
    check((await page.$$('.hint-body')).length === 2, '힌트 1·2 순서대로 열림');

    // 일부러 틀리기
    const ans = await page.evaluate(() => GISA.ui._view.q.answerIndex);
    const wrong = (ans + 1) % 4;
    await page.click('.choice[data-i="' + wrong + '"]');
    check(await page.isVisible('.verdict.bad'), '오답 판정 표시');
    check((await page.$$('.explain .ex')).length === 5, '해설 4단 + 보기별 해설 블록');
    check((await page.$$('.per-choice li')).length === 4, '보기별 해설 4개');
    check((await page.$$('.ex li.check')).length === 1, '검산 단계 강조');
    await page.click('#easier');
    check(await page.isVisible('.analogy'), '더 쉽게 설명(비유) 열림');
    check(await noOverflow(page), '해설 화면 가로 넘침');
    await page.screenshot({ path: path.join(SHOTS, '02-iphone-light-explain-wrong.png'), fullPage: true });
    const reviews = await page.evaluate(() => Object.keys(GISA.ui._state().reviews).length);
    check(reviews === 1, '틀린 문제가 복습 목록에 들어감');

    // 옴의 법칙 3문제 맞혀서 다음 개념 열기
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => GISA.ui._load('t:ohm-current#' + (100 + Math.floor(Math.random() * 1000))));
      const a = await page.evaluate(() => GISA.ui._view.q.answerIndex);
      await page.click('.choice[data-i="' + a + '"]');
      check(await page.isVisible('.verdict.ok'), '정답 판정 표시');
    }
    const unlocked = await page.evaluate(() => GISA.progress.isUnlocked(GISA.ui._state(), 'series'));
    check(unlocked, '옴의 법칙 3문제 이상·60% 이상 → 직렬 회로 열림');

    // 새로고침해도 기록 유지
    await page.reload();
    await page.waitForSelector('.qcard');
    const total = await page.evaluate(() => GISA.ui._state().total.n);
    check(total >= 5, '새로고침 후 기록 유지 (' + total + ')');

    // 기록 탭
    await page.click('#tab-stats');
    check((await page.$$('.tile')).length === 4, '기록 탭 타일');
    check(await noOverflow(page), '기록 탭 가로 넘침');
    await page.screenshot({ path: path.join(SHOTS, '03-iphone-light-stats.png'), fullPage: true });

    // 복습: 날짜를 오늘로 당겨서 복습 시작
    await page.evaluate(() => {
      const S = GISA.ui._state();
      Object.values(S.reviews).forEach((r) => (r.due = GISA.progress.today()));
      GISA.store.save(S);
    });
    await page.reload();
    await page.waitForSelector('.qcard');
    check(await page.isVisible('#tab-review .badge'), '복습 배지 표시');
    await page.click('#tab-review');
    await page.screenshot({ path: path.join(SHOTS, '04-iphone-light-review.png'), fullPage: true });
    const dueKey = await page.evaluate(() => GISA.progress.dueReviews(GISA.ui._state())[0].k);
    await page.click('#start-review');
    const shownKey = await page.evaluate(() => GISA.ui._view.q.key);
    check(shownKey === dueKey, '복습 시작 → 같은 시드 문제 재출제');
    check(await page.isVisible('.tag.review'), '복습 표시');
    const ra = await page.evaluate(() => GISA.ui._view.q.answerIndex);
    await page.click('.choice[data-i="' + ra + '"]');
    const nextDue = await page.evaluate((k) => (GISA.ui._state().reviews[k] || {}).due, dueKey);
    check(nextDue === (await page.evaluate(() => GISA.progress.addDays(GISA.progress.today(), 3))), '복습 정답 → 3일 뒤로');

    // 배우기 탭: 목록 → 레슨 → 예제 → 다른 예제 → 확인 문제 → 다음 레슨
    await page.click('#tab-learn');
    check((await page.$$('.lesson-row')).length === (await page.evaluate(() => GISA.lessons.length)), '레슨 목록 전체 표시');
    check(await noOverflow(page), '배우기 목록 가로 넘침');
    await page.screenshot({ path: path.join(SHOTS, '05-iphone-light-learn-list.png'), fullPage: true });
    await page.click('.lesson-row[data-lesson="l-resonance"]');
    check(await page.isVisible('.lesson h2'), '레슨 열림');
    check(await page.isVisible('.example .steps'), '예제 풀이 단계 표시');
    const ex1 = await page.evaluate(() => GISA.ui._view.exampleKey);
    await page.click('#another-example');
    const ex2 = await page.evaluate(() => GISA.ui._view.exampleKey);
    check(ex1 !== ex2 && ex2.indexOf('t:res-omega#') === 0, '다른 숫자로 예제 보기');
    const qa = await page.evaluate(() => GISA.ui._view.quiz.q.answerIndex);
    await page.click('.quiz .choice[data-qi="' + qa + '"]');
    check(await page.isVisible('.quiz .verdict.ok'), '바로 확인 문제 정답 표시');
    check(await page.evaluate(() => GISA.progress.isUnlocked(GISA.ui._state(), 'resonance')), '레슨 읽으면 개념 열림');
    check(await noOverflow(page), '레슨 화면 가로 넘침');
    await page.screenshot({ path: path.join(SHOTS, '05b-iphone-light-lesson.png'), fullPage: true });
    await page.click('#lesson-next');
    check((await page.evaluate(() => GISA.ui._view.lessonId)) === 'l-ydelta', '다음 레슨으로 이동');
    await page.click('#lesson-practice');
    check((await page.evaluate(() => GISA.ui._view.q.conceptId)) === 'y-delta', '레슨에서 그 개념 문제 풀기');

    // 설정: 순서 건너뛰기 → 잠긴 개념 선택 → 틀리고 기초로 내려가기
    await page.click('#tab-settings');
    await page.check('#skip-order');
    await page.screenshot({ path: path.join(SHOTS, '06-iphone-light-settings.png'), fullPage: true });
    await page.click('#tab-practice');
    await page.selectOption('#concept-select', 'ac-power');
    const cid = await page.evaluate(() => GISA.ui._view.q.conceptId);
    check(cid === 'ac-power', '개념 고르기 (' + cid + ')');
    const a2 = await page.evaluate(() => GISA.ui._view.q.answerIndex);
    await page.click('.choice[data-i="' + ((a2 + 1) % 4) + '"]');
    const downBtns = await page.$$('text=기초로 내려가기');
    check(downBtns.length === 2, '기초로 내려가기 버튼(선행 2개)');
    await downBtns[0].click();
    const basicsCid = await page.evaluate(() => GISA.ui._view.q.conceptId);
    check(basicsCid === 'rlc', '선행 개념 문제로 이동 (' + basicsCid + ')');
    check(await page.isVisible('.banner'), '기초 모드 배너');

    // 문제 번호로 불러오기
    await page.click('#tab-settings');
    await page.fill('#key-input', 't:series-total#5');
    await page.click('#load-key');
    const k5 = await page.evaluate(() => GISA.ui._view.q.key);
    check(k5 === 't:series-total#5', '문제 번호로 불러오기');
    check(await page.isVisible('.figure svg.circuit'), '직렬 회로도 표시');
    await page.screenshot({ path: path.join(SHOTS, '07-iphone-light-circuit.png'), fullPage: true });

    // 과목 칩: 준비 중 과목
    await page.click('.chip:has-text("기술기준")');
    check(await page.isVisible('.empty'), '기술기준 과목 안내(아직 없음)');
    await page.click('.chip:has-text("전기기기")');
    const mcSubj = await page.evaluate(() => GISA.conceptMap[GISA.ui._view.q.conceptId].subject);
    check(mcSubj === 'machine', '전기기기 칩 → 전기기기 문제 (' + mcSubj + ')');
    await page.click('.chip:has-text("전체")');

    check(errors.length === 0, '아이폰 밝게 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2. 아이폰 · 어둡게: 모든 템플릿과 정적 문제를 한 번씩 풀어 보기 ──
  {
    const { ctx, page, errors } = await newPage(browser, Object.assign({ colorScheme: 'dark' }, iphone));
    const keys = await page.evaluate(() => GISA.templateList.map((t) => 't:' + t.id + '#7').concat(GISA.staticBank.map((s) => 's:' + s.id + '#7')));
    for (const key of keys) {
      await page.evaluate((k) => GISA.ui._load(k), key);
      const before = await noOverflow(page);
      const a = await page.evaluate(() => GISA.ui._view.q.answerIndex);
      await page.click('.choice[data-i="' + ((a + 2) % 4) + '"]');
      const ok = (await page.$$('.explain .ex')).length === 5 && (await page.$$('.per-choice li')).length === 4;
      const after = await noOverflow(page);
      check(before && after, key + ' 가로 넘침');
      check(ok, key + ' 해설 표시');
    }
    // 다크모드에서 회로도 선 색이 배경과 구분되는지(currentColor = 밝은 글자색)
    await page.evaluate(() => GISA.ui._load('t:rlc-series#3'));
    const colors = await page.evaluate(() => {
      const svg = document.querySelector('.figure svg');
      return { stroke: getComputedStyle(svg).color, bg: getComputedStyle(document.body).backgroundColor };
    });
    const lum = (c) => {
      const m = c.match(/\d+/g).map(Number);
      return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
    };
    check(lum(colors.stroke) - lum(colors.bg) > 0.5, '다크모드 회로도 대비 ' + JSON.stringify(colors));
    await page.screenshot({ path: path.join(SHOTS, '08-iphone-dark-circuit.png'), fullPage: true });
    const a = await page.evaluate(() => GISA.ui._view.q.answerIndex);
    await page.click('.choice[data-i="' + a + '"]');
    await page.click('#easier');
    await page.screenshot({ path: path.join(SHOTS, '09-iphone-dark-explain.png'), fullPage: true });
    await page.evaluate(() => GISA.ui._load('t:tf-feedback#3'));
    await page.screenshot({ path: path.join(SHOTS, '10-iphone-dark-feedback.png'), fullPage: false });
    await page.evaluate(() => GISA.ui._load('t:yd-load#4'));
    await page.screenshot({ path: path.join(SHOTS, '11-iphone-dark-ydelta.png'), fullPage: false });
    check(errors.length === 0, '아이폰 어둡게 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-2. AI에게 묻기 ──
  {
    // 파일로 열면(window.claude 없음) 상자가 없어야 함
    const plain = await newPage(browser, Object.assign({ colorScheme: 'light' }, iphone));
    await plain.page.evaluate(() => GISA.ui._load('t:ohm-current#3'));
    check((await plain.page.$$('.ai-box')).length === 0, '파일로 열면 AI 상자 숨김');
    await plain.ctx.close();

    // claude.ai 뷰어를 흉내 낸 가짜 sample로 화면 흐름만 확인
    const ctx = await browser.newContext(Object.assign({ colorScheme: 'light' }, iphone));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      window.__asked = [];
      const fake = async (input, opts) => {
        window.__asked.push(input);
        await new Promise((r) => setTimeout(r, 50));
        const text = '가짜 답변: 전류는 전압 ÷ 저항이야.';
        opts.onText({ text: text.slice(0, 5), delta: text.slice(0, 5) });
        opts.onText({ text, delta: text.slice(5) });
        return { text, truncated: false, modelTierApplied: 'default' };
      };
      window.claude = { use: async (n) => (n === 'sample' ? fake : null) };
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(FILE);
    await page.waitForSelector('#bar .tab');
    await page.evaluate(() => GISA.ui._load('t:ohm-current#3'));
    await page.waitForSelector('.ai-box');
    await page.click('.ai-box summary');
    const pre = await page.$$eval('.ai-chip', (bs) => bs.map((b) => b.textContent));
    check(pre.includes('힌트만 줘'), '풀기 전 프리셋은 힌트용');
    check(!(await page.isVisible('.ai-form .btn:not(.primary)')), '대기 중엔 멈추기 버튼 숨김');
    await page.click('.ai-chip');
    await page.waitForSelector('.ai-msg.ai:not(.pending)');
    const sent = await page.evaluate(() => window.__asked[0]);
    check(Array.isArray(sent) && sent[0].role === 'user' && sent[0].content.includes('정답 값이나 정답 번호를 절대 말하지 말고'), '풀기 전엔 정답 숨김 규칙 전달');
    check((await page.textContent('.ai-msg.ai')).includes('가짜 답변'), 'AI 답변 표시');
    await page.fill('#ai-input', '단위가 헷갈려');
    await page.click('.ai-form .btn.primary');
    await page.waitForFunction(() => document.querySelectorAll('.ai-msg.ai:not(.pending)').length === 2);
    const a = await page.evaluate(() => GISA.ui._view.q.answerIndex);
    await page.click('.choice[data-i="' + ((a + 1) % 4) + '"]');
    check((await page.$$('.ai-msg')).length === 4, '답을 고른 뒤에도 대화 유지');
    const post = await page.$$eval('.ai-chip', (bs) => bs.map((b) => b.textContent));
    check(post.includes('내가 고른 답은 왜 틀려?'), '오답 뒤 프리셋 바뀜');
    await page.click('.ai-chip');
    await page.waitForFunction(() => window.__asked.length === 3);
    const last = await page.evaluate(() => window.__asked[2][0].content);
    check(last.includes('학생이 고른 답') && last.includes('이미 답을 골랐어'), '답 고른 뒤 규칙 전환');
    check(await noOverflow(page), 'AI 상자 가로 넘침');
    await page.screenshot({ path: path.join(SHOTS, '13-iphone-ai-box.png'), fullPage: true });
    check(errors.length === 0, 'AI 상자 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 3. 맥 화면 ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 1280, height: 860 }, colorScheme: 'light' });
    await page.evaluate(() => GISA.ui._load('t:parallel-three#11'));
    await page.keyboard.press('2');
    check(await page.isVisible('.verdict'), '맥 키보드 숫자키로 답하기');
    await page.screenshot({ path: path.join(SHOTS, '12-mac-light.png'), fullPage: true });
    await page.keyboard.press('Enter');
    check(!(await page.isVisible('.verdict')), 'Enter로 다음 문제');
    check(errors.length === 0, '맥 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  await browser.close();
  console.log('브라우저 점검 ' + passed + '개 통과' + (problems.length ? ', 문제 ' + problems.length + '개' : ''));
  problems.forEach((p) => console.log('  ✗ ' + p));
  console.log('스크린샷: ' + SHOTS);
  process.exit(problems.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
