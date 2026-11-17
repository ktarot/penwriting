import { confirmDialog } from "../../app/dialog";
import { h } from "../../app/dom";
import { hrefFor, navigate } from "../../app/router";
import { customDraft, setSession, settings, t, updateSettings, type PracticeSession } from "../../app/state";
import { fill } from "../../i18n/strings";
import { resolveItem } from "../../engines/language/lessons";
import { itemInfo, visibilityFor } from "../../engines/language/pronunciation";
import { WritingLine } from "../../engines/writing/canvas";
import { createMeasure, ensureFont } from "../../engines/writing/fonts";
import type { GuideOptions } from "../../engines/writing/guide";
import { breakLines, lineFromText, PADDING_X_EM } from "../../engines/writing/layout";
import { StrokeStore } from "../../engines/writing/strokes";
import { PRACTICE_STEPS, type FontStyle, type LanguageCode, type LanguagePack, type LearningItem, type PracticeStep } from "../../types";
import { renderInfoPanel } from "./info-panel";

export const STEP_NO: Record<PracticeStep, number> = { trace: 1, hint: 2, free: 3 };

const INK_COLORS = ["#1d2b53", "#111111", "#1565c0", "#b3261e"];
const INK_WIDTHS = [0.022, 0.035, 0.055];

export function guideFor(step: PracticeStep, fontStyle: FontStyle, language: LanguageCode): GuideOptions {
  if (step === "trace") return { mode: "solid", fontStyle, language, opacity: settings.guideOpacity.trace };
  if (step === "hint") return { mode: "outline", fontStyle, language, opacity: settings.guideOpacity.hint };
  return { mode: "none", fontStyle, language, opacity: 0 };
}

async function loadItem(id: string): Promise<{ item: LearningItem; pack: LanguagePack | null } | null> {
  if (id === "custom") {
    const text = customDraft.text.trim();
    if (!text) return null;
    return { item: { id: "custom", language: settings.learningLanguage, level: "short-sentence", text, nativeGuides: {} }, pack: null };
  }
  try {
    return await resolveItem(id);
  } catch {
    return null;
  }
}

async function buildSession(item: LearningItem, pack: LanguagePack | null, fontStyle: FontStyle, availableWidth: number): Promise<PracticeSession> {
  await ensureFont(item.language, fontStyle, item.text);
  const measure = createMeasure(item.language, fontStyle);
  const maxEmPx = item.level === "character" ? Math.round(settings.fontSize * 2.4) : settings.fontSize;
  // 기초 문자·단어는 나누지 않고 화면에 맞게 줄여서 보여 준다
  const keepWhole = item.level === "character" || item.level === "word";
  const maxEm = keepWhole ? Infinity : availableWidth / maxEmPx - PADDING_X_EM * 2;
  const lines = breakLines(item.text, measure, maxEm).map((tx) => lineFromText(tx, measure));
  return { item, pack, fontStyle, lines, maxEmPx, attempts: { trace: [], hint: [], free: [] }, completed: {}, startedAt: new Date().toISOString() };
}

export function renderPractice(root: HTMLElement, itemId: string): () => void {
  const s = t();
  let disposed = false;
  let lines: WritingLine[] = [];
  let step: PracticeStep = "trace";
  let session: PracticeSession | null = null;
  let stores: Record<PracticeStep, StrokeStore> | null = null;
  const overrides: Partial<Record<PracticeStep, { reading?: boolean; meaning?: boolean }>> = {};

  const page = h("main", { class: "page practice" });
  root.append(page);
  const stageEl = h("div", { class: "stage" }, h("p", { class: "loading" }, s.loadingFont));
  page.append(stageEl);

  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && stores) {
      e.preventDefault();
      stores[step].undo();
    }
  };
  window.addEventListener("keydown", onKey);

  void (async () => {
    const found = await loadItem(itemId);
    if (disposed) return;
    if (!found) {
      navigate(hrefFor.home());
      return;
    }
    build(found.item, found.pack);
  })();

  function build(item: LearningItem, pack: LanguagePack | null) {
    const native = settings.nativeLanguage;
    const info = itemInfo(item, native, pack ?? undefined);

    const stepperEl = h("ol", { class: "stepper" });
    const descEl = h("p", { class: "step-desc" });
    const infoEl = h("div", { class: "info-wrap", "aria-live": "polite" });
    const readingBtn = h("button", { type: "button", class: "btn toggle", "aria-pressed": "false" }, s.showReading);
    const meaningBtn = h("button", { type: "button", class: "btn toggle", "aria-pressed": "false" }, s.showMeaning);
    const undoBtn = h("button", { type: "button", class: "btn tool", "aria-label": s.undo }, `↶ ${s.undo}`);
    const clearBtn = h("button", { type: "button", class: "btn tool", "aria-label": s.clear }, `✕ ${s.clear}`);
    const opacityInput = h("input", { type: "range", min: 5, max: 90, step: 5, id: "guide-opacity" });
    const opacityRow = h("label", { class: "range", for: "guide-opacity" }, h("span", {}, s.guideStrength), opacityInput);
    const prevBtn = h("button", { type: "button", class: "btn" }, `← ${s.prevStep}`);
    const nextBtn = h("button", { type: "button", class: "btn primary next" });

    const radios = <T extends string | number>(label: string, cls: string, values: readonly T[], labels: readonly string[], get: () => T, set: (v: T) => void, extra?: (v: T) => string) => {
      const group = h(
        "div",
        { class: cls, role: "radiogroup", "aria-label": label },
        ...values.map((v, i) =>
          h(
            "button",
            {
              type: "button",
              role: "radio",
              class: cls === "swatches" ? "swatch" : "seg",
              "data-value": String(v),
              "aria-label": labels[i],
              title: labels[i],
              style: extra ? extra(v) : undefined,
              onclick: () => {
                set(v);
                sync();
              },
            },
            cls === "swatches" ? "" : labels[i],
          ),
        ),
      );
      const sync = () => group.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.value === String(get()))));
      sync();
      return { el: group, sync };
    };
    const colorGroup = radios(s.inkColor, "swatches", INK_COLORS, s.colors, () => settings.inkColor, (v) => void updateSettings({ inkColor: v }), (v) => `--c:${v}`);
    const widthGroup = radios(s.inkWidth, "segmented small", INK_WIDTHS, s.widths, () => settings.inkWidth, (v) => void updateSettings({ inkWidth: v }));
    const fontGroup = radios(s.fontQ, "segmented small", ["standard", "handwriting"] as FontStyle[], [s.font.standard, s.font.handwriting], () => session?.fontStyle ?? settings.fontStyle, (v) => void switchFont(v));

    page.replaceChildren(
      h(
        "header",
        { class: "practice-header" },
        h("a", { class: "btn ghost", href: hrefFor.home() }, `← ${s.back}`),
        h("div", { class: "title" }, h("span", { class: "badge" }, s.level[item.level]), h("span", { class: "src", lang: item.language }, item.text.replace(/\n/g, " "))),
      ),
      stepperEl,
      descEl,
      h("div", { class: "info-bar" }, infoEl, item.id !== "custom" ? h("div", { class: "info-toggles" }, readingBtn, meaningBtn) : null),
      h("div", { class: "toolbar" }, undoBtn, clearBtn, colorGroup.el, widthGroup.el, fontGroup.el, opacityRow),
      stageEl,
      h("footer", { class: "practice-footer" }, prevBtn, nextBtn),
    );

    const syncAttempts = () => {
      if (!session || !stores) return;
      for (const st of PRACTICE_STEPS) session.attempts[st] = stores[st].toJSON();
    };

    function renderInfo() {
      const vis = visibilityFor(step, settings, overrides[step]);
      readingBtn.setAttribute("aria-pressed", String(vis.reading));
      meaningBtn.setAttribute("aria-pressed", String(vis.meaning));
      const panel = renderInfoPanel(info, vis, s, item.language, native);
      infoEl.replaceChildren(...(panel ? [panel] : []));
    }

    function renderStepper() {
      stepperEl.replaceChildren(
        ...PRACTICE_STEPS.map((st) => {
          const done = Boolean(session?.completed[st]) || (stores?.[st].count ?? 0) > 0;
          return h(
            "li",
            {},
            h(
              "button",
              {
                type: "button",
                class: `step-tab${st === step ? " current" : ""}`,
                "aria-current": st === step ? "step" : undefined,
                "data-step": st,
                onclick: () => goStep(st),
              },
              h("span", { class: "no" }, String(STEP_NO[st])),
              h("span", { class: "lbl" }, s.step[st]),
              done && st !== step ? h("span", { class: "mark", "aria-label": s.written }, "✓") : null,
            ),
          );
        }),
      );
    }

    function renderLines() {
      if (!session || !stores) return;
      for (const l of lines) l.destroy();
      const store = stores[step];
      const guide = guideFor(step, session.fontStyle, item.language);
      lines = session.lines.map(
        (line, i) =>
          new WritingLine({
            line,
            lineIndex: i,
            store,
            guide,
            maxEmPx: session!.maxEmPx,
            label: fill(s.writingArea, { n: i + 1 }),
            getStyle: () => ({ color: settings.inkColor, width: settings.inkWidth }),
          }),
      );
      stageEl.replaceChildren(...lines.map((l) => l.el));
      stageEl.dataset.step = step;
    }

    function updateControls() {
      const count = stores?.[step].count ?? 0;
      undoBtn.disabled = count === 0;
      clearBtn.disabled = count === 0;
      prevBtn.disabled = step === "trace";
      const idx = PRACTICE_STEPS.indexOf(step);
      nextBtn.textContent = step === "free" ? `${s.finish} →` : `${fill(s.nextStep, { step: s.step[PRACTICE_STEPS[idx + 1]] })} →`;
      descEl.textContent = `STEP ${STEP_NO[step]}. ${s.stepDesc[step]}`;
      opacityRow.hidden = step === "free";
      if (step !== "free") opacityInput.value = String(Math.round(settings.guideOpacity[step] * 100));
      fontGroup.sync();
    }

    function goStep(st: PracticeStep) {
      if (st === step) return;
      step = st;
      renderLines();
      renderStepper();
      renderInfo();
      updateControls();
    }

    async function switchFont(style: FontStyle) {
      if (!stores || !session || style === session.fontStyle) return fontGroup.sync();
      const hasInk = PRACTICE_STEPS.some((st) => stores![st].count > 0);
      if (hasInk && !(await confirmDialog(s.fontSwitchConfirm, s.switchFont, s.cancel))) return fontGroup.sync();
      void updateSettings({ fontStyle: style });
      await start(style);
    }

    async function start(fontStyle: FontStyle) {
      stageEl.replaceChildren(h("p", { class: "loading" }, s.loadingFont));
      const width = stageEl.getBoundingClientRect().width || page.getBoundingClientRect().width || window.innerWidth;
      const next = await buildSession(item, pack, fontStyle, width);
      if (disposed) return;
      session = next;
      setSession(session);
      stores = { trace: new StrokeStore(), hint: new StrokeStore(), free: new StrokeStore() };
      for (const st of PRACTICE_STEPS) {
        stores[st].onChange(() => {
          syncAttempts();
          renderStepper();
          updateControls();
        });
      }
      step = "trace";
      renderLines();
      renderStepper();
      renderInfo();
      updateControls();
    }

    readingBtn.addEventListener("click", () => {
      const cur = visibilityFor(step, settings, overrides[step]);
      overrides[step] = { ...overrides[step], reading: !cur.reading };
      renderInfo();
    });
    meaningBtn.addEventListener("click", () => {
      const cur = visibilityFor(step, settings, overrides[step]);
      overrides[step] = { ...overrides[step], meaning: !cur.meaning };
      renderInfo();
    });
    undoBtn.addEventListener("click", () => stores?.[step].undo());
    clearBtn.addEventListener("click", () => stores?.[step].clear());
    prevBtn.addEventListener("click", () => {
      const i = PRACTICE_STEPS.indexOf(step);
      if (i > 0) goStep(PRACTICE_STEPS[i - 1]);
    });
    nextBtn.addEventListener("click", () => {
      if (!session) return;
      session.completed[step] = new Date().toISOString();
      syncAttempts();
      const i = PRACTICE_STEPS.indexOf(step);
      if (step === "free") navigate(hrefFor.compare());
      else goStep(PRACTICE_STEPS[i + 1]);
    });
    opacityInput.addEventListener("input", () => {
      if (step === "free" || !session) return;
      const v = Number(opacityInput.value) / 100;
      settings.guideOpacity[step] = v;
      const g = guideFor(step, session.fontStyle, item.language);
      for (const l of lines) l.setGuide(g);
    });
    opacityInput.addEventListener("change", () => void updateSettings({ guideOpacity: { ...settings.guideOpacity } }));

    void start(settings.fontStyle);
  }

  return () => {
    disposed = true;
    window.removeEventListener("keydown", onKey);
    for (const l of lines) l.destroy();
    lines = [];
  };
}
