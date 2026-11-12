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
