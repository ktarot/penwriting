import type { FontStyle } from "../../types";
import type { MeasureFn } from "./layout";

/**
 * 글씨체 정의. 글꼴 파일은 @fontsource 패키지(SIL OFL 1.1)에서 번들되며
 * unicode-range 서브셋으로 나뉘어 필요한 글자 범위만 내려받는다.
 * Phase 2에서 언어별 글꼴(일본어 등)을 추가한다.
 */
export const FONT_FAMILIES: Record<FontStyle, string> = {
  standard: `"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`,
  handwriting: `"Nanum Pen Script", "Noto Sans KR", cursive`,
};

/**
 * 손글씨 글꼴은 같은 em에서 글자가 작게 그려지므로 보정 배율을 둔다.
 * 가이드 렌더링과 너비 측정에 동일하게 적용된다.
 */
export const FONT_SCALE: Record<FontStyle, number> = {
  standard: 1,
  handwriting: 1.25,
};

export const FONT_LABELS: Record<FontStyle, string> = {
  standard: "정자체",
  handwriting: "손글씨",
};

/** 글꼴 로딩 대기. 실패하거나 오래 걸리면 대체 글꼴로 진행한다. */
export async function ensureFont(style: FontStyle, text: string, timeoutMs = 4000): Promise<boolean> {
  if (typeof document === "undefined" || !document.fonts) return false;
  const spec = `${100 * FONT_SCALE[style]}px ${FONT_FAMILIES[style]}`;
  try {
    const loaded = await Promise.race([
      document.fonts.load(spec, text || "가A"),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return Array.isArray(loaded) && loaded.length > 0;
  } catch {
    return false;
  }
}

let measureCtx: CanvasRenderingContext2D | null = null;

/** 현재 로딩된 글꼴로 텍스트 너비를 em 단위로 측정하는 함수를 만든다. */
export function createMeasure(style: FontStyle): MeasureFn {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  const ctx = measureCtx;
  const scale = FONT_SCALE[style];
  const font = `100px ${FONT_FAMILIES[style]}`;
  return (text: string) => {
    if (!ctx) return Array.from(text).length * scale;
    ctx.font = font;
    return (ctx.measureText(text).width / 100) * scale;
  };
}
