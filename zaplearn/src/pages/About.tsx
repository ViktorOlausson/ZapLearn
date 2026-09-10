import { Link } from "react-router";

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
          Decks, settings, and study progress are stored locally in this browser
          on this device using IndexedDB. There are currently no accounts or
          cloud sync. Clearing browser or site data can remove your saved work.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          Persistent storage, when granted by your browser, can reduce automatic
          data removal, but it is not a backup. Export important decks as JSON
          using Backup deck in{" "}
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
          revealed answer, or after selecting a multiple-choice option. Each
          image requires src (an HTTPS URL or a path on this site such as
          /images/exercise.jpg) and meaningful alt text describing it for
          accessibility. Avoid unnecessarily revealing the answer in alt text.
          The caption is optional. Paths refer to this website, not the deck
          URL.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          This version supports image URLs, not local file uploads. JSON exports
          preserve image references but do not back up the image files. Keep
          your own copies: links can stop working when a host removes an image,
          and remote images may be unavailable offline. Failed images show their
          alt text and you can continue studying.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          External images make requests to their hosts, which can see your IP
          address and may receive cookies according to browser policy. Study
          images send no referrer. ZapLearn does not automatically download
          remote images for offline storage.
        </p>
      </section>

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
