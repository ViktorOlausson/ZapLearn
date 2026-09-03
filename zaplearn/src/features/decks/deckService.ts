import { createId } from "@/lib/hash";
import {
  parseDeckFile,
  SCHEMA_VERSION,
  type Deck,
  type DeckSource,
  type ImportedDeck,
} from "@/types/deck";

export type ImportStrategy = "new" | "replace";
export const MAX_DECK_FILE_SIZE = 2 * 1024 * 1024;

type LimitedTextResult =
  { ok: true; text: string } | { ok: false; errors: string[] };

async function readResponseTextWithLimit(
  response: Response,
): Promise<LimitedTextResult> {
  const tooLarge = {
    ok: false as const,
    errors: ["The deck response must be smaller than 2 MB."],
  };
  if (!response.body) {
    const body = await response.blob();
    return body.size > MAX_DECK_FILE_SIZE
      ? tooLarge
      : { ok: true, text: await body.text() };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_DECK_FILE_SIZE) {
      await reader.cancel();
      return tooLarge;
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return { ok: true, text };
}

export function materializeDeck(
  imported: ImportedDeck,
  strategy: ImportStrategy,
  existing?: Deck,
  source: DeckSource = { type: "import" },
): Deck {
  const now = new Date().toISOString();
  const id =
    strategy === "replace" && existing
      ? existing.id
      : (imported.id ?? createId("deck"));
  return {
    ...imported,
    id,
    schemaVersion: SCHEMA_VERSION,
    createdAt: strategy === "replace" && existing ? existing.createdAt : now,
    updatedAt: now,
    source,
  };
}

export function createDeck(title: string, lang?: string): Deck {
  const now = new Date().toISOString();
  return {
    id: createId("deck"),
    title: title.trim(),
    lang: lang?.trim() || undefined,
    cards: [],
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    source: { type: "local" },
  };
}

export function duplicateDeck(deck: Deck): Deck {
  const now = new Date().toISOString();
  return {
    ...deck,
    id: createId("deck"),
    title: `${deck.title} copy`,
    cards: deck.cards.map((card) => ({ ...card, id: createId("card") })),
    createdAt: now,
    updatedAt: now,
    source: { type: "local" },
  };
}

export async function readDeckFile(file: File) {
  if (
    !file.name.toLowerCase().endsWith(".json") &&
    file.type !== "application/json"
  ) {
    return { ok: false as const, errors: ["Choose a JSON deck file."] };
  }
  if (file.size > MAX_DECK_FILE_SIZE) {
    return {
      ok: false as const,
      errors: ["The deck file must be smaller than 2 MB."],
    };
  }
  try {
    return parseDeckFile(await file.text());
  } catch {
    return {
      ok: false as const,
      errors: ["The selected file could not be read."],
    };
  }
}

export async function fetchDeckFromUrl(url: string, etag?: string) {
  try {
    const resolvedUrl = new URL(url, window.location.href);
    if (!["http:", "https:"].includes(resolvedUrl.protocol)) {
      return {
        ok: false as const,
        errors: ["Deck URLs must use HTTP or HTTPS."],
      };
    }
    const response = await fetch(resolvedUrl.href, {
      headers: etag ? { "If-None-Match": etag } : undefined,
    });
    if (response.status === 304)
      return { ok: true as const, unchanged: true as const };
    if (!response.ok)
      return {
        ok: false as const,
        errors: [`Could not load deck (${response.status}).`],
      };
    const declaredSize = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_DECK_FILE_SIZE) {
      return {
        ok: false as const,
        errors: ["The deck response must be smaller than 2 MB."],
      };
    }
    const body = await readResponseTextWithLimit(response);
    if (!body.ok) return body;
    const parsed = parseDeckFile(body.text);
    return parsed.ok
      ? {
          ok: true as const,
          unchanged: false as const,
          deck: parsed.deck,
          etag: response.headers.get("etag") ?? undefined,
        }
      : parsed;
  } catch {
    return {
      ok: false as const,
      errors: ["Could not load the deck. Check the URL and CORS policy."],
    };
  }
}
