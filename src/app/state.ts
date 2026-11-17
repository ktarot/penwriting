import type { FontStyle, LearningItem, LineLayout, PracticeStep, Stroke } from "../types";

/** Phase 1: 설정은 메모리에만 둔다. (IndexedDB 저장은 Phase 3) */
export interface Phase1Settings {
  fontStyle: FontStyle;
  /** 단어·문장 기준 1em 최대 표시 크기(px) */
  fontSize: number;
  inkColor: string;
  /** 줄 높이 대비 선 굵기 */
  inkWidth: number;
  /** 단계별 가이드 투명도 */
  guideOpacity: Record<Exclude<PracticeStep, "free">, number>;
}

export const settings: Phase1Settings = {
  fontStyle: "standard",
  fontSize: 72,
  inkColor: "#1d2b53",
  inkWidth: 0.035,
  guideOpacity: { trace: 0.28, hint: 0.6 },
};

export interface PracticeSession {
  item: LearningItem;
  fontStyle: FontStyle;
  lines: LineLayout[];
  maxEmPx: number;
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

/** 직접 입력한 텍스트 (Phase 2에서 저장·관리 기능으로 확장) */
export const customDraft = { text: "" };
