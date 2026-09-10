import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Flashcard } from "@/features/train/components/Flashcard";

describe("Flashcard", () => {
  it("shows question images, reveals answer images, and survives a failed image", () => {
    const card = {
      id: "image",
      question: "What is shown?",
      answer: "Answer",
      tags: [],
      difficulty: 2 as const,
      questionImage: { src: "/images/q.png", alt: "Question illustration" },
      answerImage: { src: "/images/a.png", alt: "Answer illustration" },
    };
    const { rerender } = render(
      <Flashcard card={card} flipped={false} onFlip={vi.fn()} />,
    );
    expect(
      screen.getByRole("img", { name: "Question illustration" }),
    ).toHaveAttribute("src", "/images/q.png");
    expect(
      screen.queryByAltText("Answer illustration"),
    ).not.toBeInTheDocument();
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("Image could not be loaded.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show answer" })).toBeEnabled();
    rerender(<Flashcard card={card} flipped onFlip={vi.fn()} />);
    expect(
      screen.getByRole("img", { name: "Answer illustration" }),
    ).toHaveAttribute("src", "/images/a.png");
  });
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
