import { Link } from "react-router-dom";
import { useTranslation } from "@heirloom/i18n";
import { StocksPage } from "@/components/layout/StocksPage";
import { Panel } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { EmptyState, Figure, QueryState, Section } from "@/components/stocks/Section";
import { HealthText, RiskTags } from "@/components/stocks/StatusBits";
import type { WalletCtx } from "@/components/WithWallet";
import { useCatalog, useNow, useOwnerOverview } from "@/hooks/useStocks";
import { formatDate, formatNumber, formatUiAmount } from "@/lib/format";
import { coverBlockers } from "@/services/holdings";
import type { OwnerOverview } from "@/services/overview";
import { planTimeline } from "@/services/plans";

/** Shortcuts into the browse page from an empty wallet. Each is listed by both issuers. */
const POPULAR_TICKERS = ["AAPL", "TSLA", "NVDA", "SPY", "MSFT"];

const Portfolio = () => (
  <StocksPage page="portfolio">{(wallet) => <PortfolioBody wallet={wallet} />}</StocksPage>
);

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
        <Button variant="flat-yellow" size="sm" asChild>
          <Link to="/browse">
            {t("portfolio.browseAll", { formatted: formatNumber(catalog.count, locale) })}
          </Link>
        </Button>
        {POPULAR_TICKERS.map((ticker) => (
          <Button key={ticker} variant="flat-outline" size="sm" asChild>
            <Link to={`/browse?q=${ticker}`}>{ticker}</Link>
          </Button>
        ))}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Figure cap={t("portfolio.held")} value={held.length} />
        <Figure
          cap={t("portfolio.backedUp")}
          value={t("portfolio.backedUpOf", { covered: backupRows.length, total: held.length })}
          note={
            attention > 0 ? (
              <span className="text-accent-red">
                {t("portfolio.needsAttention", { count: attention })}
              </span>
            ) : undefined
          }
        />
        <Figure cap={t("portfolio.inVault")} value={vaultRows.length} />
        <Figure
          cap={t("portfolio.nextCheckIn")}
          value={
            <span className="text-xl">
              {nextDeadline ? formatDate(nextDeadline, locale) : t("portfolio.noPlan")}
            </span>
          }
        />
      </div>

      {held.length > 0 && (
        <Section title={t("portfolio.holdings")}>
          <ul className="space-y-3">
            {held.map((holding) => {
              const covered = backupRows.find((r) => r.record.mint === holding.mint.mint);
              const coverable = !covered && coverBlockers(holding).length === 0;
              return (
                <li key={holding.position.tokenAccount}>
                  <Panel
                    tone="paper"
                    className="gap-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"
                  >
                    <AssetBadge
                      mint={holding.mint}
                      catalog={holding.catalog}
                      issuer={holding.issuer}
                    />
                    <p className="font-semibold tabular-nums">
                      {formatUiAmount(holding.position.amount, holding.mint, now, locale)}
                    </p>
                    <div className="space-y-2">
                      {covered ? (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            {t("common.backup")}
                          </p>
                          <HealthText health={covered.health} />
                        </div>
                      ) : (
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          {t("common.notProtected")}
                        </p>
                      )}
                      <RiskTags mint={holding.mint} />
                    </div>
                    <div className="md:justify-self-end">
                      {coverable && (
                        <Button variant="flat-yellow" size="sm" asChild>
                          <Link to="/protect">{t("portfolio.protect")}</Link>
                        </Button>
                      )}
                    </div>
                  </Panel>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {vaultRows.length > 0 && (
        <Section title={t("portfolio.vaulted")}>
          <ul className="space-y-3">
            {vaultRows.map((row) => (
              <li key={row.record.address}>
                <Panel
                  tone="sage"
                  className="gap-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-center"
                >
                  <AssetBadge mint={row.mint} catalog={row.catalog} />
                  <p className="font-semibold tabular-nums">
                    {formatUiAmount(row.position?.amount ?? 0n, row.mint, now, locale)}
                  </p>
                  <HealthText health={row.health} />
                </Panel>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

export default Portfolio;
