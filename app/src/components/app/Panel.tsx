import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PanelTone = "paper" | "soft" | "ink" | "accent";

const toneClass: Record<PanelTone, string> = {
  paper: "panel",
  soft: "panel-soft",
  ink: "panel-ink",
  accent: "panel-accent",
};

/**
 * A panel is the app's tile: a hairline box on paper, holding one idea. It is
 * the same object the landing mosaic is built from, so the two halves of the
 * product read as one page.
 */
export const Panel = ({
  tone = "paper",
  pad = true,
  className,
  children,
  ...rest
}: {
  tone?: PanelTone;
  /** Drop the default padding for panels that rule their own rows. */
  pad?: boolean;
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(toneClass[tone], pad && "panel-pad", className)} {...rest}>
    {children}
  </div>
);

/**
 * A panel's own head: the caption at the left, a rule, and whatever the panel
 * is controlled by at the right. The rule is what keeps a stack of panels
 * reading as a document rather than as a pile of cards.
 */
export const PanelHead = ({
  caption,
  right,
  className,
}: {
  caption: ReactNode;
  right?: ReactNode;
  className?: string;
}) => (
  <div className={cn("mb-4 flex items-center gap-3 md:gap-4", className)}>
    <span className="cap shrink-0">{caption}</span>
    <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
    {right}
  </div>
);

/** The small uppercase label, as a component for parity with the landing. */
export const Cap = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("cap", className)}>{children}</span>
);

/** One fact, set as a ruled row. */
export const DataRow = ({
  k,
  children,
  className,
  mono = false,
}: {
  k: ReactNode;
  children: ReactNode;
  className?: string;
  mono?: boolean;
}) => (
  <div className={cn("data-row", className)}>
    <span className="data-k">{k}</span>
    <span className={cn("data-v min-w-0 break-all text-right", mono && "font-mono text-xs font-medium")}>
      {children}
    </span>
  </div>
);

/**
 * A number given the room to be read as one: caption above, figure below,
 * nothing else in the box.
 */
export const StatCell = ({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) => (
  <div className={cn("min-w-0", className)}>
    <p className="cap truncate">{label}</p>
    <p className="num-lg mt-2 truncate">{value}</p>
    {hint ? <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{hint}</p> : null}
  </div>
);

export default Panel;
