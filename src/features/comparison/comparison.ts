import { h } from "../../app/dom";
import { hrefFor, navigate } from "../../app/router";
import { getSession } from "../../app/state";
import { SAMPLE_ITEMS } from "../../engines/language/samples";
import { renderStaticLine } from "../../engines/writing/canvas";
import { PRACTICE_STEPS } from "../../types";
import { guideFor, STEP_INFO } from "../practice/practice";

/** STEP 3 종료 후 원본과 단계별 필기를 나란히 비교한다. (자동 점수 없음 — 육안 비교) */
export function renderComparison(root: HTMLElement): () => void {
  const session = getSession();
  if (!session) {
    navigate(hrefFor.home());
    return () => {};
  }
  const { item, fontStyle } = session;
  const compareEmPx = Math.min(session.maxEmPx, 64);
  let overlay = false;

  const body = h("div", { class: "compare-body" });

  const draw = () => {
    body.replaceChildren(
      ...session.lines.map((line, i) =>
        h(
          "section",
          { class: "compare-line card", "data-line": String(i) },
          session.lines.length > 1 ? h("h2", {}, `${i + 1}번째 줄`) : null,
          h(
            "div",
            { class: "compare-row original" },
            h("span", { class: "row-label" }, "원본"),
            renderStaticLine(line, [], { mode: "solid", fontStyle, opacity: 1 }, compareEmPx),
          ),
          ...PRACTICE_STEPS.map((step) => {
            const strokes = session.attempts[step].filter((s) => s.line === i);
            const guide = overlay ? { ...guideFor("trace", fontStyle), opacity: 0.22 } : guideFor("free", fontStyle);
            return h(
              "div",
              { class: `compare-row step-${step}`, "data-step": step },
              h("span", { class: "row-label" }, `${STEP_INFO[step].no}. ${STEP_INFO[step].title}`),
              strokes.length
                ? renderStaticLine(line, strokes, guide, compareEmPx)
                : h("p", { class: "empty" }, "작성한 필기가 없습니다"),
            );
          }),
        ),
      ),
    );
  };

  const overlayBtn = h(
    "button",
    {
      type: "button",
      class: "btn",
      "aria-pressed": "false",
      onclick: () => {
        overlay = !overlay;
        overlayBtn.setAttribute("aria-pressed", String(overlay));
        overlayBtn.textContent = overlay ? "◐ 원본 겹쳐 보기 끄기" : "◐ 원본 겹쳐 보기";
        draw();
      },
    },
    "◐ 원본 겹쳐 보기",
  );

  const idx = SAMPLE_ITEMS.findIndex((i) => i.id === item.id);
  const next = idx >= 0 ? SAMPLE_ITEMS[idx + 1] : undefined;

  root.append(
    h(
      "main",
      { class: "page compare" },
      h("header", { class: "practice-header" }, h("a", { class: "btn ghost", href: hrefFor.home() }, "← 목록"), h("h1", { class: "title" }, "결과 비교")),
      h("p", { class: "step-desc" }, "원본과 단계별로 쓴 글씨를 눈으로 비교해 보세요."),
      h("div", { class: "toolbar" }, overlayBtn),
      body,
      h(
        "footer",
        { class: "practice-footer" },
        h("button", { type: "button", class: "btn", onclick: () => navigate(hrefFor.practice(item.id)) }, "↻ 다시 연습"),
        next
          ? h("button", { type: "button", class: "btn primary", onclick: () => navigate(hrefFor.practice(next.id)) }, "다음 학습 →")
          : h("a", { class: "btn primary", href: hrefFor.home() }, "목록으로"),
      ),
      h("p", { class: "note" }, "학습 기록 저장은 다음 단계(Phase 3)에서 지원됩니다. 지금은 화면을 벗어나면 필기가 사라집니다."),
    ),
  );
  draw();
  return () => {};
}
