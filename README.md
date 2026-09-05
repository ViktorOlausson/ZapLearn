# ZapLearn

ZapLearn is a local-first flashcard app for creating, importing, editing, and studying decks without an account. It runs as a static website and saves your work in your browser.

## Main features

- Create decks and edit cards with automatic saving.
- Import validated JSON through the file picker or drag and drop.
- Study traditional flashcards, multiple-choice questions, or mixed decks.
- Track correct/incorrect answers with a simple spaced-repetition schedule.
- Browse cards without changing progress; search and filter study material.
- Manage, duplicate, export, reset, and delete decks.
- Use keyboard controls, mobile layouts, and light/dark/system themes.
- Install as a PWA and use the cached app offline after an initial online visit.
- Optionally serve a read-only seed deck through the Docker configuration.

## Technology stack

React 19, TypeScript, Vite, React Router, Tailwind CSS, Radix UI components, Zustand, React Hook Form, Framer Motion, Zod, and localForage. The PWA uses vite-plugin-pwa/Workbox. Checks use ESLint, TypeScript, Vitest, React Testing Library, and Playwright.

## Local storage and backups

Decks, edits, settings, and study progress are stored in IndexedDB through localForage, in the `zaplearn` database. Existing database and object-store names are preserved. Data normally survives reloads and browser restarts in the same profile, browser, device, and website origin. Changing the host, protocol, or port opens a different storage area.

There is currently **no account or cloud sync system**, server database, or automatic cross-device transfer. IndexedDB must be available; a failed save is reported instead of silently using localStorage for decks or progress.

After a successful first deck creation or import into an empty library, ZapLearn requests persistent browser storage when supported. It only checks status at startup; it does not request permission on page load. Manage decks displays whether persistence was granted, remains best-effort, is unsupported, or cannot be checked. A user can manually retry the request. A denial or unavailable API does not prevent IndexedDB use.

Persistent storage can reduce automatic eviction, but **browser storage is not a guaranteed backup**. Clearing site data, deleting a browser profile, private-browsing cleanup, or losing a device can remove decks and progress. Use HTTPS in production for browser features such as persistence and service workers; localhost supports local testing. See [StorageManager.persist documentation](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).

**Recommended backup:** open **Manage decks → Backup deck** and keep the downloaded JSON somewhere safe. Use **Import JSON** to restore it or transfer it to another browser/device. **Backup + progress** archives both documents, but the wrapped bundle cannot currently be restored by Import JSON. To recover its deck, save the bundle's `deck` object as a separate JSON file; progress restoration is not implemented. No export is automatically uploaded.

## Importing and exporting decks

1. Select **Import JSON**, or drop a `.json` file on the import area.
2. ZapLearn checks the actual content with JSON parsing and Zod before saving. A `.json` extension or JSON MIME type is a picker hint, not proof that content is safe.
3. Files and downloaded seed responses are limited to **2 MiB (2,097,152 bytes)**, shown as 2 MB in the UI. Invalid imports show validation errors.
4. Export any deck from **Manage decks → Backup deck**. Exports preserve card IDs, types, and multiple-choice options.

Expected JSON deck format:

```json
{
  "title": "Deck title",
  "lang": "en",
  "cards": [
    {
      "question": "Question",
      "answer": "Answer",
      "category": "Category",
      "tags": ["tag1", "tag2"],
      "difficulty": 2
    }
  ]
}
```

`title` is required and `cards` must be a non-empty array. Each card requires non-empty `question` and `answer` strings. Optional fields include `lang` (such as `en` or `sv-SE`), `category`, `tags`, and `difficulty` (`1`, `2`, or `3`; defaults to `2`). Tags default to an empty array. Unrecognized properties are stripped.

Deck and card IDs are optional. Missing deck IDs are generated; missing card IDs are generated deterministically from question and category. Avoid duplicate questions within a category: cards must have distinct IDs. IDs that collide with object-prototype keys, such as `__proto__` or `constructor`, are rejected. An import matching an existing deck ID offers **Update**, preserving progress for matching card IDs.

Cards without `type`, or with `"type": "flashcard"`, are traditional flashcards. Multiple-choice cards use:

```json
{
  "type": "multiple-choice",
  "question": "Which protocol encrypts web traffic?",
  "answer": "HTTPS",
  "options": ["HTTP", "HTTPS", "FTP"]
}
```

Provide 2–6 non-empty unique options; the exact answer must appear once. A deck can mix both card types. Examples: [flashcards](zaplearn/fixtures/example-deck.json), [multiple choice](zaplearn/fixtures/multiple-choice-deck.json), and [mixed deck](zaplearn/fixtures/mixed-deck.json).

## Creating flashcards with AI

ZapLearn does not require AI. Cards can be written manually or generated by any tool that produces the supported JSON structure. Generated study material should be reviewed for accuracy before import.

### Traditional flashcard prompt

Copy and customize this prompt for ChatGPT or another LLM:

```text
Create a ZapLearn-compatible flashcard deck from the study material I provide.

Return valid JSON only.
Do not wrap the JSON in markdown fences.
Do not include commentary before or after the JSON.

Use exactly this structure:
{
  "title": "Deck title",
  "lang": "en",
  "cards": [
    {
      "question": "Question",
      "answer": "Answer",
      "category": "Category",
      "tags": ["tag1", "tag2"],
      "difficulty": 2
    }
  ]
}

Rules:
- title is required.
- cards must be an array.
- Every card requires question and answer.
- category, tags, and difficulty are optional.
- difficulty, when present, must be 1, 2, or 3.
- Do not generate deck or card IDs unless I specifically request them. ZapLearn can generate stable IDs during import.
- Avoid duplicate or near-duplicate questions.
- Keep answers concise but sufficiently complete to study independently.
- Preserve the requested language and the source terminology when study material is provided.
- Base questions and answers on the supplied material.
- Use the language code and content language I request.

Requested deck title: [TITLE]
Requested language/code: [LANGUAGE AND CODE]
Desired number of cards: [NUMBER]
Topic or source material:
[PASTE TOPIC OR STUDY MATERIAL HERE]
```

### Multiple-choice prompt

```text
Create a ZapLearn-compatible multiple-choice study deck from the study material I provide.

Return valid JSON only.
Do not wrap the JSON in Markdown code fences.
Do not include explanations, notes, or commentary before or after the JSON.

Use this exact structure:
{
  "title": "Deck title",
  "lang": "en",
  "cards": [
    {
      "type": "multiple-choice",
      "question": "Question",
      "answer": "Correct answer",
      "options": [
        "Correct answer",
        "Plausible incorrect answer 1",
        "Plausible incorrect answer 2",
        "Plausible incorrect answer 3"
      ],
      "category": "Category",
      "tags": ["tag1", "tag2"],
      "difficulty": 2
    }
  ]
}

Requirements:
- title is required.
- cards must be an array.
- Every card must use "type": "multiple-choice".
- Every card requires question, answer, and options.
- answer is the correct answer.
- The exact value of answer must appear once and only once in options.
- Include 4 answer options whenever the source material supports good alternatives.
- Use at least 3 options when 4 good options cannot be created.
- Exactly one option must be correct. All other options must be incorrect.
- Do not mark the correct option using letters, symbols, or explanatory text.
- Do not write things such as "(correct)" inside the options.
- Do not always place the correct answer first.
- Avoid duplicate answer options and duplicate questions.
- Do not generate IDs unless specifically requested because ZapLearn generates stable IDs during import.
- category, tags, and difficulty are optional.
- difficulty, when present, must be 1, 2, or 3.
- Preserve the requested language and terminology of the source material.
- Base the questions strictly on supplied study material when it is provided.
- Do not invent facts that are not supported by the supplied material.

QUALITY REQUIREMENTS FOR INCORRECT OPTIONS:
- Incorrect options must be plausible distractors, not ridiculous or unrelated filler.
- They should belong to the same subject area as the correct answer.
- They should be grammatically compatible with the question.
- They should have a similar level of specificity as the correct answer.
- Use realistic misconceptions where possible.
- They must be clearly incorrect according to the source material.
- They must not be partially correct unless the question explicitly allows that distinction.
- Avoid giving away the answer through formatting, length, or extra detail.

QUESTION QUALITY:
- Test understanding, recognition, concepts, terminology, and meaningful distinctions.
- Avoid unnecessary trick questions.
- Avoid ambiguous questions where multiple options could reasonably be correct.
- If more than one answer could be correct, rewrite the question so there is exactly one defensible correct answer.
- Keep questions clear and concise.

ANSWER QUALITY:
- Keep answers concise but sufficiently complete.
- Preserve important source terminology.
- If the source uses a specific technical term, use that term instead of a less precise synonym.

Requested deck title: [TITLE]
Requested language/code: [LANGUAGE AND CODE]
Desired number of cards: [NUMBER]
Study material:
[PASTE STUDY MATERIAL HERE]
```

### Mixed-deck prompt

```text
Create a ZapLearn-compatible study deck using a mixture of traditional flashcards and multiple-choice questions.

Use traditional flashcards for concepts best recalled freely. Use multiple-choice questions when recognizing the correct concept among plausible alternatives is useful.

Return valid JSON only. Do not use Markdown fences or include commentary before or after the JSON.

Return one object with a required "title", an optional language code in "lang", and a "cards" array.

Traditional card:
{
  "question": "...",
  "answer": "..."
}

Multiple-choice card:
{
  "type": "multiple-choice",
  "question": "...",
  "answer": "Correct answer",
  "options": [
    "Correct answer",
    "Plausible incorrect option",
    "Plausible incorrect option",
    "Plausible incorrect option"
  ]
}

Requirements:
- Every card requires question and answer.
- Multiple-choice cards also require type and options.
- For multiple-choice cards, exactly one answer must be correct and answer must occur exactly once in options.
- Use 3–6 unique options with plausible incorrect alternatives.
- Avoid ambiguous and duplicate questions.
- Do not indicate the correct option through formatting, wording, letters, or symbols.
- category, tags, and difficulty are optional; difficulty must be 1, 2, or 3.
- Do not generate IDs unless specifically requested; ZapLearn generates stable IDs during import.
- Keep answers concise but sufficiently complete.
- Preserve the requested language and important source terminology.
- Base every card on the supplied material and do not invent unsupported facts.

Requested deck title: [TITLE]
Requested language/code: [LANGUAGE AND CODE]
Desired number of cards: [NUMBER]
Study material:
[PASTE STUDY MATERIAL HERE]
```

## Run locally

Use Node.js 22.12+ and npm (the included Docker build uses Node 20.19+).

```bash
cd zaplearn
npm ci
npm run dev
```

Open the URL printed by Vite. No backend, account setup, API keys, or environment secrets are required.

## Verification

From `zaplearn`:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run test:e2e
npm run test:pwa
```

Playwright uses installed Chrome locally and bundled Chromium in CI. For CI, install it with `npx playwright install --with-deps chromium`. Set `ZAPLEARN_PRODUCTION=1` when running `npm run test:e2e` to test the built app with production headers rather than the Vite development server. In PowerShell use `$env:ZAPLEARN_PRODUCTION='1'` first; in a POSIX shell use `ZAPLEARN_PRODUCTION=1 npm run test:e2e`.

Browser tests cover import/export/re-import, IndexedDB contents, edits and progress surviving reload, persistence request timing, unsupported APIs, hostile markup rendered as text, themes, mobile layouts, and offline loading.

## Production build and static deployment

```bash
cd zaplearn
npm ci
npm run build
npm run preview
```

Build output is `zaplearn/dist`. Preview is for local inspection, not a production web server; it applies the common security headers from `public/_headers` so browser checks exercise the production CSP.

Deploy the contents of `dist` to a static host or web server. Typical repository deployment settings:

| Setting                    | Value                     |
| -------------------------- | ------------------------- |
| Application/root directory | `zaplearn`                |
| Build command              | `npm ci && npm run build` |
| Output directory           | `dist`                    |
| Node version               | 22.12+                    |

Configure HTTPS and an SPA fallback to `index.html` for routes such as `/manage`, `/edit/:deckId`, and `/train/:deckId`. The included `_redirects` and `_headers` files support hosts that consume Netlify-style configuration. On other hosts, configure equivalent rewrites and response headers explicitly; copying those files alone does not apply the policy. Deploy at the origin root: project subpaths require changes to Vite base, router, manifest, icon, and runtime-config paths.

## Docker

The existing multi-stage Dockerfile builds the Vite app and serves it with Nginx, SPA routing, and security headers.

From the repository root:

```bash
docker build -t zaplearn ./zaplearn
docker run --rm -p 8080:80 zaplearn
```

Open `http://localhost:8080`. For public hosting, terminate HTTPS at your reverse proxy or hosting platform.

To provide a public, read-only seed deck:

```bash
docker run --rm -p 8080:80 -e DECK_URL=/data/example-deck.json -v ./zaplearn/fixtures:/usr/share/nginx/html/data:ro zaplearn
```

The container writes `/runtime/config.json` at startup. Keep seed URLs same-origin for the included CSP. Missing or invalid seed data does not prevent local decks from working. Mounted seed files are public to visitors; do not put private files or credentials in that directory. User decks remain in each visitor's browser, not in the container filesystem.

## Privacy and security

- Imported JSON and URL-loaded seeds are data only: the app does not execute them with `eval`, `new Function`, or script injection.
- Card text is rendered as ordinary React text. There is no Markdown or HTML renderer, so imported markup is displayed literally and DOMPurify is not needed. Any future HTML/Markdown rendering must sanitize output with DOMPurify before insertion.
- Zod validates deck imports and stored deck/progress writes. Schemas strip unexpected properties; imported objects are not recursively merged into app configuration. Reserved IDs are rejected before they can become unsafe record keys.
- File size is checked before reading; remote bodies are also bounded while streaming, even when Content-Length is missing or misleading. URL decks allow only HTTP(S), use the same JSON validation, and cannot insert scripts. The production CSP limits connections to the app's own origin.
- No application secrets, tokens, or credentials are stored in IndexedDB/localStorage. Browser data and exported JSON are not application-encrypted; anyone with access to the browser profile or backup files may read them.
- Decks and progress are not uploaded. The host receives ordinary asset/configuration requests and may log connection metadata. Optional seed requests are network requests. Pasting source material into an external AI tool is governed by that tool's policies.
- There are currently no `target="_blank"` links. Future external new-tab links should use `rel="noopener noreferrer"`.
- Nginx and compatible static hosts send `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, framing controls, and Content Security Policy. Nginx runtime-config responses retain these headers alongside their no-store policy; see [Nginx header inheritance](https://nginx.org/en/docs/http/ngx_http_headers_module.html).
- CSP restricts scripts, workers, network access, and assets to the origin and blocks plugins/frames. Inline scripts and dynamic evaluation remain blocked. Inline styles are allowed for Sonner/Radix component styles and React animation/positioning; this exception does not permit imported HTML or JavaScript. Theme changes use the existing settings store without an inline bootstrap script.

These are practical frontend protections, not a guarantee of security. Keep dependencies and hosting software updated and review changes before deployment.

## Current limitations

- No accounts, cloud sync, collaboration, or automatic backup.
- Persistence is browser-controlled and never protects against clearing site data.
- Progress bundles can be exported but cannot yet be restored through the importer.
- Imported decks require at least one card; add a card to an empty local deck before exporting it for re-import.
- Locally edited decks can grow beyond the 2 MiB import limit; split very large decks before using exports for transfer.
- JSON is the only import format; CSV and Anki packages are unsupported.
- Scheduling uses simple new/learning/mastered stages, not an advanced learning model.
- Offline use requires an initial successful online visit; API behavior and storage quotas vary by browser.
- The supplied production policy expects same-origin seed URLs and deployment at the origin root.

## AI development transparency

> ZapLearn was developed with substantial assistance from AI-based development tools. The project has also been human-directed, reviewed, tested, and refined. AI-generated code should not be assumed to be automatically correct or secure, and the application is maintained with human oversight.

## License

Copyright 2026 Viktor Olausson. See [LICENSE.md](LICENSE.md) for the project's PolyForm Noncommercial License 1.0.0 and commercial-use terms. Third-party dependencies retain their respective licenses.
