import { z } from "zod";
import {
  CardImageSchema,
  DeckSchema,
  DifficultySchema,
  ImportedCardSchema,
  correctAnswers,
  type Card,
  type Deck,
} from "@/types/deck";
import { IdSchema } from "@/types/id";
import { MAX_DECK_FILE_SIZE } from "@/features/decks/deckService";

const text = z.string().trim().min(1);
const list = z.array(text);
const fields = {
  question: text.optional(),
  answer: text.optional(),
  answers: list.min(1).optional(),
  type: z.enum(["flashcard", "multiple-choice"]).optional(),
  options: list.optional(),
  category: text.nullable().optional(),
  tags: list.optional(),
  difficulty: DifficultySchema.optional(),
  questionImage: CardImageSchema.nullable().optional(),
  answerImage: CardImageSchema.nullable().optional(),
};
const IncomingCard = z.object({ id: IdSchema.optional(), ...fields }).strict();
const Patch = z
  .object({
    cardId: IdSchema,
    ...fields,
    addOptions: list.optional(),
    removeOptions: list.optional(),
    addCorrectAnswers: list.optional(),
    removeCorrectAnswers: list.optional(),
    addTags: list.optional(),
    removeTags: list.optional(),
  })
  .strict();
const metadata = {
  title: text.optional(),
  lang: DeckSchema.shape.lang,
  deckId: IdSchema.optional(),
  id: IdSchema.optional(),
  schemaVersion: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  source: DeckSchema.shape.source,
};
const Input = z.union([
  z.object({ ...metadata, cards: z.array(IncomingCard) }).strict(),
  z
    .object({
      ...metadata,
      updates: z.array(Patch).default([]),
      addCards: z.array(IncomingCard).default([]),
    })
    .strict(),
]);
type Change = z.infer<typeof IncomingCard>;
export type CardDiff = { before?: Card; after?: Card };
export type UpdatePreview = {
  original: Deck;
  deck: Deck;
  diffs: CardDiff[];
  added: number;
  updated: number;
  unchanged: number;
  deleted: number;
  changed: boolean;
};
export const normalizeQuestion = (question: string) =>
  question.trim().replace(/\s+/g, " ").toLowerCase();
const equal = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => equal(v, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const aa = Object.entries(a).filter(([, v]) => v !== undefined);
    const bb = Object.entries(b).filter(([, v]) => v !== undefined);
    return (
      aa.length === bb.length &&
      aa.every(([k, v]) => equal(v, Reflect.get(b, k)))
    );
  }
  return a === b;
};

function changeCard(before: Card | undefined, change: Change): Card {
  // Only schema-validated known fields enter this shallow construction.
  const result = { ...before, ...change };
  if (change.answer !== undefined && change.answers !== undefined)
    throw new Error("Provide exactly one of answer or answers.");
  if (change.answers !== undefined) delete result.answer;
  if (change.answer !== undefined) delete result.answers;
  if (change.type === "flashcard") {
    delete result.options;
    delete result.answers;
  }
  if (result.options !== undefined && change.type === undefined)
    result.type = "multiple-choice";
  for (const key of ["category", "questionImage", "answerImage"] as const)
    if (result[key] === null) delete result[key];
  return ImportedCardSchema.parse(result);
}
const appendUnique = (
  base: readonly string[],
  added: string[] = [],
  removed: string[] = [],
) => [...new Set([...base, ...added])].filter((v) => !removed.includes(v));

export function previewDeckUpdate(
  existing: Deck,
  json: string,
  mode: "merge" | "replace" = "merge",
): UpdatePreview {
  if (new TextEncoder().encode(json).length > MAX_DECK_FILE_SIZE)
    throw new Error("Update JSON must be smaller than 2 MB.");
  const input = Input.parse(JSON.parse(json));
  if (
    (input.deckId && input.deckId !== existing.id) ||
    (input.id && input.id !== existing.id)
  )
    throw new Error("Incoming deck ID does not match this deck.");
  if (mode === "replace" && !("cards" in input))
    throw new Error("Replace mode requires a cards collection.");
  const ids = new Map(existing.cards.map((card) => [card.id, card]));
  if (ids.size !== existing.cards.length)
    throw new Error("Needs review: existing card IDs are not unique.");
  const questions = new Map<string, Card[]>();
  for (const card of existing.cards) {
    const key = normalizeQuestion(card.question);
    questions.set(key, [...(questions.get(key) ?? []), card]);
  }
  const touched = new Set<string>();
  const incomingQuestions = new Map<string, boolean>();
  const changes = new Map<string, Card>();
  const added: Card[] = [];
  function accept(change: Change, explicit?: Card) {
    const candidates = change.question
      ? (questions.get(normalizeQuestion(change.question)) ?? [])
      : [];
    let before = explicit ?? (change.id ? ids.get(change.id) : undefined);
    if (!before && candidates.length) {
      if (change.id || candidates.length > 1)
        throw new Error(
          `Needs review: question "${change.question}" matches ${candidates.length} existing card(s). Preserve its ID or resolve duplicate questions.`,
        );
      before = candidates[0];
    }
    const after = changeCard(before, {
      ...change,
      id: before?.id ?? change.id,
    });
    const key = normalizeQuestion(after.question);
    const unchangedQuestion = Boolean(
      before && key === normalizeQuestion(before.question),
    );
    // Distinct stable IDs resolve intentional duplicate questions already in the deck.
    if (
      touched.has(after.id) ||
      (incomingQuestions.has(key) &&
        !(unchangedQuestion && incomingQuestions.get(key)))
    )
      throw new Error(
        `Needs review: repeated incoming card "${after.question}".`,
      );
    if (
      (questions.get(key) ?? []).some((card) => card.id !== after.id) &&
      before &&
      key !== normalizeQuestion(before.question)
    )
      throw new Error(
        "Needs review: changed question conflicts with another existing card.",
      );
    if (!before && ids.has(after.id))
      throw new Error(
        "Needs review: generated card ID conflicts with an existing card.",
      );
    touched.add(after.id);
    incomingQuestions.set(key, unchangedQuestion);
    if (before) changes.set(before.id, after);
    else added.push(after);
  }
  if ("cards" in input) input.cards.forEach((card) => accept(card));
  else {
    for (const patch of input.updates) {
      const before = ids.get(patch.cardId);
      if (!before)
        throw new Error(`Needs review: unknown card ID ${patch.cardId}.`);
      const {
        cardId,
        addOptions,
        removeOptions,
        addCorrectAnswers,
        removeCorrectAnswers,
        addTags,
        removeTags,
        ...change
      } = patch;
      if (addOptions || removeOptions)
        change.options = appendUnique(
          change.options ??
            (before.type === "multiple-choice" ? before.options : []),
          addOptions,
          removeOptions,
        );
      if (addCorrectAnswers || removeCorrectAnswers) {
        if (change.answer !== undefined && change.answers !== undefined)
          throw new Error("Provide exactly one of answer or answers.");
        change.answers = appendUnique(
          change.answers ??
            (change.answer ? [change.answer] : correctAnswers(before)),
          addCorrectAnswers,
          removeCorrectAnswers,
        );
        delete change.answer;
      }
      if (addTags || removeTags)
        change.tags = appendUnique(
          change.tags ?? before.tags,
          addTags,
          removeTags,
        );
      accept({ ...change, id: cardId }, before);
    }
    input.addCards.forEach((card) => accept(card));
  }
  const cards = [
    ...existing.cards
      .filter((card) => mode === "merge" || touched.has(card.id))
      .map((card) => changes.get(card.id) ?? card),
    ...added,
  ];
  const deck = DeckSchema.parse({
    ...existing,
    title: input.title ?? existing.title,
    lang: input.lang ?? existing.lang,
    cards,
  });
  if (new Set(cards.map((card) => card.id)).size !== cards.length)
    throw new Error("Needs review: duplicate final card IDs.");
  const diffs: CardDiff[] = existing.cards.flatMap((before) => {
    if (mode === "replace" && !touched.has(before.id)) return [{ before }];
    const after = changes.get(before.id);
    return after && !equal(before, after) ? [{ before, after }] : [];
  });
  diffs.push(...added.map((after) => ({ after })));
  const updated = diffs.filter((d) => d.before && d.after).length;
  const deleted = diffs.filter((d) => !d.after).length;
  return {
    original: existing,
    deck,
    diffs,
    added: added.length,
    updated,
    deleted,
    unchanged: existing.cards.length - updated - deleted,
    changed: !equal(existing, deck),
  };
}

export function describeCardDiff({
  before,
  after,
}: CardDiff): { field: string; old: string; next: string }[] {
  const display = (value: unknown): string =>
    value == null
      ? "None"
      : Array.isArray(value)
        ? value.join("\n")
        : typeof value === "object"
          ? Object.entries(value)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")
          : String(value);
  const keys = [
    "question",
    "type",
    "answer",
    "answers",
    "options",
    "category",
    "tags",
    "difficulty",
    "questionImage",
    "answerImage",
  ] as const;
  return keys.flatMap((field) => {
    const old = before && Reflect.get(before, field);
    const next = after && Reflect.get(after, field);
    return equal(old, next)
      ? []
      : [{ field, old: display(old), next: display(next) }];
  });
}
