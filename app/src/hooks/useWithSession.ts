import { useCallback } from "react";
import { useSignMessage } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/ui";
import bs58 from "bs58";
import { useAuthenticate } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

/**
 * Runs a backend call that needs the session cookie. On 401 it asks the wallet to sign in
 * once and retries, so an expired session reads as one signature rather than an error.
 */
export function useWithSession(account: UiWalletAccount) {
  const auth = useAuthenticate(useSignMessage(account));
  const { mutateAsync } = auth;

  const withSession = useCallback(
    async <T,>(call: () => Promise<T>): Promise<T> => {
      try {
        return await call();
      } catch (err) {
        const unauthorized =
          err instanceof ApiError && (err.code === "UNAUTHORIZED" || err.code === "unauthorized");
        if (!unauthorized) throw err;
        await mutateAsync({ address: account.address, encode: bs58.encode });
        return call();
      }
    },
    [mutateAsync, account.address],
  );

  return { withSession, signing: auth.isPending };
}
