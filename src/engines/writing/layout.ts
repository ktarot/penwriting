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

/** 줄 맨 앞에 오면 안 되는 닫는 문장부호 */
const NO_LINE_START = new Set(Array.from(".,!?;:)]}%»」』）】〉》、。，．！？；：…‥ー・ゃゅょっぁぃぅぇぉャュョッァィゥェォ"));

export interface BreakOptions {
  /** 한 단어가 한계를 이만큼 넘는 정도는 자르지 않고 축소해서 보여 준다 */
  tolerance?: number;
}

/**
 * 텍스트를 줄 단위로 나눈다.
 * - 명시적 줄바꿈 유지
 * - 공백이 있으면 단어 단위로 나눈다.
 * - 한 단어가 너무 길면 글자 단위로 고르게 나눈다 (한 글자만 남는 줄을 피함)
 * - 닫는 문장부호는 줄 맨 앞에 오지 않는다
 * maxEm: 한 줄 글자 영역의 최대 너비(em, 패딩 제외). Infinity면 줄바꿈 문자에서만 나눈다.
 */
export function breakLines(text: string, measure: MeasureFn, maxEm: number, opts: BreakOptions = {}): string[] {
  const out: string[] = [];
  const limit = Math.max(maxEm, 1);
  const tolerance = opts.tolerance ?? 1.25;
  for (const rawPara of text.replace(/\r\n?/g, "\n").split("\n")) {
    const para = rawPara.replace(/[ \t]+/g, " ").trim();
    if (!para) continue;
    let current = "";
    for (const token of para.split(" ")) {
      const candidate = current ? `${current} ${token}` : token;
      if (measure(candidate) <= limit) {
        current = candidate;
        continue;
      }
      if (current) out.push(current);
      current = "";
      if (measure(token) <= limit * tolerance) {
        current = token;
        continue;
      }
      const chunks = splitBalanced(token, measure, limit);
      out.push(...chunks.slice(0, -1));
      current = chunks[chunks.length - 1];
    }
    if (current) out.push(current);
  }
  return out;
}

/** 긴 단어를 비슷한 길이의 조각으로 나눈다 */
function splitBalanced(token: string, measure: MeasureFn, limit: number): string[] {
  const chars = Array.from(token);
  const n = Math.max(1, Math.ceil(measure(token) / limit));
  // 나머지를 앞 조각부터 하나씩 나눠 줘서 조각 길이 차이를 1 이하로 만든다
  const base = Math.floor(chars.length / n);
  const extra = chars.length % n;
  const chunks: string[][] = [];
  let pos = 0;
  for (let i = 0; i < n; i++) {
    const len = base + (i < extra ? 1 : 0);
    chunks.push(chars.slice(pos, pos + len));
    pos += len;
  }
  // 닫는 문장부호가 줄 맨 앞에 오면 앞 줄로 붙인다
  for (let i = 1; i < chunks.length; i++) {
    while (chunks[i].length && NO_LINE_START.has(chunks[i][0])) chunks[i - 1].push(chunks[i].shift()!);
  }
  return chunks.filter((c) => c.length).map((c) => c.join(""));
}

const round = (v: number) => Math.round(v * 10000) / 10000;
