// 계획서 15장 데이터 모델. Phase 1에서 쓰는 부분 + 줄 단위 필기를 위한 확장.

export type LanguageCode = "ko" | "en" | "ja" | "vi";
export const LANGUAGES: readonly LanguageCode[] = ["ko", "en", "ja", "vi"];

export function isLanguageCode(v: unknown): v is LanguageCode {
  return typeof v === "string" && (LANGUAGES as readonly string[]).includes(v);
}

/** 발음·뜻 데이터의 검수 상태 */
export type ReviewStatus = "draft" | "reviewed";

export interface NativeGuide {
  /** 문자 이름을 모국어로 적은 것 (예: ㄱ → giyeok) */
  nameReading?: string;
  /** 실제 소리의 모국어 근사 표기 */
  pronunciation?: string;
  meaning?: string;
  explanation?: string;
}
export type FontStyle = "standard" | "handwriting";
export type PracticeStep = "trace" | "hint" | "free";

export const PRACTICE_STEPS: readonly PracticeStep[] = ["trace", "hint", "free"];

export type LearningLevel =
  | "character"
  | "word"
  | "short-sentence"
  | "long-sentence"
  | "paragraph";

export interface LearningItem {
  id: string;
  language: LanguageCode;
  level: LearningLevel;
  text: string;
  characterName?: string;
  standardReading?: string;
  phonemes?: string[];
  nativeGuides: Partial<Record<LanguageCode, NativeGuide>>;
  /** 음성 재생용. text가 있으면 원문 대신 그 텍스트를 읽는다 (예: ㄱ → "기역") */
  speech?: { locale?: string; text?: string; audioAsset?: string };
  /** 없으면 언어팩의 검수 상태를 따른다 */
  review?: ReviewStatus;
}

export interface LessonCategory {
  id: string;
  level: LearningLevel;
  title: Partial<Record<LanguageCode, string>>;
  items: LearningItem[];
}

export interface LanguagePack {
  language: LanguageCode;
  version: string;
  locale: string;
  review: { status: ReviewStatus; note?: Partial<Record<LanguageCode, string>> };
  categories: LessonCategory[];
}

/** 계획서 15장 UserSettings + 필기 도구 설정 */
export interface UserSettings {
  nativeLanguage: LanguageCode;
  learningLanguage: LanguageCode;
  fontStyle: FontStyle;
  /** 단어·문장 기준 1em 최대 표시 크기(px) */
  fontSize: number;
  guideOpacity: { trace: number; hint: number };
  highContrast: boolean;
  showNativeReading: boolean;
  showMeaning: boolean;
  speechRate: number;
  inkColor: string;
  /** 줄 높이 대비 선 굵기 */
  inkWidth: number;
  onboarded: boolean;
  /** 화면 글자 배율 (큰 글씨) */
  uiScale: number;
  theme: "system" | "light" | "dark";
  /** 필기 종이 색 */
  paperColor: PaperColor;
  /** 왼손잡이면 도구를 반대쪽에 둔다 */
  handedness: "right" | "left";
}

export type PaperColor = "cream" | "white" | "green" | "yellow" | "board";

/** 사용자가 저장한 연습 문장 */
export interface CustomLesson {
  id: string;
  text: string;
  language: LanguageCode;
  createdAt: string;
  updatedAt: string;
}

/** 항목별 학습 진도 */
export interface ProgressEntry {
  learningItemId: string;
  language: LanguageCode;
  text: string;
  completedSteps: PracticeStep[];
  practiceCount: number;
  lastPracticedAt: string;
}

/** 진행 중인 필기 임시 저장 (이어서 쓰기) */
export interface PracticeDraft {
  learningItemId: string;
  sourceText: string;
  language: LanguageCode;
  fontStyle: FontStyle;
  lines: LineLayout[];
  maxEmPx: number;
  step: PracticeStep;
  attempts: Record<PracticeStep, Stroke[]>;
  completed: Partial<Record<PracticeStep, string>>;
  updatedAt: string;
}

/**
 * 정규화 좌표: x는 줄 너비 기준 0..1, y는 줄 높이 기준 0..1.
 * 줄의 종횡비(LineLayout.aspect)와 함께 저장하면 어떤 화면 크기에서도 복원된다.
 */
export interface StrokePoint {
  x: number;
  y: number;
  /** 스트로크 시작 기준 경과 ms */
  t: number;
  /** 펜 입력에서만 기록 (0..1) */
  pressure?: number;
}

export interface Stroke {
  id: string;
  /** 몇 번째 줄에 쓴 획인지 (긴 문장·단락의 줄 단위 필기) */
  line: number;
  points: StrokePoint[];
  color: string;
  /** 선 굵기: 줄 높이에 대한 비율 */
  width: number;
}

export interface PracticeAttempt {
  step: PracticeStep;
  strokes: Stroke[];
  completedAt?: string;
}

export interface LineLayout {
  text: string;
  /** 너비 / 높이 */
  aspect: number;
}

export interface PracticeRecord {
  id: string;
  /** 비교 화면 표시용 */
  level?: LearningLevel;
  maxEmPx?: number;
  learningItemId: string | null;
  sourceText: string;
  language: LanguageCode;
  fontStyle: FontStyle;
  /** 첫 줄의 종횡비 (계획서 모델 호환). 줄별 값은 lines에 있다. */
  canvasAspectRatio: number;
  lines: LineLayout[];
  attempts: PracticeAttempt[];
  createdAt: string;
}
