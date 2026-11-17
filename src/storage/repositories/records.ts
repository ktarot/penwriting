import type { PracticeRecord } from "../../types";
import { dbClear, dbDelete, dbGet, dbGetAll, dbPut } from "../database";

export async function saveRecord(r: PracticeRecord): Promise<void> {
  await dbPut("practiceRecords", r);
}

export function getRecord(id: string): Promise<PracticeRecord | undefined> {
  return dbGet<PracticeRecord>("practiceRecords", id);
}

/** 최신순 */
export async function listRecords(): Promise<PracticeRecord[]> {
  const all = await dbGetAll<PracticeRecord>("practiceRecords");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteRecord(id: string): Promise<void> {
  return dbDelete("practiceRecords", id);
}

export function deleteAllRecords(): Promise<void> {
  return dbClear("practiceRecords");
}
