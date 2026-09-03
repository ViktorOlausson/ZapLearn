import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "pwa.spec.ts",
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4175",
    browserName: "chromium",
    channel: process.env.CI ? undefined : "chrome",
    headless: true,
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4175 --strictPort",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
