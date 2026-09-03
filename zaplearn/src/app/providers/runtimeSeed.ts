import { toast } from "sonner";

import {
  fetchDeckFromUrl,
  materializeDeck,
} from "@/features/decks/deckService";
import { stableHash } from "@/lib/hash";
import type { Deck } from "@/types/deck";
import { z } from "zod";

const RuntimeConfigSchema = z
  .object({ deckUrl: z.string().trim().min(1).max(2048).optional() })
  .strict();

export async function loadRuntimeSeed(
  save: (deck: Deck) => Promise<void>,
): Promise<void> {
  try {
    const response = await fetch("/runtime/config.json", { cache: "no-store" });
    if (!response.ok) return;
    const parsedConfig = RuntimeConfigSchema.safeParse(await response.json());
    if (!parsedConfig.success) throw new Error("Invalid runtime configuration");
    const config = parsedConfig.data;
    if (!config.deckUrl) return;
    const deckUrl = new URL(config.deckUrl, window.location.href);
    if (!["http:", "https:"].includes(deckUrl.protocol)) {
      throw new Error("Unsupported seed deck URL protocol");
    }
    const result = await fetchDeckFromUrl(deckUrl.href);
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
        id: `seed-${stableHash(deckUrl.href)}`,
      },
      "new",
      undefined,
      {
        type: "seed",
        url: deckUrl.href,
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
