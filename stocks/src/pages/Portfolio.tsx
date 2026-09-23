import { Link } from "react-router-dom";
import { useTranslation } from "@heirloom/i18n";
import { StocksPage } from "@/components/layout/StocksPage";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import {
  Cell,
  EmptyState,
  List,
  QueryState,
  Row,
  Section,
  Stat,
  Stats,
} from "@/components/stocks/Section";
import { HealthText, RiskTags, Status } from "@/components/stocks/StatusBits";
import type { WalletCtx } from "@/components/WithWallet";
import { useCatalog, useNow, useOwnerOverview } from "@/hooks/useStocks";
import { formatDate, formatNumber, formatShortDate, formatUiAmount } from "@/lib/format";
import { coverBlockers } from "@/services/holdings";
import type { OwnerOverview } from "@/services/overview";
import { planTimeline } from "@/services/plans";
import { riskFlags } from "@/services/risk";

/** Shortcuts into the browse page from an empty wallet. Each is listed by both issuers. */
const POPULAR_TICKERS = ["AAPL", "TSLA", "NVDA", "SPY", "MSFT"];

const HOLDING_COLS =
  "minmax(0,2fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1.5fr) minmax(5.5rem,auto)";
const VAULT_COLS = "minmax(0,2fr) minmax(0,1fr) minmax(0,1.6fr)";

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
              <span className="text-[1.5rem] tracking-[-0.02em]">{t("portfolio.noPlan")}</span>
            )
          }
          note={
            nextDeadline ? (
              <span className="hs-mono-xs text-muted-foreground">
                {formatDate(nextDeadline, locale)}
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
