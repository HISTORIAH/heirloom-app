import { getBase58Decoder } from "@solana/kit";
import { useQueryClient } from "@tanstack/react-query";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useState } from "react";
import { isUnauthorized, requestChallenge, verifyChallenge } from "@heirloom/core/api";

import { BACKEND_URL } from "@/config";

const base58 = getBase58Decoder();
/** ed25519. MWA returns the signed payload; the signature is its last 64 bytes. */
const SIGNATURE_BYTES = 64;

/**
 * The backend's SIWS session: sign a challenge (no transaction, no fee) and the server sets an
 * HttpOnly cookie. It slides 15 minutes on every request, up to 12 hours.
 */
export function useSession() {
  const { account, connect, signMessages } = useMobileWallet();
  const queryClient = useQueryClient();
  const [signing, setSigning] = useState(false);

  async function signIn(): Promise<void> {
    // Screens that need the backend are hidden when it isn't configured; this catches a call
    // that slips through, instead of requesting `undefined/v1/...`.
    if (BACKEND_URL === undefined) throw new Error("Backend URL is not configured");
    setSigning(true);
    try {
      const acc = account ?? (await connect());
      const address = String(acc.address);
      const message = await requestChallenge(BACKEND_URL, address);
      const signed = await signMessages(new TextEncoder().encode(message));
      const signature = signed.length > SIGNATURE_BYTES ? signed.slice(-SIGNATURE_BYTES) : signed;
      await verifyChallenge(BACKEND_URL, address, base58.decode(signature));
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
    } finally {
      setSigning(false);
    }
  }

  /** Runs `work`; if the session is missing or expired, signs in once and retries. */
  async function withSession<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (cause) {
      if (!isUnauthorized(cause)) throw cause;
      await signIn();
      return work();
    }
  }

  return { signIn, withSession, signing };
}
