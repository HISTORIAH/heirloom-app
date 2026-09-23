import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Check, Search } from "lucide-react";
import type { Address } from "@solana/kit";
import { useTranslation } from "@heirloom/i18n";
import { StocksPage } from "@/components/layout/StocksPage";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { Cell, EmptyState, List, ListSkeleton, Notice } from "@/components/stocks/Section";
import { FlagTags, HealthText, Status } from "@/components/stocks/StatusBits";
import { TradeDialog } from "@/components/stocks/TradeDialog";
import type { WalletCtx } from "@/components/WithWallet";
import { IS_MAINNET } from "@/config";
import { useWallet } from "@/contexts/WalletContext";
import { usePageSession, useResume } from "@/contexts/PageSession";
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

const CATALOG_COLS = "minmax(0,1.6fr) minmax(0,1fr) minmax(0,1.5fr) minmax(0,1.5fr)";

/** The pending action a trade leaves when it stops to connect a wallet. */
const TRADE = "trade";

/**
 * Every stock in the catalog, grouped by company, readable without a wallet.
 *
 * Everything market-side here is mainnet, through Jupiter, whatever cluster the
 * rest of the app reads: live prices, what the wallet holds, and trading. None
 * of it touches the stocks program. What does — coverage, and the way into
 * protecting a holding — only appears when the app itself reads mainnet, since
 * a catalogued stock can only be covered on the cluster it lives on.
 */
const Browse = () => {
  const { t } = useTranslation("stocks");
  return (
    <StocksPage
      page="browse"
      // Where these prices come from, beside the headline, on any build that
      // isn't reading mainnet.
      aside={
        !IS_MAINNET && <Notice title={t("browse.networkCap")}>{t("browse.networkNote")}</Notice>
      }
    >
      {(wallet) => <BrowseView wallet={wallet} />}
    </StocksPage>
  );
};

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
function BrowseView({ wallet }: { wallet: WalletCtx | null }) {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const { account } = useWallet();
  const { connect, requireWallet } = usePageSession();
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

  // A trade that stopped to connect a wallet opens again once it's connected.
  const resumedTrade = useResume<Address>(TRADE, !!wallet && catalog.count > 0);
  useEffect(() => {
    if (!resumedTrade) return;
    setTrading(catalog.entries.find((e) => e.mint === resumedTrade) ?? null);
  }, [resumedTrade, catalog.entries]);

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

  if (catalog.isLoading) {
    return (
      <div role="status" aria-label={t("common.loading")}>
        <ListSkeleton rows={6} />
      </div>
    );
  }
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
    <div className="space-y-6">
      {held && held.count > 0 && (
        <p className="hs-card px-5 py-4 text-[0.9375rem]">
          {t("browse.heldSummary", { count: held.count, value: formatUsd(held.usd, locale) })}
        </p>
      )}

      {/* The toolbar: search, issuer, and two narrowing toggles. All of it
          lives in the URL. */}
      <div className="hs-sheet flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="browse-search" className="sr-only">
            {t("browse.searchLabel")}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="browse-search"
            type="search"
            value={query}
            onChange={(e) => update("q", e.target.value)}
            placeholder={t("browse.searchPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            className="hs-input hs-input-lead"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={t("browse.issuerLabel")} className="hs-seg">
            {ISSUER_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                aria-pressed={issuer === filter}
                onClick={() => update("issuer", filter === "all" ? "" : filter)}
              >
                {t(`browse.issuers.${filter}`)}
              </button>
            ))}
          </div>
          <Toggle
            pressed={tradableOnly}
            onChange={(on) => update("tradable", on ? "1" : "")}
            label={t("browse.tradableOnly")}
          />
          {holdings && (
            <Toggle
              pressed={heldOnly}
              onChange={(on) => update("held", on ? "1" : "")}
              label={t("browse.heldOnly")}
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="hs-mono-xs text-muted-foreground" aria-live="polite">
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
            <button type="button" onClick={connect} className="hs-link font-medium text-foreground">
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
              className="hs-link font-medium text-foreground"
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
        <List
          cols={CATALOG_COLS}
          head={[
            t("columns.stock"),
            t("columns.price"),
            t("columns.issuer"),
            <span key="position" className="block md:text-right">
              {t("columns.position")}
            </span>,
          ]}
        >
          {shown.map((group) => (
            <CompanyRows
              key={group.ticker}
              group={group}
              prices={prices}
              holdings={holdings}
              coverage={coverage}
              locale={locale}
              onTrade={setTrading}
            />
          ))}
        </List>
      )}

      {results.length > limit && (
        <div className="flex justify-center pt-2">
          <Button variant="ghost" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            {t("browse.showMore", { count: Math.min(PAGE_SIZE, results.length - limit) })}
          </Button>
        </div>
      )}

      {asOf && (
        <p className="hs-mono-xs max-w-3xl pt-4 text-muted-foreground">
          {t("browse.source", { date: asOf })}
        </p>
      )}

      <TradeDialog
        entry={trading}
        price={trading ? (prices.get(trading.mint) ?? null) : null}
        holdings={holdings}
        account={account}
        onConnect={() => {
          if (trading) requireWallet(TRADE, trading.mint);
          setTrading(null);
        }}
        onOpenChange={(open) => !open && setTrading(null)}
      />
    </div>
  );
}

/** A filter that stays on: a pill that fills with ink and shows a tick. */
function Toggle({
  pressed,
  onChange,
  label,
}: {
  pressed: boolean;
  onChange: (pressed: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className="hs-pill"
    >
      {pressed && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </button>
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

/** A company's name as a band across the table, then one row per listing of it. */
function CompanyRows({ group, ...row }: RowProps & { group: CompanyGroup }) {
  return (
    <Fragment>
      <div className="hs-list-row !flex !flex-row items-baseline gap-3 bg-tile-soft/60 !py-3">
        <h2 className="hs-h4">{group.ticker}</h2>
        <p className="min-w-0 truncate text-sm text-muted-foreground">{group.company}</p>
      </div>
      {group.listings.map((entry) => (
        <ListingRow key={entry.mint} entry={entry} {...row} />
      ))}
    </Fragment>
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
    // On a phone the row is two lines of two: the stock and its price, then
    // the issuer and the actions. From md it takes the table's columns.
    <div className="hs-list-row max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-start max-md:gap-x-4">
      <AssetBadge mint={{ mint: entry.mint, name: null, symbol: null }} catalog={entry} />
      <Cell className="max-md:text-right">
        <PriceCell price={price} ticker={entry.underlying} locale={locale} />
      </Cell>
      <Cell className="space-y-2">
        <p className="text-sm font-medium">{t(`browse.issuers.${entry.issuer}`)}</p>
        <FlagTags flags={flags} />
      </Cell>
      <div className="flex flex-wrap items-center justify-end gap-3 max-md:self-end">
        {(balance || covered?.vault) && (
          <Position balance={balance} price={price} covered={covered} locale={locale} />
        )}
        <div className="flex gap-2">
          {protectable && (
            <Button variant="primary" size="sm" asChild>
              <Link to="/protect">{t("portfolio.protect")}</Link>
            </Button>
          )}
          {tradable && (
            <Button variant="ghost" size="sm" onClick={() => onTrade(entry)}>
              {t("browse.trade")}
            </Button>
          )}
        </div>
      </div>
    </div>
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
    <div className="space-y-1">
      {price.usd !== null ? (
        <p className="font-medium tabular-nums">{formatUsd(price.usd, locale)}</p>
      ) : (
        <span title={t("browse.noMarketHint")}>
          <Status tone="quiet">{t("browse.noMarket")}</Status>
        </span>
      )}
      {price.usd !== null && change !== null && (
        <p
          className={cn(
            "hs-mono-xs inline-flex items-center gap-0.5 tabular-nums",
            change < 0 ? "text-[hsl(var(--hs-down))]" : "text-[hsl(var(--hs-up))]",
          )}
        >
          {change < 0 ? (
            <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          )}
          {formatPercent(change / 100, locale, true)}
        </p>
      )}
      {ticker && price.underlyingUsd !== null && (
        <p className="hs-mono-xs text-muted-foreground">
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
    <div className="space-y-1.5 md:text-right">
      {balance && (
        <p className="text-sm font-medium tabular-nums">
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
        covered?.holding && <Status tone="quiet">{t("common.notProtected")}</Status>
      )}
      {covered?.vault && <Status tone="ok">{t("browse.inVault")}</Status>}
    </div>
  );
}

export default Browse;
