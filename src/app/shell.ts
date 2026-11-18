import { h } from "./dom";
import { icon, type IconName } from "./icons";
import { goBack, hrefFor } from "./router";
import { t } from "./state";

export type NavKey = "home" | "history" | "settings";

/** 위쪽 앱 막대: [뒤로] 제목 [동작] */
export function appBar(title: string | Node, opts: { back?: string; actions?: Node[]; titleLang?: string } = {}): HTMLElement {
  const s = t();
  return h(
    "header",
    { class: "app-bar" },
    opts.back !== undefined
      ? h("button", { type: "button", class: "icon-btn", "aria-label": s.goBack, onclick: () => goBack(opts.back!) }, icon("back", 24))
      : null,
    h("h1", { class: "app-bar-title", lang: opts.titleLang }, title),
    opts.actions?.length ? h("div", { class: "app-bar-actions" }, ...opts.actions) : null,
  );
}

/** 아래쪽 고정 메뉴: 홈 · 기록 · 설정 */
export function bottomNav(active: NavKey | null): HTMLElement {
  const s = t();
  const item = (key: NavKey, href: string, ic: IconName, label: string) =>
    h(
      "a",
      { class: `nav-item${active === key ? " active" : ""}`, href, "aria-current": active === key ? "page" : undefined },
      icon(ic, 24),
      h("span", {}, label),
    );
  return h(
    "nav",
    { class: "bottom-nav", "aria-label": s.navLabel },
    item("home", hrefFor.home(), "home", s.navHome),
    item("history", hrefFor.history(), "history", s.navHistory),
    item("settings", hrefFor.options(), "settings", s.navSettings),
  );
}

/** 버튼 안에 아이콘 + 글자 */
export function withIcon(name: IconName, label: string): (Node | string)[] {
  return [icon(name), h("span", {}, label)];
}
