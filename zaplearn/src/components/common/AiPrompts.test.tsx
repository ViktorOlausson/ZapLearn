import { readFileSync } from "node:fs";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiPrompts } from "@/components/common/AiPrompts";
import { aiPromptGroups } from "@/content/aiPrompts";

afterEach(() => vi.restoreAllMocks());
describe("AI prompt examples", () => {
  it("keeps README examples synchronized with all nine copyable prompts", () => {
    const readme = readFileSync("../README.md", "utf8").replace(/\r\n/g, "\n");
    for (const group of aiPromptGroups)
      for (const prompt of group.prompts) expect(readme).toContain(prompt.text);
  });
  it("starts collapsed and copies each prompt as plain text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<AiPrompts />);
    for (const details of document.querySelectorAll("details"))
      expect(details.open).toBe(false);
    for (const group of aiPromptGroups) {
      fireEvent.click(screen.getByText(group.title, { selector: "summary" }));
      for (const prompt of group.prompts) {
        const button = screen.getByRole("button", {
          name: `Copy prompt: ${prompt.title}`,
        });
        fireEvent.click(button);
        expect(writeText).toHaveBeenLastCalledWith(prompt.text);
        expect(
          await within(button.parentElement!.parentElement!).findByText(
            "Copied",
          ),
        ).toBeInTheDocument();
      }
    }
    expect(writeText).toHaveBeenCalledTimes(9);
  });
  it.each([
    undefined,
    { writeText: () => Promise.reject(new Error("Denied")) },
  ])(
    "supports manual copying when the API is unavailable or denied",
    async (clipboard) => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: clipboard,
      });
      render(<AiPrompts />);
      fireEvent.click(
        screen.getByText("Traditional flashcards", { selector: "summary" }),
      );
      fireEvent.click(
        screen.getByRole("button", {
          name: "Copy prompt: Traditional flashcards",
        }),
      );
      expect(
        await screen.findByText(/Could not copy automatically/),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Traditional flashcards prompt"),
      ).toHaveTextContent("Create a ZapLearn-compatible flashcard deck");
    },
  );
});
