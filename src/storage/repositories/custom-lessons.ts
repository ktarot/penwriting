import type { CustomLesson, LanguageCode } from "../../types";
import { dbDelete, dbGet, dbGetAll, dbPut, newId } from "../database";

export const CUSTOM_PREFIX = "custom-";

export async function listCustomLessons(lang?: LanguageCode): Promise<CustomLesson[]> {
  try {
    const all = await dbGetAll<CustomLesson>("customLessons");
    return all.filter((c) => !lang || c.language === lang).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function getCustomLesson(id: string): Promise<CustomLesson | undefined> {
  return dbGet<CustomLesson>("customLessons", id);
}

export async function createCustomLesson(text: string, language: LanguageCode, now = new Date()): Promise<CustomLesson> {
  const lesson: CustomLesson = { id: `${CUSTOM_PREFIX}${newId("")}`, text: text.trim(), language, createdAt: now.toISOString(), updatedAt: now.toISOString() };
  await dbPut("customLessons", lesson);
  return lesson;
}

export async function updateCustomLesson(lesson: CustomLesson, text: string, now = new Date()): Promise<CustomLesson> {
  const next = { ...lesson, text: text.trim(), updatedAt: now.toISOString() };
  await dbPut("customLessons", next);
  return next;
}

export function deleteCustomLesson(id: string): Promise<void> {
  return dbDelete("customLessons", id);
}
