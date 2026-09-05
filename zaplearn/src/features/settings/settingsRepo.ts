import localforage from "localforage";
import { z } from "zod";

const SettingsSchema = z.object({ theme: z.enum(["light", "dark", "system"]) });

export type ThemePreference = "light" | "dark" | "system";
export type Settings = { theme: ThemePreference };

const settings = localforage.createInstance({
  name: "zaplearn",
  driver: localforage.INDEXEDDB,
  storeName: "settings",
});
const key = "settings";

export async function getSettings(): Promise<Settings> {
  const parsed = SettingsSchema.safeParse(await settings.getItem<unknown>(key));
  return parsed.success ? parsed.data : { theme: "system" };
}

export async function saveSettings(value: Settings): Promise<void> {
  await settings.setItem(key, value);
}
