import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPersistentStorageStatus,
  requestPersistentStorage,
} from "@/lib/persistentStorage";

const originalStorage = navigator.storage;

function setStorage(value: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value,
  });
}

afterEach(() => {
  setStorage(originalStorage);
});

describe("persistent browser storage", () => {
  it("handles browsers without the Storage API", async () => {
    setStorage(undefined);
    await expect(getPersistentStorageStatus()).resolves.toBe("unsupported");
    await expect(requestPersistentStorage()).resolves.toBe("unsupported");
  });

  it("reports an existing persistent grant without requesting again", async () => {
    const persist = vi.fn<() => Promise<boolean>>();
    setStorage({ persisted: async () => true, persist });

    await expect(requestPersistentStorage()).resolves.toBe("persistent");
    expect(persist).not.toHaveBeenCalled();
  });

  it("reports whether a persistence request was granted", async () => {
    setStorage({ persisted: async () => false, persist: async () => true });
    await expect(getPersistentStorageStatus()).resolves.toBe("best-effort");
    await expect(requestPersistentStorage()).resolves.toBe("persistent");
  });
});
