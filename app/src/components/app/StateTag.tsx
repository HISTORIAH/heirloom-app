import { cn } from "@/lib/utils";

/**
 * A vault's state, as a tag. Lime is alive, yellow is the window that still
 * has a way back, ink is settled and final, and a spent vault gets no fill at
 * all. The same four readings hold on every screen that shows a vault.
 */
const STATE_TONE: Record<string, string> = {
  active: "tag tag-live",
  grace: "tag tag-accent",
  claimable: "tag tag-ink",
  distributed: "tag",
};

const StateTag = ({ state, className }: { state: string; className?: string }) => (
  <span className={cn(STATE_TONE[state] ?? "tag", className)}>{state}</span>
);

export default StateTag;
