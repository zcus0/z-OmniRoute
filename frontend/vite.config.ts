import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5177,
    proxy: {
      // Dev-only: forward API calls to the backend (npm run backend).
      "/api": { target: "http://localhost:3001", changeOrigin: true, ws: true },
      "/v1": { target: "http://localhost:3001", changeOrigin: true },
      // Live dashboard WebSocket runs on its own port.
      "/live-ws": { target: "ws://localhost:20132", ws: true },
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
