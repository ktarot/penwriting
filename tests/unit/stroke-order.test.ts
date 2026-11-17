import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateStrokeData, type StrokeOrderData } from "../../src/engines/language/stroke-order";
import type { LanguagePack } from "../../src/types";

const data = JSON.parse(readFileSync("public/strokes/ja.json", "utf8")) as StrokeOrderData;
const pack = JSON.parse(readFileSync("public/languages/ja/pack.json", "utf8")) as LanguagePack;

describe("일본어 획순 데이터 (KanjiVG)", () => {
  it("구조 검사 통과, 출처·라이선스 포함", () => {
    expect(validateStrokeData(data)).toEqual([]);
    expect(data.source).toBe("KanjiVG");
    expect(data.license).toBe("CC BY-SA 3.0");
    expect(data.url).toBe("https://kanjivg.tagaini.net");
  });
  it("일본어 언어팩의 모든 기초 문자에 획순이 있다", () => {
    const chars = pack.categories.filter((c) => c.level === "character").flatMap((c) => c.items.map((i) => i.text));
    expect(chars.length).toBe(102);
    for (const ch of chars) expect(data.chars[ch], ch).toBeDefined();
  });
  it("알려진 획수와 일치한다", () => {
    const n = (ch: string) => data.chars[ch].strokes.length;
    expect([n("あ"), n("い"), n("う"), n("ん"), n("を")]).toEqual([3, 2, 2, 1, 3]);
    expect([n("ア"), n("カ"), n("ン")]).toEqual([2, 2, 2]);
    expect([n("一"), n("二"), n("三"), n("人"), n("日"), n("月"), n("山"), n("川"), n("水"), n("火")]).toEqual([1, 2, 3, 2, 4, 4, 3, 3, 4, 4]);
  });
  it("잘못된 경로 데이터를 거부한다", () => {
    const bad = JSON.parse(JSON.stringify(data)) as StrokeOrderData;
    bad.chars["あ"].strokes[0] = "M0,0<script>";
    expect(validateStrokeData(bad).some((e) => e.includes("bad path"))).toBe(true);
  });
});
