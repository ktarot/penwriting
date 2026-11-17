import { h } from "../../app/dom";
import { t } from "../../app/state";
import { pickVoice, speech } from "../../engines/speech/tts";
import { LANGUAGES, type LanguageCode } from "../../types";
import { DEFAULT_LOCALE } from "../practice/practice";

const SAMPLE: Record<LanguageCode, string> = { ko: "안녕하세요", en: "Hello", ja: "こんにちは", vi: "Xin chào" };

/** 기기 음성 진단: 지원 여부, 언어별 선택 음성, 테스트 재생 */
export function voiceCheckSection(): HTMLElement {
  const s = t();
  const body = h("div", {}, h("p", { class: "loading" }, "…"));
  const section = h("section", { class: "card voice-check", id: "voice-check" }, h("h2", {}, s.voiceCheck), h("p", { class: "help" }, s.voiceCheckHelp), body);

  void speech()
    .diagnose()
    .then((d) => {
      const rows = LANGUAGES.map((lang) => {
        const v = pickVoice(d.voices, DEFAULT_LOCALE[lang]);
        const result = h("span", { class: "vc-result", role: "status" });
        const btn = h("button", { type: "button", class: "btn" }, `▶ ${s.test}`);
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          result.textContent = "…";
          const r = await speech().speak(SAMPLE[lang], DEFAULT_LOCALE[lang]);
          btn.disabled = false;
          result.className = `vc-result ${r === "ok" ? "ok" : "bad"}`;
          result.textContent =
            r === "ok" ? `✓ ${s.testOk}` : r === "unsupported" ? s.ttsUnsupported : r === "no-voice" ? s.ttsNoVoice.replace("{lang}", s.langName[lang]) : r === "blocked" ? s.ttsBlocked : `${s.ttsError} (${r})`;
        });
        return h(
          "tr",
          { "data-lang": lang },
          h("th", { scope: "row" }, s.langName[lang]),
          h("td", {}, v ? `${v.name} (${v.lang})` : s.voiceMissing),
          h("td", {}, btn, " ", result),
        );
      });
      body.replaceChildren(
        h("p", {}, `${s.voiceSupported}: `, h("strong", {}, d.supported ? s.yes : s.no), ` · ${s.voiceTotal}: `, h("strong", { class: "vc-count" }, String(d.voices.length))),
        h(
          "div",
          { class: "table-wrap" },
          h("table", { class: "vc-table" }, h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", {}, s.voiceFor), h("th", {}, ""))), h("tbody", {}, ...rows)),
        ),
        d.voices.length
          ? h(
              "details",
              {},
              h("summary", {}, `${s.voiceList} (${d.voices.length})`),
              h("ul", { class: "vc-all" }, ...d.voices.map((v) => h("li", {}, `${v.lang} — ${v.name}${v.localService ? " · local" : ""}${v.default ? " · default" : ""}`))),
            )
          : "",
        h("p", { class: "help" }, `UA: ${navigator.userAgent}`),
      );
    });
  return section;
}
