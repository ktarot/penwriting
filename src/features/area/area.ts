import { confirmDialog } from "../../app/dialog";
import { h } from "../../app/dom";
import { icon } from "../../app/icons";
import { hrefFor, navigate, type AreaKey } from "../../app/router";
import { appBar, bottomNav, withIcon } from "../../app/shell";
import { customDraft, settings, t } from "../../app/state";
import { fill } from "../../i18n/strings";
import { loadPack } from "../../engines/language/loader";
import { itemInfo } from "../../engines/language/pronunciation";
import { createCustomLesson, deleteCustomLesson, listCustomLessons, updateCustomLesson } from "../../storage/repositories/custom-lessons";
import { getProgressMap } from "../../storage/repositories/progress";
import type { CustomLesson, LanguagePack, LearningItem, LessonCategory, ProgressEntry } from "../../types";
import { areaCategories } from "./areas";

const tabKey = (lang: string, area: string) => `penwriting.tab.${lang}.${area}`;
function readTab(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function writeTab(k: string, v: string): void {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* 기억하지 못해도 동작에는 문제없음 */
  }
}

/** 키보드(←/→/Home/End)로 탭 사이를 움직인다 */
function tablistKeys(list: HTMLElement): void {
  list.addEventListener("keydown", (e) => {
    const tabs = [...list.querySelectorAll<HTMLButtonElement>("[role=tab]")];
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const j = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    tabs[j].focus();
    tabs[j].click();
  });
}

/** 영역 화면: 주제(분류) 탭 + 항목 목록. "내 문장"은 직접 입력·저장 */
export function renderArea(root: HTMLElement, area: AreaKey): () => void {
  const s = t();
  const lang = settings.learningLanguage;
  const native = settings.nativeLanguage;
  let disposed = false;
  const body = h("div", {}, h("p", { class: "loading" }, s.loadingPack));

  root.append(h("div", { class: "screen" }, appBar(s.areas[area], { back: hrefFor.home() }), h("main", { class: "page area" }, body), bottomNav("home")));

  if (area === "mine") {
    body.replaceChildren(customSection(lang, () => disposed));
    return () => {
      disposed = true;
    };
  }

  const itemLabel = (it: LearningItem, pack: LanguagePack, p?: ProgressEntry) => {
    const info = itemInfo(it, native, pack);
    const hint = settings.showNativeReading && !info.sameLanguage && it.level !== "short-sentence" && it.level !== "long-sentence" ? info.nameReading ?? info.nativePronunciation : undefined;
    const meaning = settings.showMeaning && it.level !== "character" ? info.meaning : undefined;
    const sub = [hint, meaning].filter(Boolean).join(" · ");
    return h(
      "a",
      { class: `item-link${p ? " done" : ""}`, href: hrefFor.practice(it.id) },
      h("span", { class: "item-text", lang }, it.text.split("\n")[0] + (it.text.includes("\n") ? " …" : "")),
      sub ? h("span", { class: "item-sub", lang: native }, sub) : null,
      p ? h("span", { class: "count", "aria-label": fill(s.practiceCount, { n: p.practiceCount }) }, fill(s.practiceCount, { n: p.practiceCount })) : null,
    );
  };

  const draw = (pack: LanguagePack, progress: Map<string, ProgressEntry>) => {
    const cats = areaCategories(pack, area);
    const key = tabKey(lang, area);
    const panel = h("div", { class: "tab-panel", role: "tabpanel", id: "area-panel" });
    const section = (c: LessonCategory) =>
      h("section", { class: "card", "data-category": c.id }, h("ul", { class: `item-list level-${c.level}` }, ...c.items.map((it) => h("li", {}, itemLabel(it, pack, progress.get(it.id))))));
    if (cats.length <= 1) {
      body.replaceChildren(...cats.map(section));
      return;
    }
    const tabs = h("div", { class: "subtabs", role: "tablist", "aria-label": s.areas[area] });
    tablistKeys(tabs);
    const select = (id: string) => {
      const cur = cats.find((c) => c.id === id) ?? cats[0];
      writeTab(key, cur.id);
      tabs.querySelectorAll<HTMLButtonElement>("[role=tab]").forEach((b) => {
        const on = b.dataset.sub === cur.id;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute("aria-labelledby", `sub-${cur.id}`);
      panel.replaceChildren(section(cur));
    };
    tabs.replaceChildren(
      ...cats.map((c) =>
        h(
          "button",
          { type: "button", role: "tab", class: "subtab", id: `sub-${c.id}`, "data-sub": c.id, "aria-controls": "area-panel", onclick: () => select(c.id) },
          c.title[native] ?? c.title.en ?? c.id,
          h("span", { class: "subtab-count" }, String(c.items.length)),
        ),
      ),
    );
    select(readTab(key) ?? cats[0].id);
    body.replaceChildren(tabs, panel);
  };

  const load = async () => {
    try {
      const [pack, progress] = await Promise.all([loadPack(lang), getProgressMap()]);
      if (!disposed) draw(pack, progress);
    } catch {
      if (!disposed) body.replaceChildren(h("p", { class: "error", role: "alert" }, s.packError), h("button", { type: "button", class: "btn", onclick: load }, s.retry));
    }
  };
  void load();
  return () => {
    disposed = true;
  };
}

/** 내 문장: 입력 · 연습 · 저장 · 수정 · 삭제 */
function customSection(lang: CustomLesson["language"], isDisposed: () => boolean): HTMLElement {
  const s = t();
  let editing: CustomLesson | null = null;
  const list = h("ul", { class: "custom-list" });
  const textarea = h("textarea", { id: "custom-text", rows: 3, maxlength: 400, placeholder: s.customPlaceholder, lang });
  textarea.value = customDraft.text;
  textarea.addEventListener("input", () => (customDraft.text = textarea.value));
  const saveBtn = h("button", { type: "button", class: "btn" });
  const cancelBtn = h("button", { type: "button", class: "btn", hidden: true }, s.cancel);
  const setEditing = (c: CustomLesson | null) => {
    editing = c;
    saveBtn.replaceChildren(...(c ? [icon("check"), h("span", {}, s.saveSettings)] : [icon("plus"), h("span", {}, s.saveCustom)]));
    cancelBtn.hidden = !c;
    if (c) {
      textarea.value = c.text;
      customDraft.text = c.text;
      textarea.focus();
    }
  };
  setEditing(null);
  saveBtn.addEventListener("click", async () => {
    const text = textarea.value.trim();
    if (!text) return textarea.focus();
    try {
      if (editing) await updateCustomLesson(editing, text);
      else await createCustomLesson(text, lang);
    } catch {
      return;
    }
    textarea.value = "";
    customDraft.text = "";
    setEditing(null);
    void draw();
  });
  cancelBtn.addEventListener("click", () => {
    textarea.value = "";
    customDraft.text = "";
    setEditing(null);
  });
  const draw = async () => {
    const items = await listCustomLessons(lang);
    if (isDisposed()) return;
    list.hidden = items.length === 0;
    list.replaceChildren(
      ...items.map((c) => {
        const del = h("button", { type: "button", class: "btn danger", "aria-label": `${s.delete}: ${c.text}` }, ...withIcon("trash", s.delete));
        del.addEventListener("click", async () => {
          if (!(await confirmDialog(s.deleteConfirm, s.delete, s.cancel))) return;
          await deleteCustomLesson(c.id);
          if (editing?.id === c.id) setEditing(null);
          void draw();
        });
        return h(
          "li",
          { "data-id": c.id },
          h("span", { class: "c-text", lang: c.language }, c.text.replace(/\n/g, " ")),
          h("a", { class: "btn primary", href: hrefFor.practice(c.id) }, s.practice),
          h("button", { type: "button", class: "btn", onclick: () => setEditing(c) }, ...withIcon("edit", s.edit)),
          del,
        );
      }),
    );
  };
  void draw();
  return h(
    "section",
    { class: "card" },
    list,
    h("label", { for: "custom-text", class: "help" }, s.custom),
    textarea,
    h(
      "div",
      { class: "btn-row" },
      h(
        "button",
        {
          type: "button",
          class: "btn primary",
          onclick: () => {
            if (!textarea.value.trim()) return textarea.focus();
            if (editing && editing.text === textarea.value.trim()) return navigate(hrefFor.practice(editing.id));
            navigate(hrefFor.practice("custom"));
          },
        },
        s.customStart,
      ),
      saveBtn,
      cancelBtn,
    ),
  );
}
