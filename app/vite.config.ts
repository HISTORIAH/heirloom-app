import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // @heirloom/i18n is consumed as source from packages/, outside this app's
  // root. Without excluding it from dep pre-bundling, edits to the locale
  // files can be served from a stale cache and every new key renders as its
  // own name until the dev server is restarted.
  optimizeDeps: {
    exclude: ["@heirloom/i18n"],
  },
  server: {
    watch: {
      ignored: ["!**/packages/i18n/src/**"],
    },
  },
});
