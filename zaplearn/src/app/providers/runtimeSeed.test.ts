import { afterEach, describe, expect, it, vi } from "vitest";

import { loadRuntimeSeed } from "@/app/providers/runtimeSeed";

const mocks = vi.hoisted(() => ({ toastMessage: vi.fn() }));

vi.mock("sonner", () => ({
  toast: { message: mocks.toastMessage },
}));

afterEach(() => {
  mocks.toastMessage.mockReset();
  vi.unstubAllGlobals();
});

describe("runtime seed configuration", () => {
  it("ignores malformed configuration without crashing startup", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ deckUrl: 42, unexpected: true })),
        ),
    );
    const save = vi.fn();

    await expect(loadRuntimeSeed(save)).resolves.toBeUndefined();
    expect(save).not.toHaveBeenCalled();
    expect(mocks.toastMessage).toHaveBeenCalledWith(
      "Seed deck unavailable",
      expect.any(Object),
    );
  });

  it("rejects an unsafe seed URL without fetching it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ deckUrl: "data:text/plain,unsafe" })),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadRuntimeSeed(vi.fn())).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.toastMessage).toHaveBeenCalledWith(
      "Seed deck unavailable",
      expect.any(Object),
    );
  });
});
