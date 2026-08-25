import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    proxy: {
      // Dev-only: forward API calls to the backend (npm run dev in repo root).
      "/api": "http://localhost:20128",
      "/v1": "http://localhost:20128",
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
