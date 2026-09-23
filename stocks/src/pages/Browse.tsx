import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { Address } from "@solana/kit";
import { useTranslation } from "@heirloom/i18n";
import { StocksPage } from "@/components/layout/StocksPage";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { EmptyState } from "@/components/stocks/Section";
import { FlagTags, HealthText } from "@/components/stocks/StatusBits";
import type { WalletCtx } from "@/components/WithWallet";
import { IS_MAINNET } from "@/config";
import { useCatalog, useNow, useOwnerOverview } from "@/hooks/useStocks";
import { formatNumber, formatUiAmount } from "@/lib/format";
import {
  filterGroups,
  groupByCompany,
  jupiterSwapUrl,
  type CompanyGroup,
  type IssuerFilter,
} from "@/services/browse";
import type { CatalogEntry } from "@/services/catalog";
import { coverBlockers, type StockHolding } from "@/services/holdings";
import type { CoveredRow, OwnerOverview } from "@/services/overview";
import { ISSUER_POWERS, riskFlags } from "@/services/risk";

/** Companies per page of results; "Show more" adds another page. */
const PAGE_SIZE = 30;

const ISSUER_FILTERS: IssuerFilter[] = ["all", "xstocks", "ondo"];

const statusLabel = "text-[11px] font-bold uppercase tracking-[0.14em]";

/**
 * Every stock in the catalog, grouped by company, readable without a wallet.
 * With one connected, each listing also says whether this wallet holds it and
 * how it is covered.
 */
const Browse = () => (
  <StocksPage page="browse" walletOptional>
    {(wallet, connect) =>
      wallet ? (
        <BrowseWithWallet wallet={wallet} />
      ) : (
        <BrowseView stocks={{ status: "none" }} connect={connect} />
      )
    }
  </StocksPage>
);

/** What the connected wallet has of one stock. */
interface Owned {
  holding: StockHolding | null;
  backup: CoveredRow | null;
  vault: CoveredRow | null;
}

function ownedByMint(data: OwnerOverview): Map<Address, Owned> {
  const owned = new Map<Address, Owned>();
  const at = (mint: Address) => {
    let entry = owned.get(mint);
    if (!entry) owned.set(mint, (entry = { holding: null, backup: null, vault: null }));
    return entry;
  };
  for (const h of data.holdings) if (h.position.amount > 0n) at(h.mint.mint).holding ??= h;
  for (const row of data.backup?.rows ?? []) at(row.record.mint).backup = row;
  for (const row of data.vault?.rows ?? []) at(row.record.mint).vault = row;
  return owned;
}

/** What the page knows about the stocks of the visitor's wallet. */
type WalletStocks =
  | { status: "none" }
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; owned: Map<Address, Owned> };

function BrowseWithWallet({ wallet }: { wallet: WalletCtx }) {
  const overview = useOwnerOverview(wallet.address);
  const owned = useMemo(() => (overview.data ? ownedByMint(overview.data) : null), [overview.data]);
  // A failed refetch keeps the last data, so this only fails with nothing to show.
  const stocks: WalletStocks = owned
    ? { status: "ready", owned }
    : overview.isError
      ? { status: "failed", retry: () => void overview.refetch() }
      : { status: "loading" };
  return <BrowseView stocks={stocks} />;
}

const parseIssuer = (value: string | null): IssuerFilter =>
  value === "xstocks" || value === "ondo" ? value : "all";

/**
 * Search, issuer, and the held-only toggle live in the URL, so a link like
 * `/browse?q=AAPL` lands on a result. If the wallet's holdings can't be read,
 * the listings still show, as they would with no wallet.
 */
function BrowseView({ stocks, connect }: { stocks: WalletStocks; connect?: () => void }) {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const now = useNow();
  const catalog = useCatalog();
  const groups = useMemo(() => groupByCompany(catalog.entries), [catalog.entries]);

  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const issuer = parseIssuer(params.get("issuer"));
  const owned = stocks.status === "ready" ? stocks.owned : null;
  // The catalog is mainnet-only, so off mainnet a wallet never holds any of it.
  const canFilterHeld = IS_MAINNET && !!owned;
  const heldOnly = canFilterHeld && params.get("held") === "1";
  const [limit, setLimit] = useState(PAGE_SIZE);

  const heldMints = useMemo(
    () =>
      owned
        ? new Set([...owned].filter(([, o]) => o.holding || o.vault).map(([mint]) => mint))
        : null,
    [owned],
  );
  const results = useMemo(
    () => filterGroups(groups, { query, issuer, only: heldOnly ? heldMints : null }),
    [groups, query, issuer, heldOnly, heldMints],
  );

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

  return (
    <div className="space-y-8">
      {!IS_MAINNET && (
        <Panel tone="sky" className="max-w-3xl gap-2">
          <PanelCap className="text-foreground/55">{t("browse.networkCap")}</PanelCap>
          <p className="text-foreground/75">{t("browse.networkNote")}</p>
        </Panel>
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
        {canFilterHeld && (
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
        {IS_MAINNET && stocks.status === "none" && connect && (
          <p className="text-sm text-muted-foreground">
            {t("browse.connectHint")}{" "}
            <button type="button" onClick={connect} className="font-semibold underline">
              {t("browse.connect")}
            </button>
          </p>
        )}
        {IS_MAINNET && stocks.status === "failed" && (
          <p className="text-sm text-muted-foreground">
            {t("browse.walletFailed")}{" "}
            <button type="button" onClick={stocks.retry} className="font-semibold underline">
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
          {results.slice(0, limit).map((group) => (
            <CompanyRow
              key={group.ticker}
              group={group}
              owned={owned}
              loading={stocks.status === "loading"}
              now={now}
              locale={locale}
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
    </div>
  );
}

/** `loading` while the wallet's holdings are still being read. */
interface RowProps {
  owned: Map<Address, Owned> | null;
  loading: boolean;
  now: number;
  locale: string;
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

function ListingRow({ entry, owned, loading, now, locale }: RowProps & { entry: CatalogEntry }) {
  const { t } = useTranslation("stocks");
  const mine = owned?.get(entry.mint) ?? null;
  // A held stock's own mint is on hand, so it shows what the issuer can do
  // right now (including a live pause) rather than the issuer's usual set.
  const flags = mine?.holding ? riskFlags(mine.holding.mint) : ISSUER_POWERS[entry.issuer];

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.6fr)_minmax(0,1.6fr)_minmax(0,1.3fr)] md:items-center md:gap-4">
      <AssetBadge mint={{ mint: entry.mint, name: null, symbol: null }} catalog={entry} />
      <p className="text-sm font-semibold">{t(`browse.issuers.${entry.issuer}`)}</p>
      <FlagTags flags={flags} />
      <div className="md:justify-self-end">
        <ListingStatus entry={entry} mine={mine} loading={loading} now={now} locale={locale} />
      </div>
    </li>
  );
}

function ListingStatus({
  entry,
  mine,
  loading,
  now,
  locale,
}: {
  entry: CatalogEntry;
  mine: Owned | null;
  loading: boolean;
  now: number;
  locale: string;
}) {
  const { t } = useTranslation("stocks");

  if (mine?.holding) {
    const { holding } = mine;
    return (
      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <div className="space-y-1 md:text-right">
          <p className="text-sm font-semibold tabular-nums">
            {t("browse.youHold", {
              amount: formatUiAmount(holding.position.amount, holding.mint, now, locale),
            })}
          </p>
          {mine.backup ? (
            <HealthText health={mine.backup.health} />
          ) : (
            <p className={`${statusLabel} text-muted-foreground`}>{t("common.notProtected")}</p>
          )}
          {mine.vault && <p className={statusLabel}>{t("browse.inVault")}</p>}
        </div>
        {!mine.backup && coverBlockers(holding).length === 0 && (
          <Button variant="flat-yellow" size="sm" asChild>
            <Link to="/protect">{t("portfolio.protect")}</Link>
          </Button>
        )}
      </div>
    );
  }

  if (mine?.vault) return <p className={statusLabel}>{t("browse.inVault")}</p>;
  // Don't offer to buy something the wallet may turn out to hold.
  if (loading || !IS_MAINNET) return null;

  return (
    <Button variant="flat-outline" size="sm" asChild>
      <a href={jupiterSwapUrl(entry.mint)} target="_blank" rel="noreferrer">
        {t("browse.buy")}
        <ArrowUpRight />
      </a>
    </Button>
  );
}

export default Browse;
