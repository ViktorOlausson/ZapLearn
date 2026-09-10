import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiPromptGroups } from "@/content/aiPrompts";

function Prompt({ title, text }: { title: string; text: string }) {
  const [feedback, setFeedback] = useState("");
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setFeedback("Copied");
    } catch {
      setFeedback(
        "Could not copy automatically. Select the prompt text below and copy it manually.",
      );
    }
  }
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`Copy prompt: ${title}`}
          onClick={() => void copy()}
        >
          <Copy aria-hidden="true" /> Copy prompt
        </Button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {feedback}
      </p>
      <pre
        tabIndex={0}
        aria-label={`${title} prompt`}
        className="max-h-96 max-w-full overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-relaxed [overflow-wrap:anywhere]"
      >
        {text}
      </pre>
    </div>
  );
}

export function AiPrompts() {
  return (
    <section className="min-w-0 space-y-4 rounded-xl border bg-card p-6">
      <h2 className="text-xl font-semibold">Creating study material with AI</h2>
      <p className="text-muted-foreground">
        ZapLearn does not generate study material itself. Use ChatGPT or another
        AI tool to create flashcards and images, review the results, then import
        the JSON or upload pictures in ZapLearn.
      </p>
      <p className="text-sm text-muted-foreground">
        Image generation produces the picture. Card generation produces
        questions and answers. Save generated images, then upload them in the
        card editor or Image Card Builder and pair them with study content. No
        public image URL is needed for local uploads.
      </p>
      <p className="text-sm text-muted-foreground">
        For manual uploads, AI-generated JSON can omit questionImage: import
        questions first and attach images in the editor. For URL-based cards,
        host the image first and supply the real HTTPS URL or same-origin path
        to the prompt. Never invent image URLs; external links can stop working.
        JSON generation does not host images.
      </p>
      {aiPromptGroups.map((group) => (
        <details key={group.id} className="min-w-0 rounded-lg border p-4">
          <summary className="cursor-pointer font-medium">
            {group.title}
          </summary>
          <p className="my-3 text-sm text-muted-foreground">
            {group.description}
          </p>
          <div className="space-y-6">
            {group.prompts.map((prompt) => (
              <Prompt key={prompt.id} title={prompt.title} text={prompt.text} />
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
