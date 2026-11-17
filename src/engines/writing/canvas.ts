import type { LineLayout, Stroke } from "../../types";
import { createGuideSvg, type GuideOptions } from "./guide";
import { lineWidthEm } from "./layout";
import { attachPointerInput } from "./pointer";
import { drawStroke, drawStrokes, fitCanvas } from "./renderer";
import { normalizePoint, type StrokeStore, type StrokeStyle } from "./strokes";

export interface WritingLineOptions {
  line: LineLayout;
  lineIndex: number;
  store: StrokeStore;
  guide: GuideOptions;
  /** 한 em의 최대 표시 크기(px). 컨테이너가 좁으면 자동으로 줄어든다. */
  maxEmPx: number;
  /** 접근성 이름 (인터페이스 언어) */
  label?: string;
  getStyle(): StrokeStyle;
}

/**
 * 한 줄 필기 영역: [SVG 가이드] + [확정 스트로크 캔버스] + [작성 중 스트로크 캔버스]
 * 언어와 무관하며 LineLayout(텍스트, 종횡비)만 알면 동작한다.
 */
export class WritingLine {
  readonly el: HTMLDivElement;
  private guideEl: SVGSVGElement;
  private committed: HTMLCanvasElement;
  private live: HTMLCanvasElement;
  private size = { w: 0, h: 0 };
  private rect: DOMRect | null = null;
  private pendingFrame = 0;
  private disposers: Array<() => void> = [];

  constructor(private opts: WritingLineOptions) {
    this.el = document.createElement("div");
    this.el.className = "writing-line";
    this.el.dataset.line = String(opts.lineIndex);
    this.el.style.aspectRatio = String(opts.line.aspect);
    this.applyMaxSize();

    this.guideEl = createGuideSvg(opts.line, opts.guide);
    this.committed = document.createElement("canvas");
    this.committed.className = "ink";
    this.live = document.createElement("canvas");
    this.live.className = "ink ink-live";
    this.live.setAttribute("aria-label", `${opts.label ?? `#${opts.lineIndex + 1}`}: ${opts.line.text}`);
    this.live.setAttribute("role", "img");
    this.el.append(this.guideEl, this.committed, this.live);

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.el);
    this.disposers.push(() => ro.disconnect());
    this.disposers.push(this.opts.store.onChange(() => this.redraw()));
    this.disposers.push(
      attachPointerInput(this.live, {
        start: (s, rect) => {
          this.rect = rect;
          const p = normalizePoint(s.clientX, s.clientY, rect);
          this.opts.store.begin(this.opts.lineIndex, { ...p, pressure: s.pressure }, this.opts.getStyle(), s.time);
          this.scheduleLive();
        },
        move: (samples) => {
          if (!this.rect) return;
          for (const s of samples) {
            const p = normalizePoint(s.clientX, s.clientY, this.rect);
            this.opts.store.addPoint({ ...p, pressure: s.pressure }, s.time);
          }
          this.scheduleLive();
        },
        end: () => {
          this.rect = null;
          // 확정 → store change 이벤트로 committed 다시 그림
          this.opts.store.end();
          this.clearLive();
        },
      }),
    );
  }

  setGuide(guide: GuideOptions): void {
    this.opts.guide = guide;
    const next = createGuideSvg(this.opts.line, guide);
    this.guideEl.replaceWith(next);
    this.guideEl = next;
  }

  setMaxEmPx(px: number): void {
    this.opts.maxEmPx = px;
    this.applyMaxSize();
  }

  destroy(): void {
    cancelAnimationFrame(this.pendingFrame);
    for (const d of this.disposers) d();
    this.disposers = [];
    this.el.remove();
  }

  private applyMaxSize(): void {
    this.el.style.maxWidth = `${lineWidthEm(this.opts.line) * this.opts.maxEmPx}px`;
    this.el.style.setProperty("--em-px", `${this.opts.maxEmPx}px`);
  }

  private resize(): void {
    const r = this.el.getBoundingClientRect();
    const w = r.width;
    const h = r.width / this.opts.line.aspect || r.height;
    if (w <= 0 || h <= 0) return;
    if (Math.abs(w - this.size.w) < 0.5 && Math.abs(h - this.size.h) < 0.5) return;
    this.size = { w, h };
    this.redraw();
    this.clearLive();
  }

  private redraw(): void {
    const { w, h } = this.size;
    if (!w) return;
    const ctx = fitCanvas(this.committed, w, h);
    if (ctx) drawStrokes(ctx, this.opts.store.forLine(this.opts.lineIndex), w, h);
  }

  private clearLive(): void {
    const { w, h } = this.size;
    if (w) fitCanvas(this.live, w, h);
  }

  private scheduleLive(): void {
    if (this.pendingFrame) return;
    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = 0;
      const { w, h } = this.size;
      const cur = this.opts.store.current;
      if (!w || !cur) return;
      const ctx = fitCanvas(this.live, w, h);
      if (ctx) drawStroke(ctx, cur, w, h);
    });
  }
}

/** 비교 화면 등에서 쓰는 읽기 전용 렌더링 */
export function renderStaticLine(
  line: LineLayout,
  strokes: readonly Stroke[],
  guide: GuideOptions,
  maxEmPx: number,
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "writing-line static";
  el.style.aspectRatio = String(line.aspect);
  el.style.maxWidth = `${lineWidthEm(line) * maxEmPx}px`;
  const canvas = document.createElement("canvas");
  canvas.className = "ink";
  el.append(createGuideSvg(line, guide), canvas);
  const ro = new ResizeObserver(() => {
    const w = el.getBoundingClientRect().width;
    if (!w) return;
    const ctx = fitCanvas(canvas, w, w / line.aspect);
    if (ctx) drawStrokes(ctx, strokes, w, w / line.aspect);
  });
  ro.observe(el);
  return el;
}

