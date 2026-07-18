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

interface Props {
  solAmount: number;
  setSolAmount: (n: number) => void;
  tokenAmounts: Record<string, number>;
  setTokenAmounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  tokens: SplTokenAsset[] | undefined;
  tokensLoading: boolean;
  solBalance: number;
  solLoading: boolean;
  isConnected: boolean;
}

const DepositStep: React.FC<Props> = ({
  solAmount,
  setSolAmount,
  tokenAmounts,
  setTokenAmounts,
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
  const [editingMint, setEditingMint] = useState<string | null>(null);

  const setTokenAmount = (mint: string, val: number) => {
    setTokenAmounts((prev) => ({ ...prev, [mint]: val }));
  };
  const removeToken = (mint: string) => {
    setTokenAmounts((prev) => {
      const next = { ...prev };
      delete next[mint];
      return next;
    });
    if (editingMint === mint) setEditingMint(null);
  };

  const selectedTokenEntries = Object.entries(tokenAmounts).filter(([, v]) => v > 0);

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

  const setTokenByPercent = (mint: string, pct: number) => {
    const tok = (tokens ?? []).find((t) => t.mint === mint);
    if (!tok) return;
    const target = tok.uiAmount * (pct / 100);
    const factorDec = Math.min(tok.decimals, 9);
    const factor = Math.pow(10, factorDec);
    const v = Math.min(tok.uiAmount, Math.floor(target * factor) / factor);
    if (v <= 0) removeToken(mint);
    else setTokenAmount(mint, v);
  };

  const startEditingToken = (mint: string) => {
    setEditingMint(mint);
    // Pre-fill with max if not already set
    const current = tokenAmounts[mint] ?? 0;
    if (current === 0) {
      setTokenByPercent(mint, 100);
    }
  };

  return (
    <div className="neo-card-static p-8" style={{ boxShadow: "12px 12px 0 0 hsl(var(--accent-orange))" }}>
      {/* Step header inside the card */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="bg-accent-orange neo-border rounded-xl p-3"
          style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}
        >
          <CircleDollarSign className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-accent-orange">
            Step 2
          </span>
          <h3 className="text-xl font-semibold font-body">What are you protecting?</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab("sol")}
          className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest transition-all duration-150 ${
            activeTab === "sol"
              ? "bg-accent-pink neo-border"
              : "neo-border bg-secondary hover:bg-secondary/80"
          }`}
          style={activeTab === "sol" ? { boxShadow: "4px 4px 0 0 hsl(var(--foreground))" } : {}}
        >
          Deposit SOL
        </button>
        <button
          onClick={() => setActiveTab("tokens")}
          className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest transition-all duration-150 ${
            activeTab === "tokens"
              ? "bg-accent-pink neo-border"
              : "neo-border bg-secondary hover:bg-secondary/80"
          }`}
          style={activeTab === "tokens" ? { boxShadow: "4px 4px 0 0 hsl(var(--foreground))" } : {}}
        >
          Deposit Tokens
        </button>
      </div>

      {/* SOL Tab */}
      {activeTab === "sol" && (
        <div className="space-y-3">
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
            className="neo-input font-bold text-3xl text-center !py-4"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSolAmount(0)}
              className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 ${
                solAmount <= 0
                  ? "bg-accent-pink"
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
                className="neo-border rounded-lg px-3 py-1 text-sm font-bold bg-secondary hover:bg-accent-pink/40 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pct}%
              </button>
            ))}
            <button
              onClick={() => setSolByPercent(100)}
              disabled={!isConnected || solBalance <= 0}
              className="neo-border rounded-lg px-3 py-1 text-sm font-bold bg-accent-pink transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}
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
            </p>
          )}
        </div>
      )}

      {/* Tokens Tab */}
      {activeTab === "tokens" && (
        <div className="space-y-3">
          {/* Token list container */}
          <div className="neo-border rounded-xl overflow-hidden">
            {/* Search + filters */}
            <div className="p-3 bg-secondary/40 border-b-4 border-foreground">
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                    strokeWidth={2.5}
                  />
                  <input
                    type="text"
                    value={tokenSearch}
                    onChange={(e) => setTokenSearch(e.target.value)}
                    placeholder="Search tokens..."
                    aria-label="Search tokens"
                    className="neo-input !pl-9 !py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() =>
                    setTokenSort((s) => (s === "balance" ? "name" : "balance"))
                  }
                  className="neo-border rounded-lg px-2 py-2 text-xs font-bold uppercase bg-background hover:bg-secondary transition-colors flex items-center gap-1 shrink-0"
                >
                  Sort: {tokenSort === "balance" ? "Bal" : "Name"}
                  <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setHideDust((v) => !v)}
                  className={`neo-border rounded-lg px-2 py-2 text-xs font-bold uppercase transition-colors flex items-center gap-1 shrink-0 ${
                    hideDust
                      ? "bg-accent-lime text-foreground"
                      : "bg-background hover:bg-secondary"
                  }`}
                >
                  Hide dust
                  {hideDust && <span>✓</span>}
                </button>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Showing {displayTokens.length} of {filteredTokens.length} tokens
                {hideDust && " (dust hidden)"}
              </p>
            </div>

            {/* Token list */}
            <div className={`overflow-y-auto ${showAllTokens ? "max-h-[600px]" : "max-h-64"}`}>
              {displayTokens.length === 0 && (
                <p className="text-sm font-medium text-muted-foreground px-5 py-6 text-center">
                  No tokens match &ldquo;{tokenSearch}&rdquo;.
                </p>
              )}
              {displayTokens.map((t) => {
                const amount = tokenAmounts[t.mint] ?? 0;
                const isActive = amount > 0;
                const isEditing = editingMint === t.mint;
                const dec = Math.min(6, t.decimals);

                return (
                  <div
                    key={t.mint}
                    className={`border-b-2 border-foreground/5 transition-all duration-150 ${
                      isActive ? "bg-accent-lime/15" : "hover:bg-accent-cyan/10"
                    }`}
                  >
                    {/* Token row header */}
                    <div className="flex items-center gap-3 px-3 py-2">
                      <TokenAvatar
                        image={t.image}
                        label={t.label}
                        size="md"
                        accent={isActive ? "bg-accent-lime" : "bg-accent-cyan"}
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
                        onClick={() =>
                          isActive ? setEditingMint(isEditing ? null : t.mint) : startEditingToken(t.mint)
                        }
                        className={`neo-border rounded-lg px-3 py-1 text-xs font-bold transition-colors shrink-0 ${
                          isActive
                            ? "bg-accent-lime hover:bg-accent-lime/80"
                            : "bg-secondary hover:bg-accent-lime"
                        }`}
                      >
                        {isActive ? (isEditing ? "Close" : "Edit") : "Select"}
                      </button>
                    </div>

                    {/* Expanded editor — full width, not inline */}
                    {isEditing && (
                      <div className="px-3 pb-3 pt-1 space-y-3 bg-background/50">
                        <input
                          type="number"
                          min={0}
                          max={t.uiAmount}
                          step={1 / Math.pow(10, dec)}
                          value={amount || ""}
                          onChange={(e) => {
                            const v = Math.max(0, Number(e.target.value));
                            if (v === 0) removeToken(t.mint);
                            else setTokenAmount(t.mint, v);
                          }}
                          placeholder="0"
                          className="neo-input font-bold text-2xl text-center !py-3"
                        />
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => removeToken(t.mint)}
                            className="neo-border rounded-lg px-3 py-1 text-xs font-bold bg-accent-pink hover:opacity-80 transition-all"
                          >
                            Skip / Remove
                          </button>
                          {[25, 50, 75].map((pct) => (
                            <button
                              key={pct}
                              onClick={() => setTokenByPercent(t.mint, pct)}
                              className="neo-border rounded-lg px-3 py-1 text-xs font-bold bg-secondary hover:bg-accent-lime/60 transition-all"
                            >
                              {pct}%
                            </button>
                          ))}
                          <button
                            onClick={() => setTokenByPercent(t.mint, 100)}
                            className="neo-border rounded-lg px-3 py-1 text-xs font-bold bg-accent-lime transition-all"
                            style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}
                          >
                            Max
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Show all / Show less button */}
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

      {/* Selected tokens badge area — only place to remove tokens */}
      {(solAmount > 0 || selectedTokenEntries.length > 0) && (
        <div className="mt-3 p-3 bg-accent-lime/10 neo-border rounded-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Selected
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {solAmount > 0 && (
              <span className="neo-badge bg-accent-cyan !py-1 !px-2 text-xs flex items-center gap-1">
                SOL: {solAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                <button
                  onClick={() => setSolAmount(0)}
                  className="ml-1 hover:text-accent-pink transition-colors"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              </span>
            )}
            {selectedTokenEntries.map(([mint, amt]) => {
              const tok = (tokens ?? []).find((t) => t.mint === mint);
              const label = tok?.label ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`;
              return (
                <span
                  key={mint}
                  className="neo-badge bg-accent-yellow !py-1 !px-2 text-xs flex items-center gap-1"
                >
                  {label}: {formatUiAmount(amt)}
                  <button
                    onClick={() => removeToken(mint)}
                    className="ml-1 hover:text-accent-pink transition-colors"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

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
