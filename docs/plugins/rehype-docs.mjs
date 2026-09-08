import GithubSlugger from "github-slugger";

/**
 * Two small transforms every document needs, hand-rolled so the docs pull in
 * no unified plugin packages of their own.
 *
 *  1. Headings get a stable id and a hover anchor, so any h2/h3/h4 is
 *     linkable. The id is assigned here rather than left to Astro's own pass,
 *     which runs *after* user rehype plugins — this one has to know the slug to
 *     build the link. Astro keeps an id that already exists, so the anchor, the
 *     heading and the `headings` export all agree.
 *  2. Tables get wrapped in a scroll container, so a wide table scrolls inside
 *     its own box rather than making the whole page scroll sideways.
 */

const HEADINGS = new Set(["h2", "h3", "h4"]);

function textOf(node) {
  if (node.type === "text") return node.value;
  if (!Array.isArray(node.children)) return "";
  return node.children.map(textOf).join("");
}

function walk(node, parent, slugger) {
  if (!node || typeof node !== "object") return;

  if (node.type === "element") {
    if (HEADINGS.has(node.tagName)) {
      node.properties ??= {};
      node.properties.id ??= slugger.slug(textOf(node));
      node.children.push({
        type: "element",
        tagName: "a",
        properties: {
          href: `#${node.properties.id}`,
          className: ["heading-anchor"],
          "aria-hidden": "true",
          tabindex: -1,
        },
        // Empty on purpose: the "#" is drawn by CSS. Astro builds its
        // `headings` export from a heading's text content, and a literal glyph
        // here would show up in every table of contents entry.
        children: [],
      });
    }

    if (node.tagName === "table" && parent && !parent.__wrapped) {
      const index = parent.children.indexOf(node);
      if (index !== -1) {
        parent.children[index] = {
          type: "element",
          tagName: "div",
          properties: { className: ["table-scroll"] },
          children: [node],
          __wrapped: true,
        };
      }
    }
  }

  const children = node.children;
  if (!Array.isArray(children)) return;
  // Snapshot: the table rule replaces entries in place while we iterate.
  for (const child of [...children]) walk(child, node, slugger);
}

export default function rehypeDocs() {
  return (tree) => walk(tree, null, new GithubSlugger());
}
