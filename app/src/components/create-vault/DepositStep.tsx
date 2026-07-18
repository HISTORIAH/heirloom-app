import { useMemo, useState } from "react";
import TokenAvatar from "@/components/TokenAvatar";
import { SOL_DECIMALS, SOL_LABEL } from "@/lib/constants";
import { formatUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import {
  CircleDollarSign,
  Loader2,
  X,
  Search,
  ChevronDown,
} from "lucide-react";
import type { TokenSelection } from "@/pages/CreateVault";

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
  const [activeTab, setActiveTab] = useState<"sol" | "tokens">("sol");
  const [tokenSearch, setTokenSearch] = useState("");
  const [tokenSort, setTokenSort] = useState<"balance" | "name">("balance");
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [hideDust, setHideDust] = useState(true);

  const selectedTokenEntries = useMemo(
    () => Object.entries(tokenSelections).filter(([, v]) => v.amount > 0),
    [tokenSelections]
  );

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

  const removeSol = () => setSolAmount(0);
  const removeToken = (mint: string) => {
    setTokenSelections((prev) => {
      const next = { ...prev };
      delete next[mint];
      return next;
    });
  };

  return (
    <div>
      {/* Step header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="bg-accent-orange border-4 border-foreground rounded-xl p-3.5 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
          <CircleDollarSign className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[3px] text-accent-orange">STEP 2</div>
          <h3 className="text-2xl font-display">What are you protecting?</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2.5 mb-5">
        <button
          onClick={() => setActiveTab("sol")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest border-4 border-foreground transition-all duration-150 ${
            activeTab === "sol"
              ? "bg-accent-orange shadow-[4px_4px_0_0_hsl(var(--foreground))]"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          DEPOSIT SOL
        </button>
        <button
          onClick={() => setActiveTab("tokens")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest border-4 border-foreground transition-all duration-150 ${
            activeTab === "tokens"
              ? "bg-accent-orange shadow-[4px_4px_0_0_hsl(var(--foreground))]"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          DEPOSIT TOKENS
        </button>
      </div>

      {/* SOL Tab */}
      {activeTab === "sol" && (
        <div className="space-y-4">
          <input
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
            className="w-full border-4 border-foreground rounded-xl px-5 py-6 bg-background font-bold text-3xl text-center transition-all duration-150 shadow-[4px_4px_0_0_hsl(var(--foreground))] focus:shadow-[6px_6px_0_0_hsl(var(--foreground))] focus:-translate-x-0.5 focus:-translate-y-0.5 focus:outline-none"
          />
          <div className="flex gap-2.5 flex-wrap">
            <button
              onClick={() => setSolAmount(0)}
              className={`border-4 border-foreground rounded-xl px-4 py-2 text-sm font-bold transition-all duration-150 ${
                solAmount <= 0
                  ? "bg-accent-pink shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                  : "bg-secondary hover:bg-accent-pink/40"
              }`}
            >
              Skip
            </button>
            {[25, 50, 75].map((pct) => (
              <button
                key={pct}
                onClick={() => setSolByPercent(pct)}
                disabled={!isConnected || solBalance <= 0}
                className="border-4 border-foreground rounded-xl px-4 py-2 text-sm font-bold bg-secondary hover:bg-accent-pink/40 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pct}%
              </button>
            ))}
            <button
              onClick={() => setSolByPercent(100)}
              disabled={!isConnected || solBalance <= 0}
              className="border-4 border-foreground rounded-xl px-4 py-2 text-sm font-bold bg-accent-lime transition-all duration-150 shadow-[3px_3px_0_0_hsl(var(--foreground))] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Max
            </button>
          </div>
          {isConnected && (
            <p className="text-sm font-medium text-muted-foreground">
              Balance:{" "}
              {solLoading
                ? "…"
                : `${solBalance.toLocaleString(undefined, {
                    maximumFractionDigits: Math.min(6, SOL_DECIMALS),
                  })} SOL`}
              {" · keep a little for future check-in transactions"}
            </p>
          )}
        </div>
      )}

      {/* Tokens Tab */}
      {activeTab === "tokens" && (
        <div className="space-y-3">
          {/* Search + filters */}
          <div className="flex gap-2.5 mb-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                strokeWidth={2.5}
              />
              <input
                type="text"
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value)}
                placeholder="Search tokens…"
                aria-label="Search tokens"
                className="w-full border-4 border-foreground rounded-xl pl-10 pr-4 py-3 bg-background font-bold text-sm transition-all duration-150 shadow-[4px_4px_0_0_hsl(var(--foreground))] focus:shadow-[6px_6px_0_0_hsl(var(--foreground))] focus:-translate-x-0.5 focus:-translate-y-0.5 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setTokenSort((s) => (s === "balance" ? "name" : "balance"))}
              className="border-4 border-foreground rounded-xl px-3 py-2 text-xs font-bold uppercase bg-background hover:bg-secondary transition-colors flex items-center gap-1 shrink-0"
            >
              SORT: {tokenSort === "balance" ? "Bal" : "Name"}
              <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setHideDust((v) => !v)}
              className={`border-4 border-foreground rounded-xl px-3 py-2 text-xs font-bold uppercase transition-colors flex items-center gap-1 shrink-0 ${
                hideDust
                  ? "bg-accent-lime text-foreground"
                  : "bg-background hover:bg-secondary"
              }`}
            >
              HIDE DUST
              {hideDust && <span>✓</span>}
            </button>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Showing {displayTokens.length} of {filteredTokens.length} tokens
            {hideDust && " (dust hidden)"}
          </p>

          {/* Token list */}
          <div className={`overflow-y-auto ${showAllTokens ? "max-h-[600px]" : "max-h-72"} border-4 border-foreground rounded-xl`}>
            {displayTokens.length === 0 && (
              <p className="text-sm font-medium text-muted-foreground px-5 py-6 text-center">
                No tokens match &ldquo;{tokenSearch}&rdquo;.
              </p>
            )}
            {displayTokens.map((t) => {
              const isSelected = tokenSelections[t.mint]?.amount > 0;

              return (
                <div
                  key={t.mint}
                  className={`flex items-center gap-3 px-4 py-3 border-b-2 border-foreground/5 transition-all duration-150 ${
                    isSelected ? "bg-[#F7FEE7]" : "hover:bg-accent-cyan/10"
                  }`}
                >
                  <TokenAvatar
                    image={t.image}
                    label={t.label}
                    size="md"
                    accent={isSelected ? "bg-accent-lime" : "bg-accent-cyan"}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight truncate">
                      {t.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.name && t.name !== t.label
                        ? t.name
                        : `${t.mint.slice(0, 8)}…${t.mint.slice(-4)}`}
                    </p>
                  </div>
                  <p className="font-bold text-sm tabular-nums shrink-0">
                    {formatUiAmount(t.uiAmount)}
                  </p>
                  <button
                    onClick={() => toggleToken(t.mint)}
                    className={`border-4 border-foreground rounded-full px-4 py-1.5 text-xs font-bold transition-all shrink-0 ${
                      isSelected
                        ? "bg-accent-lime shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                        : "bg-secondary hover:bg-accent-lime/60"
                    }`}
                  >
                    {isSelected ? "✓" : "Select"}
                  </button>
                </div>
              );
            })}

            {/* Show all / Show less */}
            {hasMoreTokens && (
              <div className="p-2 bg-secondary/40 border-t-4 border-foreground text-center">
                <button
                  onClick={() => setShowAllTokens((v) => !v)}
                  className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAllTokens
                    ? `← Show Less`
                    : `Show All ${filteredTokens.length} Tokens →`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected chip tray */}
      <div className="mt-5 border-4 border-foreground rounded-xl bg-[#F7FEE7] p-4">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground mb-2.5">
          SELECTED
        </div>
        {solAmount <= 0 && selectedTokenEntries.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Deposit SOL above or pick tokens.
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {solAmount > 0 && (
              <span className="inline-flex items-center gap-2 border-4 border-foreground rounded-full px-3.5 py-1.5 text-xs font-bold bg-accent-cyan shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                SOL: {solAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                <button
                  onClick={removeSol}
                  className="hover:text-accent-pink transition-colors"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              </span>
            )}
            {selectedTokenEntries.map(([mint, sel]) => {
              const tok = (tokens ?? []).find((t) => t.mint === mint);
              const label = tok?.symbol || tok?.label || `${mint.slice(0, 4)}…${mint.slice(-4)}`;
              return (
                <span
                  key={mint}
                  className="inline-flex items-center gap-2 border-4 border-foreground rounded-full px-3.5 py-1.5 text-xs font-bold bg-accent-yellow shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                >
                  {label}: {formatUiAmount(sel.amount)}
                  <button
                    onClick={() => removeToken(mint)}
                    className="hover:text-accent-pink transition-colors"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {tokensLoading && (
        <div className="flex items-center gap-2 mt-3">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          <span className="text-sm font-medium">Scanning wallet for SPL tokens…</span>
        </div>
      )}

      {!tokensLoading && (tokens ?? []).length === 0 && (
        <p className="text-sm font-medium text-muted-foreground mt-3">
          No SPL tokens with balance found in your wallet.
        </p>
      )}
    </div>
  );
};

export default DepositStep;
