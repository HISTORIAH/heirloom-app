import { useState } from "react";
import { Shield } from "lucide-react";
import { Panel, PanelCap } from "@/components/surface/Panel";
import TokenRow from "@/components/dashboard/TokenRow";
import TokenAvatar from "@/components/TokenAvatar";
import { SolStakingIndicator } from "@/components/dashboard/SolStakingIndicator";
import { DASHBOARD_CARD } from "@/components/dashboard/estateState";
import { SOL_DECIMALS, SOL_LABEL, WRAPPED_SOL_MINT } from "@/lib/constants";
import { cn, formatSol, formatUsd, truncateAddress } from "@/lib/utils";
import { Trans, useTranslation } from "@heirloom/i18n";
import type { EstateData } from "@/contexts/VaultContext";
import type { VaultTokenHolding } from "@/types";
import type { LuloStrategy, Strategy, StrategyProgressStep } from "@/types/strategy-ui";
import type { UsdPriceMap } from "@/types/prices";

type AssetTab = "sol" | "tokens" | "nfts";

/** One NFT in the NFTs tab: its image, name and collection. No amount or price. */
const NftCard: React.FC<{ nft: VaultTokenHolding }> = ({ nft }) => {
  const label = nft.name || nft.symbol || truncateAddress(nft.mint, 4);
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-tile-line">
      <TokenAvatar
        image={nft.image}
        label={label}
        size="fill"
        accent="bg-tile-soft"
        className="rounded-none border-0"
      />
      <div className="px-3.5 py-3">
        <p className="truncate text-base font-semibold leading-tight">{label}</p>
        {nft.collection && (
          <p className="mt-0.5 truncate text-[0.8125rem] text-muted-foreground">{nft.collection}</p>
        )}
      </div>
    </div>
  );
};

interface EstateAssetsPanelProps {
  estate: EstateData;
  /** The heir's name from their reminder profile, when one is set. */
  heirName: string | null;
  /** USD prices by mint (SOL under the wrapped mint). Undefined while loading or unavailable. */
  prices: UsdPriceMap | undefined;
  /** Prices arrive after the estate; the value shimmers until they do. */
  pricesLoading: boolean;
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
  className?: string;
}

export const EstateAssetsPanel: React.FC<EstateAssetsPanelProps> = ({
  estate,
  heirName,
  prices,
  pricesLoading,
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
  className,
}) => {
  const { t } = useTranslation("app");
  const tokens = estate.vaultTokens.filter((vt) => !vt.isNft);
  const nfts = estate.vaultTokens.filter((vt) => vt.isNft);

  // An estate without SOL opens on whatever it does hold, tokens first.
  const [chosenTab, setTab] = useState<AssetTab>(() => {
    if (estate.solBalance > 0) return "sol";
    if (tokens.length > 0) return "tokens";
    return nfts.length > 0 ? "nfts" : "sol";
  });
  // The NFTs tab disappears once the last NFT leaves the estate.
  const tab = chosenTab === "nfts" && nfts.length === 0 ? "tokens" : chosenTab;

  const assetCount = 1 + estate.vaultTokens.length;
  const solVaultBalance = Number(estate.solBalance) / 10 ** SOL_DECIMALS;

  // Display-only valuation. Unpriced tokens count toward neither the totals nor the shares.
  const usdOf = (mint: string, amount: number) => {
    const price = prices?.get(mint);
    return price !== undefined ? price * amount : undefined;
  };
  const solUsd = usdOf(WRAPPED_SOL_MINT, solVaultBalance);
  const tokenUsd = new Map(
    tokens.map((vt) => [vt.mint, usdOf(vt.mint, Number(vt.rawAmount) / 10 ** vt.decimals)]),
  );
  const pricedTokens = [...tokenUsd.values()].filter((v): v is number => v !== undefined);
  const tokensTotal = pricedTokens.length ? pricedTokens.reduce((a, b) => a + b, 0) : undefined;
  const estateTotal = (solUsd ?? 0) + (tokensTotal ?? 0);

  const tabClass = (active: boolean) =>
    cn(
      "px-3.5 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.14em] transition-colors md:text-xs",
      active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-tile-soft",
    );

  return (
    <Panel bare className={cn("h-full gap-[26px]", DASHBOARD_CARD, className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <PanelCap className="text-muted-foreground">{t("dashboard.assets")}</PanelCap>
          <span className="rounded-full border border-tile-line px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {assetCount} {assetCount !== 1 ? t("dashboard.assetsPlural") : t("dashboard.asset")}
          </span>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-tile-line">
          <button onClick={() => setTab("sol")} className={tabClass(tab === "sol")}>
            {SOL_LABEL}
          </button>
          <span aria-hidden="true" className="w-px bg-tile-line" />
          <button onClick={() => setTab("tokens")} className={tabClass(tab === "tokens")}>
            {t("dashboard.tokens")} ({tokens.length})
          </button>
          {nfts.length > 0 && (
            <>
              <span aria-hidden="true" className="w-px bg-tile-line" />
              <button onClick={() => setTab("nfts")} className={tabClass(tab === "nfts")}>
                {t("dashboard.nfts")} ({nfts.length})
              </button>
            </>
          )}
        </div>
      </div>

      {tab === "sol" ? (
        <div className="flex flex-1 flex-col justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <TokenAvatar label={SOL_LABEL} size="sm" />
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {SOL_LABEL}
              </span>
            </div>
            <p className="mt-3.5 font-display text-[clamp(2.5rem,4.5vw,4rem)] font-bold leading-none tracking-[-0.03em] tabular-nums">
              {formatSol(estate.solBalance)}
            </p>
            {estate.solBalance === 0 ? (
              <p className="mt-3.5 text-sm text-muted-foreground">{t("dashboard.noSol")}</p>
            ) : (
              solUsd !== undefined && (
                <p className="mt-3 text-base text-muted-foreground tabular-nums">
                  ≈ {formatUsd(solUsd)}
                </p>
              )
            )}
          </div>

          {showYieldStaking && (
            <div className="w-full">
              <SolStakingIndicator
                solBalance={solVaultBalance}
                strategy={stakingStrategy}
                onEnable={onEnableStaking}
                onRecall={onRecallStaking}
                loading={
                  progressVisible && recallTarget === "staking" && strategyProgress !== "idle"
                }
                progressStep={
                  progressVisible && recallTarget === "staking" ? strategyProgress : "idle"
                }
              />
            </div>
          )}
        </div>
      ) : tab === "nfts" ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {nfts.map((nft) => (
            <NftCard key={nft.ata} nft={nft} />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <p className="py-10 text-center text-sm font-medium text-muted-foreground">
          {t("dashboard.noTokens")}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <div>
              <span className="text-sm text-muted-foreground">{t("dashboard.tokenValue")}</span>
              {pricesLoading ? (
                <div aria-hidden="true" className="skeleton mt-1 h-[30px] w-40" />
              ) : tokensTotal !== undefined ? (
                <p className="mt-1 font-display text-3xl font-bold leading-none tracking-[-0.02em] tabular-nums">
                  {formatUsd(tokensTotal)}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.notPricedYet")}</p>
              )}
            </div>
            {estateTotal > 0 && (
              <span className="text-sm text-muted-foreground tabular-nums">
                {t("dashboard.estateTotal", { value: formatUsd(estateTotal) })}
              </span>
            )}
          </div>
          <div
            className={cn(
              "flex flex-col gap-2",
              tokens.length > 5 && "max-h-[460px] overflow-y-auto pr-1",
            )}
          >
            {tokens.map((vt) => (
              <TokenRow
                key={vt.ata}
                vt={vt}
                usdValue={tokenUsd.get(vt.mint)}
                share={
                  estateTotal > 0 && tokenUsd.get(vt.mint) !== undefined
                    ? (tokenUsd.get(vt.mint) as number) / estateTotal
                    : undefined
                }
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
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-tile-soft px-[18px] py-3.5 text-sm text-foreground/80">
        <Shield aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-foreground" />
        <p className="min-w-0">
          <Trans
            t={t}
            i18nKey="dashboard.passesTo"
            values={{ heir: heirName ?? truncateAddress(estate.heir, 4) }}
            components={{
              heir: heirName ? (
                <span className="font-semibold text-foreground" />
              ) : (
                <span className="font-mono text-foreground" title={estate.heir} />
              ),
            }}
          />
        </p>
      </div>
    </Panel>
  );
};
