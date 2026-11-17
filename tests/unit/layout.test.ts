import { describe, expect, it } from "vitest";
import { breakLines, LINE_HEIGHT_EM, lineFromText, lineWidthEm, PADDING_X_EM } from "../../src/engines/writing/layout";

// 고정폭 측정: 한 글자 = 1em
const mono = (t: string) => Array.from(t).length;

describe("breakLines", () => {
  it("짧은 텍스트는 한 줄", () => {
    expect(breakLines("한글", mono, 10)).toEqual(["한글"]);
  });

  it("단어 경계에서 줄을 나눈다", () => {
    expect(breakLines("오늘도 좋은 하루", mono, 6)).toEqual(["오늘도 좋은", "하루"]);
  });

  it("명시적 줄바꿈과 빈 줄을 처리한다", () => {
    expect(breakLines("가나\n\n다라  마", mono, 10)).toEqual(["가나", "다라 마"]);
  });

  it("너무 긴 단어는 글자 단위로 자른다", () => {
    expect(breakLines("가나다라마바사", mono, 3)).toEqual(["가나다", "라마바", "사"]);
  });

  it("서로게이트 쌍 문자를 깨뜨리지 않는다", () => {
    const lines = breakLines("𠀀𠀁𠀂", mono, 2);
    expect(lines).toEqual(["𠀀𠀁", "𠀂"]);
  });
});

describe("lineFromText", () => {
  it("종횡비 = (글자 너비 + 좌우 여백) / 줄 높이", () => {
    const line = lineFromText("가나다", mono);
    expect(lineWidthEm(line)).toBeCloseTo(3 + PADDING_X_EM * 2, 3);
    expect(line.aspect).toBeCloseTo((3 + PADDING_X_EM * 2) / LINE_HEIGHT_EM, 3);
  });
});
