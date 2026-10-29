# WhatIf Studio — 작업 규칙

유튜브 "What If" 과학 시뮬레이션 영상을 코드로 만든다. 사용자는 정욱님. 한국어로 답하고, 결론을 먼저, 호칭은 '정욱님'.

## 구조

| 경로 | 역할 |
| --- | --- |
| `reference/` | 원본 레퍼런스 HTML. **수정 금지** |
| `vendor/` | three.js r128, 나눔명조·Noto Sans KR (오프라인 렌더용 로컬 사본) |
| `engine/` | 공통 엔진: `core`(시드 난수) `layout`(9:16/16:9) `world`(rig·shot 레지스트리) `composite`(자막·팩트·HUD) `audio`(실시간/오프라인) `text`(SRT·챕터·메타데이터) `studio`(UI·렌더 훅) |
| `scenes/` | 재사용 장면(rig): stars, moon, meteors, skysun, ground(+people), ocean, reef, space(지구), sun(+광선) |
| `topics/<slug>/topic.json` | 타임라인·rig 목록·shot 매핑·오디오 큐·출처·검토 메모 |
| `topics/<slug>/scenes.js` | 주제 전용 rig·연출(shot) |
| `channels/*.json` | 채널별 제목 패턴·설명 푸터·해시태그 |
| `dist/<slug>/` | 산출물 (index.html, mp4, srt, metadata.json, title.txt, description.txt, sources.md, contact sheet) |

## 명령

```bash
node build.mjs <slug> [--ratio 9:16|16:9|both] [--lang ko|en|both] [--channel channels/x.json] [--strict]
node render.mjs <slug> [--ratio ...] [--stills 1,5,9]   # --stills: 인코딩 없이 정지 화면 시트로 빠른 점검
node scripts/verify-reference.mjs --ref reference/<파일>.html --slug <slug>   # 레퍼런스 동일 재현 검증
node ingest.mjs <youtube-url>                             # research/<id>/brief.md
node upload.mjs <slug> --dry-run → (정욱님 확인) → --yes  # 기본 비공개
node scripts/fmt-topic.mjs topics/<slug>/topic.json       # topic.json 정리
```

필요: Node 20+, ffmpeg/ffprobe, Playwright Chromium, `pip install fonttools brotli`, (ingest) yt-dlp.

## 엔진 규칙

- 장면은 `updateWorld(t)`처럼 **시간 t만으로** 정해지게 쓴다. 입자는 가능하면 무상태(t로 위치 계산)로 만든다.
- 난수는 `Math.random`을 그대로 쓰면 엔진이 시드 난수(mulberry32)로 바꿔 준다. three.js UUID는 별도 난수열을 쓴다(build.mjs가 인라인 three를 패치).
- shot 함수 인자: `t`(절대 시간, 흔들림 위상), `lt`(구간 기준), `W`(월드: setScene/setBG/setLights/look/hud), `R`(rig들).
- 카메라는 `W.look(px,py,pz, tx,ty,tz)`. 비율별 거리 배율은 shots 항목의 `"frame": {"16x9": 0.9}`.
- HUD는 `W.hud = { big, small, color? }`.
- 나눔명조의 `°`는 전각이라 `°C`가 벌어진다 → 온도는 `℃`를 쓴다.
- 오디오 효과: noise, crash, crickets, swell, subDrop, thump, drone, waves, bubble(높은 주파수 = 새소리), chime, organ(BGM 버스).

## 스크립트 규칙 (topic.json)

- 구간: 훅(0~4초, `comment: true`, 댓글 2개 + 카운트다운) → 전제 붕괴(5초 전후) → 결과 비트 6~8개(각 5~7초) → 반전/안도 1구간 → 마무리 → outro(`outro: true`).
- 9:16 한국어: 자막 한 줄 16자 이하, fact 11자 이하, sub 28자 이하. 영어 자막 한 줄 32자 이하. `build.mjs`가 경고하고 `--strict`면 실패.
- 비트마다 숫자나 고유 개념 하나 이상. 확신 없는 수치는 "약", "추정", "~수 있습니다".
- 의료·금융 조언, 실존 인물 묘사, 공포 조장 연출 금지.
- 모든 팩트는 `sources`에 출처(NASA·ESA·NOAA·논문·대학·공식 기관 우선), 추정치는 `review`에 적는다 → `sources.md`.

## 품질·정책

- 주제마다 연출(shot)과 대본을 새로 쓴다. rig(3D 자산)만 재사용. 템플릿 복붙 금지 — 유튜브는 대량 생산·반복형 콘텐츠를 수익화에서 제외한다.
- 실제 사진·로고·캐릭터·음악 저작물 사용 금지. 장면과 소리는 코드로만 만든다.
- 남의 유튜브 영상: 메타데이터·자막만 참고, 영상 파일 다운로드·프레임 추출·대본/구성/연출 재현 금지. 프레임 추출은 `channels/*.json`의 `ownChannelIds`(정욱님 채널)만.
- 업로드는 정욱님이 `--upload`를 명시했을 때만, `--dry-run` 내용을 보여주고 확인받은 뒤. 기본 비공개. 토큰은 `~/.config/whatif-studio/`(git 밖).

## 렌더 점검 (매번)

1. `render.json`의 checks(길이·해상도·프레임 수·오디오 트랙)가 모두 true.
2. contact sheet(`<slug>_<ratio>_sheet.png`)를 직접 열어 자막 잘림·장면 누락·비율 깨짐 확인. 필요하면 `--stills`로 구간을 더 본다.
3. 오디오 피크 1.0 미만 (넘으면 cue vol을 낮춘다).

## 보고 형식 (정욱님께)

결론 먼저 → ① 만든 것(파일 경로) ② 확인한 것(ffprobe, contact sheet) ③ 정욱님이 정할 것(공개 시점, 필요하면 제목 후보 2~3개) ④ 추정·불확실 팩트 표시.
