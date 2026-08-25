import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One option in a set the reader has to pick from: a hairline row that turns
 * to a full rule and a soft fill when chosen, with a filled mark at the end.
 * Selection is shown by weight, not by giving each option its own colour.
 */
const Choice = ({
  selected,
  onClick,
  disabled,
  icon,
  title,
  badge,
  description,
  meta,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  title: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    className={cn(
      "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors disabled:opacity-50",
      selected
        ? "border-foreground bg-tile-soft"
        : "border-tile-line bg-background hover:border-foreground/40 hover:bg-tile-soft",
    )}
  >
    {icon ? (
      <span className="mt-0.5 shrink-0 [&_svg]:h-4 [&_svg]:w-4" aria-hidden="true">
        {icon}
      </span>
    ) : null}

    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{title}</span>
        {badge}
      </span>
      {description ? (
        <span className="mt-1 block text-xs font-medium leading-relaxed text-muted-foreground">
          {description}
        </span>
      ) : null}
      {meta ? <span className="mt-1.5 block text-xs font-semibold">{meta}</span> : null}
    </span>

    <span
      aria-hidden="true"
      className={cn(
        "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border transition-colors",
        selected ? "border-foreground bg-foreground" : "border-tile-line bg-background",
      )}
    />
  </button>
);

export default Choice;
