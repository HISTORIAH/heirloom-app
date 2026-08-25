// Low-chroma companions, plus the one loud yellow. A logoless token gets a
// distinguishable mark without introducing a colour the page does not own.
const TOKEN_ACCENTS = [
  { bg: "bg-accent-sky", shadow: "hsl(var(--accent-sky))" },
  { bg: "bg-accent-yellow", shadow: "hsl(var(--accent-yellow))" },
  { bg: "bg-accent-sage", shadow: "hsl(var(--accent-sage))" },
  { bg: "bg-tile-soft", shadow: "hsl(var(--tile-soft))" },
] as const;

/**
 * Deterministically assigns a palette color to a token mint, so distinct
 * tokens without a logo get visually distinct icon colors.
 */
export function getTokenAccent(mint: string): (typeof TOKEN_ACCENTS)[number] {
  let hash = 0;
  for (let i = 0; i < mint.length; i++) {
    hash = (hash * 31 + mint.charCodeAt(i)) >>> 0;
  }
  return TOKEN_ACCENTS[hash % TOKEN_ACCENTS.length];
}
