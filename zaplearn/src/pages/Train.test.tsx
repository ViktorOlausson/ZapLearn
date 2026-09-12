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

  it.each([
    [["Python", "JavaScript"], true],
    [["Python"], false],
    [["Python", "JavaScript", "HTML"], false],
    [["HTML", "JavaScript"], false],
  ])(
    "grades the complete selection %j once as %s",
    async (selection, correct) => {
      const user = userEvent.setup();
      mocks.deck.cards = ["first", "second"].map((id) => ({
        id,
        type: "multiple-choice",
        question: `Languages ${id}?`,
        answers: ["Python", "JavaScript"],
        options: ["Python", "HTML", "JavaScript", "CSS"],
        tags: [],
        difficulty: 2,
        questionImage: { src: "/q.png", alt: "Question diagram" },
        answerImage: { src: "/a.png", alt: "Answer diagram" },
      }));
      render(
        <MemoryRouter initialEntries={["/train/deck-one"]}>
          <Routes>
            <Route path="/train/:deckId" element={<Train />} />
          </Routes>
        </MemoryRouter>,
      );
      await screen.findByText("Languages first?");
      const order = screen
        .getAllByRole("checkbox")
        .map((input) => input.getAttribute("aria-label"));
      expect(
        screen.getByRole("button", { name: "Submit answer" }),
      ).toBeDisabled();
      expect(screen.queryByAltText("Answer diagram")).not.toBeInTheDocument();
      for (const option of selection)
        await user.click(
          screen.getByRole("checkbox", { name: new RegExp(`: ${option}$`) }),
        );
      expect(mocks.grade).not.toHaveBeenCalled();
      expect(
        screen
          .getAllByRole("checkbox")
          .map((input) => input.getAttribute("aria-label")),
      ).toEqual(order);
      const submit = screen.getByRole("button", { name: "Submit answer" });
      await user.dblClick(submit);
      expect(mocks.grade).toHaveBeenCalledExactlyOnceWith(
        "deck-one",
        "first",
        correct,
      );
      expect(submit).toBeDisabled();
      expect(
        screen.getByText(correct ? "Correct!" : "Incorrect."),
      ).toBeInTheDocument();
      expect(screen.getByAltText("Answer diagram")).toBeInTheDocument();
      for (const checkbox of screen.getAllByRole("checkbox"))
        expect(checkbox).toBeDisabled();
      expect(screen.getAllByText("✓ Correct selected").length).toBeGreaterThan(
        0,
      );
      if (!selection.includes("Python") || !selection.includes("JavaScript"))
        expect(screen.getByText("✓ Missed correct answer")).toBeInTheDocument();
      if (selection.includes("HTML"))
        expect(screen.getByText("✕ Incorrect selected")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Next" }));
      expect(screen.getByText("Languages second?")).toBeInTheDocument();
      for (const checkbox of screen.getAllByRole("checkbox"))
        expect(checkbox).not.toBeChecked();
      expect(
        screen.getByRole("button", { name: "Submit answer" }),
      ).toBeDisabled();
    },
  );

  it("toggles with Space and reveals all answers in flashcard mode", async () => {
    const user = userEvent.setup();
    mocks.deck.cards = [
      {
        id: "multi",
        type: "multiple-choice",
        question: "Languages?",
        answers: ["Python", "JavaScript"],
        options: ["Python", "JavaScript", "HTML"],
        tags: [],
        difficulty: 2,
      },
    ];
    const { unmount } = render(
      <MemoryRouter initialEntries={["/train/deck-one"]}>
        <Routes>
          <Route path="/train/:deckId" element={<Train />} />
        </Routes>
      </MemoryRouter>,
    );
    const checkbox = await screen.findByRole("checkbox", { name: /: Python$/ });
    checkbox.focus();
    await user.keyboard(" ");
    expect(checkbox).toBeChecked();
    await user.keyboard(" ");
    expect(checkbox).not.toBeChecked();
    expect(mocks.grade).not.toHaveBeenCalled();
    unmount();
    render(
      <MemoryRouter initialEntries={["/train/deck-one?format=flashcards"]}>
        <Routes>
          <Route path="/train/:deckId" element={<Train />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole("button", { name: "Show answer" }),
    );
    expect(screen.getByText("Python")).toBeVisible();
    expect(screen.getByText("JavaScript")).toBeVisible();
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

  it("shows image multiple-choice feedback, scores once, and resets for next", async () => {
    const user = userEvent.setup();
    mocks.deck.cards = [
      {
        id: "choice-one",
        questionImage: { src: "/images/question.png", alt: "Question diagram" },
        answerImage: { src: "/images/answer.png", alt: "Answer diagram" },
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
    expect(
      screen.getByRole("img", { name: "Question diagram" }),
    ).toBeInTheDocument();
    expect(screen.queryByAltText("Answer diagram")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Wrong first/ }));
    expect(
      screen.getByRole("img", { name: "Answer diagram" }),
    ).toBeInTheDocument();
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

  it("browses image cards and reveals their answers without grading", async () => {
    mocks.deck.cards[0].questionImage = {
      src: "/q.png",
      alt: "Question picture",
    };
    mocks.deck.cards[0].answerImage = { src: "/a.png", alt: "Answer picture" };
    render(
      <MemoryRouter initialEntries={["/train/deck-one?mode=browse"]}>
        <Routes>
          <Route path="/train/:deckId" element={<Train />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole("img", { name: "Question picture" });
    fireEvent.keyDown(window, { key: " " });
    expect(
      screen.getByRole("img", { name: "Answer picture" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "2" });
    expect(mocks.grade).not.toHaveBeenCalled();
  });
});
