import { PRACTICE_STEPS, type LearningItem, type PracticeStep, type ProgressEntry } from "../../types";
import { dbClear, dbGet, dbGetAll, dbPut } from "../database";

/** 3단계를 마쳤을 때 호출: 연습 횟수 +1, 완료 단계 기록 */
export async function recordCompletion(item: Pick<LearningItem, "id" | "language" | "text">, steps: PracticeStep[], now = new Date()): Promise<ProgressEntry> {
  const prev = await dbGet<ProgressEntry>("progress", item.id);
  const done = new Set([...(prev?.completedSteps ?? []), ...steps]);
  const entry: ProgressEntry = {
    learningItemId: item.id,
    language: item.language,
    text: item.text,
    completedSteps: PRACTICE_STEPS.filter((s) => done.has(s)),
    practiceCount: (prev?.practiceCount ?? 0) + 1,
    lastPracticedAt: now.toISOString(),
  };
  await dbPut("progress", entry);
  return entry;
}

export async function getProgressMap(): Promise<Map<string, ProgressEntry>> {
  try {
    const all = await dbGetAll<ProgressEntry>("progress");
    return new Map(all.map((p) => [p.learningItemId, p]));
  } catch {
    return new Map();
  }
}

export function clearProgress(): Promise<void> {
  return dbClear("progress");
}
