import type { Page } from "@playwright/test";

export async function testImage(page: Page, type = "image/png") {
  const encoded = await page.evaluate((mime) => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#e2e8f0";
    context.fillRect(0, 0, 160, 120);
    context.fillStyle = "#2563eb";
    context.beginPath();
    context.arc(80, 60, 40, 0, Math.PI * 2);
    context.fill();
    return canvas.toDataURL(mime).split(",")[1];
  }, type);
  return {
    name: `picture.${type.split("/")[1]}`,
    mimeType: type,
    buffer: Buffer.from(encoded, "base64"),
  };
}

export async function storedImageIds(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const opening = indexedDB.open("zaplearn");
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
          const db = opening.result;
          if (!db.objectStoreNames.contains("images")) {
            db.close();
            resolve([]);
            return;
          }
          const request = db
            .transaction("images")
            .objectStore("images")
            .getAllKeys();
          request.onsuccess = () => {
            resolve(request.result.map(String));
            db.close();
          };
          request.onerror = () => {
            reject(request.error);
            db.close();
          };
        };
      }),
  );
}
