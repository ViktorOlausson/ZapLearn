import { create } from "zustand";

import {
  getProgress,
  resetProgress,
  saveProgress,
} from "@/features/progress/progressRepo";
import { createProgress, gradeCard } from "@/features/train/repetition";
import type { ProgressDocument } from "@/types/progress";

type ProgressState = {
  documents: Record<string, ProgressDocument>;
  load: (deckId: string) => Promise<ProgressDocument>;
  grade: (deckId: string, cardId: string, correct: boolean) => Promise<void>;
  reset: (deckId: string) => Promise<void>;
};

export const useProgressStore = create<ProgressState>((set, get) => ({
  documents: {},
  async load(deckId) {
    const document = (await getProgress(deckId)) ?? createProgress(deckId);
    set({ documents: { ...get().documents, [deckId]: document } });
    return document;
  },
  async grade(deckId, cardId, correct) {
    const document = get().documents[deckId] ?? (await get().load(deckId));
    const next: ProgressDocument = {
      ...document,
      cards: {
        ...document.cards,
        [cardId]: gradeCard(document.cards[cardId], cardId, correct),
      },
      updatedAt: new Date().toISOString(),
    };
    await saveProgress(next);
    set({ documents: { ...get().documents, [deckId]: next } });
  },
  async reset(deckId) {
    await resetProgress(deckId);
    const documents = { ...get().documents };
    delete documents[deckId];
    set({ documents });
  },
}));
