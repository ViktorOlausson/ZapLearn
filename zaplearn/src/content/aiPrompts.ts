// Keep these plain-text examples synchronized with the root README.
export const aiPromptGroups = [
  {
    id: "multiple-answer",
    title: "Multiple correct answers",
    description: "Generate select-all questions with plausible distractors.",
    prompts: [
      {
        id: "multiple-answer",
        title: "Multiple correct answers",
        text: 'Create a ZapLearn-compatible multiple-answer study deck from the study material I provide.\n\nReturn valid JSON only. Do not use Markdown code fences or commentary.\n\nUse this structure:\n{\n  "title": "Deck title",\n  "lang": "en",\n  "cards": [\n    {\n      "type": "multiple-choice",\n      "question": "Which are programming languages?",\n      "answers": [\n        "Python",\n        "JavaScript"\n      ],\n      "options": [\n        "Python",\n        "HTML",\n        "JavaScript",\n        "CSS"\n      ]\n    }\n  ]\n}\n\nRequirements:\n- Every card must have at least 2 correct answers. Use answers; omit answer.\n- Every correct answer must appear exactly once in options.\n- Use 3–6 unique non-empty options, preferably 4–6, with at least one incorrect option.\n- Incorrect options must be plausible distractors. Avoid ambiguous questions and duplicate questions.\n- Do not label correct options or add "(correct)" to their text.\n- Preserve the source language and terminology. Every correct answer must be defensible from the supplied material; do not invent unsupported facts.\n- Do not generate IDs unless requested.\n- Optional category, tags, and difficulty (1, 2, or 3) are supported.\n- Optional questionImage and answerImage require src and alt; caption is optional. Only use supplied HTTPS or same-origin image paths. Never invent image URLs.\n\nRequested deck title: [TITLE]\nRequested language/code: [LANGUAGE AND CODE]\nStudy material: [PASTE STUDY MATERIAL HERE]',
      },
    ],
  },
  {
    id: "traditional",
    title: "Traditional flashcards",
    description: "Generate questions and answers for active recall.",
    prompts: [
      {
        id: "traditional",
        title: "Traditional flashcards",
        text: 'Create a ZapLearn-compatible flashcard deck from the study material I provide.\n\nReturn valid JSON only.\nDo not wrap the JSON in markdown fences.\nDo not include commentary before or after the JSON.\n\nUse exactly this structure:\n{\n  "title": "Deck title",\n  "lang": "en",\n  "cards": [\n    {\n      "question": "Question",\n      "answer": "Answer",\n      "category": "Category",\n      "tags": ["tag1", "tag2"],\n      "difficulty": 2\n    }\n  ]\n}\n\nRules:\n- title is required.\n- cards must be an array.\n- Every card requires question and answer.\n- category, tags, and difficulty are optional.\n- difficulty, when present, must be 1, 2, or 3.\n- Do not generate deck or card IDs unless I specifically request them. ZapLearn can generate stable IDs during import.\n- Avoid duplicate or near-duplicate questions.\n- Keep answers concise but sufficiently complete to study independently.\n- Preserve the requested language and the source terminology when study material is provided.\n- Base questions and answers on the supplied material. Do not invent unsupported facts.\n- Test useful knowledge rather than trivial wording.\n- Use the language code and content language I request.\n\nRequested deck title: [TITLE]\nRequested language/code: [LANGUAGE AND CODE]\nDesired number of cards: [NUMBER]\nTopic or source material:\n[PASTE TOPIC OR STUDY MATERIAL HERE]',
      },
    ],
  },
  {
    id: "multiple-choice",
    title: "Multiple-choice questions",
    description: "Generate one correct answer and plausible distractors.",
    prompts: [
      {
        id: "multiple-choice",
        title: "Multiple-choice questions",
        text: 'Create a ZapLearn-compatible multiple-choice study deck from the study material I provide.\n\nReturn valid JSON only.\nDo not wrap the JSON in Markdown code fences.\nDo not include explanations, notes, or commentary before or after the JSON.\n\nUse this exact structure:\n{\n  "title": "Deck title",\n  "lang": "en",\n  "cards": [\n    {\n      "type": "multiple-choice",\n      "question": "Question",\n      "answer": "Correct answer",\n      "options": [\n        "Correct answer",\n        "Plausible incorrect answer 1",\n        "Plausible incorrect answer 2",\n        "Plausible incorrect answer 3"\n      ],\n      "category": "Category",\n      "tags": ["tag1", "tag2"],\n      "difficulty": 2\n    }\n  ]\n}\n\nRequirements:\n- title is required.\n- cards must be an array.\n- Every card must use "type": "multiple-choice".\n- Every card requires question, answer, and options.\n- answer is the correct answer.\n- The exact value of answer must appear once and only once in options.\n- Include 4 answer options whenever the source material supports good alternatives.\n- Use at least 3 options when 4 good options cannot be created.\n- Exactly one option must be correct. All other options must be incorrect.\n- Do not mark the correct option using letters, symbols, or explanatory text.\n- Do not write things such as "(correct)" inside the options.\n- Do not always place the correct answer first.\n- Avoid duplicate answer options and duplicate questions.\n- Do not generate IDs unless specifically requested because ZapLearn generates stable IDs during import.\n- category, tags, and difficulty are optional.\n- difficulty, when present, must be 1, 2, or 3.\n- Preserve the requested language and terminology of the source material.\n- Base the questions strictly on supplied study material when it is provided.\n- Do not invent facts that are not supported by the supplied material.\n\nQUALITY REQUIREMENTS FOR INCORRECT OPTIONS:\n- Incorrect options must be plausible distractors, not ridiculous or unrelated filler.\n- They should belong to the same subject area as the correct answer.\n- They should be grammatically compatible with the question.\n- They should have a similar level of specificity as the correct answer.\n- Use realistic misconceptions where possible.\n- They must be clearly incorrect according to the source material.\n- They must not be partially correct unless the question explicitly allows that distinction.\n- Avoid giving away the answer through formatting, length, or extra detail.\n\nQUESTION QUALITY:\n- Test understanding, recognition, concepts, terminology, and meaningful distinctions.\n- Avoid unnecessary trick questions.\n- Avoid ambiguous questions where multiple options could reasonably be correct.\n- If more than one answer could be correct, rewrite the question so there is exactly one defensible correct answer.\n- Keep questions clear and concise.\n\nANSWER QUALITY:\n- Keep answers concise but sufficiently complete.\n- Preserve important source terminology.\n- If the source uses a specific technical term, use that term instead of a less precise synonym.\n\nRequested deck title: [TITLE]\nRequested language/code: [LANGUAGE AND CODE]\nDesired number of cards: [NUMBER]\nStudy material:\n[PASTE STUDY MATERIAL HERE]',
      },
    ],
  },
  {
    id: "image-flashcards",
    title: "Image flashcards",
    description: "Generate JSON using real image URLs you supply.",
    prompts: [
      {
        id: "image-flashcards",
        title: "Image flashcards",
        text: 'Create a ZapLearn-compatible image-based flashcard deck from the study material and image URLs I provide.\n\nReturn valid JSON only. Do not wrap the JSON in Markdown code fences.\nDo not include commentary before or after the JSON.\n\nUse this structure (replace all placeholders with supplied content):\n{\n  "title": "Deck title",\n  "lang": "en",\n  "cards": [\n    {\n      "question": "What is shown in this image?",\n      "answer": "Correct answer",\n      "questionImage": {\n        "src": "USER_SUPPLIED_IMAGE_URL",\n        "alt": "Useful description without unnecessarily revealing the answer"\n      },\n      "category": "Category",\n      "tags": ["tag1", "tag2"],\n      "difficulty": 2\n    }\n  ]\n}\n\nRequirements:\n- title is required; cards must be a non-empty array.\n- Every card requires non-empty question and answer.\n- questionImage and answerImage are optional. Each image requires src and alt; caption is optional.\n- src must use HTTPS or a same-origin path starting with a single /.\n- Do not generate or guess image URLs. Do not output placeholder URLs.\n- Only use image URLs supplied by me unless I explicitly ask you to find suitable images.\n- Preserve each supplied image URL exactly unless instructed otherwise.\n- If no suitable URL is supplied, omit the image field or ask for a URL; never fabricate one.\n- Write meaningful alt text describing the image for accessibility without unnecessarily revealing the answer.\n- Put answer illustrations in answerImage when they should only appear after reveal.\n- Do not generate IDs unless specifically requested. Avoid duplicate questions.\n- Keep answers concise but sufficiently complete.\n- category, tags, and difficulty are optional; difficulty must be 1, 2, or 3.\n- Preserve terminology and language from the supplied material. Do not invent unsupported facts.\n\nRequested title and language: [TITLE AND LANGUAGE/CODE]\nStudy material: [PASTE MATERIAL]\nImage URLs and what each image depicts: [PASTE YOUR URLS AND DESCRIPTIONS]',
      },
    ],
  },
  {
    id: "image-multiple-choice",
    title: "Image multiple-choice questions",
    description: "Combine supplied image URLs with answer options.",
    prompts: [
      {
        id: "image-multiple-choice",
        title: "Image multiple-choice questions",
        text: 'Create a ZapLearn-compatible image-based multiple-choice study deck using the study material and image URLs I provide.\n\nReturn valid JSON only. Do not use Markdown fences.\nDo not include commentary before or after the JSON.\n\nUse this structure (replace all placeholders with supplied content):\n{\n  "title": "Deck title",\n  "lang": "en",\n  "cards": [\n    {\n      "type": "multiple-choice",\n      "question": "What is shown in this image?",\n      "answer": "Correct answer",\n      "options": [\n        "Plausible incorrect answer 1",\n        "Correct answer",\n        "Plausible incorrect answer 2",\n        "Plausible incorrect answer 3"\n      ],\n      "questionImage": {\n        "src": "USER_SUPPLIED_IMAGE_URL",\n        "alt": "Useful description without unnecessarily revealing the answer"\n      },\n      "category": "Category",\n      "tags": ["tag1", "tag2"],\n      "difficulty": 2\n    }\n  ]\n}\n\nRequirements:\n- title is required; cards must be a non-empty array.\n- Every card requires type: "multiple-choice", question, answer, and options.\n- Every card must have exactly one correct answer. answer is that answer and must appear exactly once in options.\n- Prefer 4 options when good alternatives exist. Use at least 3 if 4 reasonable alternatives cannot be created, and no more than 6.\n- Options must be unique. Incorrect answers must be plausible distractors, not obviously ridiculous or unrelated.\n- Avoid ambiguous questions where several options could reasonably be correct.\n- Do not always position the correct answer first. Do not label it or add "(correct)" or similar text.\n- questionImage and answerImage are optional; answerImage appears after selection.\n- Each image requires src and alt; caption is optional.\n- src must use HTTPS or a same-origin path starting with a single /.\n- Do not invent image URLs. Only use URLs supplied by me unless specifically instructed to find suitable images.\n- Do not output placeholder URLs. Preserve supplied URLs exactly.\n- If no suitable URL is supplied, omit the image or ask for one.\n- Write useful alt text for accessibility without unnecessarily giving away the answer.\n- Do not generate IDs unless requested; avoid duplicate questions.\n- category, tags, and difficulty are optional; difficulty must be 1, 2, or 3.\n- Keep answers concise but sufficiently complete. Preserve the supplied language and terminology.\n- Do not invent unsupported facts.\n\nRequested title and language: [TITLE AND LANGUAGE/CODE]\nStudy material: [PASTE MATERIAL]\nImage URLs and what each image depicts: [PASTE YOUR URLS AND DESCRIPTIONS]',
      },
    ],
  },
  {
    id: "mixed",
    title: "Mixed deck",
    description: "Mix text, image, flashcard and multiple-choice formats.",
    prompts: [
      {
        id: "mixed",
        title: "Mixed deck",
        text: 'Create a ZapLearn-compatible mixed study deck from the supplied material.\nReturn valid JSON only, without Markdown fences or commentary.\nReturn an object with title, optional lang, and a non-empty cards array.\nChoose traditional flashcards for free recall, single-answer multiple choice for recognition, and multiple-answer questions only when several answers are genuinely correct. Do not force ordinary single-answer questions into multiple-answer form.\n\nFlashcard: {"question":"...","answer":"..."}\nSingle-answer: {"type":"multiple-choice","question":"Capital of France?","answer":"Paris","options":["Paris","London","Berlin"]}\nMultiple-answer: {"type": "multiple-choice", "question": "Which are programming languages?", "answers": ["Python", "JavaScript"], "options": ["Python", "HTML", "JavaScript", "CSS"]}\n\n- Every card requires question. Flashcards require answer. Multiple-choice cards require options and exactly one of answer or answers, never both.\n- Use answer for one correct answer; use answers for at least 2 correct answers.\n- Every correct answer must appear exactly once in options. Use 2\u20136 unique non-empty options and at least one incorrect option.\n- Use plausible distractors, avoid ambiguity and duplicate questions, and do not mark correct options in their text.\n- Optional questionImage and answerImage use {"src":"USER_SUPPLIED_IMAGE_URL","alt":"Meaningful description","caption":"Optional caption"}. Use only supplied HTTPS URLs or same-origin paths. Never invent image URLs; omit images when no suitable URL is supplied. Answer images appear after reveal/submission.\n- Optional category, tags, and difficulty (1, 2, or 3) are supported. Do not generate IDs unless requested.\n- Preserve requested language and source terminology. Do not invent unsupported facts.\n\nRequested title: [TITLE]\nRequested language/code: [LANGUAGE AND CODE]\nDesired cards: [NUMBER]\nStudy material and optional image URLs: [PASTE HERE]',
      },
    ],
  },
  {
    id: "study-images",
    title: "Study image generation",
    description:
      "For an AI image generator: these prompts produce the picture, not ZapLearn JSON. Review generated images for accuracy before using them.",
    prompts: [
      {
        id: "general-image",
        title: "General study image",
        text: "Create a clear educational study image for use in a flashcard.\n\nSubject:\n[DESCRIBE THE SUBJECT]\n\nLearning objective:\n[DESCRIBE WHAT THE STUDENT SHOULD IDENTIFY OR UNDERSTAND]\n\nRequirements:\n- Make the educational subject easy to see.\n- Use a clean, uncluttered composition and a neutral background where appropriate.\n- Avoid unnecessary decorative elements.\n- Do not include the answer as visible text.\n- Do not include labels revealing what the student should identify unless I request a labelled version.\n- Avoid watermarks, logos, and UI elements.\n- Keep the image suitable for viewing on desktop and mobile.\n- Prefer an accurate educational representation over artistic exaggeration.",
      },
      {
        id: "anatomy-image",
        title: "Anatomy identification",
        text: 'Create a clear educational anatomical illustration for a flashcard.\n\nShow the human upper body with [MUSCLE OR STRUCTURE] visually highlighted while surrounding anatomy remains visible enough to provide context. Replace this anatomical subject with the subject I specify.\n\nThe student will be asked to identify the highlighted structure.\n\nRequirements:\n- anatomically accurate proportions\n- clean educational illustration\n- highlighted structure easy to distinguish\n- neutral background\n- no labels or arrows containing text\n- do not write the structure\'s name anywhere in the image\n- no watermark or decorative elements\n- suitable for a "What structure is highlighted?" question on desktop and mobile',
      },
      {
        id: "exercise-image",
        title: "Exercise identification",
        text: "Create a clear educational image showing a person performing [EXERCISE].\n\nThe image will be used in a flashcard where the student identifies the exercise.\n\nRequirements:\n- clearly show the important body position and equipment\n- use realistic exercise technique\n- show enough of the body and equipment to identify the movement\n- simple gym environment and uncluttered composition\n- no exercise name visible\n- no text labels, watermark, or logo\n- suitable for desktop and mobile flashcard viewing",
      },
      {
        id: "object-image",
        title: "Object or structure identification",
        text: "Create a clear educational image of [OBJECT OR STRUCTURE].\n\nThe image will be used for a study question asking the learner to identify what is shown.\n\nRequirements:\n- make the subject clearly visible\n- show enough context to make identification educational\n- avoid text revealing the answer\n- avoid labels unless specifically requested\n- clean neutral composition\n- accurate representation\n- no watermark or logo\n- suitable for a study flashcard on desktop and mobile",
      },
    ],
  },
] as const;
