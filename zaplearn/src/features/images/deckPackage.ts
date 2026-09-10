import { Unzip, UnzipInflate, zipSync, strToU8, strFromU8 } from "fflate";
import { createId } from "@/lib/hash";
import {
  DeckSchema,
  parseDeckFile,
  type Deck,
  type ImportedDeck,
} from "@/types/deck";
import {
  getImageAsset,
  localImageIds,
  type ImageAsset,
} from "@/features/images/imageRepo";
import {
  imageExtensions,
  MAX_IMAGE_SIZE,
  validateImageFile,
} from "@/features/images/imageFiles";

export const MAX_PACKAGE_SIZE = 50 * 1024 * 1024;
const MAX_JSON_SIZE = 2 * 1024 * 1024;
const MAX_PACKAGE_IMAGES = 100;

export async function exportDeckPackage(deck: Deck): Promise<Blob> {
  const validated = DeckSchema.parse(deck);
  const json = strToU8(JSON.stringify(validated, null, 2));
  if (json.length > MAX_JSON_SIZE)
    throw new Error(
      "Deck JSON exceeds 2 MB. Split this deck before exporting.",
    );
  const ids = localImageIds(validated.cards);
  if (ids.size > MAX_PACKAGE_IMAGES)
    throw new Error(
      "Image packages support at most 100 images. Split this deck before exporting.",
    );
  const files: Record<string, Uint8Array> = { "deck.json": json };
  let total = json.length;
  for (const id of ids) {
    const asset = await getImageAsset(id);
    if (!asset || !imageExtensions[asset.blob.type])
      throw new Error(
        "A local image is missing or invalid. Replace it before exporting.",
      );
    total += asset.blob.size;
    if (total > MAX_PACKAGE_SIZE - 65536)
      throw new Error(
        "Image package exceeds 50 MB. Split this deck before exporting.",
      );
    files[`images/${id}.${imageExtensions[asset.blob.type]}`] = new Uint8Array(
      await asset.blob.arrayBuffer(),
    );
  }
  // Raster formats are already compressed; stored entries avoid needless CPU work.
  const zip = zipSync(files, { level: 0 });
  if (zip.length > MAX_PACKAGE_SIZE)
    throw new Error("Image package exceeds 50 MB.");
  return new Blob([zip], { type: "application/zip" });
}

export function unpackImages(bytes: Uint8Array): Map<string, Uint8Array> {
  if (bytes.length > MAX_PACKAGE_SIZE)
    throw new Error("Maximum package size: 50 MB.");
  const files = new Map<string, Uint8Array>();
  const names = new Set<string>();
  let total = 0;
  const unzip = new Unzip((entry) => {
    if (
      !/^(deck\.json|images\/image-[a-zA-Z0-9-]{1,100}\.(jpg|png|webp|gif))$/.test(
        entry.name,
      )
    )
      throw new Error("Package contains an unsupported file or unsafe path.");
    if (names.has(entry.name) || names.size >= MAX_PACKAGE_IMAGES + 1)
      throw new Error("Duplicate files or too many images in package.");
    names.add(entry.name);
    const limit = entry.name === "deck.json" ? MAX_JSON_SIZE : MAX_IMAGE_SIZE;
    if ((entry.originalSize ?? 0) > limit)
      throw new Error(`Package file too large: ${entry.name}`);
    const chunks: Uint8Array[] = [];
    let size = 0;
    entry.ondata = (error, chunk, final) => {
      if (error) throw error;
      size += chunk.length;
      total += chunk.length;
      if (size > limit || total > MAX_PACKAGE_SIZE) {
        entry.terminate();
        throw new Error("Expanded package exceeds the allowed size.");
      }
      chunks.push(chunk);
      if (final) {
        const data = new Uint8Array(size);
        let offset = 0;
        for (const part of chunks) {
          data.set(part, offset);
          offset += part.length;
        }
        files.set(entry.name, data);
      }
    };
    entry.start();
  });
  unzip.register(UnzipInflate);
  // Bound compressed input chunks as well as declared and actual expanded sizes.
  for (let offset = 0; offset < bytes.length; offset += 4096)
    unzip.push(
      bytes.subarray(offset, offset + 4096),
      offset + 4096 >= bytes.length,
    );
  if (!files.has("deck.json") || files.size !== names.size)
    throw new Error("Incomplete package: deck.json or image data is missing.");
  return files;
}

export async function readDeckPackage(
  file: File,
): Promise<
  | { ok: true; deck: ImportedDeck; assets: ImageAsset[] }
  | { ok: false; errors: string[] }
> {
  try {
    if (file.size > MAX_PACKAGE_SIZE)
      throw new Error("Maximum package size: 50 MB.");
    const entries = unpackImages(new Uint8Array(await file.arrayBuffer()));
    const parsed = parseDeckFile(strFromU8(entries.get("deck.json")!));
    if (!parsed.ok) return parsed;
    const ids = localImageIds(parsed.deck.cards);
    const replacements = new Map<string, string>();
    const assets: ImageAsset[] = [];
    for (const id of ids) {
      const matches = [...entries.keys()].filter((name) =>
        name.startsWith(`images/${id}.`),
      );
      if (matches.length !== 1)
        throw new Error(`Missing or ambiguous image asset: ${id}`);
      const path = matches[0];
      const blob = await validateImageFile(new Blob([entries.get(path)!]));
      if (!path.endsWith(`.${imageExtensions[blob.type]}`))
        throw new Error(`Image format does not match file name: ${path}`);
      const replacement = createId("image");
      replacements.set(id, replacement);
      assets.push({ id: replacement, blob });
    }
    if (entries.size !== ids.size + 1)
      throw new Error("Package contains unreferenced image files.");
    const deck: ImportedDeck = {
      ...parsed.deck,
      cards: parsed.deck.cards.map((card) => {
        const next = { ...card };
        for (const side of ["questionImage", "answerImage"] as const) {
          const image = card[side];
          if (image?.type === "local")
            next[side] = {
              ...image,
              assetId: replacements.get(image.assetId)!,
            };
        }
        return next;
      }),
    };
    return { ok: true, deck, assets };
  } catch (error) {
    return {
      ok: false,
      errors: [
        error instanceof Error
          ? error.message
          : "Could not read image package.",
      ],
    };
  }
}
