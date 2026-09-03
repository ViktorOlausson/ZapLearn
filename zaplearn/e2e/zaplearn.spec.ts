import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const fixture = path.resolve("fixtures/example-deck.json");

test("import, edit, study, persist, export, reset, and delete", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Learn smarter with flashcards." }),
  ).toBeVisible();

  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import JSON" }).first().click();
  await (await chooserPromise).setFiles(fixture);
  await expect(
    page.getByRole("heading", { name: "ZapLearn Test Deck" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "ZapLearn Test Deck" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Edit ZapLearn Test Deck" }).click();

  const question = page.getByLabel("Question").first();
  await question.fill("What is the HTTP protocol?");
  const saveStatus = page.getByTestId("save-status");
  await expect(saveStatus).toHaveText("Saving…");
  await expect(saveStatus).toHaveText("Saved", { timeout: 3_000 });
  const savedQuestion = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("zaplearn");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const decks = await new Promise<
      Array<{ cards: Array<{ question: string }> }>
    >((resolve, reject) => {
      const request = database
        .transaction("decks")
        .objectStore("decks")
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return decks[0]?.cards[0]?.question;
  });
  expect(savedQuestion).toBe("What is the HTTP protocol?");
  await page.reload();
  await expect(page.getByLabel("Question").first()).toHaveValue(
    "What is the HTTP protocol?",
  );

  await page.getByRole("button", { name: "Add card", exact: true }).click();
  await page.getByLabel("Question").last().fill("What is the DOM?");
  await page.getByLabel("Answer").last().fill("The Document Object Model");
  await expect(saveStatus).toHaveText("Saving…");
  await expect(saveStatus).toHaveText("Saved", { timeout: 3_000 });

  await page.getByRole("link", { name: "ZapLearn" }).click();
  await page.getByRole("link", { name: "Study" }).first().click();
  await expect(page.getByText("What is the HTTP protocol?")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Show question" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Correct/ }).click();
  await expect(page.getByText("What does CSS stand for?")).toBeVisible();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: /Incorrect/ }).click();

  await page.getByRole("link", { name: "All decks" }).click();
  await expect(page.getByText("2 due")).toBeVisible();
  await page.reload();
  await expect(page.getByText("2 due")).toBeVisible();
  await page.getByRole("link", { name: "Manage all" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Deck", exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = JSON.parse(await readFile(downloadPath!, "utf8")) as {
    title: string;
    cards: unknown[];
  };
  expect(exported.title).toBe("ZapLearn Test Deck");
  expect(exported.cards).toHaveLength(4);

  await page.getByRole("button", { name: "Reset progress" }).click();
  await page
    .getByRole("button", { name: "Reset progress", exact: true })
    .last()
    .click();
  await expect(page.getByText("4 new")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete deck" }).click();
  await expect(
    page.getByText("No decks yet. Import one to begin."),
  ).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("creates a local deck and opens the empty editor", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create deck" }).first().click();
  await page.getByLabel("Title").fill("My new deck");
  await page.getByLabel(/Language/).fill("en");
  await page.getByRole("button", { name: "Create and edit" }).click();
  await expect(
    page.getByRole("heading", { name: "My new deck" }),
  ).toBeVisible();
  await expect(page.getByText("This deck has no cards")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "My new deck" }),
  ).toBeVisible();
});

test("main views do not overflow a 375px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
