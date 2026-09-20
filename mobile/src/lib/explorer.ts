import { Linking } from "react-native";

import { SOLANA_RPC_ENDPOINT } from "@/config";

function explorerCluster(): string | undefined {
  if (SOLANA_RPC_ENDPOINT.includes("mainnet")) return undefined;
  if (SOLANA_RPC_ENDPOINT.includes("testnet")) return "testnet";
  if (SOLANA_RPC_ENDPOINT.includes("devnet")) return "devnet";
  if (
    SOLANA_RPC_ENDPOINT.includes("localhost") ||
    SOLANA_RPC_ENDPOINT.includes("127.0.0.1") ||
    SOLANA_RPC_ENDPOINT.includes("10.0.2.2")
  ) {
    return "custom";
  }
  return "devnet";
}

export function explorerTxUrl(signature: string): string {
  const base = `https://explorer.solana.com/tx/${signature}`;
  const cluster = explorerCluster();
  if (cluster === undefined) return base;
  if (cluster === "custom") {
    return `${base}?cluster=custom&customUrl=${encodeURIComponent(SOLANA_RPC_ENDPOINT)}`;
  }
  return `${base}?cluster=${cluster}`;
}

export function openExplorerTx(signature: string): void {
  void Linking.openURL(explorerTxUrl(signature));
}
