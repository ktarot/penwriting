import { h } from "../../app/dom";
import type { Strings } from "../../i18n/strings";
import type { StrokeOrderData } from "../../engines/language/stroke-order";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * 획순 그림: 획 번호, 시작점(●), 처음 방향 화살표, 한 획씩 그려지는 애니메이션.
 * 글꼴 글자와 모양이 조금 다르므로 연습 칸에 겹치지 않고 따로 보여 준다.
 */
export function renderStrokeOrder(char: string, data: StrokeOrderData, s: Strings): HTMLElement | null {
  const entry = data.chars[char];
  if (!entry) return null;
  const total = entry.strokes.length;
  const [vw, vh] = data.viewBox;
  const svg = svgEl("svg", { viewBox: `0 0 ${vw} ${vh}`, class: "so-svg", role: "img", "aria-label": `${s.strokeOrder}: ${char}, ${total}` });
  // 칸 보조선
  svg.append(
    svgEl("rect", { x: 0.5, y: 0.5, width: vw - 1, height: vh - 1, class: "so-frame" }),
    svgEl("line", { x1: vw / 2, y1: 0, x2: vw / 2, y2: vh, class: "so-cross" }),
    svgEl("line", { x1: 0, y1: vh / 2, x2: vw, y2: vh / 2, class: "so-cross" }),
  );
  const ghosts = entry.strokes.map((d) => svgEl("path", { d, class: "so-ghost" }));
  const inks = entry.strokes.map((d, i) => svgEl("path", { d, class: "so-ink", "data-stroke": i + 1 }));
  const marks = svgEl("g", { class: "so-marks" });
  svg.append(...ghosts, ...inks, marks);

  const label = h("span", { class: "so-count", "aria-live": "polite" });
  let shown = total; // 보이는 획 수
  let timers: number[] = [];

  /** 시작점·방향 화살표·번호 (현재 획은 강조) */
  const drawMarks = (current: number | null) => {
    marks.replaceChildren();
    inks.forEach((p, i) => {
      if (i >= shown) return;
      const len = p.getTotalLength();
      const a = p.getPointAtLength(0);
      const b = p.getPointAtLength(Math.min(7, len));
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const isCur = current === i;
      const g = svgEl("g", { class: `so-mark${isCur ? " current" : ""}` });
      g.append(svgEl("circle", { cx: a.x, cy: a.y, r: isCur ? 3.4 : 2.6, class: "so-start" }));
      // 처음 방향 화살표: 시작점 옆에 짧은 선 + 화살촉 (획에서 조금 비켜 그린다)
      const off = 6; // 획과 겹치지 않도록 옆으로 비킴
      const ox = Math.cos(ang - Math.PI / 2) * off;
      const oy = Math.sin(ang - Math.PI / 2) * off;
      const x0 = a.x + ox + Math.cos(ang) * 1;
      const y0 = a.y + oy + Math.sin(ang) * 1;
      const shaft = isCur ? 12 : 10;
      const x1 = x0 + Math.cos(ang) * shaft;
      const y1 = y0 + Math.sin(ang) * shaft;
      const sz = isCur ? 5 : 4.2;
      g.append(svgEl("line", { x1: x0.toFixed(1), y1: y0.toFixed(1), x2: x1.toFixed(1), y2: y1.toFixed(1), class: "so-shaft" }));
      const pts = [
        [x1 + Math.cos(ang) * sz, y1 + Math.sin(ang) * sz],
        [x1 + Math.cos(ang + 2.4) * sz, y1 + Math.sin(ang + 2.4) * sz],
        [x1 + Math.cos(ang - 2.4) * sz, y1 + Math.sin(ang - 2.4) * sz],
      ];
      g.append(svgEl("polygon", { points: pts.map((q) => q.map((n) => n.toFixed(1)).join(",")).join(" "), class: "so-arrow" }));
      const [nx, ny] = entry.numbers[i];
      g.append(Object.assign(svgEl("text", { x: nx, y: ny, class: "so-num" }), { textContent: String(i + 1) }));
      marks.append(g);
    });
  };

  const setShown = (n: number, current: number | null = null) => {
    shown = Math.max(0, Math.min(total, n));
    inks.forEach((p, i) => {
      p.style.transition = "none";
      p.style.strokeDasharray = "";
      p.style.strokeDashoffset = "";
      p.classList.toggle("hidden", i >= shown);
      p.classList.toggle("current", i === current);
    });
    label.textContent = `${shown} / ${total}`;
    drawMarks(current);
    prevBtn.disabled = shown <= 0;
    nextBtn.disabled = shown >= total;
  };

  const stop = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  /** 한 획씩 그려지는 애니메이션 */
  const play = () => {
    stop();
    if (reducedMotion()) return setShown(total);
    setShown(0);
    let t = 150;
    inks.forEach((p, i) => {
      const len = p.getTotalLength();
      const dur = Math.max(350, Math.min(900, len * 9));
      timers.push(
        window.setTimeout(() => {
          p.classList.remove("hidden");
          p.classList.add("current");
          p.style.transition = "none";
          p.style.strokeDasharray = `${len} ${len}`;
          p.style.strokeDashoffset = `${len}`;
          void p.getBoundingClientRect();
          p.style.transition = `stroke-dashoffset ${dur}ms ease-in-out`;
          p.style.strokeDashoffset = "0";
          shown = i + 1;
          label.textContent = `${shown} / ${total}`;
          drawMarks(i);
        }, t),
      );
      t += dur + 250;
      timers.push(window.setTimeout(() => p.classList.remove("current"), t - 100));
    });
    timers.push(window.setTimeout(() => setShown(total), t));
  };

  const playBtn = h("button", { type: "button", class: "btn small" }, `▶ ${s.strokeReplay}`);
  const prevBtn = h("button", { type: "button", class: "btn small", "aria-label": s.strokePrev }, "◀");
  const nextBtn = h("button", { type: "button", class: "btn small", "aria-label": s.strokeNext }, "▶|");
  playBtn.addEventListener("click", play);
  prevBtn.addEventListener("click", () => {
    stop();
    setShown(shown - 1, shown - 2 >= 0 ? shown - 2 : null);
  });
  nextBtn.addEventListener("click", () => {
    stop();
    const n = shown >= total ? 1 : shown + 1;
    setShown(n, n - 1);
  });

  const box = h(
    "figure",
    { class: "stroke-order", "data-char": char },
    h("figcaption", {}, h("span", { class: "so-title" }, s.strokeOrder), " ", label),
    svg,
    h("div", { class: "so-controls" }, prevBtn, playBtn, nextBtn),
    h("p", { class: "so-credit" }, `${s.strokeCredit} `, h("a", { href: data.url, target: "_blank", rel: "noopener" }, "KanjiVG"), ` (${data.license})`),
  );
  // DOM에 붙은 뒤에 길이 계산이 가능하다
  requestAnimationFrame(() => {
    if (!box.isConnected) return;
    setShown(total);
    play();
  });
  (box as HTMLElement & { stopAnimation?: () => void }).stopAnimation = stop;
  return box;
}
