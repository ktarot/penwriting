import { h } from "../../app/dom";
import { hrefFor, navigate } from "../../app/router";
import { getSession, t } from "../../app/state";
import { fill } from "../../i18n/strings";
import { nextItem } from "../../engines/language/lessons";
import { renderStaticLine } from "../../engines/writing/canvas";
import { PRACTICE_STEPS } from "../../types";
import { guideFor, STEP_NO } from "../practice/practice";

/** STEP 3 종료 후 원본과 단계별 필기를 나란히 비교한다. (자동 점수 없음 — 육안 비교) */
export function renderComparison(root: HTMLElement): () => void {
  const session = getSession();
  if (!session) {
    navigate(hrefFor.home());
    return () => {};
  }
  const s = t();
  const { item, fontStyle, pack } = session;
  const lang = item.language;
  const compareEmPx = Math.min(session.maxEmPx, 64);
  let overlay = false;

  const body = h("div", { class: "compare-body" });
  const draw = () => {
    body.replaceChildren(
      ...session.lines.map((line, i) =>
        h(
          "section",
          { class: "compare-line card", "data-line": String(i) },
          session.lines.length > 1 ? h("h2", {}, fill(s.lineN, { n: i + 1 })) : null,
          h(
            "div",
            { class: "compare-row original" },
            h("span", { class: "row-label" }, s.original),
            renderStaticLine(line, [], { mode: "solid", fontStyle, language: lang, opacity: 1 }, compareEmPx),
          ),
          ...PRACTICE_STEPS.map((step) => {
            const strokes = session.attempts[step].filter((st) => st.line === i);
            const guide = overlay ? { ...guideFor("trace", fontStyle, lang), opacity: 0.22 } : guideFor("free", fontStyle, lang);
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

  const next = pack ? nextItem(pack, item.id) : undefined;
  root.append(
    h(
      "main",
      { class: "page compare" },
      h("header", { class: "practice-header" }, h("a", { class: "btn ghost", href: hrefFor.home() }, `← ${s.back}`), h("h1", { class: "title" }, s.compareTitle)),
      h("p", { class: "step-desc" }, s.compareDesc),
      h("div", { class: "toolbar" }, overlayBtn),
      body,
      h(
        "footer",
        { class: "practice-footer" },
        h("button", { type: "button", class: "btn", onclick: () => navigate(hrefFor.practice(item.id)) }, `↻ ${s.again}`),
        next
          ? h("button", { type: "button", class: "btn primary", onclick: () => navigate(hrefFor.practice(next.id)) }, `${s.nextItem} →`)
          : h("a", { class: "btn primary", href: hrefFor.home() }, s.toList),
      ),
      h("p", { class: "note" }, s.saveLater),
    ),
  );
  draw();
  return () => {};
}
