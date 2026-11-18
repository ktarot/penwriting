import { h } from "../../app/dom";
import { hrefFor, replaceRoute } from "../../app/router";
import { settings, updateSettings } from "../../app/state";
import { STRINGS } from "../../i18n/strings";
import { settingsForm } from "../settings/form";

/** 최초 실행 설정 (계획서 4.1) */
export function renderOnboarding(root: HTMLElement): () => void {
  const title = h("h1", {}, STRINGS[settings.nativeLanguage].onboardTitle);
  const intro = h("p", { class: "sub" }, STRINGS[settings.nativeLanguage].onboardIntro);
  const form = settingsForm(settings, "start", async (d) => {
    await updateSettings({ ...d, onboarded: true });
    // 첫 설정 화면은 뒤로 가기로 돌아오지 않도록 기록을 바꾼다
    replaceRoute(hrefFor.home());
  });
  // 모국어를 바꾸면 제목도 그 언어로
  form.addEventListener("change", () => {
    const checked = form.querySelector<HTMLInputElement>(".langs input:checked");
    const s = checked ? STRINGS[checked.value as keyof typeof STRINGS] : undefined;
    if (s) {
      title.textContent = s.onboardTitle;
      intro.textContent = s.onboardIntro;
    }
  });
  root.append(h("main", { class: "page narrow" }, h("header", { class: "app-header" }, h("p", { class: "brand" }, "PenWriting"), title, intro), form));
  return () => {};
}
