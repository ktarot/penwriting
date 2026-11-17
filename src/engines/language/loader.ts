import { isLanguageCode, LANGUAGES, type LanguageCode, type LanguagePack, type LearningLevel } from "../../types";

const LEVELS: readonly LearningLevel[] = ["character", "word", "short-sentence", "long-sentence", "paragraph"];
const GUIDE_FIELDS = ["nameReading", "pronunciation", "meaning", "explanation"] as const;

/** 언어팩 구조를 검사하고 문제 목록을 돌려준다 (빈 배열이면 정상) */
export function validatePack(raw: unknown, expected?: LanguageCode): string[] {
  const errs: string[] = [];
  const p = raw as Partial<LanguagePack> | null;
  if (!p || typeof p !== "object") return ["pack is not an object"];
  if (!isLanguageCode(p.language)) errs.push("invalid language");
  if (expected && p.language !== expected) errs.push(`language ${p.language} != ${expected}`);
  if (typeof p.version !== "string" || !/^\d+\.\d+\.\d+$/.test(p.version)) errs.push("invalid version");
  if (!p.review || (p.review.status !== "draft" && p.review.status !== "reviewed")) errs.push("missing review status");
  if (!Array.isArray(p.categories) || p.categories.length === 0) return [...errs, "no categories"];
  const ids = new Set<string>();
  for (const c of p.categories) {
    if (!c.id || !LEVELS.includes(c.level)) errs.push(`category ${c.id}: bad id/level`);
    if (!Array.isArray(c.items) || c.items.length === 0) errs.push(`category ${c.id}: no items`);
    for (const it of c.items ?? []) {
      const where = `item ${it.id}`;
      if (!it.id || ids.has(it.id)) errs.push(`${where}: missing or duplicate id`);
      ids.add(it.id);
      if (!/^[a-z0-9-]+$/.test(it.id)) errs.push(`${where}: id must be [a-z0-9-]`);
      if (!it.id.startsWith(`${p.language}-`)) errs.push(`${where}: id must start with language code`);
      if (it.language !== p.language) errs.push(`${where}: language mismatch`);
      if (it.level !== c.level) errs.push(`${where}: level mismatch`);
      if (typeof it.text !== "string" || !it.text.trim()) errs.push(`${where}: empty text`);
      if (!it.nativeGuides || typeof it.nativeGuides !== "object") errs.push(`${where}: missing nativeGuides`);
      for (const [lang, g] of Object.entries(it.nativeGuides ?? {})) {
        if (!isLanguageCode(lang)) errs.push(`${where}: unknown guide language ${lang}`);
        if (lang === p.language) errs.push(`${where}: guide in its own language`);
        for (const k of Object.keys(g ?? {})) {
          if (!(GUIDE_FIELDS as readonly string[]).includes(k)) errs.push(`${where}: unknown guide field ${k}`);
        }
      }
    }
  }
  return errs;
}

declare global {
  interface Window {
    /** 단일 HTML 빌드에서 미리 넣어 둔 언어팩 */
    __PENWRITING_PACKS__?: Partial<Record<LanguageCode, LanguagePack>>;
  }
}

const cache = new Map<LanguageCode, Promise<LanguagePack>>();

export function loadPack(lang: LanguageCode): Promise<LanguagePack> {
  if (!LANGUAGES.includes(lang)) return Promise.reject(new Error(`unsupported language ${lang}`));
  const cached = cache.get(lang);
  if (cached) return cached;
  const p = (async () => {
    const inline = typeof window !== "undefined" ? window.__PENWRITING_PACKS__?.[lang] : undefined;
    let raw: unknown = inline;
    if (!raw) {
      const url = new URL(`languages/${lang}/pack.json`, document.baseURI);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`pack ${lang}: HTTP ${res.status}`);
      raw = await res.json();
    }
    const errs = validatePack(raw, lang);
    if (errs.length) throw new Error(`pack ${lang} invalid: ${errs.slice(0, 3).join("; ")}`);
    return raw as LanguagePack;
  })();
  cache.set(lang, p);
  p.catch(() => cache.delete(lang));
  return p;
}
