import type { CreateVaultPayload, CreateVaultResult, VaultBalance } from "@/types/api";
import { get, post } from "./_http";

export async function getHealth(): Promise<{ backend: string; ika_grpc: string }> {
  return get("/health");
}

export async function createVault(body: CreateVaultPayload): Promise<CreateVaultResult> {
  return post("/create-vault", body);
}

export async function getVaultBalance(estateId: string): Promise<VaultBalance> {
  return get(`/balance/${estateId}`);
}
