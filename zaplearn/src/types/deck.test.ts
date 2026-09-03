import { describe, expect, it } from "vitest";

import { parseDeckFile } from "@/types/deck";

function parseCard(card: Record<string, unknown>) {
  return parseDeckFile(JSON.stringify({ title: "Questions", cards: [card] }));
}

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

  it("accepts a valid multiple-choice card", () => {
    const result = parseCard({
      type: "multiple-choice",
      question: "What does WBS stand for?",
      answer: "Work Breakdown Structure",
      options: [
        "Work Balance Schedule",
        "Work Breakdown Structure",
        "Workflow Business System",
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.deck.cards[0]).toMatchObject({
        type: "multiple-choice",
        options: expect.arrayContaining(["Work Breakdown Structure"]),
      });
    }
  });

  it("keeps a generated card ID stable when option order changes", () => {
    const card = {
      type: "multiple-choice",
      question: "Stable question",
      answer: "B",
      category: "Planning",
      options: ["A", "B", "C"],
    };
    const first = parseCard(card);
    const second = parseCard({ ...card, options: ["C", "A", "B"] });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.deck.cards[0].id).toBe(first.deck.cards[0].id);
    }
  });

  it.each([
    [
      "missing options",
      {
        type: "multiple-choice",
        question: "Question",
        answer: "Answer",
      },
      "options",
    ],
    [
      "too few options",
      {
        type: "multiple-choice",
        question: "Question",
        answer: "Answer",
        options: ["Answer"],
      },
      "at least 2",
    ],
    [
      "an answer missing from options",
      {
        type: "multiple-choice",
        question: "Question",
        answer: "Answer",
        options: ["Wrong one", "Wrong two"],
      },
      "exactly once",
    ],
    [
      "duplicate options",
      {
        type: "multiple-choice",
        question: "Question",
        answer: "Answer",
        options: ["Answer", "Wrong", "Wrong"],
      },
      "duplicates",
    ],
    [
      "the correct answer more than once",
      {
        type: "multiple-choice",
        question: "Question",
        answer: "Answer",
        options: ["Answer", "Wrong", "Answer"],
      },
      "exactly once",
    ],
  ])("rejects a multiple-choice card with %s", (_, card, message) => {
    const result = parseCard(card);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("Card 1");
      expect(result.errors.join(" ")).toContain(message);
    }
  });

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
