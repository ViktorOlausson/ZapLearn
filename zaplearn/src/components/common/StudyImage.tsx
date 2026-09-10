import { useEffect, useState } from "react";
import { getImageAsset } from "@/features/images/imageRepo";

import { isSafeImageSource } from "@/lib/imageSource";
import type { CardImage } from "@/types/deck";

export function StudyImage({
  image,
  lazy = false,
}: {
  image: CardImage;
  lazy?: boolean;
}) {
  // A new source starts with a fresh loading state, including after a failure.
  return (
    <ImageResource
      key={image.type === "local" ? image.assetId : image.src}
      image={image}
      lazy={lazy}
    />
  );
}

function ImageResource({ image, lazy }: { image: CardImage; lazy: boolean }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const [localSource, setLocalSource] = useState<string>();
  const assetId = image.type === "local" ? image.assetId : undefined;
  useEffect(() => {
    if (!assetId) return;
    let active = true;
    let url: string | undefined;
    void getImageAsset(assetId)
      .then((asset) => {
        if (!active) return;
        if (!asset) {
          setStatus("error");
          return;
        }
        url = URL.createObjectURL(asset.blob);
        setLocalSource(url);
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [assetId]);
  const src = image.type === "local" ? localSource : image.src;
  const failed =
    status === "error" ||
    (image.type !== "local" && !isSafeImageSource(image.src));
  return (
    <span className="my-4 block min-w-0 text-base font-normal [overflow-wrap:anywhere]">
      {failed ? (
        <span
          role="status"
          className="block rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground"
        >
          <span className="block font-medium">Image could not be loaded.</span>
          <span className="mt-1 block">{image.alt}</span>
        </span>
      ) : (
        <span className="relative block rounded-lg bg-muted/30">
          {status === "loading" && (
            <span
              role="status"
              className="block p-2 text-sm text-muted-foreground"
            >
              Loading image…
            </span>
          )}
          {src && (
            <img
              src={src}
              alt={image.alt}
              referrerPolicy="no-referrer"
              loading={lazy ? "lazy" : "eager"}
              decoding="async"
              onLoad={() => setStatus("loaded")}
              onError={() => setStatus("error")}
              className="mx-auto block h-auto max-h-[min(35vh,20rem)] max-w-full rounded-lg object-contain"
            />
          )}
        </span>
      )}
      {image.caption && (
        <span className="mt-2 block text-sm text-muted-foreground">
          {image.caption}
        </span>
      )}
    </span>
  );
}
