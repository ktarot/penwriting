import type { PracticeDraft } from "../../types";
import { dbClear, dbDelete, dbGet, dbGetAll, dbPut } from "../database";

export async function saveDraft(d: PracticeDraft): Promise<void> {
  try {
    await dbPut("drafts", d);
  } catch {
    /* 임시 저장 실패는 연습을 막지 않는다 */
  }
}

export async function getDraft(itemId: string): Promise<PracticeDraft | undefined> {
  try {
    return await dbGet<PracticeDraft>("drafts", itemId);
  } catch {
    return undefined;
  }
}

export async function deleteDraft(itemId: string): Promise<void> {
  try {
    await dbDelete("drafts", itemId);
  } catch {
    /* noop */
  }
}

/** 가장 최근에 쓰던 임시 저장 */
export async function latestDraft(): Promise<PracticeDraft | undefined> {
  try {
    const all = await dbGetAll<PracticeDraft>("drafts");
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  } catch {
    return undefined;
  }
}

export function clearDrafts(): Promise<void> {
  return dbClear("drafts");
}
