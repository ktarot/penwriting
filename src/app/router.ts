export type Route =
  | { name: "home" }
  | { name: "practice"; itemId: string }
  | { name: "compare" };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, "") || "/";
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "practice" && parts[1]) return { name: "practice", itemId: parts[1] };
  if (parts[0] === "compare") return { name: "compare" };
  return { name: "home" };
}

export function navigate(path: string): void {
  if (location.hash === `#${path}`) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    location.hash = path;
  }
}
