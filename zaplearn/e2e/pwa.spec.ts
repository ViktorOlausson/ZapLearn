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
    expect(csp).not.toContain("'unsafe-eval'");
  }
});
