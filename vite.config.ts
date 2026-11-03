import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
// GitHub Pages passes its base path (e.g. "/NihulHichadshtY-GH") from actions/configure-pages;
// Vercel and local dev serve from "/".
const base = process.env.BASE_PATH ? `${process.env.BASE_PATH.replace(/\/$/, "")}/` : "/";

export default defineConfig({
  base,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: app deploys don't invalidate library caches.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
          "vendor-charts": ["recharts"],
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
    },
  },
});
