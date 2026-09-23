import { Link } from "react-router-dom";
import { useTranslation } from "@heirloom/i18n";
import { formatNumber } from "@/lib/format";
import { AsciiCanvas } from "./AsciiCanvas";
import { barsScene } from "./ascii";
import { STOCKS_DOCS_URL } from "./links";

/** What the product is, beside a block of live-looking price bars. */
export const Intro: React.FC = () => {
  const { t } = useTranslation("stocks");

  return (
    <section className="lp-col">
      <div className="lp-card grid gap-6 p-4 md:grid-cols-2 md:p-6">
        <div className="aspect-square overflow-hidden rounded-xl border border-tile-line bg-background">
          <AsciiCanvas scene={barsScene} fontPx={10} className="text-foreground" />
        </div>
        <div className="flex flex-col justify-end gap-5 px-2 pb-2 md:px-0 md:pb-0">
          <h2 className="lp-h2 whitespace-pre-line">{t("landing.intro.title")}</h2>
          <p className="text-[0.975rem] leading-relaxed text-foreground/80">
            {t("landing.intro.body")}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link to="/protect" className="lp-btn lp-btn-primary">
              {t("landing.intro.protect")}
            </Link>
            <a href={STOCKS_DOCS_URL} className="lp-btn lp-btn-ghost">
              {t("landing.intro.docs")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

/** Three reasons, as the reference's uneven bento: two stacked, one tall. */
export const Pillars: React.FC = () => {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  // An illustration of the arithmetic, not a real position.
  const example = [
    [t("landing.pillars.dividends.raw"), formatNumber(10, locale)],
    [t("landing.pillars.dividends.multiplier"), `× ${formatNumber(1.02, locale)}`],
    [t("landing.pillars.dividends.shown"), formatNumber(10.2, locale)],
  ];

  return (
    <section className="lp-col grid gap-4 md:grid-cols-2">
      <div className="grid gap-4">
        {(["custody", "liquid"] as const).map((key) => (
          <article key={key} className="lp-card flex flex-col gap-10 p-6">
            <h3 className="lp-h3 whitespace-pre-line">{t(`landing.pillars.${key}.title`)}</h3>
            <p className="lp-mono text-foreground/75">{t(`landing.pillars.${key}.body`)}</p>
          </article>
        ))}
      </div>
      <article className="lp-card flex flex-col justify-between gap-10 p-6">
        <h3 className="lp-h3 whitespace-pre-line">{t("landing.pillars.dividends.title")}</h3>
        <figure className="rounded-xl border border-tile-line bg-background p-4">
          <figcaption className="lp-mono-xs mb-2 text-muted-foreground">
            {t("landing.pillars.dividends.example")}
          </figcaption>
          <dl className="lp-mono">
            {example.map(([label, value], i) => (
              <div
                key={label}
                className={`flex items-baseline justify-between gap-4 py-1.5 ${
                  i === example.length - 1 ? "border-t border-tile-line font-medium" : ""
                }`}
              >
                <dt className="text-foreground/70">{label}</dt>
                <dd className="tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </figure>
        <p className="lp-mono text-foreground/75">{t("landing.pillars.dividends.body")}</p>
      </article>
    </section>
  );
};
