import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { STOCKS_QUERY_KEY, useCatalog } from "@/hooks/useStocks";
import { formatNumber, formatPercent, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchPrices } from "@/services/jupiter";
import { featuredListings } from "./links";

const SHOWN = 4;

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <span
    aria-hidden="true"
    className={cn("block animate-pulse rounded-md bg-tile-soft motion-reduce:animate-none", className)}
  />
);

/**
 * One stock's live mainnet price in a single wide capsule, with a switch
 * between a few well-known listings. The prices are Jupiter's, read the same
 * way `/browse` reads them.
 */
export const LivePrice: React.FC = () => {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const catalog = useCatalog();
  const listings = useMemo(
    () => featuredListings(catalog.entries, "xstocks").slice(0, SHOWN),
    [catalog.entries],
  );
  const [picked, setPicked] = useState(0);
  const listing = listings[Math.min(picked, listings.length - 1)] ?? null;

  const mints = useMemo(() => listings.map((l) => l.mint), [listings]);
  const prices = useQuery({
    queryKey: [STOCKS_QUERY_KEY, "jupiter", "featured", ...mints],
    queryFn: () => fetchPrices(mints),
    enabled: mints.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const price = listing ? prices.data?.get(listing.mint) : undefined;
  const usd = price ? (price.usd ?? price.underlyingUsd) : null;
  const change = price?.change24h ?? null;

  const loading = catalog.isLoading || (mints.length > 0 && prices.isLoading);
  const unavailable = !loading && (usd === null || !listing);

  return (
    <section className="hs-col">
      <h2 className="hs-h2">{t("landing.price.title")}</h2>
      <p className="mt-5 max-w-[34rem] text-[0.975rem] leading-relaxed text-foreground/80">
        {t("landing.price.body")}
      </p>

      <div role="group" aria-label={t("landing.price.pick")} className="mt-8 flex flex-wrap gap-1">
        {catalog.isLoading
          ? Array.from({ length: SHOWN }, (_, i) => <Skeleton key={i} className="h-10 w-20 rounded-full" />)
          : listings.map((l, i) => (
              <button
                key={l.mint}
                type="button"
                aria-pressed={l === listing}
                onClick={() => setPicked(i)}
                className={cn(
                  "h-10 rounded-full px-4 text-sm font-medium transition-colors duration-100 ease-out",
                  l === listing
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.symbol}
              </button>
            ))}
      </div>

      <div className="mt-3 flex items-center gap-4 rounded-[2.5rem] border border-tile-line bg-background p-3 sm:p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-tile-line bg-tile-soft sm:h-16 sm:w-16">
          {listing?.logo && <img src={listing.logo} alt="" className="h-full w-full object-cover" />}
        </span>
        <div className="min-w-0 flex-1">
          {loading ? (
            <>
              <Skeleton className="h-9 w-40 sm:h-11" />
              <Skeleton className="mt-2 h-3 w-48" />
            </>
          ) : unavailable ? (
            <>
              <p className="text-lg font-medium text-muted-foreground">
                {t("landing.price.unavailable")}
              </p>
              <button
                type="button"
                onClick={() => void prices.refetch()}
                className="hs-link hs-mono-xs mt-1 text-muted-foreground"
              >
                {t("landing.price.retry")}
              </button>
            </>
          ) : (
            <>
              <p className="text-[2rem] font-medium leading-none tracking-[-0.03em] tabular-nums sm:text-[2.75rem]">
                {formatUsd(usd!, locale)}
              </p>
              <p className="hs-mono-xs mt-2 flex flex-wrap items-center gap-x-2 text-muted-foreground">
                <span className="truncate">
                  {listing!.symbol} · {listing!.name}
                </span>
                {change !== null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 tabular-nums",
                      change >= 0 ? "text-[hsl(var(--hs-up))]" : "text-[hsl(var(--hs-down))]",
                    )}
                  >
                    {change >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                    )}
                    {t("landing.price.change")} {formatPercent(change / 100, locale, true)}
                  </span>
                )}
              </p>
            </>
          )}
        </div>
        <Link
          to={listing?.underlying ? `/browse?q=${encodeURIComponent(listing.underlying)}` : "/browse"}
          className="hs-btn hs-btn-ghost shrink-0 max-sm:px-4"
        >
          {t("landing.price.trade")}
        </Link>
      </div>

      <Link to="/browse" className="hs-link mt-5 inline-block text-sm">
        {catalog.count > 0
          ? t("landing.price.link", { formatted: formatNumber(catalog.count, locale) })
          : t("landing.price.linkFallback")}
      </Link>
    </section>
  );
};
