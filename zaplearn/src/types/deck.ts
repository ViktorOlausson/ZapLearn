import { z } from "zod";

import { stableHash } from "@/lib/hash";

export const SCHEMA_VERSION = 1;

const requiredText = (label: string) =>
  z
    .string({ error: `${label} must be text` })
    .trim()
    .min(1, `${label} is required`);
const optionalText = z.string().trim().min(1);

export const DifficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const CardSchema = z.object({
  id: z.string().min(1),
  question: requiredText("Question"),
  answer: requiredText("Answer"),
  category: optionalText.optional(),
  tags: z.array(optionalText).default([]),
  difficulty: DifficultySchema.default(2),
});

export const ImportedCardSchema = CardSchema.partial({ id: true }).transform(
  (card) => ({
    ...card,
    id: card.id ?? stableHash(`${card.question}\u0000${card.category ?? ""}`),
    tags: [...new Set(card.tags)],
  }),
);

export const DeckSourceSchema = z.object({
  type: z.enum(["import", "seed", "url", "local"]),
  url: z.string().url().optional(),
  etag: z.string().optional(),
  readOnly: z.boolean().optional(),
});

export const ImportedDeckSchema = z.object({
  id: z.string().min(1).optional(),
  title: requiredText("Title"),
  lang: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Use a language tag such as sv or sv-SE")
    .optional(),
  cards: z
    .array(ImportedCardSchema)
    .min(1, "A deck must contain at least one card"),
  schemaVersion: z.number().int().positive().optional(),
  source: DeckSourceSchema.optional(),
});

export const DeckSchema = z.object({
  id: z.string().min(1),
  title: requiredText("Title"),
  lang: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Use a language tag such as sv or sv-SE")
    .optional(),
  cards: z.array(CardSchema),
  schemaVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  source: DeckSourceSchema.optional(),
});

export type Card = z.infer<typeof CardSchema>;
export type DeckSource = z.infer<typeof DeckSourceSchema>;
export type Deck = z.infer<typeof DeckSchema>;
export type ImportedDeck = z.infer<typeof ImportedDeckSchema>;

export type DeckParseResult =
  { ok: true; deck: ImportedDeck } | { ok: false; errors: string[] };

export function formatZodIssues(issues: z.core.$ZodIssue[]): string[] {
  return issues.map((issue) => {
    if (issue.path[0] === "cards" && typeof issue.path[1] === "number") {
      const property = issue.path.slice(2).join(".");
      return `Card ${issue.path[1] + 1}${property ? ` · ${property}` : ""}: ${issue.message}`;
    }
    const path = issue.path.length ? issue.path.join(".") : "deck";
    return `${path}: ${issue.message}`;
  });
}

export function parseDeckFile(jsonText: string): DeckParseResult {
  let input: unknown;
  try {
    input = JSON.parse(jsonText);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Invalid JSON";
    return { ok: false, errors: [`Could not read JSON: ${detail}`] };
  }

  const result = ImportedDeckSchema.safeParse(input);
  return result.success
    ? { ok: true, deck: result.data }
    : { ok: false, errors: formatZodIssues(result.error.issues) };
}
