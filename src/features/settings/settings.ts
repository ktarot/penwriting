import { h } from "../../app/dom";
import { hrefFor, navigate } from "../../app/router";
import { settings, t, updateSettings } from "../../app/state";
import { settingsForm } from "./form";
import { voiceCheckSection } from "./voice-check";

export function renderSettings(root: HTMLElement): () => void {
  const form = settingsForm(
    settings,
    "saveSettings",
    async (d) => {
      // 칠판 종이로 바꾸면 흰 펜, 밝은 종이로 돌아오면 기본 펜
      let inkColor = settings.inkColor;
      if (d.paperColor === "board" && settings.paperColor !== "board") inkColor = "#ffffff";
      if (d.paperColor !== "board" && inkColor === "#ffffff") inkColor = "#1d2b53";
      await updateSettings({ ...d, inkColor });
      navigate(hrefFor.home());
    },
    () => navigate(hrefFor.home()),
    true,
  );
  root.append(
    h(
      "main",
      { class: "page narrow" },
      h("header", { class: "practice-header" }, h("a", { class: "btn ghost", href: hrefFor.home() }, `← ${t().back}`), h("h1", { class: "title" }, t().settings)),
      form,
      h("div", { style: "margin-top:20px" }, voiceCheckSection()),
    ),
  );
  return () => {};
}
