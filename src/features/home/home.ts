import { h } from "../../app/dom";
import { hrefFor, navigate } from "../../app/router";
import { customDraft, settings, t } from "../../app/state";
import { fill } from "../../i18n/strings";
import { loadPack } from "../../engines/language/loader";
import { itemInfo } from "../../engines/language/pronunciation";
import type { LanguagePack, LearningItem } from "../../types";

export function renderHome(root: HTMLElement): () => void {
  const s = t();
  const lang = settings.learningLanguage;
  const native = settings.nativeLanguage;
  let disposed = false;

  const lessons = h("div", { class: "lessons" }, h("p", { class: "loading" }, s.loadingPack));

  const textarea = h("textarea", { id: "custom-text", rows: 3, maxlength: 400, placeholder: s.customPlaceholder, lang });
  textarea.value = customDraft.text;
  textarea.addEventListener("input", () => (customDraft.text = textarea.value));

  root.append(
    h(
      "main",
      { class: "page home" },
      h(
        "header",
        { class: "app-header row" },
        h("div", {}, h("h1", {}, "PenWriting"), h("p", { class: "sub" }, s.tagline)),
        h("a", { class: "btn", href: hrefFor.options() }, `⚙ ${s.settings}`),
      ),
      h("p", { class: "pair" }, fill(s.learningPair, { native: s.langName[native], learning: s.langName[lang] })),
      lessons,
      h(
        "section",
        { class: "card" },
        h("h2", {}, h("label", { for: "custom-text" }, s.custom)),
        textarea,
        h(
          "button",
          {
            type: "button",
            class: "btn primary",
            onclick: () => {
              if (!textarea.value.trim()) return textarea.focus();
              navigate(hrefFor.practice("custom"));
            },
          },
          s.customStart,
        ),
      ),
    ),
  );

  const itemLabel = (it: LearningItem, pack: LanguagePack) => {
    const info = itemInfo(it, native, pack);
    const hint = settings.showNativeReading && !info.sameLanguage ? info.nameReading ?? info.nativePronunciation : undefined;
    const meaning = settings.showMeaning && it.level === "word" ? info.meaning : undefined;
    const sub = [hint, meaning].filter(Boolean).join(" · ");
    return h(
      "a",
      { class: "item-link", href: hrefFor.practice(it.id) },
      h("span", { class: "item-text", lang }, it.text.split("\n")[0] + (it.text.includes("\n") ? " …" : "")),
      sub ? h("span", { class: "item-sub", lang: native }, sub) : null,
    );
  };

  const show = async () => {
    lessons.replaceChildren(h("p", { class: "loading" }, s.loadingPack));
    try {
      const pack = await loadPack(lang);
      if (disposed) return;
      const note = pack.review.status === "draft" ? pack.review.note?.[native] : undefined;
      lessons.replaceChildren(
        note ? h("p", { class: "draft-note" }, h("span", { class: "tag draft" }, s.draft), " ", note) : "",
        ...pack.categories.map((c) =>
          h(
            "section",
            { class: "card" },
            h("h2", {}, c.title[native] ?? c.title.en ?? c.id),
            h("ul", { class: `item-list level-${c.level}` }, ...c.items.map((it) => h("li", {}, itemLabel(it, pack)))),
          ),
        ),
      );
    } catch {
      if (disposed) return;
      lessons.replaceChildren(h("p", { class: "error", role: "alert" }, s.packError), h("button", { type: "button", class: "btn", onclick: show }, s.retry));
    }
  };
  void show();
  return () => {
    disposed = true;
  };
}
