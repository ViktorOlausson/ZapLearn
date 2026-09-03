import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createDeck } from "@/features/decks/deckService";
import { useDeckStore } from "@/features/decks/deckStore";
import { useStoragePersistenceStore } from "@/features/settings/storagePersistenceStore";

const CreateDeckSchema = z.object({
  title: z.string().trim().min(1, "Enter a deck title."),
  lang: z
    .string()
    .trim()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Use a language tag such as en or en-US.")
    .or(z.literal("")),
});

export function CreateDeckDialog({
  variant = "default",
}: {
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const save = useDeckStore((state) => state.save);
  const hasDecks = useDeckStore((state) => state.decks.length > 0);
  const requestStoragePersistence = useStoragePersistenceStore(
    (state) => state.request,
  );
  const navigate = useNavigate();

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setTitle("");
      setLang("");
      setError("");
      setSaving(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = CreateDeckSchema.safeParse({ title, lang });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the deck details.");
      return;
    }
    setSaving(true);
    try {
      const deck = createDeck(parsed.data.title, parsed.data.lang || undefined);
      await save(deck);
      if (!hasDecks) void requestStoragePersistence();
      toast.success("Deck created", {
        description: "Add your first card to start studying.",
      });
      changeOpen(false);
      navigate(`/edit/${deck.id}`);
    } catch {
      setError("The deck could not be saved on this device.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus /> Create deck
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Create a deck</DialogTitle>
            <DialogDescription>
              Start from scratch and add cards in the editor.
            </DialogDescription>
          </DialogHeader>
          <div className="my-6 grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="new-deck-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="new-deck-title"
                autoFocus
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setError("");
                }}
                placeholder="e.g. Biology essentials"
              />
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="new-deck-language"
                className="text-sm font-medium"
              >
                Language{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <Input
                id="new-deck-language"
                value={lang}
                onChange={(event) => {
                  setLang(event.target.value);
                  setError("");
                }}
                placeholder="en"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => changeOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create and edit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
