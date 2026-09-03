import { expect, test } from "@playwright/test";

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
