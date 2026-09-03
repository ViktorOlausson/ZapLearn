import type { Card } from "@/types/deck";
import {
  PROGRESS_SCHEMA_VERSION,
  type CardProgress,
  type ProgressDocument,
} from "@/types/progress";

const MINUTE = 60 * 1000;

export function createProgress(
  deckId: string,
  now = new Date(),
): ProgressDocument {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    deckId,
    cards: {},
    updatedAt: now.toISOString(),
  };
}

export function gradeCard(
  current: CardProgress | undefined,
  cardId: string,
  correct: boolean,
  now = new Date(),
): CardProgress {
  const base: CardProgress = current ?? {
    cardId,
    bucket: 0,
    correctCount: 0,
    incorrectCount: 0,
    intervalMinutes: 0,
    ease: 2.3,
    dueAt: now.toISOString(),
  };

  let bucket = base.bucket;
  let intervalMinutes = base.intervalMinutes;
  if (correct) {
    if (base.bucket === 0) {
      bucket = 1;
      intervalMinutes = 60;
    } else if (base.bucket === 1) {
      bucket = 2;
      intervalMinutes = 24 * 60;
    } else {
      bucket = 2;
      intervalMinutes = Math.max(3 * 24 * 60, base.intervalMinutes * 2);
    }
  } else {
    bucket = 0;
    intervalMinutes = 10;
  }

  return {
    ...base,
    bucket,
    intervalMinutes,
    correctCount: base.correctCount + (correct ? 1 : 0),
    incorrectCount: base.incorrectCount + (correct ? 0 : 1),
    dueAt: new Date(now.getTime() + intervalMinutes * MINUTE).toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

export function buildStudyQueue(
  deck: { cards: Card[] },
  progress: ProgressDocument,
  now = new Date(),
): Card[] {
  const due: Card[] = [];
  const fresh: Card[] = [];
  for (const card of deck.cards) {
    const state = progress.cards[card.id];
    if (!state) fresh.push(card);
    else if (new Date(state.dueAt).getTime() <= now.getTime()) due.push(card);
  }
  return [...due, ...fresh];
}
