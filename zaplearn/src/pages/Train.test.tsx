import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Deck } from "@/types/deck";

const mocks = vi.hoisted(() => ({
  deck: {
    id: "deck-one",
    title: "Test deck",
    cards: [
      {
        id: "card-one",
        question: "Question",
        answer: "Answer",
        tags: [],
        difficulty: 2,
      },
    ],
    schemaVersion: 1,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  } as Deck,
  document: {
    schemaVersion: 2,
    deckId: "deck-one",
    cards: {},
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  load: vi.fn(),
  grade: vi.fn(),
}));

vi.mock("@/features/decks/deckStore", () => ({
  useDeckStore: (
    selector: (state: {
      decks: (typeof mocks.deck)[];
      loading: boolean;
    }) => unknown,
  ) => selector({ decks: [mocks.deck], loading: false }),
}));
vi.mock("@/features/progress/progressStore", () => ({
  useProgressStore: (
    selector: (state: {
      documents: Record<string, typeof mocks.document>;
      load: typeof mocks.load;
      grade: typeof mocks.grade;
    }) => unknown,
  ) =>
    selector({
      documents: { "deck-one": mocks.document },
      load: mocks.load,
      grade: mocks.grade,
    }),
}));

import { Train } from "@/pages/Train";

describe("training controls", () => {
  beforeEach(() => {
    mocks.deck.cards = [
      {
        id: "card-one",
        question: "Question",
        answer: "Answer",
        tags: [],
        difficulty: 2,
      },
    ];
    mocks.grade.mockReset().mockResolvedValue(undefined);
    mocks.load.mockReset().mockResolvedValue(mocks.document);
  });

  it("flips with the keyboard and records a correct answer", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/train/deck-one"]}>
        <Routes>
          <Route path="/train/:deckId" element={<Train />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("button", { name: "Show answer" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: " " });
    expect(
      screen.getByRole("button", { name: "Show question" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Correct/ }));
    expect(mocks.grade).toHaveBeenCalledWith("deck-one", "card-one", true);
    expect(await screen.findByText("Session complete")).toBeInTheDocument();
  });

  it("records an incorrect answer with the 1 shortcut", async () => {
    render(
      <MemoryRouter initialEntries={["/train/deck-one"]}>
        <Routes>
          <Route path="/train/:deckId" element={<Train />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole("button", { name: "Show answer" });
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "1" });
    expect(mocks.grade).toHaveBeenCalledWith("deck-one", "card-one", false);
  });

  it("shows multiple-choice feedback, scores once, and resets for next", async () => {
    const user = userEvent.setup();
    mocks.deck.cards = [
      {
        id: "choice-one",
        type: "multiple-choice",
        question: "Choose the correct first answer",
        answer: "Correct first",
        options: ["Wrong first", "Correct first", "Another first"],
        tags: [],
        difficulty: 2,
      },
      {
        id: "choice-two",
        type: "multiple-choice",
        question: "Choose the correct second answer",
        answer: "Correct second",
        options: ["Wrong second", "Correct second", "Another second"],
        tags: [],
        difficulty: 2,
      },
    ];
    render(
      <MemoryRouter initialEntries={["/train/deck-one"]}>
        <Routes>
          <Route path="/train/:deckId" element={<Train />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Choose the correct first answer",
      }),
    ).toBeInTheDocument();
    const optionOrder = screen
      .getAllByRole("button", { name: /^Option \d:/ })
      .map((option) => option.getAttribute("aria-label"));
    await user.click(screen.getByRole("button", { name: /Wrong first/ }));
    expect(await screen.findByText("Incorrect.")).toBeInTheDocument();
    expect(screen.getByText(/Correct answer:/)).toHaveTextContent(
      "Correct answer: Correct first",
    );
    expect(mocks.grade).toHaveBeenCalledWith("deck-one", "choice-one", false);
    await user.click(screen.getByRole("button", { name: /Another first/ }));
    expect(mocks.grade).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getAllByRole("button", { name: /^Option \d:/ })
        .map((option) => option.getAttribute("aria-label")),
    ).toEqual(optionOrder);

    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(
      await screen.findByRole("heading", {
        name: "Choose the correct second answer",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Incorrect.")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(
      await screen.findByRole("heading", {
        name: "Choose the correct first answer",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Incorrect.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Another first/ }));
    expect(mocks.grade).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(
      await screen.findByRole("heading", {
        name: "Choose the correct second answer",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Incorrect.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Correct second/ }));
    expect(await screen.findByText("Correct!")).toBeInTheDocument();
    expect(mocks.grade).toHaveBeenCalledWith("deck-one", "choice-two", true);
    await user.click(screen.getByRole("button", { name: /Finish/ }));
    expect(await screen.findByText("Session complete")).toBeInTheDocument();
  });

  it("can study a multiple-choice card as a traditional flashcard", async () => {
    mocks.deck.cards = [
      {
        id: "choice-one",
        type: "multiple-choice",
        question: "Multiple-choice question",
        answer: "Canonical answer",
        options: ["Wrong", "Canonical answer"],
        tags: [],
        difficulty: 2,
      },
    ];
    render(
      <MemoryRouter initialEntries={["/train/deck-one?format=flashcards"]}>
        <Routes>
          <Route path="/train/:deckId" element={<Train />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("button", { name: "Show answer" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByText("Canonical answer")).toBeInTheDocument();
  });

  it("supports numbered keyboard selection for multiple-choice answers", async () => {
    mocks.deck.cards = [
      {
        id: "choice-keyboard",
        type: "multiple-choice",
        question: "Keyboard question",
        answer: "Correct keyboard answer",
        options: ["Wrong keyboard answer", "Correct keyboard answer"],
        tags: [],
        difficulty: 2,
      },
    ];
    render(
      <MemoryRouter initialEntries={["/train/deck-one"]}>
        <Routes>
          <Route path="/train/:deckId" element={<Train />} />
        </Routes>
      </MemoryRouter>,
    );

    const correctButton = await screen.findByRole("button", {
      name: /Correct keyboard answer/,
    });
    const shortcut = correctButton
      .getAttribute("aria-label")
      ?.match(/^Option (\d):/)?.[1];
    expect(shortcut).toBeDefined();
    fireEvent.keyDown(window, { key: shortcut });
    expect(await screen.findByText("Correct!")).toBeInTheDocument();
    expect(mocks.grade).toHaveBeenCalledWith(
      "deck-one",
      "choice-keyboard",
      true,
    );
  });
});
