import type { HeartbeatChallenge } from "@/types/api";
import { get, post } from "./_http";

export async function getHeartbeatChallenge(estateId: string): Promise<HeartbeatChallenge> {
  return get(`/heartbeat/${estateId}`);
}

export async function postHeartbeat(body: {
  estate_id: string;
  signature_b64: string;
  authenticator_data_b64: string;
  client_data_json: string;
}): Promise<{ solana_tx: string }> {
  return post("/heartbeat", body);
}
