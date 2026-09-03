import { describe, expect, it } from "vitest";

import { gradeCard } from "@/features/train/repetition";

const now = new Date("2025-01-01T00:00:00.000Z");

describe("simple repetition", () => {
  it("moves a new correct answer into learning for one hour", () => {
    const result = gradeCard(undefined, "one", true, now);
    expect(result.bucket).toBe(1);
    expect(result.intervalMinutes).toBe(60);
    expect(result.dueAt).toBe("2025-01-01T01:00:00.000Z");
  });
  it("promotes repeated correct answers through day and mastered intervals", () => {
    const first = gradeCard(undefined, "one", true, now);
    const second = gradeCard(first, "one", true, new Date(first.dueAt));
    const third = gradeCard(second, "one", true, new Date(second.dueAt));
    expect(second.bucket).toBe(2);
    expect(second.intervalMinutes).toBe(24 * 60);
    expect(third.bucket).toBe(2);
    expect(third.intervalMinutes).toBe(3 * 24 * 60);
  });
  it("returns a wrong answer to learning and increments the incorrect count", () => {
    const mastered = {
      ...gradeCard(undefined, "one", true, now),
      bucket: 2 as const,
      intervalMinutes: 3 * 24 * 60,
    };
    const result = gradeCard(mastered, "one", false, now);
    expect(result.bucket).toBe(0);
    expect(result.intervalMinutes).toBe(10);
    expect(result.incorrectCount).toBe(1);
  });
});
