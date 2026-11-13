import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { buildNav, flattenNav } from "@/lib/nav";
import { SITE_URL } from "@/lib/site";

/**
 * The whole handbook as one plain-text file, in sidebar order: /docs/llms-full.txt.
 *
 * Coding agents integrating the clients, and answer engines summarising
 * Heirloom, read one file far more reliably than 25 HTML pages. It is built
 * from the same MDX sources as the pages, so it can't drift from them. MDX
 * components (<Callout>, <Steps>) stay in as written; they read fine as text.
 * The apex /llms.txt links here.
 */
export const GET: APIRoute = async () => {
  const entries = await getCollection("docs");
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const order = flattenNav(buildNav(entries));

  const header = [
    "# Heirloom documentation",
    "",
    "> Self-custody crypto inheritance and wallet recovery on Solana. Every page of the",
    `> handbook at ${SITE_URL}/docs/, concatenated in reading order.`,
    "",
  ].join("\n");

  const pages = order.flatMap((item) => {
    const entry = byId.get(item.id);
    if (!entry) return [];
    return [
      [
        `## ${entry.data.heading ?? entry.data.title}`,
        "",
        `URL: ${new URL(item.href, SITE_URL).href}`,
        "",
        `> ${entry.data.description}`,
        "",
        (entry.body ?? "").trim(),
        "",
      ].join("\n"),
    ];
  });

  return new Response([header, ...pages].join("\n---\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
