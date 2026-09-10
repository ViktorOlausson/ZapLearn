import { useEffect, useRef, useState } from "react";
import { StudyImage } from "@/components/common/StudyImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSafeImageSource } from "@/lib/imageSource";
import { CardImageSchema, type CardImage } from "@/types/deck";
import { useImageDraftSession } from "@/features/images/ImageDraftContext";
import { IMAGE_ACCEPT, validateImageFile } from "@/features/images/imageFiles";

export function CardImageEditor({
  id,
  label,
  value,
  onChange,
  onMove,
}: {
  id: string;
  label: string;
  value?: CardImage;
  onChange: (value: CardImage | undefined) => void;
  onMove?: () => void;
}) {
  const session = useImageDraftSession();
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const parsed = value ? CardImageSchema.safeParse(value) : undefined;
  async function upload(file?: File) {
    if (!file) return;
    const version = ++request.current;
    setBusy(true);
    setUploadError("");
    try {
      const blob = await validateImageFile(file);
      if (version !== request.current) return;
      const assetId = session.stage(blob);
      onChange({
        type: "local",
        assetId,
        alt: value?.alt ?? "",
        caption: value?.caption,
      });
    } catch (error) {
      if (version === request.current)
        setUploadError(
          error instanceof Error ? error.message : "Could not read image.",
        );
    } finally {
      if (version === request.current) setBusy(false);
    }
  }
  function clear() {
    request.current++;
    setBusy(false);
    setUploadError("");
    onChange(undefined);
  }
  const fields =
    value?.type === "local"
      ? ([
          ["alt", "Alternative text"],
          ["caption", "Caption (optional)"],
        ] as const)
      : ([
          ["src", "Image URL"],
          ["alt", "Alternative text"],
          ["caption", "Caption (optional)"],
        ] as const);
  return (
    <fieldset
      className="min-w-0 rounded-lg border p-3"
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void upload(event.dataTransfer.files[0]);
      }}
    >
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        aria-label={`Upload ${label.toLowerCase()}`}
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy
            ? "Reading image…"
            : value?.type === "local"
              ? "Replace image"
              : "Upload image"}
        </Button>
        {(!value || value.type === "local") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              request.current++;
              setBusy(false);
              setUploadError("");
              onChange({
                src: "",
                alt: value?.alt ?? "",
                caption: value?.caption,
              });
            }}
          >
            Use image URL
          </Button>
        )}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Drop an image here or choose a file. JPEG, PNG, WebP or GIF, up to 5 MB.
      </p>
      {uploadError && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {uploadError}
        </p>
      )}
      {value ? (
        <div className="grid gap-3">
          {value.type === "local" && (
            <p className="text-xs text-muted-foreground">
              Uploaded image · stored on this device when the card is saved
            </p>
          )}
          {fields.map(([field, title]) => {
            const error =
              parsed && !parsed.success
                ? parsed.error.issues.find((issue) => issue.path[0] === field)
                    ?.message
                : undefined;
            const fieldValue =
              field === "src"
                ? value.type === "local"
                  ? ""
                  : value.src
                : value[field];
            return (
              <div key={field} className="min-w-0">
                <label className="text-sm" htmlFor={`${id}-${field}`}>
                  {title}
                </label>
                <Input
                  id={`${id}-${field}`}
                  value={fieldValue ?? ""}
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
          {(value.type === "local" || isSafeImageSource(value.src.trim())) && (
            <StudyImage
              image={
                value.type === "local"
                  ? value
                  : { ...value, src: value.src.trim() }
              }
              lazy
            />
          )}
          {onMove && (
            <Button type="button" variant="outline" onClick={onMove}>
              Move to {label === "Question image" ? "answer" : "question"} side
            </Button>
          )}
          <Button type="button" variant="outline" onClick={clear}>
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
