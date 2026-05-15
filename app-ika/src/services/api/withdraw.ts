import type { WithdrawTxInfo } from "@/types/api";
import { get, post } from "./_http";

export async function getWithdrawTx(
  estateId: string,
  destinationEth: string
): Promise<WithdrawTxInfo> {
  return get(`/withdraw-tx/${estateId}?destination_eth=${encodeURIComponent(destinationEth)}`);
}

export async function postWithdraw(body: {
  estate_id: string;
  destination_eth: string;
  owner_address: string;
  owner_signature: string;
}): Promise<{ solana_tx: string; eth_tx: string }> {
  return post("/withdraw", body);
}
