import { confirmDialog } from "../../app/dialog";
import { h } from "../../app/dom";
import { hrefFor, navigate } from "../../app/router";
import { getSession, t, type PracticeSession } from "../../app/state";
import { fill } from "../../i18n/strings";
import { nextItem } from "../../engines/language/lessons";
import { renderStaticLine } from "../../engines/writing/canvas";
import { newId, requestPersistentStorage } from "../../storage/database";
import { deleteRecord, getRecord, saveRecord } from "../../storage/repositories/records";
import { PRACTICE_STEPS, type FontStyle, type LanguageCode, type LineLayout, type PracticeRecord, type PracticeStep, type Stroke } from "../../types";
import { guideFor, STEP_NO } from "../practice/practice";

interface CompareData {
  language: LanguageCode;
  fontStyle: FontStyle;
  lines: LineLayout[];
  maxEmPx: number;
  attempts: Record<PracticeStep, Stroke[]>;
}

/** 원본과 단계별 필기를 나란히 그린다 (자동 점수 없음 — 육안 비교) */
function compareBody(data: CompareData): { el: HTMLElement; overlayBtn: HTMLButtonElement } {
  const s = t();
  const compareEmPx = Math.min(data.maxEmPx, 64);
  let overlay = false;
  const repeated = data.lines.length > 1 && data.lines.every((l) => l.text === data.lines[0].text);
  const body = h("div", { class: "compare-body" });
  const draw = () => {
    body.replaceChildren(
      ...data.lines.map((line, i) =>
        h(
          "section",
          { class: "compare-line card", "data-line": String(i) },
          data.lines.length > 1 ? h("h2", {}, fill(repeated ? s.attemptN : s.lineN, { n: i + 1 })) : null,
          h(
            "div",
            { class: "compare-row original" },
            h("span", { class: "row-label" }, s.original),
            renderStaticLine(line, [], { mode: "solid", fontStyle: data.fontStyle, language: data.language, opacity: 1 }, compareEmPx),
          ),
          ...PRACTICE_STEPS.map((step) => {
            const strokes = data.attempts[step].filter((st) => st.line === i);
            const guide = overlay ? { ...guideFor("trace", data.fontStyle, data.language), opacity: 0.22 } : guideFor("free", data.fontStyle, data.language);
            return h(
              "div",
              { class: `compare-row step-${step}`, "data-step": step },
              h("span", { class: "row-label" }, `${STEP_NO[step]}. ${s.step[step]}`),
              strokes.length ? renderStaticLine(line, strokes, guide, compareEmPx) : h("p", { class: "empty" }, s.empty),
            );
          }),
        ),
      ),
    );
  };
  const overlayBtn = h("button", { type: "button", class: "btn", "aria-pressed": "false" }, `◐ ${s.overlayOn}`);
  overlayBtn.addEventListener("click", () => {
    overlay = !overlay;
    overlayBtn.setAttribute("aria-pressed", String(overlay));
    overlayBtn.textContent = `◐ ${overlay ? s.overlayOff : s.overlayOn}`;
    draw();
  });
  draw();
  return { el: body, overlayBtn };
}

export function sessionToRecord(session: PracticeSession, now = new Date()): PracticeRecord {
  return {
    id: newId("r"),
    learningItemId: session.item.id === "custom" ? null : session.item.id,
    sourceText: session.item.text,
    language: session.item.language,
    level: session.item.level,
    fontStyle: session.fontStyle,
    canvasAspectRatio: session.lines[0]?.aspect ?? 1,
    lines: session.lines,
    maxEmPx: session.maxEmPx,
    layout: session.layout,
    attempts: PRACTICE_STEPS.map((step) => ({ step, strokes: session.attempts[step], completedAt: session.completed[step] })),
    createdAt: now.toISOString(),
  };
}

export function recordAttempts(r: PracticeRecord): Record<PracticeStep, Stroke[]> {
  const out: Record<PracticeStep, Stroke[]> = { trace: [], hint: [], free: [] };
  for (const a of r.attempts) out[a.step] = a.strokes;
  return out;
}

/** 방금 마친 연습 비교 */
export function renderComparison(root: HTMLElement): () => void {
  const session = getSession();
  if (!session) {
    navigate(hrefFor.home());
    return () => {};
  }
  const s = t();
  const { item, pack } = session;
  const { el, overlayBtn } = compareBody({ language: item.language, ...session });

  const status = h("span", { class: "status", role: "status" });
  const saveBtn = h("button", { type: "button", class: "btn" }, `💾 ${s.saveRecord}`);
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    try {
      await saveRecord(sessionToRecord(session));
      void requestPersistentStorage();
      status.className = "status";
      status.textContent = `✓ ${s.recordSaved}`;
    } catch {
      saveBtn.disabled = false;
      status.className = "status error";
      status.textContent = s.saveFailed;
    }
  });

  const next = pack ? nextItem(pack, item.id) : undefined;
  root.append(
    h(
      "main",
      { class: "page compare" },
      h("header", { class: "practice-header" }, h("a", { class: "btn ghost", href: hrefFor.home() }, `← ${s.back}`), h("h1", { class: "title" }, s.compareTitle)),
      h("p", { class: "step-desc" }, s.compareDesc),
      h("div", { class: "toolbar" }, overlayBtn, saveBtn, status),
      el,
      h(
        "footer",
        { class: "practice-footer" },
        h("button", { type: "button", class: "btn", onclick: () => navigate(hrefFor.practice(item.id)) }, `↻ ${s.again}`),
        next
          ? h("button", { type: "button", class: "btn primary next", onclick: () => navigate(hrefFor.practice(next.id)) }, `${s.nextItem} →`)
          : h("a", { class: "btn primary next", href: hrefFor.home() }, s.toList),
      ),
      h("p", { class: "note" }, s.storageWarning),
    ),
  );
  return () => {};
}

/** 저장된 기록 다시 보기 */
export function renderRecord(root: HTMLElement, id: string): () => void {
  const s = t();
  const main = h("main", { class: "page compare" }, h("p", { class: "loading" }, s.loadingPack));
  root.append(main);
  let disposed = false;
  void (async () => {
    const r = await getRecord(id).catch(() => undefined);
    if (disposed) return;
    if (!r) return navigate(hrefFor.history());
    const { el, overlayBtn } = compareBody({
      language: r.language,
      fontStyle: r.fontStyle,
      lines: r.lines,
      maxEmPx: r.maxEmPx ?? 72,
      attempts: recordAttempts(r),
    });
    const delBtn = h("button", { type: "button", class: "btn danger" }, `🗑 ${s.delete}`);
    delBtn.addEventListener("click", async () => {
      if (!(await confirmDialog(s.deleteConfirm, s.delete, s.cancel))) return;
      await deleteRecord(r.id);
      navigate(hrefFor.history());
    });
    main.replaceChildren(
      h(
        "header",
        { class: "practice-header" },
        h("a", { class: "btn ghost", href: hrefFor.history() }, `← ${s.history}`),
        h("h1", { class: "title" }, h("span", { class: "src", lang: r.language }, r.sourceText.replace(/\n/g, " "))),
      ),
      h("p", { class: "step-desc" }, formatDate(r.createdAt)),
      h("div", { class: "toolbar" }, overlayBtn, delBtn),
      el,
      r.learningItemId
        ? h("footer", { class: "practice-footer" }, h("a", { class: "btn primary next", href: hrefFor.practice(r.learningItemId) }, `↻ ${s.again}`))
        : "",
    );
  })();
  return () => {
    disposed = true;
  };
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}
