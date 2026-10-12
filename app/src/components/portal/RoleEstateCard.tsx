import type { ReactNode } from "react";
import { Panel } from "@/components/surface/Panel";
import { cn } from "@/lib/utils";

/**
 * The estate cards on the guardian and check-in pages: a title, a mono subline, a status pill,
 * one timing row and a footer with the action. Colours come from the existing palette: yellow
 * says something needs doing, lime says all is well, the warm neutral is everything else.
 */

const PILL_TONE = {
  warning: "bg-accent-yellow/30 text-foreground",
  ok: "bg-accent-lime/25 text-foreground",
  neutral: "bg-tile-soft text-muted-foreground",
} as const;

export const StatusPill: React.FC<{ tone: keyof typeof PILL_TONE; children: ReactNode }> = ({
  tone,
  children,
}) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-[0.06em]",
      PILL_TONE[tone],
    )}
  >
    {children}
  </span>
);

/** How much of the current window is used. Yellow once a check-in is missed, ink while on track. */
export const CountdownBar: React.FC<{ progress: number; overdue: boolean }> = ({
  progress,
  overdue,
}) => (
  <div
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(progress * 100)}
    className="mt-3 h-2 overflow-hidden rounded-full bg-tile-soft"
  >
    <div
      className={cn(
        "h-full rounded-full transition-[width] duration-1000 ease-linear",
        overdue ? "bg-accent-yellow" : "bg-foreground",
      )}
      style={{ width: `${progress * 100}%` }}
    />
  </div>
);

export const CardRow: React.FC<{ label: string; value: ReactNode }> = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="font-mono text-base font-bold tabular-nums">{value}</span>
  </div>
);

export const RoleEstateCard: React.FC<{
  title: string;
  sub: string;
  pill: ReactNode;
  /** The timing row and bar. */
  children?: ReactNode;
  note: ReactNode;
  action?: ReactNode;
}> = ({ title, sub, pill, children, note, action }) => (
  <Panel className="gap-0">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate font-display text-xl font-bold tracking-tight md:text-2xl">{title}</p>
        <p className="mt-1 truncate font-mono text-sm text-muted-foreground">{sub}</p>
      </div>
      {pill}
    </div>
    {children && <div className="mt-5">{children}</div>}
    <div className="mt-5 flex flex-col gap-4 border-t border-tile-line pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-sm text-muted-foreground">{note}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </Panel>
);
