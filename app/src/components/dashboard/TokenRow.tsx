import { cn, formatTokenAmount, getTokenAccent } from "@/lib/utils";
import { useDominantColor } from "@/hooks/useDominantColor";
import TokenAvatar from "@/components/TokenAvatar";
import { InlineTokenYield } from "@/components/dashboard/InlineTokenYield";
import { TopUpDialog } from "@/components/dashboard/TopUpDialog";
import { Plus } from "lucide-react";
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
  walletBalance: number;
  showYieldStaking: boolean;
  luloStrategy: LuloStrategy | null;
  onEnableYield: () => void;
  onRecallYield: () => void;
  yieldLoading: boolean;
  yieldProgressStep: StrategyProgressStep;
  topUpOpen: boolean;
  onTopUpOpen: () => void;
  onTopUpCancel: () => void;
  onTopUpConfirm: (amount: number) => void;
  topUpLoading: boolean;
}

const TokenRow: React.FC<TokenRowProps> = ({
  vt,
  meta,
  walletBalance,
  showYieldStaking,
  luloStrategy,
  onEnableYield,
  onRecallYield,
  yieldLoading,
  yieldProgressStep,
  topUpOpen,
  onTopUpOpen,
  onTopUpCancel,
  onTopUpConfirm,
  topUpLoading,
}) => {
  const { t } = useTranslation("app");
  const symbol = meta?.symbol;
  const name = meta?.name;
  const shortMint = `${vt.mint.slice(0, 4)}…${vt.mint.slice(-4)}`;
  const primary = symbol || name || shortMint;
  const secondary = name && name !== primary ? name : symbol ? shortMint : null;
  const isYieldActive = luloStrategy?.mint === vt.mint && luloStrategy.active;

  const fallbackAccent = getTokenAccent(vt.mint);
  const dominantColor = useDominantColor(meta?.image, fallbackAccent.shadow);
  const accentColor = meta?.image ? dominantColor : fallbackAccent.shadow;

  return (
    <div
      className={cn("flex items-center gap-4 py-3.5", isYieldActive && "pl-3")}
      style={isYieldActive ? { boxShadow: `inset 3px 0 0 0 ${accentColor}` } : undefined}
    >
      <TokenAvatar image={meta?.image} label={primary} size="md" accent={fallbackAccent.bg} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold leading-tight">{primary}</p>
          {isYieldActive && (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
              style={{ backgroundColor: accentColor }}
            >
              {t("dashboard.apyBadge", { apy: luloStrategy.apy.toFixed(1) })}
            </span>
          )}
        </div>
        {secondary && (
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{secondary}</p>
        )}
      </div>
      <span className="mr-2 shrink-0 font-semibold tabular-nums">
        {formatTokenAmount(vt.rawAmount, vt.decimals)}
      </span>
      <div className="flex items-center gap-2 shrink-0">
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
        <button
          onClick={onTopUpOpen}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-foreground px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-foreground hover:text-background"
        >
          <Plus className="h-3 w-3" /> {t("yield.add")}
        </button>
      </div>

      <TopUpDialog
        open={topUpOpen}
        symbol={symbol || t("dashboard.tokensFallback")}
        decimals={vt.decimals}
        vaultBalance={Number(vt.rawAmount) / 10 ** vt.decimals}
        walletBalance={walletBalance}
        onConfirm={onTopUpConfirm}
        onCancel={onTopUpCancel}
        loading={topUpLoading}
      />
    </div>
  );
};

export default TokenRow;
