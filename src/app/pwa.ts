import { h } from "./dom";
import { t } from "./state";

/** 서비스 워커 등록 (배포 빌드에서만). 새 버전이 적용되면 새로고침을 권한다. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || import.meta.env.MODE === "artifact") return;
  if (!("serviceWorker" in navigator)) return;
  // 처음 설치될 때도 controllerchange가 오므로, 이미 제어 중이었을 때만 업데이트로 본다
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) showUpdateToast();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .then((reg) => {
        // 앱을 오래 켜 두어도 새 버전을 확인한다
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") void reg.update().catch(() => undefined);
        });
      })
      .catch(() => undefined);
  });
}

export function showUpdateToast(): void {
  if (document.querySelector(".toast.update")) return;
  const s = t();
  const toast = h(
    "div",
    { class: "toast update", role: "status" },
    h("span", {}, s.updateReady),
    h("button", { type: "button", class: "btn primary", onclick: () => location.reload() }, s.reload),
    h("button", { type: "button", class: "icon-btn", "aria-label": s.cancel, onclick: () => toast.remove() }, "✕"),
  );
  document.body.append(toast);
}
