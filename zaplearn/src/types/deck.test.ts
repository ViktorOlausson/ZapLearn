import { describe, expect, it } from "vitest";

import { parseDeckFile } from "@/types/deck";

describe("deck import validation", () => {
  it("accepts a valid deck and creates deterministic IDs for cards", () => {
    const result = parseDeckFile(
      '{"title":"Swedish","cards":[{"question":"Hej?","answer":"Hello"}]}',
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.deck.cards[0].id).toMatch(/^card-/);
  });

  it("reports malformed JSON", () => expect(parseDeckFile("{").ok).toBe(false));
  it("rejects a deck without cards", () =>
    expect(parseDeckFile('{"title":"Empty","cards":[]}').ok).toBe(false));
  it("identifies an invalid card", () => {
    const result = parseDeckFile(
      '{"title":"Broken","cards":[{"question":"","answer":"A"}]}',
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.join(" ")).toContain("Card 1 · question");
  });
  it("rejects an invalid difficulty", () =>
    expect(
      parseDeckFile(
        '{"title":"Bad","cards":[{"question":"Q","answer":"A","difficulty":4}]}',
      ).ok,
    ).toBe(false));

  it("strips unrecognized properties without modifying object prototypes", () => {
    const result = parseDeckFile(
      '{"title":"Safe","__proto__":{"polluted":true},"cards":[{"question":"Q","answer":"A","unexpected":"value"}]}',
    );

    expect(result.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    if (result.ok) {
      expect(Object.hasOwn(result.deck, "__proto__")).toBe(false);
      expect(Object.hasOwn(result.deck.cards[0], "unexpected")).toBe(false);
    }
  });
});
