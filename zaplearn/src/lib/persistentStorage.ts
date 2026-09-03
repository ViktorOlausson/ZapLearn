export type StoragePersistenceStatus =
  "checking" | "persistent" | "best-effort" | "unsupported";

export async function getPersistentStorageStatus(): Promise<StoragePersistenceStatus> {
  if (typeof navigator === "undefined" || !navigator.storage?.persisted) {
    return "unsupported";
  }

  try {
    return (await navigator.storage.persisted()) ? "persistent" : "best-effort";
  } catch {
    return "unsupported";
  }
}

export async function requestPersistentStorage(): Promise<StoragePersistenceStatus> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return "unsupported";
  }

  try {
    if (navigator.storage.persisted && (await navigator.storage.persisted())) {
      return "persistent";
    }
    return (await navigator.storage.persist()) ? "persistent" : "best-effort";
  } catch {
    return "best-effort";
  }
}
