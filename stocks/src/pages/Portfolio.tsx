import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@heirloom/i18n";
import { StocksPage } from "@/components/layout/StocksPage";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import {
  Cell,
  ConnectRow,
  EmptyState,
  List,
  ListSkeleton,
  QueryState,
  Row,
  Section,
  Stat,
  Stats,
} from "@/components/stocks/Section";
import { FlagTags, HealthText, RiskTags, Status } from "@/components/stocks/StatusBits";
import { featuredListings } from "@/components/landing/links";
import type { WalletCtx } from "@/components/WithWallet";
import { STOCKS_QUERY_KEY, useCatalog, useNow, useOwnerOverview } from "@/hooks/useStocks";
import {
  formatDate,
  formatNumber,
  formatShortDate,
  formatUiAmount,
  formatUsd,
} from "@/lib/format";
import { fetchPrices } from "@/services/jupiter";
import { coverBlockers } from "@/services/holdings";
import type { OwnerOverview } from "@/services/overview";
import { planTimeline, timedInSeconds } from "@/services/plans";
import { ISSUER_POWERS, riskFlags } from "@/services/risk";

/** Shortcuts into the browse page from an empty wallet. Each is listed by both issuers. */
const POPULAR_TICKERS = ["AAPL", "TSLA", "NVDA", "SPY", "MSFT"];

const HOLDING_COLS =
  "minmax(0,2fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1.5fr) minmax(5.5rem,auto)";
const VAULT_COLS = "minmax(0,2fr) minmax(0,1fr) minmax(0,1.6fr)";

const FEATURED_COLS = "minmax(0,2fr) minmax(0,1fr) minmax(0,2fr) minmax(5.5rem,auto)";
const FEATURED_COUNT = 6;

const Portfolio = () => (
  <StocksPage page="portfolio">
    {(wallet) => (wallet ? <PortfolioBody wallet={wallet} /> : <PreviewPortfolio />)}
  </StocksPage>
);

/**
 * The portfolio before a wallet is connected: the holdings list under its
 * header, saying what will fill it, and below it a few real stocks from the
 * catalog, priced live, so the page shows what it is for.
 */
function PreviewPortfolio() {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const catalog = useCatalog();
  const listings = useMemo(
    () => featuredListings(catalog.entries, "xstocks").slice(0, FEATURED_COUNT),
    [catalog.entries],
  );
  const mints = useMemo(() => listings.map((l) => l.mint), [listings]);
  const prices = useQuery({
    queryKey: [STOCKS_QUERY_KEY, "jupiter", "featured", ...mints],
    queryFn: () => fetchPrices(mints),
    enabled: mints.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const formatted = formatNumber(catalog.count, locale);

  // No figures before a wallet: a row of dashes reads as a page that failed
  // to load, not as one waiting to be filled.
  return (
    <div className="space-y-14">
      <Section title={t("portfolio.holdings")}>
        <List
          cols={HOLDING_COLS}
          head={[
            t("columns.stock"),
            t("columns.balance"),
            t("columns.backup"),
            t("columns.issuerCan"),
            "",
          ]}
        >
          <ConnectRow>{t("preview.holdings")}</ConnectRow>
        </List>
      </Section>

      <Section
        title={t("preview.featuredTitle")}
        description={catalog.count > 0 ? t("preview.featuredDescription", { formatted }) : undefined}
        action={
          catalog.count > 0 && (
            <Button variant="ghost" asChild>
              <Link to="/browse">{t("portfolio.browseAll", { formatted })}</Link>
            </Button>
          )
        }
      >
        {catalog.isLoading ? (
          <ListSkeleton rows={4} />
        ) : listings.length === 0 ? (
          <p className="hs-sheet px-5 py-4 text-sm text-muted-foreground">
            {t("browse.unavailableDescription")}
          </p>
        ) : (
          <List
            cols={FEATURED_COLS}
            head={[t("columns.stock"), t("columns.price"), t("columns.issuerCan"), ""]}
          >
            {listings.map((entry) => {
              const price = prices.data?.get(entry.mint);
              const usd = price ? (price.usd ?? price.underlyingUsd) : null;
              return (
                <Row key={entry.mint}>
                  <AssetBadge mint={{ mint: entry.mint, name: null, symbol: null }} catalog={entry} />
                  <Cell label={t("columns.price")}>
                    {prices.isLoading ? (
                      <span className="hs-skel h-4 w-16" />
                    ) : (
                      <p className="font-medium tabular-nums">
                        {usd !== null ? formatUsd(usd, locale) : "—"}
                      </p>
                    )}
                  </Cell>
                  <Cell label={t("columns.issuerCan")}>
                    <FlagTags flags={ISSUER_POWERS[entry.issuer]} />
                  </Cell>
                  <div className="md:justify-self-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/browse?q=${encodeURIComponent(entry.underlying ?? entry.symbol)}`}>
                        {t("preview.view")}
                      </Link>
                    </Button>
                  </div>
                </Row>
              );
            })}
          </List>
        )}
      </Section>
    </div>
  );
}

function PortfolioBody({ wallet }: { wallet: WalletCtx }) {
  const overview = useOwnerOverview(wallet.address);
  return <QueryState query={overview}>{(data) => <PortfolioView data={data} />}</QueryState>;
}

function PortfolioView({ data }: { data: OwnerOverview }) {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const now = useNow();
  const catalog = useCatalog();

  const held = data.holdings.filter((h) => h.position.amount > 0n);
  const backupRows = data.backup?.rows ?? [];
  const vaultRows = data.vault?.rows ?? [];
  const attention = backupRows.filter((r) => r.health !== "covered").length;

  const plans = [data.backup?.plan, data.vault?.plan].filter((p) => p !== undefined);
  const nextDeadline = plans.length
    ? Math.min(...plans.map((p) => planTimeline(p, now).graceStartsAt))
    : null;

  if (held.length === 0 && vaultRows.length === 0) {
    return (
      <EmptyState
        title={t("portfolio.emptyTitle")}
        description={t("portfolio.emptyDescription", {
          formatted: formatNumber(catalog.count, locale),
        })}
      >
        <Button variant="primary" asChild>
          <Link to="/browse">
            {t("portfolio.browseAll", { formatted: formatNumber(catalog.count, locale) })}
          </Link>
        </Button>
        {POPULAR_TICKERS.map((ticker) => (
          <Link key={ticker} to={`/browse?q=${ticker}`} className="hs-pill">
            {ticker}
          </Link>
        ))}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-14">
      <Stats>
        <Stat cap={t("portfolio.held")} value={held.length} />
        <Stat
          cap={t("portfolio.backedUp")}
          value={t("portfolio.backedUpOf", { covered: backupRows.length, total: held.length })}
          note={
            attention > 0 ? (
              <Status tone="danger">{t("portfolio.needsAttention", { count: attention })}</Status>
            ) : undefined
          }
        />
        <Stat cap={t("portfolio.inVault")} value={vaultRows.length} />
        <Stat
          cap={t("portfolio.nextCheckIn")}
          value={
            nextDeadline ? (
              formatShortDate(nextDeadline, locale)
            ) : (
              <span className="text-[1.25rem] tracking-[-0.02em] md:text-[1.5rem]">{t("portfolio.noPlan")}</span>
            )
          }
          note={
            nextDeadline ? (
              <span className="hs-mono-xs text-muted-foreground">
                {formatDate(nextDeadline, locale, plans.some(timedInSeconds))}
              </span>
            ) : undefined
          }
        />
      </Stats>

      {held.length > 0 && (
        <Section title={t("portfolio.holdings")}>
          <List
            cols={HOLDING_COLS}
            head={[
              t("columns.stock"),
              t("columns.balance"),
              t("columns.backup"),
              t("columns.issuerCan"),
              "",
            ]}
          >
            {held.map((holding) => {
              const covered = backupRows.find((r) => r.record.mint === holding.mint.mint);
              const coverable = !covered && coverBlockers(holding).length === 0;
              return (
                <Row key={holding.position.tokenAccount}>
                  <AssetBadge
                    mint={holding.mint}
                    catalog={holding.catalog}
                    issuer={holding.issuer}
                  />
                  <Cell label={t("columns.balance")}>
                    <p className="font-medium tabular-nums">
                      {formatUiAmount(holding.position.amount, holding.mint, now, locale)}
                    </p>
                  </Cell>
                  <Cell label={t("columns.backup")}>
                    {covered ? (
                      <HealthText health={covered.health} />
                    ) : (
                      <Status tone="quiet">{t("common.notProtected")}</Status>
                    )}
                  </Cell>
                  <Cell label={t("columns.issuerCan")}>
                    {riskFlags(holding.mint).length > 0 ? (
                      <RiskTags mint={holding.mint} />
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </Cell>
                  <div className="md:justify-self-end">
                    {coverable && (
                      <Button variant="primary" size="sm" asChild>
                        <Link to="/protect">{t("portfolio.protect")}</Link>
                      </Button>
                    )}
                  </div>
                </Row>
              );
            })}
          </List>
        </Section>
      )}

      {vaultRows.length > 0 && (
        <Section title={t("portfolio.vaulted")}>
          <List
            cols={VAULT_COLS}
            head={[t("columns.stock"), t("columns.inVault"), t("columns.status")]}
          >
            {vaultRows.map((row) => (
              <Row key={row.record.address}>
                <AssetBadge mint={row.mint} catalog={row.catalog} />
                <Cell label={t("columns.inVault")}>
                  <p className="font-medium tabular-nums">
                    {formatUiAmount(row.position?.amount ?? 0n, row.mint, now, locale)}
                  </p>
                </Cell>
                <Cell label={t("columns.status")}>
                  <HealthText health={row.health} />
                </Cell>
              </Row>
            ))}
          </List>
        </Section>
      )}
    </div>
  );
}

export default Portfolio;
