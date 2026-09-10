import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectImageType,
  MAX_IMAGE_SIZE,
  validateImageFile,
} from "@/features/images/imageFiles";

const png = [137, 80, 78, 71, 13, 10, 26, 10];
afterEach(() => vi.unstubAllGlobals());

describe("uploaded image validation", () => {
  it.each([
    [[255, 216, 255, 0], "image/jpeg"],
    [png, "image/png"],
    [Array.from("RIFF0000WEBP", (c) => c.charCodeAt(0)), "image/webp"],
    [Array.from("GIF89a", (c) => c.charCodeAt(0)), "image/gif"],
  ])("recognizes signatures and requires decoding: %s", async (bytes, mime) => {
    expect(detectImageType(new Uint8Array(bytes))).toBe(mime);
    const revoke = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:test",
      revokeObjectURL: revoke,
    });
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = 20;
        naturalHeight = 20;
        onload?: () => void;
        set src(_: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    const file = new File([new Uint8Array(bytes)], "test.bin", { type: mime });
    const blob = await validateImageFile(file);
    expect(blob.type).toBe(mime);
    expect(blob.size).toBe(bytes.length);
    expect(revoke).toHaveBeenCalledWith("blob:test");
  });
  it.each([
    new File(["<svg/>"], "fake.png", { type: "image/png" }),
    new File([new Uint8Array(png)], "fake.jpg", { type: "image/jpeg" }),
    new File(["<html>not an image</html>"], "image.jpg", {
      type: "image/jpeg",
    }),
  ])("rejects unsupported/spoofed image contents", async (file) => {
    await expect(validateImageFile(file)).rejects.toThrow(
      "valid JPEG, PNG, WebP, or GIF",
    );
  });
  it("rejects oversized files before reading bytes", async () => {
    const file = new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], "large.png");
    await expect(validateImageFile(file)).rejects.toThrow(
      "Maximum image size: 5 MB",
    );
  });
  it("rejects corrupt encoded content and revokes the temporary URL", async () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:test",
      revokeObjectURL: revoke,
    });
    vi.stubGlobal(
      "Image",
      class {
        onerror?: () => void;
        set src(_: string) {
          queueMicrotask(() => this.onerror?.());
        }
      },
    );
    await expect(
      validateImageFile(new Blob([new Uint8Array(png)])),
    ).rejects.toThrow("could not be decoded");
    expect(revoke).toHaveBeenCalledOnce();
  });
});
