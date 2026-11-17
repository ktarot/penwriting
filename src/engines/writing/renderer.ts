import type { Stroke } from "../../types";

/** 펜 압력을 선 굵기 배율로 변환 (압력 정보가 없으면 1) */
function pressureFactor(p?: number): number {
  if (p === undefined) return 1;
  return 0.45 + Math.min(Math.max(p, 0), 1) * 1.1;
}

/**
 * 정규화 좌표 스트로크를 캔버스에 그린다.
 * w, h는 CSS px 기준 줄 크기 (ctx는 devicePixelRatio 변환이 적용된 상태)
 */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, w: number, h: number): void {
  const pts = stroke.points;
  if (pts.length === 0) return;
  const base = stroke.width * h;
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (pts.length === 1) {
    const p = pts[0];
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, (base * pressureFactor(p.pressure)) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const hasPressure = pts.some((p) => p.pressure !== undefined);
  if (!hasPressure) {
    // 균일한 굵기: 중점을 잇는 2차 곡선으로 부드럽게
    ctx.lineWidth = base;
    ctx.beginPath();
    ctx.moveTo(pts[0].x * w, pts[0].y * h);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = ((pts[i].x + pts[i + 1].x) / 2) * w;
      const my = ((pts[i].y + pts[i + 1].y) / 2) * h;
      ctx.quadraticCurveTo(pts[i].x * w, pts[i].y * h, mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x * w, last.y * h);
    ctx.stroke();
    return;
  }

  // 압력 반영: 구간마다 굵기를 바꿔 그린다
  let prevX = pts[0].x * w;
  let prevY = pts[0].y * h;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const isLast = i === pts.length - 1;
    const endX = isLast ? p1.x * w : ((p0.x + p1.x) / 2) * w;
    const endY = isLast ? p1.y * h : ((p0.y + p1.y) / 2) * h;
    ctx.lineWidth = base * pressureFactor(((p0.pressure ?? 0.5) + (p1.pressure ?? 0.5)) / 2);
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    if (i === 1) ctx.lineTo(endX, endY);
    else ctx.quadraticCurveTo(p0.x * w, p0.y * h, endX, endY);
    ctx.stroke();
    prevX = endX;
    prevY = endY;
  }
}

export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[], w: number, h: number): void {
  for (const s of strokes) drawStroke(ctx, s, w, h);
}

/** 캔버스 백버퍼를 CSS 크기 × devicePixelRatio로 맞추고 변환을 설정한다. */
export function fitCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number): CanvasRenderingContext2D | null {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const pw = Math.max(1, Math.round(cssW * dpr));
  const ph = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== pw) canvas.width = pw;
  if (canvas.height !== ph) canvas.height = ph;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(pw / cssW, 0, 0, ph / cssH, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  return ctx;
}
