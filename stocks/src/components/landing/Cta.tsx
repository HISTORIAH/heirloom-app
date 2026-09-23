import { Link } from "react-router-dom";
import { MAX_INTERVAL_SECONDS, RECOVERY_FEE_BPS } from "@historiah/heirloom-stocks";
import { useTranslation } from "@heirloom/i18n";
import { useCatalog } from "@/hooks/useStocks";
import { formatNumber, formatPercent, SECONDS_PER_DAY } from "@/lib/format";
import { DitherField } from "./DitherField";

/** The page's one big ask, with the button held in a halo over a field of sage light. */
export const Cta: React.FC = () => {
  const { t } = useTranslation("stocks");

  return (
    <section className="lp-col">
      <div className="lp-card p-5 md:p-6">
        <p className="lp-mono-xs text-muted-foreground">{t("landing.cta.cap")}</p>
        <p className="mt-4 max-w-[46rem] text-[clamp(1.5rem,2.5vw,2.25rem)] font-medium leading-[1.15] tracking-[-0.025em]">
          {t("landing.cta.title")}
        </p>
        <div className="relative mt-10 h-[15rem] overflow-hidden rounded-xl border border-tile-line bg-background md:h-[17rem]">
          <DitherField shape="rise" className="text-[hsl(var(--lp-sage-line))]" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="rounded-full border border-tile-line bg-background/70 p-2.5 backdrop-blur-sm">
              <Link to="/portfolio" className="lp-btn lp-btn-primary">
                {t("landing.cta.button")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Four figures, each either counted from the shipped catalog or read from the
 * program's own constants, so none of them can drift from the product.
 */
export const Facts: React.FC = () => {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const catalog = useCatalog();
  const count = (n: number) => (catalog.isLoading ? null : n > 0 ? formatNumber(n, locale) : "—");

  const facts = [
    { label: t("landing.facts.stocks"), value: count(catalog.count) },
    {
      label: t("landing.facts.tradable"),
      value: count(catalog.entries.filter((e) => e.tradable).length),
    },
    { label: t("landing.facts.fee"), value: formatPercent(RECOVERY_FEE_BPS / 10_000, locale) },
    {
      label: t("landing.facts.interval"),
      value: t("common.days", { count: MAX_INTERVAL_SECONDS / SECONDS_PER_DAY }),
    },
  ];

  return (
    <section className="lp-col">
      <dl className="grid gap-4 sm:grid-cols-2">
        {facts.map(({ label, value }) => (
          <div key={label} className="lp-card flex min-h-[10rem] flex-col justify-between gap-8 p-6">
            <dt className="lp-mono text-foreground/75">{label}</dt>
            <dd className="text-[clamp(2.25rem,4vw,3.25rem)] font-medium leading-none tracking-[-0.035em] tabular-nums">
              {value ?? (
                <span className="block h-[0.9em] w-40 animate-pulse rounded-md bg-background motion-reduce:animate-none" />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
