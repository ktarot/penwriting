import type { LearningItem } from "../../types";

/**
 * Phase 1 필기 엔진 검증용 최소 샘플.
 * 발음·뜻 정보는 Phase 2 언어팩(검수 상태 포함)에서 제공하므로 여기서는 원문만 둔다.
 */
const item = (id: string, level: LearningItem["level"], text: string, language: LearningItem["language"] = "ko"): LearningItem => ({
  id,
  language,
  level,
  text,
  nativeGuides: {},
});

export const SAMPLE_ITEMS: LearningItem[] = [
  item("ko-char-giyeok", "character", "ㄱ"),
  item("ko-char-a", "character", "ㅏ"),
  item("ko-char-ga", "character", "가"),
  item("ko-word-hangeul", "word", "한글"),
  item("ko-word-annyeong", "word", "안녕하세요"),
  item("ko-short-1", "short-sentence", "오늘도 좋은 하루"),
  item("ko-long-1", "long-sentence", "천천히 바르게 쓰는 연습이 좋은 글씨를 만듭니다."),
  item(
    "ko-para-1",
    "paragraph",
    "글씨는 마음의 거울이라고 합니다.\n한 획 한 획 정성을 들여 쓰다 보면 손이 글자의 모양을 기억하게 됩니다.",
  ),
  item("en-char-a", "character", "Aa", "en"),
  item("en-word-hello", "word", "hello", "en"),
  item("en-short-1", "short-sentence", "Practice makes perfect.", "en"),
];

export const LEVEL_LABELS: Record<LearningItem["level"], string> = {
  character: "기초 문자",
  word: "단어",
  "short-sentence": "짧은 문장",
  "long-sentence": "긴 문장",
  paragraph: "단락",
};

export function findSampleItem(id: string): LearningItem | undefined {
  return SAMPLE_ITEMS.find((i) => i.id === id);
}
