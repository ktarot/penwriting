import { confirmDialog } from "../../app/dialog";
import { h } from "../../app/dom";
import { hrefFor } from "../../app/router";
import { appBar, bottomNav, withIcon } from "../../app/shell";
import { t } from "../../app/state";
import { deleteAllRecords, deleteRecord, listRecords } from "../../storage/repositories/records";
import { clearProgress } from "../../storage/repositories/progress";
import { formatDate } from "../comparison/comparison";

/** 저장한 학습 기록 목록 */
export function renderHistory(root: HTMLElement): () => void {
  const s = t();
  let disposed = false;
  const list = h("div", {}, h("p", { class: "loading" }, s.loadingPack));
  const deleteAllBtn = h("button", { type: "button", class: "btn danger" }, ...withIcon("trash", s.deleteAll));

  const draw = async () => {
    const records = await listRecords().catch(() => []);
    if (disposed) return;
    deleteAllBtn.disabled = records.length === 0;
    if (!records.length) {
      list.replaceChildren(h("p", { class: "empty-state card" }, s.historyEmpty));
      return;
    }
    list.replaceChildren(
      h(
        "ul",
        { class: "record-list" },
        ...records.map((r) => {
          const del = h("button", { type: "button", class: "btn danger", "aria-label": `${s.delete}: ${r.sourceText}` }, s.delete);
          del.addEventListener("click", async () => {
            if (!(await confirmDialog(s.deleteConfirm, s.delete, s.cancel))) return;
            await deleteRecord(r.id);
            void draw();
          });
          return h(
            "li",
            { class: "record", "data-id": r.id },
            h("span", { class: "r-text", lang: r.language }, r.sourceText.replace(/\n/g, " ")),
            h("span", { class: "r-meta" }, `${s.langName[r.language]} · ${s.font[r.fontStyle]} · ${formatDate(r.createdAt)}`),
            h("a", { class: "btn", href: hrefFor.record(r.id) }, s.open),
            del,
          );
        }),
      ),
    );
  };

  deleteAllBtn.addEventListener("click", async () => {
    if (!(await confirmDialog(s.deleteAllConfirm, s.deleteAll, s.cancel))) return;
    await Promise.allSettled([deleteAllRecords(), clearProgress()]);
    void draw();
  });

  root.append(
    h(
      "div",
      { class: "screen" },
      appBar(s.history),
      h("main", { class: "page narrow" }, h("p", { class: "notice warn" }, s.storageWarning), list, h("div", { class: "btn-row", style: "margin-top:16px" }, deleteAllBtn)),
      bottomNav("history"),
    ),
  );
  void draw();
  return () => {
    disposed = true;
  };
}
