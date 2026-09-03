import { describe, expect, it } from "vitest";

import { shuffleOptions } from "@/features/train/multipleChoice";

describe("multiple-choice option shuffling", () => {
  it("returns a stable order for the same question and session", () => {
    const options = ["A", "B", "C", "D"];
    const first = shuffleOptions(options, "session-one:card-one");
    const second = shuffleOptions(options, "session-one:card-one");

    expect(second).toEqual(first);
    expect(first).toEqual(expect.arrayContaining(options));
  });

  it("does not mutate stored options and can vary by session", () => {
    const options = ["A", "B", "C", "D"];
    const original = [...options];
    const orders = new Set(
      Array.from({ length: 12 }, (_, index) =>
        shuffleOptions(options, `session-${index}:card-one`).join("|"),
      ),
    );

    expect(options).toEqual(original);
    expect(orders.size).toBeGreaterThan(1);
  });
});
