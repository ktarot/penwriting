import { isLanguageCode, type LanguageCode, type LanguagePack, type LearningItem } from "../../types";
import { loadPack } from "./loader";

export function languageOfItemId(id: string): LanguageCode | null {
  const code = id.split("-")[0];
  return isLanguageCode(code) ? code : null;
}

export function findItem(pack: LanguagePack, id: string): LearningItem | undefined {
  for (const c of pack.categories) {
    const it = c.items.find((i) => i.id === id);
    if (it) return it;
  }
  return undefined;
}

/** 같은 언어팩 안의 다음 항목 (분류를 넘어 이어진다) */
export function nextItem(pack: LanguagePack, id: string): LearningItem | undefined {
  const all = pack.categories.flatMap((c) => c.items);
  const i = all.findIndex((it) => it.id === id);
  return i >= 0 ? all[i + 1] : undefined;
}

export async function resolveItem(id: string): Promise<{ pack: LanguagePack; item: LearningItem } | null> {
  const lang = languageOfItemId(id);
  if (!lang) return null;
  const pack = await loadPack(lang);
  const item = findItem(pack, id);
  return item ? { pack, item } : null;
}
