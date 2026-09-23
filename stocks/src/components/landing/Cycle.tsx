import { useTranslation } from "@heirloom/i18n";
import { cn } from "@/lib/utils";

const PHASES = ["setup", "active", "grace", "recoverable"] as const;

/**
 * The plan's clock as a four-column timeline, laid on the page's own quarter
 * rules so they double as its column dividers. A node marks where each phase
 * begins; Active, the state a plan spends its life in, is the lit one.
 */
export const Cycle: React.FC = () => {
  const { t } = useTranslation("stocks");

  return (
    <section className="hs-col">
      <h2 className="hs-h2">{t("landing.cycle.title")}</h2>
      <p className="mt-5 max-w-[31rem] text-[0.975rem] leading-relaxed text-foreground/80">
        {t("landing.cycle.body")}
      </p>
      <ol className="mt-10 grid md:grid-cols-4">
        {PHASES.map((phase, i) => (
          <li key={phase} className="grid grid-rows-[auto_1fr]">
            <div className="flex items-baseline gap-3 border-t border-tile-line px-4 py-4 md:border-b">
              <span className="hs-mono-xs text-muted-foreground">0{i + 1}</span>
              <span className="text-[0.9375rem] font-medium">
                {t(`landing.cycle.${phase}.name`)}
              </span>
            </div>
            <div
              // Stacked, each cell is boxed on both sides; in a row, neighbours
              // share one divider, so only the first draws a left edge.
              className={cn(
                "relative border-x border-tile-line bg-tile-soft px-4 pb-6 pt-5 md:border-b md:border-l-0",
                i === 0 && "md:border-l",
                i === PHASES.length - 1 && "border-b",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -left-[5px] -top-[5px] h-[9px] w-[9px] rounded-full border",
                  phase === "active"
                    ? "border-foreground/60 bg-accent-sage ring-4 ring-accent-sage/40"
                    : "border-foreground/35 bg-background",
                )}
              />
              <p className="text-sm font-medium">{t(`landing.cycle.${phase}.when`)}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t(`landing.cycle.${phase}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
