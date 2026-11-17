# PenWriting

다국어 펜글씨·언어학습 PWA. 웹 우선, 서버·회원가입 없이 동작.

## 실행

```bash
npm install
npm run dev        # 개발 서버
npm test           # 단위 테스트 (Vitest)
npm run test:e2e   # 브라우저 테스트 (Playwright: 데스크톱 Chrome + Android 터치 에뮬레이션)
npm run build
```

## 진행 상황

### Phase 1 — 필기 엔진 및 기본 화면 ✅ 구현 / ✅ 자동 테스트 / ⬜ 실기기 검증

- [x] Vite + TypeScript 프로젝트 초기화
- [x] 반응형 기본 화면
- [x] Canvas 필기 엔진 (확정/작성 중 2-레이어, devicePixelRatio 대응)
- [x] 터치·펜·마우스 입력 (Pointer Events, coalesced events, 펜 압력, 펜 사용 시 손바닥 터치 무시)
- [x] 스트로크 데이터 처리 (정규화 좌표, 시간, 압력, 줄 번호, 색상, 굵기)
- [x] 되돌리기(획 단위, Ctrl/⌘+Z) · 전체 지우기
- [x] 정자체(Noto Sans KR) · 손글씨(Nanum Pen Script) 선택
- [x] 흐린 원본 가이드 / 점선 윤곽 가이드 / 기준선만 (투명도 조절)
- [x] 3단계 전환 (단계 간 이동 시 필기 보존)
- [x] 단계별 결과 비교 (원본 겹쳐 보기)
- [x] 긴 문장·단락 줄 단위 분할
- [ ] 실제 Android Chrome / iOS Safari / 펜 기기 검증 — **사람이 직접 확인 필요**

Phase 1 범위 밖이지만 테스트 편의를 위해 넣은 것: 직접 입력 문장 연습(저장 없음).

### 다음: Phase 2 — 다국어 학습 엔진
최초 설정(모국어·학습 언어), 언어팩 로더, ko/en/ja/vi 기초 콘텐츠, 문자 이름·발음·뜻(검수 상태 포함).

## 설계 메모

- **좌표계:** 줄마다 `em` 단위 논리 좌표계(높이 1.5em)를 두고 가이드(SVG)와 필기(Canvas)가 공유한다.
  스트로크는 줄 기준 0..1 정규화 좌표 + 줄 종횡비로 저장되므로 화면 회전·크기 변경·다른 기기에서도 정렬이 유지된다.
- **데이터 모델 확장:** 계획서 15장 모델에 `Stroke.line`(줄 번호)과 `PracticeRecord.lines`(줄별 텍스트·종횡비)를 추가했다.
  `canvasAspectRatio`는 첫 줄 값으로 유지한다. 선 굵기는 줄 높이 대비 비율.
- **글씨체 변경:** 줄 배치가 달라지므로 필기가 있으면 확인 후 새로 시작한다.
- **엔진 분리:** `src/engines/writing`은 언어를 모르고 `LineLayout`(텍스트, 종횡비)만 받는다.

## 글꼴 라이선스

| 글꼴 | 용도 | 라이선스 | 출처 |
|---|---|---|---|
| Noto Sans KR | 정자체 | SIL OFL 1.1 | `@fontsource/noto-sans-kr` |
| Nanum Pen Script | 손글씨 | SIL OFL 1.1 | `@fontsource/nanum-pen-script` |

둘 다 OFL로 웹 배포 및 앱 내장(Capacitor) 재배포가 가능하다(글꼴 단독 판매 금지).
unicode-range 서브셋으로 필요한 글자 범위만 내려받는다.
