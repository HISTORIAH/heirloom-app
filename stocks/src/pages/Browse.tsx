import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Address } from "@solana/kit";
import { useTranslation } from "@heirloom/i18n";
import { StocksPage } from "@/components/layout/StocksPage";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { EmptyState } from "@/components/stocks/Section";
import { FlagTags, HealthText } from "@/components/stocks/StatusBits";
import { TradeDialog } from "@/components/stocks/TradeDialog";
import type { WalletCtx } from "@/components/WithWallet";
import { IS_MAINNET } from "@/config";
import { useWallet } from "@/contexts/WalletContext";
import { useMainnetHoldings, useTokenPrices } from "@/hooks/useJupiter";
import { useCatalog, useOwnerOverview } from "@/hooks/useStocks";
import { formatNumber, formatPercent, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  filterGroups,
  groupByCompany,
  type CompanyGroup,
  type IssuerFilter,
} from "@/services/browse";
import type { CatalogEntry } from "@/services/catalog";
import { coverBlockers, type StockHolding } from "@/services/holdings";
import type { MainnetBalance, MainnetHoldings, TokenPrice } from "@/services/jupiter";
import type { CoveredRow, OwnerOverview } from "@/services/overview";
import { ISSUER_POWERS, riskFlags } from "@/services/risk";

/** Companies per page of results; "Show more" adds another page. */
const PAGE_SIZE = 30;

const ISSUER_FILTERS: IssuerFilter[] = ["all", "xstocks", "ondo"];

const statusLabel = "text-[11px] font-bold uppercase tracking-[0.14em]";

/**
 * Every stock in the catalog, grouped by company, readable without a wallet.
 *
 * Everything market-side here is mainnet, through Jupiter, whatever cluster the
 * rest of the app reads: live prices, what the wallet holds, and trading. None
 * of it touches the stocks program. What does — coverage, and the way into
 * protecting a holding — only appears when the app itself reads mainnet, since
 * a catalogued stock can only be covered on the cluster it lives on.
 */
const Browse = () => (
  <StocksPage page="browse" walletOptional>
    {(wallet, connect) => <BrowseView wallet={wallet} connect={connect} />}
  </StocksPage>
);

/** What the stocks program knows about one of the wallet's stocks. Mainnet builds only. */
interface Coverage {
  holding: StockHolding | null;
  backup: CoveredRow | null;
  vault: CoveredRow | null;
}

function coverageByMint(data: OwnerOverview): Map<Address, Coverage> {
  const coverage = new Map<Address, Coverage>();
  const at = (mint: Address) => {
    let entry = coverage.get(mint);
    if (!entry) coverage.set(mint, (entry = { holding: null, backup: null, vault: null }));
    return entry;
  };
  for (const h of data.holdings) if (h.position.amount > 0n) at(h.mint.mint).holding ??= h;
  for (const row of data.backup?.rows ?? []) at(row.record.mint).backup = row;
  for (const row of data.vault?.rows ?? []) at(row.record.mint).vault = row;
  return coverage;
}

const parseIssuer = (value: string | null): IssuerFilter =>
  value === "xstocks" || value === "ondo" ? value : "all";

/**
 * Search, issuer, and the held-only toggle live in the URL, so a link like
 * `/browse?q=AAPL` lands on a result. If the wallet's holdings can't be read,
 * the listings still show, as they would with no wallet.
 */
function BrowseView({ wallet, connect }: { wallet: WalletCtx | null; connect: () => void }) {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const { account } = useWallet();
  const catalog = useCatalog();
  const groups = useMemo(() => groupByCompany(catalog.entries), [catalog.entries]);
  const allMints = useMemo(() => catalog.entries.map((e) => e.mint), [catalog.entries]);

  const holdingsQuery = useMainnetHoldings(wallet?.address ?? null);
  const holdings = holdingsQuery.data ?? null;
  const overview = useOwnerOverview(IS_MAINNET ? (wallet?.address ?? null) : null);
  const coverage = useMemo(
    () => (overview.data ? coverageByMint(overview.data) : null),
    [overview.data],
  );

  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const issuer = parseIssuer(params.get("issuer"));
  const heldOnly = !!holdings && params.get("held") === "1";
  const tradableOnly = params.get("tradable") === "1";
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [trading, setTrading] = useState<CatalogEntry | null>(null);

  // Catalogued stocks the wallet holds on mainnet, or has in a vault.
  const heldMints = useMemo(() => {
    if (!holdings) return null;
    const held = new Set(allMints.filter((mint) => holdings.tokens.has(mint)));
    for (const [mint, c] of coverage ?? []) if (c.vault) held.add(mint);
    return held;
  }, [holdings, coverage, allMints]);

  const results = useMemo(
    () => filterGroups(groups, { query, issuer, tradableOnly, only: heldOnly ? heldMints : null }),
    [groups, query, issuer, tradableOnly, heldOnly, heldMints],
  );
  const shown = useMemo(() => results.slice(0, limit), [results, limit]);

  const wantedPrices = useMemo(
    () => [...shown.flatMap((g) => g.listings.map((l) => l.mint)), ...(heldMints ?? [])],
    [shown, heldMints],
  );
  const prices = useTokenPrices(wantedPrices, allMints, catalog.generatedAt);

  const update = (key: string, value: string) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
    setLimit(PAGE_SIZE);
  };

  if (catalog.isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (catalog.count === 0) {
    return (
      <EmptyState
        title={t("browse.unavailableTitle")}
        description={t("browse.unavailableDescription")}
      />
    );
  }

  const tokens = results.reduce((n, g) => n + g.listings.length, 0);
  const asOf = catalog.generatedAt
    ? new Date(catalog.generatedAt).toLocaleDateString(locale, { dateStyle: "medium" })
    : null;
  const held = holdings && heldMints ? portfolioValue(heldMints, holdings, prices) : null;

  return (
    <div className="space-y-8">
      {!IS_MAINNET && (
        <Panel tone="sky" className="max-w-3xl gap-2">
          <PanelCap className="text-foreground/55">{t("browse.networkCap")}</PanelCap>
          <p className="text-foreground/75">{t("browse.networkNote")}</p>
        </Panel>
      )}

      {held && held.count > 0 && (
        <p className="font-semibold">
          {t("browse.heldSummary", { count: held.count, value: formatUsd(held.usd, locale) })}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="w-full max-w-md space-y-2">
          <label htmlFor="browse-search" className="ed-field-label block">
            {t("browse.searchLabel")}
          </label>
          <input
            id="browse-search"
            type="search"
            value={query}
            onChange={(e) => update("q", e.target.value)}
            placeholder={t("browse.searchPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            className="ed-input w-full"
          />
        </div>
        <div role="group" aria-label={t("browse.issuerLabel")} className="flex flex-wrap gap-2">
          {ISSUER_FILTERS.map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant={issuer === filter ? "flat" : "flat-outline"}
              aria-pressed={issuer === filter}
              onClick={() => update("issuer", filter === "all" ? "" : filter)}
            >
              {t(`browse.issuers.${filter}`)}
            </Button>
          ))}
        </div>
        <label className="flex h-10 items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={tradableOnly}
            onChange={(e) => update("tradable", e.target.checked ? "1" : "")}
            className="h-5 w-5 accent-foreground"
          />
          {t("browse.tradableOnly")}
        </label>
        {holdings && (
          <label className="flex h-10 items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={heldOnly}
              onChange={(e) => update("held", e.target.checked ? "1" : "")}
              className="h-5 w-5 accent-foreground"
            />
            {t("browse.heldOnly")}
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
          {t("browse.companies", {
            count: results.length,
            formatted: formatNumber(results.length, locale),
          })}
          {" · "}
          {t("browse.tokens", { count: tokens, formatted: formatNumber(tokens, locale) })}
        </p>
        {!wallet && (
          <p className="text-sm text-muted-foreground">
            {t("browse.connectHint")}{" "}
            <button type="button" onClick={connect} className="font-semibold underline">
              {t("browse.connect")}
            </button>
          </p>
        )}
        {wallet && holdingsQuery.isError && (
          <p className="text-sm text-muted-foreground">
            {t("browse.walletFailed")}{" "}
            <button
              type="button"
              onClick={() => void holdingsQuery.refetch()}
              className="font-semibold underline"
            >
              {t("common.retry")}
            </button>
          </p>
        )}
      </div>

      {results.length === 0 ? (
        heldOnly && !query ? (
          <EmptyState
            title={t("browse.noneHeldTitle")}
            description={t("browse.noneHeldDescription")}
          />
        ) : (
          <EmptyState
            title={t("browse.noMatchTitle")}
            description={t("browse.noMatchDescription", { query })}
          />
        )
      ) : (
        <ul className="space-y-3">
          {shown.map((group) => (
            <CompanyRow
              key={group.ticker}
              group={group}
              prices={prices}
              holdings={holdings}
              coverage={coverage}
              locale={locale}
              onTrade={setTrading}
            />
          ))}
        </ul>
      )}

      {results.length > limit && (
        <Button variant="flat-outline" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
          {t("browse.showMore", { count: Math.min(PAGE_SIZE, results.length - limit) })}
        </Button>
      )}

      {asOf && (
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("browse.source", { date: asOf })}
        </p>
      )}

      <TradeDialog
        entry={trading}
        price={trading ? (prices.get(trading.mint) ?? null) : null}
        holdings={holdings}
        account={account}
        onConnect={() => {
          setTrading(null);
          connect();
        }}
        onOpenChange={(open) => !open && setTrading(null)}
      />
    </div>
  );
}

/** How many catalogued stocks the wallet holds, and their value where Jupiter has a price. */
function portfolioValue(
  held: Set<Address>,
  holdings: MainnetHoldings,
  prices: Map<Address, TokenPrice>,
): { count: number; usd: number } {
  let usd = 0;
  let count = 0;
  for (const mint of held) {
    const balance = holdings.tokens.get(mint);
    if (!balance) continue;
    count++;
    usd += balance.ui * (prices.get(mint)?.usd ?? 0);
  }
  return { count, usd };
}

interface RowProps {
  prices: Map<Address, TokenPrice>;
  holdings: MainnetHoldings | null;
  coverage: Map<Address, Coverage> | null;
  locale: string;
  onTrade: (entry: CatalogEntry) => void;
}

function CompanyRow({ group, ...row }: RowProps & { group: CompanyGroup }) {
  return (
    <li>
      <Panel tone="paper" className="gap-4">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg font-bold">{group.ticker}</h2>
          <p className="min-w-0 truncate text-muted-foreground">{group.company}</p>
        </div>
        <ul className="divide-y divide-tile-line">
          {group.listings.map((entry) => (
            <ListingRow key={entry.mint} entry={entry} {...row} />
          ))}
        </ul>
      </Panel>
    </li>
  );
}

function ListingRow({
  entry,
  prices,
  holdings,
  coverage,
  locale,
  onTrade,
}: RowProps & { entry: CatalogEntry }) {
  const { t } = useTranslation("stocks");
  const price = prices.get(entry.mint) ?? null;
  const balance = holdings?.tokens.get(entry.mint) ?? null;
  const covered = coverage?.get(entry.mint) ?? null;
  // A held stock's own mint is on hand on a mainnet build, so it shows what the
  // issuer can do right now (including a live pause) rather than the usual set.
  const flags = covered?.holding ? riskFlags(covered.holding.mint) : ISSUER_POWERS[entry.issuer];
  // Jupiter only quotes tokens with an on-chain market.
  const tradable = price?.usd != null;
  const protectable =
    IS_MAINNET &&
    !!covered?.holding &&
    !covered.backup &&
    coverBlockers(covered.holding).length === 0;

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,1.6fr)_minmax(0,1.5fr)] md:items-center md:gap-4">
      <AssetBadge mint={{ mint: entry.mint, name: null, symbol: null }} catalog={entry} />
      <PriceCell price={price} ticker={entry.underlying} locale={locale} />
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t(`browse.issuers.${entry.issuer}`)}</p>
        <FlagTags flags={flags} />
      </div>
      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        {(balance || covered?.vault) && (
          <Position balance={balance} price={price} covered={covered} locale={locale} />
        )}
        <div className="flex gap-2">
          {protectable && (
            <Button variant="flat-yellow" size="sm" asChild>
              <Link to="/protect">{t("portfolio.protect")}</Link>
            </Button>
          )}
          {tradable && (
            <Button variant="flat-outline" size="sm" onClick={() => onTrade(entry)}>
              {t("browse.trade")}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

function PriceCell({
  price,
  ticker,
  locale,
}: {
  price: TokenPrice | null;
  ticker: string | null;
  locale: string;
}) {
  const { t } = useTranslation("stocks");
  if (!price) return <p className="text-sm text-muted-foreground">—</p>;
  const change = price.change24h;
  return (
    <div className="space-y-0.5">
      {price.usd !== null ? (
        <p className="font-semibold tabular-nums">{formatUsd(price.usd, locale)}</p>
      ) : (
        <p className={`${statusLabel} text-muted-foreground`} title={t("browse.noMarketHint")}>
          {t("browse.noMarket")}
        </p>
      )}
      {price.usd !== null && change !== null && (
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            change < 0 ? "text-accent-red" : "text-foreground/70",
          )}
        >
          {formatPercent(change / 100, locale, true)}
        </p>
      )}
      {ticker && price.underlyingUsd !== null && (
        <p className="text-xs text-muted-foreground">
          {t("browse.underlying", { ticker, price: formatUsd(price.underlyingUsd, locale) })}
        </p>
      )}
    </div>
  );
}

function Position({
  balance,
  price,
  covered,
  locale,
}: {
  balance: MainnetBalance | null;
  price: TokenPrice | null;
  covered: Coverage | null;
  locale: string;
}) {
  const { t } = useTranslation("stocks");
  return (
    <div className="space-y-1 md:text-right">
      {balance && (
        <p className="text-sm font-semibold tabular-nums">
          {t("browse.youHold", { amount: formatNumber(balance.ui, locale) })}
          {price?.usd != null && (
            <span className="font-normal text-muted-foreground">
              {" · "}
              {formatUsd(balance.ui * price.usd, locale)}
            </span>
          )}
        </p>
      )}
      {covered?.backup ? (
        <HealthText health={covered.backup.health} />
      ) : (
        IS_MAINNET &&
        covered?.holding && (
          <p className={`${statusLabel} text-muted-foreground`}>{t("common.notProtected")}</p>
        )
      )}
      {covered?.vault && <p className={statusLabel}>{t("browse.inVault")}</p>}
    </div>
  );
}

export default Browse;
