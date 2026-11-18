import { h } from "../../app/dom";
import { icon } from "../../app/icons";
import { hrefFor } from "../../app/router";
import { appBar, bottomNav } from "../../app/shell";
import { t } from "../../app/state";

export const REPO_URL = "https://github.com/ktarot/penwriting";

/** 오픈소스 자료 목록 (스토어 등록·라이선스 고지용) */
export const OPEN_SOURCE = [
  { name: "Noto Sans KR · Noto Sans JP · Noto Sans", by: "Google", license: "SIL Open Font License 1.1", url: "https://fonts.google.com/noto" },
  { name: "Nanum Pen Script", by: "NAVER", license: "SIL Open Font License 1.1", url: "https://fonts.google.com/specimen/Nanum+Pen+Script" },
  { name: "Klee One", by: "Fontworks", license: "SIL Open Font License 1.1", url: "https://fonts.google.com/specimen/Klee+One" },
  { name: "Patrick Hand", by: "Patrick Wagesreiter", license: "SIL Open Font License 1.1", url: "https://fonts.google.com/specimen/Patrick+Hand" },
  { name: "KanjiVG (書き順 / stroke order)", by: "Ulrich Apel", license: "CC BY-SA 3.0", url: "https://kanjivg.tagaini.net" },
];

/** 앱 정보: 버전, 개인정보처리방침, 오픈소스 라이선스, 문의 */
export function renderAbout(root: HTMLElement): () => void {
  const s = t();
  const ext = (href: string, label: string) => h("a", { href, target: "_blank", rel: "noopener" }, label, " ", icon("external", 14));
  root.append(
    h(
      "div",
      { class: "screen" },
      appBar(s.about, { back: hrefFor.options() }),
      h(
        "main",
        { class: "page narrow about" },
        h("section", { class: "card about-head" }, h("img", { src: "icons/icon-192.png", alt: "", width: 64, height: 64 }), h("div", {}, h("h2", {}, "PenWriting"), h("p", { class: "help" }, `${s.version} ${__APP_VERSION__}`))),
        h("section", { class: "card", id: "privacy" }, h("h2", {}, s.privacy), ...s.privacyBody.map((p) => h("p", {}, p)), h("p", { class: "help" }, s.privacyUpdated)),
        h(
          "section",
          { class: "card", id: "licenses" },
          h("h2", {}, s.licenses),
          h("p", { class: "help" }, s.licensesBody),
          h("ul", { class: "license-list" }, ...OPEN_SOURCE.map((o) => h("li", {}, h("strong", {}, o.name), h("span", {}, ` — ${o.by} · ${o.license} · `), ext(o.url, "↗")))),
        ),
        h("section", { class: "card", id: "contact" }, h("h2", {}, s.contact), h("p", {}, s.contactText), h("p", {}, ext(`${REPO_URL}/issues`, "GitHub Issues"))),
      ),
      bottomNav("settings"),
    ),
  );
  return () => {};
}
