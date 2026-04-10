import { useState, useEffect } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  RPC_URL,
  TOKEN_A_MINT,
  TOKEN_B_MINT,
  TOKEN_A_DECIMALS,
  TOKEN_B_DECIMALS,
} from "@/config/constants";

interface TokenBalances {
  tokenA: number;
  tokenB: number;
  loading: boolean;
}

export function useTokenBalances(address: string | null): TokenBalances {
  const [balances, setBalances] = useState<TokenBalances>({
    tokenA: 0,
    tokenB: 0,
    loading: true,
  });

  useEffect(() => {
    if (!address) {
      setBalances({ tokenA: 0, tokenB: 0, loading: false });
      return;
    }

    let cancelled = false;

    async function fetchBalances() {
      try {
        const connection = new Connection(RPC_URL, "confirmed");
        const owner = new PublicKey(address!);

        const tokenAAta = getAssociatedTokenAddressSync(TOKEN_A_MINT, owner);
        const tokenBAta = getAssociatedTokenAddressSync(TOKEN_B_MINT, owner);

        const [tokenAInfo, tokenBInfo] = await Promise.allSettled([
          connection.getTokenAccountBalance(tokenAAta),
          connection.getTokenAccountBalance(tokenBAta),
        ]);

        const tokenARaw =
          tokenAInfo.status === "fulfilled"
            ? Number(tokenAInfo.value.value.amount)
            : 0;
        const tokenBRaw =
          tokenBInfo.status === "fulfilled"
            ? Number(tokenBInfo.value.value.amount)
            : 0;

        if (!cancelled) {
          setBalances({
            tokenA: tokenARaw / Math.pow(10, TOKEN_A_DECIMALS),
            tokenB: tokenBRaw / Math.pow(10, TOKEN_B_DECIMALS),
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setBalances({ tokenA: 0, tokenB: 0, loading: false });
        }
      }
    }

    fetchBalances();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return balances;
}
