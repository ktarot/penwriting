import type { LineLayout } from "../../types";

/**
 * 줄 하나의 논리 좌표계 (단위: em = 글자 크기).
 * 가이드(SVG)와 필기(Canvas)가 같은 좌표계를 공유하므로 화면 크기·회전과 무관하게 정렬된다.
 */
export const LINE_HEIGHT_EM = 1.5;
export const PADDING_X_EM = 0.3;
/** 줄 위쪽에서 기준선까지 거리 */
export const BASELINE_EM = 1.12;
/** 글자 몸통 상단 보조선 */
export const TOPLINE_EM = 0.22;
/** 가운데 보조선 */
export const MIDLINE_EM = (TOPLINE_EM + BASELINE_EM) / 2;

export type MeasureFn = (text: string) => number; // em 단위 너비

export function lineFromText(text: string, measure: MeasureFn): LineLayout {
  const widthEm = Math.max(measure(text), 0.6) + PADDING_X_EM * 2;
  return { text, aspect: round(widthEm / LINE_HEIGHT_EM) };
}

export function lineWidthEm(line: LineLayout): number {
  return line.aspect * LINE_HEIGHT_EM;
}

/**
 * 텍스트를 줄 단위로 나눈다.
 * - 명시적 줄바꿈 유지
 * - 공백이 있으면 단어 단위로, 한 단어가 너무 길면 글자 단위로 나눈다.
 * maxEm: 한 줄 글자 영역의 최대 너비(em, 패딩 제외)
 */
export function breakLines(text: string, measure: MeasureFn, maxEm: number): string[] {
  const out: string[] = [];
  const limit = Math.max(maxEm, 1);
  for (const rawPara of text.replace(/\r\n?/g, "\n").split("\n")) {
    const para = rawPara.replace(/[ \t]+/g, " ").trim();
    if (!para) continue;
    const tokens = para.split(" ");
    let current = "";
    for (const token of tokens) {
      const candidate = current ? `${current} ${token}` : token;
      if (measure(candidate) <= limit) {
        current = candidate;
        continue;
      }
      if (current) out.push(current);
      current = "";
      if (measure(token) <= limit) {
        current = token;
        continue;
      }
      // 긴 단어(또는 공백 없는 문장)는 글자 단위로 자른다.
      for (const ch of Array.from(token)) {
        const c2 = current + ch;
        if (current && measure(c2) > limit) {
          out.push(current);
          current = ch;
        } else {
          current = c2;
        }
      }
    }
    if (current) out.push(current);
  }
  return out;
}

const round = (v: number) => Math.round(v * 10000) / 10000;
