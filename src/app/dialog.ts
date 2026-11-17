import { h } from "./dom";

/** 브라우저 confirm() 대신 쓰는 화면 내 확인 대화상자 (임베드 환경에서도 동작) */
export function confirmDialog(message: string, okLabel = "확인", cancelLabel = "취소"): Promise<boolean> {
  return new Promise((resolve) => {
    const dlg = h(
      "dialog",
      { class: "confirm" },
      h("p", {}, message),
      h(
        "form",
        { method: "dialog", class: "confirm-actions" },
        h("button", { class: "btn", value: "cancel" }, cancelLabel),
        h("button", { class: "btn primary", value: "ok" }, okLabel),
      ),
    );
    dlg.addEventListener("close", () => {
      resolve(dlg.returnValue === "ok");
      dlg.remove();
    });
    document.body.append(dlg);
    dlg.showModal();
  });
}
