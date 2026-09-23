import { EXIT_FEE_BPS, RECOVERY_FEE_BPS } from "@historiah/heirloom-stocks";
import { useTranslation } from "@heirloom/i18n";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Connector } from "./Primitives";

const ACTORS = [
  { key: "owner", verb: "signs", row: "lg:row-start-2" },
  { key: "checkin", verb: "checksIn", row: "lg:row-start-3" },
  { key: "guardian", verb: "defers", row: "lg:row-start-4" },
] as const;

const Box: React.FC<{ title: string; sub: string; className?: string }> = ({
  title,
  sub,
  className,
}) => (
  <div className={cn("rounded-lg border border-tile-line px-3 py-2.5", className)}>
    <p className="text-[0.8125rem] font-medium leading-snug">{title}</p>
    <p className="hs-mono-xs mt-0.5 text-muted-foreground">{sub}</p>
  </div>
);

const Plan: React.FC<{ mode: "backup" | "vault" }> = ({ mode }) => {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const fees = {
    recoveryFee: formatPercent(RECOVERY_FEE_BPS / 10_000, locale),
    exitFee: formatPercent(EXIT_FEE_BPS / 10_000, locale),
  };
  const k = (key: string) => t(`landing.how.${mode}.${key}`, fees);
  return (
    <div className="rounded-xl border border-tile-line bg-background p-3">
      <p className="text-[0.9375rem] font-medium">{k("title")}</p>
      <p className="hs-mono-xs text-muted-foreground">{k("sub")}</p>
      <div className="mt-3 grid gap-2">
        {(["a", "b", "c"] as const).map((row) => (
          <Box key={row} title={k(row)} sub={k(`${row}Sub`)} className="bg-tile-soft" />
        ))}
      </div>
    </div>
  );
};

/**
 * The program drawn as a system: who can sign what, the two plan modes inside
 * `heirloom-stocks`, the issuer registry every cover passes through, and the
 * one place a plan can pay once its clock runs out. Every label is a real
 * instruction, account, or constant in `programs/heirloom-stocks`.
 */
export const HowItWorks: React.FC = () => {
  const { t } = useTranslation("stocks");

  return (
    <section id="how-it-works" className="hs-col scroll-mt-24">
      <span className="hs-tag hs-mono-xs">{t("landing.how.tag")}</span>
      <h2 className="hs-h2 mt-5">{t("landing.how.title")}</h2>
      <p className="mt-5 max-w-[31rem] text-[0.975rem] leading-relaxed text-foreground/80">
        {t("landing.how.body")}
      </p>

      <div className="hs-sheet mt-10 p-4 sm:p-6 lg:px-12 lg:py-10">
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[10rem_5.5rem_minmax(0,1fr)] lg:gap-x-0">
          {/* The owner's instructions, bracketed from their wallet to the program. */}
          <div className="relative hidden h-12 lg:col-span-3 lg:block" aria-hidden="true">
            <p className="hs-mono-xs absolute left-[5rem] top-0 w-[calc(75%-1.125rem)] text-center text-muted-foreground">
              {t("landing.how.topLabel")}
            </p>
            <div className="absolute bottom-0 left-[5rem] h-4 w-[calc(75%-1.125rem)] rounded-t-md border-x border-t border-foreground/35" />
            <svg
              viewBox="0 0 8 8"
              className="absolute -bottom-1 left-[calc(75%+3.875rem)] h-2 w-2 -translate-x-1/2 text-foreground/40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            >
              <path d="M1 2l3 4 3-4" />
            </svg>
          </div>

          {ACTORS.map(({ key, verb, row }) => (
            <div key={key} className="contents">
              <div
                className={cn(
                  "flex flex-col justify-center rounded-lg border border-tile-line bg-tile-soft px-3 py-3 lg:col-start-1",
                  row,
                )}
              >
                <p className="text-[0.875rem] font-medium">{t(`landing.how.${key}.title`)}</p>
                <p className="hs-mono-xs text-muted-foreground">{t(`landing.how.${key}.sub`)}</p>
              </div>
              <div className={cn("hidden flex-col justify-center px-2 lg:col-start-2 lg:flex", row)}>
                <span className="hs-mono-xs mb-1 text-center text-muted-foreground">
                  {t(`landing.how.${verb}`)}
                </span>
                <Connector />
              </div>
            </div>
          ))}

          <Connector down className="h-8 lg:hidden" />

          <div className="relative rounded-xl border border-tile-line bg-tile-soft p-3 pt-6 sm:p-4 sm:pt-7 lg:col-start-3 lg:row-span-3 lg:row-start-2">
            <span className="hs-mono-xs absolute -top-3 left-1/2 -translate-x-1/2 rounded-md border border-tile-line bg-background px-2 py-0.5">
              {t("landing.how.program")}
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              <Plan mode="backup" />
              <Plan mode="vault" />
            </div>
            <Box
              title={t("landing.how.registry.title")}
              sub={t("landing.how.registry.sub")}
              className="mt-3 bg-background text-center"
            />
          </div>

          <div className="flex flex-col items-center lg:col-start-3 lg:row-start-5">
            <Connector down className="h-10" />
            <span className="hs-mono-xs my-1 text-muted-foreground">{t("landing.how.lapse")}</span>
            <Connector down className="h-6" />
          </div>

          <div className="rounded-xl border border-tile-line bg-tile-soft px-4 py-5 text-center lg:col-start-3 lg:row-start-6">
            <p className="text-[0.9375rem] font-medium">{t("landing.how.destination.title")}</p>
            <p className="hs-mono-xs mt-1 text-muted-foreground">
              {t("landing.how.destination.sub")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
