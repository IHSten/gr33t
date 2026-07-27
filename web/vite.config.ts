import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const workerOrigin = process.env.WORKER_ORIGIN || "http://localhost:8787";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: workerOrigin,
        changeOrigin: true,
      },
    },
  },
});
