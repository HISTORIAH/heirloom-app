import { PublicKey } from "@solana/web3.js";

export const NETWORK = import.meta.env.VITE_NETWORK || "devnet";

export const RPC_URL =
  import.meta.env.VITE_RPC_URL ||
  (NETWORK === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com");

export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || "Bayy9jagJooeKL72hpy6NKTSYVNTBLAj4hSwRXBg7wCJ"
);

export const USDC_MINT = new PublicKey(
  import.meta.env.VITE_USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export const SOL_LABEL = "SOL";
export const SOL_DECIMALS = 9;
export const USDC_LABEL = "USDC";
export const USDC_DECIMALS = 6;

export const BASIS_POINTS = 10000;

export const VAULT_SEED = "vault";

export function explorerTxUrl(signature: string): string {
  if (NETWORK === "mainnet-beta") {
    return `https://explorer.solana.com/tx/${signature}`;
  }
  return `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`;
}

export function explorerAddressUrl(address: string): string {
  if (NETWORK === "mainnet-beta") {
    return `https://explorer.solana.com/address/${address}`;
  }
  return `https://explorer.solana.com/address/${address}?cluster=${NETWORK}`;
}
