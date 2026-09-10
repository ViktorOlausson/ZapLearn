import { expect, test } from "@playwright/test";
import { aiPromptGroups } from "../src/content/aiPrompts";

test("About shows all prompt categories and supports copying and keyboard access on mobile", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { name: "About ZapLearn" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Copy prompt:/ })).toHaveCount(
    0,
  );
  for (const group of aiPromptGroups) {
    const summary = page
      .locator("summary")
      .filter({ hasText: new RegExp(`^${group.title}$`) });
    await summary.focus();
    await page.keyboard.press("Enter");
    for (const prompt of group.prompts) {
      await page
        .getByRole("button", {
          name: `Copy prompt: ${prompt.title}`,
          exact: true,
        })
        .click();
      expect(
        (await page.evaluate(() => navigator.clipboard.readText())).replace(
          /\r\n/g,
          "\n",
        ),
      ).toBe(prompt.text);
    }
    await expect(
      page.getByRole("status").filter({ hasText: /^Copied$/ }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await summary.click();
  }
  await page.screenshot({
    path: testInfo.outputPath("about-prompts-mobile.png"),
    fullPage: true,
  });
});

test("About keeps prompts selectable when clipboard is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    }),
  );
  await page.goto("/about");
  await page
    .locator("summary")
    .filter({ hasText: "Traditional flashcards" })
    .click();
  await page
    .getByRole("button", { name: "Copy prompt: Traditional flashcards" })
    .click();
  await expect(page.getByText(/Could not copy automatically/)).toBeVisible();
  await expect(page.getByLabel("Traditional flashcards prompt")).toBeVisible();
});
