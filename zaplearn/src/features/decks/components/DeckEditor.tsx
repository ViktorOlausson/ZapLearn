import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Plus, Search, Trash2, X } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createId } from "@/lib/hash";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  DifficultySchema,
  isMultipleChoiceCard,
  type Card,
  type Deck,
  type MultipleChoiceCard,
} from "@/types/deck";

const EditorCardShape = {
  id: z.string().min(1),
  question: z.string().trim().min(1, "Question is required"),
  answer: z.string().trim().min(1, "Answer is required"),
  category: z.string().trim().optional(),
  tags: z.array(z.string()),
  difficulty: DifficultySchema,
};
const EditorFlashcardSchema = z.object({
  ...EditorCardShape,
  type: z.literal("flashcard").optional(),
});
const EditorMultipleChoiceSchema = z
  .object({
    ...EditorCardShape,
    type: z.literal("multiple-choice"),
    options: z
      .array(z.string().trim().min(1, "Option cannot be empty"))
      .min(2, "Add at least 2 answer options")
      .max(6, "Use no more than 6 answer options"),
  })
  .superRefine((card, context) => {
    if (new Set(card.options).size !== card.options.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Answer options must be unique",
      });
    }
    if (card.options.filter((option) => option === card.answer).length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["answer"],
        message: "Choose exactly one option as the correct answer",
      });
    }
  });
const EditorCardSchema = z.discriminatedUnion("type", [
  EditorFlashcardSchema,
  EditorMultipleChoiceSchema,
]);
const EditorSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  lang: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Use sv or sv-SE")
    .optional()
    .or(z.literal("")),
  cards: z.array(EditorCardSchema),
});
type EditorValues = z.infer<typeof EditorSchema>;

function emptyCard(): Card {
  return {
    id: createId("card"),
    question: "",
    answer: "",
    category: "",
    tags: [],
    difficulty: 2 as const,
  };
}

function baseCard(card: Card) {
  return {
    id: card.id,
    question: card.question,
    answer: card.answer,
    category: card.category,
    tags: card.tags,
    difficulty: card.difficulty,
  };
}

function cardMatches(
  card: Partial<EditorValues["cards"][number]>,
  query: string,
): boolean {
  if (!query) return true;
  return [
    card.question,
    card.answer,
    card.category,
    ...(card.tags ?? []),
    String(card.difficulty ?? ""),
  ]
    .join(" ")
    .toLowerCase()
    .includes(query.toLowerCase());
}

function fieldErrorMessage(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const message = Reflect.get(value, "message");
  return typeof message === "string" ? message : undefined;
}

export function DeckEditor({
  deck,
  onSave,
}: {
  deck: Deck;
  onSave: (values: EditorValues) => Promise<void>;
}) {
  const [saveState, setSaveState] = useState<
    "saved" | "saving" | "invalid" | "error"
  >("saved");
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const debouncedQuery = useDebouncedValue(query, 300);
  const form = useForm<EditorValues>({
    resolver: zodResolver(EditorSchema),
    defaultValues: {
      title: deck.title,
      lang: deck.lang ?? undefined,
      cards: deck.cards,
    },
  });
  const { control, register, handleSubmit, formState, reset } = form;
  const { fields, append, insert, remove } = useFieldArray({
    control,
    name: "cards",
    keyName: "fieldId",
  });
  const values = useWatch({ control });
  const filteredIndexes = useMemo(
    () =>
      fields.flatMap((field, index) =>
        cardMatches(values.cards?.[index] ?? field, debouncedQuery) &&
        (difficulty === "all" ||
          String(values.cards?.[index]?.difficulty ?? field.difficulty) ===
            difficulty)
          ? [index]
          : [],
      ),
    [debouncedQuery, difficulty, fields, values.cards],
  );

  const persist = useCallback(async () => {
    setSaveState("saving");
    await handleSubmit(
      async (valid) => {
        try {
          await onSave(valid);
          reset(valid);
          setSaveState("saved");
        } catch {
          setSaveState("error");
        }
      },
      () => setSaveState("invalid"),
    )();
  }, [handleSubmit, onSave, reset]);

  function changeCardType(
    index: number,
    type: "flashcard" | "multiple-choice",
  ) {
    const card = form.getValues(`cards.${index}`);
    if (type === "multiple-choice") {
      const options = isMultipleChoiceCard(card)
        ? card.options
        : card.answer.trim()
          ? [card.answer]
          : [];
      form.setValue(
        `cards.${index}`,
        { ...baseCard(card), type: "multiple-choice", options },
        { shouldDirty: true, shouldValidate: true },
      );
      return;
    }
    form.setValue(
      `cards.${index}`,
      { ...baseCard(card), type: "flashcard" },
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function updateOption(index: number, optionIndex: number, value: string) {
    const card = form.getValues(`cards.${index}`);
    if (!isMultipleChoiceCard(card)) return;
    const previous = card.options[optionIndex];
    const options = card.options.map((option, currentIndex) =>
      currentIndex === optionIndex ? value : option,
    );
    form.setValue(
      `cards.${index}`,
      {
        ...card,
        options,
        answer: card.answer === previous ? value : card.answer,
      },
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function addOption(index: number) {
    const card = form.getValues(`cards.${index}`);
    if (!isMultipleChoiceCard(card) || card.options.length >= 6) return;
    form.setValue(`cards.${index}.options`, [...card.options, ""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function removeOption(index: number, optionIndex: number) {
    const card = form.getValues(`cards.${index}`);
    if (!isMultipleChoiceCard(card)) return;
    const removed = card.options[optionIndex];
    const options = card.options.filter(
      (_, currentIndex) => currentIndex !== optionIndex,
    );
    form.setValue(
      `cards.${index}`,
      {
        ...card,
        options,
        answer: card.answer === removed ? "" : card.answer,
      },
      { shouldDirty: true, shouldValidate: true },
    );
  }

  useEffect(() => {
    if (!formState.isDirty) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => void persist(), 400);
    return () => window.clearTimeout(timer);
  }, [formState.isDirty, persist, values]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void persist();
      }}
      onBlur={(event) => {
        if (
          formState.isDirty &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          void persist();
      }}
      className="space-y-7"
    >
      <div className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-start">
        <div className="grid gap-1.5">
          <label htmlFor="deck-title" className="text-sm font-medium">
            Deck title
          </label>
          <Input
            id="deck-title"
            {...register("title")}
            aria-invalid={Boolean(formState.errors.title)}
          />
          <p className="text-sm text-destructive">
            {formState.errors.title?.message}
          </p>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="deck-language" className="text-sm font-medium">
            Language
          </label>
          <Input id="deck-language" placeholder="sv" {...register("lang")} />
          <p className="text-sm text-destructive">
            {formState.errors.lang?.message}
          </p>
        </div>
        <span
          data-testid="save-status"
          className="mt-8 inline-flex min-w-24 justify-end text-sm text-muted-foreground"
          aria-live="polite"
        >
          {saveState === "saving"
            ? "Saving…"
            : saveState === "invalid"
              ? "Fix validation errors"
              : saveState === "error"
                ? "Unable to save"
                : "Saved"}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-7">
        <div>
          <h2 className="text-xl font-semibold">Cards</h2>
          <p className="text-sm text-muted-foreground">
            Changes are automatically saved.
          </p>
        </div>
        <Button type="button" onClick={() => append(emptyCard())}>
          <Plus /> Add card
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search question, answer, category, or tags"
            aria-label="Search cards"
          />
        </div>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-full" aria-label="Filter by difficulty">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All difficulties</SelectItem>
            <SelectItem value="1">Easy</SelectItem>
            <SelectItem value="2">Medium</SelectItem>
            <SelectItem value="3">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {fields.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/50 px-5 py-12 text-center">
          <h3 className="font-semibold">This deck has no cards</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Add a question and answer before starting a study session.
          </p>
          <Button
            className="mt-5"
            type="button"
            onClick={() => append(emptyCard())}
          >
            <Plus /> Add first card
          </Button>
        </div>
      ) : filteredIndexes.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-muted-foreground">
          No cards match these filters.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredIndexes.map((index) => (
            <article
              className="rounded-xl border p-4"
              key={fields[index].fieldId}
            >
              {(() => {
                const draft = (values.cards?.[index] ?? fields[index]) as
                  | Partial<Card>
                  | (Partial<MultipleChoiceCard> & { options?: string[] });
                const cardType =
                  draft.type === "multiple-choice"
                    ? "multiple-choice"
                    : "flashcard";
                const options =
                  cardType === "multiple-choice" && "options" in draft
                    ? (draft.options ?? [])
                    : [];
                const cardErrors = formState.errors.cards?.[index];
                const optionsError =
                  cardErrors && "options" in cardErrors
                    ? fieldErrorMessage(cardErrors.options)
                    : undefined;
                return (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">Card {index + 1}</Badge>
                        {cardType === "multiple-choice" && (
                          <Badge variant="outline">Multiple choice</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            insert(index + 1, {
                              id: createId("card"),
                              question:
                                values.cards?.[index]?.question ??
                                fields[index].question,
                              answer:
                                values.cards?.[index]?.answer ??
                                fields[index].answer,
                              category:
                                values.cards?.[index]?.category ??
                                fields[index].category,
                              tags:
                                values.cards?.[index]?.tags ??
                                fields[index].tags,
                              difficulty:
                                values.cards?.[index]?.difficulty ??
                                fields[index].difficulty,
                              ...(cardType === "multiple-choice"
                                ? {
                                    type: "multiple-choice" as const,
                                    options,
                                  }
                                : { type: "flashcard" as const }),
                            })
                          }
                          aria-label={`Duplicate card ${index + 1}`}
                          title="Duplicate card"
                        >
                          <Copy />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          aria-label={`Delete card ${index + 1}`}
                          title="Delete card"
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <div className="max-w-xs">
                        <label className="text-sm font-medium">Card type</label>
                        <Select
                          value={cardType}
                          onValueChange={(value) =>
                            changeCardType(
                              index,
                              value as "flashcard" | "multiple-choice",
                            )
                          }
                        >
                          <SelectTrigger
                            className="w-full"
                            aria-label={`Card ${index + 1} type`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flashcard">Flashcard</SelectItem>
                            <SelectItem value="multiple-choice">
                              Multiple choice
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label
                          className="text-sm font-medium"
                          htmlFor={`question-${index}`}
                        >
                          Question
                        </label>
                        <Textarea
                          id={`question-${index}`}
                          {...register(`cards.${index}.question`)}
                          aria-invalid={Boolean(
                            formState.errors.cards?.[index]?.question,
                          )}
                        />
                        <p className="text-sm text-destructive">
                          {formState.errors.cards?.[index]?.question?.message}
                        </p>
                      </div>
                      {cardType === "flashcard" ? (
                        <div>
                          <label
                            className="text-sm font-medium"
                            htmlFor={`answer-${index}`}
                          >
                            Answer
                          </label>
                          <Textarea
                            id={`answer-${index}`}
                            {...register(`cards.${index}.answer`)}
                            aria-invalid={Boolean(
                              formState.errors.cards?.[index]?.answer,
                            )}
                          />
                          <p className="text-sm text-destructive">
                            {formState.errors.cards?.[index]?.answer?.message}
                          </p>
                        </div>
                      ) : (
                        <fieldset className="rounded-xl border bg-muted/20 p-4">
                          <legend className="px-1 text-sm font-medium">
                            Answer options
                          </legend>
                          <p className="mb-3 text-sm text-muted-foreground">
                            Add 2–6 options and select the one correct answer.
                          </p>
                          <div className="grid gap-2">
                            {options.map((option, optionIndex) => (
                              <div
                                className="flex min-w-0 items-center gap-2"
                                key={`${fields[index].fieldId}-option-${optionIndex}`}
                              >
                                <input
                                  type="radio"
                                  name={`correct-option-${fields[index].fieldId}`}
                                  checked={
                                    Boolean(option) && draft.answer === option
                                  }
                                  disabled={!option.trim()}
                                  onChange={() =>
                                    form.setValue(
                                      `cards.${index}.answer`,
                                      option,
                                      {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                      },
                                    )
                                  }
                                  aria-label={`Set option ${optionIndex + 1} as correct`}
                                  className="size-4 shrink-0 accent-primary"
                                />
                                <Input
                                  value={option}
                                  onChange={(event) =>
                                    updateOption(
                                      index,
                                      optionIndex,
                                      event.target.value,
                                    )
                                  }
                                  aria-label={`Option ${optionIndex + 1}`}
                                  placeholder={`Answer option ${optionIndex + 1}`}
                                  className="min-w-0"
                                />
                                {Boolean(option) && draft.answer === option && (
                                  <Badge
                                    className="hidden gap-1 sm:inline-flex"
                                    variant="secondary"
                                  >
                                    <Check className="size-3" /> Correct
                                  </Badge>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    removeOption(index, optionIndex)
                                  }
                                  aria-label={`Remove option ${optionIndex + 1}`}
                                >
                                  <X />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            disabled={options.length >= 6}
                            onClick={() => addOption(index)}
                          >
                            <Plus /> Add option
                          </Button>
                          <p className="mt-2 text-sm text-destructive">
                            {optionsError ??
                              formState.errors.cards?.[index]?.answer?.message}
                          </p>
                        </fieldset>
                      )}
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label
                            className="text-sm font-medium"
                            htmlFor={`category-${index}`}
                          >
                            Category
                          </label>
                          <Input
                            id={`category-${index}`}
                            {...register(`cards.${index}.category`)}
                          />
                        </div>
                        <div>
                          <label
                            className="text-sm font-medium"
                            htmlFor={`tags-${index}`}
                          >
                            Tags
                          </label>
                          <Input
                            id={`tags-${index}`}
                            defaultValue={values.cards?.[index]?.tags?.join(
                              ", ",
                            )}
                            onBlur={(event) =>
                              form.setValue(
                                `cards.${index}.tags`,
                                event.target.value
                                  .split(",")
                                  .map((tag) => tag.trim())
                                  .filter(Boolean),
                                { shouldDirty: true },
                              )
                            }
                            placeholder="planning, WBS"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Difficulty
                          </label>
                          <Select
                            value={String(
                              values.cards?.[index]?.difficulty ?? 2,
                            )}
                            onValueChange={(value) =>
                              form.setValue(
                                `cards.${index}.difficulty`,
                                Number(value) as 1 | 2 | 3,
                                { shouldDirty: true },
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Easy</SelectItem>
                              <SelectItem value="2">Medium</SelectItem>
                              <SelectItem value="3">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </article>
          ))}
        </div>
      )}
    </form>
  );
}
