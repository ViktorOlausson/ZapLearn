// @vitest-environment node
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { previewDeckUpdate } from "./deckUpdate";
import { createDeck, readDeckFile } from "./deckService";
import { getDeck, saveDeck } from "./deckRepo";
import {
  ImportedCardSchema,
  MAX_MULTIPLE_CHOICE_OPTIONS,
  parseDeckFile,
} from "@/types/deck";
import { matchesCorrectAnswers } from "@/features/train/multipleChoice";
import { useProgressStore } from "@/features/progress/progressStore";
import { getProgress } from "@/features/progress/progressRepo";
import {
  createImageDraftSession,
  getImageAsset,
} from "@/features/images/imageRepo";

const options = (count: number) =>
  Array.from({ length: count }, (_, i) => `Option ${i + 1}`);
const card = ImportedCardSchema.parse({
  id: "card-one",
  question: "Which?",
  type: "multiple-choice",
  answer: "Option 1",
  options: options(4),
});
const source = () => ({
  ...createDeck("Update test"),
  cards: [
    card,
    ImportedCardSchema.parse({
      id: "card-two",
      question: "Recall?",
      answer: "Yes",
    }),
  ],
});
const preview = (
  value: unknown,
  deck = source(),
  mode: "merge" | "replace" = "merge",
) => previewDeckUpdate(deck, JSON.stringify(value), mode);

describe("large answer sets", () => {
  it.each([
    [20, 1],
    [20, 5],
    [20, 10],
    [30, 20],
    [50, 49],
  ])(
    "imports and round-trips %i options / %i correct",
    async (count, correct) => {
      const values = options(count);
      const answers = values.slice(0, correct);
      const incoming = {
        title: "Large",
        cards: [
          {
            question: "Large?",
            type: "multiple-choice",
            options: values,
            ...(correct === 1 ? { answer: answers[0] } : { answers }),
          },
        ],
      };
      const result = await readDeckFile(
        new File([JSON.stringify(incoming)], "large.json"),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.errors.join());
      expect(parseDeckFile(JSON.stringify(result.deck))).toEqual(result);
      expect(matchesCorrectAnswers([...answers].reverse(), answers)).toBe(true);
      expect(matchesCorrectAnswers(answers.slice(1), answers)).toBe(false);
      expect(
        matchesCorrectAnswers([...answers, values[count - 1]], answers),
      ).toBe(false);
    },
  );
  it("accepts a one-item answers array and rejects above the central maximum", () => {
    expect(
      ImportedCardSchema.safeParse({
        ...card,
        answer: undefined,
        answers: ["Option 1"],
      }).success,
    ).toBe(true);
    expect(
      ImportedCardSchema.safeParse({
        ...card,
        options: options(MAX_MULTIPLE_CHOICE_OPTIONS + 1),
      }).success,
    ).toBe(false);
  });
});

describe("safe merge and patch", () => {
  it("matches stable IDs and normalized questions, preserves omissions and adds new cards", () => {
    const result = preview({
      cards: [
        {
          id: card.id,
          question: "Changed?",
          options: options(25),
          answers: options(15),
        },
        { question: "  RECALL?  ", answer: "Updated" },
        { question: "New?", answer: "New answer" },
      ],
    });
    expect(result).toMatchObject({ added: 1, updated: 2, deleted: 0 });
    expect(result.deck.cards[0]).toMatchObject({
      id: card.id,
      options: options(25),
      answers: options(15),
    });
    expect(result.deck.cards[0]).not.toHaveProperty("answer");
    expect(result.deck.cards[1].id).toBe("card-two");
    const omitted = preview({ cards: [{ id: card.id, answer: "Option 2" }] });
    expect(omitted.deck.cards[1]).toEqual(source().cards[1]);
    expect(omitted.unchanged).toBe(1);
  });
  it("applies set/add/remove operations in order and converts back to single and flashcard", () => {
    const base = source();
    const expanded = preview(
      {
        updates: [
          {
            cardId: card.id,
            addOptions: options(24),
            addCorrectAnswers: options(20),
            addTags: ["tag", "tag"],
          },
        ],
      },
      base,
    );
    expect(expanded.deck.cards[0]).toMatchObject({
      options: options(24),
      answers: options(20),
      tags: ["tag"],
    });
    const reduced = preview(
      {
        updates: [
          {
            cardId: card.id,
            removeOptions: ["Option 24"],
            removeCorrectAnswers: ["Option 20"],
            removeTags: ["tag"],
          },
        ],
      },
      expanded.deck,
    );
    expect(reduced.deck.cards[0]).toMatchObject({
      options: options(23),
      answers: options(19),
      tags: [],
    });
    const single = preview(
      {
        updates: [{ cardId: card.id, answer: "Option 1", options: options(2) }],
      },
      reduced.deck,
    );
    expect(single.deck.cards[0]).not.toHaveProperty("answers");
    expect(single.deck.cards[0]).toMatchObject({
      options: options(2),
      answer: "Option 1",
    });
    const flash = preview(
      { updates: [{ cardId: card.id, type: "flashcard", answer: "Recall" }] },
      single.deck,
    );
    expect(flash.deck.cards[0]).not.toHaveProperty("options");
  });
  it("detects no-op updates, replacement removals and wrong deck IDs", () => {
    const deck = source();
    expect(preview(deck, deck).changed).toBe(false);
    expect(preview({ cards: [{ id: card.id }] }, deck).changed).toBe(false);
    expect(
      preview({ cards: [{ id: card.id }] }, deck, "replace"),
    ).toMatchObject({ deleted: 1, unchanged: 1 });
    expect(() => preview({ deckId: "other", cards: [] }, deck)).toThrow(
      /deck ID/,
    );
  });
  it.each([
    { cards: [{ id: "unknown", question: "Which?", answer: "Other" }] },
    {
      cards: [
        { question: "New?", answer: "A" },
        { question: " NEW? ", answer: "B" },
      ],
    },
    { cards: [{ id: card.id, answer: "Missing" }] },
    { updates: [{ cardId: card.id, removeOptions: ["Option 1"] }] },
    { updates: [{ cardId: "unknown", answer: "A" }] },
    { cards: [{ id: card.id, answer: "Option 1", answers: ["Option 2"] }] },
  ])(
    "rejects conflicts or invalid final cards without modifying input",
    (input) => {
      const deck = source();
      const original = JSON.stringify(deck);
      expect(() => preview(input, deck)).toThrow();
      expect(JSON.stringify(deck)).toBe(original);
    },
  );
  it("blocks ambiguous matches and prototype keys", () => {
    const deck = source();
    deck.cards.push({ ...card, id: "duplicate" });
    expect(() =>
      preview({ cards: [{ question: "Which?", answer: "Option 2" }] }, deck),
    ).toThrow(/Needs review/);
    const resolved = preview(
      {
        cards: [
          { id: card.id, answer: "Option 2" },
          { id: "duplicate", answer: "Option 3" },
        ],
      },
      deck,
    );
    expect(resolved.updated).toBe(2);
    expect(preview(deck, deck).changed).toBe(false);
    expect(() =>
      previewDeckUpdate(
        source(),
        '{"cards":[{"__proto__":{"polluted":true}}]}',
      ),
    ).toThrow();
  });
  it("handles a 500-card deck with 100 updates", () => {
    const deck = {
      ...createDeck("Large"),
      cards: options(500).map((question, i) =>
        ImportedCardSchema.parse({ id: `card-${i}`, question, answer: "A" }),
      ),
    };
    const result = preview(
      {
        cards: deck.cards.slice(0, 100).map((c) => ({ id: c.id, answer: "B" })),
      },
      deck,
    );
    expect(result).toMatchObject({ updated: 100, unchanged: 400, deleted: 0 });
    expect(result.deck.cards).toHaveLength(500);
  });
  it("persists merged cards, preserves all progress and rejects stale writes atomically", async () => {
    const deck = source();
    await saveDeck(deck);
    await useProgressStore.getState().grade(deck.id, card.id, true);
    await useProgressStore.getState().grade(deck.id, "card-two", false);
    const progress = await getProgress(deck.id);
    const result = preview(
      {
        cards: [
          { id: card.id, options: options(30), answers: options(20) },
          { question: "Brand new?", answer: "New" },
        ],
      },
      deck,
    );
    await saveDeck(result.deck, [], deck);
    expect(await getDeck(deck.id)).toEqual(result.deck);
    expect(await getProgress(deck.id)).toEqual(progress);
    expect(
      (await getProgress(deck.id))?.cards[result.deck.cards[2].id],
    ).toBeUndefined();
    await expect(saveDeck(deck, [], deck)).rejects.toThrow(
      /changed after preview/,
    );
    expect(await getDeck(deck.id)).toEqual(result.deck);
  });
  it("preserves omitted local images and rolls back missing-image changes", async () => {
    const session = createImageDraftSession();
    const assetId = session.stage(new Blob(["image"], { type: "image/png" }));
    const deck = source();
    deck.cards[0].questionImage = { type: "local", assetId, alt: "Image" };
    await saveDeck(deck);
    session.release();
    const result = preview(
      { updates: [{ cardId: card.id, difficulty: 3 }] },
      deck,
    );
    await saveDeck(result.deck, [], deck);
    expect((await getDeck(deck.id))?.cards[0].questionImage).toEqual(
      deck.cards[0].questionImage,
    );
    expect(await getImageAsset(assetId)).not.toBeNull();
    const bad = preview(
      {
        updates: [
          {
            cardId: card.id,
            questionImage: {
              type: "local",
              assetId: "image-missing",
              alt: "Missing",
            },
          },
        ],
      },
      result.deck,
    );
    await expect(saveDeck(bad.deck, [], result.deck)).rejects.toThrow(
      /missing/,
    );
    expect(await getDeck(deck.id)).toEqual(result.deck);
    expect(await getImageAsset(assetId)).not.toBeNull();
  });
});
