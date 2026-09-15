import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useState } from "react";
import { DeckEditor } from "./DeckEditor";
import { BulkOptions } from "./BulkOptions";
import { MultipleChoiceQuestion } from "@/features/train/components/MultipleChoiceQuestion";
import { createDeck } from "@/features/decks/deckService";
import { MultipleChoiceCardSchema } from "@/types/deck";

const options = Array.from({ length: 30 }, (_, i) => `Option ${i + 1}`);
const card = MultipleChoiceCardSchema.parse({
  type: "multiple-choice",
  id: "large",
  question: "Select applicable options",
  options,
  answers: options.slice(0, 20),
});

it("renders 30 options, counts selections, clears and grades an exact set", () => {
  function Study() {
    const [selected, setSelected] = useState<string[]>([]);
    const [submitted, setSubmitted] = useState(false);
    return (
      <MultipleChoiceQuestion
        card={card}
        options={options}
        selectedOptions={selected}
        submitted={submitted}
        onClear={() => setSelected([])}
        onSubmit={() => setSubmitted(true)}
        onSelect={(option) =>
          setSelected((previous) =>
            previous.includes(option)
              ? previous.filter((v) => v !== option)
              : [...previous, option],
          )
        }
      />
    );
  }
  render(<Study />);
  expect(screen.getAllByRole("checkbox")).toHaveLength(30);
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  expect(screen.getByText("1 selected")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
  expect(screen.getByText("0 selected")).toBeInTheDocument();
  for (const checkbox of screen.getAllByRole("checkbox").slice(0, 20))
    fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
  expect(screen.getByText("Correct!")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Clear selection" }),
  ).toBeDisabled();
});

it("bulk appends 20 options, saves 30 with many correct answers, and edits wrapping text", async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <DeckEditor
      deck={{
        ...createDeck("Large"),
        cards: [
          {
            ...card,
            options: options.slice(0, 10),
            answers: options.slice(0, 5),
          },
        ],
      }}
      onSave={onSave}
    />,
  );
  fireEvent.click(screen.getByText("Bulk add options"));
  fireEvent.change(screen.getByLabelText("One option per line"), {
    target: { value: options.slice(10).join("\n\n") },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Add to existing options" }),
  );
  expect(screen.getByLabelText("Option 30")).toHaveValue("Option 30");
  for (let i = 6; i <= 20; i++)
    fireEvent.click(screen.getByLabelText(`Set option ${i} as correct`));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        cards: [
          expect.objectContaining({ options, answers: options.slice(0, 20) }),
        ],
      }),
    ),
  );
});

it("bulk detects duplicate lines and overflow without changing existing options", () => {
  const onAdd = vi.fn();
  render(<BulkOptions options={options} onAdd={onAdd} />);
  fireEvent.click(screen.getByText("Bulk add options"));
  fireEvent.change(screen.getByLabelText("One option per line"), {
    target: { value: " Option 1 \n\n New " },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Add to existing options" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Duplicate");
  fireEvent.change(screen.getByLabelText("One option per line"), {
    target: {
      value: Array.from({ length: 21 }, (_, i) => `New ${i}`).join("\n"),
    },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Add to existing options" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("50");
  expect(onAdd).not.toHaveBeenCalled();
});
