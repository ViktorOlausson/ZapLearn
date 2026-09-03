import { toast } from "sonner";

import {
  fetchDeckFromUrl,
  materializeDeck,
} from "@/features/decks/deckService";
import { stableHash } from "@/lib/hash";
import type { Deck } from "@/types/deck";

type RuntimeConfig = { deckUrl?: string };

export async function loadRuntimeSeed(
  save: (deck: Deck) => Promise<void>,
): Promise<void> {
  try {
    const response = await fetch("/runtime/config.json", { cache: "no-store" });
    if (!response.ok) return;
    const config = (await response.json()) as RuntimeConfig;
    if (!config.deckUrl) return;
    const result = await fetchDeckFromUrl(config.deckUrl);
    if (!result.ok || result.unchanged) {
      if (!result.ok)
        toast.message("Seed deck unavailable", {
          description: result.errors[0],
        });
      return;
    }
    const deck = materializeDeck(
      {
        ...result.deck,
        id: `seed-${stableHash(config.deckUrl)}`,
      },
      "new",
      undefined,
      {
        type: "seed",
        url: new URL(config.deckUrl, window.location.href).href,
        etag: result.etag,
        readOnly: true,
      },
    );
    await save(deck);
  } catch {
    toast.message("Seed deck unavailable", {
      description: "You can still import and study local decks.",
    });
  }
}
