import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const fixture = path.resolve("fixtures/example-deck.json");

test("mass merge previews two changes and five additions, preserves progress and trains 25 options on mobile", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const cards = Array.from({ length: 10 }, (_, i) => ({
    id: `merge-card-${i}`,
    question: `Original question ${i}`,
    answer: `Answer ${i}`,
  }));
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import JSON" }).first().click();
  await (
    await chooser
  ).setFiles({
    name: "merge.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ id: "merge-deck", title: "Mass merge", cards }),
    ),
  });
  await expect(
    page.getByRole("heading", { name: "Mass merge", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Study", exact: true }).first().click();
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  async function stored(store: string) {
    return page.evaluate(async (name) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("zaplearn");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const value = await new Promise<unknown>((resolve, reject) => {
        const r = db.transaction(name).objectStore(name).get("merge-deck");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
      return value;
    }, store);
  }
  await page.goto("/manage");
  const progress = await stored("progress");
  await page.getByRole("link", { name: "Update deck from JSON" }).click();
  const options = Array.from({ length: 25 }, (_, i) => `Choice ${i + 1}`);
  await page.getByLabel("Update JSON", { exact: true }).fill(
    JSON.stringify({
      cards: [
        {
          id: cards[0].id,
          question: "Large updated question",
          type: "multiple-choice",
          options,
          answers: options.slice(0, 15),
        },
        { id: cards[1].id, answer: "Improved answer" },
        ...Array.from({ length: 5 }, (_, i) => ({
          question: `New question ${i}`,
          answer: `New answer ${i}`,
        })),
      ],
    }),
  );
  await page.getByRole("button", { name: "Preview update" }).click();
  await expect(
    page.getByText(
      "5 new cards · 2 cards updated · 8 cards unchanged · 0 cards deleted",
    ),
  ).toBeVisible();
  expect(((await stored("decks")) as { cards: unknown[] }).cards).toHaveLength(
    10,
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download backup", exact: true })
    .click();
  const backupPath = await (await download).path();
  expect(JSON.parse(await readFile(backupPath!, "utf8")).cards).toHaveLength(
    10,
  );
  await page.getByRole("button", { name: "Apply update", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Update applied. 15 cards",
  );
  await page.reload();
  const saved = (await stored("decks")) as {
    cards: { id: string; question: string }[];
  };
  expect(saved.cards).toHaveLength(15);
  expect(saved.cards[9].question).toBe(cards[9].question);
  expect(await stored("progress")).toEqual(progress);
  await page
    .getByLabel("Update JSON", { exact: true })
    .fill(JSON.stringify({ cards: [] }));
  await page.getByRole("button", { name: "Preview update" }).click();
  await expect(page.getByText("No changes found.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Apply update", exact: true }),
  ).toHaveCount(0);
  await page.goto("/edit/merge-deck");
  await expect(page.getByLabel("Option 25", { exact: true })).toHaveValue(
    "Choice 25",
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("large-editor-mobile.png"),
    fullPage: true,
  });
  await page.goto("/train/merge-deck?format=multiple-choice");
  await page.getByRole("button", { name: "Review anyway" }).click();
  await expect(page.getByRole("checkbox")).toHaveCount(25);
  const order = await page
    .getByRole("checkbox")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-label")),
    );
  await page.getByRole("checkbox", { name: /: Choice 1$/ }).check();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(page.getByText("0 selected", { exact: true })).toBeVisible();
  for (let i = 1; i <= 15; i++)
    await page
      .getByRole("checkbox", { name: new RegExp(`: Choice ${i}$`) })
      .check();
  expect(
    await page
      .getByRole("checkbox")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("aria-label")),
      ),
  ).toEqual(order);
  await page.getByRole("button", { name: "Submit answer" }).click();
  await expect(page.getByText("Correct!", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("large-study-mobile.png"),
    fullPage: true,
  });
  await page.goto("/update/merge-deck");
  await page
    .getByLabel("Upload update JSON (maximum 2 MB)")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          updates: [{ cardId: cards[0].id, answer: "Missing option" }],
        }),
      ),
    });
  await page.getByRole("button", { name: "Preview update" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "must appear exactly once",
  );
  expect(((await stored("decks")) as { cards: unknown[] }).cards).toHaveLength(
    15,
  );
  await page
    .getByLabel("Update JSON", { exact: true })
    .fill(JSON.stringify({ cards: [{ id: cards[0].id }] }));
  await page.getByLabel("Update mode").selectOption("replace");
  await page.getByRole("button", { name: "Preview update" }).click();
  await expect(
    page.getByRole("button", { name: "Apply update", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /14 existing cards will be removed/ })
    .check();
  await page.getByRole("button", { name: "Apply update", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Update applied. 1 cards",
  );
  await page.reload();
  expect(((await stored("decks")) as { cards: unknown[] }).cards).toHaveLength(
    1,
  );
});

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

  const question = page.getByLabel("Question", { exact: true }).first();
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
  await expect(
    page.getByLabel("Question", { exact: true }).first(),
  ).toHaveValue("What is the HTTP protocol?");

  await page.getByRole("button", { name: "Add card", exact: true }).click();
  await page
    .getByLabel("Question", { exact: true })
    .last()
    .fill("What is the DOM?");
  await page
    .getByLabel("Answer", { exact: true })
    .last()
    .fill("The Document Object Model");
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
  await expect(
    page.getByRole("heading", { name: "How ZapLearn works" }),
  ).toBeVisible();
  await expect(
    page.getByText(/there is currently no account or cloud sync/i),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Backup deck", exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exportedText = await readFile(downloadPath!, "utf8");
  const exported = JSON.parse(exportedText) as {
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

  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: download.suggestedFilename(),
      mimeType: "application/json",
      buffer: Buffer.from(exportedText),
    });
  await expect(
    page.getByRole("heading", { name: "ZapLearn Test Deck" }),
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

test("imports, studies, persists, and exports multiple-choice cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "multiple-choice.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          title: "Multiple Choice Deck",
          cards: [
            {
              type: "multiple-choice",
              question: "What does WBS stand for?",
              answer: "Work Breakdown Structure",
              options: [
                "Workflow Business System",
                "Work Breakdown Structure",
                "Work Balance Schedule",
              ],
            },
            {
              type: "multiple-choice",
              question: "Which protocol encrypts web traffic?",
              answer: "HTTPS",
              options: ["FTP", "HTTPS", "SMTP"],
            },
          ],
        }),
      ),
    });

  await page.getByRole("link", { name: "Edit Multiple Choice Deck" }).click();
  await expect(page.getByRole("combobox", { name: "Card 1 type" })).toHaveText(
    "Multiple choice",
  );
  await page
    .getByRole("textbox", { name: "Option 1", exact: true })
    .first()
    .fill("Workflow Planning System");
  await expect(page.getByTestId("save-status")).toHaveText("Saving…");
  await expect(page.getByTestId("save-status")).toHaveText("Saved", {
    timeout: 3_000,
  });
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Option 1", exact: true }).first(),
  ).toHaveValue("Workflow Planning System");
  await page.getByRole("link", { name: "ZapLearn" }).click();
  await page.getByRole("link", { name: "Study" }).first().click();
  await expect(
    page.getByRole("heading", { name: "What does WBS stand for?" }),
  ).toBeVisible();
  const initialOrder = await page
    .getByRole("button", { name: /^Option \d:/ })
    .evaluateAll((options) =>
      options.map((option) => option.getAttribute("aria-label")),
    );
  await page.getByRole("button", { name: /Workflow Planning System/ }).click();
  await expect(page.getByText("Incorrect.")).toBeVisible();
  await expect(page.getByText(/Correct answer:/)).toContainText(
    "Work Breakdown Structure",
  );
  await expect(
    page.getByRole("button", { name: /Work Balance Schedule/ }),
  ).toBeDisabled();
  expect(
    await page
      .getByRole("button", { name: /^Option \d:/ })
      .evaluateAll((options) =>
        options.map((option) => option.getAttribute("aria-label")),
      ),
  ).toEqual(initialOrder);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /^Theme:/ }).click();
  await page.getByRole("menuitem", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("button", { name: /Work Breakdown Structure/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Which protocol encrypts web traffic?",
    }),
  ).toBeVisible();
  await expect(page.getByText("Incorrect.")).toBeHidden();
  await page.getByRole("button", { name: /HTTPS/ }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
  await page.getByRole("button", { name: /^Finish/ }).click();
  await expect(page.getByText("Session complete")).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page.getByText("Caught up")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Caught up")).toBeVisible();
  await page.getByRole("link", { name: "Manage all" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Backup deck", exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = JSON.parse(await readFile(downloadPath!, "utf8")) as {
    cards: Array<{ type?: string; options?: string[] }>;
  };
  expect(exported.cards[0]).toMatchObject({
    type: "multiple-choice",
    options: expect.arrayContaining(["Work Breakdown Structure"]),
  });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("requests persistent storage after the first deck is created", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let persistent = false;
    Reflect.set(window, "__zaplearnPersistCalls", 0);
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {
        persisted: async () => persistent,
        persist: async () => {
          Reflect.set(
            window,
            "__zaplearnPersistCalls",
            Number(Reflect.get(window, "__zaplearnPersistCalls")) + 1,
          );
          persistent = true;
          return true;
        },
      },
    });
  });
  await page.goto("/");
  expect(
    await page.evaluate(() => Reflect.get(window, "__zaplearnPersistCalls")),
  ).toBe(0);
  await page.getByRole("button", { name: "Create deck" }).first().click();
  await page.getByLabel("Title").fill("Protected deck");
  await page.getByRole("button", { name: "Create and edit" }).click();
  await page
    .getByLabel("Main navigation")
    .getByRole("link", { name: "Manage decks" })
    .click();
  await expect(page.getByText("Persistent storage granted")).toBeVisible();
  expect(
    await page.evaluate(() => Reflect.get(window, "__zaplearnPersistCalls")),
  ).toBe(1);
});

test("works when the persistent-storage API is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Create deck" }).first().click();
  await page.getByLabel("Title").fill("Unsupported API deck");
  await page.getByRole("button", { name: "Create and edit" }).click();
  await expect(
    page.getByRole("heading", { name: "Unsupported API deck" }),
  ).toBeVisible();
  await page
    .getByLabel("Main navigation")
    .getByRole("link", { name: "Manage decks" })
    .click();
  await expect(page.getByText("Persistence API unavailable")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Unsupported API deck" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Backup deck", exact: true }).click();
  expect((await download).suggestedFilename()).toBe(
    "unsupported-api-deck.json",
  );
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

test("long study cards grow without internal scrolling in light and dark themes", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const longAnswer = Array.from(
    { length: 10 },
    (_, index) =>
      `Explanation ${index + 1}: Flashcards should remain readable when an answer contains several detailed paragraphs.`,
  ).join("\n\n");
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "long-content.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          title: "Long Content Deck",
          cards: [
            {
              question:
                "How should this exceptionallylongunbrokenquestionwordthatmustneveroverflow behave on a narrow mobile screen?",
              answer: longAnswer,
            },
          ],
        }),
      ),
    });
  await page.getByRole("link", { name: "Study" }).first().click();

  const flashcard = page.getByRole("button", { name: "Show answer" });
  const cardStyles = await flashcard.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      overflowY: styles.overflowY,
      whiteSpace: styles.whiteSpace,
    };
  });
  expect(cardStyles.height).toBeGreaterThan(320);
  expect(cardStyles.overflowY).not.toMatch(/auto|scroll/);
  expect(cardStyles.whiteSpace).toBe("normal");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await flashcard.click();
  await expect(
    page.getByText("Explanation 10:", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Incorrect", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Correct", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Deck imported")).toBeHidden({ timeout: 6_000 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: testInfo.outputPath("study-mobile-light.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: /^Theme:/ }).click();
  await page.getByRole("menuitem", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("menu")).toBeHidden();
  const themeColors = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      primary: styles.getPropertyValue("--primary").trim(),
      secondary: styles.getPropertyValue("--secondary").trim(),
      accent: styles.getPropertyValue("--accent").trim(),
    };
  });
  expect(themeColors.primary).toMatch(/^oklch\((?:0\.92|92%) 0 0\)$/);
  expect(themeColors.secondary).toMatch(/^oklch\((?:0\.27|27%) 0 0\)$/);
  expect(themeColors.accent).toMatch(/^oklch\((?:0\.27|27%) 0 0\)$/);
  await page.screenshot({
    path: testInfo.outputPath("study-mobile-dark.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: testInfo.outputPath("study-desktop-dark.png"),
    fullPage: true,
  });
});

test("imports hostile markup as text without creating HTML elements", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  const question = '<img src=x onerror="window.injected=true">';
  const answer = "<script>window.injected=true</script>";
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "untrusted.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          title: "Untrusted text",
          cards: [{ question, answer }],
        }),
      ),
    });
  await page.getByRole("link", { name: "Study", exact: true }).first().click();
  await expect(page.getByText(question, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.getByText(answer, { exact: true })).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(
    await page.evaluate(() => Reflect.get(window, "injected")),
  ).toBeUndefined();
  expect(errors).toEqual([]);
});

test("requests storage after import, but does not repeat a denied request for later decks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Reflect.set(window, "persistCalls", 0);
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {
        persisted: async () => false,
        persist: async () => {
          Reflect.set(
            window,
            "persistCalls",
            Number(Reflect.get(window, "persistCalls")) + 1,
          );
          return false;
        },
      },
    });
  });
  await page.goto("/");
  expect(await page.evaluate(() => Reflect.get(window, "persistCalls"))).toBe(
    0,
  );
  await page.locator('input[type="file"]').first().setInputFiles(fixture);
  await expect(
    page.getByRole("heading", { name: "ZapLearn Test Deck" }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "persistCalls")))
    .toBe(1);
  await page.getByRole("button", { name: "Create deck" }).first().click();
  await page.getByLabel("Title").fill("Second deck");
  await page.getByRole("button", { name: "Create and edit" }).click();
  await expect(
    page.getByRole("heading", { name: "Second deck" }),
  ).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "persistCalls"))).toBe(
    1,
  );
});

test("multi-answer import, keyboard study, progress persistence, editor and export", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import JSON" }).first().click();
  await (
    await chooser
  ).setFiles(path.resolve("../TestData/multiple-answer-e2e.json"));
  await expect(
    page.getByRole("heading", { name: "Multiple answer test" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Study", exact: true }).first().click();
  await expect(page.getByText("Select all answers that apply.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit answer" }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: /: Python$/ }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("checkbox", { name: /: JavaScript$/ }).check();
  await page.getByRole("button", { name: "Submit answer" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Correct!", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit answer" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("multi-answer-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Finish" }).click();
  await page.reload();
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("zaplearn");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const values = await new Promise<unknown[]>((resolve, reject) => {
      const request = db
        .transaction("progress")
        .objectStore("progress")
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return JSON.stringify(values);
  });
  expect(stored).toContain('"correctCount":1');
  expect(stored).toContain('"incorrectCount":0');
  await page.goto("/");
  await page.getByRole("link", { name: "Edit Multiple answer test" }).click();
  await expect(page.getByLabel("Set option 1 as correct")).toBeChecked();
  await expect(page.getByLabel("Set option 3 as correct")).toBeChecked();
  await page.getByLabel("Correct-answer mode").selectOption("single");
  await expect(page.getByText(/Choose which answer to keep/)).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByLabel("Option 3", { exact: true }).fill("TypeScript");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  await page.reload();
  await expect(page.getByLabel("Option 3", { exact: true })).toHaveValue(
    "TypeScript",
  );
  await expect(page.getByLabel("Set option 3 as correct")).toBeChecked();
  await page.goto("/manage");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Backup deck", exact: true }).click();
  const file = await (await downloading).path();
  const json = JSON.parse(await readFile(file!, "utf8")) as {
    cards: Array<{ answers: string[]; answer?: string }>;
  };
  expect(json.cards[0].answers).toEqual(["Python", "TypeScript"]);
  expect(json.cards[0].answer).toBeUndefined();
});
