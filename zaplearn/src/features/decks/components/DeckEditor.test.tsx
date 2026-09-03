import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DeckEditor } from "@/features/decks/components/DeckEditor";
import type { Deck } from "@/types/deck";

const deck: Deck = {
  id: "deck-one",
  title: "Original title",
  cards: [
    {
      id: "card-one",
      question: "Original question",
      answer: "Original answer",
      tags: [],
      difficulty: 2,
    },
  ],
  schemaVersion: 1,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("DeckEditor", () => {
  it("validates required fields and autosaves an edited card", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<DeckEditor deck={deck} onSave={onSave} />);
    const question = screen.getByLabelText("Question");
    await user.clear(question);
    await user.type(question, "Updated question");
    await waitFor(
      () =>
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            cards: [expect.objectContaining({ question: "Updated question" })],
          }),
        ),
      { timeout: 1200 },
    );
    expect(screen.queryByText("Question is required")).not.toBeInTheDocument();
  });

  it("duplicates and deletes cards", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<DeckEditor deck={deck} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Duplicate card 1" }));
    expect(screen.getAllByText(/Card \d/)).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Delete card 2" }));
    expect(screen.getAllByText(/Card \d/)).toHaveLength(1);
  });

  it("converts a flashcard and saves multiple-choice options", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<DeckEditor deck={deck} onSave={onSave} />);

    await user.click(screen.getByRole("combobox", { name: "Card 1 type" }));
    await user.click(screen.getByRole("option", { name: "Multiple choice" }));
    expect(screen.getByLabelText("Option 1")).toHaveValue("Original answer");
    expect(screen.getByLabelText("Set option 1 as correct")).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Add option" }));
    await user.type(screen.getByLabelText("Option 2"), "Plausible distractor");

    await waitFor(
      () =>
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            cards: [
              expect.objectContaining({
                type: "multiple-choice",
                answer: "Original answer",
                options: ["Original answer", "Plausible distractor"],
              }),
            ],
          }),
        ),
      { timeout: 1500 },
    );
  });
});
