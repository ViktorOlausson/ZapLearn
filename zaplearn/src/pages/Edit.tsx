import { useEffect, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { DeckEditor } from "@/features/decks/components/DeckEditor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createId } from "@/lib/hash";
import { useDeckStore } from "@/features/decks/deckStore";
import type { Deck } from "@/types/deck";

export function Edit() {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const deck = useDeckStore((state) =>
    state.decks.find((item) => item.id === deckId),
  );
  const save = useDeckStore((state) => state.save);
  const loading = useDeckStore((state) => state.loading);
  const [activeDeck, setActiveDeck] = useState<Deck | undefined>(deck);
  useEffect(() => setActiveDeck(deck), [deck]);

  const availableDeck = activeDeck ?? deck;
  if (loading)
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  if (!availableDeck)
    return (
      <div>
        <h1 className="text-2xl font-bold">Deck not found</h1>
        <Button className="mt-4" asChild>
          <Link to="/">Back to decks</Link>
        </Button>
      </div>
    );
  const currentDeck = availableDeck;
  async function saveChanges(values: {
    title: string;
    lang?: string;
    cards: Deck["cards"];
  }) {
    const now = new Date().toISOString();
    const fork = currentDeck.source?.readOnly;
    const next: Deck = {
      ...currentDeck,
      ...values,
      lang: values.lang || undefined,
      cards: values.cards.map((card) => ({
        ...card,
        category: card.category?.trim() || undefined,
        tags: [...new Set(card.tags.map((tag) => tag.trim()).filter(Boolean))],
      })),
      id: fork ? createId("deck") : currentDeck.id,
      source: fork ? { type: "local" } : currentDeck.source,
      createdAt: fork ? now : currentDeck.createdAt,
      updatedAt: now,
    };
    await save(next);
    setActiveDeck(next);
    if (fork) {
      toast.success("Created an editable local copy.");
      navigate(`/edit/${next.id}`, { replace: true });
    }
  }
  return (
    <section className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" className="mb-4">
        <Link to="/manage">
          <ArrowLeft /> Manage decks
        </Link>
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Deck editor</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {currentDeck.title}
          </h1>
        </div>
        {currentDeck.cards.length > 0 && (
          <Button asChild>
            <Link to={`/train/${currentDeck.id}`}>
              <Play /> Study deck
            </Link>
          </Button>
        )}
      </div>
      {currentDeck.source?.readOnly && (
        <p className="mt-2 rounded-md bg-muted p-3 text-sm">
          This seed deck is read-only. Your first edit creates a local copy.
        </p>
      )}
      <div className="mt-6">
        <DeckEditor deck={currentDeck} onSave={saveChanges} />
      </div>
    </section>
  );
}
