import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("navigator", { language: "en-US", languages: ["en-US"] });
const { defaultSettings, detectNativeLanguage, sanitizeSettings } = await import("../../src/storage/repositories/settings");

describe("settings", () => {
  it("브라우저 언어로 모국어를 추정한다", () => {
    expect(detectNativeLanguage(["ja-JP", "en"])).toBe("ja");
    expect(detectNativeLanguage(["fr-FR", "vi-VN"])).toBe("vi");
    expect(detectNativeLanguage(["de"])).toBe("en");
  });
  it("기본 학습 언어는 모국어와 다르다", () => {
    expect(defaultSettings("ko").learningLanguage).not.toBe("ko");
    expect(defaultSettings("en").learningLanguage).not.toBe("en");
  });
  it("저장된 값을 정리한다", () => {
    const base = defaultSettings("ko");
    const s = sanitizeSettings({ nativeLanguage: "vi", learningLanguage: "xx", fontSize: 9999, inkColor: "red", onboarded: true }, base);
    expect(s.nativeLanguage).toBe("vi");
    expect(s.learningLanguage).toBe(base.learningLanguage);
    expect(s.fontSize).toBe(140);
    expect(s.inkColor).toBe(base.inkColor);
    expect(s.onboarded).toBe(true);
    expect(sanitizeSettings(null, base)).toBe(base);
  });
});
