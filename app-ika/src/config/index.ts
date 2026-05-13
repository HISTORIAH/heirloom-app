import { address, type Address } from "@solana/kit";

export const NETWORK = import.meta.env.VITE_NETWORK || "devnet";

export const IKA_GRPC_URL =
  import.meta.env.VITE_IKA_GRPC_URL || "https://api.heirloom.xyz/v1/ika";

export const IKA_DWALLET_PROGRAM_ID: Address = address(
  import.meta.env.VITE_IKA_DWALLET_PROGRAM_ID
);

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
