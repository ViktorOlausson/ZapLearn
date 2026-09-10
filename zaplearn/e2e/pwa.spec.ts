import { expect, test } from "@playwright/test";
import { testImage } from "./testImages";

test("manifest and service worker provide an offline app shell", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    /manifest\.webmanifest/,
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Learn smarter with flashcards." }),
  ).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByRole("status")).toContainText("Offline");
  await context.setOffline(false);
});

test("uploaded pictures remain available offline after reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const png = await testImage(page);
  await page.getByRole("button", { name: "Create deck" }).first().click();
  await page.getByLabel("Title", { exact: true }).fill("Offline local images");
  await page.getByRole("button", { name: "Create and edit" }).click();
  await page.getByRole("button", { name: "Create from images" }).click();
  await page.getByLabel("Upload images", { exact: true }).setInputFiles(png);
  await page.getByLabel("Question", { exact: true }).fill("What shape?");
  await page.getByLabel("Answer", { exact: true }).fill("Circle");
  await page
    .getByLabel("Alternative text")
    .fill("Blue circle on a pale background");
  await page.getByRole("button", { name: "Add cards to deck" }).click();
  await expect(
    page.getByRole("heading", { name: "Image Card Builder" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Study deck" }).click();
  await expect(
    page.getByRole("img", { name: "Blue circle on a pale background" }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  const image = page.getByRole("img", {
    name: "Blue circle on a pale background",
  });
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(160);
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await expect(page.getByText("Session complete")).toBeVisible();
  await context.setOffline(false);
});

test("production responses carry restrictive security headers", async ({
  request,
}) => {
  for (const url of ["/", "/manage", "/runtime/config.json"]) {
    const response = await request.get(url);
    expect(response.ok()).toBe(true);
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    const csp = headers["content-security-policy"];
    expect(csp).toContain("script-src 'self';");
    expect(csp).toContain("object-src 'none';");
    expect(csp).toContain("connect-src 'self';");
    expect(csp).toContain("img-src 'self' data: https: blob:;");
    expect(csp).not.toContain("*");
    expect(csp).not.toContain("'unsafe-eval'");
  }
});

test("an offline remote image falls back without blocking study or persistence", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "offline-images.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          id: "offline-images",
          title: "Offline image deck",
          cards: [
            {
              question: "What is this?",
              answer: "Triangle",
              questionImage: {
                src: "https://images.example.test/offline.png",
                alt: "Shape with three sides",
              },
            },
          ],
        }),
      ),
    });
  await expect(
    page.getByRole("heading", { name: "Offline image deck" }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("link", { name: "Study", exact: true }).first().click();
  await expect(page.getByText("Image could not be loaded.")).toBeVisible();
  await expect(page.getByText("Shape with three sides")).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Image could not be loaded.")).toBeVisible();
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await expect(page.getByText("Session complete")).toBeVisible();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Caught up")).toBeVisible();
  await context.setOffline(false);
});
