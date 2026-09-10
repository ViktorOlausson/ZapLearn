import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import { expect, test } from "@playwright/test";
import { storedImageIds, testImage } from "./testImages";

test("upload, replace, reveal, reload, export and restore local pictures", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/");
  const png = await testImage(page);
  const jpeg = await testImage(page, "image/jpeg");
  const webp = await testImage(page, "image/webp");
  await page.getByRole("button", { name: "Create deck" }).first().click();
  await page.getByLabel("Title", { exact: true }).fill("Photo deck");
  await page.getByRole("button", { name: "Create and edit" }).click();
  await page.getByRole("button", { name: "Add first card" }).click();
  await page
    .getByLabel("Question", { exact: true })
    .fill("Which shape is shown?");
  await page.getByLabel("Answer", { exact: true }).fill("Circle");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  await page.getByText("Images (optional)").click();
  const question = page.getByRole("group", {
    name: "Question image",
    exact: true,
  });
  await question.getByLabel("Upload question image").setInputFiles(png);
  await expect(question.locator("img")).toBeVisible();
  // Draft previews do not write a Blob before the required alt text is supplied.
  expect(await storedImageIds(page)).toHaveLength(0);
  await question.getByLabel("Alternative text").fill("Blue round shape");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  const initial = await storedImageIds(page);
  expect(initial).toHaveLength(1);
  await question.getByLabel("Upload question image").setInputFiles(jpeg);
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  await expect.poll(() => storedImageIds(page)).not.toEqual(initial);
  expect(await storedImageIds(page)).toHaveLength(1);
  const answer = page.getByRole("group", { name: "Answer image", exact: true });
  await answer.getByLabel("Upload answer image").setInputFiles(webp);
  await answer.getByLabel("Alternative text").fill("Answer illustration");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  expect(await storedImageIds(page)).toHaveLength(2);
  const editUrl = page.url();
  await page.reload();
  await expect(
    question.getByRole("img", { name: "Blue round shape" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Study deck" }).click();
  await expect(
    page.getByRole("img", { name: "Blue round shape" }),
  ).toHaveAttribute("src", /^blob:/);
  await expect
    .poll(() =>
      page
        .getByRole("img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(160);
  await expect(page.getByAltText("Answer illustration")).toHaveCount(0);
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(
    page.getByRole("img", { name: "Answer illustration" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await expect(page.getByText("Session complete")).toBeVisible();
  await page.goto("/manage");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export with images" }).click();
  const download = await downloading;
  const path = (await download.path())!;
  expect(download.suggestedFilename()).toBe("photo-deck.zaplearn.zip");
  const contents = unzipSync(new Uint8Array(await readFile(path)));
  expect(Object.keys(contents)).toHaveLength(3);
  expect(contents["deck.json"]).toBeDefined();
  const restored = await browser.newContext({ baseURL });
  const fresh = await restored.newPage();
  await fresh.goto("/");
  await fresh
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: download.suggestedFilename(),
      mimeType: "application/zip",
      buffer: await readFile(path),
    });
  await expect(
    fresh.getByRole("heading", { name: "Photo deck" }),
  ).toBeVisible();
  await fresh.reload();
  await fresh.getByRole("link", { name: "Study", exact: true }).first().click();
  await expect(
    fresh.getByRole("img", { name: "Blue round shape" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      fresh
        .getByRole("img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(160);
  expect(await storedImageIds(fresh)).toHaveLength(2);
  await restored.close();
  await page.goto(editUrl);
  await question.getByRole("button", { name: "Remove question image" }).click();
  await answer.getByRole("button", { name: "Remove answer image" }).click();
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  await expect.poll(() => storedImageIds(page)).toEqual([]);
});

test("batch builder pairs images with both card formats, validates drafts, and saves together", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const files = [
    await testImage(page),
    await testImage(page, "image/jpeg"),
    await testImage(page, "image/webp"),
  ];
  await page.getByRole("button", { name: "Create deck" }).first().click();
  await page.getByLabel("Title", { exact: true }).fill("Batch pictures");
  await page.getByRole("button", { name: "Create and edit" }).click();
  await page.getByRole("button", { name: "Create from images" }).click();
  await page.getByLabel("Upload images", { exact: true }).setInputFiles(files);
  await expect(page.locator("article")).toHaveCount(3);
  await page.getByRole("button", { name: "Add cards to deck" }).click();
  await expect(page.getByText("Question is required").first()).toBeVisible();
  expect(await storedImageIds(page)).toEqual([]);
  for (let i = 0; i < 3; i++) {
    const card = page.locator("article").nth(i);
    await card
      .getByLabel("Question", { exact: true })
      .fill(`Identify picture ${i + 1}`);
    await card.getByLabel("Answer", { exact: true }).fill(`Answer ${i + 1}`);
    await card
      .getByLabel("Alternative text")
      .fill(`Blue circular diagram ${i + 1}`);
  }
  const third = page.locator("article").nth(2);
  await third.getByRole("combobox", { name: "Card 3 type" }).click();
  await page.getByRole("option", { name: "Multiple choice" }).click();
  await third.getByRole("button", { name: "Add option" }).click();
  await third.getByLabel("Option 2", { exact: true }).fill("Distractor");
  await page
    .locator("article")
    .nth(1)
    .getByRole("button", { name: "Move to answer side" })
    .click();
  await expect(
    page
      .locator("article")
      .nth(1)
      .getByRole("group", { name: "Answer image", exact: true })
      .getByRole("img"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("image-builder-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add cards to deck" }).click();
  await expect(
    page.getByRole("heading", { name: "Image Card Builder" }),
  ).toHaveCount(0);
  await expect(page.locator("article")).toHaveCount(3);
  expect(await storedImageIds(page)).toHaveLength(3);
  await page.reload();
  await expect(page.locator("article")).toHaveCount(3);
  await page.getByRole("link", { name: "Study deck" }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Show answer" }).click();
    await page.getByRole("button", { name: "Correct", exact: true }).click();
  }
  await expect(
    page.getByRole("img", { name: "Blue circular diagram 3" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Option \d: Answer 3/ }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("invalid uploads and cancelled batch drafts never persist assets", async ({
  page,
}) => {
  await page.goto("/");
  const png = await testImage(page);
  await page.getByRole("button", { name: "Create deck" }).first().click();
  await page.getByLabel("Title", { exact: true }).fill("Draft cleanup");
  await page.getByRole("button", { name: "Create and edit" }).click();
  await page.getByRole("button", { name: "Create from images" }).click();
  await page.getByLabel("Upload images", { exact: true }).setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(page.getByRole("alert")).toContainText("valid JPEG");
  await page.getByLabel("Upload images", { exact: true }).setInputFiles(png);
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Cancel image builder" }).click();
  await page.reload();
  await expect(page.getByText("This deck has no cards")).toBeVisible();
  expect(await storedImageIds(page)).toEqual([]);
});
