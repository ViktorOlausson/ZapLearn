import { StudyImage } from "@/components/common/StudyImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSafeImageSource } from "@/lib/imageSource";
import { CardImageSchema, type CardImage } from "@/types/deck";

export function CardImageEditor({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value?: CardImage;
  onChange: (value: CardImage | undefined) => void;
}) {
  const parsed = value ? CardImageSchema.safeParse(value) : undefined;
  return (
    <fieldset className="min-w-0 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      {value ? (
        <div className="grid gap-3">
          {(
            [
              ["src", "Image URL"],
              ["alt", "Alternative text"],
              ["caption", "Caption (optional)"],
            ] as const
          ).map(([field, title]) => {
            const error =
              parsed && !parsed.success
                ? parsed.error.issues.find((issue) => issue.path[0] === field)
                    ?.message
                : undefined;
            return (
              <div key={field} className="min-w-0">
                <label className="text-sm" htmlFor={`${id}-${field}`}>
                  {title}
                </label>
                <Input
                  id={`${id}-${field}`}
                  value={value[field] ?? ""}
                  maxLength={field === "src" ? 4096 : 2000}
                  placeholder={
                    field === "src" ? "https://… or /images/…" : undefined
                  }
                  aria-invalid={Boolean(error)}
                  aria-describedby={`${id}-${field}-help`}
                  onChange={(event) =>
                    onChange({ ...value, [field]: event.target.value })
                  }
                />
                <p
                  id={`${id}-${field}-help`}
                  className="mt-1 text-xs text-muted-foreground"
                >
                  {field === "alt" &&
                    "Describe the image for accessibility without unnecessarily giving away the answer. "}
                  {error && <span className="text-destructive">{error}</span>}
                </p>
              </div>
            );
          })}
          {isSafeImageSource(value.src.trim()) && (
            <StudyImage image={{ ...value, src: value.src.trim() }} lazy />
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange(undefined)}
          >
            Remove {label.toLowerCase()}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange({ src: "", alt: "" })}
        >
          Add {label.toLowerCase()}
        </Button>
      )}
    </fieldset>
  );
}
