import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getBase58Decoder } from "@solana/kit";
import { requestChallenge, verifyChallenge } from "@/services/api/auth";

/**
 * SIWS auth flow as a single mutation:
 * 1. Request a challenge message from the backend
 * 2. Sign it with the wallet (via the provided signMessage fn)
 * 3. Verify the signature — backend sets an HttpOnly session cookie
 *
 * Cookie lasts 15 min idle / 12 hours absolute (sliding).
 * Every authenticated request resets the 15-min timer.
 */
type SignMessageFn = (args: { message: Uint8Array }) => Promise<{ signature: Uint8Array }>;

// Kit names codecs from the string's side: the base58 *decoder* turns bytes into base58 text.
const base58 = getBase58Decoder();

export function useAuthenticate(signMessage: SignMessageFn) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { address: string }>({
    mutationFn: async ({ address }) => {
      const challengeMessage = await requestChallenge(address);
      const { signature } = await signMessage({
        message: new TextEncoder().encode(challengeMessage),
      });
      // The backend expects the signature in base58.
      return verifyChallenge(address, base58.decode(signature));
    },
    onSuccess: () => {
      // Session cookie refreshed — invalidate so next access refetches with the new cookie
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}
