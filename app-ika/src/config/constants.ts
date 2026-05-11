import { address, type Address } from "@solana/kit";

export const NETWORK = import.meta.env.VITE_NETWORK || "devnet";

export const IKA_GRPC_URL =
  import.meta.env.VITE_IKA_GRPC_URL || "https://api.heirloom.xyz/v1/ika";

export const IKA_DWALLET_PROGRAM_ID: Address = address(
  import.meta.env.VITE_IKA_DWALLET_PROGRAM_ID
);

export const HEIRLOOM_IKA_PROGRAM_ID: Address = address(
  import.meta.env.VITE_HEIRLOOM_IKA_PROGRAM_ID
);

export const SUPPORTED_CHAINS = [
  { id: 1, name: "Ethereum", symbol: "ETH" },
  { id: 11155111, name: "Sepolia", symbol: "ETH" },
  { id: 42161, name: "Arbitrum", symbol: "ETH" },
  { id: 8453, name: "Base", symbol: "ETH" },
  { id: 10, name: "Optimism", symbol: "ETH" },
  { id: 56, name: "BNB Chain", symbol: "BNB" },
  { id: 43114, name: "Avalanche", symbol: "AVAX" },
  { id: 137, name: "Polygon", symbol: "MATIC" },
  { id: 2, name: "Bitcoin", symbol: "BTC" },
] as const;
