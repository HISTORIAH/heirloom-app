import { useMemo, useRef, useState } from "react";
import TokenAvatar from "@/components/TokenAvatar";
import { SOL_DECIMALS, SOL_LABEL } from "@/config/constants";
import { formatUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import {
  Coins,
  Loader2,
  X,
  Search,
  ChevronDown,
  Pencil,
  ArrowUpDown,
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
  const [tokenSearch, setTokenSearch] = useState("");
  const [tokenSort, setTokenSort] = useState<"balance" | "name">("balance");
  const [activeMint, setActiveMint] = useState<string | null>(null);
  const [tokensPanelOpen, setTokensPanelOpen] = useState(true);
  const solSectionRef = useRef<HTMLDivElement | null>(null);

  const setTokenAmount = (mint: string, val: number) => {
    setTokenAmounts((prev) => ({ ...prev, [mint]: val }));
  };
  const removeToken = (mint: string) => {
    setTokenAmounts((prev) => {
      const next = { ...prev };
      delete next[mint];
      return next;
    });
  };

  const selectedTokenEntries = Object.entries(tokenAmounts).filter(([, v]) => v > 0);

  const filteredTokens = useMemo(() => {
    const q = tokenSearch.trim().toLowerCase();
    let list = tokens ?? [];

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
  }, [tokens, tokenSearch, tokenSort]);

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

  const editToken = (mint: string) => {
    setActiveMint(mint);
    setTokensPanelOpen(true);
    setTokenSearch("");
    setTimeout(() => {
      document
        .getElementById(`token-row-${mint}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  const editSol = () => {
    solSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    solSectionRef.current?.querySelector("input")?.focus();
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="neo-badge bg-accent-orange mb-4 inline-block">Step 3</span>
        <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
          Fund your <span className="bg-accent-orange px-2 inline-block rotate-[-1deg]">vault.</span>
        </h2>
        <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
          Deposit SOL and/or multiple SPL tokens into the vault.
        </p>
      </div>

      <div ref={solSectionRef} className="neo-card-static">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-accent-orange neo-border rounded-xl p-3">
            <Coins className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black">{SOL_LABEL}</h3>
            <p className="text-xs font-bold text-muted-foreground">
              Amount in SOL ({SOL_DECIMALS} decimals)
            </p>
          </div>
          {isConnected && (
            <p className="text-sm font-bold text-muted-foreground tabular-nums shrink-0">
              {solLoading
                ? "Bal …"
                : `Bal ${solBalance.toLocaleString(undefined, {
                    maximumFractionDigits: Math.min(6, SOL_DECIMALS),
                  })}`}
            </p>
          )}
        </div>
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
          className="neo-input font-black text-3xl text-center !py-4"
        />
        <div className="flex gap-2 flex-wrap mt-4">
          <button
            onClick={() => setSolAmount(0)}
            className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 ${
              solAmount <= 0
                ? "bg-accent-orange neo-shadow-sm"
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
              className="neo-border rounded-lg px-3 py-1 text-sm font-bold bg-secondary hover:bg-accent-orange/40 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pct}%
            </button>
          ))}
          <button
            onClick={() => setSolByPercent(100)}
            disabled={!isConnected || solBalance <= 0}
            className="neo-border rounded-lg px-3 py-1 text-sm font-bold bg-accent-orange hover:neo-shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Max
          </button>
        </div>
      </div>

      {(solAmount > 0 || selectedTokenEntries.length > 0) && (
        <div className="neo-card-static !p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-widest">
              Selected Deposits
            </h3>
            <span className="neo-badge bg-accent-lime !px-3 !py-0.5 !text-xs">
              {selectedTokenEntries.length + (solAmount > 0 ? 1 : 0)}
            </span>
          </div>
          <ul className="divide-y-2 divide-foreground/10">
            {solAmount > 0 && (
              <li className="flex items-center gap-3 py-2.5">
                <div className="bg-accent-orange neo-border rounded-lg p-1.5 shrink-0">
                  <Coins className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-base truncate">{SOL_LABEL}</p>
                </div>
                <span className="font-black tabular-nums text-base">
                  {solAmount.toLocaleString(undefined, {
                    maximumFractionDigits: Math.min(6, SOL_DECIMALS),
                  })}
                </span>
                <button
                  onClick={editSol}
                  aria-label={`Edit ${SOL_LABEL}`}
                  className="neo-border rounded-lg p-1.5 bg-secondary hover:bg-accent-yellow transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
                <button
                  onClick={() => setSolAmount(0)}
                  aria-label={`Remove ${SOL_LABEL}`}
                  className="neo-border rounded-lg p-1.5 bg-secondary hover:bg-accent-pink transition-colors"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
              </li>
            )}
            {selectedTokenEntries.map(([mint, amt]) => {
              const tok = (tokens ?? []).find((t) => t.mint === mint);
              const tokLabel = tok?.label ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`;
              const tokName = tok?.name;
              const dec = tok?.decimals ?? 9;
              return (
                <li key={mint} className="flex items-center gap-3 py-2.5">
                  <TokenAvatar
                    image={tok?.image}
                    label={tokLabel}
                    accent="bg-accent-cyan"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-base truncate">{tokLabel}</p>
                    {tokName && tokName !== tokLabel && (
                      <p className="text-[11px] font-medium text-muted-foreground truncate">
                        {tokName}
                      </p>
                    )}
                  </div>
                  <span className="font-black tabular-nums text-base">
                    {amt.toLocaleString(undefined, {
                      maximumFractionDigits: Math.min(6, dec),
                    })}
                  </span>
                  <button
                    onClick={() => editToken(mint)}
                    aria-label={`Edit ${tokLabel}`}
                    className="neo-border rounded-lg p-1.5 bg-secondary hover:bg-accent-yellow transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => removeToken(mint)}
                    aria-label={`Remove ${tokLabel}`}
                    className="neo-border rounded-lg p-1.5 bg-secondary hover:bg-accent-pink transition-colors"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tokensLoading && (
        <div className="neo-card-static flex items-center gap-3 !p-5">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
          <span className="font-bold">Scanning wallet for SPL tokens…</span>
        </div>
      )}

      {!tokensLoading && (tokens ?? []).length === 0 && (
        <p className="text-sm font-medium text-muted-foreground">
          No SPL tokens with balance found in your wallet. Funding with {SOL_LABEL}.
        </p>
      )}

      {!tokensLoading && (tokens ?? []).length > 0 && (
        <div className="neo-card-static !p-0 overflow-hidden">
          <button
            onClick={() => setTokensPanelOpen((v) => !v)}
            aria-expanded={tokensPanelOpen}
            aria-controls="spl-token-panel"
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-accent-lime neo-border rounded-lg p-2">
                <Coins className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black leading-tight">SPL Tokens</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  {(tokens ?? []).length} available · {selectedTokenEntries.length} selected
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-5 w-5 transition-transform ${tokensPanelOpen ? "rotate-180" : ""}`}
              strokeWidth={3}
            />
          </button>

          {tokensPanelOpen && (
            <div id="spl-token-panel" className="border-t-4 border-foreground">
              <div className="flex items-center gap-3 p-4 bg-secondary/40 border-b-4 border-foreground">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                    strokeWidth={3}
                  />
                  <input
                    type="text"
                    value={tokenSearch}
                    onChange={(e) => setTokenSearch(e.target.value)}
                    placeholder="Search token or mint…"
                    aria-label="Search tokens"
                    className="neo-input !pl-10 !py-3 text-sm"
                  />
                </div>
                <button
                  onClick={() =>
                    setTokenSort((s) => (s === "balance" ? "name" : "balance"))
                  }
                  aria-label={`Sort by ${tokenSort === "balance" ? "name" : "balance"}`}
                  className="neo-border rounded-lg px-4 py-3 text-xs font-black uppercase tracking-widest bg-background hover:bg-accent-yellow transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={3} />
                  {tokenSort === "balance" ? "Bal" : "Name"}
                </button>
              </div>

              <div
                role="listbox"
                aria-label="SPL tokens"
                className="max-h-[420px] overflow-y-auto divide-y-2 divide-foreground/10"
              >
                {filteredTokens.length === 0 && (
                  <p className="text-sm font-medium text-muted-foreground px-5 py-6 text-center">
                    No tokens match “{tokenSearch}”.
                  </p>
                )}
                {filteredTokens.map((t) => {
                  const amount = tokenAmounts[t.mint] ?? 0;
                  const isActive = amount > 0;
                  const isOpen = activeMint === t.mint;
                  const dec = Math.min(6, t.decimals);
                  return (
                    <div
                      key={t.mint}
                      id={`token-row-${t.mint}`}
                      className={isActive ? "bg-accent-lime/15" : ""}
                    >
                      <button
                        role="option"
                        aria-selected={isActive}
                        aria-expanded={isOpen}
                        onClick={() =>
                          setActiveMint(isOpen ? null : t.mint)
                        }
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent-yellow/30 transition-colors text-left"
                      >
                        <TokenAvatar
                          image={t.image}
                          label={t.label}
                          size="md"
                          accent={isActive ? "bg-accent-lime" : "bg-secondary"}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-lg leading-tight truncate">{t.label}</p>
                          <p className="text-xs font-medium text-muted-foreground truncate mt-0.5">
                            {t.name && t.name !== t.label
                              ? t.name
                              : `${t.mint.slice(0, 8)}…${t.mint.slice(-4)}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {isActive && (
                            <p className="text-xs font-black uppercase tracking-widest text-foreground">
                              {formatUiAmount(amount)}
                            </p>
                          )}
                          <p className="text-sm font-bold text-muted-foreground tabular-nums">
                            {formatUiAmount(t.uiAmount)}
                          </p>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          strokeWidth={3}
                        />
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 space-y-3 bg-background/50">
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
                            aria-label={`${t.label} amount`}
                            className="neo-input font-black text-2xl text-center !py-3"
                          />
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => removeToken(t.mint)}
                              className={`neo-border rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-all duration-150 ${
                                !isActive
                                  ? "bg-accent-pink neo-shadow-sm"
                                  : "bg-secondary hover:bg-accent-pink/40"
                              }`}
                            >
                              Skip
                            </button>
                            {[25, 50, 75].map((pct) => (
                              <button
                                key={pct}
                                onClick={() => setTokenByPercent(t.mint, pct)}
                                className="neo-border rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-widest bg-secondary hover:bg-accent-lime/60 transition-all duration-150"
                              >
                                {pct}%
                              </button>
                            ))}
                            <button
                              onClick={() => setTokenByPercent(t.mint, 100)}
                              className="neo-border rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-widest bg-accent-lime hover:neo-shadow-sm transition-all duration-150"
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DepositStep;
