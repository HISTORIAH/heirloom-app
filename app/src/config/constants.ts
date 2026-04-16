import { address, type Address } from "@solana/kit";

export const NETWORK = import.meta.env.VITE_NETWORK || "devnet";

export const RPC_URL = import.meta.env.VITE_RPC_URL || (NETWORK === "mainnet-beta" ? "https://api.mainnet-beta.solana.com" : NETWORK === "localnet" ? "http://127.0.0.1:8899" : "https://api.devnet.solana.com");

export const RPC_WS_URL = import.meta.env.VITE_RPC_WS_URL || (NETWORK === "mainnet-beta" ? "wss://api.mainnet-beta.solana.com" : NETWORK === "localnet" ? "ws://127.0.0.1:8900" : "wss://api.devnet.solana.com");

export const PROGRAM_ID: Address = address( import.meta.env.VITE_PROGRAM_ID || "JE2LFHb9zAwSM533gd79XJXyByZvVwoy8nYxhCsiAnKN", );

export const USDC_MINT: Address = address( import.meta.env.VITE_USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", );

export const TOKEN_PROGRAM_ID: Address = address( "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", );

export const SOL_LABEL = "SOL";
export const SOL_DECIMALS = 9;
export const USDC_LABEL = "USDC";
export const USDC_DECIMALS = 6;

export const LABEL_MAX_LEN = 32;

export function explorerTxUrl(signature: string): string {
  if (NETWORK === "mainnet-beta") return `https://explorer.solana.com/tx/${signature}`;
  return `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`;
}

export function explorerAddressUrl(addr: string): string {
  if (NETWORK === "mainnet-beta") return `https://explorer.solana.com/address/${addr}`;
  return `https://explorer.solana.com/address/${addr}?cluster=${NETWORK}`;
}
