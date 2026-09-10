import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { unpackImages, MAX_PACKAGE_SIZE } from "@/features/images/deckPackage";
import { readDeckFile } from "@/features/decks/deckService";

describe("image package boundary validation", () => {
  const deck = strToU8(
    JSON.stringify({
      title: "Pictures",
      cards: [{ question: "Q", answer: "A" }],
    }),
  );
  it("reads bounded stored and compressed ZIP entries", () => {
    for (const level of [0, 6] as const) {
      const files = unpackImages(zipSync({ "deck.json": deck }, { level }));
      expect(Array.from(files.get("deck.json")!)).toEqual(Array.from(deck));
    }
  });
  it.each([
    "../outside.png",
    "images/../../script.js",
    "/images/a.png",
    "images/image-one.svg",
    "script.js",
    "images/image-one.png/extra",
  ])("rejects unsafe/unexpected path %s", (name) => {
    expect(() =>
      unpackImages(zipSync({ "deck.json": deck, [name]: strToU8("bad") })),
    ).toThrow();
  });
  it("rejects oversized and highly compressed entries", () => {
    expect(() => unpackImages(new Uint8Array(MAX_PACKAGE_SIZE + 1))).toThrow(
      "50 MB",
    );
    expect(() =>
      unpackImages(
        zipSync({ "deck.json": new Uint8Array(2 * 1024 * 1024 + 1) }),
      ),
    ).toThrow("too large");
  });
  it("rejects incomplete packages", () => {
    expect(() => unpackImages(new Uint8Array())).toThrow("Incomplete package");
    expect(() =>
      unpackImages(zipSync({ "images/image-one.png": new Uint8Array([1]) })),
    ).toThrow("deck.json");
  });
  it("rejects plain JSON referencing nonportable local assets", async () => {
    const result = await readDeckFile(
      new File(
        [
          JSON.stringify({
            title: "Not portable",
            cards: [
              {
                question: "Q",
                answer: "A",
                questionImage: {
                  type: "local",
                  assetId: "image-one",
                  alt: "Picture",
                },
              },
            ],
          }),
        ],
        "deck.json",
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("package");
  });
});
