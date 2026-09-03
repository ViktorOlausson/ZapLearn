# ZapLearn

ZapLearn is a local-first PWA for importing, editing, studying, and exporting JSON flashcard decks. It has no backend or account system: decks, progress, and settings are stored in the browser's IndexedDB.

# How ZapLearn Works

ZapLearn lets you build a personal flashcard library and study it without creating an account.

## 1. Create or import a deck

You can create an empty deck in ZapLearn and add cards yourself, or import a deck from a JSON file. ZapLearn checks imported files before saving them and shows a readable error if the JSON is malformed or a required field is missing.

Each deck and card needs an ID so ZapLearn can connect edits and study history to the right item. IDs in imported files are kept. When a card has no ID, ZapLearn creates a repeatable ID from its question and category. Newly created decks and cards receive new IDs automatically.

## 2. Your data stays in this browser

Decks, card edits, theme settings, and study progress are stored locally using IndexedDB. They normally remain available after a page refresh or after closing and reopening the browser.

ZapLearn currently has no account, cloud database, or cloud synchronization. Data saved in one browser or device does not automatically appear in another. Clearing cookies and site data, resetting the browser profile, or uninstalling the browser may remove the local data. Export important decks to JSON for backup or to move them to another device.

## 3. Persistent browser storage

When the browser supports the Storage API, ZapLearn asks it to mark the site's storage as persistent. If the browser grants the request, it is less likely to remove ZapLearn data automatically when device storage is low. The browser makes the final decision, and persistent storage does not protect against manually clearing site data, device loss, or browser-profile loss. It is not a replacement for JSON backups.

## 4. Edit a deck

The deck editor saves changes automatically to IndexedDB. You can add, edit, duplicate, and remove cards. Each card contains:

- **Question:** the prompt shown first while studying.
- **Answer:** the information revealed when the card is flipped.
- **Category:** an optional group or subject name.
- **Tags:** optional keywords used to organize and find cards.
- **Difficulty:** an optional Easy, Medium, or Hard label for filtering and organization.

The editor also lets you change the deck title and language and search or filter its cards.

## 5. Study cards

Choose **Study** on a deck to begin a session. ZapLearn shows one card at a time with the question first. Click or tap the card—or press **Space** or **Enter**—to reveal the answer. After revealing it, mark your response **Incorrect** or **Correct**. The number keys **1** and **2** also grade an answer, and the arrow keys move between cards where navigation is available.

## 6. Lightweight spaced repetition

Study mode uses a simple three-stage spaced-repetition system: **new**, **learning**, and **mastered**. It is intentionally lightweight rather than a claim of a scientifically optimal schedule.

- New cards are due immediately.
- A correct answer moves a new card into learning and schedules it in about one hour.
- Another correct answer moves it to mastered and schedules it in about one day.
- Continued correct answers use progressively longer intervals.
- An incorrect answer moves the card back toward new and schedules a short retry in about ten minutes.

Study sessions prioritize cards that are due, followed by new cards. If nothing is due, ZapLearn offers an optional full-deck review.

## 7. Study progress

Progress is tracked separately for each card. ZapLearn records whether a card is new, learning, or mastered; its correct and incorrect answer totals; and when it is due for review. Dashboard and management summaries use this information to show your progress. It remains available when you reopen ZapLearn in the same browser and device, unless that browser data is cleared.

## 8. Browse without changing progress

Use **Browse** mode to move through every card, flip between questions and answers, and review freely. Browsing does not record answers or change spaced-repetition progress.

## 9. Import, export, and backups

The Manage Decks screen can export a deck as readable JSON. A normal **Deck** export can be shared, moved to another device, and imported into ZapLearn later.

The **With progress** option downloads a bundle containing both the deck and its current progress. This preserves the information in one backup file, but the current importer accepts the deck-only format and does not yet restore progress from the wrapped bundle. Keep a deck-only export when you need a file that can be re-imported directly.

## 10. AI-generated decks are optional

ZapLearn does not use or require AI. You can write every card yourself. If you prefer, ChatGPT or another AI tool can generate cards in ZapLearn's JSON format, which you can review and import like any other deck. See [Creating flashcards with AI](#creating-flashcards-with-ai) for an example.

## 11. Privacy

The current version is local-first. Decks you create or import and the progress you record stay in browser storage. ZapLearn does not upload that local study data. Data leaves the browser only through an action you choose, such as downloading an export, or through a future network feature if one is added and enabled.

## 12. Hosting ZapLearn

ZapLearn builds to static HTML, CSS, and JavaScript files. It can be hosted on Cloudflare Pages, GitHub Pages, Netlify, Vercel, or a normal web server. The host delivers the application files; in the current local-first version, each user's decks and progress remain in that user's browser.

Because ZapLearn uses browser routes, the host must send `index.html` for unknown application paths. Some hosts provide this as an SPA fallback setting; GitHub Pages needs an equivalent fallback configuration.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Use **Import deck** to select or drop a JSON file.

## Creating flashcards with AI

You can ask ChatGPT or another AI assistant to return only JSON matching the format below. Review generated questions and answers for accuracy before importing the file into ZapLearn. AI is optional—the same format can be written by hand or produced by another tool.

A minimal deck looks like this:

```json
{
  "title": "Projektledning – begrepp",
  "lang": "sv",
  "cards": [
    {
      "question": "Vad är WBS?",
      "answer": "Work Breakdown Structure.",
      "category": "Projektledning",
      "tags": ["planering"],
      "difficulty": 2
    }
  ]
}
```

Card IDs are optional on import. ZapLearn generates deterministic IDs from the question and category, which preserves progress when a deck is updated with the same cards. Exported decks include stable IDs.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test:run
npm run test:e2e
npm run build
npm run test:pwa
```

## Docker

From this directory:

```bash
docker build -t zaplearn .
docker run --rm -p 8080:80 zaplearn
```

To make a seed deck available, mount a deck directory and point `DECK_URL` at its public path:

```bash
docker run --rm -p 8080:80 -e DECK_URL=/data/project-management.json -v ./decks:/usr/share/nginx/html/data:ro zaplearn
```

The seed deck is read-only. Editing it creates a local fork, and user-created decks are never overwritten by Docker configuration. `/runtime/config.json` is fetched at startup without permanent caching.

## Design notes

- IndexedDB stores decks, progress, and settings in separate localForage stores.
- The repetition function is pure and uses new → learning (1 hour) → mastered (1 day, then increasing intervals); incorrect answers return cards to a short 10-minute retry interval.
- The service layer validates every imported JSON payload with Zod and contains the URL loading/ETag extension point.
- The PWA caches the app shell for offline use while using network-first behavior for runtime configuration.
