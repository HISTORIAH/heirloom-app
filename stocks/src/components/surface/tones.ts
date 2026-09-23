/**
 * Card fills for the stocks UI. The set is small on purpose: paper and soft
 * carry nearly everything, sage marks what is alive (a vault, a plan in good
 * standing), and alert is the one warm fill, kept for what needs a decision.
 */
export type TileTone = "paper" | "soft" | "sage" | "alert" | "danger";

export const toneStyles: Record<TileTone, string> = {
  paper: "border border-tile-line bg-background",
  soft: "border border-tile-line bg-tile-soft",
  sage: "border border-accent-sage hs-fill-sage",
  alert: "border border-accent-yellow hs-fill-alert",
  danger: "border border-[hsl(var(--accent-red)/0.4)] bg-background",
};
