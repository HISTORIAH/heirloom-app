import type { ApiSuccess, ChallengeResponse, VerifyResponse } from "../types/api";
import { postJson } from "./http";

/** Wallet sign-in (SIWS): ask for a challenge, sign it, verify. Verify sets the session cookie. */
const AUTH_PATH = "/v1/auth";

/** The message the wallet signs to prove it owns `address`. */
export async function requestChallenge(backendUrl: string, address: string): Promise<string> {
  const { data } = await postJson<ApiSuccess<ChallengeResponse>>(
    `${backendUrl}${AUTH_PATH}/challenge`,
    { address },
  );
  return data.message;
}

/**
 * Checks the signed challenge and starts the session. `signature` is the base58-encoded
 * 64-byte ed25519 signature; base64 is rejected. Returns the address the backend verified.
 */
export async function verifyChallenge(
  backendUrl: string,
  address: string,
  signature: string,
): Promise<string> {
  const { data } = await postJson<ApiSuccess<VerifyResponse>>(`${backendUrl}${AUTH_PATH}/verify`, {
    address,
    signature,
  });
  return data.address;
}
