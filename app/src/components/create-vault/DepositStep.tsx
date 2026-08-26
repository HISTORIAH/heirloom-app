import { useMemo, useState } from "react";
import TokenAvatar from "@/components/TokenAvatar";
import { PercentRow } from "@/components/surface/PercentRow";
import { StepHeader } from "@/components/create-vault/StepHeader";
import { SOL_DECIMALS } from "@/lib/constants";
import { cn, formatUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"sol" | "tokens">("sol");
  const [tokenSearch, setTokenSearch] = useState("");
  const [tokenSort, setTokenSort] = useState<"balance" | "name">("balance");
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [hideDust, setHideDust] = useState(true);

  const filteredTokens = useMemo(() => {
    const q = tokenSearch.trim().toLowerCase();
    let list = tokens ?? [];

    if (hideDust) {
      list = list.filter((tok) => tok.uiAmount >= 0.01);
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
  }, [tokens, tokenSearch, tokenSort, hideDust]);

  const displayTokens = showAllTokens ? filteredTokens : filteredTokens.slice(0, 50);
  const hasMoreTokens = filteredTokens.length > 50;

  const deposited = useMemo(() => {
    const items: string[] = [];
    if (solAmount > 0) items.push(`${formatUiAmount(solAmount)} SOL`);
    for (const sel of Object.values(tokenSelections)) {
      if (sel.amount <= 0) continue;
      const tok = (tokens ?? []).find((item) => item.mint === sel.mint);
      items.push(`${formatUiAmount(sel.amount)} ${tok?.symbol || tok?.label || "token"}`);
    }
    return items;
  }, [solAmount, tokenSelections, tokens]);

  const setSolByPercent = (pct: number) => {
    const factorDec = Math.min(SOL_DECIMALS, 9);
    const factor = Math.pow(10, factorDec);
    const v = Math.floor(solBalance * (pct / 100) * factor) / factor;
    setSolAmount(Math.max(0, v));
  };

  /**
   * Selecting a token opens its amount field at zero rather than committing the
   * whole balance. A control labelled Select should not mean "deposit all of
   * it", least of all into an estate. Entries with a zero amount are ignored by
   * every consumer, which all filter on `amount > 0`.
   */
  const toggleToken = (mint: string) => {
    setTokenSelections((prev) => {
      if (mint in prev) {
        const next = { ...prev };
        delete next[mint];
        return next;
      }
      const tok = (tokens ?? []).find((item) => item.mint === mint);
      if (!tok) return prev;
      return { ...prev, [mint]: { mint, amount: 0, pct: 0 } };
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

  const tabClass = (active: boolean) =>
    cn(
      "px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
      active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-tile-soft",
    );

  return (
    <div>
      <StepHeader cap={t("createVault.wizard.step02")} title={t("createVault.wizard.whatGoesIn")} />

      {/* Above the tabs on purpose: SOL and tokens both feed one deposit, and
          switching tabs used to hide whatever you had entered on the other. */}
      <div className="mb-7">
        <p className="ed-label">{t("createVault.wizard.goingIntoEstate")}</p>
        <p className="mt-1 font-display text-[clamp(1.75rem,4.5vw,2.75rem)] font-bold leading-[1.05] tracking-tight">
          {deposited.length === 0
            ? t("createVault.wizard.nothingYetShort")
            : `${deposited.length} ${deposited.length === 1 ? t("createVault.wizard.asset") : t("createVault.wizard.assets")}`}
        </p>
        <p className="mt-2 max-w-[52ch] text-sm text-muted-foreground">
          {deposited.length === 0
            ? t("createVault.wizard.skipDepositHint")
            : deposited.join(" · ")}
        </p>
      </div>

      <div className="mb-5 flex w-fit overflow-hidden rounded-lg border border-tile-line">
        <button type="button" onClick={() => setActiveTab("sol")} className={tabClass(activeTab === "sol")}>
          {t("createVault.wizard.depositSol")}
        </button>
        <span aria-hidden="true" className="w-px bg-tile-line" />
        <button
          type="button"
          onClick={() => setActiveTab("tokens")}
          className={tabClass(activeTab === "tokens")}
        >
          {t("createVault.wizard.depositTokens")}
        </button>
      </div>

      {activeTab === "sol" && (
        <div className="space-y-3">
          <input
            type="number"
            min={0}
            max={solBalance}
            step={1 / Math.pow(10, Math.min(6, SOL_DECIMALS))}
            value={solAmount || ""}
            onChange={(e) => setSolAmount(Math.max(0, Number(e.target.value)))}
            placeholder="0"
            aria-label={t("createVault.wizard.solAmountAria")}
            className="ed-input text-center font-display text-2xl font-semibold tabular-nums"
          />
          <PercentRow
            disabled={!isConnected || solBalance <= 0}
            onPick={setSolByPercent}
          />
          {/* Labelled Clear, not Skip: the footer button is already the skip,
              and two controls called Skip that do different things is a trap. */}
          {solAmount > 0 && (
            <button
              type="button"
              onClick={() => setSolAmount(0)}
              className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
            >
              {t("createVault.wizard.clear")}
            </button>
          )}
          {isConnected && (
            <p className="text-[11px] font-medium text-muted-foreground">
              {t("createVault.wizard.balance")}{" "}
              {solLoading
                ? "…"
                : `${solBalance.toLocaleString(undefined, {
                    maximumFractionDigits: Math.min(6, SOL_DECIMALS),
                  })} SOL`}{" "}
              {t("createVault.wizard.keepLittle")}
            </p>
          )}
        </div>
      )}

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
              className="flex shrink-0 items-center gap-1 rounded-lg border border-tile-line px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] hover:bg-tile-soft"
            >
              {t("createVault.wizard.sort")}{" "}
              {tokenSort === "balance" ? t("createVault.wizard.bal") : t("createVault.wizard.name")}
              <ChevronDown className="h-3 w-3" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setHideDust((v) => !v)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                hideDust
                  ? "border-foreground bg-foreground text-background"
                  : "border-tile-line hover:bg-tile-soft",
              )}
            >
              {t("createVault.wizard.hideSmall")}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("createVault.wizard.showingOf", { shown: displayTokens.length, total: filteredTokens.length })}
            {hideDust && t("createVault.wizard.dustUnderHidden")}
          </p>

          <div
            className={cn(
              "overflow-y-auto rounded-lg border border-tile-line",
              showAllTokens ? "max-h-[600px]" : "max-h-96",
            )}
          >
            {displayTokens.length === 0 && (
              <p className="px-5 py-6 text-center text-sm font-medium text-muted-foreground">
                {t("createVault.wizard.noTokensMatch")} "{tokenSearch}".
              </p>
            )}
            {displayTokens.map((tok) => {
              const sel = tokenSelections[tok.mint];
              const isSelected = tok.mint in tokenSelections;

              return (
                <div
                  key={tok.mint}
                  className={cn(
                    "border-b border-tile-line last:border-b-0",
                    isSelected && "bg-tile-soft",
                  )}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <TokenAvatar
                      image={tok.image}
                      label={tok.label}
                      size="md"
                      accent={isSelected ? "bg-foreground" : "bg-accent-cyan"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">{tok.label}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tok.name && tok.name !== tok.label
                          ? tok.name
                          : `${tok.mint.slice(0, 8)}…${tok.mint.slice(-4)}`}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatUiAmount(tok.uiAmount)}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleToken(tok.mint)}
                      className={cn(
                        // Fixed width so the row does not reflow when the label
                        // collapses to a tick on select.
                        "grid h-7 w-[4.5rem] shrink-0 place-items-center rounded-lg border text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                        isSelected
                          ? "border-foreground bg-foreground text-background"
                          : "border-tile-line hover:bg-background",
                      )}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : t("createVault.wizard.select")}
                    </button>
                  </div>

                  {isSelected && sel && (
                    <div className="px-4 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="ed-field-label shrink-0">{t("createVault.wizard.amountPlain")}</span>
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          max={tok.uiAmount}
                          step={1 / Math.pow(10, Math.min(6, tok.decimals))}
                          value={sel.amount || ""}
                          placeholder="0"
                          aria-label={t("createVault.wizard.tokenAmountAria", { label: tok.label })}
                          onChange={(e) => updateTokenAmount(tok.mint, e.target.value)}
                          className="ed-input min-w-0 flex-1 py-2 text-center text-sm tabular-nums"
                        />
                        <PercentRow
                          size="sm"
                          selected={sel.pct || undefined}
                          onPick={(p) => setTokenByPercent(tok.mint, p)}
                        />
                      </div>
                      {sel.amount <= 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t("createVault.wizard.enterAmountHint")}
                        </p>
                      )}
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
                  className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
                >
                  {showAllTokens
                    ? t("createVault.wizard.showLess")
                    : t("createVault.wizard.showAll", { count: filteredTokens.length })}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tokensLoading && (
        <div className="mt-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          {t("createVault.wizard.scanning")}
        </div>
      )}

      {!tokensLoading && (tokens ?? []).length === 0 && (
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          {t("createVault.wizard.noSplTokens")}
        </p>
      )}
    </div>
  );
};

export default DepositStep;
