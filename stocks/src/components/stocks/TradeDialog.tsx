import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Address } from "@solana/kit";
import type { UiWalletAccount } from "@wallet-standard/ui";
import { useTranslation } from "@heirloom/i18n";
import { AssetBadge } from "@/components/stocks/AssetBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IS_MAINNET } from "@/config";
import { toast } from "@/hooks/use-toast";
import { canSignMainnet, useMainnetSwap, useSwapQuote } from "@/hooks/useJupiter";
import { useNow } from "@/hooks/useStocks";
import { formatNumber, formatPercent, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CatalogEntry } from "@/services/catalog";
import {
  jupiterSwapUrl,
  mainnetTxUrl,
  multiplierAt,
  QUOTE_TOKENS,
  toDisplayAmount,
  toRawAmount,
  type MainnetHoldings,
  type QuoteSymbol,
  type TokenPrice,
} from "@/services/jupiter";
import { isUserRejection } from "@/services/tx";

type Side = "buy" | "sell";

/** Left in the wallet when spending "max" SOL, so it can still pay for the next transaction. */
const SOL_RESERVE = 10_000_000n;

/** Waits for typing to settle before asking for a quote. */
function useSettled<T>(value: T, ms = 400): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}

/**
 * Buys or sells one stock on mainnet through Jupiter. It is a real trade with
 * real funds, independent of the stocks program and of whichever cluster the
 * rest of the app reads, so it says so rather than blending in.
 */
export const TradeDialog: React.FC<{
  entry: CatalogEntry | null;
  price: TokenPrice | null;
  holdings: MainnetHoldings | null;
  account: UiWalletAccount | null;
  onConnect?: () => void;
  onOpenChange: (open: boolean) => void;
}> = ({ entry, onOpenChange, ...rest }) => (
  <Dialog open={entry !== null} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md rounded-xl border-tile-line p-6 sm:rounded-xl">
      {/* Keyed so each stock opens on a clean form. */}
      {entry && (
        <TradeForm key={entry.mint} entry={entry} onDone={() => onOpenChange(false)} {...rest} />
      )}
    </DialogContent>
  </Dialog>
);

function TradeForm({
  entry,
  price,
  holdings,
  account,
  onConnect,
  onDone,
}: {
  entry: CatalogEntry;
  price: TokenPrice | null;
  holdings: MainnetHoldings | null;
  account: UiWalletAccount | null;
  onConnect?: () => void;
  onDone: () => void;
}) {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const now = useNow();
  const [side, setSide] = useState<Side>("buy");
  const [quoteSymbol, setQuoteSymbol] = useState<QuoteSymbol>("USDC");
  const [text, setText] = useState("");
  // Max sets an exact raw amount, since a round trip through display units is lossy.
  const [exact, setExact] = useState<bigint | null>(null);

  const quoteToken = QUOTE_TOKENS[quoteSymbol];
  const multiplier = multiplierAt(price?.scaled ?? null, now);
  const stockBalance = holdings?.tokens.get(entry.mint) ?? null;
  const stockDecimals = price?.decimals ?? stockBalance?.decimals ?? null;

  const inputMint = side === "buy" ? quoteToken.mint : entry.mint;
  const outputMint = side === "buy" ? entry.mint : quoteToken.mint;
  const inputSymbol = side === "buy" ? quoteSymbol : entry.symbol;
  const outputSymbol = side === "buy" ? entry.symbol : quoteSymbol;

  // What the wallet can spend of the input token, in raw units; null with no wallet.
  const spendable = (() => {
    if (!holdings) return null;
    if (side === "sell") return stockBalance?.sellable ?? 0n;
    if (quoteSymbol === "SOL") {
      const sol = holdings.sol.raw - SOL_RESERVE;
      return sol > 0n ? sol : 0n;
    }
    return holdings.tokens.get(quoteToken.mint)?.sellable ?? 0n;
  })();
  const inputDecimals = side === "buy" ? quoteToken.decimals : stockDecimals;
  const inputMultiplier = side === "buy" ? 1 : multiplier;

  const amount =
    exact ?? (inputDecimals === null ? null : toRawAmount(text, inputDecimals, inputMultiplier));
  const settledAmount = useSettled(amount);
  const quote = useSwapQuote({ inputMint, outputMint, amount: settledAmount, enabled: true });
  const tooMuch = amount !== null && spendable !== null && amount > spendable;

  const reset = (next: () => void) => {
    next();
    setText("");
    setExact(null);
  };

  const received = quote.data
    ? side === "buy"
      ? stockDecimals === null
        ? null
        : toDisplayAmount(quote.data.outAmount, stockDecimals, multiplier)
      : toDisplayAmount(quote.data.outAmount, quoteToken.decimals)
    : null;
  const quoteIsCurrent = quote.data !== undefined && settledAmount === amount;

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader className="gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("trade.cap")}
        </span>
        <DialogTitle className="ed-h3">{t("trade.title", { symbol: entry.symbol })}</DialogTitle>
      </DialogHeader>

      <div className="flex items-center justify-between gap-3">
        <AssetBadge mint={{ mint: entry.mint, name: null, symbol: null }} catalog={entry} />
        {price?.usd != null && (
          <p className="text-right font-semibold tabular-nums">{formatUsd(price.usd, locale)}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t("trade.sideLabel")}>
        {(["buy", "sell"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={side === s ? "flat" : "flat-outline"}
            aria-pressed={side === s}
            onClick={() => reset(() => setSide(s))}
          >
            {t(`trade.${s}`)}
          </Button>
        ))}
        <span className="mx-1 self-center text-sm text-muted-foreground">
          {side === "buy" ? t("trade.payWith") : t("trade.receiveIn")}
        </span>
        {(Object.keys(QUOTE_TOKENS) as QuoteSymbol[]).map((q) => (
          <Button
            key={q}
            size="sm"
            variant={quoteSymbol === q ? "flat" : "flat-outline"}
            aria-pressed={quoteSymbol === q}
            onClick={() => reset(() => setQuoteSymbol(q))}
          >
            {q}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <label htmlFor="trade-amount" className="ed-field-label block">
          {t(side === "buy" ? "trade.spend" : "trade.sellAmount", { symbol: inputSymbol })}
        </label>
        <div className="flex items-center gap-2">
          <input
            id="trade-amount"
            inputMode="decimal"
            placeholder="0.0"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setExact(null);
            }}
            autoComplete="off"
            className="ed-input w-full"
          />
          <Button
            type="button"
            variant="flat-outline"
            size="sm"
            disabled={!spendable}
            onClick={() => {
              if (!spendable || inputDecimals === null) return;
              setExact(spendable);
              setText(String(toDisplayAmount(spendable, inputDecimals, inputMultiplier)));
            }}
          >
            {t("common.max")}
          </Button>
        </div>
        {spendable !== null && inputDecimals !== null && (
          <p
            className={cn(
              "text-sm",
              tooMuch ? "font-semibold text-accent-red" : "text-muted-foreground",
            )}
          >
            {tooMuch
              ? t("trade.insufficient", { symbol: inputSymbol })
              : t("trade.balance", {
                  amount: formatNumber(
                    toDisplayAmount(spendable, inputDecimals, inputMultiplier),
                    locale,
                    6,
                  ),
                  symbol: inputSymbol,
                })}
          </p>
        )}
      </div>

      <div className="space-y-2 rounded-lg bg-tile-soft p-4" aria-live="polite">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground">{t("trade.youReceive")}</span>
          <span className="font-semibold tabular-nums">
            {amount === null
              ? "—"
              : quote.isFetching && !quoteIsCurrent
                ? t("trade.quoting")
                : received !== null
                  ? `${formatNumber(received, locale, 6)} ${outputSymbol}`
                  : "—"}
          </span>
        </div>
        {quote.isError && amount !== null && (
          <p className="text-sm font-semibold text-accent-red">
            {quote.error.message || t("trade.quoteFailed")}
          </p>
        )}
        {quote.data && amount !== null && (
          <dl className="space-y-1 text-sm text-muted-foreground">
            {quote.data.outUsd !== null && (
              <Row label={t("trade.value")} value={`≈ ${formatUsd(quote.data.outUsd, locale)}`} />
            )}
            {quote.data.priceImpact !== null && (
              <Row
                label={t("trade.impact")}
                value={formatPercent(quote.data.priceImpact / 100, locale, true)}
              />
            )}
            {quote.data.feeBps !== null && (
              <Row
                label={t("trade.fee")}
                value={formatPercent(quote.data.feeBps / 10_000, locale)}
              />
            )}
            {quote.data.gasless && <p>{t("trade.gasless")}</p>}
          </dl>
        )}
      </div>

      {/* The dialog's accessible description, so the warning is announced with it. */}
      <DialogDescription className="text-sm text-muted-foreground">
        {t("trade.warning")}
        {!IS_MAINNET && ` ${t("trade.walletNetwork")}`}
      </DialogDescription>

      {!account ? (
        <Button variant="flat-yellow" onClick={onConnect} disabled={!onConnect}>
          {t("trade.connect")}
        </Button>
      ) : !canSignMainnet(account) ? (
        <p className="text-sm font-semibold text-accent-red">{t("trade.cantSign")}</p>
      ) : (
        <SwapButton
          account={account}
          label={t(side === "buy" ? "trade.buyAction" : "trade.sellAction", {
            symbol: entry.symbol,
          })}
          order={
            amount !== null && !tooMuch && quoteIsCurrent && !quote.isError
              ? { inputMint, outputMint, amount }
              : null
          }
          onDone={onDone}
        />
      )}

      <a
        href={jupiterSwapUrl(entry.mint)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 self-start text-sm font-semibold underline"
      >
        {t("trade.openOnJupiter")}
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </div>
  );
}

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-3">
    <dt>{label}</dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
);

/** Rendered only for a wallet that can sign for mainnet; see `canSignMainnet`. */
function SwapButton({
  account,
  label,
  order,
  onDone,
}: {
  account: UiWalletAccount;
  label: string;
  order: { inputMint: Address; outputMint: Address; amount: bigint } | null;
  onDone: () => void;
}) {
  const { t } = useTranslation("stocks");
  const swap = useMainnetSwap(account);
  const [stage, setStage] = useState<"idle" | "signing" | "submitting">("idle");

  const run = async () => {
    if (!order) return;
    setStage("signing");
    try {
      const result = await swap({ ...order, onSigned: () => setStage("submitting") });
      toast({
        title: t("trade.done"),
        description: (
          <a
            href={mainnetTxUrl(result.signature)}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {t("tx.view")}
          </a>
        ),
      });
      onDone();
    } catch (error) {
      console.error(error);
      toast(
        isUserRejection(error)
          ? { title: t("tx.rejected") }
          : {
              variant: "destructive",
              title: t("trade.failed"),
              description: error instanceof Error ? error.message : t("errors.generic"),
            },
      );
    } finally {
      setStage("idle");
    }
  };

  return (
    <Button variant="flat-yellow" disabled={!order || stage !== "idle"} onClick={run}>
      {stage === "signing"
        ? t("tx.signing")
        : stage === "submitting"
          ? t("trade.submitting")
          : label}
    </Button>
  );
}
