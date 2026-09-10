import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const illustration =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#e4edf5"/><path d="M800 140L1240 760H360Z" fill="#416b90"/></svg>';
const questionImage = {
  src: "https://images.example.test/shape.svg",
  alt: "Blue shape with three straight sides",
  caption: "Identify the shape",
};
const answerImage = {
  src: "/data/images/answer.svg",
  alt: "Three-sided shape explanation",
};
const cards = [
  {
    id: "plain",
    question: "How many sides does a square have?",
    answer: "Four",
  },
  {
    id: "picture",
    question: "What is this called?",
    answer: "Triangle",
    questionImage,
    answerImage,
  },
  {
    id: "choice",
    type: "multiple-choice",
    question: "Which shape is shown?",
    answer: "Triangle",
    options: ["Square", "Triangle", "Circle"],
    questionImage,
    answerImage,
  },
];

async function importDeck(page: Page, value: unknown) {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "images.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(value)),
    });
}

async function readProgress(page: Page) {
  return page.evaluate(
    () =>
      new Promise<
        | {
            cards: Record<
              string,
              { correctCount: number; incorrectCount: number }
            >;
          }
        | undefined
      >((resolve, reject) => {
        const opening = indexedDB.open("zaplearn");
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
          const db = opening.result;
          const request = db
            .transaction("progress")
            .objectStore("progress")
            .get("image-deck");
          request.onsuccess = () => {
            resolve(request.result);
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

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

test("mixed image deck: browse, grade once, persist, edit, and export/import on mobile", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const errors: string[] = [];
  const referrers: (string | undefined)[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://images.example.test/**", async (route) => {
    referrers.push(route.request().headers().referer);
    await route.fulfill({ contentType: "image/svg+xml", body: illustration });
  });
  await page.route("**/data/images/answer.svg", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: illustration }),
  );
  await page.goto("/");
  await importDeck(page, {
    id: "image-deck",
    title: "Image study deck",
    cards,
  });
  await expect(
    page.getByRole("heading", { name: "Image study deck" }),
  ).toBeVisible();
  await page.goto("/train/image-deck?mode=browse");
  await page.getByRole("button", { name: /^Next/ }).click();
  const image = page.getByRole("img", { name: questionImage.alt });
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1600);
  expect((await image.boundingBox())!.height).toBeLessThanOrEqual(285);
  await expect(page.getByAltText(answerImage.alt)).toHaveCount(0);
  await expectNoOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("image-flashcard-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.getByRole("img", { name: answerImage.alt })).toBeVisible();
  expect(await readProgress(page)).toBeUndefined();

  await page.goto("/train/image-deck");
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await expect(
    page.getByRole("img", { name: questionImage.alt }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Which shape is shown?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: questionImage.alt }),
  ).toBeVisible();
  await expect(page.getByAltText(answerImage.alt)).toHaveCount(0);
  const options = page.getByRole("button", { name: /^Option \d:/ });
  const order = await options.evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("aria-label")),
  );
  await page.screenshot({
    path: testInfo.outputPath("image-multiple-choice-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Option \d: Square/ }).click();
  await expect(page.getByText("Incorrect.")).toBeVisible();
  await expect(page.getByText(/Correct answer:/)).toContainText("Triangle");
  await expect(page.getByRole("img", { name: answerImage.alt })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Option \d: Triangle/ }),
  ).toBeDisabled();
  expect(
    await options.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label")),
    ),
  ).toEqual(order);
  await page.keyboard.press("2");
  await expect
    .poll(async () => (await readProgress(page))?.cards.choice.incorrectCount)
    .toBe(1);
  await expectNoOverflow(page);
  await page.getByRole("button", { name: /^Finish/ }).click();
  await page.reload();
  const progress = await readProgress(page);
  expect(progress?.cards.plain.correctCount).toBe(1);
  expect(progress?.cards.picture.correctCount).toBe(1);
  expect(progress?.cards.choice.incorrectCount).toBe(1);

  await page.goto("/edit/image-deck");
  const questionFields = page
    .locator("article")
    .nth(1)
    .getByRole("group", { name: "Question image", exact: true });
  await questionFields
    .getByLabel("Caption (optional)")
    .fill("Updated image caption");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  await page.reload();
  await expect(
    page
      .locator("article")
      .nth(1)
      .getByRole("group", { name: "Question image", exact: true })
      .getByLabel("Caption (optional)"),
  ).toHaveValue("Updated image caption");
  expect(await readProgress(page)).toEqual(progress);
  await expectNoOverflow(page);
  await page.goto("/manage");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Backup deck", exact: true }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported.cards[1]).toMatchObject({
    id: "picture",
    questionImage: { ...questionImage, caption: "Updated image caption" },
    answerImage,
  });
  expect(exported.cards[2]).toMatchObject(cards[2]);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete deck", exact: true }).click();
  await expect(
    page.getByText("No decks yet. Import one to begin."),
  ).toBeVisible();
  await importDeck(page, exported);
  await expect(
    page.getByRole("heading", { name: "Image study deck" }),
  ).toBeVisible();
  await page.goto("/train/image-deck?mode=browse");
  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(
    page.getByRole("img", { name: questionImage.alt }),
  ).toBeVisible();
  await expect(page.getByText("Updated image caption")).toBeVisible();
  expect(referrers.length).toBeGreaterThan(0);
  expect(referrers.every((value) => !value)).toBe(true);
  expect(errors).toEqual([]);
});

test("editor keeps failed URLs, adds and removes images, and blocks unsafe autosaves", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("https://images.example.test/**", (route) => route.abort());
  await page.goto("/");
  await importDeck(page, {
    id: "image-deck",
    title: "Image editor",
    cards: [cards[0]],
  });
  await page.getByRole("link", { name: "Edit Image editor" }).click();
  await page.getByText("Images (optional)").click();
  await page.getByRole("button", { name: "Add question image" }).click();
  const fields = page.getByRole("group", {
    name: "Question image",
    exact: true,
  });
  await fields.getByLabel("Image URL").fill(questionImage.src);
  await fields.getByLabel("Alternative text").fill(questionImage.alt);
  await expect(fields.getByText("Image could not be loaded.")).toBeVisible();
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  await page.reload();
  await expect(fields.getByLabel("Image URL")).toHaveValue(questionImage.src);
  await fields.getByLabel("Image URL").fill("javascript:alert(1)");
  await expect(page.getByTestId("save-status")).toHaveText(
    "Fix validation errors",
  );
  await expect(fields.getByRole("img")).toHaveCount(0);
  await page.reload();
  await expect(fields.getByLabel("Image URL")).toHaveValue(questionImage.src);
  await page.getByRole("button", { name: "Remove question image" }).click();
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  await page.reload();
  await page.getByText("Images (optional)").click();
  await expect(
    page.getByRole("button", { name: "Add question image" }),
  ).toBeVisible();
  await expectNoOverflow(page);
});
