import { useMemo, useState } from "react";
import TokenAvatar from "@/components/TokenAvatar";
import { SOL_DECIMALS, SOL_LABEL } from "@/lib/constants";
import { formatUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import { CircleDollarSign, Loader2, Search, ChevronDown, Check } from "lucide-react";
import StepHead from "@/components/create-vault/StepHead";
import { cn } from "@/lib/utils";
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
      list = list.filter((t) => t.uiAmount >= 0.01);
    }

    if (q) {
      list = list.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.name?.toLowerCase().includes(q) ||
          t.symbol?.toLowerCase().includes(q) ||
          t.mint.toLowerCase().includes(q),
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

  const setSolByPercent = (pct: number) => {
    const factorDec = Math.min(SOL_DECIMALS, 9);
    const factor = Math.pow(10, factorDec);
    const v = Math.floor(solBalance * (pct / 100) * factor) / factor;
    setSolAmount(Math.max(0, v));
  };

  const toggleToken = (mint: string) => {
    setTokenSelections((prev) => {
      if (prev[mint]?.amount > 0) {
        const next = { ...prev };
        delete next[mint];
        return next;
      }
      const tok = (tokens ?? []).find((t) => t.mint === mint);
      if (!tok) return prev;
      return {
        ...prev,
        [mint]: { mint, amount: tok.uiAmount, pct: 100 },
      };
    });
  };

  const setTokenByPercent = (mint: string, pct: number) => {
    const tok = (tokens ?? []).find((t) => t.mint === mint);
    if (!tok) return;
    const amount = (tok.uiAmount * pct) / 100;
    setTokenSelections((prev) => ({
      ...prev,
      [mint]: { mint, amount, pct },
    }));
  };

  const updateTokenAmount = (mint: string, value: string) => {
    const tok = (tokens ?? []).find((t) => t.mint === mint);
    if (!tok) return;
    const v = Math.max(0, Math.min(tok.uiAmount, Number(value)));
    const pct = Math.round((v / tok.uiAmount) * 100);
    setTokenSelections((prev) => ({
      ...prev,
      [mint]: { mint, amount: v || 0, pct },
    }));
  };

  return (
    <div>
      <StepHead
        step={t("createVault.wizard.step2")}
        title={t("createVault.wizard.whatProtecting")}
        icon={<CircleDollarSign strokeWidth={2} />}
      />

      <div className="seg">
        <button
          onClick={() => setActiveTab("sol")}
          data-active={activeTab === "sol"}
          className="seg-item"
        >
          {t("createVault.wizard.depositSol")}
        </button>
        <button
          onClick={() => setActiveTab("tokens")}
          data-active={activeTab === "tokens"}
          className="seg-item"
        >
          {t("createVault.wizard.depositTokens")}
        </button>
      </div>

      {/* SOL */}
      {activeTab === "sol" && (
        <div className="mt-6">
          <label className="cap mb-2 block" htmlFor="deposit-sol">
            {SOL_LABEL}
          </label>
          <input
            id="deposit-sol"
            type="number"
            min={0}
            max={solBalance}
            step={1 / Math.pow(10, Math.min(6, SOL_DECIMALS))}
            value={solAmount || ""}
            onChange={(e) => {
              const v = Math.max(0, Number(e.target.value));
              setSolAmount(v);
            }}
            placeholder="0"
            aria-label={`${SOL_LABEL} amount`}
            className="field field-num py-6 text-4xl"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setSolAmount(0)}
              className={cn(
                "rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors",
                solAmount <= 0
                  ? "border-foreground bg-foreground text-background"
                  : "border-tile-line hover:border-foreground/40 hover:bg-tile-soft",
              )}
            >
              {t("createVault.wizard.skip")}
            </button>
            {[25, 50, 75].map((pct) => (
              <button
                key={pct}
                onClick={() => setSolByPercent(pct)}
                disabled={!isConnected || solBalance <= 0}
                className="rounded-lg border border-tile-line px-3.5 py-2 text-xs font-semibold tabular-nums transition-colors hover:border-foreground/40 hover:bg-tile-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pct}%
              </button>
            ))}
            <button
              onClick={() => setSolByPercent(100)}
              disabled={!isConnected || solBalance <= 0}
              className="rounded-lg border border-accent-yellow bg-accent-yellow px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("createVault.wizard.max")}
            </button>
          </div>

          {isConnected && (
            <p className="mt-3 text-xs font-medium text-muted-foreground">
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

      {/* Tokens */}
      {activeTab === "tokens" && (
        <div className="mt-6">
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
                className="field pl-10"
              />
            </div>
            <button
              onClick={() => setTokenSort((s) => (s === "balance" ? "name" : "balance"))}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-tile-line px-3 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:border-foreground hover:bg-tile-soft"
            >
              {t("createVault.wizard.sort")}{" "}
              {tokenSort === "balance" ? t("createVault.wizard.bal") : t("createVault.wizard.name")}
              <ChevronDown className="h-3 w-3" strokeWidth={2} />
            </button>
            <button
              onClick={() => setHideDust((v) => !v)}
              aria-pressed={hideDust}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                hideDust
                  ? "border-foreground bg-foreground text-background"
                  : "border-tile-line hover:border-foreground hover:bg-tile-soft",
              )}
            >
              {t("createVault.wizard.hideDust")}
              {hideDust && <Check className="h-3 w-3" strokeWidth={2.5} />}
            </button>
          </div>

          <p className="mt-2.5 text-xs font-medium text-muted-foreground">
            {t("createVault.wizard.showing", { shown: displayTokens.length, total: filteredTokens.length })}
            {hideDust && ` ${t("createVault.wizard.dustHidden")}`}
          </p>

          <div
            className={cn(
              "mt-3 overflow-y-auto rounded-xl border border-tile-line",
              showAllTokens ? "max-h-[600px]" : "max-h-96",
            )}
          >
            {displayTokens.length === 0 && (
              <p className="px-5 py-8 text-center text-sm font-medium text-muted-foreground">
                {t("createVault.wizard.noTokensMatch")} &ldquo;{tokenSearch}&rdquo;.
              </p>
            )}

            {displayTokens.map((tok) => {
              const isSelected = tokenSelections[tok.mint]?.amount > 0;
              const sel = tokenSelections[tok.mint];

              return (
                <div
                  key={tok.mint}
                  className={cn(
                    "border-b border-tile-line transition-colors last:border-b-0",
                    isSelected ? "bg-tile-soft" : "hover:bg-tile-soft/60",
                  )}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <TokenAvatar image={tok.image} label={tok.label} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">{tok.label}</p>
                      <p className="truncate text-xs font-medium text-muted-foreground">
                        {tok.name && tok.name !== tok.label
                          ? tok.name
                          : `${tok.mint.slice(0, 8)}…${tok.mint.slice(-4)}`}
                      </p>
                    </div>
                    <p className="num shrink-0 text-sm">{formatUiAmount(tok.uiAmount)}</p>
                    <button
                      onClick={() => toggleToken(tok.mint)}
                      className={cn(
                        "shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                        isSelected
                          ? "border-foreground bg-foreground text-background"
                          : "border-tile-line bg-background hover:border-foreground hover:bg-background",
                      )}
                    >
                      {isSelected ? <Check className="h-3 w-3" strokeWidth={2.5} /> : t("createVault.wizard.select")}
                    </button>
                  </div>

                  {isSelected && (
                    <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
                      <span className="cap shrink-0">{t("createVault.wizard.amount")}</span>
                      <input
                        type="number"
                        min={0}
                        max={tok.uiAmount}
                        step={1 / Math.pow(10, Math.min(6, tok.decimals))}
                        value={sel.amount}
                        onChange={(e) => updateTokenAmount(tok.mint, e.target.value)}
                        aria-label={`${tok.label} ${t("createVault.wizard.amount")}`}
                        className="field min-w-0 flex-1 px-3 py-1.5 text-center text-sm tabular-nums"
                      />
                      <div className="flex shrink-0 gap-1.5">
                        {[25, 50, 75, 100].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => setTokenByPercent(tok.mint, pct)}
                            className={cn(
                              "rounded-md border px-2 py-1 text-[10px] font-bold tabular-nums transition-colors",
                              sel.pct === pct
                                ? "border-foreground bg-foreground text-background"
                                : "border-tile-line bg-background hover:border-foreground/40",
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
              <div className="border-t border-tile-line bg-tile-soft p-2.5 text-center">
                <button
                  onClick={() => setShowAllTokens((v) => !v)}
                  className="cap underline-offset-4 transition-colors hover:text-foreground hover:underline"
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
        <div className="mt-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          <span className="text-sm font-medium">{t("createVault.wizard.scanning")}</span>
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
