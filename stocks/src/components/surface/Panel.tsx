import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneStyles, type TileTone } from "@/components/surface/tones";

/**
 * A tile that is not grid-positioned. The landing's Tile hands its span to a
 * mosaic and animates in on reading order; an app screen places its panels
 * itself and re-renders them constantly, so a staggered entrance would fire on
 * every state change.
 */
export interface PanelProps {
  tone?: TileTone;
  /** Drop the default padding for panels that manage their own. */
  bare?: boolean;
  className?: string;
  children: ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  tone = "paper",
  bare = false,
  className,
  children,
}) => (
  <div
    className={cn(
      "flex min-w-0 flex-col",
      tone !== "plain" && "rounded-xl",
      !bare && "p-5 md:p-6 xl:p-7",
      toneStyles[tone],
      className,
    )}
  >
    {children}
  </div>
);

/** The small uppercase label a panel opens with. Matches the landing `Cap`. */
export const PanelCap: React.FC<{ className?: string; children: ReactNode }> = ({
  className,
  children,
}) => (
  <span
    className={cn("text-[11px] font-bold uppercase tracking-[0.18em] md:text-xs", className)}
  >
    {children}
  </span>
);
