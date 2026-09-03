import { useEffect, type PropsWithChildren } from "react";
import { ThemeProvider, useTheme } from "next-themes";
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
  const { setTheme } = useTheme();
  useEffect(() => {
    void (async () => {
      await initializeDecks();
      await loadRuntimeSeed(saveDeck);
    })();
  }, [initializeDecks, saveDeck]);
  useEffect(() => {
    void initializeSettings().then(setTheme);
  }, [initializeSettings, setTheme]);
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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delayDuration={300}>
        <Bootstrap>{children}</Bootstrap>
      </TooltipProvider>
    </ThemeProvider>
  );
}
