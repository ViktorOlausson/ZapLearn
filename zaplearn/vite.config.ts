import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "ZapLearn",
        short_name: "ZapLearn",
        description: "A local-first flashcard study application.",
        theme_color: "#18181b",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === "/runtime/config.json",
            handler: "NetworkFirst",
            options: {
              cacheName: "runtime-config",
              expiration: { maxEntries: 1, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
