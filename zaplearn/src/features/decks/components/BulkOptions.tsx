import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MULTIPLE_CHOICE_OPTIONS } from "@/types/deck";

export function BulkOptions({
  options,
  onAdd,
}: {
  options: string[];
  onAdd: (options: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  return (
    <details className="mt-3">
      <summary className="cursor-pointer">Bulk add options</summary>
      <label className="block mt-2">
        One option per line
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <Button
        type="button"
        variant="outline"
        className="mt-2"
        onClick={() => {
          const added = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
          const combined = [
            ...options.map((option) => option.trim()),
            ...added,
          ];
          if (!added.length) return setError("Enter at least one option.");
          if (new Set(combined).size !== combined.length)
            return setError(
              "Duplicate options found. Remove duplicates before adding.",
            );
          if (combined.length > MAX_MULTIPLE_CHOICE_OPTIONS)
            return setError(
              `Use no more than ${MAX_MULTIPLE_CHOICE_OPTIONS} options in total.`,
            );
          onAdd(added);
          setText("");
          setError("");
        }}
      >
        Add to existing options
      </Button>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
