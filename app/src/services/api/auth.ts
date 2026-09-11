import { BACKEND_URL } from "@/config";
import { request } from "@/lib/api";
import type { ChallengeResponse, VerifyResponse } from "@/types/auth";

const API_BASE = `${BACKEND_URL}/v1/auth`;

// ─── Wallet challenge / verify ───────────────────────────────────
export async function requestChallenge(address: string): Promise<string> {
  const { message } = await request<ChallengeResponse>(`${API_BASE}/challenge`, {
    method: "POST",
    body: JSON.stringify({ address }),
  });
  return message;
}

/** signature must be bs58-encoded (64-byte ed25519) — the server no longer accepts base64. */
export async function verifyChallenge(address: string, signature: string): Promise<string> {
  const { address: verifiedAddress } = await request<VerifyResponse>(`${API_BASE}/verify`, {
    method: "POST",
    body: JSON.stringify({ address, signature }),
  });
  return verifiedAddress;
}
