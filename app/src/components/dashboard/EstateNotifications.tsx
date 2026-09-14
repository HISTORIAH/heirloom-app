import { useState } from "react";
import { useSignMessage } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/ui";
import bs58 from "bs58";
import type { EstateData } from "@/contexts/VaultContext";
import { requestChallenge, verifyChallenge } from "@/services/api/auth";
import NotificationsCard from "@/components/dashboard/NotificationsCard";
import NotificationsSignInPanel from "@/components/dashboard/NotificationsSignInPanel";
import NotificationsDialog from "@/components/dashboard/NotificationsDialog";
import {
  defaultNotificationsConfig,
  summarizeNotifications,
  type NotificationsCardStatus,
  type NotificationsConfig,
} from "@/types/notifications";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  estate: EstateData;
  /** Only ever rendered once the wallet is connected, so this is never null in practice. */
  account: UiWalletAccount;
}

const textEncoder = new TextEncoder();

/**
 * Owns the notifications card + its sign-in / edit dialogs for one estate.
 * Split out from EstateCard because useSignMessage() requires a concrete
 * wallet-standard account and must not be called when one isn't mounted.
 */
export const EstateNotifications: React.FC<Props> = ({ estate, account }) => {
  const { t } = useTranslation("app");
  const signMessage = useSignMessage(account);

  const [notifStatus, setNotifStatus] = useState<NotificationsCardStatus>("locked");
  const [notifSummary, setNotifSummary] = useState<string | undefined>(undefined);
  const [notifConfig, setNotifConfig] = useState<NotificationsConfig>(defaultNotificationsConfig());
  const [notifSignInOpen, setNotifSignInOpen] = useState(false);
  const [notifEditOpen, setNotifEditOpen] = useState(false);
  const [notifSigning, setNotifSigning] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  const handleNotifAction = () => {
    if (notifStatus === "authorized") {
      setNotifEditOpen(true);
      return;
    }
    setNotifSignInOpen(true);
  };

  const handleNotifSign = async () => {
    setNotifSigning(true);
    try {
      const challengeMessage = await requestChallenge(account.address);
      const { signature } = await signMessage({ message: textEncoder.encode(challengeMessage) });
      await verifyChallenge(account.address, bs58.encode(signature));
      setNotifSignInOpen(false);
      setNotifStatus("authorized");
      setNotifEditOpen(true);
    } catch {
      setNotifSignInOpen(false);
      setNotifStatus("error");
    } finally {
      setNotifSigning(false);
    }
  };

  // TODO: replace with a real save call (services/api/reminders saveNotifications) once
  // recipients get mapped from this creator/heir shape to the backend's flat list.
  const handleNotifSave = (next: NotificationsConfig) => {
    setNotifSaving(true);
    setTimeout(() => {
      setNotifSaving(false);
      setNotifConfig(next);
      setNotifEditOpen(false);
      setNotifSummary(summarizeNotifications(next, estate.label, t));
    }, 400);
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
        signing={notifSigning}
        onClose={() => setNotifSignInOpen(false)}
        onSign={handleNotifSign}
      />

      <NotificationsDialog
        open={notifEditOpen}
        heirLabel={estate.label}
        initialConfig={notifConfig}
        saving={notifSaving}
        onClose={() => setNotifEditOpen(false)}
        onSave={handleNotifSave}
      />
    </>
  );
};

export default EstateNotifications;
