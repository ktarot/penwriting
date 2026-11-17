// 계획서 15장 데이터 모델. Phase 1에서 쓰는 부분 + 줄 단위 필기를 위한 확장.

export type LanguageCode = "ko" | "en" | "ja" | "vi";
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
  nativeGuides: Record<
    string,
    { nameReading?: string; pronunciation?: string; meaning?: string; explanation?: string }
  >;
  speech?: { locale: string; audioAsset?: string };
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
