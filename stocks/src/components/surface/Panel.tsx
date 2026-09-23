import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneStyles, type TileTone } from "@/components/surface/tones";

export interface PanelProps {
  tone?: TileTone;
  /** Drop the default padding for panels that manage their own. */
  bare?: boolean;
  className?: string;
  children: ReactNode;
}

/** A rounded card, the landing's `hs-card` / `hs-sheet` with a tone. */
export const Panel: React.FC<PanelProps> = ({
  tone = "paper",
  bare = false,
  className,
  children,
}) => (
  <div
    className={cn(
      "flex min-w-0 flex-col rounded-[var(--hs-radius)]",
      !bare && "p-5 md:p-6",
      toneStyles[tone],
      className,
    )}
  >
    {children}
  </div>
);

/** The small monospace label a card or a figure opens with. */
export const Cap: React.FC<{ className?: string; children: ReactNode }> = ({
  className,
  children,
}) => <span className={cn("hs-mono-xs text-muted-foreground", className)}>{children}</span>;
