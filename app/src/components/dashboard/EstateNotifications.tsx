import { useEffect, useMemo, useRef, useState } from "react";
import { useSignMessage } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/ui";
import bs58 from "bs58";
import type { EstateData } from "@/contexts/VaultContext";
import NotificationsCard from "@/components/dashboard/NotificationsCard";
import NotificationsSignInPanel from "@/components/dashboard/NotificationsSignInPanel";
import NotificationsDialog from "@/components/dashboard/NotificationsDialog";
import { summarizeReminders, type NotificationsCardStatus } from "@/types/reminders";
import { useReminders } from "@/hooks/useReminders";
import { useAuthenticate } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { errMsg, truncateAddress } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

type Props = {
  estate: EstateData;
  /** Only ever rendered once the wallet is connected, so this is never null in practice. */
  account: UiWalletAccount;
  /**
   * Bumped by other surfaces (the heir tile's name link) to run this card's action: sign in
   * when locked, otherwise open the reminders dialog where the heir's name lives.
   */
  openRequest?: number;
};

/**
 * Owns the notifications card, its sign-in, and the reminders dialog for one estate.
 * Split out from EstateCard because useSignMessage() requires a concrete
 * wallet-standard account and must not be called when one isn't mounted.
 */
export const EstateNotifications: React.FC<Props> = ({ estate, account, openRequest = 0 }) => {
  const { t } = useTranslation("app");
  const { toast } = useToast();
  const signMessage = useSignMessage(account);

  const [notifSignInOpen, setNotifSignInOpen] = useState(false);
  const [notifEditOpen, setNotifEditOpen] = useState(false);

  // ─── Data ───────────────────────────────────────────────────────

  // Always try fetching — if the session cookie is still valid this succeeds silently.
  // If 401, the card shows "locked" and the user signs in.
  const remindersQuery = useReminders(estate.estatePda);
  const recipients = useMemo(() => remindersQuery.data?.recipients ?? [], [remindersQuery.data]);
  const heirProfile = remindersQuery.data?.heir ?? null;
  const hasSubscription = recipients.length > 0;

  const notifStatus: NotificationsCardStatus = (() => {
    if (remindersQuery.isPending) return "loading";
    if (remindersQuery.isError) {
      if (remindersQuery.error instanceof ApiError && remindersQuery.error.code === "FORBIDDEN") {
        return "error";
      }
      // 401 (no session) or network error — prompt sign-in
      return "locked";
    }
    if (!hasSubscription) return "off";
    return recipients.some((r) => !r.verified) ? "pending" : "authorized";
  })();

  // The heir's name from their profile; fall back to the truncated heir address.
  const heirFallback = truncateAddress(estate.heir, 4);
  const heirLabel = heirProfile?.heirName?.trim() || heirFallback;
  const notifSummary = summarizeReminders(recipients, heirLabel, t);

  // ─── Auth ───────────────────────────────────────────────────────

  const authMutation = useAuthenticate(signMessage);

  const handleNotifSign = async () => {
    try {
      await authMutation.mutateAsync({ address: account.address, encode: bs58.encode });
      await remindersQuery.refetch();
      setNotifSignInOpen(false);
      setNotifEditOpen(true);
    } catch (err) {
      setNotifSignInOpen(false);
      toast({
        title: t("notifications.signInFailed"),
        description: errMsg(err, t("notifications.signInFailedDesc")),
        variant: "destructive",
      });
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  const handleNotifAction = () => {
    if (notifStatus === "off" || notifStatus === "authorized" || notifStatus === "pending") {
      setNotifEditOpen(true);
      return;
    }
    setNotifSignInOpen(true);
  };

  const lastRequest = useRef(openRequest);
  useEffect(() => {
    if (openRequest === lastRequest.current) return;
    lastRequest.current = openRequest;
    handleNotifAction();
    // Only a new request should fire this, not a status change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest]);

  const notifSignMessage = t("notifications.signMessageBody", {
    estate: estate.estatePda,
    wallet: account.address,
  });

  return (
    <>
      <div className="col-span-full">
        <NotificationsCard
          status={notifStatus}
          summary={notifSummary}
          onAction={handleNotifAction}
        />
      </div>

      <NotificationsSignInPanel
        open={notifSignInOpen}
        message={notifSignMessage}
        signing={authMutation.isPending}
        onClose={() => setNotifSignInOpen(false)}
        onSign={handleNotifSign}
      />

      <NotificationsDialog
        open={notifEditOpen}
        estateAddress={estate.estatePda}
        heirFallback={heirFallback}
        onSessionExpired={() => {
          setNotifEditOpen(false);
          setNotifSignInOpen(true);
        }}
        onClose={() => setNotifEditOpen(false)}
      />
    </>
  );
};

export default EstateNotifications;
