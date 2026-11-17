/* PenWriting 서비스 워커 — 빌드 때 pwa/vite-plugin-sw.ts가 목록과 버전을 채운다. */
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const SHELL = `penwriting-shell-${VERSION}`;
const RUNTIME = "penwriting-runtime";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(PRECACHE.map((p) => new Request(p, { cache: "reload" })))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("penwriting-shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function fromCache(request) {
  return (await caches.match(request, { ignoreSearch: true })) ?? undefined;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 페이지 이동: 네트워크 우선, 오프라인이면 저장된 앱 화면
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const scope = self.registration.scope;
        return (await fromCache(new URL("./index.html", scope).href)) ?? (await fromCache(scope)) ?? Response.error();
      }),
    );
    return;
  }

  // 언어팩: 저장본을 바로 쓰고 뒤에서 새로 받아 둔다
  if (url.pathname.endsWith("/pack.json")) {
    event.respondWith(
      (async () => {
        const cached = await fromCache(req);
        const network = fetch(req)
          .then(async (res) => {
            if (res.ok) await (await caches.open(RUNTIME)).put(req, res.clone());
            return res;
          })
          .catch(() => undefined);
        return cached ?? (await network) ?? Response.error();
      })(),
    );
    return;
  }

  // 그 밖의 파일(빌드 결과·글꼴 등): 캐시 우선, 없으면 받아서 저장
  event.respondWith(
    (async () => {
      const cached = await fromCache(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok && res.type === "basic") (await caches.open(RUNTIME)).put(req, res.clone());
      return res;
    })(),
  );
});
