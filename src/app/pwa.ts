/** 서비스 워커 등록 (배포 빌드에서만). 실패해도 앱 동작에는 영향이 없다. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || import.meta.env.MODE === "artifact") return;
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => undefined);
  });
}
