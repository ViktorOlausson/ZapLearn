# ZapLearn

ZapLearn is a local-first flashcard app for creating, importing, editing, and studying decks without an account. It runs as a static website and saves your work in your browser.

## Main features

- Create decks and edit cards with automatic saving.
- Import validated JSON through the file picker or drag and drop.
- Study traditional flashcards, multiple-choice questions, or mixed decks.
- Add question and answer images from your device or URLs, with descriptions, captions, and previews.
- Create multiple cards with Image Card Builder; back up uploaded images in portable ZIP packages.
- Copy ready-to-use AI prompts for cards and study images from About.
- Track correct/incorrect answers with a simple spaced-repetition schedule.
- Browse cards without changing progress; search and filter study material.
- Manage, duplicate, export, reset, and delete decks.
- Use keyboard controls, mobile layouts, and light/dark/system themes.
- Install as a PWA and use the cached app offline after an initial online visit.
- Optionally serve a read-only seed deck through the Docker configuration.

## Technology stack

React 19, TypeScript, Vite, React Router, Tailwind CSS, Radix UI components, Zustand, React Hook Form, Framer Motion, Zod, and localForage. The PWA uses vite-plugin-pwa/Workbox. Checks use ESLint, TypeScript, Vitest, React Testing Library, and Playwright.

## Local storage and backups

Decks, edits, settings, study progress, and uploaded image Blobs are stored in IndexedDB through localForage, in the `zaplearn` database. Existing database and object-store names are preserved. Data normally survives reloads and browser restarts in the same profile, browser, device, and website origin. Changing the host, protocol, or port opens a different storage area.

There is currently **no account or cloud sync system**, server database, or automatic cross-device transfer. IndexedDB must be available; a failed save is reported instead of silently using localStorage for decks or progress.

After a successful first deck creation or import into an empty library, ZapLearn requests persistent browser storage when supported. It only checks status at startup; it does not request permission on page load. Manage decks displays whether persistence was granted, remains best-effort, is unsupported, or cannot be checked. A user can manually retry the request. A denial or unavailable API does not prevent IndexedDB use.

Persistent storage can reduce automatic eviction, but **browser storage is not a guaranteed backup**. Clearing site data, deleting a browser profile, private-browsing cleanup, or losing a device can remove decks and progress. Use HTTPS in production for browser features such as persistence and service workers; localhost supports local testing. See [StorageManager.persist documentation](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).

**Recommended backup:** for decks with uploaded images, use **Manage decks → Export with images** to download a `.zaplearn.zip` package containing `deck.json` and the local image files; import it through the same file picker to restore the deck and images. Image packages do not include progress or download external URL images. For URL-only or text decks, open **Manage decks → Backup deck** and keep the downloaded JSON somewhere safe. Use **Import JSON** to restore it or transfer it to another browser/device. **Backup + progress** archives both documents, but the wrapped bundle cannot currently be restored by Import JSON. To recover its deck, save the bundle's `deck` object as a separate JSON file; progress restoration is not implemented. No export is automatically uploaded.

## Importing and exporting decks

1. Select **Import JSON**, or drop a `.json` deck or `.zaplearn.zip` image package on the import area.
2. ZapLearn checks the actual content with JSON parsing and Zod before saving. A `.json` extension or JSON MIME type is a picker hint, not proof that content is safe.
3. JSON files and downloaded seed responses are limited to **2 MiB (2,097,152 bytes)**, shown as 2 MB in the UI. Invalid imports show validation errors.
4. Export any deck from **Manage decks → Backup deck**. Exports preserve card IDs, types, multiple-choice options, and image metadata. Image files themselves are not included.

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

### Images in the JSON deck format

Both card types optionally accept `questionImage` and `answerImage`, using the same image structure:

```ts
type CardImage =
  | { type?: "url"; src: string; alt: string; caption?: string }
  | { type: "local"; assetId: string; alt: string; caption?: string };
// Optional fields on any card:
// questionImage?: CardImage
// answerImage?: CardImage
```

For URL images, `src` and meaningful `alt` text are required and cannot be blank. `caption` is optional. URLs are limited to 4,096 characters; alt text and captions to 2,000 characters each. Unexpected properties are stripped. Invalid imports identify the card and field, for example `Card 14 · questionImage.src`.

Use an absolute **HTTPS URL** or a **same-origin root path**, such as `/images/anatomy/deltoid.jpg` or `/data/images/deltoid.jpg`. Root paths always refer to the ZapLearn website, including when a deck comes from another URL; deck-relative paths such as `images/deltoid.jpg` are not supported. URL credentials, protocol-relative URLs (`//host/image.jpg`), HTTP external URLs, `data:`, `blob:`, `file:`, `javascript:`, and other schemes are rejected. Encode spaces in URLs as `%20`. SVG resources may be loaded as ordinary `<img>` images; imported SVG/XML is never injected into the DOM.

`questionImage` appears above the question. `answerImage` appears after revealing a flashcard or choosing a multiple-choice option. Existing grading, shuffled options, keyboard controls, and spaced repetition apply. Browse mode shows images without scoring. Editing image metadata does not change a card's ID or reset its progress.

This complete mixed deck includes an ordinary flashcard, an image flashcard, a multiple-choice card, and an image multiple-choice card:

```json
{
  "title": "Anatomy and movement",
  "lang": "en",
  "cards": [
    {
      "question": "What is flexion?",
      "answer": "A movement that decreases the angle between two body segments."
    },
    {
      "question": "What muscle is highlighted?",
      "answer": "Deltoid",
      "questionImage": {
        "src": "https://example.com/deltoid.jpg",
        "alt": "Anatomical image highlighting the outer shoulder",
        "caption": "Identify the highlighted structure"
      },
      "answerImage": {
        "src": "/images/deltoid-labelled.jpg",
        "alt": "Labelled diagram showing the deltoid covering the shoulder"
      }
    },
    {
      "type": "multiple-choice",
      "question": "Which movement decreases a joint angle?",
      "answer": "Flexion",
      "options": ["Extension", "Flexion", "Rotation"]
    },
    {
      "type": "multiple-choice",
      "question": "Which exercise is shown?",
      "answer": "Back squat",
      "options": ["Deadlift", "Back squat", "Front squat", "Good morning"],
      "questionImage": {
        "src": "https://example.com/back-squat.jpg",
        "alt": "Person holding a barbell across the upper back with knees and hips bent"
      }
    }
  ]
}
```

These example URLs illustrate the format; replace them with your own working resources. The JSON imports successfully even if an image is unavailable. An answer-only image is also allowed: omit `questionImage` and include `answerImage` on a card with its usual question and answer.

In the editor, expand **Images (optional)** and use **Upload image** for either side, or **Use image URL** and enter a URL. Add **Alternative text** and optionally **Caption**. Preview, replace, remove, or move the picture to the other side; moving swaps existing images if both sides already contain one. Individual cards autosave when valid. For batches, choose **Create from images**, upload up to 50 files, complete every draft using the same editor (including type, options, category, tags and difficulty), reorder if needed, and choose **Add cards to deck**. The whole batch must validate before it is committed; cancel discards its unsaved images. To attach images to existing cards, search for those cards in the normal editor. Valid URLs show a preview; a failed preview keeps the entered URL. Use **Remove question image** or **Remove answer image** to remove it. Alt text should describe the study information accessibly without unnecessarily revealing the answer: “outer shoulder highlighted” is better than naming the muscle for an identification question.

Uploaded JPEG, PNG, WebP, and GIF files are supported up to **5 MiB per image** and **24 megapixels**. File signatures, MIME information, and actual browser decoding are checked; SVG uploads are rejected. URL references remain supported. Local images use `{ "type": "local", "assetId": "image-...", "alt": "Description" }` metadata; binary Blobs live in the separate `images` IndexedDB store, not Zustand or localStorage. Temporary object URLs are revoked after use. Deck and image writes are atomic. Removing or replacing a card/image cleans up assets only after checking references across all stored decks, so duplicated decks can share images safely. Unsaved uploads remain in memory and are released when removed or the editor closes. Images are responsive, preserve aspect ratio, and have a bounded display height. Failed or unavailable images show a fallback with their alt text so studying can continue. Active study images load eagerly; editor previews load lazily.

**Backups and offline use:** Uploaded images work offline from IndexedDB. Use **Export with images** for portable `.zaplearn.zip` backups. Each package contains `deck.json` and `images/image-ID.ext`; local metadata references those IDs. On import, new asset IDs prevent collisions, while card IDs remain stable for progress mapping. Package limits: 50 MiB archive/expanded size, at most 100 images, 5 MiB per image, 2 MiB deck JSON. Paths, duplicate/extra files, expanded sizes, references, schema, and image decoding are validated before any persistence. Split decks exceeding these limits. Plain JSON import rejects local asset references and asks for a package instead, so a missing image backup is not silently accepted. URL-only JSON export backs up image references and descriptions, not remote image files. Keep your own copies of images; external links can disappear. Same-origin paths require those files on the destination deployment when transferring decks. For Docker, host images under the static root or mount them in the existing `/data` directory. Browser caching may help repeat visits, but ZapLearn does not aggressively cache arbitrary URL images or guarantee their offline availability. The offline app shell continues working when images fail.

## Creating flashcards with AI

ZapLearn does not generate study material itself. Use ChatGPT or another AI tool, review its output for accuracy, and import the resulting JSON. There is no AI API, automatic prompt submission, or image-generation service in ZapLearn. In **About → Creating study material with AI**, expand a category and select **Copy prompt**. If clipboard access is unavailable, select and copy the visible text manually.

### Images and cards are separate steps

An image generator produces the picture; a card-generation prompt produces questions, answers and optional image references. Neither JSON generation nor ZapLearn automatically uploads pictures to an external host.

**Preferred local workflow:**

1. Generate or obtain the study image and save it to your device.
2. Open ZapLearn and create/edit a card, or choose **Create from images** in the deck editor.
3. Upload the image, enter meaningful alternative text, and pair it with a question and answer.
4. Choose Flashcard or Multiple choice; supply your own answer options if needed.
5. Let the individual editor autosave, or review all drafts and select **Add cards to deck** in the builder.

You do not need a public URL for uploaded images. If you will upload pictures manually, AI-generated JSON does not need `questionImage`: generate/import questions and answers first, then attach images in the editor. Use the editor's search to find an existing card for manual pairing. No automatic image/question matching is performed.

**URL-based alternative:** generate or obtain an image, host it at an HTTPS URL or a path on the ZapLearn site, and supply that actual URL alongside your material to the Image Flashcard or Image Multiple-Choice prompt. Save the returned JSON as a `.json` file and use **Import JSON**. Never ask an AI to invent image URLs; links can stop working when a host removes or changes a file. The `USER_SUPPLIED_IMAGE_URL` template marker must be replaced with a real URL and must never appear in the resulting deck.

### Example AI prompts

Copy a prompt below and replace its study-material placeholders. The prompts are also available in About. Image-generation prompts are intended for an AI image generator, not the JSON-generation step. In the anatomy example, replace the named structure or body region with your own subject. Review generated facts, anatomy and exercise technique against your study material.

#### Traditional flashcards

Generate questions and answers for active recall.

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
- Base questions and answers on the supplied material. Do not invent unsupported facts.
- Test useful knowledge rather than trivial wording.
- Use the language code and content language I request.

Requested deck title: [TITLE]
Requested language/code: [LANGUAGE AND CODE]
Desired number of cards: [NUMBER]
Topic or source material:
[PASTE TOPIC OR STUDY MATERIAL HERE]
```

#### Multiple-choice questions

Generate one correct answer and plausible distractors.

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

#### Image flashcards

Generate JSON using real image URLs you supply.

```text
Create a ZapLearn-compatible image-based flashcard deck from the study material and image URLs I provide.

Return valid JSON only. Do not wrap the JSON in Markdown code fences.
Do not include commentary before or after the JSON.

Use this structure (replace all placeholders with supplied content):
{
  "title": "Deck title",
  "lang": "en",
  "cards": [
    {
      "question": "What is shown in this image?",
      "answer": "Correct answer",
      "questionImage": {
        "src": "USER_SUPPLIED_IMAGE_URL",
        "alt": "Useful description without unnecessarily revealing the answer"
      },
      "category": "Category",
      "tags": ["tag1", "tag2"],
      "difficulty": 2
    }
  ]
}

Requirements:
- title is required; cards must be a non-empty array.
- Every card requires non-empty question and answer.
- questionImage and answerImage are optional. Each image requires src and alt; caption is optional.
- src must use HTTPS or a same-origin path starting with a single /.
- Do not generate or guess image URLs. Do not output placeholder URLs.
- Only use image URLs supplied by me unless I explicitly ask you to find suitable images.
- Preserve each supplied image URL exactly unless instructed otherwise.
- If no suitable URL is supplied, omit the image field or ask for a URL; never fabricate one.
- Write meaningful alt text describing the image for accessibility without unnecessarily revealing the answer.
- Put answer illustrations in answerImage when they should only appear after reveal.
- Do not generate IDs unless specifically requested. Avoid duplicate questions.
- Keep answers concise but sufficiently complete.
- category, tags, and difficulty are optional; difficulty must be 1, 2, or 3.
- Preserve terminology and language from the supplied material. Do not invent unsupported facts.

Requested title and language: [TITLE AND LANGUAGE/CODE]
Study material: [PASTE MATERIAL]
Image URLs and what each image depicts: [PASTE YOUR URLS AND DESCRIPTIONS]
```

#### Image multiple-choice questions

Combine supplied image URLs with answer options.

```text
Create a ZapLearn-compatible image-based multiple-choice study deck using the study material and image URLs I provide.

Return valid JSON only. Do not use Markdown fences.
Do not include commentary before or after the JSON.

Use this structure (replace all placeholders with supplied content):
{
  "title": "Deck title",
  "lang": "en",
  "cards": [
    {
      "type": "multiple-choice",
      "question": "What is shown in this image?",
      "answer": "Correct answer",
      "options": [
        "Plausible incorrect answer 1",
        "Correct answer",
        "Plausible incorrect answer 2",
        "Plausible incorrect answer 3"
      ],
      "questionImage": {
        "src": "USER_SUPPLIED_IMAGE_URL",
        "alt": "Useful description without unnecessarily revealing the answer"
      },
      "category": "Category",
      "tags": ["tag1", "tag2"],
      "difficulty": 2
    }
  ]
}

Requirements:
- title is required; cards must be a non-empty array.
- Every card requires type: "multiple-choice", question, answer, and options.
- Every card must have exactly one correct answer. answer is that answer and must appear exactly once in options.
- Prefer 4 options when good alternatives exist. Use at least 3 if 4 reasonable alternatives cannot be created, and no more than 6.
- Options must be unique. Incorrect answers must be plausible distractors, not obviously ridiculous or unrelated.
- Avoid ambiguous questions where several options could reasonably be correct.
- Do not always position the correct answer first. Do not label it or add "(correct)" or similar text.
- questionImage and answerImage are optional; answerImage appears after selection.
- Each image requires src and alt; caption is optional.
- src must use HTTPS or a same-origin path starting with a single /.
- Do not invent image URLs. Only use URLs supplied by me unless specifically instructed to find suitable images.
- Do not output placeholder URLs. Preserve supplied URLs exactly.
- If no suitable URL is supplied, omit the image or ask for one.
- Write useful alt text for accessibility without unnecessarily giving away the answer.
- Do not generate IDs unless requested; avoid duplicate questions.
- category, tags, and difficulty are optional; difficulty must be 1, 2, or 3.
- Keep answers concise but sufficiently complete. Preserve the supplied language and terminology.
- Do not invent unsupported facts.

Requested title and language: [TITLE AND LANGUAGE/CODE]
Study material: [PASTE MATERIAL]
Image URLs and what each image depicts: [PASTE YOUR URLS AND DESCRIPTIONS]
```

#### Mixed deck

Mix text, image, flashcard and multiple-choice formats.

```text
Create a ZapLearn-compatible study deck using a mixture of traditional flashcards and multiple-choice questions.

If I supply image URLs, use image-based questions when they improve learning.

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

Optional image fields on either card type:
{
  "questionImage": {
    "src": "USER_SUPPLIED_IMAGE_URL",
    "alt": "Useful description without unnecessarily revealing the answer"
  }
}
answerImage uses the same structure and appears after reveal/selection. caption is optional.

Requirements:
- Use only supplied image URLs; never invent, guess, or output placeholder URLs.
- Preserve supplied image URLs exactly. Use HTTPS or a same-origin root path.
- Each image needs non-empty src and meaningful alt text without unnecessarily revealing the answer.
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

#### Study image generation

For an AI image generator: these prompts produce the picture, not ZapLearn JSON. Review generated images for accuracy before using them.

##### General study image

```text
Create a clear educational study image for use in a flashcard.

Subject:
[DESCRIBE THE SUBJECT]

Learning objective:
[DESCRIBE WHAT THE STUDENT SHOULD IDENTIFY OR UNDERSTAND]

Requirements:
- Make the educational subject easy to see.
- Use a clean, uncluttered composition and a neutral background where appropriate.
- Avoid unnecessary decorative elements.
- Do not include the answer as visible text.
- Do not include labels revealing what the student should identify unless I request a labelled version.
- Avoid watermarks, logos, and UI elements.
- Keep the image suitable for viewing on desktop and mobile.
- Prefer an accurate educational representation over artistic exaggeration.
```

##### Anatomy identification

```text
Create a clear educational anatomical illustration for a flashcard.

Show the human upper body with [MUSCLE OR STRUCTURE] visually highlighted while surrounding anatomy remains visible enough to provide context. Replace this anatomical subject with the subject I specify.

The student will be asked to identify the highlighted structure.

Requirements:
- anatomically accurate proportions
- clean educational illustration
- highlighted structure easy to distinguish
- neutral background
- no labels or arrows containing text
- do not write the structure's name anywhere in the image
- no watermark or decorative elements
- suitable for a "What structure is highlighted?" question on desktop and mobile
```

##### Exercise identification

```text
Create a clear educational image showing a person performing [EXERCISE].

The image will be used in a flashcard where the student identifies the exercise.

Requirements:
- clearly show the important body position and equipment
- use realistic exercise technique
- show enough of the body and equipment to identify the movement
- simple gym environment and uncluttered composition
- no exercise name visible
- no text labels, watermark, or logo
- suitable for desktop and mobile flashcard viewing
```

##### Object or structure identification

```text
Create a clear educational image of [OBJECT OR STRUCTURE].

The image will be used for a study question asking the learner to identify what is shown.

Requirements:
- make the subject clearly visible
- show enough context to make identification educational
- avoid text revealing the answer
- avoid labels unless specifically requested
- clean neutral composition
- accurate representation
- no watermark or logo
- suitable for a study flashcard on desktop and mobile
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
- External study images and editor previews contact the image host, exposing connection metadata such as IP address and potentially sending cookies according to browser policy. They use `referrerPolicy="no-referrer"`. Remote images are not private local assets or guaranteed offline resources. Only use image hosts you trust; JSON export does not back up their files.
- There are currently no `target="_blank"` links. Future external new-tab links should use `rel="noopener noreferrer"`.
- Nginx and compatible static hosts send `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, framing controls, and Content Security Policy. Nginx runtime-config responses retain these headers alongside their no-store policy; see [Nginx header inheritance](https://nginx.org/en/docs/http/ngx_http_headers_module.html).
- CSP restricts scripts, workers, and fetch connections to the origin and blocks plugins/frames. `img-src 'self' data: https: blob:` additionally permits external HTTPS images and temporary Blob URLs for uploaded images; the existing data-image allowance is retained for application assets, but imported data URLs are rejected. All other directives remain unchanged. Inline scripts and dynamic evaluation remain blocked. Inline styles are allowed for Sonner/Radix component styles and React animation/positioning; this exception does not permit imported HTML or JavaScript. Theme changes use the existing settings store without an inline bootstrap script.

These are practical frontend protections, not a guarantee of security. Keep dependencies and hosting software updated and review changes before deployment.

## Current limitations

- No accounts, cloud sync, collaboration, or automatic backup.
- Uploaded images require ZIP image-package backups, limited to 100 images and 50 MiB per package. Packages do not include study progress. Remote images can disappear or fail offline, and same-origin URL image files must be backed up separately.
- Persistence is browser-controlled and never protects against clearing site data.
- Progress bundles can be exported but cannot yet be restored through the importer.
- Imported decks require at least one card; add a card to an empty local deck before exporting it for re-import.
- Locally edited decks can grow beyond the 2 MiB import limit; split very large decks before using exports for transfer.
- Import supports JSON decks and ZapLearn ZIP image packages; CSV and Anki packages are unsupported.
- Scheduling uses simple new/learning/mastered stages, not an advanced learning model.
- Offline use requires an initial successful online visit; API behavior and storage quotas vary by browser.
- The supplied production policy expects same-origin seed URLs and deployment at the origin root.

## AI development transparency

> ZapLearn was developed with substantial assistance from AI-based development tools. The project has also been human-directed, reviewed, tested, and refined. AI-generated code should not be assumed to be automatically correct or secure, and the application is maintained with human oversight.

## License

Copyright 2026 Viktor Olausson. See [LICENSE.md](LICENSE.md) for the project's PolyForm Noncommercial License 1.0.0 and commercial-use terms. Third-party dependencies retain their respective licenses.
