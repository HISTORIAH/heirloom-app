import { useEffect, useState } from "react";
import { address as toAddress } from "@solana/kit";
import { useWallet } from "@/contexts/WalletContext";
import { SOL_DECIMALS, USDC_DECIMALS } from "@/lib/constants";
import { address } from "@solana/kit";

interface TokenBalances {
  sol: number;
  usdc: number;
  loading: boolean;
}

export function useTokenBalances(addressStr: string | null): TokenBalances {
  const { rpc } = useWallet();
  const [balances, setBalances] = useState<TokenBalances>({ sol: 0, usdc: 0, loading: true });

  useEffect(() => {
    if (!addressStr) {
      setBalances({ sol: 0, usdc: 0, loading: false });
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const owner = toAddress(addressStr);
        const [solRes, tokenRes] = await Promise.allSettled([
          rpc.getBalance(owner).send(),
          rpc
            .getTokenAccountsByOwner(
              owner,
              { mint: address("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU") },
              { encoding: "jsonParsed" },
            )
            .send(),
        ]);

        const solRaw =
          solRes.status === "fulfilled" ? Number(solRes.value.value) : 0;

        let usdcRaw = 0;
        if (tokenRes.status === "fulfilled") {
          type ParsedTokenAmount = { tokenAmount?: { amount?: string } };
          const accounts = tokenRes.value.value as unknown as Array<{
            account: { data: { parsed: { info: ParsedTokenAmount } } };
          }>;
          for (const a of accounts) {
            const amt = a.account?.data?.parsed?.info?.tokenAmount?.amount;
            if (amt) usdcRaw += Number(amt);
          }
        }

        if (!cancelled) {
          setBalances({
            sol: solRaw / Math.pow(10, SOL_DECIMALS),
            usdc: usdcRaw / Math.pow(10, USDC_DECIMALS),
            loading: false,
          });
        }
      } catch {
        if (!cancelled) setBalances({ sol: 0, usdc: 0, loading: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addressStr, rpc]);

  return balances;
}
