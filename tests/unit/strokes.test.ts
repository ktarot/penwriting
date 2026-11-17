import { describe, expect, it } from "vitest";
import { normalizePoint, StrokeStore } from "../../src/engines/writing/strokes";

const style = { color: "#000", width: 0.04 };

describe("normalizePoint", () => {
  it("화면 좌표를 0..1로 정규화하고 범위를 벗어나면 잘라낸다", () => {
    const rect = { left: 100, top: 50, width: 200, height: 100 };
    expect(normalizePoint(200, 100, rect)).toEqual({ x: 0.5, y: 0.5 });
    expect(normalizePoint(0, 500, rect)).toEqual({ x: 0, y: 1 });
  });

  it("다른 크기의 화면에서도 같은 정규화 좌표는 같은 상대 위치를 가리킨다", () => {
    const small = normalizePoint(30, 10, { left: 0, top: 0, width: 120, height: 40 });
    const large = normalizePoint(90, 30, { left: 0, top: 0, width: 360, height: 120 });
    expect(small).toEqual(large);
  });
});

describe("StrokeStore", () => {
  it("스트로크를 만들고 시간·압력을 기록한다", () => {
    const s = new StrokeStore();
    s.begin(0, { x: 0.1, y: 0.1, pressure: 0.5 }, style, 1000);
    s.addPoint({ x: 0.2, y: 0.2, pressure: 0.7 }, 1016);
    const stroke = s.end()!;
    expect(stroke.points).toEqual([
      { x: 0.1, y: 0.1, pressure: 0.5, t: 0 },
      { x: 0.2, y: 0.2, pressure: 0.7, t: 16 },
    ]);
    expect(stroke.line).toBe(0);
    expect(stroke.width).toBe(0.04);
    expect(s.count).toBe(1);
  });

  it("너무 가까운 점은 무시한다", () => {
    const s = new StrokeStore();
    s.begin(0, { x: 0.5, y: 0.5 }, style, 0);
    expect(s.addPoint({ x: 0.5001, y: 0.5 }, 5)).toBe(false);
    expect(s.addPoint({ x: 0.51, y: 0.5 }, 10)).toBe(true);
  });

  it("되돌리기는 마지막 스트로크 하나만 지운다", () => {
    const s = new StrokeStore();
    for (let i = 0; i < 3; i++) {
      s.begin(i % 2, { x: 0.1 * i, y: 0.1 }, style, 0);
      s.end();
    }
    const last = s.all[2].id;
    expect(s.undo()!.id).toBe(last);
    expect(s.count).toBe(2);
    expect(s.forLine(0)).toHaveLength(1);
    expect(s.forLine(1)).toHaveLength(1);
  });

  it("전체 지우기와 변경 알림", () => {
    const s = new StrokeStore();
    let changes = 0;
    s.onChange(() => changes++);
    s.begin(0, { x: 0, y: 0 }, style, 0);
    s.end();
    s.clear();
    s.clear(); // 비어 있으면 알림 없음
    expect(s.count).toBe(0);
    expect(changes).toBe(2);
  });

  it("toJSON은 내부 상태와 분리된 복사본을 돌려준다", () => {
    const s = new StrokeStore();
    s.begin(0, { x: 0.3, y: 0.3 }, style, 0);
    s.end();
    const snap = s.toJSON();
    snap[0].points[0].x = 0.9;
    expect(s.all[0].points[0].x).toBe(0.3);
    const restored = new StrokeStore(snap);
    expect(restored.all[0].points[0].x).toBe(0.9);
  });
});
