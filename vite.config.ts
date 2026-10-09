import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/fis-intervent-demo/" : "/",
  server: {
    port: 4187
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom",
      "react-dom/client",
      "react-router-dom",
      "lucide-react",
      "zustand",
      "fuse.js"
    ]
  },
  preview: {
    port: 4185
  },
  build: {
    chunkSizeWarningLimit: 1500
  }
});
