import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  },
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
});
