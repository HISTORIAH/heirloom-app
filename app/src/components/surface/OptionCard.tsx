import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A pickable row in a dialog — a yield mode, a validator. Selection reads as
 * an ink border and a filled check rather than a drop shadow, so the chosen
 * option sits in the list instead of lifting off it.
 */
export const OptionCard: React.FC<{
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  /** Tailwind bg-* for the icon well when selected. */
  accent?: string;
  title: string;
  badge?: string;
  note?: string;
  children?: ReactNode;
}> = ({
  selected,
  onSelect,
  disabled = false,
  icon,
  accent = "bg-accent-yellow",
  title,
  badge,
  note,
  children,
}) => (
  <button
    type="button"
    onClick={onSelect}
    disabled={disabled}
    aria-pressed={selected}
    className={cn(
      "w-full rounded-lg border p-4 text-left transition-colors disabled:opacity-50",
      selected ? "border-foreground bg-tile-soft" : "border-tile-line hover:bg-tile-soft",
    )}
  >
    <div className="flex items-start gap-3">
      {icon && (
        <span
          className={cn(
            "shrink-0 rounded-lg border p-2",
            selected ? cn(accent, "border-transparent") : "border-tile-line",
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{title}</span>
          {badge && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ring-1 ring-inset ring-foreground/20">
              {badge}
            </span>
          )}
        </span>
        {children && (
          <span className="mt-1 block text-xs font-medium text-muted-foreground">{children}</span>
        )}
        {note && (
          <span className="mt-1.5 block text-[11px] font-bold tabular-nums text-muted-foreground">
            {note}
          </span>
        )}
      </span>
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
          selected ? "border-foreground bg-foreground text-background" : "border-tile-line",
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </div>
  </button>
);
