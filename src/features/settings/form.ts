import { h } from "../../app/dom";
import { STRINGS } from "../../i18n/strings";
import { ensureFont, fontFor } from "../../engines/writing/fonts";
import { LANGUAGES, type FontStyle, type LanguageCode, type UserSettings } from "../../types";

/** 모국어 선택지는 각 언어 자신의 이름으로 보여 준다 */
export const ENDONYMS: Record<LanguageCode, string> = { ko: "한국어", en: "English", ja: "日本語", vi: "Tiếng Việt" };
const FONT_SAMPLE: Record<LanguageCode, string> = { ko: "가나다", en: "Abc", ja: "あいう", vi: "Ăâê" };
export const FONT_SIZES = [
  { value: 56, key: "sizeSmall" },
  { value: 72, key: "sizeMedium" },
  { value: 92, key: "sizeLarge" },
  { value: 116, key: "sizeXLarge" },
] as const;

type Draft = Pick<UserSettings, "nativeLanguage" | "learningLanguage" | "fontStyle" | "fontSize" | "showNativeReading" | "showMeaning">;

let uid = 0;

function radioGroup<T extends string | number>(
  name: string,
  legend: string,
  help: string | null,
  options: { value: T; label: string; lang?: string; style?: string }[],
  current: T,
  onChange: (v: T) => void,
  cls = "",
) {
  const id = `${name}-${++uid}`;
  return h(
    "fieldset",
    { class: `field ${cls}` },
    h("legend", {}, legend),
    help ? h("p", { class: "help" }, help) : null,
    h(
      "div",
      { class: "choices" },
      ...options.map((o, i) => {
        const input = h("input", { type: "radio", name: id, id: `${id}-${i}`, value: String(o.value), checked: o.value === current });
        input.addEventListener("change", () => input.checked && onChange(o.value));
        return h("label", { class: "choice", for: `${id}-${i}` }, input, h("span", { lang: o.lang, style: o.style }, o.label));
      }),
    ),
  );
}

function toggle(label: string, current: boolean, onChange: (v: boolean) => void, name: string) {
  const id = `${name}-${++uid}`;
  const input = h("input", { type: "checkbox", id, checked: current, role: "switch" });
  input.addEventListener("change", () => onChange(input.checked));
  return h("label", { class: "switch-row", for: id }, h("span", {}, label), input);
}

/**
 * 설정 폼. 모국어를 바꾸면 폼 전체가 그 언어로 다시 그려진다.
 * submitLabel은 현재 인터페이스 언어 문자열에서 고른다.
 */
export function settingsForm(
  initial: Draft,
  submitKey: "start" | "saveSettings",
  onSubmit: (d: Draft) => void,
  onCancel?: () => void,
): HTMLFormElement {
  const draft: Draft = { ...initial };
  const form = h("form", { class: "settings-form" });

  const draw = () => {
    const s = STRINGS[draft.nativeLanguage];
    const learning = draft.learningLanguage;
    form.replaceChildren(
      radioGroup("native", s.nativeQ, s.nativeHelp, LANGUAGES.map((l) => ({ value: l, label: ENDONYMS[l], lang: l })), draft.nativeLanguage, (v) => {
        draft.nativeLanguage = v;
        draw();
      }, "langs"),
      radioGroup("learning", s.learningQ, s.learningHelp, LANGUAGES.map((l) => ({ value: l, label: s.langName[l] })), learning, (v) => {
        draft.learningLanguage = v;
        draw();
      }, "langs"),
      radioGroup(
        "font",
        s.fontQ,
        null,
        (["standard", "handwriting"] as FontStyle[]).map((f) => {
          const def = fontFor(learning, f);
          return { value: f, label: `${s.font[f]} · ${FONT_SAMPLE[learning]}`, lang: learning, style: `font-family:${def.family.replace(/"/g, "'")};font-weight:${def.weight}` };
        }),
        draft.fontStyle,
        (v) => (draft.fontStyle = v),
        "fonts",
      ),
      radioGroup("size", s.sizeQ, null, FONT_SIZES.map((o) => ({ value: o.value, label: s[o.key] })), nearestSize(draft.fontSize), (v) => (draft.fontSize = v)),
      h(
        "fieldset",
        { class: "field" },
        toggle(s.readingQ, draft.showNativeReading, (v) => (draft.showNativeReading = v), "reading"),
        toggle(s.meaningQ, draft.showMeaning, (v) => (draft.showMeaning = v), "meaning"),
      ),
      h("p", { class: "help" }, s.storageNote),
      h(
        "div",
        { class: "form-actions" },
        onCancel ? h("button", { type: "button", class: "btn", onclick: onCancel }, s.cancel) : null,
        h("button", { type: "submit", class: "btn primary" }, s[submitKey]),
      ),
    );
    void ensureFont(learning, "standard", FONT_SAMPLE[learning]);
    void ensureFont(learning, "handwriting", FONT_SAMPLE[learning]);
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    onSubmit({ ...draft });
  });
  draw();
  return form;
}

function nearestSize(v: number): number {
  return FONT_SIZES.reduce((a, b) => (Math.abs(b.value - v) < Math.abs(a.value - v) ? b : a)).value;
}
