/**
 * Tile fills for the mosaic landing, kept out of Mosaic.tsx so that file only
 * exports components (react-refresh requires it).
 *
 * Yellow is the one loud colour on the page; sage and sky are deliberately
 * low-chroma so they group tiles without competing with it.
 */
export type TileTone =
  | "plain"
  | "paper"
  | "soft"
  | "yellow"
  | "sage"
  | "sky"
  | "cyan"
  | "orange"
  | "ink";

export const toneStyles: Record<TileTone, string> = {
  // No border and no fill: type sitting directly on the page, which is what
  // stops the mosaic reading as a wall of boxes.
  plain: "bg-transparent",
  paper: "border border-tile-line bg-background",
  soft: "border border-tile-soft bg-tile-soft",
  yellow: "border border-accent-yellow bg-accent-yellow",
  sage: "border border-accent-sage bg-accent-sage",
  sky: "border border-accent-sky bg-accent-sky",
  // Full-strength accents, used one tile at a time so they read as punctuation
  // rather than as a second brand colour.
  cyan: "border border-accent-cyan bg-accent-cyan",
  orange: "border border-accent-orange bg-accent-orange",
  ink: "border border-foreground bg-foreground text-background",
};

/** Muted body copy that stays legible on whichever fill the tile carries. */
export const toneMuted: Record<TileTone, string> = {
  plain: "text-muted-foreground",
  paper: "text-muted-foreground",
  soft: "text-muted-foreground",
  yellow: "text-foreground/70",
  sage: "text-foreground/65",
  sky: "text-foreground/65",
  cyan: "text-foreground/70",
  orange: "text-foreground/70",
  ink: "text-background/65",
};

/** Small uppercase label sitting at the top of most tiles. */
export const toneCap: Record<TileTone, string> = {
  plain: "text-muted-foreground",
  paper: "text-muted-foreground",
  soft: "text-muted-foreground",
  yellow: "text-foreground/60",
  sage: "text-foreground/55",
  sky: "text-foreground/55",
  cyan: "text-foreground/60",
  orange: "text-foreground/60",
  ink: "text-background/55",
};
