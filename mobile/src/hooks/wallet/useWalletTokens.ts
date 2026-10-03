import { useEffect, useState } from "react";

import { HELIUS_DAS_URL } from "@/config";
import { fetchAssetsByOwner, type DasFungibleAsset } from "@/services/api/das";

export type WalletToken = {
  mint: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  tokenProgram: string;
  image?: string;
};

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
  return {
    mint: asset.id,
    symbol: info?.symbol ?? asset.id.slice(0, 4),
    name: asset.content?.metadata?.name ?? info?.symbol ?? "Unknown",
    balance: formatBalance(rawBalance, decimals),
    decimals,
    tokenProgram: info?.token_program ?? "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    image: pickImage(asset.content),
  };
}

function pickImage(content?: DasFungibleAsset["content"]): string | undefined {
  const file = content?.files?.find((f) => !f.mime || f.mime.startsWith("image/"));
  return file?.cdn_uri || content?.links?.image || file?.uri;
}

function formatBalance(raw: number, decimals: number): string {
  if (raw === 0) return "0";
  const value = raw / 10 ** decimals;
  if (value >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return value.toPrecision(4);
}
