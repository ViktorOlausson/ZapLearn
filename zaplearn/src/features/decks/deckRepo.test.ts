import { describe, expect, it } from "vitest";

import { migrateDeck } from "@/features/decks/deckRepo";

describe("deck migration", () => {
  it("loads an existing stored flashcard without a type", () => {
    const deck = migrateDeck({
      id: "legacy-deck",
      title: "Existing deck",
      cards: [
        {
          id: "legacy-card",
          question: "Old question",
          answer: "Old answer",
          tags: [],
          difficulty: 2,
        },
      ],
      schemaVersion: 1,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    expect(deck?.cards[0]).toMatchObject({
      id: "legacy-card",
      question: "Old question",
      answer: "Old answer",
    });
    expect(deck?.cards[0].type).toBeUndefined();
  });
});
