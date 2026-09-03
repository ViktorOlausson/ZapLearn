# ZapLearn

ZapLearn is a local-first PWA for importing, editing, studying, and exporting JSON flashcard decks. It has no backend or account system: decks, progress, and settings are stored in the browser's IndexedDB.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Use **Import deck** to select or drop a JSON file. A minimal deck looks like this:

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
