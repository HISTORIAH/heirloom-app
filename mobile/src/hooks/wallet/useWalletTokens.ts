import { useQuery } from "@tanstack/react-query";
import { address, type Address } from "@solana/kit";
import {
  fetchOwnerAssets,
  heldAmount,
  isNftAsset,
  unsupportedReason,
  type DasAsset,
} from "@heirloom/core/assets";

import { DAS_RPC_URL } from "@/config";
import { assetLabel } from "@/lib/solana/assetLabel";
import { isTokenProgram } from "@/lib/solana/mint";
import { errorMessage } from "@/lib/text";
import type { WalletToken } from "@/types/wallet";

/** Stable empty list, so memos keyed on `tokens` don't rerun every render while loading. */
const NO_TOKENS: WalletToken[] = [];

/** Query key for a wallet's DAS token list. Sends invalidate it, since every send moves a balance. */
export function walletTokensKey(owner: string | undefined) {
  return ["wallet-tokens", owner] as const;
}

/**
 * Tokens and NFTs held by `owner`, with metadata from the DAS API. One fetch shared by every
 * screen that asks (create, top-up), so a picked token already carries its decimals and program.
 * NFTs the vault can't hold come back with an `unsupportedReason` rather than being dropped.
 */
export function useWalletTokens(owner: string | undefined) {
  const query = useQuery({
    queryKey: walletTokensKey(owner),
    queryFn: async ({ signal }) => {
      if (owner === undefined) throw new Error("No wallet");
      const assets = await fetchOwnerAssets(DAS_RPC_URL, owner, signal);
      return assets.filter((asset) => heldAmount(asset) > 0n).map(toWalletToken);
    },
    enabled: owner !== undefined,
  });

  return {
    tokens: query.data ?? NO_TOKENS,
    loading: query.isLoading,
    error: query.isError ? errorMessage(query.error, "Could not load tokens.") : undefined,
  };
}

function toWalletToken(asset: DasAsset): WalletToken {
  const info = asset.token_info;
  const raw = heldAmount(asset);
  const decimals = info?.decimals ?? 0;
  const { symbol, name, named, image } = assetLabel(asset.id, asset);
  return {
    mint: asset.id,
    symbol,
    name,
    balance: formatBalance(Number(raw), decimals),
    raw,
    decimals,
    tokenProgram: knownTokenProgram(info?.token_program),
    image,
    named,
    usd: info?.price_info?.total_price ?? null,
    usdPerToken: info?.price_info?.price_per_token ?? null,
    isNft: isNftAsset(asset),
    unsupportedReason: unsupportedReason(asset),
  };
}

/** Only trust DAS's program when it is Token or Token-2022; otherwise leave it for the chain. */
function knownTokenProgram(value: string | undefined): Address | undefined {
  return value !== undefined && isTokenProgram(value) ? address(value) : undefined;
}

function formatBalance(raw: number, decimals: number): string {
  if (raw === 0) return "0";
  const value = raw / 10 ** decimals;
  if (value >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return value.toPrecision(4);
}
