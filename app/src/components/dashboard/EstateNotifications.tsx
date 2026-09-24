import { useMemo, useState } from "react";
import { useSignMessage } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/ui";
import bs58 from "bs58";
import type { EstateData } from "@/contexts/VaultContext";
import NotificationsCard from "@/components/dashboard/NotificationsCard";
import NotificationsSignInPanel from "@/components/dashboard/NotificationsSignInPanel";
import NotificationsDialog from "@/components/dashboard/NotificationsDialog";
import TelegramVerifyPanel from "@/components/dashboard/TelegramVerifyPanel";
import {
  defaultNotificationsConfig,
  normalizeChannel,
  notificationsConfigFromRecipients,
  summarizeNotifications,
  toAddRecipientRequests,
  type NotificationsCardStatus,
  type NotificationsConfig,
  type VerificationStatus,
} from "@/types/reminders";
import {
  useReminders,
  useSaveReminder,
  useAddContact,
  useResendVerification,
} from "@/hooks/useReminders";
import { useAuthenticate } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  estate: EstateData;
  /** Only ever rendered once the wallet is connected, so this is never null in practice. */
  account: UiWalletAccount;
}

/**
 * Owns the notifications card + its sign-in / edit dialogs for one estate.
 * Split out from EstateCard because useSignMessage() requires a concrete
 * wallet-standard account and must not be called when one isn't mounted.
 */
export const EstateNotifications: React.FC<Props> = ({ estate, account }) => {
  const { t } = useTranslation("app");
  const { toast } = useToast();
  const signMessage = useSignMessage(account);

  const [notifSignInOpen, setNotifSignInOpen] = useState(false);
  const [notifEditOpen, setNotifEditOpen] = useState(false);
  const [tgVerifyOpen, setTgVerifyOpen] = useState(false);
  const [saveVerifications, setSaveVerifications] = useState<VerificationStatus[]>([]);
  const [resendingId, setResendingId] = useState<string | undefined>();
  // ─── Data ───────────────────────────────────────────────────────

  // Always try fetching — if the session cookie is still valid this succeeds silently.
  // If 401, the card shows "locked" and the user signs in.
  const remindersQuery = useReminders(estate.estatePda);
  const hasSubscription = (remindersQuery.data?.recipients.length ?? 0) > 0;

  // Rebuilt from the server's saved recipients whenever they change — the dialog and
  // card summary always reflect what's actually saved, never stale local edits.
  const notifConfig = useMemo(
    () =>
      remindersQuery.data
        ? notificationsConfigFromRecipients(remindersQuery.data.recipients)
        : defaultNotificationsConfig(),
    [remindersQuery.data],
  );

  const notifStatus: NotificationsCardStatus = (() => {
    if (remindersQuery.isPending) return "loading";
    if (remindersQuery.isError) {
      if (remindersQuery.error instanceof ApiError && remindersQuery.error.code === "FORBIDDEN") {
        return "error";
      }
      // 401 (no session) or network error — prompt sign-in
      return "locked";
    }
    return "authorized";
  })();

  const notifSummary =
    remindersQuery.data && hasSubscription
      ? summarizeNotifications(notifConfig, estate.label, t)
      : undefined;

  // ─── Auth ───────────────────────────────────────────────────────

  const authMutation = useAuthenticate(signMessage);

  const handleNotifSign = async () => {
    try {
      await authMutation.mutateAsync({ address: account.address, encode: bs58.encode });
      // Refetch reminders with the new session cookie.
      // If none exist, open the edit dialog so the user can create them.
      const result = await remindersQuery.refetch();
      setNotifSignInOpen(false);
      if (!result.data || result.data.recipients.length === 0) {
        setNotifEditOpen(true);
      }
    } catch (err) {
      setNotifSignInOpen(false);
      toast({
        title: t("notifications.signInFailed"),
        description: errMsg(err, t("notifications.signInFailedDesc")),
        variant: "destructive",
      });
    }
  };

  // ─── Save ───────────────────────────────────────────────────────

  const saveMutation = useSaveReminder(estate.estatePda);
  const addContactMutation = useAddContact(estate.estatePda);
  const resendMutation = useResendVerification(estate.estatePda);
  const notifSaving = saveMutation.isPending || addContactMutation.isPending;

  const handleNotifSave = async (next: NotificationsConfig) => {
    const recipients = toAddRecipientRequests(next);
    try {
      let verifications: VerificationStatus[] | undefined;
      if (hasSubscription) {
        const res = await addContactMutation.mutateAsync({ recipients });
        verifications = res.verifications;
      } else {
        const res = await saveMutation.mutateAsync({ estateKind: "heirloom", recipients });
        verifications = res.verifications;
      }
      setSaveVerifications(verifications ?? []);
      setNotifEditOpen(false);
      if (verifications?.some((v) => normalizeChannel(v.channel) === "telegram")) {
        setTgVerifyOpen(true);
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "unauthorized") {
        // Session expired — prompt re-sign instead of showing error
        setNotifEditOpen(false);
        setNotifSignInOpen(true);
      } else {
        toast({
          title: t("notifications.saveFailed"),
          description: errMsg(err, t("notifications.saveFailedDesc")),
          variant: "destructive",
        });
      }
    }
  };

  // ─── Resend verification ────────────────────────────────────────

  const handleResend = async (recipientId: string) => {
    setResendingId(recipientId);
    try {
      const status = await resendMutation.mutateAsync({ recipientId });
      setSaveVerifications([status]);
      setNotifEditOpen(false);
      if (normalizeChannel(status.channel) === "telegram") {
        setTgVerifyOpen(true);
      }
    } catch (err) {
      toast({
        title: t("notifications.resendFailed"),
        description: errMsg(err, t("notifications.resendFailedDesc")),
        variant: "destructive",
      });
    } finally {
      setResendingId(undefined);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  const handleNotifAction = () => {
    if (notifStatus === "authorized") {
      setNotifEditOpen(true);
      return;
    }
    setNotifSignInOpen(true);
  };

  const notifSignMessage = t("notifications.signMessageBody", {
    estate: estate.estatePda,
    wallet: account.address,
  });

  return (
    <>
      <div className="lg:col-span-12">
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
        heirLabel={estate.label}
        initialConfig={notifConfig}
        saving={notifSaving}
        resendingId={resendingId}
        onResend={handleResend}
        onClose={() => setNotifEditOpen(false)}
        onSave={handleNotifSave}
      />

      <TelegramVerifyPanel
        open={tgVerifyOpen}
        verifications={saveVerifications}
        onClose={() => setTgVerifyOpen(false)}
      />
    </>
  );
};

export default EstateNotifications;
