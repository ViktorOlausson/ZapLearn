import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  PartyPopper,
  RotateCcw,
  X,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeckStore } from "@/features/decks/deckStore";
import { useProgressStore } from "@/features/progress/progressStore";
import { Flashcard } from "@/features/train/components/Flashcard";
import { buildStudyQueue } from "@/features/train/repetition";
import type { Card } from "@/types/deck";
import type { ProgressDocument } from "@/types/progress";

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

type SessionStats = { reviewed: number; correct: number; incorrect: number };
const emptyStats: SessionStats = { reviewed: 0, correct: 0, incorrect: 0 };

export function Train() {
  const { deckId = "" } = useParams();
  const [search] = useSearchParams();
  const browse = search.get("mode") === "browse";
  const loadingDecks = useDeckStore((state) => state.loading);
  const deck = useDeckStore((state) =>
    state.decks.find((item) => item.id === deckId),
  );
  const loadProgress = useProgressStore((state) => state.load);
  const grade = useProgressStore((state) => state.grade);
  const [loadedProgress, setLoadedProgress] = useState<ProgressDocument>();
  const [queue, setQueue] = useState<Card[]>([]);
  const [queueReady, setQueueReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [complete, setComplete] = useState(false);
  const [grading, setGrading] = useState(false);
  const [stats, setStats] = useState<SessionStats>(emptyStats);
  const sessionKey = useRef("");

  useEffect(() => {
    if (!deck) return;
    let active = true;
    setQueueReady(false);
    void loadProgress(deck.id).then((document) => {
      if (active) setLoadedProgress(document);
    });
    return () => {
      active = false;
    };
  }, [deck, loadProgress]);

  useEffect(() => {
    if (!deck || !loadedProgress || loadedProgress.deckId !== deck.id) return;
    const nextKey = `${deck.id}:${browse}`;
    if (sessionKey.current === nextKey) return;
    sessionKey.current = nextKey;
    setQueue(browse ? deck.cards : buildStudyQueue(deck, loadedProgress));
    setIndex(0);
    setFlipped(false);
    setComplete(false);
    setStats(emptyStats);
    setQueueReady(true);
  }, [browse, deck, loadedProgress]);

  const card = queue[index];
  const flip = () => setFlipped((value) => !value);
  const move = (delta: number) => {
    setIndex((value) => Math.max(0, Math.min(queue.length - 1, value + delta)));
    setFlipped(false);
  };
  const startReview = () => {
    if (!deck) return;
    setQueue(deck.cards);
    setIndex(0);
    setFlipped(false);
    setComplete(false);
    setStats(emptyStats);
    setQueueReady(true);
  };

  async function answer(correct: boolean) {
    if (!card || browse || !flipped || grading) return;
    setGrading(true);
    try {
      await grade(deckId, card.id, correct);
      setStats((current) => ({
        reviewed: current.reviewed + 1,
        correct: current.correct + (correct ? 1 : 0),
        incorrect: current.incorrect + (correct ? 0 : 1),
      }));
      if (index >= queue.length - 1) {
        setComplete(true);
      } else {
        move(1);
      }
    } catch {
      toast.error("Progress could not be saved", {
        description:
          "The card was not advanced. Check browser storage and try again.",
      });
    } finally {
      setGrading(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target) || !card || complete || event.repeat)
        return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        flip();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      }
      if (!browse && flipped && event.key === "1") void answer(false);
      if (!browse && flipped && event.key === "2") void answer(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (loadingDecks || (deck && !queueReady)) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-6"
        aria-label="Loading study session"
      >
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-[28rem] w-full rounded-2xl" />
        <Skeleton className="mx-auto h-10 w-72" />
      </div>
    );
  }
  if (!deck)
    return (
      <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center">
        <h1 className="text-2xl font-bold">Deck not found</h1>
        <p className="mt-2 text-muted-foreground">
          It may have been deleted from this device.
        </p>
        <Button className="mt-5" asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    );
  if (deck.cards.length === 0)
    return (
      <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center">
        <h1 className="text-2xl font-bold">This deck has no cards</h1>
        <p className="mt-2 text-muted-foreground">
          Add at least one question and answer before studying.
        </p>
        <Button className="mt-5" asChild>
          <Link to={`/edit/${deck.id}`}>Add cards</Link>
        </Button>
      </div>
    );
  if (complete)
    return (
      <section className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PartyPopper />
        </span>
        <h1 className="mt-5 text-3xl font-bold">Session complete</h1>
        <p className="mt-2 text-muted-foreground">
          You reviewed {stats.reviewed}{" "}
          {stats.reviewed === 1 ? "card" : "cards"}.
        </p>
        <div className="mx-auto mt-7 grid max-w-sm grid-cols-2 gap-3">
          <div className="rounded-xl bg-success/10 p-4">
            <p className="text-2xl font-bold text-success">{stats.correct}</p>
            <p className="text-sm text-muted-foreground">Correct</p>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <p className="text-2xl font-bold">{stats.incorrect}</p>
            <p className="text-sm text-muted-foreground">Incorrect</p>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={startReview}>
            <RotateCcw /> Review again
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </div>
      </section>
    );
  if (!card)
    return (
      <section className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check />
        </span>
        <h1 className="mt-5 text-2xl font-bold">You’re caught up!</h1>
        <p className="mt-2 text-muted-foreground">
          No cards are currently due. You can still review the full deck without
          waiting.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={startReview}>Review anyway</Button>
          <Button asChild variant="outline">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </div>
      </section>
    );

  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            className="text-sm text-muted-foreground hover:text-foreground"
            to="/"
          >
            ← All decks
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {deck.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {browse
              ? "Browse freely — progress is not changed"
              : `${queue.length - index} cards remaining`}
          </p>
        </div>
        <div className="flex rounded-lg bg-muted p-1 text-sm">
          <Button asChild size="sm" variant={!browse ? "secondary" : "ghost"}>
            <Link to={`/train/${deck.id}`}>Study</Link>
          </Button>
          <Button asChild size="sm" variant={browse ? "secondary" : "ghost"}>
            <Link to={`/train/${deck.id}?mode=browse`}>Browse</Link>
          </Button>
        </div>
      </div>
      <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          {index + 1} of {queue.length}
        </span>
        <span>{Math.round(((index + 1) / queue.length) * 100)}%</span>
      </div>
      <Progress value={((index + 1) / queue.length) * 100} className="mb-6" />
      <div className="flex justify-center">
        <Flashcard card={card} flipped={flipped} onFlip={flip} />
      </div>
      <div className="mt-6 min-h-12">
        {browse ? (
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => move(-1)}
              disabled={index === 0}
            >
              <ArrowLeft /> Previous
            </Button>
            <Button
              onClick={() => move(1)}
              disabled={index === queue.length - 1}
            >
              Next <ArrowRight />
            </Button>
          </div>
        ) : flipped ? (
          <div className="grid grid-cols-2 gap-3 sm:mx-auto sm:max-w-md">
            <Button
              disabled={grading}
              variant="destructive"
              className="h-12"
              onClick={() => void answer(false)}
            >
              <X /> Incorrect
            </Button>
            <Button
              disabled={grading}
              variant="success"
              className="h-12"
              onClick={() => void answer(true)}
            >
              <Check /> Correct
            </Button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Press <kbd>Space</kbd> or <kbd>Enter</kbd> to reveal the answer
          </p>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Arrow keys navigate · shortcuts pause while typing
      </p>
    </section>
  );
}
