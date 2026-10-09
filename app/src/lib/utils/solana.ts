import { SOLANA_RPC_ENDPOINT } from "@/config";

/** Solana Explorer URL for a transaction signature. */
export function getSolanaExplorerTxUrl(signature: string): string {
  if (SOLANA_RPC_ENDPOINT.includes("mainnet")) return `https://explorer.solana.com/tx/${signature}`;
  const cluster = SOLANA_RPC_ENDPOINT.includes("devnet") ? "devnet" : "localnet";
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

/** A wallet-standard Solana chain id, e.g. "solana:devnet". */
export type SolanaChain = `solana:${string}`;

/**
 * The wallet-standard chain for the RPC endpoint the app talks to. Wallets sign and send
 * against this chain, so it must match the cluster the RPC points at.
 */
export function getClusterFromEndpoint(): SolanaChain {
  const endpoint = SOLANA_RPC_ENDPOINT;
  if (endpoint.includes("mainnet")) return "solana:mainnet";
  if (endpoint.includes("devnet")) return "solana:devnet";
  if (endpoint.includes("testnet")) return "solana:testnet";
  if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1")) return "solana:localnet";
  return "solana:mainnet";
}

/** The chain this build signs against. */
export const SOLANA_CHAIN = getClusterFromEndpoint();

/**
 * Validates a Solana base58 address by format: 32 to 44 chars from the
 * base58 alphabet (no 0, O, I or l). Catches URLs and other non-address
 * input before they reach the program.
 */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
}
