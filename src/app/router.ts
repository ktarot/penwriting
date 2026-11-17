/**
 * 해시 라우팅. 경로는 `#practice-<항목ID>`, `#compare`처럼 평범한 이름 하나로 둔다.
 * (`#/a/b` 형태는 일부 임베드 환경에서 전달되지 않는다)
 */
export type Route =
  | { name: "home" }
  | { name: "welcome" }
  | { name: "options" }
  | { name: "practice"; itemId: string }
  | { name: "compare" }
  | { name: "history" }
  | { name: "record"; id: string };

const PRACTICE_PREFIX = "practice-";

export function parseRoute(hash: string): Route {
  const name = decodeURIComponent(hash.replace(/^#\/?/, ""));
  if (name.startsWith(PRACTICE_PREFIX) && name.length > PRACTICE_PREFIX.length) {
    return { name: "practice", itemId: name.slice(PRACTICE_PREFIX.length) };
  }
  if (name === "compare") return { name: "compare" };
  if (name === "history") return { name: "history" };
  if (name.startsWith("record-") && name.length > 7) return { name: "record", id: name.slice(7) };
  if (name === "welcome") return { name: "welcome" };
  if (name === "options") return { name: "options" };
  return { name: "home" };
}

export const hrefFor = {
  home: () => "#",
  welcome: () => "#welcome",
  options: () => "#options",
  practice: (itemId: string) => `#${PRACTICE_PREFIX}${itemId}`,
  compare: () => "#compare",
  history: () => "#history",
  record: (id: string) => `#record-${id}`,
};

export function navigate(href: string): void {
  if (location.hash === href || (href === "#" && location.hash === "")) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    location.hash = href;
  }
}
