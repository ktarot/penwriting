import type { UserSettings } from "../types";

/** 접근성·테마 설정을 문서 루트 속성으로 반영한다 (CSS 토큰이 이를 따른다) */
export function applyAppearance(s: UserSettings): void {
  const root = document.documentElement;
  root.lang = s.nativeLanguage;
  root.style.setProperty("--ui-scale", String(s.uiScale));
  if (s.theme === "system") root.removeAttribute("data-theme");
  else root.dataset.theme = s.theme;
  root.dataset.contrast = s.highContrast ? "high" : "normal";
  root.dataset.paper = s.paperColor;
  root.dataset.hand = s.handedness;
  const meta = document.querySelector('meta[name="theme-color"]');
  const dark = s.theme === "dark" || (s.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  meta?.setAttribute("content", dark ? "#16191d" : "#f7f4ec");
}
