// 단일 HTML 빌드(artifact 모드)용: 글꼴은 HTML의 Google Fonts 링크로 불러온다.
import type { LanguageCode } from "../types";

export function loadFontCss(_lang: LanguageCode): Promise<unknown> {
  return Promise.resolve();
}
