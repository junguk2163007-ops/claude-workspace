---
description: 제목 또는 유튜브 주소 하나로 What If 과학 시뮬레이션 영상(스튜디오 HTML·MP4·SRT·메타데이터)을 끝까지 만든다
argument-hint: "\"What If ...?\" | <youtube-url> [--ratio 9:16|16:9|both] [--lang ko|en|both] [--duration 66] [--upload] [--channel channels/default.json]"
---

# /whatif

입력: `$ARGUMENTS`

작업 폴더는 `whatif-studio/` 이다 (저장소 루트에서 실행됐다면 `cd whatif-studio`). 먼저 `whatif-studio/CLAUDE.md` 규칙을 따른다.

## 0. 인자 정리 (묻는 건 최소한으로)

- 첫 인자: 영상 제목(따옴표) 또는 유튜브 주소.
- 기본값: `--ratio 9:16`, `--lang ko`, `--duration 66`(9:16은 180 이하), `--upload` 없음, `--channel channels/default.json`.
- 기본값으로 충분하면 묻지 말고 바로 만든다. 비율·언어를 알 수 없고 결과가 크게 달라질 때만 한 번에 묶어 질문한다.
- `channels/default.json`에 `_status`(임시 설정 표시)가 남아 있으면 **처음 한 번만** 정욱님께 What If 시리즈 채널의 제목 패턴·설명 푸터·기본 해시태그를 묻고 파일을 고친 뒤 `_status`를 지운다.

## 1-A. 제목만 받았을 때

1. 제목에서 주제를 뽑고 slug를 정한다 (영문 kebab-case, 예: `earth-magnetic-field`). `topics/`에 이미 있으면 정욱님께 덮어쓸지 확인.
2. 웹 검색으로 팩트를 조사한다. NASA·ESA·NOAA·논문·대학·공식 기관을 우선한다. 확신 없는 수치는 단정하지 않는다("약", "추정", "~수 있습니다").

## 1-B. 유튜브 주소를 받았을 때

1. `node ingest.mjs <url>` → `research/<id>/brief.md` (메타데이터·자막만. 영상 파일은 받지 않는다).
2. brief를 읽고 **3줄 요약**(주제 / 다룰 팩트 후보 / 우리 영상에서 다르게 할 점)을 정욱님께 보여준 뒤 진행한다.
3. 원본의 대본 문장·구성 순서·화면 연출은 가져오지 않는다. 팩트는 직접 다시 검색해 검증하고, 대본과 장면은 새로 쓴다.
4. 프레임 추출은 `ownChannelIds`에 있는 정욱님 채널 영상일 때만.

## 2. 주제 데이터 작성

`topics/<slug>/topic.json` (형식은 `topics/sun-disappeared/topic.json` 참고), 필요하면 `topics/<slug>/scenes.js`.

- 타임라인: 훅(0~4초, 댓글 2개 + 카운트다운) → 전제 붕괴(5초 전후 큰 변화) → 결과 6~8비트(5~7초, fact + sub + 자막 2~4줄) → 반전/안도 1구간 → 마무리 → outro.
- 글자 수: fact 11자, sub 28자, 자막 한 줄 16자 이하(한국어). `--lang en|both`면 각 구간에 `en: { fact, sub, narLines }`(한 줄 32자 이하)와 `hook.en`, `outroTitle` 영어판(`en.outroTitle`)을 넣는다.
- 비트마다 숫자나 고유 개념 하나 이상. 의료·금융 조언, 실존 인물 묘사, 공포 조장 연출 금지.
- `sources`(publisher, title, url, usedFor)와 `review`(추정·검토 필요 항목)를 빠짐없이.
- 연출: `scenes/`의 rig는 재사용하되 **shot(카메라·타이밍·색·효과)과 오디오 큐는 주제마다 새로** 쓴다. 이전 주제(`topics/*`)와 같은 구도·같은 사운드 배치를 반복하지 않는다.
- 저장 후 `node scripts/fmt-topic.mjs topics/<slug>/topic.json`.

## 3. 빌드 → 점검 → 렌더

```bash
node build.mjs <slug> --ratio <ratio> --lang <lang> --channel <channel>
node render.mjs <slug> --stills 1,6,12,20,30,40,50,58,62    # 빠른 정지 화면 점검 (비율마다)
node render.mjs <slug>                                     # 최종 MP4 (빌드한 비율 전부)
```

- 빌드 경고(글자 수)는 고친다. 오류가 나면 고치고 다시 빌드.
- stills와 최종 contact sheet(`dist/<slug>/<slug>_<ratio>_sheet.png`)를 **직접 열어서** 자막 잘림·장면 누락·너무 어두운 화면·비율 깨짐을 확인한다. 문제가 있으면 고치고 다시 렌더.
- `dist/<slug>/render.json`의 checks가 전부 true인지, 오디오 피크가 1.0 미만인지 확인.

## 4. 업로드 (`--upload`를 명시했을 때만)

1. `node upload.mjs <slug> --ratio <ratio> --dry-run` 출력(제목·설명·태그·공개 설정)을 정욱님께 보여주고 확인을 받는다.
2. 확인을 받으면 `node upload.mjs <slug> --ratio <ratio> --yes` (기본 private. 예약은 `--publish-at`).
3. 설정 전이면(종료 코드 2) "업로드는 아직 설정 전"이라고 말하고 출력된 설정 가이드를 단계별로 전한다.
4. 첫 업로드 뒤에는 비공개로 잠겼는지 확인하도록 안내한다(미심사 API 프로젝트 제한). 쿼터: 업로드 1회 약 1,600 유닛, 하루 약 6개.

## 5. 저장

산출물을 커밋하고 푸시한다 (저장소 규칙). 브랜치 이름과 올라간 파일 목록을 보고에 넣는다.

## 6. 보고 (결론 먼저)

1. 만든 것: `dist/<slug>/` 의 mp4 / index.html / srt / metadata.json / sources.md 경로
2. 확인한 것: ffprobe 결과(길이·해상도·오디오)와 contact sheet 점검 결과
3. 정욱님이 정할 것: 공개 시점, 필요할 때만 제목 후보 2~3개
4. 추정·불확실 팩트 목록 (`review`)
5. 업로드 빈도·주제 다양성 조언이 필요하면 한 줄 (반복형 콘텐츠 수익화 제외 정책)
