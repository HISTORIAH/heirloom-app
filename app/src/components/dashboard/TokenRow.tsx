import { cn, formatTokenAmount, formatUsd, getTokenAccent } from "@/lib/utils";
import { useDominantColor } from "@/hooks/useDominantColor";
import TokenAvatar from "@/components/TokenAvatar";
import { InlineTokenYield } from "@/components/dashboard/InlineTokenYield";
import type { VaultTokenHolding } from "@/types";
import type { LuloStrategy, StrategyProgressStep } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

interface TokenMeta {
  symbol?: string;
  name?: string;
  image?: string;
}

interface TokenRowProps {
  vt: VaultTokenHolding;
  meta: TokenMeta | undefined;
  /** USD value of the holding; undefined when the token has no price. */
  usdValue?: number;
  /** Fraction of the estate's priced value this holding makes up, for the allocation bar. */
  share?: number;
  showYieldStaking: boolean;
  luloStrategy: LuloStrategy | null;
  onEnableYield: () => void;
  onRecallYield: () => void;
  yieldLoading: boolean;
  yieldProgressStep: StrategyProgressStep;
}

const TokenRow: React.FC<TokenRowProps> = ({
  vt,
  meta,
  usdValue,
  share,
  showYieldStaking,
  luloStrategy,
  onEnableYield,
  onRecallYield,
  yieldLoading,
  yieldProgressStep,
}) => {
  const { t } = useTranslation("app");
  const symbol = meta?.symbol;
  const name = meta?.name;
  const shortMint = `${vt.mint.slice(0, 4)}…${vt.mint.slice(-4)}`;
  const isNft = vt.decimals === 0 && vt.rawAmount === 1n;
  const primary = name || symbol || shortMint;
  const secondary = isNft
    ? t("addAsset.nftTag")
    : symbol && symbol !== primary
      ? symbol
      : shortMint;
  const isYieldActive = luloStrategy?.mint === vt.mint && luloStrategy.active;

  const fallbackAccent = getTokenAccent(vt.mint);
  const dominantColor = useDominantColor(meta?.image, fallbackAccent.shadow);
  const accentColor = meta?.image ? dominantColor : fallbackAccent.shadow;

  return (
    <div
      className="rounded-xl border border-tile-line px-4 py-3.5"
      style={isYieldActive ? { boxShadow: `inset 3px 0 0 0 ${accentColor}` } : undefined}
    >
      <div className="flex items-center gap-3.5">
        <TokenAvatar
          image={meta?.image}
          label={primary}
          size="md"
          accent={fallbackAccent.bg}
          shape={isNft ? "square" : "round"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold leading-tight">{primary}</p>
            {isYieldActive && (
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                style={{ backgroundColor: accentColor }}
              >
                {t("dashboard.apyBadge", { apy: luloStrategy.apy.toFixed(1) })}
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-0.5 truncate text-[13px] text-muted-foreground",
              secondary === shortMint && "font-mono",
            )}
          >
            {secondary}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-bold leading-tight tabular-nums">
            {formatTokenAmount(vt.rawAmount, vt.decimals)}
          </p>
          <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">
            {usdValue !== undefined ? formatUsd(usdValue) : t("addAsset.noPrice")}
          </p>
        </div>
        {showYieldStaking && (
          <InlineTokenYield
            mint={vt.mint}
            symbol={symbol || t("dashboard.tokensFallback")}
            decimals={vt.decimals}
            vaultBalance={Number(vt.rawAmount) / 10 ** vt.decimals}
            strategy={isYieldActive ? luloStrategy : null}
            onEnable={onEnableYield}
            onRecall={onRecallYield}
            loading={yieldLoading}
            progressStep={yieldProgressStep}
          />
        )}
      </div>

      {share !== undefined && (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tile-soft">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(share * 100, 1)}%`, backgroundColor: accentColor }}
            />
          </div>
          <span className="w-24 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {t("dashboard.ofEstate", { pct: (share * 100).toFixed(share < 0.01 ? 2 : 0) })}
          </span>
        </div>
      )}
    </div>
  );
};

export default TokenRow;
