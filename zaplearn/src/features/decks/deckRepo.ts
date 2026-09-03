import localforage from "localforage";

import { stableHash } from "@/lib/hash";
import {
  DeckSchema,
  ImportedDeckSchema,
  SCHEMA_VERSION,
  type Deck,
} from "@/types/deck";

const decks = localforage.createInstance({
  name: "zaplearn",
  storeName: "decks",
});

export function migrateDeck(value: unknown): Deck | null {
  const parsed = DeckSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const legacy = ImportedDeckSchema.safeParse(value);
  if (!legacy.success) return null;
  const source = value as Record<string, unknown>;
  const now = new Date().toISOString();
  const migrated = DeckSchema.safeParse({
    ...legacy.data,
    id:
      typeof source.id === "string"
        ? source.id
        : `legacy-${stableHash(JSON.stringify(legacy.data.cards))}`,
    schemaVersion: SCHEMA_VERSION,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now,
  });
  return migrated.success ? migrated.data : null;
}

export async function listDecks(): Promise<Deck[]> {
  const result: Deck[] = [];
  await decks.iterate<unknown, void>((value) => {
    const deck = migrateDeck(value);
    if (deck) result.push(deck);
  });
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDeck(id: string): Promise<Deck | null> {
  return migrateDeck(await decks.getItem<unknown>(id));
}

export async function saveDeck(deck: Deck): Promise<void> {
  const validated = DeckSchema.parse(deck);
  await decks.setItem(validated.id, validated);
}

export async function deleteDeck(id: string): Promise<void> {
  await decks.removeItem(id);
}
