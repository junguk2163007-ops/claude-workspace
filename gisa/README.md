# 전기기사 필기 연습장

- 실행: `dist/index.html` 더블클릭 (인터넷 없어도 동작, 글꼴만 기본 글꼴로 바뀜)
- 빌드: `node build.js` → `dist/index.html`, `dist/artifact.html`
- 테스트: `node test/run-tests.js` (템플릿당 3000문제, `N=300`으로 줄일 수 있음)
- 화면 점검: `node test/browser-check.js [스크린샷 폴더]` (Playwright 필요)

## 구조
- `engine/` 시드 난수(rng), 숫자 표기(format), 보기 4개 만들기(choices), 4단 해설 틀(explain), 템플릿 생성(generate), 정적 문제은행(static-bank), 회로도(svg)
- `concepts/concepts.js` 과목 목록 + 회로·제어 개념, `concepts/em.js`·`power.js`·`machine.js` 과목별 개념
  (id, 이름, 그룹, 선행 개념, 개념 카드, 쉬운 비유, 공식)
- `subjects/<과목>/` 문제 템플릿과 정적(이론형) 문제: circuit, em, power, machine
- `lessons/` 배우기 레슨(0. 시작하기 ~ 6. 제어공학). 개념마다 레슨 1개, 예제는 실제 템플릿에서 생성
- `app/` 학습 기록 로직(progress), 저장(storage), 화면(ui), 스타일
- `test/reference.js` 템플릿과 따로 짠 독립 검산기 (새 템플릿을 넣으면 여기에도 추가해야 테스트가 통과함)

## 새 과목 추가 순서
1. `concepts/<과목>.js`에 `G.addConcepts('<과목 id>', [...])`로 개념 추가, `G.subjects`의 `ready: true`
   (과목마다 선행 개념이 없는 시작 개념을 하나 이상 둬야 테스트가 통과함)
2. `subjects/<과목>/*.js`에 `G.defineTemplate({...})`로 템플릿 작성
3. `files.js`의 `content`에 파일 추가, `test/reference.js`에 검산기 추가
4. `node test/run-tests.js` → `node build.js`
