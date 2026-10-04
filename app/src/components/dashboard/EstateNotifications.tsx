import { useEffect, useMemo, useState } from "react";
import { useSignMessage } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/ui";
import bs58 from "bs58";
import type { EstateData } from "@/contexts/VaultContext";
import NotificationsCard from "@/components/dashboard/NotificationsCard";
import NotificationsSignInPanel from "@/components/dashboard/NotificationsSignInPanel";
import NotificationsDialog from "@/components/dashboard/NotificationsDialog";
import TelegramVerifyPanel from "@/components/dashboard/TelegramVerifyPanel";
import {
  summarizeReminders,
  telegramHandle,
  type NotificationsCardStatus,
  type ReminderRole,
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
import { errMsg, truncateAddress } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  estate: EstateData;
  /** Only ever rendered once the wallet is connected, so this is never null in practice. */
  account: UiWalletAccount;
}

const isConflict = (err: unknown) => err instanceof ApiError && err.code === "CONFLICT";

/**
 * Owns the notifications card + its sign-in / contacts / verify dialogs for one estate.
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
  const [addingRole, setAddingRole] = useState<ReminderRole | undefined>();
  const [resendingId, setResendingId] = useState<string | undefined>();

  // ─── Data ───────────────────────────────────────────────────────

  // Always try fetching — if the session cookie is still valid this succeeds silently.
  // If 401, the card shows "locked" and the user signs in. Polls while a link is open.
  const remindersQuery = useReminders(estate.estatePda, { poll: tgVerifyOpen });
  const recipients = useMemo(() => remindersQuery.data?.recipients ?? [], [remindersQuery.data]);
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

  // Name comes from the backend; fall back to the truncated heir address
  const heirLabel = estate.label ?? truncateAddress(estate.heir, 4);
  const notifSummary = summarizeReminders(recipients, heirLabel, t);

  // Close the verify panel once every contact it shows is verified.
  useEffect(() => {
    if (!tgVerifyOpen || saveVerifications.length === 0) return;
    const done = saveVerifications.every((v) =>
      recipients.some((r) => r.reminderRecipientId === v.reminderRecipientId && r.verified),
    );
    if (done) {
      setTgVerifyOpen(false);
      toast({ title: t("notifications.connected") });
    }
  }, [tgVerifyOpen, saveVerifications, recipients, toast, t]);

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

  const sessionExpired = (err: unknown) => {
    if (!(err instanceof ApiError && err.code === "unauthorized")) return false;
    setNotifEditOpen(false);
    setNotifSignInOpen(true);
    return true;
  };

  // ─── Add a contact ──────────────────────────────────────────────

  const saveMutation = useSaveReminder(estate.estatePda);
  const addContactMutation = useAddContact(estate.estatePda);
  const resendMutation = useResendVerification(estate.estatePda);

  /** First contact creates the subscription; later ones are added to it. Rejects on failure. */
  const handleAdd = async (role: ReminderRole, username: string) => {
    const recipient = { channel: "telegram" as const, destination: telegramHandle(username), role };
    const viaAdd = async () =>
      (await addContactMutation.mutateAsync({ recipient })).verifications;
    setAddingRole(role);
    try {
      let verifications: VerificationStatus[];
      if (hasSubscription) {
        verifications = await viaAdd();
      } else {
        try {
          verifications = (
            await saveMutation.mutateAsync({ estateKind: "heirloom", recipients: [recipient] })
          ).verifications;
        } catch (err) {
          // The estate already has a subscription we didn't see: add to it instead.
          if (!isConflict(err)) throw err;
          verifications = await viaAdd();
        }
      }
      // Empty verifications: the contact exists but the link failed; its row offers resend.
      if (verifications.length > 0) {
        setSaveVerifications(verifications);
        setNotifEditOpen(false);
        setTgVerifyOpen(true);
      }
    } catch (err) {
      if (!sessionExpired(err)) {
        toast({
          title: t("notifications.saveFailed"),
          description: errMsg(err, t("notifications.saveFailedDesc")),
          variant: "destructive",
        });
      }
      throw err;
    } finally {
      setAddingRole(undefined);
    }
  };

  // ─── Resend verification ────────────────────────────────────────

  const handleResend = async (recipientId: string) => {
    setResendingId(recipientId);
    try {
      const status = await resendMutation.mutateAsync({ recipientId });
      setSaveVerifications([status]);
      setNotifEditOpen(false);
      setTgVerifyOpen(true);
    } catch (err) {
      if (isConflict(err)) {
        // Verified in the meantime; the list re-fetches and shows it.
        toast({ title: t("notifications.alreadyConnected") });
      } else if (!sessionExpired(err)) {
        toast({
          title: t("notifications.resendFailed"),
          description: errMsg(err, t("notifications.resendFailedDesc")),
          variant: "destructive",
        });
      }
    } finally {
      setResendingId(undefined);
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

  const notifSignMessage = t("notifications.signMessageBody", {
    estate: estate.estatePda,
    wallet: account.address,
  });

  return (
    <>
      <div className="lg:col-span-12">
        <NotificationsCard status={notifStatus} summary={notifSummary} onAction={handleNotifAction} />
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
        heirLabel={heirLabel}
        recipients={recipients}
        addingRole={addingRole}
        resendingId={resendingId}
        onAdd={handleAdd}
        onResend={(id) => void handleResend(id)}
        onClose={() => setNotifEditOpen(false)}
      />

      <TelegramVerifyPanel
        open={tgVerifyOpen}
        verifications={saveVerifications}
        recipients={recipients}
        heirLabel={heirLabel}
        onClose={() => setTgVerifyOpen(false)}
      />
    </>
  );
};

export default EstateNotifications;
