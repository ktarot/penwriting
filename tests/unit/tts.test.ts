import { describe, expect, it } from "vitest";
import { pickVoice } from "../../src/engines/speech/tts";

const v = (lang: string, name: string, extra: object = {}) => ({ lang, name, ...extra });

describe("pickVoice", () => {
  const voices = [v("en-US", "US"), v("en-GB", "UK", { localService: true }), v("ja-JP", "JP"), v("ko_KR", "KR"), v("vi-VN", "VN", { default: true })];
  it("정확한 지역 음성을 먼저 고른다", () => {
    expect(pickVoice(voices, "en-GB")?.name).toBe("UK");
    expect(pickVoice(voices, "en-US")?.name).toBe("US");
  });
  it("지역이 없으면 같은 언어 음성을 고르고, 기기 내장 음성을 우선한다", () => {
    expect(pickVoice(voices, "en-AU")?.name).toBe("UK");
  });
  it("밑줄 표기(ko_KR)도 인식한다", () => {
    expect(pickVoice(voices, "ko-KR")?.name).toBe("KR");
  });
  it("맞는 음성이 없으면 undefined", () => {
    expect(pickVoice(voices, "fr-FR")).toBeUndefined();
    expect(pickVoice([], "ja-JP")).toBeUndefined();
  });
});
