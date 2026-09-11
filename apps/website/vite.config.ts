/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // GitHub Pages serves the site under /artydog, not the domain root.
  base: "/artydog/",
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
  },
  plugins: [react(), tailwindcss()],
});
