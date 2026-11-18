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
      it("글자·단어·짧은 문장·긴 문장을 모두 갖춘다", () => {
        const levels = new Set(pack.categories.map((c) => c.level));
        expect([...levels].sort()).toEqual(["character", "long-sentence", "short-sentence", "word"]);
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

  it("생활 단어 8주제: 주제마다 필요한 단어를 모두 (최소 18개), 질문과 답 12쌍, 안내문 4·에세이 4 이상", () => {
    const THEMES = ["numbers", "units", "directions", "address", "time", "people", "food", "places"];
    for (const lang of LANGUAGES) {
      const cat = (id: string) => packs[lang].categories.find((c) => c.id === id)!;
      for (const id of THEMES) expect(cat(id).items.length, `${lang}.${id}`).toBeGreaterThanOrEqual(18);
      expect(cat("qa").items).toHaveLength(24);
      expect(cat("notices").items).toHaveLength(4);
      expect(cat("essays").items.length).toBeGreaterThanOrEqual(4);
    }
    // 네 언어에 공통인 개념은 모두 같은 id 꼬리를 가진다 (예: *-w-days-monday)
    const tails = (lang: (typeof LANGUAGES)[number], id: string) => new Set(packs[lang].categories.find((c) => c.id === id)!.items.map((i) => i.id.slice(3)));
    for (const id of THEMES) {
      const common = [...tails("ko", id)].filter((t) => LANGUAGES.every((l) => tails(l, id).has(t)));
      expect(common.length, id).toBeGreaterThanOrEqual(18);
    }
  });

  it("요일 7개와 달 12개를 모두 갖춘다", () => {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    for (const lang of LANGUAGES) for (const d of [...days, ...months]) expect(findItem(packs[lang], `${lang}-w-time-${d}`), `${lang} ${d}`).toBeDefined();
    expect(findItem(packs.ja, "ja-w-time-june")!.text).toBe("六月");
    expect(findItem(packs.ko, "ko-w-time-june")!.standardReading).toBe("yuwol");
  });

  it("한 언어에만 있는 단어(고유어 수, 나라별 주소 단위 등)는 뜻을 직접 갖는다", () => {
    const hana = findItem(packs.ko, "ko-w-numbers-hana")!;
    expect(hana.text).toBe("하나");
    expect(hana.nativeGuides.en?.meaning).toContain("native Korean");
    expect(findItem(packs.en, "en-w-numbers-hana")).toBeUndefined();
    expect(findItem(packs.ja, "ja-w-address-chome")!.nativeGuides.ko?.meaning).toContain("초메");
    expect(findItem(packs.vi, "vi-w-address-hem")!.nativeGuides.en?.meaning).toBe("alley (South)");
  });

  it("일본어 발음 안내는 가나 읽기에서 규칙으로 만든다 (헵번식 로마자 포함)", () => {
    const g = findItem(packs.ja, "ja-w-places-school")!;
    expect(g.text).toBe("学校");
    expect(g.standardReading).toBe("がっこう · gakkō");
    expect(g.nativeGuides.ko?.pronunciation).toBe("각코오");
    expect(g.nativeGuides.en?.pronunciation).toBe("gakkō");
    expect(findItem(packs.ja, "ja-w-places-ticket")!.nativeGuides.ko?.pronunciation).toBe("킵푸");
  });

  it("짧은 문장 30자 이내, 긴 문장 100자 이내", () => {
    for (const lang of LANGUAGES) {
      for (const c of packs[lang].categories) {
        if (c.id === "qa") for (const it of c.items) expect(it.text.length, it.id).toBeLessThanOrEqual(30);
        if (c.level === "long-sentence") for (const it of c.items) expect(it.text.length, it.id).toBeLessThanOrEqual(100);
      }
    }
  });

  it("같은 개념의 단어는 서로의 뜻이 된다 (4개 언어 대응표)", () => {
    const w = (lang: (typeof LANGUAGES)[number], id: string) => findItem(packs[lang], `${lang}-${id}`)!;
    expect(w("ko", "w-directions-left").text).toBe("왼쪽");
    expect(w("ko", "w-directions-left").nativeGuides.en?.meaning).toBe("left");
    expect(w("en", "w-directions-left").nativeGuides.ja?.meaning).toBe("左");
    expect(w("ja", "w-directions-left").nativeGuides.vi?.meaning).toBe("trái");
    expect(w("vi", "w-directions-left").nativeGuides.ko?.meaning).toBe("왼쪽");
    expect(findItem(packs.ja, "ja-qa-04-q")!.nativeGuides.ko?.meaning).toBe("화장실이 어디예요?");
  });

  it("베트남어 단어의 성조 설명은 성조 부호에서 정해진다", () => {
    const it = findItem(packs.vi, "vi-w-places-subway")!;
    expect(it.text).toBe("tàu điện ngầm");
    expect(it.nativeGuides.en?.explanation).toBe("tàu: low, falling (huyền), điện: low, short, with a catch in the throat (nặng), ngầm: low, falling (huyền)");
  });

  it("문장에는 모국어 근사 발음을 붙이지 않는다 (뜻만)", () => {
    for (const lang of LANGUAGES) {
      for (const c of packs[lang].categories.filter((c) => c.id === "qa" || c.id === "notices")) {
        for (const it of c.items) for (const g of Object.values(it.nativeGuides)) expect(g?.pronunciation, it.id).toBeUndefined();
      }
    }
  });

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
