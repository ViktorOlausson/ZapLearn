// @vitest-environment node
import "fake-indexeddb/auto";
import { useProgressStore } from "@/features/progress/progressStore";
import { getProgress } from "@/features/progress/progressRepo";
import { matchesCorrectAnswers } from "@/features/train/multipleChoice";
import { describe, expect, it } from "vitest";
import { ImportedCardSchema, parseDeckFile } from "@/types/deck";
import { getDeck, saveDeck } from "@/features/decks/deckRepo";
import { materializeDeck, readDeckFile } from "@/features/decks/deckService";

const card = {
  type: "multiple-choice",
  question: "Languages?",
  answers: ["Python", "JavaScript"],
  options: ["Python", "HTML", "JavaScript", "CSS"],
};
describe("multiple-answer schema and persistence", () => {
  it("persists binary spaced repetition results for exact and incomplete sets", async () => {
    const store = useProgressStore.getState();
    await store.grade(
      "multi-progress",
      "exact",
      matchesCorrectAnswers(["JavaScript", "Python"], card.answers),
    );
    await store.grade(
      "multi-progress",
      "incomplete",
      matchesCorrectAnswers(["Python"], card.answers),
    );
    const progress = await getProgress("multi-progress");
    expect(progress?.cards.exact).toMatchObject({
      correctCount: 1,
      incorrectCount: 0,
      bucket: 1,
      intervalMinutes: 60,
    });
    expect(progress?.cards.incomplete).toMatchObject({
      correctCount: 0,
      incorrectCount: 1,
      bucket: 0,
      intervalMinutes: 10,
    });
    expect(progress?.cards.exact.dueAt).toBeTruthy();
  });
  it.each([
    ["empty", { answers: [] }],
    ["one answer", { answers: ["Python"] }],
    ["duplicates", { answers: ["Python", "Python"] }],
    ["missing option", { answers: ["Python", "Rust"] }],
    [
      "duplicate options",
      { options: ["Python", "JavaScript", "HTML", "HTML"] },
    ],
    ["both fields", { answer: "Python" }],
    ["no answer", { answers: undefined }],
    ["all correct", { options: ["Python", "JavaScript"] }],
    ["too few options", { options: ["Python"] }],
    ["blank option", { options: ["Python", "JavaScript", " "] }],
  ])("rejects %s with card context", (_, change) => {
    const result = parseDeckFile(
      JSON.stringify({ title: "Test", cards: [{ ...card, ...change }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/^Card 1/);
  });
  it("keeps IDs independent of answer mode and ordering", () => {
    const single = ImportedCardSchema.parse({
      ...card,
      answers: undefined,
      answer: "Python",
    });
    const multi = ImportedCardSchema.parse(card);
    const reordered = ImportedCardSchema.parse({
      ...card,
      answers: [...card.answers].reverse(),
      options: [...card.options].reverse(),
    });
    expect(single.id).toBe(multi.id);
    expect(reordered.id).toBe(multi.id);
  });
  it("round-trips mixed old/new image cards through IndexedDB and JSON", async () => {
    const cards = [
      { question: "Flashcard", answer: "Recall" },
      { ...card, question: "Single", answers: undefined, answer: "Python" },
      card,
      {
        ...card,
        question: "Image",
        questionImage: { src: "/q.png", alt: "Question diagram" },
        answerImage: { src: "/a.png", alt: "Answer diagram" },
      },
    ];
    const imported = await readDeckFile(
      new File([JSON.stringify({ title: "Mixed", cards })], "mixed.json"),
    );
    expect(imported.ok).toBe(true);
    if (!imported.ok) throw new Error(imported.errors.join(", "));
    const deck = materializeDeck(imported.deck, "new");
    await saveDeck(deck);
    const reloaded = await getDeck(deck.id);
    expect(reloaded).toEqual(deck);
    const exported = parseDeckFile(JSON.stringify(reloaded));
    expect(exported.ok).toBe(true);
    if (exported.ok) expect(exported.deck.cards).toEqual(deck.cards);
    expect(reloaded?.cards[1]).toHaveProperty("answer", "Python");
    expect(reloaded?.cards[1]).not.toHaveProperty("answers");
    expect(reloaded?.cards[2]).toHaveProperty("answers", card.answers);
    expect(reloaded?.cards[2]).not.toHaveProperty("answer");
  });
});
