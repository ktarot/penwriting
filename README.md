# PenWriting

다국어 펜글씨·언어학습 PWA. 웹 우선, 서버·회원가입 없이 동작.

## 웹에서 바로 쓰기

https://ktarot.github.io/penwriting/  
`main`에 push하면 GitHub Actions가 테스트·빌드 후 자동 배포한다.

## 실행

```bash
npm install
npm run dev        # 개발 서버
npm test           # 단위 테스트 (Vitest)
npm run test:e2e   # 브라우저 테스트 (Playwright: 데스크톱 Chrome + Android 터치 에뮬레이션)
npm run build
```

## 진행 상황

### Phase 1 — 필기 엔진 및 기본 화면 ✅ 구현 · ✅ 자동 테스트 · ✅ 태블릿 확인

필기 엔진(Canvas, Pointer Events, 펜 압력, 손바닥 무시), 획 단위 되돌리기, 3단계 훈련(따라·힌트·혼자), 결과 비교.

### Phase 2 — 다국어 학습 엔진 ✅ 구현 · ✅ 자동 테스트 · ⬜ 실기기 확인 · ⬜ 언어 데이터 검수

- [x] 최초 실행 설정 (모국어, 학습 언어, 글씨체, 글자 크기, 발음·뜻 표시) — IndexedDB에 저장
- [x] 모국어 = 인터페이스 언어 (ko / en / ja / vi), 학습 언어와 독립
- [x] 언어팩 로더 (`public/languages/<언어>/pack.json`, 구조 검사, 버전·검수 상태 포함)
- [x] 한국어: 자음 14, 모음 10, 음절, 단어, 문장, 단락
- [x] 영어: 알파벳 26 (이름과 실제 소리 구분), 단어, 문장, 단락
- [x] 일본어: 히라가나 46, 가타카나 46, 기초 한자 10, 단어, 문장, 단락
- [x] 베트남어: 알파벳 29, 성조 6, 단어(음절별 성조 설명), 문장, 단락
- [x] 문자 이름 / 실제 소리 / 표준 발음 / 모국어 근사 표기 / 뜻 구분 표시
- [x] 단계별 표시 (1단계 발음+뜻, 2단계 발음, 3단계 없음) + 단계마다 직접 켜고 끄기
- [x] 언어별 글꼴 (필요한 언어만 로딩)
- [x] 사용자 문장 입력 (학습 언어로 연습, 발음 안내는 만들지 않음)
- [ ] **언어 데이터 원어민·전문가 검수** — 현재 모든 발음·뜻은 `draft`. 화면에 "근사 표기 · 검수 전"으로 표시됨

### 언어팩 검수 방법

`public/languages/<언어>/pack.json`을 직접 고친다. 검수가 끝난 항목은 `"review": "reviewed"`를 넣고,
팩 전체가 끝나면 팩의 `review.status`를 `"reviewed"`로 바꾼다. `npm test`가 구조를 검사한다.

### 다음: Phase 3 — 저장·접근성·음성
학습 기록 저장·조회·이어하기, 사용자 콘텐츠 저장, 큰 글씨·고대비·색상, 왼손잡이 배치, TTS, PWA·오프라인.

## 설계 메모

- **좌표계:** 줄마다 `em` 단위 논리 좌표계(높이 1.5em)를 두고 가이드(SVG)와 필기(Canvas)가 공유한다.
  스트로크는 줄 기준 0..1 정규화 좌표 + 줄 종횡비로 저장되므로 화면 회전·크기 변경·다른 기기에서도 정렬이 유지된다.
- **데이터 모델 확장:** 계획서 15장 모델에 `Stroke.line`(줄 번호)과 `PracticeRecord.lines`(줄별 텍스트·종횡비)를 추가했다.
  `canvasAspectRatio`는 첫 줄 값으로 유지한다. 선 굵기는 줄 높이 대비 비율.
- **글씨체 변경:** 줄 배치가 달라지므로 필기가 있으면 확인 후 새로 시작한다.
- **줄 나누기:** 기초 문자·단어는 나누지 않고 축소한다. 문장은 단어 단위로, 긴 단어는 고르게 나누며 닫는 문장부호는 줄 맨 앞에 두지 않는다.
- **엔진 분리:** `src/engines/writing`은 언어를 모르고 `LineLayout`(텍스트, 종횡비)만 받는다.

## 글꼴 라이선스

| 글꼴 | 용도 | 라이선스 | 출처 |
|---|---|---|---|
| Noto Sans KR | 한국어 정자체 | SIL OFL 1.1 | `@fontsource/noto-sans-kr` |
| Nanum Pen Script | 한국어 손글씨 | SIL OFL 1.1 | `@fontsource/nanum-pen-script` |
| Noto Sans JP | 일본어 정자체 | SIL OFL 1.1 | `@fontsource/noto-sans-jp` |
| Klee One | 일본어 손글씨(교과서체) | SIL OFL 1.1 | `@fontsource/klee-one` |
| Noto Sans | 영어·베트남어 정자체 | SIL OFL 1.1 | `@fontsource/noto-sans` |
| Patrick Hand | 영어·베트남어 손글씨 | SIL OFL 1.1 | `@fontsource/patrick-hand` |

모두 OFL로 웹 배포 및 앱 내장(Capacitor) 재배포가 가능하다(글꼴 단독 판매 금지).
unicode-range 서브셋으로 필요한 글자 범위만 내려받는다.
