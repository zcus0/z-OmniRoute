import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,
    proxy: {
      // Dev-only: forward API calls to the backend (npm run backend).
      "/api": "http://localhost:3001",
      "/v1": "http://localhost:3001",
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
