import { useEffect, useState } from "react";
import { AlertTriangle, Check, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/surface/Modal";
import { cn } from "@/lib/utils";
import { TELEGRAM_USERNAME_PATTERN } from "@/lib/constants";
import {
  contactState,
  telegramHandle,
  type ContactState,
  type RecipientResponse,
  type ReminderRole,
} from "@/types/reminders";
import { useTranslation } from "@heirloom/i18n";

interface RoleRowProps {
  role: ReminderRole;
  title: string;
  description: string;
  contact: ContactState;
  heirLabel: string;
  adding: boolean;
  resending: boolean;
  onAdd: (role: ReminderRole, username: string) => Promise<void>;
  onResend: (recipientId: string) => void;
}

/**
 * One role. A saved contact is read-only (the backend can't edit or remove it yet) and shows
 * whether it's verified; an empty role offers Add, with a confirm step before saving.
 */
const RoleRow: React.FC<RoleRowProps> = ({
  role,
  title,
  description,
  contact,
  heirLabel,
  adding,
  resending,
  onAdd,
  onResend,
}) => {
  const { t } = useTranslation("app");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [value, setValue] = useState("");
  const valid = TELEGRAM_USERNAME_PATTERN.test(value.trim());

  const reset = () => {
    setEditing(false);
    setConfirming(false);
    setValue("");
  };

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{description}</p>
        </div>
        {contact.kind === "none" && !editing && (
          <Button variant="flat-outline" size="sm" onClick={() => setEditing(true)}>
            {t("notifications.add")}
          </Button>
        )}
      </div>

      {contact.kind !== "none" && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-tile-line bg-tile-soft px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Send className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="truncate text-sm font-semibold">@{contact.recipient.destination}</span>
          </div>
          {contact.kind === "connected" ? (
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-green-700">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t("notifications.connected")}
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
              {t("notifications.waitingTelegram")}
            </span>
          )}
        </div>
      )}

      {contact.kind === "waiting" && (
        <div className="mt-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("notifications.unverifiedTelegram")}
          </p>
          <button
            type="button"
            onClick={() => onResend(contact.recipient.reminderRecipientId)}
            disabled={resending}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", resending && "animate-spin")} strokeWidth={2} />
            {t("notifications.resendVerification")}
          </button>
        </div>
      )}

      {contact.kind === "none" && editing && (
        <div className="mt-3">
          {confirming ? (
            <p className="text-sm font-medium">
              {t("notifications.confirmContact", { handle: telegramHandle(value) })}
            </p>
          ) : (
            <>
              <input
                type="text"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t("notifications.placeholderTelegram")}
                className="ed-input"
              />
              {value.length > 0 && !valid && (
                <p className="mt-1.5 text-xs font-medium text-destructive">
                  {t("notifications.invalidUsername")}
                </p>
              )}
              {role === "heir" && (
                <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-700">
                  <Send className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {t("notifications.heirTelegramWarning", { name: heirLabel })}
                </p>
              )}
            </>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              variant="flat-outline"
              size="sm"
              disabled={adding}
              onClick={() => (confirming ? setConfirming(false) : reset())}
            >
              {t("common.cancel")}
            </Button>
            {confirming ? (
              <Button
                variant="flat"
                size="sm"
                disabled={adding}
                onClick={() => void onAdd(role, value).then(reset, () => undefined)}
              >
                {adding ? t("notifications.saving") : t("notifications.saveContact")}
              </Button>
            ) : (
              <Button variant="flat" size="sm" disabled={!valid} onClick={() => setConfirming(true)}>
                {t("common.confirm")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface Props {
  open: boolean;
  heirLabel: string;
  recipients: RecipientResponse[];
  /** The role whose contact is being saved right now. */
  addingRole?: ReminderRole;
  resendingId?: string;
  /** Rejects on failure so the row keeps what was typed. */
  onAdd: (role: ReminderRole, username: string) => Promise<void>;
  onResend: (recipientId: string) => void;
  onClose: () => void;
}

/** Telegram reminders for one estate. Each contact saves on its own; there's no bulk save. */
const NotificationsDialog: React.FC<Props> = ({
  open,
  heirLabel,
  recipients,
  addingRole,
  resendingId,
  onAdd,
  onResend,
  onClose,
}) => {
  const { t } = useTranslation("app");
  // Remount rows on open so a half-typed username doesn't linger between visits.
  const [session, setSession] = useState(0);
  useEffect(() => {
    if (open) setSession((n) => n + 1);
  }, [open]);

  const self = contactState(recipients, "check_in_signer");
  const heir = contactState(recipients, "heir");

  return (
    <Modal
      open={open}
      cap={t("notifications.title")}
      title={t("notifications.dialogTitle")}
      description={t("notifications.dialogLead")}
      size="lg"
      busy={addingRole !== undefined}
      onClose={onClose}
      footer={
        <Button variant="flat" className="flex-1 sm:flex-none" onClick={onClose}>
          {t("common.close")}
        </Button>
      }
    >
      <div key={session} className="divide-y divide-tile-line">
        <RoleRow
          role="check_in_signer"
          title={t("notifications.remindCheckIn")}
          description={t("notifications.remindCheckInDesc")}
          contact={self}
          heirLabel={heirLabel}
          adding={addingRole === "check_in_signer"}
          resending={self.kind === "waiting" && resendingId === self.recipient.reminderRecipientId}
          onAdd={onAdd}
          onResend={onResend}
        />
        <RoleRow
          role="heir"
          title={t("notifications.notifyName", { name: heirLabel })}
          description={t("notifications.notifyWhenClaimable")}
          contact={heir}
          heirLabel={heirLabel}
          adding={addingRole === "heir"}
          resending={heir.kind === "waiting" && resendingId === heir.recipient.reminderRecipientId}
          onAdd={onAdd}
          onResend={onResend}
        />
      </div>
    </Modal>
  );
};

export default NotificationsDialog;
