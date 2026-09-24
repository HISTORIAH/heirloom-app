import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/surface/Modal";
import type { VerificationStatus } from "@/types/reminders";
import { telegramVerificationLink } from "@/types/reminders";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  open: boolean;
  verifications: VerificationStatus[];
  onClose: () => void;
}

/**
 * Shown after a successful save when the backend returns Telegram verifications.
 * Each verification contains a t.me deep-link the user must click to activate
 * the bot — without it we cannot send them messages.
 */
const TelegramVerifyPanel: React.FC<Props> = ({ open, verifications, onClose }) => {
  const { t } = useTranslation("app");

  const links = verifications
    .map((v) => ({ v, url: telegramVerificationLink(v) }))
    .filter((x): x is { v: VerificationStatus; url: string } => x.url !== undefined);

  if (links.length === 0) return null;

  return (
    <Modal
      open={open}
      cap={t("notifications.title")}
      title={t("notifications.telegramVerifyTitle")}
      description={t("notifications.telegramVerifyDesc")}
      size="sm"
      onClose={onClose}
      footer={
        <Button variant="flat-outline" className="flex-1 sm:flex-none" onClick={onClose}>
          {t("notifications.telegramVerifyLater")}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {links.map(({ v, url }) => (
          <a
            key={v.reminderRecipientId}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-tile-line bg-tile-soft px-4 py-3.5 transition-colors hover:border-foreground"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <Send className="h-4 w-4" strokeWidth={2} />
            </span>
            <p className="text-sm font-semibold">{t("notifications.telegramVerifyLink")}</p>
          </a>
        ))}
      </div>
    </Modal>
  );
};

export default TelegramVerifyPanel;
