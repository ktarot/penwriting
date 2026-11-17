import type { Stroke, StrokePoint } from "../../types";

let idCounter = 0;
export function createStrokeId(): string {
  idCounter += 1;
  return `s${Date.now().toString(36)}${idCounter.toString(36)}`;
}

/** 화면 좌표를 줄 영역 기준 0..1 정규화 좌표로 변환한다. */
export function normalizePoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  const x = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
  const y = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
  return { x: clamp01(x), y: clamp01(y) };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

const round = (v: number, digits = 5) => Math.round(v * 10 ** digits) / 10 ** digits;

export interface StrokeStyle {
  color: string;
  /** 줄 높이 대비 비율 */
  width: number;
}

type Listener = () => void;

/**
 * 한 학습 단계(trace/hint/free)의 모든 줄 스트로크를 보관한다.
 * 되돌리기는 스트로크 단위이며 줄과 관계없이 마지막 획부터 지운다.
 */
export class StrokeStore {
  private strokes: Stroke[] = [];
  private active: Stroke | null = null;
  private startTime = 0;
  private listeners = new Set<Listener>();

  constructor(initial: Stroke[] = []) {
    this.strokes = initial.map(cloneStroke);
  }

  get all(): readonly Stroke[] {
    return this.strokes;
  }

  get current(): Stroke | null {
    return this.active;
  }

  get count(): number {
    return this.strokes.length;
  }

  forLine(line: number): Stroke[] {
    return this.strokes.filter((s) => s.line === line);
  }

  begin(line: number, point: Omit<StrokePoint, "t">, style: StrokeStyle, time: number): Stroke {
    this.startTime = time;
    this.active = {
      id: createStrokeId(),
      line,
      points: [{ ...roundPoint(point), t: 0 }],
      color: style.color,
      width: style.width,
    };
    return this.active;
  }

  /** 포인트를 추가한다. 직전 점과 거의 같은 위치면 무시하고 false를 돌려준다. */
  addPoint(point: Omit<StrokePoint, "t">, time: number, minDistance = 0.002): boolean {
    const s = this.active;
    if (!s) return false;
    const last = s.points[s.points.length - 1];
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    if (dx * dx + dy * dy < minDistance * minDistance) return false;
    s.points.push({ ...roundPoint(point), t: Math.max(0, Math.round(time - this.startTime)) });
    return true;
  }

  end(): Stroke | null {
    const s = this.active;
    this.active = null;
    if (!s) return null;
    this.strokes.push(s);
    this.emit();
    return s;
  }

  cancel(): void {
    this.active = null;
  }

  undo(): Stroke | null {
    const removed = this.strokes.pop() ?? null;
    if (removed) this.emit();
    return removed;
  }

  clear(): void {
    if (this.strokes.length === 0) return;
    this.strokes = [];
    this.emit();
  }

  toJSON(): Stroke[] {
    return this.strokes.map(cloneStroke);
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}

function roundPoint(p: Omit<StrokePoint, "t">): Omit<StrokePoint, "t"> {
  const out: Omit<StrokePoint, "t"> = { x: round(p.x), y: round(p.y) };
  if (p.pressure !== undefined) out.pressure = round(p.pressure, 3);
  return out;
}

export function cloneStroke(s: Stroke): Stroke {
  return { ...s, points: s.points.map((p) => ({ ...p })) };
}
