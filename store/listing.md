# Google Play 등록 자료 (초안)

> 이 문서와 `store/` 폴더의 이미지는 Play Console 입력용 초안입니다. 등록 전에 내용을 확인하세요.

## 기본 정보

| 항목 | 값 |
|---|---|
| 앱 이름 | PenWriting |
| 카테고리 | 교육 (Education) |
| 태그 후보 | 언어 학습, 글씨 연습, 교육 |
| 개인정보처리방침 URL | https://ktarot.github.io/penwriting/privacy.html |
| 문의 | 개발자 이메일 — **Play Console에 직접 입력** (GitHub Issues: https://github.com/ktarot/penwriting/issues) |
| 광고 | 없음 |
| 인앱 결제 | 없음 |

## 간단한 설명 (80자 이내)

- ko: `따라 쓰고, 힌트 보고, 혼자 쓰는 3단계 펜글씨 연습. 한국어·영어·일본어·베트남어` (44자)
- en: `Trace, use hints, then write alone: 3-step handwriting for Korean, English, Japanese, Vietnamese` (→ 80자 초과 시 아래 사용)
- en (80자): `3-step handwriting practice for Korean, English, Japanese and Vietnamese`

## 자세한 설명

### ko
PenWriting은 펜과 손가락으로 글씨를 연습하는 앱입니다.

■ 3단계 반복 훈련
1. 따라 쓰기: 흐린 원본 위에 그대로 따라 씁니다.
2. 힌트 쓰기: 점선 윤곽만 보고 글자의 구조를 떠올리며 씁니다.
3. 혼자 쓰기: 기준선만 보고 기억으로 씁니다.
마친 뒤에는 원본과 단계별 글씨를 나란히 놓고 비교합니다.

■ 네 가지 언어
한국어, 영어, 일본어, 베트남어의 글자부터 생활 단어(숫자·단위·방향·주소·시간·가족·음식·장소), 질문과 답, 안내문과 에세이까지 연습합니다. 모국어로 발음과 뜻을 안내하고, 기기 음성으로 들을 수 있습니다.

■ 일본어 획순
히라가나·가타카나·기초 한자의 획순과 방향을 한 획씩 보여 줍니다.

■ 편하게
- 태블릿과 펜에 맞춘 필기, 손바닥 닿음 무시
- 정자체·손글씨 글꼴, 큰 글씨, 고대비, 어두운 화면, 칠판 종이, 왼손잡이 배치
- 학습 기록 저장, 쓰던 글씨 이어 쓰기
- 회원가입 없음, 광고 없음, 인터넷 없이도 사용(한 번 열어 본 내용)

※ 발음·뜻 안내는 현재 원어민 검수 전 자료이며, 앱 안에 "검수 전"으로 표시됩니다.

### en
PenWriting helps you practice handwriting with a stylus or your finger.

■ Three-step practice
1. Trace: write over a faint model.
2. Hint: look only at a dotted outline and recall the shape.
3. On your own: write from memory with just a baseline.
Then compare the model with what you wrote at each step.

■ Four languages
Korean, English, Japanese and Vietnamese — from letters to everyday words (numbers, units, directions, addresses, time, family, food, places), questions and answers, notices and short essays. Pronunciation and meaning hints appear in your native language, and you can listen with your device's voice.

■ Japanese stroke order
See the order and direction of each stroke for hiragana, katakana and basic kanji.

■ Comfortable to use
- Made for tablets and styluses, with palm rejection
- Print and handwriting fonts, large text, high contrast, dark theme, chalkboard paper, left-handed layout
- Save your practice log and continue unfinished writing
- No sign-up, no ads, works offline for content you've opened

Note: pronunciation and meaning hints have not yet been reviewed by native speakers and are marked "unreviewed" in the app.

## 데이터 보안 (Data safety) 답변

| 질문 | 답 |
|---|---|
| 사용자 데이터를 수집하나요? | **아니요** — 모든 데이터는 기기에만 저장되고 외부로 전송되지 않음 |
| 사용자 데이터를 공유하나요? | 아니요 |
| 전송 중 암호화 | 해당 없음 (전송하는 사용자 데이터 없음). 앱 파일은 HTTPS로 내려받음 |
| 데이터 삭제 요청 방법 | 앱의 [기록] → [전체 기록 삭제], 또는 앱 삭제·앱 데이터 삭제 |

> 패키징 방식에 따라 다시 확인: Capacitor로 앱 안에 파일을 넣으면 네트워크 사용이 더 줄어듭니다.

## 콘텐츠 등급

폭력·성적 내용·도박·사용자 간 소통·위치 공유 없음 → "전체 이용가(3+)" 예상. 설문은 Play Console에서 직접 작성.

## 그래픽 자료 (`store/`)

| 파일 | 규격 | Play 요구 |
|---|---|---|
| `public/icons/icon-512.png` | 512×512 | 앱 아이콘 512×512 PNG |
| `feature-graphic.png` | 1024×500 | 그래픽 이미지 1024×500 |
| `screenshots/phone-*.png` | 1080×1920 (4장) | 휴대폰 2~8장, 9:16 |
| `screenshots/tablet-*.png` | 2560×1600 (3장) | 10인치 태블릿 (권장) |

다시 만들기: `npm run build && npx vite preview --port 4173` 실행 후 `node scripts/store-assets.cjs`
실제 갤럭시탭에서 펜으로 쓴 화면을 캡처해 바꾸면 더 좋습니다.

## 등록 전 남은 일

- [ ] **앱 패키징** (다음 단계): Capacitor Android 프로젝트 → AAB 빌드·서명 (Android Studio가 있는 PC 필요)
- [ ] Google Play 개발자 계정 (등록비 1회 25 USD)
- [ ] 개발자 연락 이메일 입력 (Play Console)
- [ ] 콘텐츠 등급 설문, 데이터 보안 양식, 대상 연령 설정
- [ ] 비공개 테스트: 신규 개인 개발자 계정은 테스터 12명 이상 × 14일 비공개 테스트 후 프로덕션 신청 가능 (2023년 11월 이후 생성 계정 기준 정책 — 등록 시점에 Play Console 안내 확인)
- [ ] 언어 데이터 원어민 검수 (권장)
