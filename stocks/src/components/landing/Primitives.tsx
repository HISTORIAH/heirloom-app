import { cn } from "@/lib/utils";

/** Registration ticks on the outer rules and the centre line, between sections. */
export const Ticks: React.FC<{ className?: string }> = ({ className }) => (
  <div aria-hidden="true" className={cn("lp-ticks", className)}>
    <i />
  </div>
);

/** The Heirloom mark in `currentColor`: two posts and the line between them. */
export const Mark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="16 14 88 92" aria-hidden="true" className={className} fill="currentColor">
    <rect x="16" y="14" width="21" height="92" rx="7" />
    <rect x="83" y="14" width="21" height="92" rx="7" />
    <path
      d="M37 60h9l7-17 14 34 7-17h9"
      fill="none"
      stroke="currentColor"
      strokeWidth="13"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** The yellow app icon, as favicon.svg draws it. */
export const MarkTile: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 120 120" aria-hidden="true" className={className}>
    <rect width="120" height="120" rx="28" className="fill-accent-yellow" />
    <g transform="translate(60 60) scale(0.86) translate(-60 -60)" className="text-foreground">
      <rect x="16" y="14" width="21" height="92" rx="7" fill="currentColor" />
      <rect x="83" y="14" width="21" height="92" rx="7" fill="currentColor" />
      <path
        d="M37 60h9l7-17 14 34 7-17h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

/**
 * A diagram connector: a hairline that stretches to fill its box, ending in an
 * arrowhead. Rightwards by default, downwards with `down`.
 */
export const Connector: React.FC<{ className?: string; down?: boolean }> = ({
  className,
  down,
}) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex items-center text-foreground/40",
      down ? "flex-col" : "flex-row",
      className,
    )}
  >
    <span className={cn("bg-current", down ? "w-px flex-1" : "h-px flex-1")} />
    <svg
      viewBox="0 0 8 8"
      className={cn("h-2 w-2 shrink-0", down ? "-mt-px rotate-90" : "-ml-px")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M2 1l4 3-4 3" />
    </svg>
  </span>
);
