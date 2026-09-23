import { useMemo, useState } from "react";
import { useTranslation } from "@heirloom/i18n";
import { useCatalog } from "@/hooks/useStocks";
import { formatNumber } from "@/lib/format";
import type { CatalogEntry } from "@/services/catalog";
import { FEATURED_UNDERLYINGS } from "./links";

interface TapeItem {
  symbol: string;
  logo: string | null;
}

const SUFFIX: Record<CatalogEntry["issuer"], string> = { xstocks: "x", ondo: "on" };

const Logo: React.FC<{ src: string }> = ({ src }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="hs-logo-mono h-6 w-6 shrink-0 rounded-full border border-tile-line object-cover"
    />
  );
};

const Tape: React.FC<{ items: TapeItem[]; reverse?: boolean }> = ({ items, reverse }) => (
  <div className="hs-marquee">
    <div className="hs-marquee-track" data-reverse={reverse || undefined}>
      {/* Two copies, so the loop at -50% is seamless. Only the first is read out. */}
      {[0, 1].map((copy) => (
        <ul key={copy} className="flex shrink-0" aria-hidden={copy === 1 || undefined}>
          {items.map((item) => (
            <li
              key={item.symbol}
              className="hs-marquee-item flex items-center gap-2.5 px-5 py-2 text-[1.0625rem] font-medium tracking-[-0.01em] text-foreground/80"
            >
              {item.logo && <Logo src={item.logo} />}
              {item.symbol}
            </li>
          ))}
        </ul>
      ))}
    </div>
  </div>
);

/**
 * The breadth of the catalogue, as two running tapes — xStocks above, Ondo
 * below — that leave the column and run out to the edge of the window. The
 * tickers are known up front; logos arrive with the catalog.
 */
export const CatalogMarquee: React.FC = () => {
  const { t, i18n } = useTranslation("stocks");
  const catalog = useCatalog();

  const [xstocks, ondo] = useMemo(() => {
    const logos = new Map(catalog.entries.map((e) => [e.symbol, e.logo]));
    return (["xstocks", "ondo"] as const).map((issuer) =>
      FEATURED_UNDERLYINGS.map((u) => {
        const symbol = `${u}${SUFFIX[issuer]}`;
        return { symbol, logo: logos.get(symbol) ?? null };
      }),
    );
  }, [catalog.entries]);

  return (
    <section className="relative">
      <div className="hs-col flex items-center md:min-h-[16rem]">
        <div className="md:w-1/2 md:pr-10">
          <h2 className="hs-h2 whitespace-pre-line">{t("landing.catalog.title")}</h2>
          <p className="mt-5 max-w-[26rem] text-[0.975rem] leading-relaxed text-foreground/80">
            {t("landing.catalog.body")}
          </p>
          {catalog.isLoading ? (
            <span className="mt-4 block h-4 w-56 animate-pulse rounded bg-tile-soft motion-reduce:animate-none" />
          ) : catalog.count > 0 ? (
            <p className="hs-mono-xs mt-4 text-muted-foreground">
              {t("landing.catalog.count", {
                formatted: formatNumber(catalog.count, i18n.resolvedLanguage ?? i18n.language),
              })}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-10 flex items-center md:absolute md:inset-y-0 md:left-1/2 md:right-0 md:mt-0">
        <div className="w-full space-y-1 border-y border-tile-line bg-background py-3">
          <Tape items={xstocks} />
          <Tape items={ondo} reverse />
        </div>
      </div>
    </section>
  );
};
