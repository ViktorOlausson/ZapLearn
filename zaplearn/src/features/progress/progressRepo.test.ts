import { describe, expect, it } from "vitest";

import { migrateProgress } from "@/features/progress/progressRepo";

describe("progress migration", () => {
  it("migrates the previous day-based progress document without losing counts", () => {
    const migrated = migrateProgress(
      {
        schemaVersion: 1,
        deckId: "deck",
        updatedAt: "2025-01-01T00:00:00.000Z",
        cards: {
          one: {
            bucket: 2,
            interval: 3,
            correctCount: 4,
            incorrectCount: 1,
            ease: 2.3,
            dueAt: "2025-01-04T00:00:00.000Z",
            cardId: "one",
          },
        },
      },
      "deck",
    );
    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.cards.one.intervalMinutes).toBe(4320);
    expect(migrated?.cards.one.correctCount).toBe(4);
  });
});
