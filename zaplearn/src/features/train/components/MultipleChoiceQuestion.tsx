import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StudyImage } from "@/components/common/StudyImage";
import { matchesCorrectAnswers } from "@/features/train/multipleChoice";
import { cn } from "@/lib/utils";
import { correctAnswers, type MultipleChoiceCard } from "@/types/deck";

export function MultipleChoiceQuestion({
  card,
  options,
  selectedOptions,
  submitted,
  onSubmit,
  onClear,
  disabled = false,
  onSelect,
}: {
  card: MultipleChoiceCard;
  options: readonly string[];
  selectedOptions: readonly string[];
  submitted: boolean;
  onSubmit: () => void;
  onClear?: () => void;
  disabled?: boolean;
  onSelect: (option: string) => void;
}) {
  const answered = submitted;
  const multiple = card.answers !== undefined;
  const answers = correctAnswers(card);
  const correct = matchesCorrectAnswers(selectedOptions, answers);

  return (
    <section className="w-full max-w-3xl rounded-2xl border bg-card p-5 shadow-lg sm:p-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
        Multiple choice
      </p>
      {card.questionImage && <StudyImage image={card.questionImage} />}
      <h2
        id="choice-question"
        className="mt-4 min-w-0 text-xl font-semibold leading-relaxed [overflow-wrap:anywhere] sm:text-3xl"
      >
        {card.question}
      </h2>
      {multiple && (
        <p className="mt-3" id="choice-instructions">
          Select all answers that apply.
        </p>
      )}
      <div className="mt-7 grid gap-3" aria-label="Answer options">
        {options.map((option, index) => {
          const isSelected = selectedOptions.includes(option);
          const isCorrect = answers.includes(option);
          const showCorrect = answered && isCorrect;
          const showIncorrect = answered && isSelected && !isCorrect;
          if (multiple)
            return (
              <label
                key={option}
                className={cn(
                  "flex min-h-12 min-w-0 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 [overflow-wrap:anywhere]",
                  isSelected && "ring-1 ring-foreground/30",
                  showCorrect && "border-success bg-success/10",
                  showIncorrect && "border-destructive bg-destructive/10",
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={answered || disabled}
                  onChange={() => onSelect(option)}
                  aria-label={`Option ${index + 1}: ${option}`}
                  aria-describedby="choice-question choice-instructions"
                  className="size-5 shrink-0 accent-primary"
                />
                <span className="min-w-0 flex-1">{option}</span>
                {answered && isCorrect && (
                  <span className="text-sm text-success">
                    ✓{" "}
                    {isSelected ? "Correct selected" : "Missed correct answer"}
                  </span>
                )}
                {showIncorrect && (
                  <span className="text-sm text-destructive">
                    ✕ Incorrect selected
                  </span>
                )}
              </label>
            );
          return (
            <Button
              key={option}
              type="button"
              variant="outline"
              disabled={answered || disabled}
              aria-pressed={isSelected}
              aria-label={`Option ${index + 1}: ${option}`}
              onClick={() => onSelect(option)}
              className={cn(
                "h-auto min-h-12 w-full justify-start whitespace-normal px-4 py-3 text-left [overflow-wrap:anywhere] disabled:opacity-100",
                showCorrect &&
                  "border-success bg-success/10 text-foreground ring-1 ring-success/30",
                showIncorrect &&
                  "border-destructive bg-destructive/10 text-foreground ring-1 ring-destructive/30",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                {showCorrect ? (
                  <Check className="size-4 text-success" aria-hidden="true" />
                ) : showIncorrect ? (
                  <X className="size-4 text-destructive" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0 flex-1">{option}</span>
              {showCorrect && (
                <span className="text-sm text-success">Correct</span>
              )}
              {showIncorrect && (
                <span className="text-sm text-destructive">Selected</span>
              )}
            </Button>
          );
        })}
      </div>
      {multiple && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p aria-live="polite">{selectedOptions.length} selected</p>
          <Button
            variant="outline"
            disabled={answered || disabled || !selectedOptions.length}
            onClick={onClear}
          >
            Clear selection
          </Button>
        </div>
      )}
      {multiple && (
        <Button
          className="mt-5 w-full sm:w-auto"
          disabled={answered || disabled || selectedOptions.length === 0}
          onClick={onSubmit}
        >
          Submit answer
        </Button>
      )}
      <div
        className="mt-6 min-h-14 [overflow-wrap:anywhere]"
        aria-live="polite"
        aria-atomic="true"
      >
        {answered && multiple && (
          <p className="sr-only">
            {options
              .filter(
                (option) =>
                  selectedOptions.includes(option) || answers.includes(option),
              )
              .map(
                (option) =>
                  `${option}: ${answers.includes(option) ? (selectedOptions.includes(option) ? "Correct selected" : "Missed correct answer") : "Incorrect selected"}`,
              )
              .join(". ")}
          </p>
        )}
        {answered && correct && (
          <p className="font-semibold text-success">Correct!</p>
        )}
        {answered && !correct && (
          <div>
            <p className="font-semibold text-destructive">Incorrect.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {multiple ? "Correct answers:" : "Correct answer:"}{" "}
              <strong className="text-foreground">{answers.join(", ")}</strong>
            </p>
          </div>
        )}
      </div>
      {answered && card.answerImage && <StudyImage image={card.answerImage} />}
    </section>
  );
}
