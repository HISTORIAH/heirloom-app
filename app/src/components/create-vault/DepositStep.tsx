import { useMemo, useState } from "react";
import TokenAvatar from "@/components/TokenAvatar";
import { SOL_DECIMALS, SOL_MAX_RESERVE } from "@/lib/constants";
import { cn, formatUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import type { TokenSelection } from "@/pages/CreateVault";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  solAmount: number;
  setSolAmount: (n: number) => void;
  tokenSelections: Record<string, TokenSelection>;
  setTokenSelections: React.Dispatch<React.SetStateAction<Record<string, TokenSelection>>>;
  tokens: SplTokenAsset[] | undefined;
  tokensLoading: boolean;
  solBalance: number;
  solLoading: boolean;
  isConnected: boolean;
}

type AssetTab = "sol" | "tokens" | "collectibles";

const DepositStep: React.FC<Props> = ({
  solAmount,
  setSolAmount,
  tokenSelections,
  setTokenSelections,
  tokens,
  tokensLoading,
  solBalance,
  solLoading,
  isConnected,
}) => {
  const { t } = useTranslation("app");
  const [activeTab, setActiveTab] = useState<AssetTab>("sol");
  const [tokenSearch, setTokenSearch] = useState("");
  const [tokenSort, setTokenSort] = useState<"balance" | "name">("balance");
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [hideDust, setHideDust] = useState(true);

  const filteredTokens = useMemo(() => {
    const q = tokenSearch.trim().toLowerCase();
    let list = tokens ?? [];

    if (hideDust) {
      list = list.filter((tok) => tok.uiAmount >= 0.01 || tok.mint in tokenSelections);
    }

    if (q) {
      list = list.filter(
        (tok) =>
          tok.label.toLowerCase().includes(q) ||
          tok.name?.toLowerCase().includes(q) ||
          tok.symbol?.toLowerCase().includes(q) ||
          tok.mint.toLowerCase().includes(q),
      );
    }

    return [...list].sort((a, b) => {
      if (tokenSort === "balance") {
        const diff = b.uiAmount - a.uiAmount;
        return diff !== 0 ? diff : a.label.localeCompare(b.label);
      }
      return a.label.localeCompare(b.label);
    });
  }, [tokens, tokenSearch, tokenSort, hideDust, tokenSelections]);

  const displayTokens = showAllTokens ? filteredTokens : filteredTokens.slice(0, 50);
  const hasMoreTokens = filteredTokens.length > 50;

  // Build the "Going in" tray items
  const trayItems = useMemo(() => {
    const items: { kind: string; id: string; amount: string; label: string }[] = [];
    if (solAmount > 0) {
      items.push({
        kind: "sol",
        id: "sol",
        amount: formatUiAmount(solAmount),
        label: "SOL",
      });
    }
    for (const [mint, sel] of Object.entries(tokenSelections)) {
      if (sel.amount <= 0) continue;
      const tok = (tokens ?? []).find((item) => item.mint === mint);
      items.push({
        kind: "tok",
        id: mint,
        amount: formatUiAmount(sel.amount),
        label: tok?.symbol || tok?.label || "token",
      });
    }
    return items;
  }, [solAmount, tokenSelections, tokens]);

  const assetCount = trayItems.length;
  const tokenCount = Object.values(tokenSelections).filter((v) => v.amount > 0).length;
  const solCount = solAmount > 0 ? 1 : 0;

  const removeTrayItem = (kind: string, id: string) => {
    if (kind === "sol") {
      setSolAmount(0);
    } else if (kind === "tok") {
      setTokenSelections((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const setSolByPercent = (pct: number) => {
    const factorDec = Math.min(SOL_DECIMALS, 9);
    const factor = Math.pow(10, factorDec);
    if (pct === 100) {
      const v = Math.floor((solBalance - SOL_MAX_RESERVE) * factor) / factor;
      setSolAmount(Math.max(0, v));
      return;
    }
    const v = Math.floor(solBalance * (pct / 100) * factor) / factor;
    setSolAmount(Math.max(0, v));
  };

  const toggleToken = (mint: string) => {
    setTokenSelections((prev) => {
      if (mint in prev) {
        const next = { ...prev };
        delete next[mint];
        return next;
      }
      const tok = (tokens ?? []).find((item) => item.mint === mint);
      if (!tok) return prev;
      // Default to Max (full balance) when adding
      return { ...prev, [mint]: { mint, amount: tok.uiAmount, pct: 100 } };
    });
  };

  const setTokenByPercent = (mint: string, pct: number) => {
    const tok = (tokens ?? []).find((item) => item.mint === mint);
    if (!tok) return;
    const amount = (tok.uiAmount * pct) / 100;
    setTokenSelections((prev) => ({
      ...prev,
      [mint]: { mint, amount, pct },
    }));
  };

  const updateTokenAmount = (mint: string, value: string) => {
    const tok = (tokens ?? []).find((item) => item.mint === mint);
    if (!tok) return;
    const v = Math.max(0, Math.min(tok.uiAmount, Number(value)));
    const pct = tok.uiAmount > 0 ? Math.round((v / tok.uiAmount) * 100) : 0;
    setTokenSelections((prev) => ({
      ...prev,
      [mint]: { mint, amount: v || 0, pct },
    }));
  };

  const countText =
    assetCount === 0
      ? t("createVault.wizard.nothingYet")
      : assetCount === 1
        ? t("createVault.wizard.oneAsset")
        : t("createVault.wizard.nAssets", { count: assetCount });

  const tabs: { id: AssetTab; label: string; count: number }[] = [
    { id: "sol", label: t("createVault.wizard.solTab"), count: solCount },
    { id: "tokens", label: t("createVault.wizard.tokensTab"), count: tokenCount },
    { id: "collectibles", label: t("createVault.wizard.collectiblesTab"), count: 0 },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="ed-h3">{t("createVault.wizard.whatGoesIn")}</h2>
        <p className="ed-lede mt-2 text-muted-foreground">
          {t("createVault.wizard.whatGoesInLede")}
        </p>
      </div>

      {/* Going in tray */}
      <div className="mb-6 rounded-2xl border border-tile-line p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold">{t("createVault.wizard.goingIn")}</span>
          <span className="text-xs text-muted-foreground">{countText}</span>
        </div>
        <div className="mt-2.5">
          {trayItems.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              {t("createVault.wizard.nothingYet")}
            </span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {trayItems.map((item) => (
                <span
                  key={`${item.kind}-${item.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-tile-soft py-1 pl-3 pr-1 text-sm"
                >
                  <span className="font-mono tabular-nums">{item.amount}</span>
                  <span className="font-semibold">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => removeTrayItem(item.kind, item.id)}
                    aria-label={`${t("createVault.wizard.remove")} ${item.label}`}
                    className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-background"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Asset type"
        className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-tile-soft p-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors",
              activeTab === tab.id
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="font-mono text-xs tabular-nums opacity-70">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* SOL tab */}
      {activeTab === "sol" && (
        <div className="space-y-3">
          <label className="ed-field-label" htmlFor="sol-amount">
            {t("createVault.wizard.howMuchSol")}
          </label>
          <div className="flex items-center rounded-2xl border border-tile-line px-4">
            <input
              id="sol-amount"
              type="text"
              inputMode="decimal"
              value={solAmount || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                setSolAmount(Math.max(0, Number(val) || 0));
              }}
              placeholder="0"
              aria-label={t("createVault.wizard.solAmountAria")}
              className="min-h-[4.5rem] min-w-0 flex-1 border-0 bg-transparent font-mono text-2xl font-semibold tabular-nums outline-none"
            />
            <span className="ml-2 text-lg font-bold">SOL</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {([25, 50, 75, 100] as const).map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setSolByPercent(pct)}
                className={cn(
                  "min-h-[2.75rem] rounded-xl border text-sm font-semibold transition-colors",
                  "border-tile-line bg-background hover:bg-tile-soft",
                )}
              >
                {pct === 100 ? t("createVault.wizard.max") : `${pct}%`}
              </button>
            ))}
          </div>
          {isConnected && (
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {t("createVault.wizard.walletBalance", {
                  amount: solLoading
                    ? "…"
                    : solBalance.toLocaleString(undefined, {
                        maximumFractionDigits: Math.min(6, SOL_DECIMALS),
                      }),
                })}
              </span>
              <span>{t("createVault.wizard.maxKeepsReserve", { amount: SOL_MAX_RESERVE })}</span>
            </div>
          )}
          {solAmount > solBalance - SOL_MAX_RESERVE && solAmount > 0 && (
            <div role="alert" className="rounded-xl bg-accent-yellow/20 px-4 py-3 text-sm">
              {t("createVault.wizard.belowReserveWarning", {
                amount: SOL_MAX_RESERVE,
              })}
            </div>
          )}
        </div>
      )}

      {/* Tokens tab */}
      {activeTab === "tokens" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[12rem] flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={2}
              />
              <input
                type="text"
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value)}
                placeholder={t("createVault.wizard.searchTokens")}
                aria-label={t("createVault.wizard.searchTokensAria")}
                className="ed-input pl-10"
              />
            </div>
            <button
              type="button"
              onClick={() => setTokenSort((s) => (s === "balance" ? "name" : "balance"))}
              className="flex shrink-0 items-center gap-1 rounded-xl border border-tile-line px-3.5 text-xs font-bold uppercase tracking-[0.12em] hover:bg-tile-soft"
            >
              {t("createVault.wizard.sort")}{" "}
              {tokenSort === "balance" ? t("createVault.wizard.bal") : t("createVault.wizard.name")}
              <ChevronDown className="h-3 w-3" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setHideDust((v) => !v)}
              aria-pressed={hideDust}
              className={cn(
                "shrink-0 rounded-xl border px-3.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors",
                hideDust
                  ? "border-foreground bg-foreground text-background"
                  : "border-tile-line hover:bg-tile-soft",
              )}
            >
              {t("createVault.wizard.hideDust")}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("createVault.wizard.showingOf", {
              shown: displayTokens.length,
              total: filteredTokens.length,
            })}
            {hideDust && t("createVault.wizard.dustUnderHidden")}
          </p>

          <div
            className={cn(
              "overflow-y-auto rounded-xl border border-tile-line",
              showAllTokens ? "max-h-[26.25rem]" : "max-h-[26.25rem]",
            )}
          >
            {displayTokens.length === 0 && (
              <p className="px-5 py-7 text-center text-sm text-muted-foreground">
                {t("createVault.wizard.noTokensMatch", { query: tokenSearch })}
              </p>
            )}
            {displayTokens.map((tok) => {
              const sel = tokenSelections[tok.mint];
              const isSelected = tok.mint in tokenSelections;
              const unit =
                (tok.symbol || tok.label).length > 6
                  ? (tok.symbol || tok.label).slice(0, 4)
                  : tok.symbol || tok.label;

              return (
                <div
                  key={tok.mint}
                  className={cn(
                    "border-b border-tile-line/60 px-4 py-3.5 last:border-b-0",
                    isSelected && "bg-tile-soft",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <TokenAvatar
                      image={tok.image}
                      label={tok.label}
                      size="md"
                      accent={isSelected ? "bg-foreground" : "bg-accent-cyan"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">
                        {tok.symbol || tok.label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tok.name && tok.name !== (tok.symbol || tok.label)
                          ? tok.name
                          : `${tok.mint.slice(0, 8)}…${tok.mint.slice(-4)}`}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-sm tabular-nums">
                      {formatUiAmount(tok.uiAmount)}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleToken(tok.mint)}
                      aria-pressed={isSelected}
                      aria-label={`${isSelected ? t("createVault.wizard.remove") : t("createVault.wizard.add")} ${tok.symbol || tok.label}`}
                      className={cn(
                        "grid h-10 w-[4.5rem] shrink-0 place-items-center rounded-xl border-[1.5px] text-[0.8125rem] font-bold transition-colors",
                        isSelected
                          ? "border-foreground bg-foreground text-background"
                          : "border-foreground bg-background hover:bg-tile-soft",
                      )}
                    >
                      {isSelected ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      ) : (
                        t("createVault.wizard.add")
                      )}
                    </button>
                  </div>

                  {isSelected && sel && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="flex min-h-[2.75rem] min-w-0 flex-1 items-center gap-2 rounded-xl border-[1.5px] border-foreground px-3.5">
                        <span className="shrink-0 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted-foreground">
                          {t("createVault.wizard.amount")}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={sel.amount || ""}
                          placeholder="0"
                          aria-label={t("createVault.wizard.tokenAmountAria", {
                            label: tok.label,
                          })}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            updateTokenAmount(tok.mint, val);
                          }}
                          className="min-w-0 flex-1 border-0 bg-transparent text-right font-mono text-sm tabular-nums outline-none"
                        />
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                          {unit}
                        </span>
                      </div>
                      <div className="flex min-h-[2.75rem] flex-1 overflow-hidden rounded-xl border border-tile-line">
                        {([25, 50, 75, 100] as const).map((pct, i) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setTokenByPercent(tok.mint, pct)}
                            aria-pressed={sel.pct === pct}
                            className={cn(
                              "flex-1 border-0 text-[0.8125rem] font-bold transition-colors",
                              i > 0 && "border-l border-tile-line",
                              sel.pct === pct
                                ? "bg-foreground text-background"
                                : "bg-background hover:bg-tile-soft",
                            )}
                          >
                            {pct === 100 ? t("createVault.wizard.max") : `${pct}%`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {hasMoreTokens && (
              <div className="border-t border-tile-line py-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllTokens((v) => !v)}
                  className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
                >
                  {showAllTokens
                    ? t("createVault.wizard.showLess")
                    : t("createVault.wizard.showAll", {
                        count: filteredTokens.length,
                      })}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collectibles tab */}
      {activeTab === "collectibles" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("createVault.wizard.nCollectibles", { count: 0 })}
          </p>
          <p className="rounded-xl bg-tile-soft px-4 py-6 text-center text-sm text-muted-foreground">
            {t("createVault.wizard.noSplTokens")}
          </p>
        </div>
      )}

      {tokensLoading && (
        <div className="mt-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          {t("createVault.wizard.scanning")}
        </div>
      )}
    </div>
  );
};

export default DepositStep;
