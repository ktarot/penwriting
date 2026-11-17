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
import type { CustomLesson, LanguagePack, LearningItem, ProgressEntry } from "../../types";

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
      h(
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
      ),
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
      if (next) target = { id: next.id, text: next.text, label: s.nextItem };
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

  const show = async () => {
    lessons.replaceChildren(h("p", { class: "loading" }, s.loadingPack));
    try {
      const [pack, progress] = await Promise.all([loadPack(lang), getProgressMap()]);
      if (disposed) return;
      const note = pack.review.status === "draft" ? pack.review.note?.[native] : undefined;
      lessons.replaceChildren(
        note ? h("p", { class: "draft-note" }, h("span", { class: "tag draft" }, s.draft), " ", note) : "",
        ...pack.categories.map((c) =>
          h(
            "section",
            { class: "card" },
            h("h2", {}, c.title[native] ?? c.title.en ?? c.id),
            h("ul", { class: `item-list level-${c.level}` }, ...c.items.map((it) => h("li", {}, itemLabel(it, pack, progress.get(it.id))))),
          ),
        ),
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
