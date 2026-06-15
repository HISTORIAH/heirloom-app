// ---------------------------------------------------------------------------
// Yield Token Registry
//
// Add tokens here to enable Lulo yield routing in the UI.
// Each entry maps a canonical symbol to per-network mint addresses.
//
// TEMP values are tagged with // TEMP and should be removed or verified
// before production deployment.
// ---------------------------------------------------------------------------

import { TEMP_DEVNET_LULO_TEST_MINT } from "./tokens";

export type Network = "mainnet" | "devnet";

export interface YieldTokenConfig {
  symbol: string;
  name: string;
  /** Mint address per network. Empty string means not deployed on that network yet. */
  mints: Record<Network, string>;
  luloSupported: boolean;
  /** Placeholder APYs — TEMP: replace with live API before launch */
  apyProtected: number;
  /** Placeholder APYs — TEMP: replace with live API before launch */
  apyUnprotected: number;
  decimals: number;
}

// ---------------------------------------------------------------------------
// Canonical list of yield-eligible tokens
// ---------------------------------------------------------------------------

export const YIELD_TOKEN_REGISTRY: YieldTokenConfig[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    mints: {
      mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    },
    luloSupported: true,
    apyProtected: 6.2,   // TEMP: placeholder
    apyUnprotected: 8.5, // TEMP: placeholder
    decimals: 6,
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    mints: {
      mainnet: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      devnet: "BQcdHdAD9ezThQqtCYZbP5THTVHTZnA1FmQ1aY8qB7w",
    },
    luloSupported: true,
    apyProtected: 6.0,   // TEMP: placeholder
    apyUnprotected: 8.2, // TEMP: placeholder
    decimals: 6,
  },
  {
    symbol: "PYUSD",
    name: "PayPal USD",
    mints: {
      mainnet: "2b1kV6DkPAnxd5mvfnynTzCTLKVp8bjvZ9F3i1oQj7e",
      devnet: "", // TEMP: not deployed on devnet yet
    },
    luloSupported: true,
    apyProtected: 5.8,   // TEMP: placeholder
    apyUnprotected: 7.9, // TEMP: placeholder
    decimals: 6,
  },
  {
    symbol: "USDS",
    name: "USDS Stablecoin",
    mints: {
      mainnet: "USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKoRGH4",
      devnet: "", // TEMP: not deployed on devnet yet
    },
    luloSupported: true,
    apyProtected: 6.1,   // TEMP: placeholder
    apyUnprotected: 8.3, // TEMP: placeholder
    decimals: 6,
  },
  // TEMP: Devnet test token for Lulo yield routing
  // This mint stands in for USDC on devnet — used for testing the Lulo
  // route-to-yield flow without needing real USDC devnet tokens.
  // TODO: Remove before mainnet launch — revert devnet mint to canonical USDC.
  {
    symbol: "USDC",
    name: "USD Coin (Devnet Test)",
    mints: {
      mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      devnet: TEMP_DEVNET_LULO_TEST_MINT,
    },
    luloSupported: true,
    apyProtected: 6.2,   // TEMP: placeholder
    apyUnprotected: 8.5, // TEMP: placeholder
    decimals: 6,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const ALL_MINTS = new Set(
  YIELD_TOKEN_REGISTRY.flatMap((t) => Object.values(t.mints).filter(Boolean)),
);

/** Check if a mint address (any network) is in the yield registry. */
export function isLuloSupported(mint: string): boolean {
  return ALL_MINTS.has(mint);
}

/** Get full config for a mint address (any network), or undefined. */
export function getYieldConfigByMint(mint: string): YieldTokenConfig | undefined {
  return YIELD_TOKEN_REGISTRY.find((t) => Object.values(t.mints).includes(mint));
}

/** Get config by symbol (e.g. "USDC") — useful for defaults. */
export function getYieldConfigBySymbol(symbol: string): YieldTokenConfig | undefined {
  return YIELD_TOKEN_REGISTRY.find((t) => t.symbol === symbol);
}

// ---------------------------------------------------------------------------
// SOL staking config (native asset — no mint)
// ---------------------------------------------------------------------------

// TEMP: placeholder validator and APY — replace with live data before launch
export const SOL_STAKING_CONFIG = {
  symbol: "SOL" as const,
  name: "Solana",
  apy: 6.2,           // TEMP: placeholder
  validatorName: "Jito", // TEMP: placeholder
} as const;
