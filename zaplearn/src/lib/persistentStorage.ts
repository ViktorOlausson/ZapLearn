export type StoragePersistenceStatus =
  "checking" | "persistent" | "best-effort" | "unsupported" | "unknown";

export async function getPersistentStorageStatus(): Promise<StoragePersistenceStatus> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.storage?.persisted !== "function"
  ) {
    return "unsupported";
  }

  try {
    return (await navigator.storage.persisted()) ? "persistent" : "best-effort";
  } catch {
    return "unknown";
  }
}

export async function requestPersistentStorage(): Promise<StoragePersistenceStatus> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.storage?.persist !== "function"
  ) {
    return "unsupported";
  }

  try {
    if ((await getPersistentStorageStatus()) === "persistent") {
      return "persistent";
    }
    return (await navigator.storage.persist()) ? "persistent" : "best-effort";
  } catch {
    return getPersistentStorageStatus();
  }
}
