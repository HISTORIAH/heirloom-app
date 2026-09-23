import { useCallback, useMemo } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address } from "@solana/kit";
import { useSignTransaction } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/ui";
import { STOCKS_QUERY_KEY } from "@/hooks/useStocks";
import {
  executeOrder,
  fetchHoldings,
  fetchOrder,
  fetchPrices,
  PRICE_BATCH,
  transactionBytes,
  type SwapResult,
  type TokenPrice,
} from "@/services/jupiter";

const JUPITER = [STOCKS_QUERY_KEY, "jupiter"] as const;

/**
 * Mainnet prices for `wanted`. They are fetched in fixed batches of the whole
 * catalog (`all`, whose order `version` pins), so a batch fetched once is
 * reused as the list is searched and paged rather than refetched per keystroke.
 */
export function useTokenPrices(
  wanted: Address[],
  all: Address[],
  version: string,
): Map<Address, TokenPrice> {
  const batchOf = useMemo(
    () => new Map(all.map((mint, i) => [mint, Math.floor(i / PRICE_BATCH)])),
    [all],
  );
  const batches = [
    ...new Set(wanted.map((m) => batchOf.get(m)).filter((b) => b !== undefined)),
  ].sort((a, b) => a - b);

  return useQueries({
    queries: batches.map((batch) => ({
      queryKey: [...JUPITER, "prices", version, batch],
      queryFn: () => fetchPrices(all.slice(batch * PRICE_BATCH, (batch + 1) * PRICE_BATCH)),
      staleTime: 30_000,
      refetchInterval: 60_000,
    })),
    combine: (results) => {
      const prices = new Map<Address, TokenPrice>();
      for (const result of results) result.data?.forEach((price, mint) => prices.set(mint, price));
      return prices;
    },
  });
}

/** What `owner` holds on mainnet, whatever cluster the app reads. */
export function useMainnetHoldings(owner: Address | null) {
  return useQuery({
    queryKey: [...JUPITER, "holdings", owner],
    queryFn: () => fetchHoldings(owner!),
    enabled: !!owner,
    refetchInterval: 30_000,
  });
}

/** A quote only, with no wallet attached, for previewing a trade. */
export function useSwapQuote(input: {
  inputMint: Address;
  outputMint: Address;
  amount: bigint | null;
  enabled: boolean;
}) {
  const { inputMint, outputMint, amount, enabled } = input;
  return useQuery({
    queryKey: [...JUPITER, "quote", inputMint, outputMint, amount?.toString()],
    queryFn: () => fetchOrder({ inputMint, outputMint, amount: amount! }),
    enabled: enabled && amount !== null && amount > 0n,
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: false,
  });
}

/**
 * Whether this wallet can sign a mainnet transaction. `useMainnetSwap` must only
 * be called for one that can: the signing hook throws during render otherwise.
 */
export function canSignMainnet(account: UiWalletAccount): boolean {
  return (
    account.chains.includes("solana:mainnet") && account.features.includes("solana:signTransaction")
  );
}

/**
 * Swaps on mainnet through Jupiter. A fresh order is fetched for this wallet at
 * the moment of the swap, so what is signed is never a stale quote; the wallet
 * signs it for mainnet regardless of the app's cluster, and Jupiter lands it.
 */
export function useMainnetSwap(account: UiWalletAccount) {
  const sign = useSignTransaction(account, "solana:mainnet");
  const queryClient = useQueryClient();

  return useCallback(
    async (input: {
      inputMint: Address;
      outputMint: Address;
      amount: bigint;
      onSigned?: () => void;
    }): Promise<SwapResult> => {
      const { inputMint, outputMint, amount } = input;
      const order = await fetchOrder({
        inputMint,
        outputMint,
        amount,
        taker: account.address as Address,
      });
      const { signedTransaction } = await sign({ transaction: transactionBytes(order) });
      input.onSigned?.();
      try {
        return await executeOrder({ requestId: order.requestId, signedTransaction });
      } finally {
        void queryClient.invalidateQueries({ queryKey: [...JUPITER, "holdings"] });
      }
    },
    [account.address, queryClient, sign],
  );
}
