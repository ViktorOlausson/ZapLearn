export async function requestPersistentStorage(): Promise<boolean | undefined> {
  if (!navigator.storage?.persist) return undefined;

  try {
    if (navigator.storage.persisted && (await navigator.storage.persisted())) {
      return true;
    }
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
