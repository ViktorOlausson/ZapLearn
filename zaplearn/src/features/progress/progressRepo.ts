import localforage from "localforage";

import {
  CardProgressSchema,
  PROGRESS_SCHEMA_VERSION,
  ProgressDocumentSchema,
  type ProgressDocument,
} from "@/types/progress";

const progress = localforage.createInstance({
  name: "zaplearn",
  storeName: "progress",
});

export async function getProgress(
  deckId: string,
): Promise<ProgressDocument | null> {
  const value = await progress.getItem<unknown>(deckId);
  return migrateProgress(value, deckId);
}

export function migrateProgress(
  value: unknown,
  deckId: string,
): ProgressDocument | null {
  const parsed = ProgressDocumentSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const document = value as Record<string, unknown>;
  const legacyCards =
    typeof document.cards === "object" &&
    document.cards !== null &&
    !Array.isArray(document.cards)
      ? (document.cards as Record<string, unknown>)
      : document;
  const now = new Date().toISOString();
  const cards = Object.entries(legacyCards).reduce<ProgressDocument["cards"]>(
    (result, [cardId, legacy]) => {
      const record =
        typeof legacy === "object" && legacy !== null
          ? (legacy as Record<string, unknown>)
          : {};
      const migrated = CardProgressSchema.safeParse({
        cardId,
        bucket: record.bucket ?? 0,
        correctCount: record.correctCount ?? record.reps ?? 0,
        incorrectCount: record.incorrectCount ?? record.lapses ?? 0,
        intervalMinutes:
          record.intervalMinutes ??
          (typeof record.interval === "number"
            ? record.interval * 24 * 60
            : undefined) ??
          (typeof record.intervalDays === "number"
            ? record.intervalDays * 24 * 60
            : 0),
        ease: record.ease ?? 2.3,
        dueAt: record.dueAt ?? now,
        lastReviewedAt: record.lastReviewedAt,
      });
      if (migrated.success) result[cardId] = migrated.data;
      return result;
    },
    {},
  );
  const migrated: ProgressDocument = {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    deckId,
    cards,
    updatedAt:
      typeof document.updatedAt === "string" ? document.updatedAt : now,
  };
  return ProgressDocumentSchema.safeParse(migrated).success ? migrated : null;
}

export async function saveProgress(document: ProgressDocument): Promise<void> {
  await progress.setItem(document.deckId, document);
}

export async function resetProgress(deckId: string): Promise<void> {
  await progress.removeItem(deckId);
}
