import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/nanum-pen-script/400.css";
import "../styles/main.css";
import { renderComparison } from "../features/comparison/comparison";
import { renderHome } from "../features/home/home";
import { renderPractice } from "../features/practice/practice";
import { parseRoute } from "./router";

const root = document.getElementById("app")!;
let cleanup: () => void = () => {};

function render() {
  cleanup();
  root.replaceChildren();
  window.scrollTo(0, 0);
  const route = parseRoute(location.hash);
  if (route.name === "practice") cleanup = renderPractice(root, route.itemId);
  else if (route.name === "compare") cleanup = renderComparison(root);
  else cleanup = renderHome(root);
}

window.addEventListener("hashchange", render);
render();
