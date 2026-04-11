import { useState, useEffect } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  RPC_URL,
  USDC_MINT,
  SOL_DECIMALS,
  USDC_DECIMALS,
} from "@/config/constants";

interface TokenBalances {
  sol: number;
  usdc: number;
  loading: boolean;
}

export function useTokenBalances(address: string | null): TokenBalances {
  const [balances, setBalances] = useState<TokenBalances>({
    sol: 0,
    usdc: 0,
    loading: true,
  });

  useEffect(() => {
    if (!address) {
      setBalances({ sol: 0, usdc: 0, loading: false });
      return;
    }

    let cancelled = false;

    async function fetchBalances() {
      try {
        const connection = new Connection(RPC_URL, "confirmed");
        const owner = new PublicKey(address!);

        const usdcAta = getAssociatedTokenAddressSync(USDC_MINT, owner);

        const [solResult, usdcResult] = await Promise.allSettled([
          connection.getBalance(owner, "confirmed"),
          connection.getTokenAccountBalance(usdcAta),
        ]);

        const solRaw =
          solResult.status === "fulfilled" ? solResult.value : 0;
        const usdcRaw =
          usdcResult.status === "fulfilled"
            ? Number(usdcResult.value.value.amount)
            : 0;

        if (!cancelled) {
          setBalances({
            sol: solRaw / Math.pow(10, SOL_DECIMALS),
            usdc: usdcRaw / Math.pow(10, USDC_DECIMALS),
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setBalances({ sol: 0, usdc: 0, loading: false });
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
