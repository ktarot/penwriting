import { isLanguageCode, LANGUAGES, type LanguageCode, type UserSettings } from "../../types";
import { dbGet, dbPut } from "../database";

const KEY = "user";

export function detectNativeLanguage(langs: readonly string[] = navigator.languages ?? [navigator.language]): LanguageCode {
  for (const l of langs) {
    const code = l.toLowerCase().split("-")[0];
    if (isLanguageCode(code)) return code;
  }
  return "en";
}

export function defaultSettings(native: LanguageCode = "ko"): UserSettings {
  return {
    nativeLanguage: native,
    learningLanguage: LANGUAGES.find((l) => l !== native) ?? "en",
    fontStyle: "standard",
    fontSize: 72,
    guideOpacity: { trace: 0.28, hint: 0.6 },
    highContrast: false,
    showNativeReading: true,
    showMeaning: true,
    speechRate: 1,
    inkColor: "#1d2b53",
    inkWidth: 0.035,
    onboarded: false,
  };
}

/** 저장된 값을 현재 스키마에 맞게 정리한다 (알 수 없는 값은 기본값으로) */
export function sanitizeSettings(raw: unknown, base: UserSettings): UserSettings {
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<UserSettings>;
  const num = (v: unknown, min: number, max: number, d: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
  const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  return {
    nativeLanguage: isLanguageCode(r.nativeLanguage) ? r.nativeLanguage : base.nativeLanguage,
    learningLanguage: isLanguageCode(r.learningLanguage) ? r.learningLanguage : base.learningLanguage,
    fontStyle: r.fontStyle === "handwriting" ? "handwriting" : "standard",
    fontSize: num(r.fontSize, 40, 140, base.fontSize),
    guideOpacity: {
      trace: num(r.guideOpacity?.trace, 0.05, 0.9, base.guideOpacity.trace),
      hint: num(r.guideOpacity?.hint, 0.05, 0.9, base.guideOpacity.hint),
    },
    highContrast: bool(r.highContrast, base.highContrast),
    showNativeReading: bool(r.showNativeReading, base.showNativeReading),
    showMeaning: bool(r.showMeaning, base.showMeaning),
    speechRate: num(r.speechRate, 0.5, 2, base.speechRate),
    inkColor: typeof r.inkColor === "string" && /^#[0-9a-f]{6}$/i.test(r.inkColor) ? r.inkColor : base.inkColor,
    inkWidth: num(r.inkWidth, 0.01, 0.1, base.inkWidth),
    onboarded: bool(r.onboarded, false),
  };
}

export async function loadSettings(): Promise<UserSettings | null> {
  try {
    const raw = await dbGet<unknown>("settings", KEY);
    return raw ? sanitizeSettings(raw, defaultSettings()) : null;
  } catch {
    return null;
  }
}

/** 저장 실패(사생활 보호 모드 등)는 앱 동작을 막지 않는다 */
export async function saveSettings(s: UserSettings): Promise<boolean> {
  try {
    await dbPut("settings", JSON.parse(JSON.stringify(s)), KEY);
    return true;
  } catch {
    return false;
  }
}
