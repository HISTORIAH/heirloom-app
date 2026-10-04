import { useState } from "react";
import { Check, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/surface/Modal";
import type { RecipientResponse, VerificationStatus } from "@/types/reminders";
import { sameEnum, telegramVerificationLink } from "@/types/reminders";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  open: boolean;
  verifications: VerificationStatus[];
  /** To tell the owner's link from the heir's. */
  recipients: RecipientResponse[];
  heirLabel: string;
  onClose: () => void;
}

/**
 * Shown after saving or resending a Telegram contact. The owner opens their own link; the heir's
 * link is copied to send on, because the bot only accepts a tap from the heir's own account.
 * The parent polls while this is open and closes it once every contact here is verified.
 */
const TelegramVerifyPanel: React.FC<Props> = ({
  open,
  verifications,
  recipients,
  heirLabel,
  onClose,
}) => {
  const { t } = useTranslation("app");
  const [copiedId, setCopiedId] = useState<string | undefined>();

  const links = verifications
    .map((v) => ({ v, url: telegramVerificationLink(v) }))
    .filter((x): x is { v: VerificationStatus; url: string } => x.url !== undefined);

  if (links.length === 0) return null;

  const isHeir = (id: string) =>
    recipients.some((r) => r.reminderRecipientId === id && sameEnum(r.role, "heir"));

  const copy = (id: string, url: string) => {
    void navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(undefined), 2000);
  };

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
        {links.map(({ v, url }) => {
          const heir = isHeir(v.reminderRecipientId);
          const copied = copiedId === v.reminderRecipientId;
          const Icon = heir ? (copied ? Check : Copy) : Send;
          const label = heir
            ? copied
              ? t("common.copied")
              : t("notifications.copyHeirLink", { name: heirLabel })
            : t("notifications.telegramVerifyLink");
          const className =
            "flex items-center gap-3 rounded-lg border border-tile-line bg-tile-soft px-4 py-3.5 text-left transition-colors hover:border-foreground";
          const body = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <p className="text-sm font-semibold">{label}</p>
            </>
          );
          return heir ? (
            <button
              key={v.reminderRecipientId}
              type="button"
              onClick={() => copy(v.reminderRecipientId, url)}
              className={className}
            >
              {body}
            </button>
          ) : (
            <a
              key={v.reminderRecipientId}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {body}
            </a>
          );
        })}
      </div>
    </Modal>
  );
};

export default TelegramVerifyPanel;
