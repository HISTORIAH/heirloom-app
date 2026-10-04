// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import rehypeDocs from "./plugins/rehype-docs.mjs";

// The docs are a third static build that ships inside the landing's deploy
// artifact: `bun build:site` from the repo root copies `docs/dist` to
// `landing/dist/docs`, so heirlm.xyz and heirlm.xyz/docs are one origin served
// by one Worker. That is deliberate — docs on the apex feed the same domain
// the marketing pages rank on, and nothing has to be routed or CORS'd.
//
// Every page is prerendered. The only JavaScript that reaches the browser is
// three small inline islands: the sidebar filter, the scroll-spy for the
// table of contents, and the code-block copy buttons.
export default defineConfig({
  site: "https://heirlm.xyz",
  base: "/docs",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [mdx(), sitemap()],
  // Pages merged or renamed in the docs trim, so old links still land somewhere.
  redirects: {
    "/concepts/heartbeat": "/docs/using/check-in/",
    "/concepts/lifecycle": "/docs/how-it-works/",
    "/concepts/estate": "/docs/how-it-works/",
    "/using/emergency-withdraw": "/docs/using/close-estate/",
    "/concepts/roles": "/docs/how-it-works/",
    "/concepts/assets": "/docs/using/fund-estate/",
    "/concepts/fees": "/docs/fees/",
    "/program/architecture": "/docs/developers/clients/",
    "/program/accounts": "/docs/developers/clients/",
    "/program/instructions": "/docs/developers/instructions/",
    "/program/errors": "/docs/developers/errors/",
    "/reference/js-client": "/docs/developers/clients/",
  },
  markdown: {
    // Ink-black code blocks, to match the one dark surface the landing uses.
    shikiConfig: { theme: "github-dark-default", wrap: false },
    rehypePlugins: [rehypeDocs],
  },
});
