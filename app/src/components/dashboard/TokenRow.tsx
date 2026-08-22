import { cn, formatTokenAmount, getTokenAccent } from "@/lib/utils";
import { useDominantColor } from "@/hooks/useDominantColor";
import TokenAvatar from "@/components/TokenAvatar";
import { InlineTokenYield } from "@/components/dashboard/InlineTokenYield";
import { TopUpDialog } from "@/components/dashboard/TopUpDialog";
import { TrendingUp } from "lucide-react";
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
      className="neo-card-static flex items-center gap-4 py-4 px-4"
      // style={
      //   isYieldActive
      //     ? { boxShadow: `6px 6px 0 0 ${accentColor}`, borderLeft: `4px solid ${accentColor}` }
      //     : undefined
      // }
      style={
        isYieldActive
          ? { boxShadow: "none", borderLeft: `4px solid ${accentColor}` }
          : { boxShadow: "none" }
      }
    >
      <TokenAvatar image={meta?.image} label={primary} size="md" accent={fallbackAccent.bg} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-base leading-tight truncate">{primary}</p>
          {isYieldActive && (
            <span
              className="neo-badge !py-0 !px-1.5 text-[10px]"
              style={{ backgroundColor: accentColor }}
            >
              {luloStrategy.apy.toFixed(1)}% APY
            </span>
          )}
        </div>
        {secondary && (
          <p className="text-xs font-bold text-muted-foreground truncate mt-0.5">{secondary}</p>
        )}
      </div>
      <span className="font-bold text-lg tabular-nums shrink-0 mr-2">
        {formatTokenAmount(vt.rawAmount, vt.decimals)}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {showYieldStaking && (
          <InlineTokenYield
            mint={vt.mint}
            symbol={symbol || "tokens"}
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
          className={cn(
            "rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all duration-150 ease-out flex items-center gap-1 shrink-0 border-4 border-foreground bg-transparent hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_hsl(var(--foreground))] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
          )}
        >
          <TrendingUp className="h-3 w-3" /> {t("yield.add")}
        </button>
      </div>

      <TopUpDialog
        open={topUpOpen}
        symbol={symbol || "tokens"}
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
