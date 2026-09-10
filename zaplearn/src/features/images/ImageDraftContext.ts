import { createContext, useContext } from "react";
import { createImageDraftSession } from "@/features/images/imageRepo";

export const ImageDraftContext = createContext<ReturnType<
  typeof createImageDraftSession
> | null>(null);
export function useImageDraftSession() {
  const session = useContext(ImageDraftContext);
  if (!session) throw new Error("Image uploads require an editor session.");
  return session;
}
