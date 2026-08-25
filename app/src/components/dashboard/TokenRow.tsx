import { cn, formatTokenAmount, getTokenAccent } from "@/lib/utils";
import { useDominantColor } from "@/hooks/useDominantColor";
import TokenAvatar from "@/components/TokenAvatar";
import { Button } from "@/components/ui/button";
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

/**
 * One holding, set as a ruled row rather than a card: mark, name, figure,
 * controls. A vault with twelve tokens in it should read as a statement, not
 * as twelve boxes.
 */
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
  // The token's own colour is allowed exactly one job: marking the row that is
  // out earning. Everywhere else the page stays black, white and yellow.
  const accentColor = meta?.image ? dominantColor : fallbackAccent.shadow;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-3 border-t border-tile-line py-3.5 first:border-t-0 sm:flex-nowrap",
        isYieldActive && "pl-3",
      )}
      style={isYieldActive ? { borderLeft: `2px solid ${accentColor}` } : undefined}
    >
      <TokenAvatar image={meta?.image} label={primary} size="md" accent={fallbackAccent.bg} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold leading-tight">{primary}</p>
          {isYieldActive && (
            <span
              className="tag shrink-0 border-transparent"
              style={{ backgroundColor: accentColor }}
            >
              {luloStrategy.apy.toFixed(1)}% APY
            </span>
          )}
        </div>
        {secondary && (
          <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{secondary}</p>
        )}
      </div>

      <span className="num shrink-0 text-base sm:mr-2">
        {formatTokenAmount(vt.rawAmount, vt.decimals)}
      </span>

      <div className="flex shrink-0 items-center gap-2">
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
        <Button variant="outline" size="sm" onClick={onTopUpOpen}>
          <TrendingUp className="h-3.5 w-3.5" /> {t("yield.add")}
        </Button>
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
