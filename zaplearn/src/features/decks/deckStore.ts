import { create } from "zustand";

import {
  deleteDeck,
  getDeck,
  listDecks,
  saveDeck,
} from "@/features/decks/deckRepo";
import { type Deck } from "@/types/deck";

type DeckState = {
  decks: Deck[];
  loading: boolean;
  error?: string;
  initialize: () => Promise<void>;
  save: (deck: Deck) => Promise<void>;
  remove: (id: string) => Promise<void>;
  get: (id: string) => Promise<Deck | null>;
};

export const useDeckStore = create<DeckState>((set, get) => ({
  decks: [],
  loading: true,
  async initialize() {
    set({ loading: true, error: undefined });
    try {
      set({ decks: await listDecks(), loading: false });
    } catch {
      set({ error: "Could not load local decks.", loading: false });
    }
  },
  async save(deck) {
    await saveDeck(deck);
    set({
      decks: [deck, ...get().decks.filter((item) => item.id !== deck.id)],
    });
  },
  async remove(id) {
    await deleteDeck(id);
    set({ decks: get().decks.filter((deck) => deck.id !== id) });
  },
  get: getDeck,
}));
