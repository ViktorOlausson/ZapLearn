import { useEffect, useState } from "react";
import {
  Copy,
  Database,
  Download,
  Info,
  Pencil,
  Play,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

import { DeckImporter } from "@/components/common/DeckImporter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { downloadJson } from "@/lib/download";
import { CreateDeckDialog } from "@/features/decks/components/CreateDeckDialog";
import { duplicateDeck as makeDeckCopy } from "@/features/decks/deckService";
import { useDeckStore } from "@/features/decks/deckStore";
import { useProgressStore } from "@/features/progress/progressStore";
import { getDeckStats } from "@/features/progress/progressStats";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useStoragePersistenceStore } from "@/features/settings/storagePersistenceStore";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { Deck } from "@/types/deck";

function filename(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "deck"
  );
}

const storageLabels = {
  checking: "Checking storage…",
  persistent: "Persistent storage granted",
  "best-effort": "Best-effort browser storage",
  unsupported: "Persistence API unavailable",
  unknown: "Storage persistence status unavailable",
} as const;

export function Manage() {
  const decks = useDeckStore((state) => state.decks);
  const remove = useDeckStore((state) => state.remove);
  const save = useDeckStore((state) => state.save);
  const loading = useDeckStore((state) => state.loading);
  const documents = useProgressStore((state) => state.documents);
  const load = useProgressStore((state) => state.load);
  const reset = useProgressStore((state) => state.reset);
  const storageStatus = useStoragePersistenceStore((state) => state.status);
  const requestingStorage = useStoragePersistenceStore(
    (state) => state.requesting,
  );
  const requestStorage = useStoragePersistenceStore((state) => state.request);
  const [openDelete, setOpenDelete] = useState<string | null>(null);
  const [openReset, setOpenReset] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDebouncedValue(query);
  const filteredDecks = decks.filter((deck) => {
    const search = deferredQuery.toLowerCase();
    return (
      !search ||
      [
        deck.title,
        deck.lang,
        ...deck.cards.flatMap((card) => [
          card.question,
          card.answer,
          card.category,
          ...card.tags,
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  });
  useEffect(() => {
    decks.forEach((deck) => void load(deck.id));
  }, [decks, load]);
  async function deleteDeck(deck: Deck) {
    try {
      await remove(deck.id);
      await reset(deck.id);
      setOpenDelete(null);
      toast.success("Deck deleted", {
        description: `${deck.title} was removed from this device.`,
      });
    } catch {
      toast.error("Unable to delete the deck.");
    }
  }
  async function clearProgress(deck: Deck) {
    try {
      await reset(deck.id);
      setOpenReset(null);
      toast.success("Progress reset", {
        description: "The flashcards were kept.",
      });
    } catch {
      toast.error("Unable to reset progress.");
    }
  }
  async function duplicateDeck(deck: Deck) {
    try {
      const copy = makeDeckCopy(deck);
      await save(copy);
      toast.success("Deck duplicated", { description: copy.title });
    } catch {
      toast.error("Unable to duplicate the deck.");
    }
  }
  function exportDeck(deck: Deck, progress: boolean) {
    const document = documents[deck.id];
    downloadJson(
      `${filename(deck.title)}${progress ? "-with-progress" : ""}.json`,
      progress ? { deck, progress: document } : deck,
    );
    toast.success("Export downloaded.");
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Manage decks</h1>
          <p className="mt-1 text-muted-foreground">
            Export, reset, or remove your locally stored study material.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DeckImporter compact />
          <CreateDeckDialog variant="outline" />
        </div>
      </div>
      {decks.length > 0 && (
        <div className="relative max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search decks and cards"
            aria-label="Search decks and cards"
          />
        </div>
      )}
      {loading ? (
        <div className="grid gap-4">
          {[0, 1].map((item) => (
            <Skeleton key={item} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No decks yet. Import one to begin.
        </p>
      ) : (
        <div className="grid gap-4">
          {filteredDecks.map((deck) => {
            const stats = getDeckStats(deck, documents[deck.id]);
            return (
              <Card key={deck.id}>
                <CardHeader>
                  <CardTitle>
                    <h2>{deck.title}</h2>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {deck.cards.length} cards · {deck.lang ?? "No language"}
                    {deck.source?.type === "seed" ? " · Seed deck" : ""}
                  </p>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {stats.newCount} new · {stats.learning} learning ·{" "}
                  {stats.mastered} mastered · {stats.correct} correct ·{" "}
                  {stats.incorrect} incorrect
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  {deck.cards.length > 0 ? (
                    <Button asChild size="sm">
                      <Link to={`/train/${deck.id}`}>
                        <Play /> Study
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <Link to={`/edit/${deck.id}`}>
                        <Pencil /> Add cards
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/edit/${deck.id}`}>
                      <Pencil /> Edit
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportDeck(deck, false)}
                  >
                    <Download /> Backup deck
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportDeck(deck, true)}
                  >
                    <Download /> Backup + progress
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void duplicateDeck(deck)}
                  >
                    <Copy /> Duplicate
                  </Button>
                  <Dialog
                    open={openReset === deck.id}
                    onOpenChange={(open) => setOpenReset(open ? deck.id : null)}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <RotateCcw /> Reset progress
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset progress?</DialogTitle>
                        <DialogDescription>
                          This clears all study history for “{deck.title}”. The
                          deck and its cards remain.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setOpenReset(null)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={() => void clearProgress(deck)}>
                          Reset progress
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog
                    open={openDelete === deck.id}
                    onOpenChange={(open) =>
                      setOpenDelete(open ? deck.id : null)
                    }
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="text-destructive" /> Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete this deck?</DialogTitle>
                        <DialogDescription>
                          This permanently removes “{deck.title}” and its local
                          progress from this browser.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setOpenDelete(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => void deleteDeck(deck)}
                        >
                          Delete deck
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
      {decks.length > 0 && filteredDecks.length === 0 && (
        <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No decks or cards match “{deferredQuery}”.
        </p>
      )}
      <section
        aria-labelledby="how-zaplearn-works"
        className="rounded-xl border bg-card p-6 sm:p-7"
      >
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Info className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="how-zaplearn-works" className="text-lg font-semibold">
              How ZapLearn works
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Create a deck or import JSON, then reveal traditional flashcards
              or answer multiple-choice questions. Your decks, edits, and
              progress are saved locally in this browser on this device—there is
              currently no account or cloud sync.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Use Backup deck to export JSON for backup or transfer. Backup +
              progress also archives study history, but progress cannot
              currently be restored through Import JSON. Clearing this browser’s
              site data may remove locally saved decks and study history.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge variant="secondary" role="status">
                <Database aria-hidden="true" /> {storageLabels[storageStatus]}
              </Badge>
              {(storageStatus === "best-effort" ||
                storageStatus === "unknown") && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={requestingStorage}
                  onClick={() => void requestStorage()}
                >
                  {requestingStorage
                    ? "Requesting…"
                    : "Request persistent storage"}
                </Button>
              )}
            </div>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              Storage protection reduces automatic browser eviction when
              granted, but it is not a backup.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
