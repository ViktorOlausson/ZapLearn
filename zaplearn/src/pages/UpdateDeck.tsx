import { useState } from "react";
import { Link, useParams } from "react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDeckStore } from "@/features/decks/deckStore";
import { getDeck, saveDeck } from "@/features/decks/deckRepo";
import { MAX_DECK_FILE_SIZE } from "@/features/decks/deckService";
import {
  describeCardDiff,
  previewDeckUpdate,
  type UpdatePreview,
} from "@/features/decks/deckUpdate";
import { exportDeckPackage } from "@/features/images/deckPackage";
import { localImageIds } from "@/features/images/imageRepo";
import { downloadBlob, downloadJson } from "@/lib/download";
import { formatZodIssues } from "@/types/deck";

export function UpdateDeck() {
  const { deckId } = useParams();
  const deck = useDeckStore((state) =>
    state.decks.find((item) => item.id === deckId),
  );
  const initialize = useDeckStore((state) => state.initialize);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [preview, setPreview] = useState<UpdatePreview>();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  function fail(error: unknown) {
    setError(
      error instanceof z.ZodError
        ? formatZodIssues(error.issues).join("\n")
        : error instanceof Error
          ? error.message
          : "Could not update deck.",
    );
  }
  function invalidate() {
    setPreview(undefined);
    setConfirmed(false);
    setError("");
    setStatus("");
  }
  if (!deck)
    return (
      <p>
        Loading deck, or deck not found. <Link to="/manage">Manage decks</Link>
      </p>
    );
  if (deck.source?.readOnly)
    return (
      <p>
        This deck is read-only. Duplicate it in{" "}
        <Link to="/manage">Manage decks</Link> before updating.
      </p>
    );
  return (
    <section className="mx-auto max-w-4xl space-y-5 [overflow-wrap:anywhere]">
      <Link to="/manage">← Manage decks</Link>
      <h1 className="text-3xl font-bold">Update deck from JSON</h1>
      <h2 className="text-xl">{deck.title}</h2>
      <p>
        Merge keeps omitted cards, updates matches, and adds new cards. No data
        is saved until you apply a validated preview.
      </p>
      <label className="block">
        Update mode
        <select
          className="block rounded border border-input bg-background p-2 text-foreground focus-visible:outline-ring"
          value={mode}
          disabled={busy}
          onChange={(e) => {
            setMode(e.target.value as "merge" | "replace");
            invalidate();
          }}
        >
          <option className="bg-background text-foreground" value="merge">
            Merge/update
          </option>
          <option className="bg-background text-foreground" value="replace">
            Replace deck
          </option>
        </select>
      </label>
      <label className="block">
        Upload update JSON (maximum 2 MB)
        <input
          className="block max-w-full"
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            invalidate();
            setBusy(true);
            try {
              if (file.size > MAX_DECK_FILE_SIZE)
                throw new Error("Update JSON must be smaller than 2 MB.");
              setText(await file.text());
            } catch (error) {
              fail(error);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <div>
        <label className="block" htmlFor="deck-update-json">
          Update JSON
        </label>
        <Textarea
          id="deck-update-json"
          className="min-h-60"
          value={text}
          disabled={busy}
          onChange={(e) => {
            setText(e.target.value);
            invalidate();
          }}
        />
      </div>
      <Button
        disabled={busy || !text.trim()}
        onClick={async () => {
          invalidate();
          setBusy(true);
          try {
            const current = await getDeck(deck.id);
            if (!current) throw new Error("Deck no longer exists.");
            setPreview(previewDeckUpdate(current, text, mode));
          } catch (error) {
            fail(error);
          } finally {
            setBusy(false);
          }
        }}
      >
        Preview update
      </Button>
      {error && (
        <div
          role="alert"
          className="whitespace-pre-wrap rounded border border-destructive p-4"
        >
          <strong>Needs review</strong>
          <p>{error}</p>
          <p>Correct the JSON and preview again. Nothing has been saved.</p>
        </div>
      )}
      {status && <p role="status">{status}</p>}
      {preview && (
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold">Update preview</h2>
          <p>
            {preview.added} new cards · {preview.updated} cards updated ·{" "}
            {preview.unchanged} cards unchanged · {preview.deleted} cards
            deleted
          </p>
          {preview.original.title !== preview.deck.title && (
            <p>
              Title: {preview.original.title} → {preview.deck.title}
            </p>
          )}
          {preview.original.lang !== preview.deck.lang && (
            <p>
              Language: {preview.original.lang ?? "None"} →{" "}
              {preview.deck.lang ?? "None"}
            </p>
          )}
          {!preview.changed ? (
            <p>No changes found.</p>
          ) : (
            <>
              <div className="rounded border p-4 space-y-3">
                <h3 className="font-semibold">
                  Download backup before applying update
                </h3>
                <p>
                  Keep a copy of the previous deck for recovery. This workflow
                  does not provide undo. Local images are included in a ZIP
                  backup; learning progress remains stored separately and is
                  unchanged by updates.
                </p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      if (localImageIds(preview.original.cards).size)
                        downloadBlob(
                          "zaplearn-before-update.zaplearn.zip",
                          await exportDeckPackage(preview.original),
                        );
                      else
                        downloadJson(
                          "zaplearn-before-update.json",
                          preview.original,
                        );
                      setStatus("Backup download started.");
                    } catch (error) {
                      fail(error);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Download backup
                </Button>
              </div>
              {preview.deleted > 0 && (
                <label className="flex gap-3 items-center rounded border border-destructive p-4">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  {preview.deleted} existing cards will be removed. I confirm
                  this replacement.
                </label>
              )}
              <Button
                disabled={busy || (preview.deleted > 0 && !confirmed)}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await saveDeck(
                      { ...preview.deck, updatedAt: new Date().toISOString() },
                      [],
                      preview.original,
                    );
                    await initialize();
                    setPreview(undefined);
                    setText("");
                    setStatus(
                      `Update applied. ${preview.deck.cards.length} cards in deck.`,
                    );
                  } catch (error) {
                    fail(error);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Apply update
              </Button>
              {preview.diffs.map((diff) => (
                <article
                  className="rounded border p-4 space-y-3"
                  key={(diff.after ?? diff.before)!.id}
                >
                  <h3 className="font-semibold">
                    {!diff.before ? "New" : !diff.after ? "Removed" : "Updated"}
                    : {(diff.after ?? diff.before)!.question}
                  </h3>
                  {describeCardDiff(diff).map((change) => (
                    <div key={change.field}>
                      <h4 className="font-medium">
                        {change.field === "answers"
                          ? "Correct answers"
                          : change.field}
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <p className="whitespace-pre-wrap min-w-0">
                          Old: {change.old}
                        </p>
                        <p className="whitespace-pre-wrap min-w-0">
                          New: {change.next}
                        </p>
                      </div>
                    </div>
                  ))}
                </article>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
