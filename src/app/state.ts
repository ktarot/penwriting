import { STRINGS, type Strings } from "../i18n/strings";
import { applyAppearance } from "./appearance";
import { defaultSettings, saveSettings } from "../storage/repositories/settings";
import type { FontStyle, LanguagePack, LearningItem, LineLayout, PracticeLayout, PracticeStep, Stroke, UserSettings } from "../types";

/** 현재 설정 (앱 시작 시 IndexedDB에서 불러온다) */
export let settings: UserSettings = defaultSettings();

export function setSettings(next: UserSettings): void {
  settings = next;
  applyAppearance(next);
}

/** 설정 일부를 바꾸고 저장한다 */
export function updateSettings(patch: Partial<UserSettings>): Promise<boolean> {
  setSettings({ ...settings, ...patch });
  return saveSettings(settings);
}

/** 현재 인터페이스 문자열 (모국어 기준) */
export function t(): Strings {
  return STRINGS[settings.nativeLanguage];
}

export interface PracticeSession {
  item: LearningItem;
  pack: LanguagePack | null;
  fontStyle: FontStyle;
  lines: LineLayout[];
  maxEmPx: number;
  layout: PracticeLayout;
  attempts: Record<PracticeStep, Stroke[]>;
  completed: Partial<Record<PracticeStep, string>>;
  startedAt: string;
}

let session: PracticeSession | null = null;

export function getSession(): PracticeSession | null {
  return session;
}

export function setSession(s: PracticeSession | null): void {
  session = s;
}

/** 직접 입력한 텍스트 (저장·관리는 Phase 3) */
export const customDraft = { text: "" };
