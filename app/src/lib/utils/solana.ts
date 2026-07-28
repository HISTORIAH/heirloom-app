import { SOLANA_RPC_ENDPOINT } from "@/config";

/** Solana Explorer URL for a transaction signature. */
export function getSolanaExplorerTxUrl(signature: string): string {
  if (SOLANA_RPC_ENDPOINT.includes("mainnet")) return `https://explorer.solana.com/tx/${signature}`;
  const cluster = SOLANA_RPC_ENDPOINT.includes("devnet") ? "devnet" : "localnet";
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

/** Returns chain identifier for wallet transaction requests. */
export function getClusterFromEndpoint(): string {
  switch (true) {
    case SOLANA_RPC_ENDPOINT.includes("mainnet"):
      return "solana:mainnet";
    case SOLANA_RPC_ENDPOINT.includes("devnet"):
      return "solana:devnet";
    case SOLANA_RPC_ENDPOINT.includes("testnet"):
      return "solana:testnet";
    case SOLANA_RPC_ENDPOINT.includes("localhost"):
      return "solana:localhost";
    default:
      return "solana:mainnet";
  }
}
