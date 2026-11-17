import { h } from "../../app/dom";
import type { Strings } from "../../i18n/strings";
import { hasReadingInfo, type ItemInfo } from "../../engines/language/pronunciation";
import type { LanguageCode } from "../../types";

/** 문자 이름 / 표준 발음 / 모국어 근사 표기 / 뜻을 구분해서 보여 준다 */
export function renderInfoPanel(
  info: ItemInfo,
  vis: { reading: boolean; meaning: boolean },
  s: Strings,
  learning: LanguageCode,
  native: LanguageCode,
): HTMLElement | null {
  const rows: HTMLElement[] = [];
  const approxTags = () => [
    h("span", { class: "tag approx" }, s.approx),
    info.review === "draft" ? h("span", { class: "tag draft", title: s.draftTitle }, s.draft) : null,
  ];
  const row = (cls: string, label: string, ...value: (Node | string | null)[]) =>
    rows.push(h("div", { class: `info-row ${cls}` }, h("dt", {}, label), h("dd", {}, ...value)));

  if (vis.reading && hasReadingInfo(info)) {
    if (info.characterName) {
      row(
        "name",
        s.infoName,
        h("span", { lang: learning, class: "orig" }, info.characterName),
        info.nameReading ? h("span", { lang: native }, ` (${info.nameReading})`) : null,
        ...(info.nameReading ? approxTags() : []),
      );
    }
    if (info.standardReading || info.phonemes?.length) {
      row(
        "standard",
        info.characterName ? s.infoSound : s.infoStandard,
        info.standardReading && !info.phonemes?.length ? h("span", { class: "orig" }, info.standardReading) : null,
        info.phonemes?.length ? h("span", { class: "phonemes" }, info.phonemes.join(" · ")) : null,
      );
    }
    if (info.nativePronunciation) {
      row("native", s.infoNative, h("span", { lang: native, class: "native" }, info.nativePronunciation), ...approxTags());
    }
    if (info.explanation) row("note", s.infoNote, h("span", { lang: native }, info.explanation));
  }
  if (vis.meaning && info.meaning) {
    row("meaning", s.infoMeaning, h("span", { lang: native }, info.meaning), info.review === "draft" ? h("span", { class: "tag draft", title: s.draftTitle }, s.draft) : null);
  }
  if (!rows.length) return null;
  return h("dl", { class: "info-panel" }, ...rows);
}
