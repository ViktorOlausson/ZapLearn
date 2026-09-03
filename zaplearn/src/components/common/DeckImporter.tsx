import { useRef, useState, type DragEvent } from "react";
import { FileUp, Upload } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  readDeckFile,
  materializeDeck,
  type ImportStrategy,
} from "@/features/decks/deckService";
import { useDeckStore } from "@/features/decks/deckStore";
import { useStoragePersistenceStore } from "@/features/settings/storagePersistenceStore";
import type { ImportedDeck } from "@/types/deck";

type DeckImporterProps = { compact?: boolean; onImported?: () => void };

export function DeckImporter({
  compact = false,
  onImported,
}: DeckImporterProps) {
  const input = useRef<HTMLInputElement>(null);
  const decks = useDeckStore((state) => state.decks);
  const save = useDeckStore((state) => state.save);
  const requestStoragePersistence = useStoragePersistenceStore(
    (state) => state.request,
  );
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const navigate = useNavigate();

  async function importDeck(file: File, strategy: ImportStrategy = "new") {
    setImporting(true);
    try {
      const result = await readDeckFile(file);
      if (!result.ok) {
        toast.error("Could not import deck", {
          description: result.errors.slice(0, 3).join(" · "),
          duration: 7000,
        });
        return;
      }
      const existing = result.deck.id
        ? decks.find((deck) => deck.id === result.deck.id)
        : undefined;
      if (existing && strategy === "new") {
        toast.info("This deck is already on this device", {
          description:
            "Update it to keep progress for cards with matching IDs.",
          action: {
            label: "Update",
            onClick: () => void saveImported(result.deck, existing.id),
          },
        });
        return;
      }
      await saveImported(result.deck, existing?.id);
    } finally {
      setImporting(false);
    }
  }

  async function saveImported(deck: ImportedDeck, existingId?: string) {
    try {
      const existing = existingId
        ? decks.find((item) => item.id === existingId)
        : undefined;
      const savedDeck = materializeDeck(
        deck,
        existing ? "replace" : "new",
        existing,
      );
      await save(savedDeck);
      if (decks.length === 0) void requestStoragePersistence();
      toast.success(existing ? "Deck updated" : "Deck imported", {
        description: existing
          ? "Progress for matching cards was kept."
          : `${savedDeck.cards.length} cards are ready to study.`,
        action: {
          label: "Study now",
          onClick: () => navigate(`/train/${savedDeck.id}`),
        },
      });
      onImported?.();
    } catch {
      toast.error("Could not save the deck locally.");
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.item(0);
    if (file) void importDeck(file);
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  if (compact) {
    return (
      <>
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />
        <Button onClick={() => input.current?.click()} disabled={importing}>
          <FileUp /> {importing ? "Importing…" : "Import JSON"}
        </Button>
      </>
    );
  }

  return (
    <div
      className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
    >
      <Upload
        className="mx-auto mb-3 size-8 text-muted-foreground"
        aria-hidden="true"
      />
      <h2 className="font-semibold">Import a flashcard deck</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Drop a JSON file here, or choose one from your device. Maximum 2 MB.
      </p>
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      <Button
        className="mt-4"
        onClick={() => input.current?.click()}
        disabled={importing}
      >
        {importing ? "Importing…" : "Import JSON"}
      </Button>
    </div>
  );
}
