import localforage from "localforage";

export type ThemePreference = "light" | "dark" | "system";
export type Settings = { theme: ThemePreference };

const settings = localforage.createInstance({
  name: "zaplearn",
  storeName: "settings",
});
const key = "settings";

export async function getSettings(): Promise<Settings> {
  const value = await settings.getItem<Settings>(key);
  return value ?? { theme: "system" };
}

export async function saveSettings(value: Settings): Promise<void> {
  await settings.setItem(key, value);
}
