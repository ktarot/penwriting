import type { LanguageCode } from "../../types";

/**
 * 검증된 외부 데이터가 있는 언어만 획순을 제공한다 (계획서 7.5: 임의 획순 생성 금지).
 * 현재: 일본어(가나·기초 한자) — KanjiVG, CC BY-SA 3.0
 */
export interface StrokeOrderData {
  source: string;
  url: string;
  license: string;
  licenseUrl: string;
  viewBox: [number, number];
  chars: Record<string, { strokes: string[]; numbers: [number, number][] }>;
}

export const STROKE_ORDER_LANGUAGES: readonly LanguageCode[] = ["ja"];

declare global {
  interface Window {
    __PENWRITING_STROKES__?: Partial<Record<LanguageCode, StrokeOrderData>>;
  }
}

export function validateStrokeData(raw: unknown): string[] {
  const d = raw as Partial<StrokeOrderData> | null;
  if (!d || typeof d !== "object") return ["not an object"];
  const errs: string[] = [];
  if (!d.source || !d.license || !d.url) errs.push("missing attribution");
  if (!Array.isArray(d.viewBox) || d.viewBox.length !== 2) errs.push("bad viewBox");
  for (const [ch, v] of Object.entries(d.chars ?? {})) {
    if (!Array.isArray(v.strokes) || !v.strokes.length) errs.push(`${ch}: no strokes`);
    if (!Array.isArray(v.numbers) || v.numbers.length !== v.strokes?.length) errs.push(`${ch}: numbers mismatch`);
    for (const p of v.strokes ?? []) if (!/^[MmCcSsLlHhVvQqTtZz0-9.,\-\s]+$/.test(p)) errs.push(`${ch}: bad path`);
  }
  return errs;
}

const cache = new Map<LanguageCode, Promise<StrokeOrderData | null>>();

/** 획순 데이터를 불러온다. 없는 언어거나 실패하면 null (연습은 그대로 가능) */
export function loadStrokeOrder(lang: LanguageCode): Promise<StrokeOrderData | null> {
  if (!STROKE_ORDER_LANGUAGES.includes(lang)) return Promise.resolve(null);
  const hit = cache.get(lang);
  if (hit) return hit;
  const p = (async () => {
    try {
      let raw: unknown = typeof window !== "undefined" ? window.__PENWRITING_STROKES__?.[lang] : undefined;
      if (!raw) {
        const res = await fetch(new URL(`strokes/${lang}.json`, document.baseURI));
        if (!res.ok) return null;
        raw = await res.json();
      }
      return validateStrokeData(raw).length ? null : (raw as StrokeOrderData);
    } catch {
      return null;
    }
  })();
  cache.set(lang, p);
  p.then((v) => v === null && cache.delete(lang));
  return p;
}
