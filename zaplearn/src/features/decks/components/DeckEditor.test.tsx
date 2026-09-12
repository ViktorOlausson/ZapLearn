import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
  it("preserves selections across mode changes, saves and reloads without changing IDs", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const source: Deck = {
      ...deck,
      cards: [
        {
          ...deck.cards[0],
          type: "multiple-choice",
          answer: "Python",
          options: ["Python", "JavaScript", "HTML"],
        },
      ],
    };
    const view = render(<DeckEditor deck={source} onSave={onSave} />);
    await user.selectOptions(
      screen.getByLabelText("Correct-answer mode"),
      "multiple",
    );
    expect(screen.getByLabelText("Set option 1 as correct")).toBeChecked();
    await waitFor(() =>
      expect(
        screen.getByText("Select at least 2 correct answers"),
      ).toBeInTheDocument(),
    );
    expect(onSave).not.toHaveBeenCalled();
    await user.click(screen.getByLabelText("Set option 2 as correct"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const saved = onSave.mock.lastCall?.[0];
    expect(saved.cards[0]).toMatchObject({
      id: "card-one",
      answers: ["Python", "JavaScript"],
    });
    expect(saved.cards[0]).not.toHaveProperty("answer");
    view.unmount();
    render(<DeckEditor deck={{ ...source, ...saved }} onSave={onSave} />);
    expect(screen.getByLabelText("Set option 1 as correct")).toBeChecked();
    expect(screen.getByLabelText("Set option 2 as correct")).toBeChecked();
    await user.click(screen.getByLabelText("Set option 3 as correct"));
    await waitFor(() =>
      expect(
        screen.getByText(/must contain at least one incorrect/),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByLabelText("Set option 3 as correct"));
    await user.selectOptions(
      screen.getByLabelText("Correct-answer mode"),
      "single",
    );
    expect(screen.getByText(/Choose which answer to keep/)).toBeInTheDocument();
    expect(screen.getByLabelText("Set option 2 as correct")).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Keep JavaScript" }));
    await waitFor(() =>
      expect(onSave.mock.lastCall?.[0].cards[0]).toMatchObject({
        id: "card-one",
        answer: "JavaScript",
      }),
    );
    expect(onSave.mock.lastCall?.[0].cards[0]).not.toHaveProperty("answers");
  });

  it("adds and autosaves image metadata, retains a failed preview URL, and removes the image", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<DeckEditor deck={deck} onSave={onSave} />);
    await user.click(screen.getByText("Images (optional)"));
    await user.click(
      screen.getByRole("button", { name: "Add question image" }),
    );
    const fields = within(
      screen.getByRole("group", { name: "Question image" }),
    );
    fireEvent.change(fields.getByLabelText("Image URL"), {
      target: { value: "https://example.com/question.png" },
    });
    fireEvent.change(fields.getByLabelText("Alternative text"), {
      target: { value: "Highlighted outer shoulder" },
    });
    fireEvent.change(fields.getByLabelText("Caption (optional)"), {
      target: { value: "Identify the structure" },
    });
    fireEvent.error(fields.getByRole("img"));
    expect(fields.getByText("Image could not be loaded.")).toBeInTheDocument();
    expect(fields.getByLabelText("Image URL")).toHaveValue(
      "https://example.com/question.png",
    );
    await waitFor(() =>
      expect(onSave).toHaveBeenLastCalledWith(
        expect.objectContaining({
          cards: [
            expect.objectContaining({
              id: "card-one",
              questionImage: {
                src: "https://example.com/question.png",
                alt: "Highlighted outer shoulder",
                caption: "Identify the structure",
              },
            }),
          ],
        }),
      ),
    );
    await user.click(
      screen.getByRole("button", { name: "Remove question image" }),
    );
    await waitFor(() =>
      expect(onSave.mock.lastCall?.[0].cards[0].questionImage).toBeUndefined(),
    );
    expect(screen.queryByLabelText("Image URL")).not.toBeInTheDocument();
  });

  it("blocks invalid image autosaves and retains images when duplicating and converting cards", async () => {
    const user = userEvent.setup();
    const image = { src: "/images/q.png", alt: "Question diagram" };
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <DeckEditor
        deck={{
          ...deck,
          cards: [
            { ...deck.cards[0], questionImage: image, answerImage: image },
          ],
        }}
        onSave={onSave}
      />,
    );
    const source = within(
      screen.getByRole("group", { name: "Question image" }),
    ).getByLabelText("Image URL");
    fireEvent.change(source, { target: { value: "javascript:alert(1)" } });
    await waitFor(() =>
      expect(screen.getByTestId("save-status")).toHaveTextContent(
        "Fix validation errors",
      ),
    );
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(source, { target: { value: image.src } });
    await waitFor(() =>
      expect(screen.getByTestId("save-status")).toHaveTextContent("Saved"),
    );
    onSave.mockClear();
    await user.click(screen.getByRole("combobox", { name: "Card 1 type" }));
    await user.click(screen.getByRole("option", { name: "Multiple choice" }));
    await user.click(screen.getByRole("button", { name: "Add option" }));
    fireEvent.change(screen.getByLabelText("Option 2"), {
      target: { value: "Distractor" },
    });
    await user.click(screen.getByRole("button", { name: "Duplicate card 1" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const cards = onSave.mock.lastCall?.[0].cards;
    expect(cards).toHaveLength(2);
    for (const card of cards)
      expect(card).toMatchObject({
        type: "multiple-choice",
        questionImage: image,
        answerImage: image,
      });
    expect(cards[0].id).not.toBe(cards[1].id);
  });
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
