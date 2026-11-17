/**
 * 해시 라우팅. 경로는 `#practice-<항목ID>`, `#compare`처럼 평범한 이름 하나로 둔다.
 * (`#/a/b` 형태는 일부 임베드 환경에서 전달되지 않는다)
 */
export type Route =
  | { name: "home" }
  | { name: "practice"; itemId: string }
  | { name: "compare" };

const PRACTICE_PREFIX = "practice-";

export function parseRoute(hash: string): Route {
  const name = decodeURIComponent(hash.replace(/^#\/?/, ""));
  if (name.startsWith(PRACTICE_PREFIX) && name.length > PRACTICE_PREFIX.length) {
    return { name: "practice", itemId: name.slice(PRACTICE_PREFIX.length) };
  }
  if (name === "compare") return { name: "compare" };
  return { name: "home" };
}

export const hrefFor = {
  home: () => "#",
  practice: (itemId: string) => `#${PRACTICE_PREFIX}${itemId}`,
  compare: () => "#compare",
};

export function navigate(href: string): void {
  if (location.hash === href || (href === "#" && location.hash === "")) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    location.hash = href;
  }
}
