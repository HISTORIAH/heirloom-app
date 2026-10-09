import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  resolve: {
    // One React for the whole bundle. @heirloom/i18n is loaded as source from packages/, and
    // its react-i18next would otherwise resolve that package's own React copy: two Reacts,
    // and every hook in the i18n provider fails ("Invalid hook call").
    dedupe: ["react", "react-dom"],
    alias: {
      "@": `${import.meta.dirname}/src`,
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
