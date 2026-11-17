import "../styles/main.css";
import { setFontCssLoader } from "../engines/writing/fonts";
import { renderComparison, renderRecord } from "../features/comparison/comparison";
import { renderHistory } from "../features/history/history";
import { renderHome } from "../features/home/home";
import { renderOnboarding } from "../features/onboarding/onboarding";
import { renderPractice } from "../features/practice/practice";
import { renderSettings } from "../features/settings/settings";
import { defaultSettings, detectNativeLanguage, loadSettings } from "../storage/repositories/settings";
import { loadFontCss } from "./fonts-bundled";
import { registerServiceWorker } from "./pwa";
import { hrefFor, navigate, parseRoute } from "./router";
import { setSettings, settings } from "./state";

const root = document.getElementById("app")!;
let cleanup: () => void = () => {};

function render() {
  cleanup();
  root.replaceChildren();
  window.scrollTo(0, 0);
  const route = parseRoute(location.hash);
  if (!settings.onboarded && route.name !== "welcome") {
    navigate(hrefFor.welcome());
    return;
  }
  switch (route.name) {
    case "welcome":
      cleanup = renderOnboarding(root);
      break;
    case "options":
      cleanup = renderSettings(root);
      break;
    case "practice":
      cleanup = renderPractice(root, route.itemId);
      break;
    case "compare":
      cleanup = renderComparison(root);
      break;
    case "history":
      cleanup = renderHistory(root);
      break;
    case "record":
      cleanup = renderRecord(root, route.id);
      break;
    default:
      cleanup = renderHome(root);
  }
}

async function boot() {
  setFontCssLoader(loadFontCss);
  const saved = await loadSettings();
  setSettings(saved ?? defaultSettings(detectNativeLanguage()));
  window.addEventListener("hashchange", render);
  render();
}

registerServiceWorker();
void boot();
