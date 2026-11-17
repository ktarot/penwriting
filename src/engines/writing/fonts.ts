import type { FontStyle, LanguageCode } from "../../types";
import type { MeasureFn } from "./layout";

export interface FontDef {
  family: string;
  weight: number;
  /** 같은 em에서 글자가 작게 그려지는 글꼴의 보정 배율 (가이드와 측정에 동일 적용) */
  scale: number;
}

const KO_FALLBACK = `"Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
const JA_FALLBACK = `"Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif`;
const LATIN_FALLBACK = `system-ui, "Segoe UI", Roboto, Arial, sans-serif`;

/** 언어별 글씨체. 글꼴은 모두 SIL OFL 1.1 (웹 배포·앱 내장 가능) */
export const FONTS: Record<LanguageCode, Record<FontStyle, FontDef>> = {
  ko: {
    standard: { family: `"Noto Sans KR", ${KO_FALLBACK}`, weight: 400, scale: 1 },
    handwriting: { family: `"Nanum Pen Script", "Noto Sans KR", cursive`, weight: 400, scale: 1.25 },
  },
  ja: {
    standard: { family: `"Noto Sans JP", ${JA_FALLBACK}`, weight: 400, scale: 1 },
    handwriting: { family: `"Klee One", "Noto Sans JP", ${JA_FALLBACK}`, weight: 600, scale: 1 },
  },
  en: {
    standard: { family: `"Noto Sans", ${LATIN_FALLBACK}`, weight: 400, scale: 1 },
    handwriting: { family: `"Patrick Hand", "Noto Sans", cursive`, weight: 400, scale: 1.12 },
  },
  vi: {
    standard: { family: `"Noto Sans", ${LATIN_FALLBACK}`, weight: 400, scale: 1 },
    handwriting: { family: `"Patrick Hand", "Noto Sans", cursive`, weight: 400, scale: 1.12 },
  },
};

export function fontFor(lang: LanguageCode, style: FontStyle): FontDef {
  return FONTS[lang][style];
}

/** 글꼴 CSS(@font-face)를 언어별로 불러오는 함수. 앱이 시작할 때 등록한다. */
let fontCssLoader: (lang: LanguageCode) => Promise<unknown> = () => Promise.resolve();
export function setFontCssLoader(fn: (lang: LanguageCode) => Promise<unknown>): void {
  fontCssLoader = fn;
}

/** 글꼴 로딩 대기. 실패하거나 오래 걸리면 대체 글꼴로 진행한다. */
export async function ensureFont(lang: LanguageCode, style: FontStyle, text: string, timeoutMs = 5000): Promise<boolean> {
  if (typeof document === "undefined" || !document.fonts) return false;
  const f = fontFor(lang, style);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  try {
    await Promise.race([fontCssLoader(lang), timeout]);
    const loaded = await Promise.race([document.fonts.load(`${f.weight} 100px ${f.family}`, text || "A"), timeout]);
    return Array.isArray(loaded) && loaded.length > 0;
  } catch {
    return false;
  }
}

let measureCtx: CanvasRenderingContext2D | null = null;

/** 현재 로딩된 글꼴로 텍스트 너비를 em 단위로 측정하는 함수를 만든다. */
export function createMeasure(lang: LanguageCode, style: FontStyle): MeasureFn {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  const ctx = measureCtx;
  const f = fontFor(lang, style);
  const font = `${f.weight} 100px ${f.family}`;
  return (text: string) => {
    if (!ctx) return Array.from(text).length * f.scale;
    ctx.font = font;
    return (ctx.measureText(text).width / 100) * f.scale;
  };
}
