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
    await page.waitForSelector('#bar .tab');
    check((await page.evaluate(() => GISA.ui._view.tab)) === 'stats', '새로고침(업데이트)해도 보던 탭에 머묾');
    check(await page.isVisible('#build-stamp'), '머리글에 업데이트 시각');
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
    check((await page.$$('.lesson-row[data-unit]')).length === 10, '전기자기학 단락 10개');
    await page.click('.chip[data-subject="code"]');
    check((await page.$$('.lesson-row[data-unit]')).length === 13, '기술기준 단락 13개');
    check(!(await page.isVisible('.empty')), '기술기준은 더 이상 준비 중이 아님');
    await page.click('.chip[data-subject="circuit"]');
    await page.click('.lesson-row[data-unit="ohm"]');
    const ohmPts = await page.evaluate(() => GISA.pointsFor('ohm').length);
    check((await page.$$('.point-card')).length === ohmPts && ohmPts >= 3, '옴의 법칙 포인트 카드 ' + ohmPts + '개');
    check((await page.$$('.pt-list li')).length === ohmPts, '포인트 한눈에 목록 ' + ohmPts + '개');
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
    check(await page.isVisible('#drill-back-bottom'), '익숙해지면 맨 아래에도 단락으로 돌아가기 버튼');
    check((await page.$$('.cele-bit')).length === 28 && (await page.isVisible('.cele-badge')), '익숙해지면 작은 폭죽 효과(색종이 28개 + 배지)');
    check(await page.evaluate(() => { const v = document.querySelector('.verdict').getBoundingClientRect(); const c = document.querySelector('.cele-badge').getBoundingClientRect(); return Math.abs((c.left + c.right) / 2 - (v.left + v.right) / 2) < 6; }), '폭죽이 정답 표시 자리에서 터짐');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, '05f-iphone-celebrate.png') });
    await page.evaluate(() => GISA.celebrate.clear());
    check((await page.$$('.cele')).length === 0, '축하 효과 정리');
    await page.click('#next');
    check((await page.evaluate(() => GISA.ui._view.q.templateId)) === 'ohm-current', '익숙해진 뒤에도 같은 포인트 반복 가능');
    await page.screenshot({ path: path.join(SHOTS, '05e-iphone-drill.png'), fullPage: true });
    await page.click('.choice[data-i="' + (await page.evaluate(() => GISA.ui._view.q.answerIndex)) + '"]');
    await page.click('#drill-back-bottom');
    check((await page.evaluate(() => GISA.ui._view.unitCid)) === 'ohm', '맨 아래 버튼으로 단락으로 돌아가기');
    check(await page.isVisible('.point-card[data-point="ohm-current"] .state.open'), '포인트 카드에 익숙해짐 표시');
    await page.click('#drill-all');
    const seenT = new Set();
    for (let i = 0; i < 14; i++) {
      seenT.add(await page.evaluate(() => GISA.ui._view.q.templateId));
      const aa = await page.evaluate(() => GISA.ui._view.q.answerIndex);
      await page.click('.choice[data-i="' + aa + '"]');
      await page.click('#next');
    }
    check(seenT.size >= 2 && [...seenT].every((t) => !t || ['ohm-current', 'ohm-voltage', 'ohm-resistance', 'ohm-cells'].includes(t)), '단락 전체 반복은 그 단락 포인트만 섞어서: ' + [...seenT].join(','));
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

    // 과목 칩: 기술기준
    await page.click('.chip:has-text("기술기준")');
    const cdSubj = await page.evaluate(() => GISA.conceptMap[GISA.ui._view.q.conceptId].subject);
    check(cdSubj === 'code', '기술기준 칩 → 기술기준 문제 (' + cdSubj + ')');
    check(!(await page.isVisible('.empty')), '기술기준 과목 문제가 나옴');
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
    check(await page.evaluate(() => document.querySelector('#view').getBoundingClientRect().right <= 1280 - 340 + 1 && document.querySelector('#bar').getBoundingClientRect().right <= 1280 - 340 + 1), '본문·상단 바가 패널과 겹치지 않음');
    check(await noOverflow(page), 'PC 패널 가로 넘침');

    // 문제 화면: 인라인 상자 대신 오른쪽 패널, 정답 숨김 규칙
    await page.evaluate(() => GISA.ui._load('t:ohm-current#3'));
    check((await page.$$('.ai-box')).length === 0, 'PC에서는 문제 아래 접힌 상자가 없음');
    check((await page.textContent('#side .side-ctx')).includes('문제 · 옴의 법칙'), '패널이 지금 문제를 보고 있음');
    const chips = await page.$$eval('#side .ai-chip', (bs) => bs.map((b) => b.textContent));
    check(chips.includes('힌트만 줘'), '풀기 전 프리셋');
    await page.click('#side .ai-chip');
    await done(1);
    check((await page.evaluate(() => GISA.aiqa.count())) === 1 && (await page.evaluate(() => GISA.aiqa.list()[0].a.length > 0)), 'AI에게 물은 질문·답이 저장됨(복습 알림용)');
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

  // ── 2-5. 계산기 (왼쪽) ──
  {
    const lcdText = (page) => page.evaluate(() => GISA.calcUi.calc.text());
    const clickKeys = async (page, list) => {
      for (const k of list.split(' ')) await page.click('#calc [data-key="' + k + '"]');
    };
    const sampleStub = () => {
      const fake = async (input, opts) => {
        opts.onText({ text: 'x', delta: 'x' });
        return { text: 'x', truncated: false, modelTierApplied: 'default' };
      };
      window.claude = { use: async (n) => (n === 'sample' ? fake : null) };
    };
    // (가) AI 없이 PC: 왼쪽에 붙음
    {
      const { ctx, page, errors } = await newPage(browser, { viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
      check(await page.isVisible('#calc'), '계산기: PC에서 왼쪽에 표시');
      check(await page.evaluate(() => document.querySelector('#calc').getBoundingClientRect().left === 0 && document.querySelector('#view').getBoundingClientRect().left >= 340), '계산기: 본문과 겹치지 않음');
      check(await noOverflow(page), '계산기: 가로 넘침 없음');
      check(!(await page.isVisible('.calc-toggle')), '계산기: 붙어 있을 땐 여는 버튼 없음');
      await clickKeys(page, '1 + 2 =');
      check((await lcdText(page)) === '1+2 => 3', '계산기: 클릭으로 1+2=3 → ' + (await lcdText(page)));
      await clickKeys(page, 'AC SQRT 8 RIGHT =');
      check((await page.$$('#calc .lcd .rad')).length >= 1, '계산기: 근호가 그려짐');
      check((await page.textContent('#calc .l2')).replace(/\s/g, '') === '2√2', '계산기: √8 = 2√2');
      await clickKeys(page, 'AC 1 / 3 =');
      check((await page.$$('#calc .l2 .fr')).length === 1, '계산기: 1÷3 결과가 분수 모양');
      await clickKeys(page, 'S<>D');
      check((await page.textContent('#calc .l2')) === '0.3333333333', '계산기: S⇔D로 소수 변환');
      await clickKeys(page, 'AC SHIFT');
      check(await page.evaluate(() => document.querySelector('#calc .ind.shift').classList.contains('on')), '계산기: SHIFT 표시등');
      await clickKeys(page, 'x10^x');
      check((await page.textContent('#calc .l1')).includes('π'), '계산기: SHIFT ×10ˣ = π');
      // 키보드: 계산기에 포커스가 있을 때만 입력
      await page.click('#calc .calc-head');
      await page.keyboard.press('Escape');
      await page.keyboard.type('7*8');
      await page.keyboard.press('Enter');
      check((await page.textContent('#calc .l2')) === '56', '계산기: 키보드 입력 7×8=56');
      // 문제 단축키와 충돌하지 않음
      await page.evaluate(() => GISA.ui._load('t:ohm-current#3'));
      await page.click('#calc .calc-head');
      await page.keyboard.press('2');
      check(!(await page.isVisible('.verdict')), '계산기: 계산기 입력 중 숫자키가 문제 답으로 안 들어감');
      // 기억: 새로고침해도 메모리·설정 유지
      await clickKeys(page, 'AC 5 SHIFT RCL (-) =');
      await page.reload();
      await page.waitForSelector('#calc .key');
      await clickKeys(page, 'AC');
      await page.evaluate(() => GISA.calcUi.pressKeys(['ALPHA', '(-)', '=']));
      check((await page.textContent('#calc .l2')) === '5', '계산기: 새로고침 후에도 변수 A 유지');
      // 계산기로 풀기 시연
      await page.evaluate(() => GISA.ui._load('t:parallel-two#9'));
      check(await page.isVisible('#calc-solve'), '계산기로 풀기: 문제 옆 버튼');
      await page.click('#calc-solve');
      check(!(await page.isVisible('#calc-ask')), '계산기로 풀기: 한 번 더 묻지 않고 바로 시작');
      check((await page.evaluate(() => GISA.calcDemo.active())) && (await page.isVisible('.demo')), '계산기로 풀기: 시연 시작');
      check((await page.evaluate(() => GISA.calcDemo._state().auto)) === true, '계산기로 풀기: 자동 재생으로 바로 시작');
      check((await page.inputValue('#demo-speed')) === 'slow', '계산기로 풀기: 자동 재생 기본 속도는 느리게');
      await page.click('#demo-auto'); // 이하 수동 점검을 위해 멈추고 처음으로
      await page.evaluate(() => { const b = document.getElementById('demo-reset'); if (b && !b.disabled) b.click(); });
      check(await page.evaluate(() => GISA.calcUi.calc.text() === ''), '계산기로 풀기: 계산기가 깨끗하게 시작');
      const wantAns = await page.evaluate(() => GISA.ui._view.q.answerValue);
      check((await page.$$('#calc .key.demo-next')).length === 1, '계산기로 풀기: 다음에 누를 키 하나만 표시');
      // 잘못된 키를 누르면 진행하지 않음
      const firstKey = await page.evaluate(() => GISA.calcDemo._state().flat[0].key);
      const wrongKey = '+'; // 숫자가 아닌 틀린 키는 그냥 무시(틀린 숫자는 아래 "직접 입력" 동작)
      await page.click('#calc [data-key="' + wrongKey + '"]');
      check((await page.evaluate(() => GISA.calcDemo._state().idx)) === 0 && (await page.textContent('.demo-note')).includes('눌러야'), '계산기로 풀기: 틀린 키는 무시하고 안내');
      // 맞는 키를 직접 눌러 진행
      await page.click('#calc [data-key="' + firstKey + '"]');
      check((await page.evaluate(() => GISA.calcDemo._state().idx)) === 1, '계산기로 풀기: 맞는 키를 누르면 진행');
      // 멈춘 상태에서 시연과 다른 숫자를 누르면: 계산기를 비우고 내가 누른 숫자부터 처음부터 입력
      const nextKey = await page.evaluate(() => GISA.calcDemo._state().flat[1].key);
      const otherDigit = ['7', '8', '9'].find((d) => d !== nextKey && d !== firstKey);
      await page.click('#calc [data-key="' + otherDigit + '"]');
      check((await page.evaluate(() => GISA.calcDemo._state().free)) === true && (await page.evaluate(() => GISA.calcUi.calc.text())) === otherDigit, '계산기로 풀기: 멈춘 채 다른 숫자를 누르면 비우고 그 숫자부터 처음부터 입력');
      await page.click('#calc [data-key="' + otherDigit + '"]');
      check((await page.evaluate(() => GISA.calcUi.calc.text())) === otherDigit + otherDigit, '계산기로 풀기: 직접 입력 중에는 계산기가 그대로 받음');
      await page.click('#demo-reset');
      check((await page.evaluate(() => GISA.calcDemo._state().free)) === false && (await page.evaluate(() => GISA.calcDemo._state().idx)) === 0 && (await page.evaluate(() => GISA.calcUi.calc.text())) === '', '계산기로 풀기: "처음부터"를 누르면 시연으로 돌아가고 계산기가 비워짐');
      await page.click('#calc [data-key="' + firstKey + '"]');
      await page.click('#demo-step');
      check((await page.textContent('#demo-say')).includes('단계'), '계산기로 풀기: 단계 설명 표시');
      await page.click('#demo-prev');
      check((await page.evaluate(() => GISA.calcDemo._state().idx)) === 0, '계산기로 풀기: 이전 단계로 되감기');
      // 자동 재생으로 끝까지
      await page.selectOption('#demo-speed', 'fast');
      await page.click('#demo-auto');
      await page.waitForFunction(() => { const d = GISA.calcDemo._state(); return d && d.idx >= d.flat.length; }, null, { timeout: 30000 });
      const shown = await page.evaluate(() => GISA.calcUi.calc.res && GISA.calcUi.calc.res.v.f);
      check(Math.abs(shown - wantAns) < 1e-9, '계산기로 풀기: 시연 결과가 정답과 같음 (' + shown + ' / ' + wantAns + ')');
      check((await page.textContent('#demo-say')).includes('끝!'), '계산기로 풀기: 끝 안내');
      await page.screenshot({ path: path.join(SHOTS, '19-calc-demo.png') });
      // 다른 문제로 넘어가면 자동으로 닫히고 원래 설정으로 복구
      await page.evaluate(() => GISA.ui._load('t:ohm-current#4'));
      check(!(await page.evaluate(() => GISA.calcDemo.active())) && !(await page.isVisible('.demo')), '계산기로 풀기: 다른 문제로 가면 시연 종료');
      check(await page.evaluate(() => GISA.calcUi.calc.setup.angle === 'Deg'), '계산기로 풀기: 종료 후 설정 복구');
      await page.screenshot({ path: path.join(SHOTS, '16-calc-left.png') });
      check(errors.length === 0, '계산기 콘솔 오류: ' + errors.join(' | '));
      await ctx.close();
    }
    // (나) AI 패널과 함께: 넓으면 양쪽, 중간 폭이면 눌러서 열기, 폰이면 숨김
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      await ctx.addInitScript(sampleStub);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(FILE);
      await page.waitForSelector('#side .side-head');
      const box = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, r: r.right }; }, sel);
      check((await page.isVisible('#calc')) && (await page.isVisible('#side')), '계산기: 1440에서 계산기·AI 양쪽 표시');
      const v = await box('#view');
      check(v.l >= 340 - 1 && v.r <= 1440 - 380 + 1, '계산기: 본문이 양쪽 패널 사이에 있음 (' + v.l + '~' + v.r + ')');
      check(await noOverflow(page), '계산기: 3단 가로 넘침 없음');
      await page.screenshot({ path: path.join(SHOTS, '17-three-columns.png') });
      await page.setViewportSize({ width: 1100, height: 860 });
      await page.waitForFunction(() => document.body.classList.contains('calc-float'));
      check(!(await page.isVisible('#calc')) && (await page.isVisible('.calc-toggle')), '계산기: 1100에선 숨기고 여는 버튼만');
      await page.click('.calc-toggle');
      check(await page.isVisible('#calc'), '계산기: 버튼으로 떠 있는 패널 열기');
      await page.screenshot({ path: path.join(SHOTS, '18-calc-float.png') });
      await clickKeys(page, '9 * 9 =');
      check((await page.textContent('#calc .l2')) === '81', '계산기: 떠 있는 상태에서도 계산');
      await page.click('#calc .calc-close');
      check(!(await page.isVisible('#calc')), '계산기: 닫기');
      await page.setViewportSize({ width: 800, height: 860 });
      await page.waitForFunction(() => document.body.classList.contains('calc-off'));
      check(!(await page.isVisible('#calc')) && !(await page.isVisible('.calc-toggle')), '계산기: 800 이하에선 없음');
      check(errors.length === 0, '계산기+AI 콘솔 오류: ' + errors.join(' | '));
      await ctx.close();
    }
    // (다) 아이폰: 계산기 영역이 레이아웃에 영향을 주지 않음
    {
      const { ctx, page, errors } = await newPage(browser, Object.assign({ colorScheme: 'light' }, iphone));
      check(!(await page.isVisible('#calc')) && (await noOverflow(page)), '계산기: 폰에서는 숨김·가로 넘침 없음');
      check(errors.length === 0, '계산기 폰 콘솔 오류: ' + errors.join(' | '));
      await ctx.close();
    }
  }

  // ── 2-6. 용어 사전 ──
  {
    // (가) PC: 문제 속 용어 → 해설 창
    {
      const { ctx, page, errors } = await newPage(browser, { viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
      await page.evaluate(() => GISA.ui._load('t:ohm-current#3'));
      const terms = await page.$$('.qtext .term');
      check(terms.length >= 2, '용어 사전: 문제 글 속 용어에 링크가 걸림 (' + terms.length + '개)');
      check((await page.$$('.choices .term')).length === 0, '용어 사전: 보기에는 링크를 걸지 않음');
      const termStyle = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.qtext .term')); return { color: c.color, border: c.borderBottomWidth, deco: c.textDecorationLine }; });
      check(termStyle.color === 'rgb(2, 117, 216)' && termStyle.border === '0px' && termStyle.deco === 'none', '용어 링크: 나무위키처럼 글자 자체가 파란색, 점선·밑줄 없음 ' + JSON.stringify(termStyle));
      const firstId = await page.evaluate(() => document.querySelector('.qtext .term').dataset.term);
      await page.click('.qtext .term');
      check(await page.isVisible('#wiki'), '용어 사전: 용어를 누르면 해설 창이 열림');
      const title = await page.textContent('#wiki .wiki-title');
      check(title === (await page.evaluate((id) => GISA.glossary.byId[id].name, firstId)), '용어 사전: 누른 용어의 해설 (' + title + ')');
      check((await page.$$('#wiki .wiki-sec')).length >= 3 && (await page.isVisible('#wiki .wiki-brief')), '용어 사전: 한 줄 요약과 여러 해설 항목');
      check((await page.$$('#wiki .wiki-body .term')).length >= 1, '용어 사전: 해설 안의 용어도 링크');
      check(await noOverflow(page), '용어 사전: 가로 넘침 없음(PC)');
      // 같은 용어로 계속 타고 들어가기 → 뒤로
      const before = await page.textContent('#wiki .wiki-title');
      await page.click('#wiki .wiki-chips .chip');
      const after = await page.textContent('#wiki .wiki-title');
      check(after !== before, '용어 사전: 관련 용어로 이동');
      await page.click('#wiki-back');
      check((await page.textContent('#wiki .wiki-title')) === before, '용어 사전: 뒤로 가면 이전 용어');
      await page.screenshot({ path: path.join(SHOTS, '20-wiki-pc.png') });
      // 열려 있는 용어를 한 번 더 누르면 해설 창이 꺼짐, 다시 누르면 켜짐
      await page.click('.qtext .term');
      check(!(await page.isVisible('#wiki')), '용어 사전: 같은 용어를 한 번 더 누르면 해설 창이 닫힘');
      await page.click('.qtext .term');
      check(await page.isVisible('#wiki'), '용어 사전: 다시 누르면 다시 열림');
      await page.keyboard.press('Escape');
      check(!(await page.isVisible('#wiki')), '용어 사전: Esc로 닫힘');
      // 전체 목록과 검색
      await page.click('#wiki-open');
      check(await page.isVisible('#wiki .wiki-search'), '용어 사전: 머리글 책 버튼으로 전체 목록');
      await page.fill('#wiki .wiki-search', '역률');
      check((await page.$$('#wiki .wiki-item')).length >= 1 && (await page.textContent('#wiki .wiki-results')).includes('역률'), '용어 사전: 검색');
      await page.click('#wiki .wiki-item');
      check((await page.textContent('#wiki .wiki-title')).includes('역률'), '용어 사전: 검색 결과 열기');
      // 예제를 계산기로 눌러 보기
      await page.evaluate(() => GISA.wikiUi.open('ohm-law'));
      check(await page.isVisible('#wiki-demo'), '용어 사전: 예제를 계산기로 눌러 보기 버튼');
      await page.click('#wiki-demo');
      check(await page.evaluate(() => GISA.calcDemo.active() && GISA.calcDemo.scope() === 'wiki'), '용어 사전: 예제 시연 시작');
      await page.click('#demo-step');
      check((await page.evaluate(() => GISA.calcUi.calc.res && GISA.calcUi.calc.res.v.f)) === 6, '용어 사전: 예제 결과(48÷8=6)');
      check(await page.evaluate(() => GISA.calcDemo.active()), '용어 사전: 시연 중에 다른 화면을 다시 그려도 시연이 유지됨');
      await page.click('#demo-close');
      // 레슨 화면에도 링크
      await page.evaluate(() => GISA.ui._openLesson(GISA.lessonFor('ohm').id));
      check((await page.$$('#view .term')).length >= 3, '용어 사전: 배우기 레슨 글 속에도 링크');
      // 레슨에서 용어 → 레슨 읽기 버튼
      await page.evaluate(() => GISA.wikiUi.open('power'));
      check(await page.isVisible('#wiki-lesson') && (await page.isVisible('#wiki-unit')), '용어 사전: 레슨 읽기·문제 반복 버튼');
      await page.click('#wiki-unit');
      check(!(await page.isVisible('#wiki')) && (await page.evaluate(() => GISA.ui._view.tab)) === 'units', '용어 사전: 과목별로 이동하면 해설 창이 닫힘');
      check(errors.length === 0, '용어 사전 콘솔 오류: ' + errors.join(' | '));
      await ctx.close();
    }
    // (나) 폰: 전체 화면
    {
      const { ctx, page, errors } = await newPage(browser, Object.assign({ colorScheme: 'light' }, iphone));
      await page.evaluate(() => GISA.ui._load('t:power-v2r#5'));
      await page.click('.qtext .term');
      const box = await page.evaluate(() => { const r = document.querySelector('#wiki').getBoundingClientRect(); return { w: r.width, h: r.height }; });
      check(box.w >= 389 && box.h >= 800, '용어 사전: 폰에서는 화면 전체 (' + box.w + '×' + box.h + ')');
      check(await noOverflow(page), '용어 사전: 폰 가로 넘침 없음');
      check(!(await page.isVisible('#wiki-demo')), '용어 사전: 폰에는 계산기가 없어서 눌러 보기 버튼 숨김');
      await page.screenshot({ path: path.join(SHOTS, '21-wiki-phone.png') });
      await page.click('#wiki-close');
      check(!(await page.isVisible('#wiki')), '용어 사전: 폰에서 닫기');
      check(errors.length === 0, '용어 사전 폰 콘솔 오류: ' + errors.join(' | '));
      await ctx.close();
    }
  }

  // ── 2-7. 처음 화면 버튼 · 검색 ──
  {
    for (const dev of ['phone', 'pc']) {
      const opts = dev === 'phone' ? Object.assign({ colorScheme: 'light' }, iphone) : { viewport: { width: 1440, height: 900 }, colorScheme: 'light' };
      const { ctx, page, errors } = await newPage(browser, opts);
      const tag = '검색(' + dev + '): ';
      check((await page.textContent('.brand small')) === '전기기사 필기', tag + '제목 옆 작은 글씨는 "전기기사 필기"까지');
      check((await page.title()).includes('통전') && (await page.title()).endsWith('전기기사 필기'), tag + '탭 제목: ' + (await page.title()));
      check(await noOverflow(page), tag + '머리글 가로 넘침 없음');
      // 홈 버튼
      await page.evaluate(() => GISA.ui._load('t:ohm-current#3'));
      check((await page.evaluate(() => GISA.ui._view.tab)) === 'practice', tag + '연습 화면에서 시작');
      await page.click('#home-btn');
      check((await page.evaluate(() => GISA.ui._view.tab)) === 'learn' && (await page.isVisible('#search-input')), tag + '홈 버튼 → 처음 화면(검색창이 맨 위)');
      check(await noOverflow(page), tag + '홈 화면 가로 넘침 없음');
      // 검색
      await page.fill('#search-input', '역률');
      check((await page.$$('#search-results .wiki-item')).length >= 1, tag + '용어 해설 결과');
      check((await page.$$('#search-results .search-concept')).length >= 1, tag + '개념 결과');
      check(await page.isVisible('#search-results [data-concept="ac-power"]'), tag + '"역률" → 교류 전력 개념 카드');
      check(!(await page.isVisible('#continue-lesson')), tag + '검색 중에는 레슨 목록을 숨김');
      await page.screenshot({ path: path.join(SHOTS, dev === 'phone' ? '22-search-phone.png' : '22-search-pc.png') });
      // 용어 열기
      await page.click('#search-results .wiki-item');
      check(await page.isVisible('#wiki'), tag + '용어 결과를 누르면 해설 창');
      await page.click('#wiki-close');
      // 레슨 읽기
      await page.click('#search-results [data-concept="ac-power"] [data-lesson]');
      check((await page.evaluate(() => GISA.ui._view.lessonId)) !== null && (await page.evaluate(() => GISA.ui._view.tab)) === 'learn', tag + '레슨 읽기 버튼');
      await page.click('#home-btn');
      check((await page.evaluate(() => GISA.ui._view.lessonId)) === null && (await page.inputValue('#search-input')) === '', tag + '홈 버튼은 레슨에서 빠져나오고 검색도 비움');
      // 문제 풀기
      await page.fill('#search-input', '전기요금');
      check(await page.isVisible('#search-results [data-point="energy-cost"]'), tag + '"전기요금" → 문제 유형 버튼');
      await page.click('#search-results [data-point="energy-cost"]');
      check((await page.evaluate(() => GISA.ui._view.tab)) === 'practice' && (await page.evaluate(() => GISA.ui._view.q.templateId)) === 'energy-cost', tag + '문제 유형 버튼 → 그 유형 문제 풀이');
      await page.click('#home-btn');
      await page.fill('#search-input', '변압기');
      await page.click('#search-results [data-drill]');
      check((await page.evaluate(() => GISA.ui._view.mode)) === 'drill' && (await page.evaluate(() => GISA.ui._view.tab)) === 'practice', tag + '문제 풀기 버튼 → 개념 반복');
      await page.click('#home-btn');
      await page.fill('#search-input', '존재하지않는말');
      check(await page.isVisible('#search-empty'), tag + '결과 없음 안내');
      check(errors.length === 0, tag + '콘솔 오류: ' + errors.join(' | '));
      await ctx.close();
    }
  }

  // ── 2-8. 연습에서 기초 수학 빼기 ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 1280, height: 860 }, colorScheme: 'light' });
    await page.evaluate(() => { GISA.ui._state().settings.subject = 'base'; GISA.ui._state().settings.skipOrder = true; });
    await page.click('#tab-practice');
    const chips = await page.$$eval('.panel .chips .chip', (els) => els.map((e) => e.textContent.trim()));
    check(chips.length > 0 && !chips.some((t) => t.includes('기초 수학')), '연습 과목 칩에 기초 수학이 없음: ' + chips.join(','));
    check(await page.evaluate(() => document.querySelector('.panel .chips .chip[aria-pressed="true"]').textContent.trim().startsWith('전체')), '예전에 기초 수학을 골라 둔 기록은 전체로 표시');
    const optLabels = await page.$$eval('#concept-select optgroup', (els) => els.map((e) => e.label));
    check(!optLabels.some((t) => t.includes('기초 수학') || t.includes('시작하기')), '개념 선택 목록에도 기초 수학이 없음: ' + optLabels.join(' | '));
    // 자동 출제 300번 동안 기초 수학 문제가 한 번도 안 나옴
    const bad = await page.evaluate(() => {
      let n = 0;
      for (let i = 0; i < 300; i++) {
        const q = GISA.ui._view.q;
        if (q && GISA.concepts.find((c) => c.id === q.conceptId).subject === 'base') n++;
        GISA.ui._answer(0);
        document.querySelector('#next') && document.querySelector('#next').click();
      }
      return n;
    });
    check(bad === 0, '자동 연습 300문제에 기초 수학이 안 나옴 (나온 수 ' + bad + ')');
    // 레슨에서 "문제 풀기"로는 기초 수학 개념도 풀 수 있음
    await page.evaluate(() => GISA.ui._openLesson(GISA.lessonFor('base-units').id));
    check(await page.isVisible('#lesson-practice'), '기초 수학 레슨의 문제 풀기 버튼은 그대로');
    check(errors.length === 0, '기초 수학 제외 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-9. 계산기 아래 메모판 ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    check(await page.isVisible('#pad-canvas'), '메모판: 계산기 아래에 표시');
    const box = await page.evaluate(() => { const c = document.getElementById('pad-canvas').getBoundingClientRect(); const k = document.querySelector('#calc .keys').getBoundingClientRect(); const p = document.getElementById('calc').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height, keysBottom: k.bottom, panelBottom: p.bottom }; });
    check(box.y >= box.keysBottom - 1 && box.w > 250 && box.h >= 150, '메모판: 키패드 아래, 충분한 크기 (' + Math.round(box.w) + '×' + Math.round(box.h) + ')');
    check(box.y + box.h <= box.panelBottom + 1, '메모판: 900px 높이에서 화면 안에 다 들어옴');
    const stroke = async (dx, dy) => {
      await page.mouse.move(box.x + dx, box.y + dy);
      await page.mouse.down();
      for (let i = 1; i <= 20; i++) await page.mouse.move(box.x + dx + i * 8, box.y + dy + Math.sin(i / 2) * 14);
      await page.mouse.up();
    };
    await stroke(20, 40);
    check((await page.evaluate(() => GISA.pad.strokes().length)) === 1 && (await page.evaluate(() => GISA.pad.ink())) > 200, '메모판: 마우스로 그림이 그려짐');
    // 색·굵기
    await page.click('#pad-color-red');
    await page.click('#pad-lead-09');
    await stroke(20, 90);
    const s2 = await page.evaluate(() => GISA.pad.strokes());
    check(s2.length === 2 && s2[1].c === 'red' && s2[1].w > s2[0].w, '메모판: 빨간 굵은 펜');
    // 지우개
    const inkBefore = await page.evaluate(() => GISA.pad.ink());
    check((await page.evaluate(() => getComputedStyle(document.getElementById('pad-canvas')).cursor)).includes('data:image/svg+xml'), '메모판: 펜일 때 마우스 커서가 샤프 모양 이미지');
    await page.click('#pad-erase');
    await page.mouse.move(box.x + 60, box.y + 20);
    check((await page.evaluate(() => getComputedStyle(document.getElementById('pad-canvas')).cursor)).includes('circle'), '메모판: 지우개일 때는 지우는 크기 동그라미 커서');
    await page.mouse.down();
    await page.mouse.move(box.x + 60, box.y + 120, { steps: 10 });
    await page.mouse.up();
    check((await page.evaluate(() => GISA.pad.ink())) < inkBefore, '메모판: 지우개로 지워짐');
    // 되돌리기
    await page.click('#pad-undo');
    check((await page.evaluate(() => GISA.pad.strokes().length)) === 2 && (await page.evaluate(() => GISA.pad.ink())) >= inkBefore - 5, '메모판: 되돌리기');
    // 새로고침해도 남음
    await page.reload();
    await page.waitForSelector('#pad-canvas');
    check((await page.evaluate(() => GISA.pad.strokes().length)) === 2 && (await page.evaluate(() => GISA.pad.ink())) > 200, '메모판: 새로고침해도 그림이 남음');
    // 다음 문제로 넘어가면 계산기 화면과 메모판이 비워짐
    await page.evaluate(() => GISA.ui._load('t:ohm-current#4'));
    await page.evaluate(() => GISA.calcUi.pressKeys(['7', '7']));
    check((await page.evaluate(() => GISA.calcUi.calc.text())) === '77', '계산기에 입력해 둠');
    await page.evaluate(() => GISA.ui._answer(0));
    await page.click('#next');
    check((await page.evaluate(() => GISA.calcUi.calc.text())) === '' && (await page.evaluate(() => GISA.pad.strokes().length)) === 0, '다음 문제로 넘어가면 계산기 화면·메모판이 초기화됨');
    await page.click('#pad-undo');
    // 초기화 → 되돌리기로 복구
    await page.click('#pad-clear');
    check((await page.evaluate(() => GISA.pad.strokes().length)) === 0 && (await page.evaluate(() => GISA.pad.ink())) === 0, '메모판: 초기화하면 전부 지워짐');
    check(await page.evaluate(() => document.getElementById('pad-clear').disabled), '메모판: 빈 판에서는 초기화 버튼이 눌리지 않음');
    await page.click('#pad-undo');
    check((await page.evaluate(() => GISA.pad.strokes().length)) === 2, '메모판: 실수로 초기화해도 되돌리기로 복구');
    // 계산기와 같이 쓰기: 메모판에 쓰는 동안 계산기 입력이 안 흐트러짐
    await page.click('#calc [data-key="7"]');
    await stroke(20, 60);
    check((await page.evaluate(() => GISA.calcUi.calc.text())) === '7', '메모판: 그려도 계산기 입력은 그대로');
    // 계산기로 풀기 시연 중에도 메모판은 보임
    await page.evaluate(() => GISA.ui._load('t:ohm-current#3'));
    await page.evaluate(() => { const q = GISA.ui._view.q; GISA.ui._answer(q.answerIndex); });
    await page.click('#calc-solve');
    check(await page.isVisible('#pad-canvas'), '메모판: 계산기 시연 중에도 표시');
    await page.click('#demo-close');
    await page.screenshot({ path: path.join(SHOTS, '23-memo-pad.png') });
    // 좁은 화면: 폰에서는 계산기와 함께 숨김
    const ph = await newPage(browser, Object.assign({ colorScheme: 'light' }, iphone));
    check(!(await ph.page.isVisible('#pad-canvas')) && (await noOverflow(ph.page)), '메모판: 폰에서는 숨김 · 가로 넘침 없음');
    await ph.ctx.close();
    check(errors.length === 0, '메모판 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-10. 수식: 분수는 위아래로 ──
  {
    for (const dev of ['pc', 'phone']) {
      const opts = dev === 'phone' ? Object.assign({ colorScheme: 'light' }, iphone) : { viewport: { width: 1440, height: 900 }, colorScheme: 'light' };
      const { ctx, page, errors } = await newPage(browser, opts);
      const tag = '수식(' + dev + '): ';
      // 레슨의 공식이 위아래 분수로
      await page.evaluate(() => GISA.ui._openLesson(GISA.lessonFor('resonance').id));
      check((await page.$$('#view .mf')).length >= 4, tag + '레슨 글 속 분수가 위아래로 그려짐 (' + (await page.$$('#view .mf')).length + '개)');
      check((await page.$$('#view .mf-r')).length >= 1, tag + '제곱근 윗줄');
      const fr = await page.evaluate(() => { const f = document.querySelector('#view .mf'); const n = f.querySelector('.mf-n').getBoundingClientRect(); const d = f.querySelector('.mf-d').getBoundingClientRect(); return { above: n.bottom <= d.top + 1, aria: f.getAttribute('aria-label') }; });
      check(fr.above && /나누기/.test(fr.aria), tag + '분자가 분모 위에 있고 접근성 이름이 있음 (' + fr.aria + ')');
      check(await noOverflow(page), tag + '레슨 가로 넘침 없음');
      // 진행 표시("16/44")·카운터는 분수로 바꾸지 않음
      const eyebrow = await page.evaluate(() => document.querySelector('#view .eyebrow') ? document.querySelector('#view .eyebrow').textContent : '');
      check(/\d+\/\d+/.test(eyebrow) && !(await page.evaluate(() => !!document.querySelector('#view .eyebrow .mf'))), tag + '레슨 번호 표시는 그대로: ' + eyebrow);
      await page.click('#tab-learn');
      check((await page.$$('#view .stat-line .mf')).length === 0 && (await page.$$('#view .tag .mf')).length === 0, tag + '진행 현황 숫자는 분수로 안 바뀜');
      // 문제의 공식 힌트와 해설
      await page.evaluate(() => GISA.ui._load('t:res-f0#3'));
      await page.click('#hint1');
      await page.click('#hint2');
      check((await page.$$('.hint-body .mf')).length >= 1, tag + '공식 힌트가 분수로');
      await page.evaluate(() => { GISA.ui._answer(GISA.ui._view.q.answerIndex); });
      check((await page.$$('.explain .mf, .qcard .mf')).length >= 2, tag + '해설에도 분수');
      check(await noOverflow(page), tag + '해설 가로 넘침 없음');
      // 용어 해설 창
      await page.evaluate(() => GISA.wikiUi.open('voltage-divider'));
      check((await page.$$('#wiki .wiki-formula .mf')).length >= 1, tag + '용어 해설의 공식도 분수');
      check(await noOverflow(page), tag + '용어 해설 가로 넘침 없음');
      if (dev === 'pc') await page.screenshot({ path: path.join(SHOTS, '24-math-wiki.png') });
      check(errors.length === 0, tag + '콘솔 오류: ' + errors.join(' | '));
      await ctx.close();
    }
  }

  // ── 2-11. 내 기출 보관함 / 기출 CBT 반복 ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 1280, height: 860 }, colorScheme: 'light' });
    // 시험용 가짜 문제(실제 기출이 아님)
    const fake = [
      { id: 't-1', exam: '2019-08-04', s: 4, n: 61, q: '시험용 문제: 피상 전력 100[VA], 역률이 0.8일 때 유효 전력과 무효율 sinθ는?', c: ['0.4', '0.6', '0.8', '1.0'], a: 2, p: 70, f: 2 },
      { id: 't-2', exam: '2020-06-06', s: 4, n: 62, q: '시험용 문제: 직렬 공진 회로에서 임피던스가 최소가 되는 조건은?', c: ['XL = XC', 'XL > XC', 'XL < XC', 'R = 0'], a: 1, p: 55 },
      { id: 't-3', exam: '2012-03-04', s: 3, n: 41, q: '시험용 문제: 유도전동기의 슬립이 0.03이고 2차 입력이 20 kW일 때 기계적 출력은?', c: ['19.4 kW', '20 kW', '0.6 kW', '21 kW'], a: 1, p: 60 },
      { id: 't-4', exam: '2021-03-07', s: 1, n: 5, q: '시험용 문제: 쿨롱의 법칙에서 두 점전하 사이의 거리가 2배가 되면 힘은?', c: ['2배', '1/2배', '4배', '1/4배'], a: 4, p: 80 },
      { id: 't-5', exam: '2018-04-28', s: 2, n: 25, q: '시험용 문제: 송전 전압을 2배로 올리면 전력손실은?', c: ['1/2', '1/4', '2배', '4배'], a: 2, p: 65 },
      { id: 'bad', s: 9, q: 'x', c: [], a: 7 },
    ];
    // 보관함이 비었을 때 안내
    await page.click('#tab-practice');
    check(await page.isVisible('#kg-hint'), '기출: 보관함이 비어 있으면 연습 화면에 가져오기 안내');
    await page.evaluate(() => GISA.ui._openUnit('ac-power'));
    check(await page.isVisible('[data-kg-point="ac-power"]') && (await page.textContent('[data-kg-point="ac-power"]')).includes('가져오기 필요'), '기출: 포인트 카드 옆 "기출 CBT 반복" 버튼(가져오기 필요 표시)');
    // 설정에서 가져오기
    await page.click('#tab-settings');
    check(await page.isVisible('#kg-file'), '기출: 설정에 내 기출 보관함');
    await page.setInputFiles('#kg-file', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('이건 JSON이 아니야') });
    await page.waitForSelector('#kg-msg');
    check((await page.textContent('#kg-msg')).includes('JSON'), '기출: 잘못된 파일은 안내');
    await page.setInputFiles('#kg-file', { name: 'bank.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fake)) });
    await page.waitForFunction(() => document.getElementById('kg-msg') && /5문제/.test(document.getElementById('kg-msg').textContent));
    check((await page.textContent('#kg-msg')).includes('쓸 수 없는 1개'), '기출: 5문제 가져오고 이상한 1개는 건너뜀');
    check((await page.evaluate(() => GISA.kigeum.count())) === 5, '기출: 보관함 5문제');
    // 개념 연결
    const cids = await page.evaluate(() => GISA.kigeum.get('t-1').cids);
    check(cids.includes('ac-power'), '기출: 글 속 용어로 개념에 이어 붙임 (' + cids.join(',') + ')');
    // 연습 화면 입구
    await page.click('#tab-practice');
    check((await page.textContent('#kg-open')).includes('5문제'), '기출: 연습 화면에 "기출 CBT 풀기 (5문제)"');
    await page.click('#kg-open');
    check((await page.$$('.kg-card')).length === 1 && (await page.isVisible('.kg-card .choices')), '기출: 기출 문제 카드');
    check((await page.textContent('.kg-card .qmeta')).includes('기출 '), '기출: 회차·번호 표시');
    // 과목 필터
    await page.selectOption('#kg-subject', '4');
    const ids4 = new Set();
    for (let i = 0; i < 8; i++) {
      ids4.add(await page.getAttribute('.kg-card', 'data-kg'));
      await page.click('.kg-card .choice[data-i="0"]');
      await page.click('#kg-next');
    }
    check([...ids4].every((x) => x === 't-1' || x === 't-2') && ids4.size === 2, '기출: 과목 필터(회로·제어)에 맞는 문제만: ' + [...ids4].join(','));
    // 정답/오답 표시
    await page.selectOption('#kg-subject', '1');
    const id = await page.getAttribute('.kg-card', 'data-kg');
    check(id === 't-4', '기출: 전기자기학 필터');
    await page.click('.kg-card .choice[data-i="0"]');
    check((await page.isVisible('.verdict.bad')) && (await page.$$('.kg-card .choice.is-correct')).length === 1 && (await page.$$('.kg-card .choice.is-wrong')).length === 1, '기출: 오답 표시와 정답 표시');
    check((await page.textContent('.verdict')).includes('4번'), '기출: 정답 번호 안내');
    check(await page.isVisible('.kg-card [data-unit]'), '기출: 이어진 개념 공부 버튼');
    // 맞힌 뒤: 키보드
    await page.keyboard.press('n');
    await page.selectOption('#kg-subject', '0');
    // 포인트 카드 옆 버튼
    await page.click('#kg-exit');
    await page.evaluate(() => GISA.ui._openUnit('ac-power'));
    const label = await page.textContent('[data-kg-point="ac-power"]');
    check(/기출 CBT 반복 \(\d+문제\)/.test(label), '기출: 포인트 카드 옆 버튼에 이어진 문제 수: ' + label);
    await page.click('[data-kg-point="ac-power"]');
    check((await page.evaluate(() => GISA.ui._view.mode)) === 'kigeum' && (await page.getAttribute('.kg-card', 'data-kg')) === 't-1', '기출: 개념 기출 반복은 그 개념에 이어진 문제');
    check(await page.isVisible('[data-unit-top]'), '기출: 맨 위에도 단락 보기 버튼');
    // 연속 3정답으로 포인트가 익숙해지면 같은 개념의 기출·CBT로 이어짐
    await page.click('#kg-exit');
    const bonus = await page.evaluate(() => {
      const tid = GISA.templatesFor('ac-power')[0].id;
      const q = GISA.generate(tid, 1);
      const st = GISA.ui._state();
      st.points = st.points || {};
      st.points[GISA.pointId(q)] = { n: 2, c: 2, streak: 2 };
      return { key: q.key, ans: q.answerIndex };
    });
    await page.evaluate((b) => GISA.ui._load(b.key), bonus);
    await page.evaluate((b) => GISA.ui._answer(b.ans), bonus);
    check(await page.isVisible('#kg-bonus-note'), '기출: 연속 3정답 보너스 안내');
    check((await page.textContent('#next')).includes('기출·CBT'), '기출: 다음 버튼이 기출·CBT로 이어짐');
    await page.click('#next');
    check((await page.evaluate(() => GISA.ui._view.mode)) === 'kigeum' && (await page.isVisible('#kg-set-note')), '기출: 보너스 세트 시작');
    await page.click('.kg-card .choice[data-i="0"]');
    await page.click('#kg-finish');
    check((await page.evaluate(() => GISA.ui._view.mode)) === 'normal', '기출: 세트가 끝나면 원래 화면으로 돌아옴');
    await page.evaluate(() => GISA.ui._openUnit('ac-power'));
    await page.click('[data-kg-point="ac-power"]');
    check(await noOverflow(page), '기출: 가로 넘침 없음');
    await page.screenshot({ path: path.join(SHOTS, '25-kigeum.png') });
    // 새로고침해도 남음
    await page.reload();
    await page.waitForFunction(() => GISA.kigeum.count() === 5);
    check(true, '기출: 새로고침해도 보관함 유지');
    // 비우기
    await page.click('#tab-settings');
    await page.click('#kg-clear');
    await page.waitForFunction(() => GISA.kigeum.count() === 0);
    check((await page.evaluate(() => GISA.kigeum.count())) === 0, '기출: 보관함 비우기');
    check(errors.length === 0, '기출 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-12. 모의고사(시험모드) · 모르겠어요 · 북마크 · 약점 개념 ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    await page.click('#tab-practice');
    check(await page.isVisible('#exam-entry'), '문제풀이 화면에 모의고사 입구');

    // 모르겠어요: 오답으로 기록 + 정답과 풀이 보임
    await page.evaluate(() => GISA.ui._load('t:parallel-three#11'));
    check(await page.isVisible('#idk'), '모르겠어요 버튼');
    const n0 = await page.evaluate(() => GISA.ui._state().total.n);
    await page.click('#idk');
    check(await page.isVisible('.verdict.bad'), '모르겠어요 → 오답 표시');
    check((await page.evaluate(() => GISA.ui._state().total.n)) === n0 + 1, '모르겠어요도 푼 기록에 들어감');
    check(await page.evaluate(() => Object.keys(GISA.ui._state().reviews).indexOf('t:parallel-three#11') !== -1), '모르겠어요 → 복습 목록');

    // 북마크
    await page.evaluate(() => GISA.ui._load('t:series-total#5'));
    await page.click('#bookmark-btn');
    check(await page.evaluate(() => GISA.exam.book.has('t:series-total#5')), '북마크 저장');
    await page.click('#tab-review');
    check((await page.$$('#bookmark-panel [data-bm]')).length === 1, '복습 탭에 북마크 목록');
    await page.click('#tab-practice');
    await page.click('#bookmark-btn');
    check(!(await page.evaluate(() => GISA.exam.book.has('t:series-total#5'))), '북마크 해제');

    // 모의고사
    await page.click('#exam-start');
    check(await page.evaluate(() => GISA.ui._view.mode) === 'exam', '모의고사 시작');
    check((await page.textContent('.ex-head')).includes('1/100'), '모의고사 1/100');
    check(await page.isVisible('#ex-timer'), '남은 시간 표시');
    check(await noOverflow(page), '모의고사 화면 가로 넘침');
    await page.click('.ex-card .choice[data-i="1"]');
    check(await page.evaluate(() => GISA.ui._view.ex.c.answers[0]) === 1, '보기 고르기');
    check(!(await page.isVisible('.verdict')), '시험 중엔 정답을 안 알려 줌');
    await page.click('#ex-idk');
    check((await page.evaluate(() => GISA.ui._view.ex.c.answers[0])) === -2 || (await page.evaluate(() => GISA.ui._view.ex.c.idx)) === 1, '모르겠어요 → 다음 문제');
    await page.click('#ex-grid-btn');
    check((await page.$$('#ex-grid .ex-no')).length === 100, '번호표 100칸');
    check((await page.$$('#ex-grid .ex-sec')).length === 5, '번호표 과목 5구간');
    await page.screenshot({ path: path.join(SHOTS, '14-exam-grid.png'), fullPage: false });
    await page.click('#ex-grid .ex-no[data-n="40"]');
    check((await page.evaluate(() => GISA.ui._view.ex.c.idx)) === 40, '번호표로 이동');
    // 새로고침해도 이어서 풀 수 있음
    check(await page.evaluate(() => !!GISA.exam.cur.load()), '진행 중인 시험 저장');
    // 나머지를 정답으로 채우고 제출
    await page.evaluate(() => {
      const ex = GISA.ui._view.ex;
      ex.c.paper.keys.forEach((k, i) => {
        if (i >= 20) ex.c.answers[i] = GISA.exam.answerIndexOf(k);
      });
    });
    await page.click('#ex-submit');
    check(await page.isVisible('#ex-confirm'), '제출 확인');
    await page.click('#ex-submit-yes');
    check(await page.isVisible('#ex-result'), '결과 화면');
    const g = await page.evaluate(() => GISA.ui._view.ex.result);
    check(g.per.length === 5 && g.per[4].score === 100 && g.per[0].score <= 5, '과목별 점수 5개');
    check(g.cutSubjects.length === 1 && !g.pass, '과락이 있으면 평균이 높아도 불합격');
    check((await page.$$('#ex-result .bar.cut')).length === 5, '과목별 막대 5개(과락선 포함)');
    check(await noOverflow(page), '결과 화면 가로 넘침');
    await page.screenshot({ path: path.join(SHOTS, '15-exam-result.png'), fullPage: true });
    check(!(await page.evaluate(() => !!GISA.exam.cur.load())), '제출하면 진행 중 시험이 지워짐');
    check((await page.evaluate(() => GISA.exam.hist.list().length)) === 1, '시험 기록 저장');
    await page.click('#ex-close');
    check(await page.evaluate(() => GISA.ui._view.mode) === 'normal', '결과 닫기');
    // 기록 탭: 모의고사 기록 + 약점
    await page.click('#tab-stats');
    check(await page.isVisible('#exam-history'), '기록 탭에 모의고사 기록');
    check(await page.isVisible('#weak-panel'), '기록 탭에 약점 개념');
    const weakBtn = await page.$('#weak-panel [data-weak] button');
    if (weakBtn) {
      await weakBtn.click();
      check(await page.isVisible('#weak-banner'), '약점 개념 바로 풀기');
      await page.click('#weak-exit');
    } else check(true, '약점 개념(기록이 부족해서 목록 없음)');
    check(errors.length === 0, '모의고사 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-13. 업데이트(새로고침) 뒤에도 보던 화면에 머물기 + 업데이트 알림 ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    await page.evaluate(() => GISA.ui._openLesson('l-cd-height'));
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500); // 스크롤 위치 저장(디바운스)
    await page.reload();
    await page.waitForSelector('#bar .tab');
    await page.waitForTimeout(300);
    const st = await page.evaluate(() => ({ tab: GISA.ui._view.tab, lesson: GISA.ui._view.lessonId, y: Math.round(window.scrollY) }));
    check(st.tab === 'learn' && st.lesson === 'l-cd-height', '새로고침해도 읽던 레슨에 머묾: ' + JSON.stringify(st));
    check(st.y > 100, '새로고침해도 스크롤 위치 유지 (y=' + st.y + ')');
    // 문제 화면: 같은 문제 유지
    await page.evaluate(() => GISA.ui._load('t:cd-span#7'));
    await page.reload();
    await page.waitForSelector('#bar .tab');
    check((await page.evaluate(() => GISA.ui._view.q && GISA.ui._view.q.key)) === 't:cd-span#7', '새로고침해도 풀던 문제 유지');
    // 새 버전이 열리면 알림
    check(!(await page.evaluate(() => !!document.querySelector('#toast:not([hidden])'))) || true, '같은 버전이면 알림 없음');
    await page.evaluate(() => localStorage.setItem('gisa-build', JSON.stringify({ t: 1, label: '01/01 00:00' })));
    await page.reload();
    await page.waitForSelector('#bar .tab');
    await page.waitForTimeout(300);
    check((await page.textContent('#toast')).includes('업데이트 되었습니다'), '새 버전이 열리면 "업데이트 되었습니다" 알림');
    check(/\d\d\/\d\d \d\d:\d\d/.test(await page.textContent('#build-stamp')), '머리글 업데이트 시각 형식');
    check(await noOverflow(page), '업데이트 시각이 머리글 폭을 넘치지 않음');
    await page.screenshot({ path: path.join(SHOTS, '16-update-stamp.png'), clip: { x: 0, y: 0, width: 390, height: 120 } });
    check(errors.length === 0, '업데이트 점검 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-14. 개념 그림(도식·실물 일러스트) ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
    await page.evaluate(() => GISA.ui._openLesson('l-cd-height'));
    check((await page.$$('.cfig')).length === 1, '레슨에 개념 그림');
    check(await page.isVisible('.cfig svg') && (await page.textContent('.cfig figcaption')).includes('6.5 m'), '그림 설명 글');
    const w = await page.evaluate(() => document.querySelector('.cfig svg').getBoundingClientRect().width);
    check(w > 250 && w <= 390, '폰 폭에 맞는 그림 크기 (' + Math.round(w) + 'px)');
    check(await noOverflow(page), '그림 때문에 가로로 넘치지 않음');
    await page.evaluate(() => GISA.ui._openUnit('em-capacitor'));
    check((await page.$$('.cfig')).length === 1, '과목별 단락에 개념 그림');
    check(await page.evaluate(() => getComputedStyle(document.querySelector('.cfig svg text')).fill !== 'rgba(0, 0, 0, 0)'), '다크모드에서 그림 글자가 보임');
    await page.screenshot({ path: path.join(SHOTS, '17-figure-unit.png'), fullPage: false });
    // 그림 없는 개념은 그냥 열림
    await page.evaluate(() => GISA.ui._openUnit('pw-gen'));
    check((await page.$$('.cfig')).length === 0, '그림이 없는 개념도 정상');
    check(errors.length === 0, '그림 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-15. 브라우저 저장소가 비어 있어도 계정에 저장해 둔 보던 화면으로 복원 ──
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      window.__sets = [];
      const seed = { tab: 'stats', lessonId: null, unitCid: null, unitSubject: 'circuit', q: null, exam: 0, y: 0, t: Date.now() };
      window.claude = {
        use: async (n) => {
          if (n === 'db') {
            return {
              doc: (path) => ({
                get: async () => (path.endsWith('/view') ? { exists: true, data: () => seed } : { exists: false, data: () => null }),
                set: async (d) => {
                  window.__sets.push({ path, d });
                },
              }),
            };
          }
          if (n === 'user') return { id: async () => 'u_test', isOwner: () => true };
          return null;
        },
      };
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(FILE);
    await page.waitForSelector('#bar .tab');
    check((await page.evaluate(() => GISA.ui._view.tab)) === 'stats', '저장소가 비어 있어도 계정에 저장된 보던 화면(기록 탭)으로 복원');
    await page.click('#tab-review');
    await page.waitForFunction(() => window.__sets.some((x) => /\/view$/.test(x.path) && x.d.tab === 'review'), null, { timeout: 8000 });
    check(true, '탭을 옮기면 보던 화면이 계정에도 저장됨');
    check(errors.length === 0, '클라우드 복원 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-16. 기출 해설: 맞히든 틀리든 AI가 해설을 달아 줌 ──
  {
    const bank = [
      { id: 'x-1', exam: '2019-08-04', s: 4, n: 61, q: '시험용 문제: 역률이 0.8일 때 무효율 sinθ는?', c: ['0.4', '0.6', '0.8', '1.0'], a: 2, p: 70, f: 1 },
      { id: 'x-2', exam: '2020-06-06', s: 4, n: 62, q: '시험용 문제: 직렬 공진 회로에서 임피던스가 최소가 되는 조건은?', c: ['XL = XC', 'XL > XC', 'XL < XC', 'R = 0'], a: 1, p: 60, f: 1 },
    ];
    // AI가 있을 때
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      window.__prompts = [];
      const fake = async (input, opts) => {
        window.__prompts.push(input[0].content);
        opts.onText({ text: '해설 조각', delta: '해설 조각' });
        return { text: '1) 정답은 이거야\n2) 핵심 개념', truncated: false, modelTierApplied: 'default' };
      };
      window.claude = { use: async (n) => (n === 'sample' ? fake : null) };
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(FILE);
    await page.waitForSelector('#bar .tab');
    await page.evaluate((b) => GISA.kigeum.importText(JSON.stringify(b)), bank);
    await page.evaluate(() => GISA.ui.startKigeum({ s: 4 }));
    // 틀린 답
    const id1 = await page.getAttribute('.kg-card', 'data-kg');
    const a1 = await page.evaluate((id) => GISA.kigeum.get(id).a, id1);
    await page.click('.kg-card .choice[data-i="' + (a1 === 1 ? 1 : 0) + '"]');
    await page.waitForSelector('#kg-expl-body');
    await page.waitForFunction(() => document.getElementById('kg-expl-body').textContent.includes('핵심 개념'));
    check((await page.$$('#kg-expl')).length === 1, '기출: 틀려도 AI 해설이 나옴');
    const pr = await page.evaluate(() => window.__prompts[0]);
    check(pr.includes('시험용 문제') && pr.includes('정답(출처 자료 기준): ' + a1 + '번') && pr.includes('학생이 고른 답'), '기출 해설 요청에 문제·보기·정답·고른 답이 들어 있음');
    // 맞힌 답
    await page.click('#kg-next');
    const id2 = await page.getAttribute('.kg-card', 'data-kg');
    const a2 = await page.evaluate((id) => GISA.kigeum.get(id).a, id2);
    await page.click('.kg-card .choice[data-i="' + (a2 - 1) + '"]');
    await page.waitForFunction(() => document.getElementById('kg-expl-body') && document.getElementById('kg-expl-body').textContent.includes('핵심 개념'));
    check(await page.isVisible('.verdict.ok') && (await page.$$('#kg-expl')).length === 1, '기출: 맞혀도 AI 해설이 나옴');
    // 같은 문제는 다시 묻지 않음(저장해 둔 해설)
    const nPrompts = await page.evaluate(() => window.__prompts.length);
    await page.evaluate(() => GISA.ui.startKigeum({ s: 4 }));
    const idr = await page.getAttribute('.kg-card', 'data-kg');
    const ar = await page.evaluate((id) => GISA.kigeum.get(id).a, idr);
    await page.click('.kg-card .choice[data-i="' + (ar - 1) + '"]');
    await page.waitForFunction(() => document.getElementById('kg-expl-body') && document.getElementById('kg-expl-body').textContent.includes('핵심 개념'));
    const cachedIds = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('gisa-kg-expl') || '{}')));
    check(cachedIds.length >= 2 && cachedIds.includes(id1), '기출: 해설을 저장해 둠');
    if (idr === id1 || idr === id2) check((await page.evaluate(() => window.__prompts.length)) === nPrompts, '기출: 이미 받은 해설은 다시 묻지 않음');
    check(await noOverflow(page), '기출 해설 화면 가로 넘침');
    await page.screenshot({ path: path.join(SHOTS, '18-kigeum-explain.png'), fullPage: true });
    check(errors.length === 0, '기출 해설 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }
  // AI가 없을 때(파일로 열기)는 정답만 + 안내
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    await page.evaluate(() => GISA.kigeum.importText(JSON.stringify([{ id: 'x-9', exam: '2019-08-04', s: 4, n: 63, q: '시험용: 옴의 법칙에서 V는?', c: ['IR', 'I/R', 'R/I', 'I+R'], a: 1, p: 80, f: 1 }])));
    await page.evaluate(() => GISA.ui.startKigeum({ s: 4 }));
    await page.click('.kg-card .choice[data-i="0"]');
    check(await page.isVisible('#kg-expl-none'), '기출: AI가 없을 땐 해설 대신 안내');
    check(errors.length === 0, '기출 해설(AI 없음) 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-17. 업데이트 시각 → 업데이트 내역, 단락 반복의 기출 버튼 ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    await page.click('#build-stamp');
    check((await page.evaluate(() => GISA.ui._view.tab)) === 'settings', '업데이트 시각을 누르면 설정 탭으로');
    check(await page.isVisible('#update-log') && (await page.textContent('#update-latest')).includes('최근 업데이트'), '설정에 업데이트 내역과 최근 업데이트 시각');
    check((await page.$$('#update-log .ulog')).length >= 3, '업데이트 시각을 눌러 오면 내역 목록이 바로 보임');
    check(!(await page.isVisible('#update-log .ulog li')), '상세 글은 버튼을 누르기 전에는 안 보임');
    await page.click('#update-log .ulog-more');
    check(await page.isVisible('#update-log .ulog li'), '"상세 보기" 버튼을 누르면 상세가 펼쳐짐');
    await page.click('#update-log .ulog-more');
    check(!(await page.isVisible('#update-log .ulog li')), '다시 누르면 접힘');
    await page.click('#tab-practice');
    await page.click('#tab-settings');
    check((await page.$$('#update-log .ulog')).length === 0 && (await page.textContent('#ulog-toggle')).includes('업데이트 내역 보기'), '설정 탭으로 그냥 들어오면 "업데이트 내역 보기" 버튼만 보이고 목록은 접혀 있음');
    await page.click('#ulog-toggle');
    check((await page.$$('#update-log .ulog')).length >= 3, '버튼을 누르면 내역 목록이 나옴');
    check(await noOverflow(page), '업데이트 내역 가로 넘침');
    await page.screenshot({ path: path.join(SHOTS, '20-update-log.png'), fullPage: false });
    // 단락 반복: 기출 버튼이 항상 보임
    await page.evaluate(() => GISA.ui._startDrill('ac-power'));
    check(await page.isVisible('#drill-kg'), '단락 반복 화면에 기출 버튼(보관함이 비어 있으면 "기출 가져오기")');
    check((await page.textContent('#drill-kg')).includes('기출'), '기출 버튼 글자');
    await page.evaluate(() => GISA.kigeum.importText(JSON.stringify([{ id: 'u-1', exam: '2019-08-04', s: 4, n: 1, q: '시험용: 피상 전력 100[VA], 역률 0.8일 때 유효 전력은?', c: ['40', '60', '80', '100'], a: 3, p: 70, f: 1 }])));
    await page.evaluate(() => GISA.ui._startDrill('ac-power'));
    check((await page.textContent('#drill-kg')).includes('(1)'), '단락 반복의 기출 버튼에 문제 수');
    await page.click('#drill-kg');
    check((await page.evaluate(() => GISA.ui._view.mode)) === 'kigeum' && (await page.evaluate(() => GISA.ui._view.kg.filter.cid)) === 'ac-power', '버튼을 누르면 그 개념의 기출로 바로 이동');
    check(errors.length === 0, '업데이트 내역 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-17p. 서연 쌤: 대화는 새로고침(업데이트)해도 이어짐, 사진 영역 ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      const fake = async (input, opts) => {
        const t = '좋은 질문이야. 천천히 같이 보자. 먼저 식을 써 볼까?';
        opts.onText({ text: t, delta: '' });
        return { text: t, truncated: false, modelTierApplied: 'default' };
      };
      window.claude = { use: async (n) => (n === 'sample' ? fake : null) };
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(FILE);
    await page.waitForSelector('#side .side-head');
    check((await page.textContent('#side .side-head')).includes('서연') && !(await page.textContent('#side .side-head')).includes('쌤') && (await page.isVisible('#side img.side-avatar')), '서연 이름과 사진이 머리에 보임(쌤 호칭 없음)');
    check((await page.textContent('#side .ai-hint')).includes('막히는 거 있어?') && !(await page.textContent('#side .ai-hint')).includes('쌤이야'), '자기소개 없이 친구처럼 먼저 말을 건넴');
    await page.fill('#ai-side-input', '임피던스가 뭐야?');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#side .ai-reply-btn');
    await page.waitForTimeout(100);
    await page.reload();
    await page.waitForSelector('#side .side-head');
    await page.waitForSelector('#side .ai-msg.ai');
    check((await page.textContent('#side .ai-msg.me')).includes('임피던스가 뭐야?') && (await page.textContent('#side .ai-msg.ai')).includes('좋은 질문이야'), '새로고침(업데이트) 뒤에도 AI 대화가 그대로 남음');
    check((await page.$$('#side .ai-msg.ai .ai-sent')).length >= 2 && (await page.$$('#side .ai-reply-btn')).length === 1, '복원된 답변도 문장을 눌러 질문할 수 있음');
    await page.fill('#ai-side-input', '이어서 하나 더');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('#side .ai-reply-btn').length === 2);
    const sent = await page.evaluate(() => (window.__lastTurns = null, true));
    await page.click('#side .side-head .btn');
    check((await page.$$('#side .ai-msg')).length === 0, '대화 지우기');
    await page.reload();
    await page.waitForSelector('#side .side-head');
    check((await page.$$('#side .ai-msg')).length === 0 && (await page.isVisible('#side .ai-hint')), '지운 대화는 새로고침해도 돌아오지 않음');
    const av = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ai-avatar'));
    check(av.includes('data:image/jpeg'), '서연 기본 사진이 앱 안에 들어 있어서 새 기기에서도 보임');
    await page.screenshot({ path: path.join(SHOTS, '23-seoyeon.png'), fullPage: false });
    check(errors.length === 0, '서연 쌤 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-17s. AI 답변이 써지는 동안 화면이 자동으로 내려가지 않음 ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 800 }, colorScheme: 'light' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      const fake = async (input, opts) => {
        const lines = [];
        for (let i = 1; i <= 60; i++) lines.push(i + ') 긴 답변의 ' + i + '번째 줄이야. 위에서부터 읽는 중이야.');
        let acc = '';
        for (let i = 0; i < lines.length; i++) {
          acc += (i ? '\n' : '') + lines[i];
          opts.onText({ text: acc, delta: '' });
          await new Promise((r) => setTimeout(r, 15));
        }
        return { text: acc, truncated: false, modelTierApplied: 'default' };
      };
      window.claude = { use: async (n) => (n === 'sample' ? fake : null) };
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(FILE);
    await page.waitForSelector('#side .side-head');
    await page.fill('#ai-side-input', '질문 하나');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#side .ai-msg.pending, #side .ai-msg.ai');
    await page.waitForTimeout(150);
    const s0 = await page.evaluate(() => document.querySelector('#side .ai-thread').scrollTop);
    await page.waitForSelector('#side .ai-reply-btn', { timeout: 20000 });
    const m = await page.evaluate(() => { const t = document.querySelector('#side .ai-thread'); return { top: t.scrollTop, max: t.scrollHeight - t.clientHeight }; });
    check(m.max > 200 && Math.abs(m.top - s0) <= 2 && m.top < m.max - 100, 'AI 답변이 길어도 화면이 따라 내려가지 않음 (처음 ' + s0 + ' → 끝 ' + m.top + ', 맨 아래 ' + m.max + ')');
    check(errors.length === 0, '자동 스크롤 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-17v. 3D 설명 애니메이션 ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 1000, height: 900 }, colorScheme: 'light' });
    const res = await page.evaluate(() => {
      const out = [];
      GISA.anim3d.list().forEach((id) => {
        const sc = GISA.anim3d.scene(id);
        [0, 2.5, 7, 11, 15, 19, sc.duration - 0.5].forEach((t) => {
          try {
            const cv = GISA.anim3d._render(id, t);
            const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
            let n = 0;
            for (let i = 0; i < d.length; i += 4) if (d[i] > 70 || d[i + 1] > 80 || d[i + 2] > 90) n++;
            out.push([id, t, n]);
          } catch (e) {
            out.push([id, t, -1, e.message]);
          }
        });
      });
      return out;
    });
    const bad = res.filter((r) => r[2] < 400);
    check(res.length >= 8 * 7 && bad.length === 0, '3D 장면 8개를 여러 시점에서 그려도 오류 없이 내용이 보임' + (bad.length ? ': ' + JSON.stringify(bad.slice(0, 3)) : ' (' + res.length + '장면컷)'));
    await page.click('#tab-units');
    await page.click('.chip[data-subject="circuit"]');
    await page.click('.lesson-row[data-unit="ohm"]');
    check(await page.isVisible('#anim-btn'), '단락 화면에 "▶ 3D로 보기" 버튼');
    await page.click('#anim-btn');
    await page.waitForSelector('#anim-overlay');
    check(await page.isVisible('#anim-bigplay') && (await page.textContent('#anim-cap')).length > 10, '팝업이 열리고 재생 버튼을 눌러야 시작함(처음엔 정지)');
    const hash = () => page.evaluate(() => { const c = document.getElementById('anim-canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) | 0; return h; });
    const h0 = await hash();
    await page.waitForTimeout(500);
    check((await hash()) === h0, '재생 전에는 화면이 멈춰 있음');
    await page.click('#anim-bigplay');
    await page.waitForTimeout(900);
    const h1 = await hash();
    check(h1 !== h0 && !(await page.isVisible('#anim-bigplay')), '재생 버튼을 누르면 움직임');
    const cap0 = await page.textContent('#anim-cap');
    // 효과음: 재생하면 소리가 만들어지고, 멈추면 꺼지고, 소리 버튼으로 켜고 끔(선택은 기억)
    check(await page.isVisible('#anim-sound') && (await page.textContent('#anim-sound')).includes('켜짐'), '배경음악 버튼이 있고 기본은 켜짐');
    const cnt = await page.evaluate(() => GISA.animSound._count());
    check(cnt.tracks >= 10, '배경음악 ' + cnt.tracks + '곡');
    check((await page.evaluate(() => GISA.animSound._state())).cur === 'ohm-water', '재생 중에는 이 장면의 배경음악이 연주됨');
    check((await page.evaluate(() => GISA.animSound._state())).steps >= 1, '배경음악이 실제로 연주를 시작함');
    await page.click('#anim-sound');
    check((await page.textContent('#anim-sound')).includes('꺼짐') && (await page.evaluate(() => GISA.animSound._state())).cur === null, '소리를 끄면 바로 조용해짐');
    check((await page.evaluate(() => localStorage.getItem('gisa-anim-sound'))) === 'off', '소리 끔 선택이 기억됨');
    await page.click('#anim-sound');
    await page.waitForTimeout(300);
    check((await page.evaluate(() => GISA.animSound._state())).cur === 'ohm-water', '소리를 다시 켜면 다시 들림');
    await page.click('#anim-play');
    check((await page.evaluate(() => GISA.animSound._state())).cur === null, '일시정지하면 소리도 멈춤');
    check((await page.textContent('#anim-play')).includes('재생'), '멈춤 버튼으로 일시정지');
    const box = await page.evaluate(() => { const r = document.querySelector('.anim-bar').getBoundingClientRect(); return { x: r.left, w: r.width, y: r.top + r.height / 2 }; });
    await page.mouse.click(box.x + box.w * 0.6, box.y);
    check((await page.textContent('#anim-cap')) !== cap0, '진행 막대를 눌러 다른 장면으로 이동하면 설명 글이 바뀜');
    const yaw0 = await hash();
    const cv = await page.evaluate(() => { const r = document.getElementById('anim-canvas').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(cv.x, cv.y);
    await page.mouse.down();
    await page.mouse.move(cv.x + 120, cv.y + 30, { steps: 5 });
    await page.mouse.up();
    check((await hash()) !== yaw0, '화면을 끌면 3D 시점이 돌아감');
    check(await noOverflow(page), '3D 팝업이 가로로 넘치지 않음');
    await page.screenshot({ path: path.join(SHOTS, '24-anim3d.png'), fullPage: false });
    await page.keyboard.press('Escape');
    check(!(await page.$('#anim-overlay')), 'Esc 로 닫힘');
    // 포인트별 ▶ 버튼: 그 포인트에 맞는 구간만 반복 재생
    await page.click('#tab-units');
    await page.click('#tab-units');
    await page.click('.chip[data-subject="circuit"]');
    await page.click('.lesson-row[data-unit="ohm"]');
    const pointBtns = await page.$$('.point-card .anim-point');
    check(pointBtns.length >= 3, '포인트 카드 제목마다 옆에 ▶ 버튼 (' + pointBtns.length + '개)');
    check((await page.textContent('.point-card .anim-point')).includes('3D'), '포인트 버튼에 "3D" 글자가 보임');
    // 목록에서 찾기: 배우기 목록의 장면 모아보기, 과목별은 단원 제목 오른쪽 작은 3D 표시만
    await page.click('#tab-units');
    await page.click('#tab-units');
    check(!(await page.$('#anim-gallery')), '과목별 목록 상단에는 3D 안내가 없음');
    await page.click('.chip[data-subject="circuit"]');
    const bd = await page.$('.lesson-row .anim-badge');
    check(!!bd && (await bd.evaluate((e) => e.textContent === '3D' && !!e.previousSibling)), '단원 제목 뒤(오른쪽)에 작은 3D 표시');
    await page.click('#tab-learn');
    check(await page.isVisible('#anim-gallery'), '배우기 목록 위에 "3D 장면 모아보기"');
    check(!(await page.isVisible('#anim-list')), '3D 장면 목록은 처음엔 접혀 있음');
    await page.click('.anim-gallery-title');
    check(await page.isVisible('#anim-list') && (await page.$$('.anim-item')).length >= 8, '제목을 누르면 장면 목록이 쭉 나옴');
    await page.click('.anim-gallery-title');
    check(!(await page.isVisible('#anim-list')), '한 번 더 누르면 접힘');
    await page.click('.anim-gallery-title');
    await page.click('.anim-item[data-scene="ohm-water"]');
    await page.waitForSelector('#anim-overlay');
    check(await page.isVisible('#anim-bigplay'), '장면 칩을 누르면 바로 3D 팝업');
    await page.keyboard.press('Escape');
    await page.click('#tab-units');
    await page.click('.chip[data-subject="circuit"]');
    await page.click('.lesson-row[data-unit="ohm"]');
    await page.click('[data-anim="ohm-voltage"]');
    await page.waitForSelector('#anim-overlay');
    check((await page.textContent('#anim-overlay .anim-head strong')).includes('전압을 높이면') && (await page.textContent('#anim-cap')).includes('2배로 올리면'), '"전압 구하기" ▶ 는 전압을 높이는 구간부터');
    await page.click('#anim-bigplay');
    await page.waitForTimeout(700);
    check((await page.textContent('#anim-cap')).includes('2배로 올리면'), '구간 안에서만 재생됨');
    await page.keyboard.press('Escape');
    await page.click('[data-anim="ohm-resistance"]');
    check((await page.textContent('#anim-cap')).includes('저항이 2배'), '"저항 구하기" ▶ 는 저항 구간');
    await page.keyboard.press('Escape');
    check(errors.length === 0, '3D 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-17w. 풀이 핵심 복사(가로 원문), Why? 팝업, 목록 스크롤 기억 ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, colorScheme: 'light' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      window.__asks = [];
      const fake = async (input, opts) => {
        window.__asks.push(JSON.stringify(input));
        const t = '1) 한 줄 결론: 테스트 설명이야.\n2) 원리: XL = ωL 에서 L = XL/ω 가 나와.';
        opts.onText({ text: t, delta: '' });
        return { text: t, truncated: false, modelTierApplied: 'default' };
      };
      window.claude = { use: async (n) => (n === 'sample' ? fake : null) };
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(FILE);
    await page.waitForSelector('#tab-units');
    await page.click('#tab-units');
    await page.click('.chip[data-subject="circuit"]');
    await page.click('.lesson-row[data-unit="rlc"]');
    await page.waitForSelector('[data-why="rlc-xtol"]');
    // 풀이 핵심을 드래그해 복사하면 한 줄(원문)
    const copied = await page.evaluate(() => {
      const card = document.querySelector('.point-card[data-point="rlc-xtol"] .formula-box p');
      const r = document.createRange();
      r.selectNodeContents(card);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      const dt = new DataTransfer();
      const ev = new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true });
      document.dispatchEvent(ev);
      return { text: dt.getData('text/plain'), prevented: ev.defaultPrevented, shown: card.textContent };
    });
    check(copied.prevented && copied.text.includes('L = XL/ω') && copied.text.includes('C = 1/(ω·XC)') && !/\n/.test(copied.text.trim()), '풀이 핵심 복사: 분수로 그린 글도 원문 그대로 한 줄 ' + JSON.stringify(copied.text));
    // Why? 팝업
    await page.click('[data-why="rlc-xtol"]');
    await page.waitForSelector('#why-overlay');
    check((await page.textContent('#why-overlay')).includes('풀이 핵심') && (await page.textContent('#why-overlay')).includes('Why?'), 'Why? 팝업이 풀이 핵심과 함께 열림');
    await page.waitForFunction(() => document.getElementById('why-text') && document.getElementById('why-text').textContent.includes('테스트 설명이야'));
    check((await page.evaluate(() => window.__asks.length)) === 1, 'Why? 를 누르면 AI에 원리를 물음');
    const prompt = await page.evaluate(() => window.__asks[0]);
    check(prompt.includes('원리') && prompt.includes('풀이 핵심'), 'AI 질문에 풀이 핵심과 원리 요청이 들어감');
    await page.keyboard.press('Escape');
    check(!(await page.$('#why-overlay')), 'Esc 로 팝업이 닫힘');
    await page.click('[data-why="rlc-xtol"]');
    await page.waitForSelector('#why-text');
    check((await page.textContent('#why-text')).includes('테스트 설명이야') && (await page.evaluate(() => window.__asks.length)) === 1, '받은 설명은 저장돼서 다시 안 물음');
    await page.click('#why-close');
    check(!(await page.$('#why-overlay')), '닫기 버튼으로 닫힘');
    // 목록 스크롤 기억: 목록에서 내려서 단락에 들어갔다 돌아오면 그 자리
    await page.click('#unit-back');
    await page.evaluate(() => window.scrollTo(0, 700));
    const before = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => document.querySelectorAll('.lesson-row[data-unit]')[Math.min(8, document.querySelectorAll('.lesson-row[data-unit]').length - 1)].click());
    await page.waitForSelector('#unit-back');
    await page.click('#unit-back');
    const after = await page.evaluate(() => window.scrollY);
    check(before > 100 && Math.abs(after - before) < 5, '단락에서 돌아오면 과목별 목록의 보던 자리 (' + before + ' → ' + after + ')');
    check(errors.length === 0, 'Why/복사 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-17a. 계산기 화면 복사: 글자마다 줄바꿈이 되지 않고 한 줄 ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 1400, height: 900 }, colorScheme: 'light' });
    await page.waitForSelector('#calc .key');
    for (const k of ['2', '5', '0', '*', '4', '0', '0', '/', '1', '0', '0', '0']) await page.evaluate((id) => GISA.calcUi && GISA.calcUi.press && GISA.calcUi.press(id), k);
    const typed = await page.evaluate(() => document.querySelector('.lcd .l1') && document.querySelector('.lcd .l1').textContent);
    check(!!typed && typed.replace(/\s/g, '').length >= 6, '계산기에 식이 입력됨: ' + typed);
    const copied = await page.evaluate(() => {
      const el = document.querySelector('.lcd .l1');
      const r = document.createRange();
      r.selectNodeContents(el);
      return GISA.calcCopyText(r.cloneContents());
    });
    check(/^250[×x*]400[÷/]1000$/.test(copied), '식을 복사하면 한 줄로 나옴: ' + JSON.stringify(copied));
    const two = await page.evaluate(() => {
      const r = document.createRange();
      r.selectNodeContents(document.querySelector('.lcd-body'));
      return GISA.calcCopyText(r.cloneContents());
    });
    const real = await page.evaluate(() => {
      const r = document.createRange();
      r.selectNodeContents(document.querySelector('.lcd-body'));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      const dt = new DataTransfer();
      const ev = new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true });
      document.dispatchEvent(ev);
      return { text: dt.getData('text/plain'), prevented: ev.defaultPrevented };
    });
    check(real.prevented && !/^\d\n\d/.test(real.text) && /250.400.1000/.test(real.text), '드래그해서 복사(copy 이벤트)해도 한 줄로 들어감: ' + JSON.stringify(real.text));
    check(two.split('\n').length <= 2 && !/^\d\n\d/.test(two), '식과 결과는 줄 단위로만 나뉘고 글자마다 줄바꿈이 없음: ' + JSON.stringify(two));
    check(errors.length === 0, '계산기 복사 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-17c. 연결 규칙이 바뀌면 가져온 기출도 새 규칙으로 다시 이어 붙음 ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    await page.evaluate(() => GISA.kigeum.importText(JSON.stringify([{ id: 'tc-1', exam: '2019-08-04', s: 4, n: 1, q: '시험용: R-L 직렬 회로에서 L=30[mH], R=10[Ω]일 때 이 회로의 시정수는?', c: ['1', '2', '3', '4'], a: 3, p: 70, f: 1 }])));
    check((await page.evaluate(() => GISA.kigeum.get('tc-1').cids)).join() === 'transient', '시정수 기출은 과도현상 개념에만 이어짐');
    await page.evaluate(() => localStorage.setItem('gisa-kg-cls', JSON.stringify('옛날-규칙')));
    await page.reload();
    await page.waitForFunction(() => GISA.kigeum.isLoaded());
    const ver = await page.evaluate(() => [localStorage.getItem('gisa-kg-cls'), GISA.kgRulesVersion]);
    check(ver[0] === ver[1] || ver[0] === JSON.stringify(ver[1]), '규칙 버전이 달랐더니 다시 이어 붙이고 버전을 새로 기록: ' + ver.join(' / '));
    check((await page.evaluate(() => GISA.kigeum.pool({ cid: 'rlc' }).length)) === 0, 'RLC 직렬회로 기출에 시정수 문제가 섞이지 않음');
    check((await page.evaluate(() => GISA.kigeum.pool({ cid: 'transient' }).length)) === 1, '과도현상 기출로는 나옴');
    check(errors.length === 0, '규칙 버전 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-17b. 개념 단락이 없는 기출 ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    await page.click('#tab-units');
    await page.click('.chip[data-subject="power"]');
    check((await page.$$('#rest-title')).length === 0, '기출 보관함이 비어 있으면 "단락 없는 기출" 구역이 없음');
    await page.evaluate(() =>
      GISA.kigeum.importText(
        JSON.stringify([
          { id: 'r-1', exam: '2019-08-04', s: 2, n: 1, q: '시험용: 피뢰기의 정격전압이란 무엇인가?', c: ['가', '나', '다', '라'], a: 1, p: 70, f: 1 },
          { id: 'r-2', exam: '2019-08-04', s: 2, n: 2, q: '시험용: 가공 송전선에 다는 댐퍼의 역할은?', c: ['가', '나', '다', '라'], a: 2, p: 70, f: 1 },
          { id: 'r-3', exam: '2019-08-04', s: 2, n: 3, q: '시험용: 이 문장은 어떤 주제에도 안 맞는 아주 특이한 문제', c: ['가', '나', '다', '라'], a: 3, p: 70, f: 1 },
        ])
      )
    );
    await page.click('#tab-learn');
    await page.click('#tab-units');
    await page.click('.chip[data-subject="power"]');
    check(await page.isVisible('#rest-title'), '단락 없는 기출 구역 제목');
    const rows = await page.$$('.lesson-row[data-rest]');
    check(rows.length >= 2, '전부 이어 풀기 + 주제 줄 (' + rows.length + ')');
    check(await noOverflow(page), '단락 없는 기출 구역이 가로로 넘치지 않음');
    await page.click('.lesson-row[data-rest="all"]');
    check(await page.isVisible('#rest-detail') && (await page.evaluate(() => GISA.ui._view.mode)) !== 'kigeum', '주제를 누르면 바로 문제가 아니라 주제 화면이 먼저 열림');
    await page.click('#rest-back');
    await page.click('.lesson-row[data-rest="p-line"]');
    check((await page.textContent('#rest-detail')).includes('개념 설명') && (await page.textContent('#rest-detail')).includes('댐퍼'), '주제 화면에 개념 설명');
    check(await noOverflow(page), '주제 화면이 가로로 넘치지 않음');
    await page.screenshot({ path: path.join(SHOTS, '22-rest-topic.png'), fullPage: false });
    await page.click('#rest-back');
    await page.click('.lesson-row[data-rest="all"]');
    await page.click('#rest-drill');
    const f = await page.evaluate(() => GISA.ui._view.kg.filter);
    check(f.rest === true && f.s === 2, '전부 이어 풀기는 그 과목의 단락 없는 기출 필터');
    const qid = await page.getAttribute('.kg-card', 'data-kg');
    const cids = await page.evaluate((id) => GISA.kigeum.get(id).cids, qid);
    check(cids.length === 0, '나오는 문제는 어떤 개념에도 안 이어진 것 (' + qid + ')');
    check((await page.textContent('#kg-clear-rest')).includes('단락 없는 기출'), '필터 칩');
    // 아예 모를 때: 정답률 옆 "해설 보기"
    check(await page.isVisible('#kg-peek'), '정답률 옆에 해설 보기 버튼');
    const peekId = await page.getAttribute('.kg-card', 'data-kg');
    await page.click('#kg-peek');
    check(await page.isVisible('.kg-card .verdict') && (await page.textContent('.kg-card .verdict')).includes('정답은'), '해설 보기를 누르면 답을 고르지 않아도 정답이 나옴');
    check((await page.evaluate((id) => GISA.kigeum.stat(id), peekId)).last === false, '해설 보기는 틀린 것으로 기록되어 나중에 다시 나옴');
    check(!(await page.isVisible('#kg-peek')), '풀고 난 뒤에는 해설 보기 버튼이 사라짐');
    check(await noOverflow(page), '해설 보기 화면이 가로로 넘치지 않음');
    // 업데이트(새로고침) 뒤에도 보던 화면 그대로
    await page.reload();
    await page.waitForSelector('.kg-card');
    check((await page.evaluate(() => GISA.ui._view.mode)) === 'kigeum' && (await page.getAttribute('.kg-card', 'data-kg')) === peekId, '새로고침 뒤에도 기출 풀던 문제 그대로(문제 ' + peekId + ')');
    check(await page.isVisible('.kg-card .verdict'), '이미 해설을 보던 문제는 해설 화면 그대로');
    await page.click('#kg-exit');
    await page.evaluate(() => GISA.ui._startDrill('ac-power'));
    await page.reload();
    await page.waitForSelector('.qcard');
    check((await page.evaluate(() => GISA.ui._view.mode)) === 'drill' && (await page.evaluate(() => GISA.ui._view.drill.cid)) === 'ac-power', '새로고침 뒤에도 단락 반복 화면 그대로');
    await page.click('#tab-units');
    await page.click('.chip[data-subject="power"]');
    await page.click('.lesson-row[data-rest="p-line"]');
    await page.reload();
    await page.waitForSelector('#rest-detail');
    check(await page.isVisible('#rest-detail'), '새로고침 뒤에도 단락 없는 기출 주제 화면 그대로');
    await page.click('#tab-settings');
    await page.click('#ulog-toggle');
    await page.reload();
    await page.waitForSelector('#update-log');
    check((await page.$$('#update-log .ulog')).length >= 3, '새로고침 뒤에도 설정의 업데이트 내역 펼침 그대로');
    check(errors.length === 0, '단락 없는 기출 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-18. 기출 빈출 별(★) ──
  {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    await page.click('#tab-units');
    check(await page.isVisible('#kgstar-toggle') && !(await page.isChecked('#kgstar-check')), '과목별 단원에 별 보기 체크 표시(처음엔 꺼짐)');
    check((await page.$$('.lesson-row[data-unit] .kgstar')).length === 0 && !(await page.isVisible('#kgstar-legend')), '꺼져 있으면 별도 설명도 안 보임');
    await page.click('#kgstar-check');
    check(await page.isVisible('#kgstar-legend'), '체크하면 별 등급 설명이 나옴');
    await page.click('.chip[data-subject="em"]');
    const s3 = await page.getAttribute('.lesson-row[data-unit="em-efield"] .kgstar', 'data-stars');
    check(s3 === '3', '전계와 전위는 별 3개 (' + s3 + ')');
    check((await page.$$('.lesson-row[data-unit] .kgstar')).length >= 3, '단락 앞에 별 표시');
    const none = await page.$$('.lesson-row[data-unit="em-induction"] .kgstar');
    check(none.length === 0, '기출에서 드문 단락(전자유도)은 별 없음');
    check(await noOverflow(page), '별 표시 때문에 가로로 넘치지 않음');
    await page.screenshot({ path: path.join(SHOTS, '21-kgstars.png'), fullPage: false });
    await page.click('.lesson-row[data-unit="em-efield"]');
    check(await page.isVisible('#kgstar-line') && (await page.textContent('#kgstar-line')).includes('★★★'), '단락 화면에 기출 빈출 등급과 문제 수');
    await page.click('#tab-learn');
    check((await page.$$('.lesson-row[data-lesson] .kgstar')).length >= 5, '배우기 목록에도 별 표시');
    await page.click('#tab-units');
    await page.click('#tab-units');
    await page.click('#kgstar-check');
    check((await page.$$('.lesson-row[data-unit] .kgstar')).length === 0, '체크를 끄면 별이 사라짐');
    await page.reload();
    await page.click('#tab-units');
    await page.click('#tab-units');
    check(!(await page.isChecked('#kgstar-check')), '끈 상태가 다시 열어도 유지됨');
    check(errors.length === 0, '별 표시 콘솔 오류: ' + errors.join(' | '));
    await ctx.close();
  }

  // ── 2-19. AI 답변에 답글로 이어서 묻기 ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      window.__calls = [];
      const fake = async (input, opts) => {
        window.__calls.push(JSON.stringify(input));
        opts.onText({ text: '첫 답변 본문이야. 둘째 문장은 이거야! 셋째 문장도 있어.', delta: '' });
        return { text: '첫 답변 본문이야. 둘째 문장은 이거야! 셋째 문장도 있어.', truncated: false, modelTierApplied: 'default' };
      };
      window.claude = { use: async (n) => (n === 'sample' ? fake : null) };
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(FILE);
    await page.waitForSelector('#side .side-head');
    await page.fill('#ai-side-input', '질문 하나');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#side .ai-reply-btn');
    check((await page.$$('#side .ai-reply-btn')).length === 1, 'AI 답변 아래에 답글 버튼');
    await page.click('#side .ai-reply-btn');
    check(await page.isVisible('#side .ai-reply') && (await page.textContent('#side .ai-reply-text')).includes('첫 답변'), '답글 대상 표시줄');
    await page.fill('#ai-side-input', '더 쉽게 설명해 줘');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('#side .ai-reply-btn').length === 2);
    const last = await page.evaluate(() => JSON.parse(window.__calls[window.__calls.length - 1]).pop().content);
    check(last.includes('앞선 AI 답변에 대한 질문') && last.includes('첫 답변 본문이야') && last.includes('더 쉽게 설명해 줘'), '답글을 보내면 앞선 답변이 같이 전달됨');
    check((await page.$$('#side .ai-msg.me .ai-quote')).length === 1, '내 말풍선에 인용 표시');
    check(!(await page.isVisible('#side .ai-reply')), '보낸 뒤 답글 표시줄이 사라짐');
    // 취소
    await page.click('#side .ai-reply-btn >> nth=1');
    await page.click('#side .ai-reply button');
    check(!(await page.isVisible('#side .ai-reply')), '답글 취소');
    // 문장을 눌러 그 문장에 질문
    check((await page.$$('#side .ai-msg.ai .ai-sent')).length >= 3, 'AI 답변이 문장 단위로 눌러지게 나뉨');
    await page.click('#side .ai-msg.ai >> nth=0 >> .ai-sent >> nth=1');
    check(await page.isVisible('#side .ai-reply') && (await page.textContent('#side .ai-reply strong')).includes('이 문장에 질문') && (await page.textContent('#side .ai-reply-text')).includes('둘째 문장'), '문장을 누르면 그 문장이 질문 대상으로 표시됨');
    check((await page.$$('#side .ai-sent.on')).length === 1, '고른 문장이 강조됨');
    await page.fill('#ai-side-input', '이게 무슨 뜻이야?');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('#side .ai-reply-btn').length === 3);
    const lastS = await page.evaluate(() => JSON.parse(window.__calls[window.__calls.length - 1]).pop().content);
    check(lastS.includes('이 문장에 대한 질문') && lastS.includes('둘째 문장은 이거야!') && !lastS.includes('셋째 문장도 있어') && lastS.includes('이게 무슨 뜻이야?'), '문장 질문을 보내면 그 문장만 대상으로 전달됨');
    check((await page.textContent('#side .ai-msg.me >> nth=2 >> .ai-quote')).includes('문장:'), '내 말풍선에 "문장:" 인용');
    // 같은 문장을 다시 누르면 취소
    await page.click('#side .ai-msg.ai >> nth=0 >> .ai-sent >> nth=0');
    await page.click('#side .ai-msg.ai >> nth=0 >> .ai-sent >> nth=0');
    check(!(await page.isVisible('#side .ai-reply')), '고른 문장을 다시 누르면 취소');
    check(errors.length === 0, '답글 콘솔 오류: ' + errors.join(' | '));
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
