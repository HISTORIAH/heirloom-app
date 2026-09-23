import type { CollectionEntry } from "astro:content";
import { docHref } from "./site";

/**
 * The sidebar's shape. Section order is editorial and lives here; page order
 * inside a section is the `order` field on each document's frontmatter, so a
 * page can be moved by editing only itself.
 */
export const SECTIONS = [
  { id: "getting-started", label: "Getting started" },
  { id: "concepts", label: "Core concepts" },
  { id: "using", label: "Using Heirloom" },
  { id: "stocks", label: "Tokenized stocks" },
  { id: "program", label: "On-chain program" },
  { id: "reference", label: "Reference" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export interface NavItem {
  id: string;
  title: string;
  href: string;
  description: string;
}

export interface NavGroup {
  id: SectionId;
  label: string;
  items: NavItem[];
}

export function buildNav(entries: CollectionEntry<"docs">[]): NavGroup[] {
  return SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    items: entries
      .filter((e) => e.data.section === section.id)
      .sort((a, b) => a.data.order - b.data.order)
      .map((e) => ({
        id: e.id,
        title: e.data.title,
        href: docHref(e.id),
        description: e.data.description,
      })),
  })).filter((group) => group.items.length > 0);
}

/** The reading order of the whole book, for prev/next. */
export function flattenNav(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items);
}

export function sectionLabel(id: string): string {
  return SECTIONS.find((s) => s.id === id)?.label ?? id;
}
