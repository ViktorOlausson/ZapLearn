import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Flashcard } from "@/features/train/components/Flashcard";

describe("Flashcard", () => {
  it("displays a question and flips to an answer", async () => {
    const user = userEvent.setup();
    const onFlip = vi.fn();
    render(
      <Flashcard
        card={{
          id: "one",
          question: "Question text",
          answer: "Answer text",
          tags: [],
          difficulty: 2,
        }}
        flipped={false}
        onFlip={onFlip}
      />,
    );
    expect(screen.getByText("Question text")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show answer" }));
    expect(onFlip).toHaveBeenCalledOnce();
  });
});
