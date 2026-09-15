import { z } from "zod";

import { IdSchema } from "@/types/id";

import { stableHash } from "@/lib/hash";
import { isSafeImageSource } from "@/lib/imageSource";

export const SCHEMA_VERSION = 1;
export const MAX_MULTIPLE_CHOICE_OPTIONS = 50;

const requiredText = (label: string) =>
  z
    .string({ error: `${label} must be text` })
    .trim()
    .min(1, `${label} is required`);
const optionalText = z.string().trim().min(1);

export const UrlCardImageSchema = z
  .object({
    type: z.literal("url").optional(),
    src: requiredText("Image URL").max(4096).refine(isSafeImageSource, {
      message:
        "Use an HTTPS image URL or a same-origin path starting with / (no credentials or unsafe schemes)",
    }),
    alt: requiredText("Alternative text").max(2000),
    caption: z.string().trim().max(2000).optional(),
  })
  .strip();

export const LocalCardImageSchema = z
  .object({
    type: z.literal("local"),
    assetId: z
      .string()
      .regex(/^image-[a-zA-Z0-9-]{1,100}$/, "Invalid local image ID"),
    alt: requiredText("Alternative text").max(2000),
    caption: z.string().trim().max(2000).optional(),
  })
  .strip();

export const CardImageSchema = z.discriminatedUnion("type", [
  UrlCardImageSchema,
  LocalCardImageSchema,
]);

export type CardImage = z.infer<typeof CardImageSchema>;

export const DifficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

const cardShape = <T extends z.ZodType>(id: T) => ({
  id,
  question: requiredText("Question"),
  answer: requiredText("Answer"),
  questionImage: CardImageSchema.optional(),
  answerImage: CardImageSchema.optional(),
  category: optionalText.optional(),
  tags: z.array(optionalText).default([]),
  difficulty: DifficultySchema.default(2),
});

function flashcardSchema<T extends z.ZodType>(id: T) {
  return z
    .object({
      ...cardShape(id),
      type: z.literal("flashcard").optional(),
    })
    .strip();
}

export function validateCorrectAnswers(
  card: { answer?: string; answers?: string[]; options: string[] },
  context: z.RefinementCtx,
) {
  const issue = (path: string, message: string) =>
    context.addIssue({ code: "custom", path: [path], message });
  if ((card.answer !== undefined) === (card.answers !== undefined)) {
    issue("answers", "Provide exactly one of answer or answers");
    return;
  }
  if (card.answers !== undefined) {
    if (new Set(card.answers).size !== card.answers.length)
      issue(
        "answers",
        "Multiple-answer questions cannot contain duplicate correct answers",
      );
    for (const answer of card.answers) {
      if (card.options.filter((option) => option === answer).length !== 1)
        issue(
          "answers",
          `Correct answer "${answer}" must appear exactly once in options`,
        );
    }
    if (card.options.every((option) => card.answers?.includes(option)))
      issue(
        "answers",
        "A multiple-answer question must contain at least one incorrect option",
      );
  } else if (
    card.options.filter((option) => option === card.answer).length !== 1
  ) {
    issue("answer", "The correct answer must appear exactly once in options");
  }
}

export function correctAnswers(card: {
  answer?: string;
  answers?: readonly string[];
}): readonly string[] {
  return card.answers ?? (card.answer === undefined ? [] : [card.answer]);
}

function multipleChoiceCardSchema<T extends z.ZodType>(id: T) {
  return z
    .object({
      ...cardShape(id),
      type: z.literal("multiple-choice"),
      answer: requiredText("Answer").optional(),
      answers: z
        .array(requiredText("Correct answer"))
        .min(1, "Select at least 1 correct answer")
        .optional(),
      options: z
        .array(requiredText("Option"), {
          error: "Multiple-choice options are required",
        })
        .min(2, "Multiple-choice cards require at least 2 options")
        .max(
          MAX_MULTIPLE_CHOICE_OPTIONS,
          `Multiple-choice cards support at most ${MAX_MULTIPLE_CHOICE_OPTIONS} options`,
        ),
    })
    .strip()
    .superRefine((card, context) => {
      if (new Set(card.options).size !== card.options.length) {
        context.addIssue({
          code: "custom",
          path: ["options"],
          message: "Multiple-choice options contain duplicates",
        });
      }
      validateCorrectAnswers(card, context);
    });
}

export const FlashcardSchema = flashcardSchema(IdSchema);
export const MultipleChoiceCardSchema = multipleChoiceCardSchema(IdSchema);

export const CardSchema = z.discriminatedUnion("type", [
  FlashcardSchema,
  MultipleChoiceCardSchema,
]);

const ImportedCardBaseSchema = z.discriminatedUnion("type", [
  flashcardSchema(IdSchema.optional()),
  multipleChoiceCardSchema(IdSchema.optional()),
]);

export const ImportedCardSchema = ImportedCardBaseSchema.transform((card) => ({
  ...card,
  id: card.id ?? stableHash(`${card.question}\u0000${card.category ?? ""}`),
  tags: [...new Set(card.tags)],
}));

export const DeckSourceSchema = z
  .object({
    type: z.enum(["import", "seed", "url", "local"]),
    url: z.string().url().optional(),
    etag: z.string().optional(),
    readOnly: z.boolean().optional(),
  })
  .strip();

export const ImportedDeckSchema = z
  .object({
    id: IdSchema.optional(),
    title: requiredText("Title"),
    lang: z
      .string()
      .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Use a language tag such as sv or sv-SE")
      .optional(),
    cards: z
      .array(ImportedCardSchema)
      .min(1, "A deck must contain at least one card")
      .refine(
        (cards) => new Set(cards.map((card) => card.id)).size === cards.length,
        "Cards must have unique IDs; avoid duplicate questions and categories",
      ),
    schemaVersion: z.number().int().positive().optional(),
    source: DeckSourceSchema.optional(),
  })
  .strip();

export const DeckSchema = z
  .object({
    id: IdSchema,
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
  })
  .strip();

export type Card = z.infer<typeof CardSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type MultipleChoiceCard = z.infer<typeof MultipleChoiceCardSchema>;
export type DeckSource = z.infer<typeof DeckSourceSchema>;
export type Deck = z.infer<typeof DeckSchema>;
export type ImportedDeck = z.infer<typeof ImportedDeckSchema>;

export type DeckParseResult =
  { ok: true; deck: ImportedDeck } | { ok: false; errors: string[] };

export function isMultipleChoiceCard(card: Card): card is MultipleChoiceCard {
  return card.type === "multiple-choice";
}

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
