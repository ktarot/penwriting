import type { LanguageCode, LanguagePack, LearningItem, PracticeStep, ReviewStatus } from "../../types";

/**
 * 학습 항목의 발음·뜻 정보를 화면 표시용으로 정리한다.
 * - 문자 이름과 실제 소리를 구분한다.
 * - 표준 발음(원어 기준)과 모국어 근사 표기를 구분한다.
 * - 검수 상태를 함께 넘겨, 검수 전 데이터를 정확한 발음처럼 보이지 않게 한다.
 */
export interface ItemInfo {
  characterName?: string;
  nameReading?: string;
  standardReading?: string;
  phonemes?: string[];
  nativePronunciation?: string;
  meaning?: string;
  explanation?: string;
  review: ReviewStatus;
  /** 모국어와 학습 언어가 같으면 모국어 안내가 필요 없다 */
  sameLanguage: boolean;
}

export function itemInfo(item: LearningItem, native: LanguageCode, pack?: Pick<LanguagePack, "review">): ItemInfo {
  const g = item.nativeGuides?.[native] ?? {};
  return {
    characterName: item.characterName,
    nameReading: g.nameReading,
    standardReading: item.standardReading,
    phonemes: item.phonemes,
    nativePronunciation: g.pronunciation,
    meaning: g.meaning,
    explanation: g.explanation,
    review: item.review ?? pack?.review.status ?? "draft",
    sameLanguage: item.language === native,
  };
}

/** 계획서 6.5 기본 제안: STEP1 발음+뜻, STEP2 발음, STEP3 없음 */
export const STEP_DEFAULT_VISIBILITY: Record<PracticeStep, { reading: boolean; meaning: boolean }> = {
  trace: { reading: true, meaning: true },
  hint: { reading: true, meaning: false },
  free: { reading: false, meaning: false },
};

export interface VisibilityPrefs {
  showNativeReading: boolean;
  showMeaning: boolean;
}

/** 단계 기본값 ∧ 사용자 설정. override가 있으면 사용자가 이 단계에서 직접 바꾼 값을 따른다. */
export function visibilityFor(
  step: PracticeStep,
  prefs: VisibilityPrefs,
  override?: Partial<{ reading: boolean; meaning: boolean }>,
): { reading: boolean; meaning: boolean } {
  const d = STEP_DEFAULT_VISIBILITY[step];
  return {
    reading: override?.reading ?? (d.reading && prefs.showNativeReading),
    meaning: override?.meaning ?? (d.meaning && prefs.showMeaning),
  };
}

export function hasReadingInfo(info: ItemInfo): boolean {
  return Boolean(info.characterName || info.nameReading || info.standardReading || info.phonemes?.length || info.nativePronunciation || info.explanation);
}
