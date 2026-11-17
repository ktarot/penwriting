import { confirmDialog } from "../../app/dialog";
import { h } from "../../app/dom";
import { hrefFor, navigate } from "../../app/router";
import { customDraft, settings, t } from "../../app/state";
import { fill } from "../../i18n/strings";
import { findItem, nextItem } from "../../engines/language/lessons";
import { loadPack } from "../../engines/language/loader";
import { itemInfo } from "../../engines/language/pronunciation";
import { createCustomLesson, deleteCustomLesson, listCustomLessons, updateCustomLesson } from "../../storage/repositories/custom-lessons";
import { latestDraft } from "../../storage/repositories/drafts";
import { getProgressMap } from "../../storage/repositories/progress";
import type { CustomLesson, LanguagePack, LearningItem, LessonCategory, ProgressEntry } from "../../types";

type TabKey = "character" | "word" | "sentence" | "paragraph" | "mine";

const tabStoreKey = (lang: string) => `penwriting.tab.${lang}`;
function readTab(lang: string): string | null {
  try {
    return localStorage.getItem(tabStoreKey(lang));
  } catch {
    return null;
  }
}
function writeTab(lang: string, v: string): void {
  try {
    localStorage.setItem(tabStoreKey(lang), v);
  } catch {
    /* 기억 못 해도 동작에는 문제없음 */
  }
}

/** 키보드(←/→/Home/End)로 탭 사이를 움직인다 */
function tablistKeys(list: HTMLElement): void {
  list.addEventListener("keydown", (e) => {
    const tabs = [...list.querySelectorAll<HTMLButtonElement>("[role=tab]")];
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    let j = -1;
    if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = tabs.length - 1;
    if (j < 0) return;
    e.preventDefault();
    tabs[j].focus();
    tabs[j].click();
  });
}

export function renderHome(root: HTMLElement): () => void {
  const s = t();
  const lang = settings.learningLanguage;
  const native = settings.nativeLanguage;
  let disposed = false;

  const continueEl = h("div");
  const lessons = h("div", { class: "lessons" }, h("p", { class: "loading" }, s.loadingPack));
  const customList = h("ul", { class: "custom-list" });

  // 직접 입력
  let editing: CustomLesson | null = null;
  const textarea = h("textarea", { id: "custom-text", rows: 3, maxlength: 400, placeholder: s.customPlaceholder, lang });
  textarea.value = customDraft.text;
  textarea.addEventListener("input", () => (customDraft.text = textarea.value));
  const saveCustomBtn = h("button", { type: "button", class: "btn" }, `＋ ${s.saveCustom}`);
  const cancelEditBtn = h("button", { type: "button", class: "btn", hidden: true }, s.cancel);
  const setEditing = (c: CustomLesson | null) => {
    editing = c;
    saveCustomBtn.textContent = c ? `✓ ${s.saveSettings}` : `＋ ${s.saveCustom}`;
    cancelEditBtn.hidden = !c;
    if (c) {
      textarea.value = c.text;
      customDraft.text = c.text;
      textarea.focus();
    }
  };
  saveCustomBtn.addEventListener("click", async () => {
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
    void drawCustom();
  });
  cancelEditBtn.addEventListener("click", () => {
    textarea.value = "";
    customDraft.text = "";
    setEditing(null);
  });

  const drawCustom = async () => {
    const items = await listCustomLessons(lang);
    if (disposed) return;
    customList.hidden = items.length === 0;
    customList.replaceChildren(
      ...items.map((c) => {
        const del = h("button", { type: "button", class: "btn danger", "aria-label": `${s.delete}: ${c.text}` }, s.delete);
        del.addEventListener("click", async () => {
          if (!(await confirmDialog(s.deleteConfirm, s.delete, s.cancel))) return;
          await deleteCustomLesson(c.id);
          if (editing?.id === c.id) setEditing(null);
          void drawCustom();
        });
        return h(
          "li",
          { "data-id": c.id },
          h("span", { class: "c-text", lang: c.language }, c.text.replace(/\n/g, " ")),
          h("a", { class: "btn primary", href: hrefFor.practice(c.id) }, s.practice),
          h("button", { type: "button", class: "btn", onclick: () => setEditing(c) }, s.edit),
          del,
        );
      }),
    );
  };

  root.append(
    h(
      "main",
      { class: "page home" },
      h(
        "header",
        { class: "app-header row" },
        h("div", {}, h("h1", {}, "PenWriting"), h("p", { class: "sub" }, s.tagline)),
        h("div", { class: "header-actions" }, h("a", { class: "btn", href: hrefFor.history() }, `📒 ${s.history}`), h("a", { class: "btn", href: hrefFor.options() }, `⚙ ${s.settings}`)),
      ),
      h("p", { class: "pair" }, fill(s.learningPair, { native: s.langName[native], learning: s.langName[lang] })),
      continueEl,
      lessons,
    ),
  );
  const customCard = h(
        "section",
        { class: "card" },
        h("h2", {}, s.myLessons),
        customList,
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
          saveCustomBtn,
          cancelEditBtn,
        ),
      );

  const itemLabel = (it: LearningItem, pack: LanguagePack, p?: ProgressEntry) => {
    const info = itemInfo(it, native, pack);
    const hint = settings.showNativeReading && !info.sameLanguage ? info.nameReading ?? info.nativePronunciation : undefined;
    const meaning = settings.showMeaning && it.level === "word" ? info.meaning : undefined;
    const sub = [hint, meaning].filter(Boolean).join(" · ");
    return h(
      "a",
      { class: `item-link${p ? " done" : ""}`, href: hrefFor.practice(it.id) },
      h("span", { class: "item-text", lang }, it.text.split("\n")[0] + (it.text.includes("\n") ? " …" : "")),
      sub ? h("span", { class: "item-sub", lang: native }, sub) : null,
      p ? h("span", { class: "count", "aria-label": fill(s.practiceCount, { n: p.practiceCount }) }, fill(s.practiceCount, { n: p.practiceCount })) : null,
    );
  };

  /** 쓰던 필기가 있으면 그것을, 없으면 최근 학습의 다음 항목을 권한다 */
  const drawContinue = async (pack: LanguagePack, progress: Map<string, ProgressEntry>) => {
    const draft = await latestDraft();
    if (disposed) return;
    let target: { id: string; text: string; label: string } | null = null;
    if (draft) {
      target = { id: draft.learningItemId, text: draft.sourceText, label: s.continueDraft };
    } else {
      const recent = [...progress.values()].filter((p) => p.language === lang).sort((a, b) => b.lastPracticedAt.localeCompare(a.lastPracticedAt))[0];
      const next = recent && findItem(pack, recent.learningItemId) ? nextItem(pack, recent.learningItemId) : undefined;
      if (next) target = { id: next.id, text: next.text, label: `${s.suggested} · ${s.nextItem}` };
    }
    if (!target) return continueEl.replaceChildren();
    continueEl.replaceChildren(
      h(
        "section",
        { class: "card continue" },
        h("div", { style: "min-width:0" }, h("h2", {}, target.label), h("div", { class: "c-src", lang: draft?.language ?? lang }, target.text.replace(/\n/g, " "))),
        h("a", { class: "btn primary", href: hrefFor.practice(target.id) }, `${s.continueTitle} →`),
      ),
    );
  };

  /** 학습 단위 탭 + (기초 문자) 분류 탭. 순서대로 해야 한다는 인상을 주지 않도록 한 번에 한 묶음만 보여 준다 */
  const drawTabs = (pack: LanguagePack, progress: Map<string, ProgressEntry>) => {
    const groups: { key: TabKey; label: string; cats: LessonCategory[] }[] = [
      { key: "character", label: s.level.character, cats: pack.categories.filter((c) => c.level === "character") },
      { key: "word", label: s.level.word, cats: pack.categories.filter((c) => c.level === "word") },
      { key: "sentence", label: s.tabSentences, cats: pack.categories.filter((c) => c.level === "short-sentence" || c.level === "long-sentence") },
      { key: "paragraph", label: s.level.paragraph, cats: pack.categories.filter((c) => c.level === "paragraph") },
    ];
    const tabs = [...groups.filter((g) => g.cats.length), { key: "mine" as TabKey, label: s.myLessons, cats: [] }];
    const saved = readTab(lang) ?? "";
    let [cur, sub] = saved.split(":") as [TabKey, string | undefined];
    if (!tabs.some((t) => t.key === cur)) cur = tabs[0].key;

    const tablist = h("div", { class: "tabs", role: "tablist", "aria-label": s.tabsLabel });
    const panel = h("div", { class: "tab-panel", role: "tabpanel", id: "lesson-panel", tabindex: "-1" });
    tablistKeys(tablist);

    const catSection = (c: LessonCategory, withTitle: boolean) =>
      h(
        "section",
        { class: "card", "data-category": c.id },
        withTitle ? h("h2", {}, c.title[native] ?? c.title.en ?? c.id) : null,
        h("ul", { class: `item-list level-${c.level}` }, ...c.items.map((it) => h("li", {}, itemLabel(it, pack, progress.get(it.id))))),
      );

    const select = (key: TabKey, subKey?: string) => {
      cur = key;
      tablist.querySelectorAll<HTMLButtonElement>("[role=tab]").forEach((b) => {
        const on = b.dataset.tab === key;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      const g = tabs.find((t) => t.key === key)!;
      panel.setAttribute("aria-labelledby", `tab-${key}`);
      if (key === "mine") {
        writeTab(lang, key);
        panel.replaceChildren(customCard);
        return;
      }
      if (g.cats.length > 1 && key === "character") {
        // 분류 탭 (예: 히라가나 / 가타카나 / 한자)
        const subCur = g.cats.find((c) => c.id === subKey) ?? g.cats[0];
        writeTab(lang, `${key}:${subCur.id}`);
        const subs = h(
          "div",
          { class: "subtabs", role: "tablist", "aria-label": g.label },
          ...g.cats.map((c) =>
            h(
              "button",
              {
                type: "button",
                role: "tab",
                class: "subtab",
                "data-sub": c.id,
                "aria-selected": String(c === subCur),
                tabindex: c === subCur ? 0 : -1,
                onclick: () => select(key, c.id),
              },
              c.title[native] ?? c.title.en ?? c.id,
            ),
          ),
        );
        tablistKeys(subs);
        panel.replaceChildren(subs, catSection(subCur, false));
        return;
      }
      writeTab(lang, key);
      panel.replaceChildren(...g.cats.map((c) => catSection(c, g.cats.length > 1)));
    };

    tablist.replaceChildren(
      ...tabs.map((t) =>
        h(
          "button",
          { type: "button", role: "tab", class: "tab", id: `tab-${t.key}`, "data-tab": t.key, "aria-controls": "lesson-panel", onclick: () => select(t.key) },
          t.label,
        ),
      ),
    );
    select(cur, sub);
    return [tablist, panel];
  };

  const show = async () => {
    lessons.replaceChildren(h("p", { class: "loading" }, s.loadingPack));
    try {
      const [pack, progress] = await Promise.all([loadPack(lang), getProgressMap()]);
      if (disposed) return;
      const note = pack.review.status === "draft" ? pack.review.note?.[native] : undefined;
      lessons.replaceChildren(
        note ? h("p", { class: "draft-note" }, h("span", { class: "tag draft" }, s.draft), " ", note) : "",
        ...drawTabs(pack, progress),
      );
      void drawContinue(pack, progress);
    } catch {
      if (disposed) return;
      lessons.replaceChildren(h("p", { class: "error", role: "alert" }, s.packError), h("button", { type: "button", class: "btn", onclick: show }, s.retry));
    }
  };
  void show();
  void drawCustom();
  return () => {
    disposed = true;
  };
}
