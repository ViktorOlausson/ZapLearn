import { create } from "zustand";

import {
  getSettings,
  saveSettings,
  type ThemePreference,
} from "@/features/settings/settingsRepo";

type SettingsState = {
  theme: ThemePreference;
  initialized: boolean;
  initialize: () => Promise<ThemePreference>;
  setTheme: (theme: ThemePreference) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: "system",
  initialized: false,
  async initialize() {
    const settings = await getSettings();
    set({ ...settings, initialized: true });
    return settings.theme;
  },
  async setTheme(theme) {
    set({ theme });
    await saveSettings({ theme });
  },
}));
