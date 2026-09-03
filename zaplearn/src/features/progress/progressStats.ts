import type { Deck } from "@/types/deck";
import type { ProgressDocument } from "@/types/progress";

export type DeckStats = {
  total: number;
  newCount: number;
  learning: number;
  mastered: number;
  due: number;
  correct: number;
  incorrect: number;
  lastStudied?: string;
};

export function getDeckStats(
  deck: Deck,
  progress?: ProgressDocument,
  now = new Date(),
): DeckStats {
  const cardIds = new Set(deck.cards.map((card) => card.id));
  const states = Object.values(progress?.cards ?? {}).filter((state) =>
    cardIds.has(state.cardId),
  );
  const reviewedIds = new Set(states.map((state) => state.cardId));
  const lastStudied = states
    .map((state) => state.lastReviewedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  return {
    total: deck.cards.length,
    newCount: deck.cards.length - reviewedIds.size,
    learning: states.filter((state) => state.bucket === 1).length,
    mastered: states.filter((state) => state.bucket === 2).length,
    due:
      deck.cards.length -
      reviewedIds.size +
      states.filter((state) => new Date(state.dueAt).getTime() <= now.getTime())
        .length,
    correct: states.reduce((sum, state) => sum + state.correctCount, 0),
    incorrect: states.reduce((sum, state) => sum + state.incorrectCount, 0),
    lastStudied,
  };
}

export function relativeStudyDate(value?: string): string {
  if (!value) return "Not studied yet";
  const elapsedDays = Math.floor(
    (Date.now() - new Date(value).getTime()) / 86_400_000,
  );
  if (elapsedDays <= 0) return "Studied today";
  if (elapsedDays === 1) return "Studied yesterday";
  return `Studied ${elapsedDays} days ago`;
}
