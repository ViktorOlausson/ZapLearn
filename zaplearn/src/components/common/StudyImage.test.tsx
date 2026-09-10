import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudyImage } from "@/components/common/StudyImage";

describe("StudyImage", () => {
  const image = {
    src: "/images/question.png",
    alt: "Outer shoulder highlighted",
    caption: "<b>Identify this</b>",
  };
  it("shows loading, preserves plain text captions, and uses no-referrer", () => {
    render(<StudyImage image={image} />);
    const img = screen.getByRole("img", { name: image.alt });
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(img).toHaveAttribute("loading", "eager");
    expect(screen.getByRole("status")).toHaveTextContent("Loading image");
    expect(screen.getByText(image.caption).querySelector("b")).toBeNull();
    fireEvent.load(img);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("falls back to alt text after failure and resets when src changes", () => {
    const { rerender } = render(<StudyImage image={image} lazy />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Image could not be loaded.",
    );
    expect(screen.getByRole("status")).toHaveTextContent(image.alt);
    rerender(
      <StudyImage image={{ ...image, src: "/images/replacement.png" }} lazy />,
    );
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "/images/replacement.png",
    );
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
  });
  it("does not render an unsafe source even when called outside the importer", () => {
    render(<StudyImage image={{ ...image, src: "javascript:alert(1)" }} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(image.alt);
  });
});
