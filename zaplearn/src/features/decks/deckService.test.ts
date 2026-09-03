import { describe, expect, it } from "vitest";

import {
  createDeck,
  materializeDeck,
  readDeckFile,
} from "@/features/decks/deckService";

describe("file deck import", () => {
  it("returns a friendly error for an invalid file", async () => {
    const result = await readDeckFile(
      new File(["not json"], "deck.txt", { type: "text/plain" }),
    );
    expect(result).toEqual({ ok: false, errors: ["Choose a JSON deck file."] });
  });
  it("reads a valid file into a deck ready for persistence", async () => {
    const result = await readDeckFile(
      new File(
        ['{"title":"Deck","cards":[{"question":"Q","answer":"A"}]}'],
        "deck.json",
        { type: "application/json" },
      ),
    );
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(materializeDeck(result.deck, "new").cards).toHaveLength(1);
  });
  it("preserves a supplied deck ID and generates IDs for local decks", async () => {
    const imported = await readDeckFile(
      new File(
        [
          '{"id":"stable-deck","title":"Deck","cards":[{"question":"Q","answer":"A"}]}',
        ],
        "deck.json",
      ),
    );
    expect(imported.ok).toBe(true);
    if (imported.ok)
      expect(materializeDeck(imported.deck, "new").id).toBe("stable-deck");
    expect(createDeck("Local").id).toMatch(/^deck-/);
  });
});
