import type { ClaimTxInfo } from "@/types/api";
import { get, post } from "./_http";

export async function getClaimTx(estateId: string): Promise<ClaimTxInfo> {
  return get(`/claim-tx/${estateId}`);
}

export async function postClaim(body: {
  estate_id: string;
  heir_eth_address: string;
  eth_signature: string;
}): Promise<{ solana_tx: string; eth_tx: string }> {
  return post("/claim", body);
}
