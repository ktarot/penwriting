import type { FontStyle, LineLayout } from "../../types";
import { FONT_FAMILIES, FONT_SCALE } from "./fonts";
import { BASELINE_EM, LINE_HEIGHT_EM, MIDLINE_EM, PADDING_X_EM, TOPLINE_EM, lineWidthEm } from "./layout";

/**
 * 교본 가이드 표시 방식
 * - solid: 흐린 원본 글씨 (STEP 1 따라 쓰기)
 * - outline: 점선 윤곽 (STEP 2 힌트 쓰기)
 * - none: 기준선만 (STEP 3 혼자 쓰기)
 */
export type GuideMode = "solid" | "outline" | "none";

export interface GuideOptions {
  mode: GuideMode;
  fontStyle: FontStyle;
  /** 0..1 */
  opacity: number;
  color?: string;
  showRuling?: boolean;
}

const SVG_NS = "http://www.w3.org/2000/svg";
/** SVG 사용자 단위 = em × 100 (작은 font-size 렌더링 문제 회피) */
const U = 100;

export function createGuideSvg(line: LineLayout, opts: GuideOptions): SVGSVGElement {
  const w = lineWidthEm(line) * U;
  const h = LINE_HEIGHT_EM * U;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("guide");

  if (opts.showRuling !== false) {
    const rule = (y: number, cls: string) => {
      const l = document.createElementNS(SVG_NS, "line");
      l.setAttribute("x1", "0");
      l.setAttribute("x2", String(w));
      l.setAttribute("y1", String(y * U));
      l.setAttribute("y2", String(y * U));
      l.setAttribute("class", cls);
      l.setAttribute("vector-effect", "non-scaling-stroke");
      svg.appendChild(l);
    };
    rule(TOPLINE_EM, "rule rule-top");
    rule(MIDLINE_EM, "rule rule-mid");
    rule(BASELINE_EM, "rule rule-base");
  }

  if (opts.mode !== "none") {
    const text = document.createElementNS(SVG_NS, "text");
    text.textContent = line.text;
    text.setAttribute("x", String(PADDING_X_EM * U));
    text.setAttribute("y", String(BASELINE_EM * U));
    text.setAttribute("font-size", String(U * FONT_SCALE[opts.fontStyle]));
    text.setAttribute("font-family", FONT_FAMILIES[opts.fontStyle]);
    text.setAttribute("class", `guide-text guide-${opts.mode}`);
    const color = opts.color ?? "currentColor";
    if (opts.mode === "solid") {
      text.setAttribute("fill", color);
      text.setAttribute("fill-opacity", String(opts.opacity));
    } else {
      text.setAttribute("fill", "none");
      text.setAttribute("stroke", color);
      text.setAttribute("stroke-opacity", String(opts.opacity));
      text.setAttribute("stroke-width", "1.6");
      text.setAttribute("stroke-dasharray", "5 4");
      text.setAttribute("stroke-linejoin", "round");
    }
    svg.appendChild(text);
  }
  return svg;
}
