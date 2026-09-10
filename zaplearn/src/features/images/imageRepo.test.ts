// @vitest-environment node
import "fake-indexeddb/auto";
import localforage from "localforage";
import { beforeEach, describe, expect, it } from "vitest";
import { createDeck, duplicateDeck } from "@/features/decks/deckService";
import { deleteDeck, getDeck, saveDeck } from "@/features/decks/deckRepo";
import {
  createImageDraftSession,
  getDraftImage,
  getImageAsset,
  imageAssets,
} from "@/features/images/imageRepo";

const deckStore = localforage.createInstance({
  name: "zaplearn",
  driver: localforage.INDEXEDDB,
  storeName: "decks",
});
beforeEach(async () => {
  await deckStore.clear();
  await imageAssets.clear();
});

describe("local image persistence and lifecycle", () => {
  it("saves Blobs with cards, preserves shared assets, and removes the final unused asset", async () => {
    const session = createImageDraftSession();
    const id = session.stage(new Blob(["raster bytes"], { type: "image/png" }));
    const deck = {
      ...createDeck("Pictures"),
      cards: [
        {
          id: "card-one",
          question: "Q",
          answer: "A",
          difficulty: 2 as const,
          tags: [],
          questionImage: {
            type: "local" as const,
            assetId: id,
            alt: "Picture",
          },
        },
      ],
    };
    await saveDeck(deck);
    session.release();
    expect(getDraftImage(id)).toBeUndefined();
    expect((await getImageAsset(id))?.blob.type).toBe("image/png");
    expect((await getDeck(deck.id))?.cards[0].questionImage).toEqual(
      deck.cards[0].questionImage,
    );
    const copy = duplicateDeck(deck);
    await saveDeck(copy);
    await deleteDeck(deck.id);
    expect(await getImageAsset(id)).not.toBeNull();
    await deleteDeck(copy.id);
    expect(await getImageAsset(id)).toBeNull();
  });
  it("replaces an image without changing card ID and removes the old unreferenced Blob", async () => {
    const session = createImageDraftSession();
    const first = session.stage(new Blob(["first"], { type: "image/png" }));
    const next = session.stage(new Blob(["next"], { type: "image/png" }));
    const deck = {
      ...createDeck("Replace"),
      cards: [
        {
          id: "stable-card",
          question: "Q",
          answer: "A",
          tags: [],
          difficulty: 2 as const,
          answerImage: {
            type: "local" as const,
            assetId: first,
            alt: "Diagram",
          },
        },
      ],
    };
    await saveDeck(deck);
    deck.cards[0].answerImage.assetId = next;
    await saveDeck(deck);
    session.release();
    expect(await getImageAsset(first)).toBeNull();
    expect(await getImageAsset(next)).not.toBeNull();
    expect((await getDeck(deck.id))?.cards[0].id).toBe("stable-card");
  });
  it("rolls back a deck and new images together when any asset is missing", async () => {
    const session = createImageDraftSession();
    const id = session.stage(new Blob(["new"], { type: "image/png" }));
    const deck = {
      ...createDeck("Atomic"),
      cards: [
        {
          id: "one",
          question: "Q",
          answer: "A",
          tags: [],
          difficulty: 2 as const,
          questionImage: { type: "local" as const, assetId: id, alt: "New" },
          answerImage: {
            type: "local" as const,
            assetId: "image-missing",
            alt: "Missing",
          },
        },
      ],
    };
    await expect(saveDeck(deck)).rejects.toThrow("local image is missing");
    session.release();
    expect(await getDeck(deck.id)).toBeNull();
    expect(await getImageAsset(id)).toBeNull();
  });
  it("releases removed and cancelled drafts without storing them", async () => {
    const session = createImageDraftSession();
    const first = session.stage(new Blob(["first"]));
    const retained = session.stage(new Blob(["second"]));
    session.retain(new Set([retained]));
    expect(getDraftImage(first)).toBeUndefined();
    expect(getDraftImage(retained)).toBeDefined();
    session.release();
    expect(getDraftImage(retained)).toBeUndefined();
    expect(await imageAssets.keys()).toEqual([]);
  });
});
