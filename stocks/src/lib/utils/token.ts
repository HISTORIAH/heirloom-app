const TOKEN_ACCENTS = [
  { bg: "bg-accent-cyan", shadow: "hsl(var(--accent-cyan))" },
  { bg: "bg-accent-yellow", shadow: "hsl(var(--accent-yellow))" },
  { bg: "bg-accent-purple", shadow: "hsl(var(--accent-purple))" },
  { bg: "bg-accent-orange", shadow: "hsl(var(--accent-orange))" },
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
