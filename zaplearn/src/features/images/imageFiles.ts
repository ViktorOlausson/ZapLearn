export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
export const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function detectImageType(bytes: Uint8Array): string | undefined {
  const starts = (...signature: number[]) =>
    signature.every((byte, i) => bytes[i] === byte);
  const text = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(137, 80, 78, 71, 13, 10, 26, 10)) return "image/png";
  if (["GIF87a", "GIF89a"].includes(text(0, 6))) return "image/gif";
  if (text(0, 4) === "RIFF" && text(8, 4) === "WEBP") return "image/webp";
}

export async function validateImageFile(file: Blob): Promise<Blob> {
  if (!file.size || file.size > MAX_IMAGE_SIZE)
    throw new Error("Maximum image size: 5 MB. Choose a non-empty image.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const mime = detectImageType(bytes);
  if (
    !mime ||
    (file.type &&
      file.type !== "application/octet-stream" &&
      file.type !== mime)
  )
    throw new Error(
      "Choose a valid JPEG, PNG, WebP, or GIF image. SVG uploads are not supported.",
    );
  const blob = file.slice(0, file.size, mime);
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.src = "";
        reject(new Error("The image could not be decoded."));
      }, 15000);
      img.onload = () => {
        clearTimeout(timer);
        if (
          !img.naturalWidth ||
          !img.naturalHeight ||
          img.naturalWidth * img.naturalHeight > MAX_IMAGE_PIXELS
        )
          reject(
            new Error(
              "Image dimensions are too large. Use an image of at most 24 megapixels.",
            ),
          );
        else resolve();
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error("The file could not be decoded as an image."));
      };
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
  return blob;
}
