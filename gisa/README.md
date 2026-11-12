# 통전⚡기사 전기기사 필기

- 실행: `dist/index.html` 더블클릭 (인터넷 없어도 동작, 글꼴만 기본 글꼴로 바뀜)
- 빌드: `node build.js` → `dist/index.html`, `dist/artifact.html`
- 테스트: `node test/run-tests.js` (템플릿당 3000문제, `N=300`으로 줄일 수 있음)
- 계산기 테스트: `node test/calc-tests.js` (설명서 예제를 키 입력 순서대로 재현)
- 화면 점검: `node test/browser-check.js [스크린샷 폴더]` (Playwright 필요)

## 구조
- `engine/` 시드 난수(rng), 숫자 표기(format), 보기 4개 만들기(choices), 4단 해설 틀(explain), 템플릿 생성(generate), 정적 문제은행(static-bank), 회로도(svg)
- `concepts/concepts.js` 과목 목록 + 회로·제어 개념, `concepts/em.js`·`power.js`·`machine.js` 과목별 개념
  (id, 이름, 그룹, 선행 개념, 개념 카드, 쉬운 비유, 공식)
- `subjects/<과목>/` 문제 템플릿과 정적(이론형) 문제: circuit, em, power, machine
- `lessons/points.js` 문제 포인트(템플릿·이론 문제마다 "이런 문제 / 풀이 핵심 / 자주 틀리는 곳"). 과목별 탭과 포인트 반복이 이걸 씀
- `lessons/` 배우기 레슨(0. 시작하기 ~ 6. 제어공학). 개념마다 레슨 1개, 예제는 실제 템플릿에서 생성
- `app/` 학습 기록 로직(progress), 저장(storage), 화면(ui), 스타일
- `test/reference.js` 템플릿과 따로 짠 독립 검산기 (새 템플릿을 넣으면 여기에도 추가해야 테스트가 통과함)

## 새 과목 추가 순서
1. `concepts/<과목>.js`에 `G.addConcepts('<과목 id>', [...])`로 개념 추가, `G.subjects`의 `ready: true`
   (과목마다 선행 개념이 없는 시작 개념을 하나 이상 둬야 테스트가 통과함)
2. `subjects/<과목>/*.js`에 `G.defineTemplate({...})`로 템플릿 작성
3. `files.js`의 `content`에 파일 추가, `test/reference.js`에 검산기 추가
4. `node test/run-tests.js` → `node build.js`

## 기록 동기화
- claude.ai 로그인 계정의 개인 저장소(`data/users/<id>/save`)에 기록을 올리고 내려받는다(`app/sync.js`). 별도 Google 로그인은 쓰지 않는다.
- 올리기 전에 서버 기록을 읽어 와서 `progress.merge`로 합친다. 통계는 더 많이 푼 쪽, 레슨·풀이 기록·복습은 합집합, 초기화(`resetAt`) 이전 기록은 버린다.
- 두 기기가 동기화 사이에 각자 푼 경우 더 적게 푼 쪽의 통계 일부가 빠질 수 있다(풀이 기록·복습·레슨은 합쳐져서 남는다).
- 파일로 열면(`window.claude` 없음) 동기화는 꺼지고 localStorage만 쓴다.

## 계산기 (왼쪽, 카시오 fx-350ES PLUS 방식)
- `engine/qnum.js` 정확한 값(분수·√·π, BigInt) / `calc-fmt.js` 액정 표시 규칙 / `calc-eval.js` 식 해석(카시오 우선순위) / `calc-stat.js` STAT 회귀 / `calc.js` 본체(키 → 화면)
- `app/calcui.js` 키패드·액정 그리기. 키 입력은 `G.calcUi.press('SHIFT')`처럼 키 이름으로 한다.
- 모드는 COMP·STAT·TABLE만 있다(이 기종에는 복소수·CALC·SOLVE가 없음). 메모리·설정은 localStorage에 저장(기록 동기화와는 별개).
- 폭 ≥1280px(AI 패널 있을 땐) 또는 ≥1000px(AI 패널 없을 땐)에 왼쪽에 붙고, 그보다 좁으면 "계산기" 버튼으로 여는 떠 있는 패널, 940px 미만(폰)에서는 숨김.

## 계산기로 풀기 (문제 옆 🖩 버튼)
- `calc-guides/*.js`: 템플릿마다 단계별 설명과 계산식(`G.guide(id, (params) => [{ say, expr }])`). 계산식은 `V/R`, `sqrt(R^2+X^2)`, `9e9*Q1*1e-6/d^2`처럼 쓰고, `engine/calc-guide.js`가 실제 fx-350ES PLUS 키 순서로 바꾼다(`$A`는 저장한 변수 A, `store: 'A'`는 결과 저장).
- `app/calcdemo.js`: 왼쪽 계산기에서 다음 키를 깜박여 알려 주고, 직접 눌러도 되고 "다음 키"·자동 재생도 된다. 시연 중엔 기본 설정(MathIO·Deg·Norm1)으로 바꿔 두었다가 끝나면 원래 설정·메모리로 복구한다.
- 새 템플릿을 만들면 같은 id로 가이드를 추가해야 `node test/calc-guide-tests.js`가 통과한다(템플릿마다 600문제를 실제 계산기에 눌러 정답과 비교). 식으로 답하는 문제(라플라스 변환 등)는 대상이 아니다.

## 용어 사전 (나무위키처럼 눌러서 보는 해설)
- `glossary/*.js`: 용어마다 `G.term(id, 이름, { aliases, brief, easy, formulas, units, exam, pitfalls, example, related, concept })`. 글 속에서 이름·별칭이 보이면 자동으로 밑줄 링크가 걸리고(`app/wikiui.js`), 누르면 오른쪽(폰은 전체 화면)에 해설 창이 열린다. 해설 안의 용어도 링크라서 계속 타고 들어갈 수 있다.
- 링크 규칙(`engine/glossary.js`): 한 카드 안에서 용어마다 첫 한 번만, 더 긴 낱말(예: 선간전압) 안의 짧은 용어(전압)는 걸지 않음, 보기·제목·공식·버튼에는 걸지 않음.
- 새 용어를 넣으면 `node test/wiki-tests.js`가 형식, 관련 용어 연결, 별칭 충돌, 예제 계산(`example.expr`를 실제 계산기에 눌러서 `ans`와 비교)을 확인한다.
- 머리글의 책 아이콘 = 전체 목록 + 검색.

## 처음 화면 · 검색
- 머리글의 🏠 버튼 = 처음 화면(배우기 첫 화면). 맨 위 검색창에 말을 치면 용어 해설 / 개념(레슨 읽기·단락 보기·문제 풀기) / 그 개념의 문제 유형 버튼이 나온다(`engine/search.js`, `node test/search-tests.js`).
