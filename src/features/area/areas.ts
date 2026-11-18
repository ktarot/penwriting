import type { AreaKey } from "../../app/router";
import type { IconName } from "../../app/icons";
import type { LanguagePack, LearningItem, LearningLevel, LessonCategory } from "../../types";

/** 홈의 학습 영역 ↔ 학습 단위 */
export const AREA_LEVELS: Record<Exclude<AreaKey, "mine">, LearningLevel[]> = {
  character: ["character"],
  word: ["word"],
  short: ["short-sentence"],
  long: ["long-sentence", "paragraph"],
};

export const AREA_ICON: Record<AreaKey, IconName> = { character: "letters", word: "word", short: "chat", long: "doc", mine: "bookmark" };

export function areaCategories(pack: LanguagePack, area: Exclude<AreaKey, "mine">): LessonCategory[] {
  return pack.categories.filter((c) => AREA_LEVELS[area].includes(c.level));
}

/** 연습 항목이 속한 영역 (앱 막대의 상위 화면) */
export function areaOfItem(item: Pick<LearningItem, "id" | "level">): AreaKey {
  if (item.id === "custom" || item.id.startsWith("custom-")) return "mine";
  for (const [k, levels] of Object.entries(AREA_LEVELS)) if (levels.includes(item.level)) return k as AreaKey;
  return "word";
}
