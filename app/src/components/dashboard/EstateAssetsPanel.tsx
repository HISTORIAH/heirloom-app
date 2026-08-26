import { useState } from "react";
import { Plus } from "lucide-react";
import { Panel, PanelCap } from "@/components/surface/Panel";
import TokenRow from "@/components/dashboard/TokenRow";
import TokenAvatar from "@/components/TokenAvatar";
import { SolStakingIndicator } from "@/components/dashboard/SolStakingIndicator";
import { TopUpDialog } from "@/components/dashboard/TopUpDialog";
import { SOL_DECIMALS, SOL_LABEL } from "@/lib/constants";
import { cn, formatSol } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import type { EstateData } from "@/contexts/VaultContext";
import type { VaultTokenHolding } from "@/types";
import type { LuloStrategy, Strategy, StrategyProgressStep } from "@/types/strategy-ui";

interface TokenMeta {
  symbol?: string;
  name?: string;
  image?: string;
}

interface WalletSplToken {
  mint: string;
  uiAmount: number;
}

interface EstateAssetsPanelProps {
  estate: EstateData;
  tokenMeta: Map<string, TokenMeta>;
  walletSplTokens: WalletSplToken[] | undefined;
  walletSolBalance: number;
  showYieldStaking: boolean;
  stakingStrategy: Strategy | null;
  luloStrategy: LuloStrategy | null;
  onEnableStaking: () => void;
  onRecallStaking: () => void;
  onEnableLulo: (holding: VaultTokenHolding) => void;
  onRecallLulo: () => void;
  strategyProgress: StrategyProgressStep;
  progressVisible: boolean;
  recallTarget: "lulo" | "staking" | null;
  luloTargetMint: string | null;
  topUpOpen: "sol" | string | null;
  onTopUpOpen: (target: "sol" | string) => void;
  onTopUpCancel: () => void;
  onTopUpConfirm: (amount: number) => void;
  topUpLoading: boolean;
  className?: string;
}

export const EstateAssetsPanel: React.FC<EstateAssetsPanelProps> = ({
  estate,
  tokenMeta,
  walletSplTokens,
  walletSolBalance,
  showYieldStaking,
  stakingStrategy,
  luloStrategy,
  onEnableStaking,
  onRecallStaking,
  onEnableLulo,
  onRecallLulo,
  strategyProgress,
  progressVisible,
  recallTarget,
  luloTargetMint,
  topUpOpen,
  onTopUpOpen,
  onTopUpCancel,
  onTopUpConfirm,
  topUpLoading,
  className,
}) => {
  const { t } = useTranslation("app");
  const [tab, setTab] = useState<"sol" | "tokens">("sol");

  const assetCount = 1 + estate.vaultTokens.length;
  const solVaultBalance = Number(estate.solBalance) / 10 ** SOL_DECIMALS;

  const tabClass = (active: boolean) =>
    cn(
      "px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors md:text-xs",
      active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-tile-soft",
    );

  return (
    <Panel className={cn("h-full gap-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <PanelCap className="text-muted-foreground">{t("dashboard.assets")}</PanelCap>
          <span className="rounded-full border border-tile-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {assetCount} {assetCount !== 1 ? t("dashboard.assetsPlural") : t("dashboard.asset")}
          </span>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-tile-line">
          <button onClick={() => setTab("sol")} className={tabClass(tab === "sol")}>
            {SOL_LABEL}
          </button>
          <span aria-hidden="true" className="w-px bg-tile-line" />
          <button onClick={() => setTab("tokens")} className={tabClass(tab === "tokens")}>
            {t("dashboard.tokens")} ({estate.vaultTokens.length})
          </button>
        </div>
      </div>

      {tab === "sol" ? (
        <div className="flex flex-1 flex-col justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <TokenAvatar label={SOL_LABEL} size="sm" />
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {SOL_LABEL}
              </span>
            </div>
            <p className="tile-h mt-3 tabular-nums">{formatSol(estate.solBalance)}</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {`${estate.solBalance.toLocaleString()} ${t("dashboard.lamports")}`}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => onTopUpOpen("sol")}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-tile-line px-4 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-tile-soft"
            >
              <Plus className="h-3.5 w-3.5" /> {t("dashboard.addMore")}
            </button>

            {showYieldStaking && (
              <div className="w-full">
                <SolStakingIndicator
                  solBalance={solVaultBalance}
                  strategy={stakingStrategy}
                  onEnable={onEnableStaking}
                  onRecall={onRecallStaking}
                  loading={progressVisible && recallTarget === "staking" && strategyProgress !== "idle"}
                  progressStep={
                    progressVisible && recallTarget === "staking" ? strategyProgress : "idle"
                  }
                />
              </div>
            )}
          </div>

          <TopUpDialog
            open={topUpOpen === "sol"}
            symbol={SOL_LABEL}
            decimals={SOL_DECIMALS}
            vaultBalance={solVaultBalance}
            walletBalance={walletSolBalance}
            onConfirm={onTopUpConfirm}
            onCancel={onTopUpCancel}
            loading={topUpLoading}
          />
        </div>
      ) : estate.vaultTokens.length === 0 ? (
        <p className="py-10 text-center text-sm font-medium text-muted-foreground">
          {t("dashboard.noTokens")}
        </p>
      ) : (
        <div
          className={cn(
            "divide-y divide-tile-line border-y border-tile-line",
            estate.vaultTokens.length > 6 && "max-h-[420px] overflow-y-auto",
          )}
        >
          {estate.vaultTokens.map((vt) => (
            <TokenRow
              key={vt.ata}
              vt={vt}
              meta={tokenMeta.get(vt.mint)}
              walletBalance={walletSplTokens?.find((w) => w.mint === vt.mint)?.uiAmount ?? 0}
              showYieldStaking={showYieldStaking}
              luloStrategy={luloStrategy}
              onEnableYield={() => onEnableLulo(vt)}
              onRecallYield={onRecallLulo}
              yieldLoading={
                progressVisible &&
                recallTarget === "lulo" &&
                luloTargetMint === vt.mint &&
                strategyProgress !== "idle"
              }
              yieldProgressStep={
                progressVisible && recallTarget === "lulo" && luloTargetMint === vt.mint
                  ? strategyProgress
                  : "idle"
              }
              topUpOpen={topUpOpen === vt.mint}
              onTopUpOpen={() => onTopUpOpen(vt.mint)}
              onTopUpCancel={onTopUpCancel}
              onTopUpConfirm={onTopUpConfirm}
              topUpLoading={topUpLoading}
            />
          ))}
        </div>
      )}
    </Panel>
  );
};
