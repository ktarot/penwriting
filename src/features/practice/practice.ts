import { h } from "../../app/dom";
import { navigate } from "../../app/router";
import { customDraft, setSession, settings, type PracticeSession } from "../../app/state";
import { findSampleItem, LEVEL_LABELS } from "../../engines/language/samples";
import { WritingLine } from "../../engines/writing/canvas";
import { createMeasure, ensureFont, FONT_LABELS } from "../../engines/writing/fonts";
import type { GuideOptions } from "../../engines/writing/guide";
import { breakLines, lineFromText, PADDING_X_EM } from "../../engines/writing/layout";
import { StrokeStore } from "../../engines/writing/strokes";
import { PRACTICE_STEPS, type FontStyle, type LearningItem, type PracticeStep } from "../../types";

export const STEP_INFO: Record<PracticeStep, { no: number; title: string; desc: string }> = {
  trace: { no: 1, title: "따라 쓰기", desc: "흐린 원본 글씨 위에 그대로 따라 써 보세요." },
  hint: { no: 2, title: "힌트 쓰기", desc: "점선 윤곽만 보고 글자의 구조를 떠올리며 써 보세요." },
  free: { no: 3, title: "혼자 쓰기", desc: "가이드 없이 기준선만 보고 기억으로 써 보세요." },
};

const INK_COLORS = [
  { value: "#1d2b53", label: "남색" },
  { value: "#111111", label: "검정" },
  { value: "#1565c0", label: "파랑" },
  { value: "#b3261e", label: "빨강" },
];
const INK_WIDTHS = [
  { value: 0.022, label: "가늘게" },
  { value: 0.035, label: "보통" },
  { value: 0.055, label: "굵게" },
];

function resolveItem(id: string): LearningItem | null {
  if (id === "custom") {
    const text = customDraft.text.trim();
    if (!text) return null;
    return { id: "custom", language: "ko", level: "short-sentence", text, nativeGuides: {} };
  }
  return findSampleItem(id) ?? null;
}

export function guideFor(step: PracticeStep, fontStyle: FontStyle): GuideOptions {
  if (step === "trace") return { mode: "solid", fontStyle, opacity: settings.guideOpacity.trace };
  if (step === "hint") return { mode: "outline", fontStyle, opacity: settings.guideOpacity.hint };
  return { mode: "none", fontStyle, opacity: 0 };
}

async function buildSession(item: LearningItem, fontStyle: FontStyle, availableWidth: number): Promise<PracticeSession> {
  await ensureFont(fontStyle, item.text);
  const measure = createMeasure(fontStyle);
  const maxEmPx = item.level === "character" ? Math.round(settings.fontSize * 2.4) : settings.fontSize;
  const maxEm = availableWidth / maxEmPx - PADDING_X_EM * 2;
  const lines = breakLines(item.text, measure, maxEm).map((t) => lineFromText(t, measure));
  return {
    item,
    fontStyle,
    lines,
    maxEmPx,
    attempts: { trace: [], hint: [], free: [] },
    completed: {},
    startedAt: new Date().toISOString(),
  };
}

export function renderPractice(root: HTMLElement, itemId: string): () => void {
  const item = resolveItem(itemId);
  if (!item) {
    navigate("/");
    return () => {};
  }

  let disposed = false;
  let lines: WritingLine[] = [];
  let step: PracticeStep = "trace";
  let session: PracticeSession;
  let stores: Record<PracticeStep, StrokeStore>;

  const page = h("main", { class: "page practice" });
  root.append(page);

  const stageEl = h("div", { class: "stage", "aria-live": "polite" });
  const stepperEl = h("ol", { class: "stepper" });
  const descEl = h("p", { class: "step-desc" });
  const undoBtn = h("button", { type: "button", class: "btn tool", "aria-label": "되돌리기" }, "↶ 되돌리기");
  const clearBtn = h("button", { type: "button", class: "btn tool", "aria-label": "전체 지우기" }, "✕ 전체 지우기");
  const opacityInput = h("input", { type: "range", min: 5, max: 90, step: 5, id: "guide-opacity" });
  const opacityRow = h("label", { class: "range", for: "guide-opacity" }, h("span", {}, "가이드 진하기"), opacityInput);
  const prevBtn = h("button", { type: "button", class: "btn" }, "← 이전 단계");
  const nextBtn = h("button", { type: "button", class: "btn primary next" });

  const colorGroup = h(
    "div",
    { class: "swatches", role: "radiogroup", "aria-label": "선 색상" },
    ...INK_COLORS.map((c) =>
      h(
        "button",
        {
          type: "button",
          role: "radio",
          class: "swatch",
          title: c.label,
          "aria-label": c.label,
          "aria-checked": String(settings.inkColor === c.value),
          "data-value": c.value,
          style: `--c:${c.value}`,
          onclick: () => {
            settings.inkColor = c.value;
            colorGroup.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.value === c.value)));
          },
        },
      ),
    ),
  );
  const widthGroup = h(
    "div",
    { class: "segmented small", role: "radiogroup", "aria-label": "선 굵기" },
    ...INK_WIDTHS.map((wd) =>
      h(
        "button",
        {
          type: "button",
          role: "radio",
          class: "seg",
          "data-value": String(wd.value),
          "aria-checked": String(settings.inkWidth === wd.value),
          onclick: () => {
            settings.inkWidth = wd.value;
            widthGroup.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.value === String(wd.value))));
          },
        },
        wd.label,
      ),
    ),
  );
  const fontGroup = h(
    "div",
    { class: "segmented small", role: "radiogroup", "aria-label": "글씨체" },
    ...(Object.keys(FONT_LABELS) as FontStyle[]).map((style) =>
      h("button", { type: "button", role: "radio", class: "seg", "data-value": style, onclick: () => switchFont(style) }, FONT_LABELS[style]),
    ),
  );

  page.append(
    h(
      "header",
      { class: "practice-header" },
      h("a", { class: "btn ghost", href: "#/" }, "← 목록"),
      h("div", { class: "title" }, h("span", { class: "badge" }, LEVEL_LABELS[item.level]), h("span", { class: "src", lang: item.language }, item.text.replace(/\n/g, " "))),
    ),
    stepperEl,
    descEl,
    h("div", { class: "toolbar" }, undoBtn, clearBtn, colorGroup, widthGroup, fontGroup, opacityRow),
    stageEl,
    h("footer", { class: "practice-footer" }, prevBtn, nextBtn),
  );

  const syncAttempts = () => {
    for (const s of PRACTICE_STEPS) session.attempts[s] = stores[s].toJSON();
  };

  function renderStepper() {
    stepperEl.replaceChildren(
      ...PRACTICE_STEPS.map((s) => {
        const info = STEP_INFO[s];
        const done = Boolean(session.completed[s]) || stores[s].count > 0;
        return h(
          "li",
          {},
          h(
            "button",
            {
              type: "button",
              class: `step-tab${s === step ? " current" : ""}${done ? " has-ink" : ""}`,
              "aria-current": s === step ? "step" : undefined,
              "data-step": s,
              onclick: () => goStep(s),
            },
            h("span", { class: "no" }, String(info.no)),
            h("span", { class: "lbl" }, info.title),
            done && s !== step ? h("span", { class: "mark", "aria-label": "작성함" }, "✓") : null,
          ),
        );
      }),
    );
  }

  function renderLines() {
    for (const l of lines) l.destroy();
    const store = stores[step];
    const guide = guideFor(step, session.fontStyle);
    lines = session.lines.map(
      (line, i) =>
        new WritingLine({
          line,
          lineIndex: i,
          store,
          guide,
          maxEmPx: session.maxEmPx,
          getStyle: () => ({ color: settings.inkColor, width: settings.inkWidth }),
        }),
    );
    stageEl.replaceChildren(...lines.map((l) => l.el));
    stageEl.dataset.step = step;
  }

  function updateControls() {
    const store = stores[step];
    undoBtn.disabled = store.count === 0;
    clearBtn.disabled = store.count === 0;
    prevBtn.disabled = step === "trace";
    const idx = PRACTICE_STEPS.indexOf(step);
    nextBtn.textContent = step === "free" ? "완료하고 비교하기 →" : `다음: ${STEP_INFO[PRACTICE_STEPS[idx + 1]].title} →`;
    descEl.textContent = `STEP ${STEP_INFO[step].no}. ${STEP_INFO[step].desc}`;
    opacityRow.hidden = step === "free";
    if (step !== "free") opacityInput.value = String(Math.round(settings.guideOpacity[step] * 100));
    fontGroup.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.value === session.fontStyle)));
  }

  function goStep(s: PracticeStep) {
    if (s === step) return;
    step = s;
    renderLines();
    renderStepper();
    updateControls();
  }

  async function switchFont(style: FontStyle) {
    if (style === session.fontStyle) return;
    const hasInk = PRACTICE_STEPS.some((s) => stores[s].count > 0);
    if (hasInk && !confirm("글씨체를 바꾸면 줄 배치가 달라져 지금까지 쓴 필기가 지워집니다. 바꿀까요?")) return;
    settings.fontStyle = style;
    await start(style);
  }

  async function start(fontStyle: FontStyle) {
    stageEl.replaceChildren(h("p", { class: "loading" }, "글꼴을 불러오는 중…"));
    const width = stageEl.getBoundingClientRect().width || page.getBoundingClientRect().width || window.innerWidth;
    const s = await buildSession(item!, fontStyle, width);
    if (disposed) return;
    session = s;
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
    updateControls();
  }

  undoBtn.addEventListener("click", () => stores[step].undo());
  clearBtn.addEventListener("click", () => stores[step].clear());
  prevBtn.addEventListener("click", () => {
    const i = PRACTICE_STEPS.indexOf(step);
    if (i > 0) goStep(PRACTICE_STEPS[i - 1]);
  });
  nextBtn.addEventListener("click", () => {
    session.completed[step] = new Date().toISOString();
    syncAttempts();
    const i = PRACTICE_STEPS.indexOf(step);
    if (step === "free") navigate("/compare");
    else goStep(PRACTICE_STEPS[i + 1]);
  });
  opacityInput.addEventListener("input", () => {
    if (step === "free") return;
    settings.guideOpacity[step] = Number(opacityInput.value) / 100;
    const g = guideFor(step, session.fontStyle);
    for (const l of lines) l.setGuide(g);
  });

  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && session) {
      e.preventDefault();
      stores[step].undo();
    }
  };
  window.addEventListener("keydown", onKey);

  // 이 화면에 들어올 때마다 새 세션을 시작한다 (이어하기는 Phase 3 저장 기능과 함께)
  void start(settings.fontStyle);

  return () => {
    disposed = true;
    window.removeEventListener("keydown", onKey);
    for (const l of lines) l.destroy();
    lines = [];
  };
}
