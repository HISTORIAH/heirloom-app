import { cn } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

const PCTS = [25, 50, 75, 100] as const;

export const PercentRow: React.FC<{
  onPick: (pct: number) => void;
  selected?: number;
  disabled?: boolean;
  size?: "default" | "sm";
  className?: string;
}> = ({ onPick, selected, disabled = false, size = "default", className }) => {
  const { t } = useTranslation("app");
  return (
  <div className={cn("flex overflow-hidden rounded-lg border border-tile-line", className)}>
    {PCTS.map((pct, i) => (
      <button
        key={pct}
        type="button"
        onClick={() => onPick(pct)}
        disabled={disabled}
        aria-pressed={selected === pct}
        className={cn(
          "text-[11px] font-bold uppercase tracking-[0.12em] transition-colors disabled:opacity-40",
          size === "sm" ? "px-2.5 py-1.5" : "flex-1 py-2.5",
          i > 0 && "border-l border-tile-line",
          selected === pct
            ? "bg-foreground text-background"
            : "hover:bg-tile-soft disabled:hover:bg-transparent",
        )}
      >
        {pct === 100 ? t("common.max") : `${pct}%`}
      </button>
    ))}
  </div>
  );
};
