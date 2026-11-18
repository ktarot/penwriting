import { h } from "../../app/dom";
import { icon } from "../../app/icons";
import { AREAS, hrefFor, type AreaKey } from "../../app/router";
import { appBar, bottomNav } from "../../app/shell";
import { settings, t } from "../../app/state";
import { fill } from "../../i18n/strings";
import { findItem, nextItem } from "../../engines/language/lessons";
import { loadPack } from "../../engines/language/loader";
import { listCustomLessons } from "../../storage/repositories/custom-lessons";
import { latestDraft } from "../../storage/repositories/drafts";
import { getProgressMap } from "../../storage/repositories/progress";
import type { LanguagePack, ProgressEntry } from "../../types";
import { AREA_ICON, areaCategories } from "../area/areas";

/** 홈: 학습할 영역을 고른다. (순서를 강요하지 않도록 목록은 영역 화면에서만 보여 준다) */
export function renderHome(root: HTMLElement): () => void {
  const s = t();
  const lang = settings.learningLanguage;
  const native = settings.nativeLanguage;
  let disposed = false;

  const continueEl = h("div");
  const noteEl = h("div");
  const cards = new Map<AreaKey, HTMLElement>();
  const grid = h(
    "div",
    { class: "area-grid" },
    ...AREAS.map((a) => {
      const meta = h("span", { class: "area-meta" });
      const bar = h("span", { class: "area-bar" }, h("span", { class: "area-bar-fill" }));
      const card = h(
        "a",
        { class: `area-card area-${a}`, href: hrefFor.area(a), "data-area": a },
        h("span", { class: "area-icon" }, icon(AREA_ICON[a], 28)),
        h("span", { class: "area-text" }, h("span", { class: "area-title" }, s.areas[a]), h("span", { class: "area-desc" }, s.areaDesc[a]), meta),
        a !== "mine" ? bar : "",
        h("span", { class: "area-chevron" }, icon("chevron")),
      );
      cards.set(a, card);
      return card;
    }),
  );

  root.append(
    h(
      "div",
      { class: "screen" },
      appBar("PenWriting"),
      h(
        "main",
        { class: "page home" },
        h("p", { class: "pair" }, fill(s.learningPair, { native: s.langName[native], learning: s.langName[lang] })),
        h("h2", { class: "greeting" }, s.homeGreeting),
        continueEl,
        grid,
        noteEl,
      ),
      bottomNav("home"),
    ),
  );

  const fillCards = (pack: LanguagePack, progress: Map<string, ProgressEntry>, customCount: number) => {
    for (const a of AREAS) {
      const card = cards.get(a)!;
      const meta = card.querySelector(".area-meta")!;
      if (a === "mine") {
        meta.textContent = fill(s.itemsCount, { n: customCount });
        continue;
      }
      const items = areaCategories(pack, a).flatMap((c) => c.items);
      const done = items.filter((it) => progress.has(it.id)).length;
      meta.textContent = fill(s.practicedOf, { n: done, total: items.length });
      const fillEl = card.querySelector<HTMLElement>(".area-bar-fill");
      if (fillEl) fillEl.style.width = `${items.length ? Math.round((done / items.length) * 100) : 0}%`;
      card.setAttribute("aria-label", `${s.areas[a]}. ${s.areaDesc[a]}. ${meta.textContent}`);
    }
  };

  /** 쓰던 필기가 있으면 그것을, 없으면 최근 학습의 다음 항목을 권한다 */
  const drawContinue = async (pack: LanguagePack, progress: Map<string, ProgressEntry>) => {
    const draft = await latestDraft();
    if (disposed) return;
    let target: { id: string; text: string; label: string; lang: string } | null = null;
    if (draft) {
      target = { id: draft.learningItemId, text: draft.sourceText, label: s.continueDraft, lang: draft.language };
    } else {
      const recent = [...progress.values()].filter((p) => p.language === lang).sort((a, b) => b.lastPracticedAt.localeCompare(a.lastPracticedAt))[0];
      const next = recent && findItem(pack, recent.learningItemId) ? nextItem(pack, recent.learningItemId) : undefined;
      if (next) target = { id: next.id, text: next.text, label: `${s.suggested} · ${s.nextItem}`, lang };
    }
    if (!target) return continueEl.replaceChildren();
    continueEl.replaceChildren(
      h(
        "a",
        { class: "continue card", href: hrefFor.practice(target.id) },
        h("span", { class: "continue-text" }, h("span", { class: "continue-label" }, target.label), h("span", { class: "c-src", lang: target.lang }, target.text.replace(/\n/g, " "))),
        h("span", { class: "btn primary" }, s.continueTitle, icon("chevron")),
      ),
    );
  };

  void (async () => {
    try {
      const [pack, progress, custom] = await Promise.all([loadPack(lang), getProgressMap(), listCustomLessons(lang)]);
      if (disposed) return;
      fillCards(pack, progress, custom.length);
      const note = pack.review.status === "draft" ? pack.review.note?.[native] : undefined;
      if (note) noteEl.replaceChildren(h("p", { class: "draft-note" }, h("span", { class: "tag draft" }, s.draft), " ", note));
      void drawContinue(pack, progress);
    } catch {
      if (disposed) return;
      noteEl.replaceChildren(h("p", { class: "error", role: "alert" }, s.packError));
    }
  })();
  return () => {
    disposed = true;
  };
}
