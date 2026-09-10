import localforage from "localforage";
import { createId } from "@/lib/hash";
import type { Card } from "@/types/deck";

export type ImageAsset = { id: string; blob: Blob };
export const imageAssets = localforage.createInstance({
  name: "zaplearn",
  driver: localforage.INDEXEDDB,
  storeName: "images",
});
// Unsaved uploads belong to an editor session, never the global deck store.
const drafts = new Map<string, ImageAsset>();

export function localImageIds(
  cards: readonly Pick<Card, "questionImage" | "answerImage">[],
): Set<string> {
  return new Set(
    cards.flatMap((card) =>
      [card.questionImage, card.answerImage].flatMap((image) =>
        image?.type === "local" ? [image.assetId] : [],
      ),
    ),
  );
}

export function getDraftImage(id: string) {
  return drafts.get(id);
}
export async function getImageAsset(id: string): Promise<ImageAsset | null> {
  return drafts.get(id) ?? (await imageAssets.getItem<ImageAsset>(id));
}

export function createImageDraftSession() {
  const owned = new Set<string>();
  return {
    stage(blob: Blob) {
      const id = createId("image");
      drafts.set(id, { id, blob });
      owned.add(id);
      return id;
    },
    retain(ids: Set<string>) {
      for (const id of owned)
        if (!ids.has(id)) {
          drafts.delete(id);
          owned.delete(id);
        }
    },
    release() {
      for (const id of owned) drafts.delete(id);
      owned.clear();
    },
  };
}
