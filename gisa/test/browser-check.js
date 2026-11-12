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

    // 과목별 탭: 과목 → 단락 → 포인트 → 그 포인트 문제만 반복
    check(await page.evaluate(() => [...document.querySelectorAll('.tab')].every((t) => { const r = t.getBoundingClientRect(); return r.left >= 0 && r.right <= 390 && t.scrollWidth <= t.clientWidth + 1; })), '탭 6개가 아이폰 폭에 다 들어감');
    await page.click('#tab-units');
    check((await page.$$('.chip[data-subject]')).length === 6, '과목 칩 6개(기초 수학·회로·전기자기학·전력·전기기기·기술기준)');
    check((await page.$$('.lesson-row[data-unit]')).length === (await page.evaluate(() => GISA.concepts.filter((c) => c.subject === 'circuit').length)), '회로 과목의 세부 단락 목록');
    check(await noOverflow(page), '과목별 목록 가로 넘침');
    await page.screenshot({ path: path.join(SHOTS, '05c-iphone-units-list.png'), fullPage: true });
    await page.click('.chip[data-subject="em"]');
    check((await page.$$('.lesson-row[data-unit]')).length === 8, '전기자기학 단락 8개');
    await page.click('.chip[data-subject="code"]');
    check(await page.isVisible('.empty'), '기술기준은 준비 중 안내');
    await page.click('.chip[data-subject="circuit"]');
    await page.click('.lesson-row[data-unit="ohm"]');
    check((await page.$$('.point-card')).length === 3, '옴의 법칙 포인트 카드 3개');
    check((await page.$$('.pt-list li')).length === 3, '포인트 한눈에 목록 3개');
    check(await page.isVisible('.unit .box.analogy'), '개념 설명(비유) 표시');
    check(await noOverflow(page), '단락 상세 가로 넘침');
    await page.click('.point-card[data-point="ohm-current"] summary');
    check(await page.isVisible('.point-card[data-point="ohm-current"] .mini-example .steps'), '포인트 예제 풀이 펼침');
    const seedBefore = await page.evaluate(() => GISA.ui._view.exSeeds['ohm-current'] || 1);
    await page.click('[data-another="ohm-current"]');
    check((await page.evaluate(() => GISA.ui._view.exSeeds['ohm-current'])) !== seedBefore, '다른 숫자로 예제 보기');
    check(await page.isVisible('.point-card[data-point="ohm-current"] .mini-example .steps'), '다른 숫자 뒤에도 예제가 열려 있음');
    await page.screenshot({ path: path.join(SHOTS, '05d-iphone-units-detail.png'), fullPage: true });
    await page.evaluate(() => { GISA.ui._state().points = {}; });
    await page.click('[data-drill="ohm-current"]');
    check(await page.isVisible('#drill-banner'), '포인트 반복 배너');
    check((await page.evaluate(() => GISA.ui._view.q.templateId)) === 'ohm-current', '반복은 그 포인트 문제만');
    check(!(await page.isVisible('#concept-select')), '반복 중엔 개념 선택이 숨겨짐');
    for (let i = 0; i < 3; i++) {
      const aa = await page.evaluate(() => GISA.ui._view.q.answerIndex);
      await page.click('.choice[data-i="' + aa + '"]');
      check((await page.evaluate(() => GISA.ui._view.q.templateId)) === 'ohm-current', '반복 ' + (i + 1) + '번째 문제도 같은 포인트');
      if (i < 2) await page.click('#next');
    }
    check(await page.isVisible('#drill-banner:has-text("익숙해졌어")'), '3연속 정답 → 익숙해짐 표시');
    await page.click('#next');
    check((await page.evaluate(() => GISA.ui._view.q.templateId)) === 'ohm-current', '익숙해진 뒤에도 같은 포인트 반복 가능');
    await page.screenshot({ path: path.join(SHOTS, '05e-iphone-drill.png'), fullPage: true });
    await page.click('#drill-exit');
    check((await page.evaluate(() => GISA.ui._view.unitCid)) === 'ohm', '단락으로 돌아가기');
    check(await page.isVisible('.point-card[data-point="ohm-current"] .state.open'), '포인트 카드에 익숙해짐 표시');
    await page.click('#drill-all');
    const seenT = new Set();
    for (let i = 0; i < 14; i++) {
      seenT.add(await page.evaluate(() => GISA.ui._view.q.templateId));
      const aa = await page.evaluate(() => GISA.ui._view.q.answerIndex);
      await page.click('.choice[data-i="' + aa + '"]');
      await page.click('#next');
    }
    check(seenT.size >= 2 && [...seenT].every((t) => ['ohm-current', 'ohm-voltage', 'ohm-resistance'].includes(t)), '단락 전체 반복은 그 단락 포인트만 섞어서: ' + [...seenT].join(','));
    await page.click('#drill-exit');
    await page.click('#unit-next');
    check((await page.evaluate(() => GISA.ui._view.unitCid)) === 'series', '다음 단락으로 이동');
    await page.evaluate(() => GISA.ui._openLesson('l-power'));
    await page.click('#lesson-units');
    check((await page.evaluate(() => GISA.ui._view.unitCid)) === 'power', '레슨에서 포인트별 반복으로 이동');
    check(await page.evaluate(() => GISA.progress.isUnlocked(GISA.ui._state(), 'power')), '레슨을 읽으면 개념이 열림');
    await page.click('#tab-practice');

    // 읽던 자리 기억: 단락 아래쪽 포인트에서 반복을 시작했다가 돌아오면 그 자리로
    await page.evaluate(() => GISA.ui._openUnit('ac-power'));
    await page.evaluate(() => document.querySelectorAll('.point-card')[3].scrollIntoView());
    const y1 = await page.evaluate(() => window.scrollY);
    check(y1 > 800, '4번째 포인트까지 내려감 (scrollY ' + y1 + ')');
    await page.click('[data-drill="acp-pf"]');
    check((await page.evaluate(() => window.scrollY)) < 50, '연습 화면은 맨 위에서 시작');
    await page.click('#drill-exit');
    const y2 = await page.evaluate(() => window.scrollY);
    check(Math.abs(y2 - y1) <= 60, '반복하다 단락으로 돌아오면 읽던 자리로 (' + y1 + ' → ' + y2 + ')');
    check(await page.evaluate(() => { const r = document.querySelectorAll('.point-card')[3].getBoundingClientRect(); return r.top > -40 && r.top < 844; }), '돌아온 화면에 읽던 포인트 카드가 보임');
    // 탭을 갔다 와도 같은 자리
    await page.click('#tab-practice');
    await page.click('#tab-units');
    const y3 = await page.evaluate(() => window.scrollY);
    check(Math.abs(y3 - y1) <= 60, '다른 탭에 갔다 와도 읽던 자리 (' + y1 + ' → ' + y3 + ')');
    // 단락 목록을 다시 눌러 목록으로 갔다가 다른 단락을 열면 맨 위
    await page.click('#tab-units');
    await page.click('.lesson-row[data-unit="rlc"]');
    check((await page.evaluate(() => window.scrollY)) < 5, '다른 단락은 맨 위에서 시작');
    // 레슨도 같은 방식
    await page.evaluate(() => GISA.ui._openLesson('l-acpower'));
    await page.evaluate(() => document.querySelector('#lesson-practice').scrollIntoView({ block: 'center' }));
    const y4 = await page.evaluate(() => window.scrollY);
    check(y4 > 300, '레슨 아래쪽 버튼까지 내려감 (scrollY ' + y4 + ')');
    await page.click('#lesson-practice');
    await page.click('#tab-learn');
    const y5 = await page.evaluate(() => window.scrollY);
    check(Math.abs(y5 - y4) <= 60, '레슨도 문제 풀고 돌아오면 읽던 자리 (' + y4 + ' → ' + y5 + ')');
    await page.click('#tab-practice');

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

  // ── 2-3. PC 오른쪽 AI 패널 ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, colorScheme: 'light' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      window.__asked = [];
      const fake = async (input, opts) => {
        window.__asked.push(input);
        await new Promise((r) => setTimeout(r, 30));
        const text = '가짜 답변 ' + window.__asked.length;
        opts.onText({ text, delta: text });
        return { text, truncated: false, modelTierApplied: 'default' };
      };
      window.claude = { use: async (n) => (n === 'sample' ? fake : null) };
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(FILE);
    await page.waitForSelector('#side .side-head');
    const done = (n) => page.waitForFunction((k) => document.querySelectorAll('#side .ai-msg.ai:not(.pending)').length >= k, n);
    const promptOf = (i) => page.evaluate((k) => window.__asked[k][0].content, i);

    check(await page.isVisible('#side'), 'PC에서 오른쪽 AI 패널 표시');
    check(await page.evaluate(() => document.body.classList.contains('has-side')), '본문 오른쪽 자리 확보(has-side)');
    check(await page.evaluate(() => document.querySelector('#view').getBoundingClientRect().right <= 1280 - 380 + 1 && document.querySelector('#bar').getBoundingClientRect().right <= 1280 - 380 + 1), '본문·상단 바가 패널과 겹치지 않음');
    check(await noOverflow(page), 'PC 패널 가로 넘침');

    // 문제 화면: 인라인 상자 대신 오른쪽 패널, 정답 숨김 규칙
    await page.evaluate(() => GISA.ui._load('t:ohm-current#3'));
    check((await page.$$('.ai-box')).length === 0, 'PC에서는 문제 아래 접힌 상자가 없음');
    check((await page.textContent('#side .side-ctx')).includes('문제 · 옴의 법칙'), '패널이 지금 문제를 보고 있음');
    const chips = await page.$$eval('#side .ai-chip', (bs) => bs.map((b) => b.textContent));
    check(chips.includes('힌트만 줘'), '풀기 전 프리셋');
    await page.click('#side .ai-chip');
    await done(1);
    const p0 = await promptOf(0);
    check(p0.includes('정답 값이나 정답 번호를 절대') && p0.includes('개념: 옴의 법칙') && p0.includes('[화면 데이터]'), '풀기 전엔 정답 숨김 규칙 + 화면 데이터 전달');

    // 답을 고르면 프리셋과 규칙이 바뀜
    const a = await page.evaluate(() => GISA.ui._view.q.answerIndex);
    await page.click('.choice[data-i="' + ((a + 1) % 4) + '"]');
    const chips2 = await page.$$eval('#side .ai-chip', (bs) => bs.map((b) => b.textContent));
    check(chips2.includes('내가 고른 답은 왜 틀려?'), '오답 뒤 프리셋 바뀜');
    await page.click('#side .ai-chip');
    await done(2);
    check((await promptOf(1)).includes('학생이 고른 답') && (await promptOf(1)).includes('이미 답을 골랐어'), '답 고른 뒤 규칙 전환');

    // 레슨으로 이동해도 대화가 이어지고, 화면 맥락이 바뀜
    await page.evaluate(() => GISA.ui._openLesson('l-acpower'));
    check((await page.textContent('#side .side-ctx')).includes('레슨 · 유효·무효·피상전력과 역률'), '레슨 화면으로 맥락 전환');
    check((await page.$$('#side .ai-msg')).length === 4, '탭을 옮겨도 대화가 남아 있음');
    await page.fill('#ai-side-input', '역률이 뭐야?');
    await page.press('#ai-side-input', 'Enter');
    await done(3);
    const p2 = await promptOf(2);
    check(p2.includes('레슨: 유효·무효·피상전력과 역률') && p2.includes('시험 포인트:'), '레슨 내용이 전달됨');
    check((await page.inputValue('#ai-side-input')) === '', '보낸 뒤 입력칸 비움');

    // 단락 화면
    await page.evaluate(() => GISA.ui._openUnit('rlc'));
    check((await page.textContent('#side .side-ctx')).includes('단락 · R-L-C 직렬 임피던스'), '단락 화면으로 맥락 전환');
    await page.click('#side .ai-chip');
    await done(4);
    check((await promptOf(3)).includes('문제 포인트:') && (await promptOf(3)).includes('R-L-C 직렬 임피던스'), '단락의 포인트 목록이 전달됨');

    // 목록·기록 화면: 일반 질문 + 기록 요약
    await page.click('#tab-stats');
    check((await page.textContent('#side .side-ctx')).includes('기록'), '기록 화면으로 맥락 전환');
    await page.click('#side .ai-chip');
    await done(5);
    check((await promptOf(4)).includes('학생 기록 요약'), '일반 화면에선 기록 요약이 전달됨');
    await page.screenshot({ path: path.join(SHOTS, '14-pc-side-panel.png'), fullPage: false });

    // 대화 지우기
    await page.click('#side .side-head .btn');
    check((await page.$$('#side .ai-msg')).length === 0 && (await page.isVisible('#side .ai-hint')), '대화 지우기');

    // 화면 폭이 좁아지면 패널 대신 문제 아래 상자
    await page.evaluate(() => GISA.ui._load('t:ohm-current#3'));
    await page.setViewportSize({ width: 700, height: 860 });
    check(!(await page.isVisible('#side')), '좁은 화면에선 오른쪽 패널 숨김');
    await page.waitForSelector('.ai-box');
    check(true, '좁아지면 인라인 상자로 전환');
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.waitForFunction(() => document.querySelectorAll('.ai-box').length === 0);
    check(await page.isVisible('#side'), '다시 넓어지면 오른쪽 패널로 복귀');
    check(errors.length === 0, 'PC 패널 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-4. 기기 간 기록 동기화 (가짜 서버 저장소를 두 기기가 같이 씀) ──
  {
    const server = new Map(); // 경로 → 문서. 계정(id)이 경로에 들어 있어 다른 계정과 섞이지 않는지도 같이 확인
    const device = async (uid, opts) => {
      const ctx = await browser.newContext(Object.assign({ colorScheme: 'light' }, iphone)); // 새 컨텍스트 = 새 기기(localStorage 따로)
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      await ctx.exposeFunction('__dbGet', async (path) => (server.has(path) ? JSON.parse(JSON.stringify(server.get(path))) : null));
      await ctx.exposeFunction('__dbSet', async (path, data) => {
        server.set(path, data);
      });
      await ctx.addInitScript((cfg) => {
        const db = {
          doc: (path) => ({
            get: async () => {
              const v = await window.__dbGet(path);
              return { exists: v !== null, data: () => v || undefined };
            },
            set: async (d) => {
              if (cfg.readonly) throw { code: 'invalid_argument', message: 'read only' };
              await window.__dbSet(path, JSON.parse(JSON.stringify(d)));
            },
          }),
        };
        window.claude = { use: async (n) => (n === 'db' ? db : n === 'user' ? { id: async () => cfg.uid } : null) };
      }, { uid, readonly: !!(opts && opts.readonly) });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(FILE);
      await page.waitForSelector('#bar .tab');
      await page.waitForFunction(() => GISA.sync.status().state !== 'starting' && GISA.sync.status().state !== 'syncing');
      return { ctx, page };
    };
    const errors = [];
    const answer = async (page, key, correct) => {
      await page.evaluate((k) => GISA.ui._load(k), key);
      const a = await page.evaluate(() => GISA.ui._view.q.answerIndex);
      await page.click('.choice[data-i="' + (correct ? a : (a + 1) % 4) + '"]');
    };
    const st = (page) => page.evaluate(() => JSON.parse(JSON.stringify(GISA.ui._state())));
    const doc = (uid) => server.get('data/users/' + uid + '/save');
    const stored = (uid) => (doc(uid) ? JSON.parse(doc(uid).json) : null);
    const sync = (page) => page.evaluate(() => GISA.sync.syncNow().then(() => GISA.sync.status().state));

    // 기기 A: 처음 열면 연결되고, 푼 기록이 서버로 올라감
    const A = await device('u-test');
    check((await A.page.evaluate(() => GISA.sync.status().state)) === 'ok', '로그인한 상태로 열면 동기화 연결됨');
    check((await A.page.textContent('#sync-dot')).includes('☁✓'), '상단에 동기화됨 표시');
    for (let i = 1; i <= 3; i++) await answer(A.page, 't:ohm-current#' + i, true);
    check((await sync(A.page)) === 'ok', 'A 동기화 성공');
    check(stored('u-test') && stored('u-test').total.n === 3 && stored('u-test').concepts.ohm.n === 3, '푼 기록이 서버에 올라감');
    check(!JSON.stringify(stored('u-test').settings).includes('theme'), '기기별 설정(테마)은 서버에 안 올라감');

    // 기기 B: 새 기기에서 열면 A의 기록을 받아 옴
    const B = await device('u-test');
    check((await st(B.page)).total.n === 3, '새 기기에서 열면 기록을 받아 옴');
    check((await st(B.page)).points['ohm-current'].streak === 3, '포인트 기록(익숙해짐)도 받아 옴');
    check(await B.page.isVisible('#sync-dot'), 'B 상단 표시');
    // B에서 이어서 풀고 올림
    await answer(B.page, 't:ohm-voltage#1', true);
    await answer(B.page, 't:ohm-voltage#2', true);
    await sync(B.page);
    check(stored('u-test').total.n === 5, 'B가 이어 푼 기록이 서버에 반영');
    // A가 돌아오면(앱을 다시 열거나 화면으로 복귀) 최신 기록을 받음 + 합쳤다는 알림
    await sync(A.page);
    check((await st(A.page)).total.n === 5 && (await st(A.page)).concepts.ohm.n === 5, 'A가 B의 기록을 받아 옴');
    check(await A.page.isVisible('.toast:has-text("합쳤어")'), '다른 기기 기록과 합쳤다는 알림');

    // 각자 따로 틀린 문제: 복습 일정이 양쪽에서 합쳐짐
    await answer(A.page, 't:ohm-current#50', false);
    await answer(B.page, 't:ohm-voltage#60', false);
    const keyA = 't:ohm-current#50';
    const keyB = 't:ohm-voltage#60';
    await sync(B.page);
    await sync(A.page);
    await sync(B.page);
    const ra = Object.keys((await st(A.page)).reviews);
    const rb = Object.keys((await st(B.page)).reviews);
    check(ra.includes(keyA) && ra.includes(keyB) && rb.includes(keyA) && rb.includes(keyB), '따로 틀린 복습 문제가 두 기기에 모두 남음');
    check((await st(A.page)).total.n === (await st(B.page)).total.n && (await st(A.page)).total.n >= 6, '두 기기 총계가 같아짐');

    // 변경이 없으면 다시 올리지 않음(쓰기 최소화)
    const before = JSON.stringify(doc('u-test'));
    await sync(A.page);
    check(JSON.stringify(doc('u-test')) === before, '바뀐 게 없으면 서버에 다시 쓰지 않음');

    // 자동 동기화: 푼 뒤 몇 초 지나면 알아서 올라감
    await answer(A.page, 't:ohm-current#70', true);
    for (let i = 0; i < 40 && stored('u-test').total.n < 7; i++) await new Promise((r) => setTimeout(r, 250));
    check(stored('u-test').total.n >= 7, '푼 뒤 몇 초 안에 자동으로 서버에 올라감');

    // 다른 계정은 섞이지 않음
    const C = await device('u-other');
    check((await st(C.page)).total.n === 0, '다른 계정은 기록이 비어 있음');
    await answer(C.page, 't:ohm-current#1', true);
    await sync(C.page);
    check(stored('u-other').total.n === 1 && stored('u-test').total.n >= 7, '계정별로 따로 저장됨');
    await C.ctx.close();

    // 설정 화면: 상태·켜고 끄기
    await B.page.click('#tab-settings');
    check((await B.page.textContent('#sync-status')).includes('연결돼 있어'), '설정에 연결 상태 표시');
    check(await B.page.isVisible('#sync-now'), '지금 동기화 버튼');
    await B.page.screenshot({ path: path.join(SHOTS, '15-iphone-sync-settings.png'), fullPage: true });
    await sync(B.page); // 먼저 최신으로 맞춘 뒤
    await B.page.uncheck('#sync-on');
    check((await B.page.evaluate(() => GISA.sync.status().state)) === 'off', '자동 동기화 끄기');
    const nBefore = stored('u-test').total.n;
    await answer(B.page, 't:ohm-voltage#90', true);
    await sync(B.page);
    check(stored('u-test').total.n === nBefore, '끄면 서버에 올리지 않음');
    await B.page.click('#tab-settings');
    await B.page.check('#sync-on');
    check((await sync(B.page)) === 'ok' && stored('u-test').total.n > nBefore, '다시 켜면 밀린 기록이 올라감');

    // 초기화: 서버와 다른 기기에서도 지워지고, 예전 기록이 되살아나지 않음
    await B.page.click('#tab-settings');
    await B.page.click('#reset');
    await B.page.click('#reset-confirm');
    await sync(B.page);
    check(stored('u-test').total.n === 0 && stored('u-test').resetAt > 0, '초기화가 서버에 반영');
    await sync(A.page);
    check((await st(A.page)).total.n === 0 && Object.keys((await st(A.page)).reviews).length === 0, '다른 기기에서도 초기화됨(예전 기록이 되살아나지 않음)');
    await sync(B.page);
    check((await st(B.page)).total.n === 0, '초기화 뒤 다시 동기화해도 0 유지');
    await A.ctx.close();
    await B.ctx.close();

    // 보기 전용 계정: 저장 권한이 없으면 안내만 하고 앱은 정상 동작
    const R = await device('u-viewer', { readonly: true });
    check((await R.page.evaluate(() => GISA.sync.status().state)) === 'readonly', '권한 없으면 읽기 전용 상태');
    await answer(R.page, 't:ohm-current#1', true);
    check((await st(R.page)).total.n === 1, '권한이 없어도 기록은 이 기기에 저장됨');
    await R.page.click('#tab-settings');
    check((await R.page.textContent('#sync-status')).includes('권한'), '권한 안내 표시');
    await R.ctx.close();
    check(errors.length === 0, '동기화 오류: ' + errors.join(' | '));
  }

  // 파일로 열었을 때(claude 없음): 동기화 설명만 보이고 정상 동작
  {
    const { ctx, page, errors } = await newPage(browser, Object.assign({ colorScheme: 'light' }, iphone));
    await page.click('#tab-settings');
    check((await page.textContent('#sync-status')).includes('쓸 수 없어'), '파일로 열면 동기화 안내');
    check(!(await page.isVisible('#sync-on')), '파일로 열면 동기화 스위치 숨김');
    check(errors.length === 0, '파일 모드 오류: ' + errors.join(' | '));
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
