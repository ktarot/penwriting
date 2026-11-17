import { h } from "../../app/dom";
import { navigate } from "../../app/router";
import { customDraft, settings } from "../../app/state";
import { LEVEL_LABELS, SAMPLE_ITEMS } from "../../engines/language/samples";
import { FONT_LABELS } from "../../engines/writing/fonts";
import type { FontStyle, LearningItem } from "../../types";

export function renderHome(root: HTMLElement): () => void {
  const fontToggle = h(
    "div",
    { class: "segmented", role: "radiogroup", "aria-label": "글씨체" },
    ...(Object.keys(FONT_LABELS) as FontStyle[]).map((style) =>
      h(
        "button",
        {
          type: "button",
          role: "radio",
          class: `seg font-${style}`,
          "aria-checked": String(settings.fontStyle === style),
          onclick: () => {
            settings.fontStyle = style;
            fontToggle.querySelectorAll("button").forEach((b) => {
              b.setAttribute("aria-checked", String(b.classList.contains(`font-${style}`)));
            });
          },
        },
        FONT_LABELS[style],
      ),
    ),
  );

  const groups = new Map<LearningItem["level"], LearningItem[]>();
  for (const it of SAMPLE_ITEMS) {
    if (!groups.has(it.level)) groups.set(it.level, []);
    groups.get(it.level)!.push(it);
  }

  const textarea = h("textarea", {
    id: "custom-text",
    rows: 3,
    maxlength: 400,
    placeholder: "연습할 글자, 단어, 문장을 입력하세요",
  });
  textarea.value = customDraft.text;
  textarea.addEventListener("input", () => (customDraft.text = textarea.value));

  root.append(
    h(
      "main",
      { class: "page home" },
      h("header", { class: "app-header" }, h("h1", {}, "PenWriting"), h("p", { class: "sub" }, "따라 쓰고, 힌트 보고, 혼자 쓰는 3단계 펜글씨 연습")),
      h("section", { class: "card" }, h("h2", {}, "글씨체"), fontToggle),
      ...[...groups.entries()].map(([level, items]) =>
        h(
          "section",
          { class: "card" },
          h("h2", {}, LEVEL_LABELS[level]),
          h(
            "ul",
            { class: `item-list level-${level}` },
            ...items.map((it) =>
              h(
                "li",
                {},
                h(
                  "a",
                  { class: "item-link", href: `#/practice/${encodeURIComponent(it.id)}`, lang: it.language },
                  it.text.split("\n")[0] + (it.text.includes("\n") ? " …" : ""),
                ),
              ),
            ),
          ),
        ),
      ),
      h(
        "section",
        { class: "card" },
        h("h2", {}, h("label", { for: "custom-text" }, "직접 입력")),
        textarea,
        h(
          "button",
          {
            type: "button",
            class: "btn primary",
            onclick: () => {
              if (!textarea.value.trim()) {
                textarea.focus();
                return;
              }
              navigate("/practice/custom");
            },
          },
          "이 문장으로 연습",
        ),
      ),
    ),
  );
  return () => {};
}
