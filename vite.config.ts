import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 4184
  },
  preview: {
    port: 4185
  },
  build: {
    chunkSizeWarningLimit: 1500
  }
});
