import { useEffect, type PropsWithChildren } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDeckStore } from "@/features/decks/deckStore";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { loadRuntimeSeed } from "@/app/providers/runtimeSeed";
import { useStoragePersistenceStore } from "@/features/settings/storagePersistenceStore";

function Bootstrap({ children }: PropsWithChildren) {
  const initializeDecks = useDeckStore((state) => state.initialize);
  const saveDeck = useDeckStore((state) => state.save);
  const initializeSettings = useSettingsStore((state) => state.initialize);
  const checkStoragePersistence = useStoragePersistenceStore(
    (state) => state.check,
  );
  const theme = useSettingsStore((state) => state.theme);
  useEffect(() => {
    void (async () => {
      await initializeDecks();
      await loadRuntimeSeed(saveDeck);
    })();
  }, [initializeDecks, saveDeck]);
  useEffect(() => {
    void initializeSettings().catch(() => undefined);
  }, [initializeSettings]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    void checkStoragePersistence();
  }, [checkStoragePersistence]);
  return (
    <>
      {children}
      <Toaster richColors closeButton />
    </>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <TooltipProvider delayDuration={300}>
      <Bootstrap>{children}</Bootstrap>
    </TooltipProvider>
  );
}
