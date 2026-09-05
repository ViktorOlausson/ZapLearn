import { afterEach, describe, expect, it, vi } from "vitest";

import mixedDeckFixture from "../../../fixtures/mixed-deck.json?raw";
import multipleChoiceDeckFixture from "../../../fixtures/multiple-choice-deck.json?raw";

import {
  createDeck,
  fetchDeckFromUrl,
  MAX_DECK_FILE_SIZE,
  materializeDeck,
  readDeckFile,
} from "@/features/decks/deckService";
import { parseDeckFile } from "@/types/deck";

describe("file deck import", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
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
  it("keeps the example multiple-choice and mixed fixtures importable", () => {
    const multipleChoice = parseDeckFile(multipleChoiceDeckFixture);
    const mixed = parseDeckFile(mixedDeckFixture);

    expect(multipleChoice.ok).toBe(true);
    expect(mixed.ok).toBe(true);
    if (multipleChoice.ok) {
      expect(multipleChoice.deck.cards).toHaveLength(5);
      expect(
        multipleChoice.deck.cards.every(
          (card) => card.type === "multiple-choice",
        ),
      ).toBe(true);
    }
    if (mixed.ok) {
      expect(mixed.deck.cards.some((card) => card.type === undefined)).toBe(
        true,
      );
      expect(
        mixed.deck.cards.some((card) => card.type === "multiple-choice"),
      ).toBe(true);
    }
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
  it("imports and round-trips a mixed deck with multiple-choice options", async () => {
    const imported = await readDeckFile(
      new File(
        [
          JSON.stringify({
            title: "Mixed deck",
            cards: [
              { question: "Traditional?", answer: "Yes" },
              {
                type: "multiple-choice",
                question: "Choose B",
                answer: "B",
                options: ["A", "B", "C"],
              },
            ],
          }),
        ],
        "mixed.json",
      ),
    );

    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const exported = JSON.stringify(materializeDeck(imported.deck, "new"));
    const reimported = parseDeckFile(exported);
    expect(reimported.ok).toBe(true);
    if (reimported.ok) {
      expect(reimported.deck.cards).toHaveLength(2);
      expect(reimported.deck.cards[1]).toMatchObject({
        type: "multiple-choice",
        options: ["A", "B", "C"],
      });
    }
  });
  it("rejects oversized files before parsing them", async () => {
    const result = await readDeckFile(
      new File([new Uint8Array(MAX_DECK_FILE_SIZE + 1)], "large.json"),
    );
    expect(result).toEqual({
      ok: false,
      errors: ["The deck file must be smaller than 2 MB."],
    });
  });
  it("rejects non-HTTP deck URLs without fetching them", async () => {
    const result = await fetchDeckFromUrl("javascript:alert(1)");
    expect(result).toEqual({
      ok: false,
      errors: ["Deck URLs must use HTTP or HTTPS."],
    });
  });
  it("stops reading a remote response that exceeds the limit", async () => {
    const oversizedDeck = JSON.stringify({
      title: "Large",
      cards: [{ question: "Q", answer: "x".repeat(MAX_DECK_FILE_SIZE) }],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(oversizedDeck, {
          headers: { "content-length": "10" },
        }),
      ),
    );

    await expect(
      fetchDeckFromUrl("https://example.com/deck.json"),
    ).resolves.toEqual({
      ok: false,
      errors: ["The deck response must be smaller than 2 MB."],
    });
  });
  it("handles failed and invalid remote responses safely", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(new Response("no", { status: 500 }));
    await expect(
      fetchDeckFromUrl("https://example.com/deck.json"),
    ).resolves.toEqual({ ok: false, errors: ["Could not load deck (500)."] });

    fetchMock.mockResolvedValueOnce(new Response("not json"));
    const invalid = await fetchDeckFromUrl("https://example.com/deck.json");
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.errors[0]).toContain("Could not read JSON");
  });
});

it("checks JSON content despite a trusted-looking MIME type", async () => {
  const result = await readDeckFile(
    new File(["<script>alert(1)</script>"], "deck.json", {
      type: "application/json",
    }),
  );
  expect(result.ok).toBe(false);
});

it("accepts valid JSON when the browser supplies no MIME type", async () => {
  const result = await readDeckFile(
    new File(
      ['{"title":"Deck","cards":[{"question":"Q","answer":"A"}]}'],
      "deck.json",
    ),
  );
  expect(result.ok).toBe(true);
});
