import { useEffect } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { Link } from "react-router";

import { DeckImporter } from "@/components/common/DeckImporter";
import { DeckSummary } from "@/components/common/DeckSummary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateDeckDialog } from "@/features/decks/components/CreateDeckDialog";
import { useDeckStore } from "@/features/decks/deckStore";
import { useProgressStore } from "@/features/progress/progressStore";

export function Home() {
  const decks = useDeckStore((state) => state.decks);
  const loading = useDeckStore((state) => state.loading);
  const error = useDeckStore((state) => state.error);
  const progress = useProgressStore((state) => state.documents);
  const loadProgress = useProgressStore((state) => state.load);

  useEffect(() => {
    decks.forEach((deck) => void loadProgress(deck.id));
  }, [decks, loadProgress]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-8 shadow-sm sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="size-4" /> Your local study space
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Learn smarter with flashcards.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Build focused decks, review what is due, and keep every card and
            learning streak private on this device.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <DeckImporter compact />
            <CreateDeckDialog variant="outline" />
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error} Check that browser storage is available, then reload ZapLearn.
        </div>
      )}

      <section aria-labelledby="your-decks">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Library</p>
            <h2
              id="your-decks"
              className="text-2xl font-semibold tracking-tight"
            >
              Your decks
            </h2>
          </div>
          {decks.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/manage">Manage all</Link>
            </Button>
          )}
        </div>
        {loading ? (
          <div
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Loading decks"
          >
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-xl border bg-card p-6">
                <Skeleton className="mb-5 size-10" />
                <Skeleton className="mb-3 h-5 w-2/3" />
                <Skeleton className="mb-8 h-4 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card/50 px-5 py-12 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
              <BookOpen className="size-6 text-muted-foreground" />
            </span>
            <h3 className="mt-5 text-lg font-semibold">No decks yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Import a JSON deck or create your first deck to start studying.
              Your work is saved automatically in this browser.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <DeckImporter compact />
              <CreateDeckDialog variant="outline" />
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <DeckSummary
                key={deck.id}
                deck={deck}
                progress={progress[deck.id]}
              />
            ))}
          </div>
        )}
      </section>

      {decks.length === 0 && (
        <section>
          <DeckImporter />
        </section>
      )}
    </div>
  );
}
