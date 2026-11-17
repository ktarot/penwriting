// 글꼴 파일을 앱과 함께 번들한다 (모두 SIL OFL 1.1).
// 언어별로 나눠 두고 필요한 언어의 글꼴만 동적으로 불러온다.
import type { LanguageCode } from "../types";

const loaders: Record<LanguageCode, () => Promise<unknown>> = {
  ko: () => Promise.all([import("@fontsource/noto-sans-kr/400.css"), import("@fontsource/nanum-pen-script/400.css")]),
  ja: () => Promise.all([import("@fontsource/noto-sans-jp/400.css"), import("@fontsource/klee-one/600.css")]),
  en: () => Promise.all([import("@fontsource/noto-sans/400.css"), import("@fontsource/patrick-hand/400.css")]),
  vi: () => Promise.all([import("@fontsource/noto-sans/400.css"), import("@fontsource/patrick-hand/400.css")]),
};

const done = new Map<LanguageCode, Promise<unknown>>();

export function loadFontCss(lang: LanguageCode): Promise<unknown> {
  if (!done.has(lang)) done.set(lang, loaders[lang]().catch(() => undefined));
  return done.get(lang)!;
}
