import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MultipleChoiceCard } from "@/types/deck";

export function MultipleChoiceQuestion({
  card,
  options,
  selectedOption,
  disabled = false,
  onSelect,
}: {
  card: MultipleChoiceCard;
  options: readonly string[];
  selectedOption?: string;
  disabled?: boolean;
  onSelect: (option: string) => void;
}) {
  const answered = selectedOption !== undefined;
  const correct = selectedOption === card.answer;

  return (
    <section className="w-full max-w-3xl rounded-2xl border bg-card p-5 shadow-lg sm:p-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
        Multiple choice
      </p>
      <h2 className="mt-4 min-w-0 text-xl font-semibold leading-relaxed [overflow-wrap:anywhere] sm:text-3xl">
        {card.question}
      </h2>
      <div className="mt-7 grid gap-3" aria-label="Answer options">
        {options.map((option, index) => {
          const isSelected = selectedOption === option;
          const isCorrect = option === card.answer;
          const showCorrect = answered && isCorrect;
          const showIncorrect = answered && isSelected && !isCorrect;
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
      <div className="mt-6 min-h-14" aria-live="polite" aria-atomic="true">
        {answered && correct && (
          <p className="font-semibold text-success">Correct!</p>
        )}
        {answered && !correct && (
          <div>
            <p className="font-semibold text-destructive">Incorrect.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Correct answer:{" "}
              <strong className="text-foreground">{card.answer}</strong>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
