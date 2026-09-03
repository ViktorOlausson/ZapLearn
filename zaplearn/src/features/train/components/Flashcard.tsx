import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { textToSafeLines } from "@/lib/sanitize";
import type { Card } from "@/types/deck";

function CardText({ value }: { value: string }) {
  return (
    <>
      {textToSafeLines(value).map((line, index) => (
        <p key={`${line}-${index}`} className={index ? "mt-3" : undefined}>
          {line || " "}
        </p>
      ))}
    </>
  );
}

export function Flashcard({
  card,
  flipped,
  onFlip,
}: {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Button
      variant="outline"
      className="h-[min(58vh,30rem)] min-h-80 w-full max-w-3xl overflow-hidden rounded-2xl border-border/80 bg-card p-0 text-left shadow-lg transition-shadow hover:border-primary/30 hover:shadow-xl"
      onClick={onFlip}
      aria-label={flipped ? "Show question" : "Show answer"}
    >
      <span className="block h-full w-full [perspective:1200px]">
        <motion.span
          className="relative block h-full w-full"
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
          }
          style={{ transformStyle: "preserve-3d" }}
        >
          <span
            aria-hidden={flipped}
            className="absolute inset-0 flex flex-col justify-center overflow-y-auto p-7 [backface-visibility:hidden] sm:p-12"
          >
            <span className="mb-5 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Question
            </span>
            <span className="text-xl font-medium leading-relaxed sm:text-3xl">
              <CardText value={card.question} />
            </span>
            <span className="mt-8 text-sm text-muted-foreground">
              Press Space, Enter, or tap to reveal
            </span>
          </span>
          <span
            aria-hidden={!flipped}
            className="absolute inset-0 flex flex-col justify-center overflow-y-auto bg-card p-7 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-12"
          >
            <span className="mb-5 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Answer
            </span>
            <span className="text-xl font-medium leading-relaxed sm:text-3xl">
              <CardText value={card.answer} />
            </span>
            {card.category && (
              <span className="mt-8 text-sm text-muted-foreground">
                {card.category}
              </span>
            )}
            {card.tags.length > 0 && (
              <span className="mt-3 text-xs text-muted-foreground">
                {card.tags.map((tag) => `#${tag}`).join("  ")}
              </span>
            )}
          </span>
        </motion.span>
      </span>
    </Button>
  );
}
