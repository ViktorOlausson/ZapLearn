import localforage from "localforage";
import {
  getDraftImage,
  imageAssets,
  localImageIds,
  type ImageAsset,
} from "@/features/images/imageRepo";

import { stableHash } from "@/lib/hash";
import {
  DeckSchema,
  ImportedDeckSchema,
  SCHEMA_VERSION,
  type Deck,
} from "@/types/deck";

const decks = localforage.createInstance({
  name: "zaplearn",
  driver: localforage.INDEXEDDB,
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

export async function saveDeck(
  deck: Deck,
  assets: ImageAsset[] = [],
  expected?: Deck,
): Promise<void> {
  const validated = DeckSchema.parse(deck);
  const provided = new Map(assets.map((asset) => [asset.id, asset]));
  for (const id of localImageIds(validated.cards)) {
    const draft = getDraftImage(id);
    if (draft) provided.set(id, draft);
  }
  await commitDeck(validated.id, validated, provided, expected);
}

export async function deleteDeck(id: string): Promise<void> {
  await commitDeck(id);
}

/** Deck writes, asset writes, and reference cleanup share one atomic transaction.
 * IndexedDB serializes these transactions across tabs, including duplicates/deletes. */
async function commitDeck(
  id: string,
  deck?: Deck,
  provided = new Map<string, ImageAsset>(),
  expected?: Deck,
): Promise<void> {
  await decks.ready();
  await imageAssets.ready();
  await new Promise<void>((resolve, reject) => {
    const opening = indexedDB.open("zaplearn");
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result;
      db.onversionchange = () => db.close();
      const tx = db.transaction(["decks", "images"], "readwrite");
      let failure: Error | undefined;
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        reject(
          failure ?? tx.error ?? new Error("Could not save deck and images."),
        );
      };
      const deckStore = tx.objectStore("decks");
      const images = tx.objectStore("images");
      if (expected) {
        const current = deckStore.get(id);
        current.onsuccess = () => {
          if (
            JSON.stringify(migrateDeck(current.result)) !==
            JSON.stringify(DeckSchema.parse(expected))
          ) {
            failure = new Error(
              "The deck changed after preview. Create a new preview before applying.",
            );
            tx.abort();
          }
        };
      }
      if (deck) {
        for (const assetId of localImageIds(deck.cards)) {
          const asset = provided.get(assetId);
          if (asset) images.put(asset, assetId);
          else {
            const request = images.get(assetId);
            request.onsuccess = () => {
              if (!request.result) {
                failure = new Error(
                  "A local image is missing. Restore an image package or replace the image.",
                );
                tx.abort();
              }
            };
          }
        }
        deckStore.put(deck, id);
      } else deckStore.delete(id);
      const allDecks = deckStore.getAll();
      allDecks.onsuccess = () => {
        const referenced = new Set<string>();
        // Keep all assets if an unrecognized legacy deck cannot be read safely.
        for (const value of allDecks.result) {
          const current = migrateDeck(value);
          if (!current) return;
          for (const ref of localImageIds(current.cards)) referenced.add(ref);
        }
        const cursor = images.openKeyCursor();
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (!entry) return;
          if (!referenced.has(String(entry.key)))
            images.delete(entry.primaryKey);
          entry.continue();
        };
      };
    };
  });
}
