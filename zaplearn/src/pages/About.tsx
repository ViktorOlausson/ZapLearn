import { Link } from "react-router";
import { AiPrompts } from "@/components/common/AiPrompts";

const repository = "https://github.com/ViktorOlausson/ZapLearn";
const linkClass = "font-medium underline underline-offset-4 hover:text-primary";

export function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header>
        <h1 className="text-3xl font-bold">About ZapLearn</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          ZapLearn is a local-first flashcard app for creating, importing, and
          studying decks. Practice with traditional flashcards or
          multiple-choice questions, and track your progress without creating an
          account.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Your data and backups</h2>
        <p className="leading-relaxed text-muted-foreground">
          Decks, uploaded images, settings, and study progress are stored
          locally in this browser on this device using IndexedDB. There are
          currently no accounts or cloud sync. Clearing browser or site data can
          remove your saved work.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          Persistent storage, when granted by your browser, can reduce automatic
          data removal, but it is not a backup. Use Backup deck for JSON or
          Export with images for a portable image package in{" "}
          <Link to="/manage" className={linkClass}>
            Manage decks
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Images in ZapLearn</h2>
        <p className="leading-relaxed text-muted-foreground">
          Traditional flashcards and multiple-choice questions can have optional
          images. Mix cards with and without images in the same deck. Add images
          in the editor’s Images section or include them in imported JSON:
        </p>
        <pre className="max-w-full overflow-x-auto rounded-lg bg-muted p-4 text-xs">
          <code>
            {JSON.stringify(
              {
                type: "multiple-choice",
                question: "Which exercise is shown?",
                answer: "Back squat",
                options: [
                  "Deadlift",
                  "Back squat",
                  "Front squat",
                  "Good morning",
                ],
                questionImage: {
                  src: "https://example.com/back-squat.jpg",
                  alt: "Person holding a barbell across the upper back with knees and hips bent",
                  caption: "Identify the movement",
                },
              },
              null,
              2,
            )}
          </code>
        </pre>
        <p className="leading-relaxed text-muted-foreground">
          questionImage appears with the question; answerImage appears with the
          revealed answer, after selecting a single-answer option, or after
          submitting multiple answers. Each URL image requires src (an HTTPS URL
          or a path on this site such as /images/exercise.jpg) and meaningful
          alt text describing it for accessibility. Avoid unnecessarily
          revealing the answer in alt text. The caption is optional. Paths refer
          to this website, not the deck URL.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          Upload JPEG, PNG, WebP, or GIF images directly from your device (up to
          5 MB each), or use an image URL. Uploaded pictures are stored with
          this browser in IndexedDB and work offline. Export with images creates
          a .zaplearn.zip package containing the deck and uploaded pictures; use
          Import JSON to select that package on another device. Packages do not
          include progress. URL images remain references and are not downloaded
          into packages. External links can disappear or fail offline; failed
          images show their alt text.
        </p>
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer font-medium">
            Creating one or several image cards
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Create or edit a card and expand Images. Under Question image or
              Answer image, choose Upload image or Use image URL.
            </li>
            <li>
              Add alternative text, a question and an answer. Choose Flashcard
              or Multiple choice and add options if needed. Changes autosave
              when valid.
            </li>
            <li>
              For several images, choose Create from images in the editor.
              Upload multiple pictures to create one draft per image.
            </li>
            <li>
              Complete each draft, choose its type, move the image to the answer
              side if needed, review, then select Add cards to deck.
            </li>
          </ol>
          <p className="mt-3 text-sm text-muted-foreground">
            To pair a picture with an existing question, search for the card in
            the normal editor and upload its question or answer image.
          </p>
        </details>
        <p className="leading-relaxed text-muted-foreground">
          External images make requests to their hosts, which can see your IP
          address and may receive cookies according to browser policy. Study
          images send no referrer. ZapLearn does not automatically download
          remote images for offline storage.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Multiple-choice questions</h2>
        <p>
          Practice traditional flashcards, questions with one correct answer, or
          questions with several correct answers. All three formats support
          images.
        </p>
        <p>
          Single answer: choose one option → immediate result. Multiple answers:
          select all that apply → Submit answer → result.
        </p>
        <p>
          For example, “Which are programming languages?” could offer Python,
          HTML, JavaScript, and CSS. Select Python and JavaScript, then submit.
          You must select all correct options and no incorrect ones. Feedback
          shows any missed or incorrect selections.
        </p>
        <p>
          In the editor, choose Multiple choice and set Correct-answer mode to
          Multiple correct answers. Mark at least two correct options and leave
          at least one incorrect option.
        </p>
      </section>

      <AiPrompts />

      <section className="space-y-3 rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold">AI development transparency</h2>
        <p className="leading-relaxed text-muted-foreground">
          ZapLearn was developed with substantial assistance from AI-based
          development tools. The project has also been human-directed, reviewed,
          tested, and refined. AI-generated code should not be assumed to be
          automatically correct or secure, and the application is maintained
          with human oversight.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Project and feedback</h2>
        <p className="leading-relaxed text-muted-foreground">
          Explore the source code, read the documentation for import formats and
          AI flashcard prompts, or report a problem through the issue tracker.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          <a href={repository} className={linkClass}>
            GitHub repository
          </a>
          <a href={`${repository}#readme`} className={linkClass}>
            README
          </a>
          <a href={`${repository}/issues`} className={linkClass}>
            Report an issue
          </a>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold">License and credits</h2>
        <p className="leading-relaxed text-muted-foreground">
          Created by Viktor Olausson. ZapLearn is available under the PolyForm
          Noncommercial License 1.0.0. See the{" "}
          <a href={`${repository}/blob/HEAD/LICENSE.md`} className={linkClass}>
            project license
          </a>{" "}
          for terms. Third-party dependencies retain their respective licenses.
        </p>
      </section>
    </div>
  );
}
