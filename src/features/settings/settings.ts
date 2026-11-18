import { h } from "../../app/dom";
import { icon } from "../../app/icons";
import { hrefFor, navigate } from "../../app/router";
import { appBar, bottomNav } from "../../app/shell";
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
      "div",
      { class: "screen" },
      appBar(t().settings),
      h(
        "main",
        { class: "page narrow" },
        form,
        h("div", { style: "margin-top:20px" }, voiceCheckSection()),
        h("a", { class: "link-row card", href: hrefFor.about() }, icon("info"), h("span", {}, t().about), icon("chevron")),
      ),
      bottomNav("settings"),
    ),
  );
  return () => {};
}
