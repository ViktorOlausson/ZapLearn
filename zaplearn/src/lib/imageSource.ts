/** Imported images are HTTPS resources or paths rooted at this deployment. */
export function isSafeImageSource(src: string): boolean {
  if (
    !src ||
    src.length > 4096 ||
    /[\s\\]/.test(src) ||
    [...src].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  if (!/^https:\/\//i.test(src)) return false;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
