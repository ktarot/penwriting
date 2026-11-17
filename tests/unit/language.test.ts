import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findItem, languageOfItemId, nextItem } from "../../src/engines/language/lessons";
import { validatePack } from "../../src/engines/language/loader";
import { hasReadingInfo, itemInfo, visibilityFor } from "../../src/engines/language/pronunciation";
import { LANGUAGES, type LanguagePack } from "../../src/types";

const packs = Object.fromEntries(
  LANGUAGES.map((l) => [l, JSON.parse(readFileSync(`public/languages/${l}/pack.json`, "utf8")) as LanguagePack]),
) as Record<(typeof LANGUAGES)[number], LanguagePack>;

describe("언어팩 데이터", () => {
  for (const lang of LANGUAGES) {
    describe(lang, () => {
      const pack = packs[lang];
      it("구조 검사 통과", () => expect(validatePack(pack, lang)).toEqual([]));
      it("기초 문자부터 단락까지 모든 학습 단계를 갖춘다", () => {
        const levels = new Set(pack.categories.map((c) => c.level));
        expect([...levels].sort()).toEqual(["character", "long-sentence", "paragraph", "short-sentence", "word"]);
      });
      it("검수 상태와 모든 모국어용 안내문을 가진다", () => {
        expect(pack.review.status).toBeDefined();
        for (const n of LANGUAGES) expect(pack.review.note?.[n]).toBeTruthy();
      });
      it("자모 단계부터 다른 세 모국어의 발음 안내가 있다", () => {
        const chars = pack.categories.filter((c) => c.level === "character").flatMap((c) => c.items);
        for (const it of chars) {
          for (const n of LANGUAGES.filter((x) => x !== lang)) {
            const g = it.nativeGuides[n];
            expect(g?.pronunciation ?? g?.nameReading, `${it.id} → ${n}`).toBeTruthy();
          }
        }
      });
      it("단어·문장·단락에는 다른 세 모국어의 뜻이 있다", () => {
        const rest = pack.categories.filter((c) => c.level !== "character").flatMap((c) => c.items);
        for (const it of rest) for (const n of LANGUAGES.filter((x) => x !== lang)) expect(it.nativeGuides[n]?.meaning, `${it.id} → ${n}`).toBeTruthy();
      });
      it("분류 제목이 네 언어로 있다", () => {
        for (const c of pack.categories) for (const n of LANGUAGES) expect(c.title[n], `${c.id}.${n}`).toBeTruthy();
      });
    });
  }

  it("문자 이름이 있는 항목은 이름과 실제 소리를 따로 가진다", () => {
    const g = findItem(packs.ko, "ko-cons-01")!;
    expect(g.text).toBe("ㄱ");
    expect(g.characterName).toBe("기역");
    expect(g.standardReading).toContain("[k]");
    expect(g.nativeGuides.en?.nameReading).toBe("giyeok");
    expect(g.speech?.text).toBe("기역");
  });

  it("베트남어 단어는 음절별 성조 설명을 가진다", () => {
    const w = packs.vi.categories.find((c) => c.id === "words")!.items[0];
    expect(w.text).toBe("xin chào");
    expect(w.nativeGuides.ko?.explanation).toContain("huyền");
  });

  it("validatePack은 잘못된 데이터를 잡아낸다", () => {
    const bad = JSON.parse(JSON.stringify(packs.ja)) as LanguagePack;
    bad.categories[0].items[1].id = bad.categories[0].items[0].id;
    (bad.categories[0].items[2].nativeGuides as Record<string, unknown>).ja = { pronunciation: "x" };
    const errs = validatePack(bad, "ja");
    expect(errs.some((e) => e.includes("duplicate"))).toBe(true);
    expect(errs.some((e) => e.includes("own language"))).toBe(true);
    expect(validatePack(packs.ja, "ko")).not.toEqual([]);
  });
});

describe("lessons", () => {
  it("항목 ID에서 언어를 알아낸다", () => {
    expect(languageOfItemId("ja-hira-a")).toBe("ja");
    expect(languageOfItemId("custom")).toBeNull();
  });
  it("다음 항목은 분류를 넘어 이어진다", () => {
    const lastCons = packs.ko.categories[0].items.at(-1)!;
    expect(nextItem(packs.ko, lastCons.id)?.id).toBe(packs.ko.categories[1].items[0].id);
    const last = packs.ko.categories.at(-1)!.items.at(-1)!;
    expect(nextItem(packs.ko, last.id)).toBeUndefined();
  });
});

describe("pronunciation", () => {
  const prefs = { showNativeReading: true, showMeaning: true };
  it("단계별 기본 표시: 1단계 발음+뜻, 2단계 발음, 3단계 없음", () => {
    expect(visibilityFor("trace", prefs)).toEqual({ reading: true, meaning: true });
    expect(visibilityFor("hint", prefs)).toEqual({ reading: true, meaning: false });
    expect(visibilityFor("free", prefs)).toEqual({ reading: false, meaning: false });
  });
  it("사용자 설정으로 숨길 수 있고, 단계별로 직접 바꿀 수 있다", () => {
    expect(visibilityFor("trace", { showNativeReading: false, showMeaning: true })).toEqual({ reading: false, meaning: true });
    expect(visibilityFor("free", prefs, { meaning: true })).toEqual({ reading: false, meaning: true });
  });
  it("모국어 안내를 고르고 검수 상태를 이어받는다", () => {
    const item = findItem(packs.ja, "ja-hira-tsu")!;
    const ko = itemInfo(item, "ko", packs.ja);
    expect(ko.nativePronunciation).toBe("츠");
    expect(ko.review).toBe("draft");
    expect(ko.sameLanguage).toBe(false);
    const ja = itemInfo(item, "ja", packs.ja);
    expect(ja.sameLanguage).toBe(true);
    expect(ja.nativePronunciation).toBeUndefined();
    expect(hasReadingInfo(ja)).toBe(true); // 표준 읽기(로마자)는 남는다
  });
});
