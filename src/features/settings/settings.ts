import { h } from "../../app/dom";
import { hrefFor, navigate } from "../../app/router";
import { settings, t, updateSettings } from "../../app/state";
import { settingsForm } from "./form";

export function renderSettings(root: HTMLElement): () => void {
  const form = settingsForm(
    settings,
    "saveSettings",
    async (d) => {
      await updateSettings(d);
      navigate(hrefFor.home());
    },
    () => navigate(hrefFor.home()),
  );
  root.append(
    h(
      "main",
      { class: "page narrow" },
      h("header", { class: "practice-header" }, h("a", { class: "btn ghost", href: hrefFor.home() }, `← ${t().back}`), h("h1", { class: "title" }, t().settings)),
      form,
    ),
  );
  return () => {};
}
