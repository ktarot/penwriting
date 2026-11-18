/**
 * 해시 라우팅. 경로는 `#practice-<항목ID>`, `#area-word`처럼 평범한 이름 하나로 둔다.
 * (`#/a/b` 형태는 일부 임베드 환경에서 전달되지 않는다)
 */
export type AreaKey = "character" | "word" | "short" | "long" | "mine";
export const AREAS: readonly AreaKey[] = ["character", "word", "short", "long", "mine"];

export type Route =
  | { name: "home" }
  | { name: "welcome" }
  | { name: "options" }
  | { name: "about" }
  | { name: "area"; area: AreaKey }
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
  if (name.startsWith("area-") && (AREAS as readonly string[]).includes(name.slice(5))) return { name: "area", area: name.slice(5) as AreaKey };
  if (name.startsWith("record-") && name.length > 7) return { name: "record", id: name.slice(7) };
  if (name === "compare" || name === "welcome" || name === "options" || name === "history" || name === "about") return { name };
  return { name: "home" };
}

export const hrefFor = {
  home: () => "#",
  welcome: () => "#welcome",
  options: () => "#options",
  about: () => "#about",
  area: (a: AreaKey) => `#area-${a}`,
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

/** 기록을 남기지 않고 이동 (뒤로 가기로 돌아오지 않을 화면: 첫 설정 등) */
export function replaceRoute(href: string): void {
  const url = new URL(location.href);
  url.hash = href === "#" ? "" : href;
  location.replace(url.toString());
}

/**
 * 앱 안에서 지나온 화면. 앱 막대의 [뒤로]는 앞 화면이 앱 안이면 브라우저 뒤로 가기와 같게 동작하고,
 * 그렇지 않으면(바로 링크로 들어온 경우) 상위 화면으로 이동한다. Android 뒤로 버튼과 결과가 같다.
 */
const visited: string[] = [];

export function trackRoute(hash: string): void {
  const h = hash || "#";
  if (visited.length >= 2 && visited[visited.length - 2] === h) visited.pop();
  else if (visited[visited.length - 1] !== h) visited.push(h);
}

export function goBack(parentHref: string): void {
  if (visited.length > 1) history.back();
  else replaceRoute(parentHref);
}
