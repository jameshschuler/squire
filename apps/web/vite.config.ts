/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";

const DAY_SECONDS = 24 * 60 * 60;

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "Squire",
        short_name: "Squire",
        description: "WalkScape recipe book",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === "/api/recipes",
            handler: "NetworkFirst",
            options: { cacheName: "recipe-book", networkTimeoutSeconds: 3 },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/icons/"),
            handler: "CacheFirst",
            options: {
              cacheName: "game-icons",
              expiration: { maxEntries: 2000, maxAgeSeconds: 30 * DAY_SECONDS },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: { proxy: { "/api": "http://localhost:3000" } },
  test: { environment: "jsdom" },
});
