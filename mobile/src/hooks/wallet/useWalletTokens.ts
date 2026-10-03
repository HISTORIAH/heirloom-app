import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { useEffect, useState } from "react";

import { HELIUS_DAS_URL } from "@/config";
import { toBigInt } from "@/lib/solana/parsed";
import {
  fetchAssetsByOwner,
  pickImage,
  pickLabel,
  type DasFungibleAsset,
} from "@/services/api/das";
import type { WalletToken } from "@/types/wallet";

/** Fungible tokens held by `owner`, with metadata from the DAS API. */
export function useWalletTokens(owner: string | undefined) {
  const [tokens, setTokens] = useState<WalletToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!owner) {
      setTokens([]);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(undefined);

    fetchAssetsByOwner(HELIUS_DAS_URL, owner, ctrl.signal)
      .then((assets) => {
        if (ctrl.signal.aborted) return;
        setTokens(assets.filter(isFungible).map(toWalletToken));
      })
      .catch((cause) => {
        if (ctrl.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Could not load tokens.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [owner]);

  return { tokens, loading, error };
}

/** DAS returns NFTs too when showFungible is on; decimals 0 means non-fungible. */
function isFungible(asset: DasFungibleAsset): boolean {
  return (asset.token_info?.decimals ?? 0) > 0;
}

function toWalletToken(asset: DasFungibleAsset): WalletToken {
  const info = asset.token_info;
  const rawBalance = Number(info?.balance ?? 0);
  const decimals = info?.decimals ?? 0;
  const { symbol, name, named } = pickLabel(asset.id, info?.symbol, asset.content);
  return {
    mint: asset.id,
    symbol,
    name,
    balance: formatBalance(rawBalance, decimals),
    raw: toBigInt(info?.balance) ?? 0n,
    decimals,
    tokenProgram: info?.token_program ?? TOKEN_PROGRAM_ADDRESS,
    image: pickImage(asset.content),
    named,
    usd: info?.price_info?.total_price ?? null,
    usdPerToken: info?.price_info?.price_per_token ?? null,
  };
}

function formatBalance(raw: number, decimals: number): string {
  if (raw === 0) return "0";
  const value = raw / 10 ** decimals;
  if (value >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return value.toPrecision(4);
}
