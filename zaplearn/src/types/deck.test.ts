import { describe, expect, it } from "vitest";

import { CardImageSchema, parseDeckFile } from "@/types/deck";

function parseCard(card: Record<string, unknown>) {
  return parseDeckFile(JSON.stringify({ title: "Questions", cards: [card] }));
}

describe("optional card images", () => {
  const image = {
    src: "https://example.com/shoulder.jpg",
    alt: "Highlighted outer shoulder",
    caption: "Identify the structure",
  };
  const card = { question: "What is this?", answer: "Deltoid" };

  it.each([
    {},
    { questionImage: image },
    { answerImage: image },
    { questionImage: image, answerImage: image },
    {
      type: "multiple-choice",
      options: ["Deltoid", "Biceps", "Triceps"],
      questionImage: image,
    },
  ])("accepts compatible cards and preserves metadata: %j", (extra) => {
    const result = parseCard({ ...card, ...extra });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.deck.cards[0]).toMatchObject(extra);
  });

  it.each([
    { alt: "Description" },
    { src: "", alt: "Description" },
    { src: image.src },
    { src: image.src, alt: "  " },
    { src: image.src, alt: 42 },
    null,
    "image.jpg",
    [],
    { src: "x".repeat(4097), alt: "Description" },
    { ...image, alt: "x".repeat(2001) },
    { ...image, caption: "x".repeat(2001) },
  ])("rejects malformed image metadata: %j", (questionImage) => {
    const result = parseCard({ ...card, questionImage });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.join(" ")).toContain("Card 1 · questionImage");
  });

  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "file:///image.png",
    "vbscript:msgbox(1)",
    "data:image/svg+xml,<svg/>",
    "data:image/png;base64,eA==",
    "blob:https://example.com/id",
    "http://example.com/a.png",
    "//example.com/a.png",
    "/\\example.com/a.png",
    "images/a.png",
    "https://",
    "https://user:password@example.com/a.png",
    "https://example.com/\na.png",
    "/\u0000image.jpg",
    "ftp://example.com/image.jpg",
  ])("rejects unsafe or unsupported src %s", (src) => {
    const result = parseCard({ ...card, questionImage: { ...image, src } });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.join(" ")).toContain("questionImage.src");
  });

  it.each([
    "/images/anatomy.jpg",
    "/data/images/example.webp",
    "https://example.com/image.svg",
    "https://example.com/image.png?v=1",
  ])("allows supported source %s", (src) => {
    expect(CardImageSchema.safeParse({ ...image, src }).success).toBe(true);
  });

  it("strips unexpected image properties and preserves stable IDs across image edits", () => {
    const original = parseCard(card);
    const edited = parseCard({
      ...card,
      questionImage: { ...image, onerror: "alert(1)", html: "<script/>" },
    });
    expect(original.ok && edited.ok).toBe(true);
    if (original.ok && edited.ok) {
      expect(edited.deck.cards[0].id).toBe(original.deck.cards[0].id);
      expect(edited.deck.cards[0].questionImage).toEqual(image);
    }
  });
});

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

describe("unsafe and conflicting imported IDs", () => {
  it.each([
    "__proto__",
    "constructor",
    "prototype",
    "toString",
    "hasOwnProperty",
  ])("rejects reserved ID %s", (id) => {
    expect(
      parseDeckFile(
        JSON.stringify({
          id,
          title: "Deck",
          cards: [{ question: "Q", answer: "A" }],
        }),
      ).ok,
    ).toBe(false);
    expect(parseCard({ id, question: "Q", answer: "A" }).ok).toBe(false);
  });
  it("rejects duplicate generated and supplied card IDs", () => {
    for (const cards of [
      [
        { question: "Q", answer: "A" },
        { question: "Q", answer: "B" },
      ],
      [
        { id: "same", question: "Q1", answer: "A" },
        { id: "same", question: "Q2", answer: "B" },
      ],
    ]) {
      expect(parseDeckFile(JSON.stringify({ title: "Deck", cards })).ok).toBe(
        false,
      );
    }
  });
});
