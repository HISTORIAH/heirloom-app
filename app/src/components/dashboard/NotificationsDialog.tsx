import { useEffect, useState } from "react";
import { AlertTriangle, Check, Mail, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/surface/Modal";
import { cn } from "@/lib/utils";
import {
  EMAIL_PATTERN,
  HEIR_NAME_MAX,
  HEIR_NOTE_MAX,
  TELEGRAM_USERNAME_PATTERN,
  VERIFY_CODE_LENGTH,
  VERIFY_CODE_PATTERN,
} from "@/lib/constants";
import {
  cleanProfile,
  contactState,
  telegramHandle,
  type AddHandler,
  type ContactState,
  type HeirProfile,
  type RecipientResponse,
  type ReminderChannel,
  type ReminderRole,
} from "@/types/reminders";
import { useTranslation } from "@heirloom/i18n";

// ─── Channel config ───────────────────────────────────────────────

const CHANNEL_META: Record<
  ReminderChannel,
  { icon: typeof Mail; placeholderKey: string; invalidKey: string }
> = {
  email: {
    icon: Mail,
    placeholderKey: "notifications.placeholderEmail",
    invalidKey: "notifications.invalidEmail",
  },
  telegram: {
    icon: Send,
    placeholderKey: "notifications.placeholderTelegram",
    invalidKey: "notifications.invalidUsername",
  },
  sms: { icon: Send, placeholderKey: "", invalidKey: "" }, // not offered
  whatsapp: { icon: Send, placeholderKey: "", invalidKey: "" }, // not offered
};

function isValidDestination(channel: ReminderChannel, value: string): boolean {
  const trimmed = value.trim();
  if (channel === "email") return EMAIL_PATTERN.test(trimmed);
  if (channel === "telegram") return TELEGRAM_USERNAME_PATTERN.test(trimmed);
  return false;
}

function normalizeDestination(channel: ReminderChannel, value: string): string {
  if (channel === "telegram") return telegramHandle(value);
  return value.trim().toLowerCase();
}

/** Channels offered for a new contact, in picker order. SMS isn't delivered yet. */
const OFFERED_CHANNELS: ReminderChannel[] = ["email", "telegram"];

const channelLabelKey = (channel: ReminderChannel) =>
  channel === "email" ? "notifications.channelEmail" : "notifications.channelTelegram";

const EMPTY_PROFILE: HeirProfile = { heirName: null, ownerName: null, note: null };

/** "abcd 2345" → "ABCD2345", capped at the code length. */
const normalizeCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, VERIFY_CODE_LENGTH);

// ─── Email code entry ─────────────────────────────────────────────

type CodeEntryProps = {
  verifying: boolean;
  onVerify: (code: string) => Promise<string | undefined>;
};

/** Typed code for the owner's own email. Same endpoint as the link. */
function CodeEntry({ verifying, onVerify }: CodeEntryProps) {
  const { t } = useTranslation("app");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const valid = VERIFY_CODE_PATTERN.test(code);
  const malformed = code.length === VERIFY_CODE_LENGTH && !valid;

  const submit = async () => {
    setError(await onVerify(code));
  };

  return (
    <form
      className="mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !verifying) void submit();
      }}
    >
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="text"
          value={code}
          onChange={(e) => {
            setCode(normalizeCode(e.target.value));
            setError(undefined);
          }}
          maxLength={VERIFY_CODE_LENGTH}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="one-time-code"
          spellCheck={false}
          aria-label={t("notifications.codePlaceholder")}
          placeholder={t("notifications.codePlaceholder")}
          className="ed-input min-w-0 flex-1 font-mono tracking-[0.2em] placeholder:font-sans placeholder:tracking-normal"
        />
        <Button type="submit" variant="flat" size="sm" disabled={!valid || verifying}>
          {verifying ? t("verifyEmail.verifying") : t("notifications.verifyCode")}
        </Button>
      </div>
      {(malformed || error) && (
        <p className="mt-1.5 text-xs font-medium text-destructive">
          {error ?? t("verifyEmail.codeFormatHint")}
        </p>
      )}
    </form>
  );
}

// ─── Saved contact (read-only display) ────────────────────────────

type SavedContactProps = {
  contact: ContactState;
  role: ReminderRole;
  channel: ReminderChannel;
  heirLabel: string;
  resending: boolean;
  verifying: boolean;
  onResend: (recipientId: string) => void;
  onVerify: (code: string) => Promise<string | undefined>;
};

function SavedContact({
  contact,
  role,
  channel,
  heirLabel,
  resending,
  verifying,
  onResend,
  onVerify,
}: SavedContactProps) {
  const { t } = useTranslation("app");
  if (contact.kind === "none") return null;

  const meta = CHANNEL_META[channel];
  const Icon = meta.icon;
  const { recipient } = contact;
  // Heir emails get no code: the backend trusts them once the owner's own contact is verified.
  const heirEmail = role === "heir" && channel === "email";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-tile-line bg-tile-soft px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="truncate text-sm font-semibold">
            {channel === "telegram" && "@"}
            {recipient.destination}
          </span>
        </div>
        {contact.kind === "connected" ? (
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-green-700">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("notifications.connected")}
          </span>
        ) : heirEmail ? (
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {t("notifications.pendingBadge")}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
            {t("notifications.waitingVerification")}
          </span>
        )}
      </div>

      {contact.kind === "waiting" && heirEmail && (
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">
          {t("notifications.heirEmailPending", { name: heirLabel })}
        </p>
      )}

      {contact.kind === "waiting" && !heirEmail && (
        <div className="mt-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {channel === "telegram"
              ? t("notifications.unverifiedTelegram")
              : t("notifications.checkInboxDesc", { email: recipient.destination })}
          </p>
          {channel === "email" && <CodeEntry verifying={verifying} onVerify={onVerify} />}
          <button
            type="button"
            onClick={() => onResend(recipient.reminderRecipientId)}
            disabled={resending}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", resending && "animate-spin")} strokeWidth={2} />
            {t("notifications.resendVerification")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add contact form ─────────────────────────────────────────────

type AddContactFormProps = {
  role: ReminderRole;
  channel: ReminderChannel;
  heirLabel: string;
  /** The first contact turns reminders on, so it also asks for the heir profile. */
  askProfile: boolean;
  adding: boolean;
  onAdd: AddHandler;
  onCancel: () => void;
};

function AddContactForm({
  role,
  channel,
  heirLabel,
  askProfile,
  adding,
  onAdd,
  onCancel,
}: AddContactFormProps) {
  const { t } = useTranslation("app");
  const [value, setValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [profile, setProfile] = useState<HeirProfile>(EMPTY_PROFILE);
  const [confirming, setConfirming] = useState(false);

  const meta = CHANNEL_META[channel];
  const valid = isValidDestination(channel, value);

  // Heir email gets typed twice: it's never verified, so a typo means the alert goes nowhere.
  const needsDoubleEntry = channel === "email" && role === "heir";
  const confirmValid = needsDoubleEntry
    ? normalizeDestination(channel, value) === normalizeDestination(channel, confirmValue)
    : true;
  // The owner's name is required at setup, so the heir alert doesn't read as phishing.
  const profileValid = !askProfile || !!profile.ownerName?.trim();
  const canProceed = valid && confirmValid && profileValid;

  const handleSave = () => {
    const dest = normalizeDestination(channel, value);
    void onAdd(role, channel, dest, askProfile ? cleanProfile(profile) : undefined).then(
      onCancel,
      () => undefined,
    );
  };

  if (confirming) {
    const display = normalizeDestination(channel, value);
    const ownerName = profile.ownerName?.trim();
    return (
      <div>
        <p className="text-sm font-medium">
          {channel === "email"
            ? t("notifications.confirmEmail", { email: display })
            : t("notifications.confirmContact", { handle: display })}
        </p>
        {askProfile && ownerName && (
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">
            {t("notifications.ownerNameLabel")} <span className="text-foreground">{ownerName}</span>
          </p>
        )}
        {needsDoubleEntry && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {t("notifications.heirEmailWarning", { name: heirLabel })}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            variant="flat-outline"
            size="sm"
            disabled={adding}
            onClick={() => setConfirming(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button variant="flat" size="sm" disabled={adding} onClick={handleSave}>
            {adding ? t("notifications.saving") : t("notifications.saveContact")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canProceed) setConfirming(true);
      }}
    >
      <input
        type={channel === "email" ? "email" : "text"}
        autoFocus
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t(meta.placeholderKey)}
        aria-label={t(channelLabelKey(channel))}
        className="ed-input"
      />
      {value.length > 0 && !valid && (
        <p className="mt-1.5 text-xs font-medium text-destructive">{t(meta.invalidKey)}</p>
      )}

      {needsDoubleEntry && (
        <>
          <input
            type="email"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            // The point is typing it twice: no pasting the first field into the second.
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            placeholder={t("notifications.confirmEmailPlaceholder")}
            aria-label={t("notifications.confirmEmailPlaceholder")}
            className="ed-input mt-2"
          />
          {confirmValue.length > 0 && !confirmValid && (
            <p className="mt-1.5 text-xs font-medium text-destructive">
              {t("notifications.emailMismatch")}
            </p>
          )}
          <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {t("notifications.heirEmailWarning", { name: heirLabel })}
          </p>
        </>
      )}

      {channel === "telegram" && role === "heir" && (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-700">
          <Send className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          {t("notifications.heirTelegramWarning", { name: heirLabel })}
        </p>
      )}

      {askProfile && (
        <div className="mt-4 rounded-lg border border-tile-line p-3.5">
          <p className="text-sm font-semibold">{t("notifications.heirProfileSetupTitle")}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {t("notifications.heirProfileDesc")}
          </p>
          <div className="mt-3">
            <ProfileFields idPrefix={`setup-${role}`} value={profile} onChange={setProfile} />
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button type="button" variant="flat-outline" size="sm" disabled={adding} onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" variant="flat" size="sm" disabled={!canProceed}>
          {t("common.confirm")}
        </Button>
      </div>
    </form>
  );
}

// ─── Channel picker (shown when adding a new contact) ─────────────

function ChannelPicker({
  channels,
  onPick,
  onCancel,
}: {
  channels: ReminderChannel[];
  onPick: (channel: ReminderChannel) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("app");
  return (
    <div className="flex flex-wrap gap-2">
      {channels.map((channel) => {
        const Icon = CHANNEL_META[channel].icon;
        return (
          <Button key={channel} variant="flat-outline" size="sm" onClick={() => onPick(channel)}>
            <Icon className="h-3.5 w-3.5" />
            {t(channelLabelKey(channel))}
          </Button>
        );
      })}
      <Button variant="ghost" size="sm" onClick={onCancel}>
        {t("common.cancel")}
      </Button>
    </div>
  );
}

// ─── Role section ─────────────────────────────────────────────────

type RoleSectionProps = {
  role: ReminderRole;
  title: string;
  description: string;
  recipients: RecipientResponse[];
  heirLabel: string;
  askProfile: boolean;
  addingRole?: ReminderRole;
  addingChannel?: ReminderChannel;
  resendingId?: string;
  verifying: boolean;
  onAdd: AddHandler;
  onResend: (recipientId: string) => void;
  onVerify: (code: string) => Promise<string | undefined>;
};

function RoleSection({
  role,
  title,
  description,
  recipients,
  heirLabel,
  askProfile,
  addingRole,
  addingChannel,
  resendingId,
  verifying,
  onAdd,
  onResend,
  onVerify,
}: RoleSectionProps) {
  const { t } = useTranslation("app");
  const [picking, setPicking] = useState(false);
  const [formChannel, setFormChannel] = useState<ReminderChannel | null>(null);

  const contacts = OFFERED_CHANNELS.map((channel) => ({
    channel,
    state: contactState(recipients, role, channel),
  }));
  const free = contacts.filter((c) => c.state.kind === "none").map((c) => c.channel);
  const hasAnyContact = free.length < OFFERED_CHANNELS.length;
  const adding = addingRole === role;

  const reset = () => {
    setPicking(false);
    setFormChannel(null);
  };

  // One channel left: skip the picker and go straight to its form.
  const startAdding = () => {
    if (free.length === 1) setFormChannel(free[0]);
    else setPicking(true);
  };

  return (
    <div className="py-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{description}</p>

      <div className="mt-3 space-y-2.5">
        {contacts.map(({ channel, state }) => (
          <SavedContact
            key={channel}
            contact={state}
            role={role}
            channel={channel}
            heirLabel={heirLabel}
            resending={
              state.kind === "waiting" && resendingId === state.recipient.reminderRecipientId
            }
            verifying={verifying}
            onResend={onResend}
            onVerify={onVerify}
          />
        ))}

        {free.length > 0 && !picking && !formChannel && (
          <Button variant="flat-outline" size="sm" onClick={startAdding}>
            {hasAnyContact && free.length === 1
              ? t("notifications.addChannel", { channel: t(channelLabelKey(free[0])) })
              : t("notifications.add")}
          </Button>
        )}

        {picking && (
          <ChannelPicker
            channels={free}
            onPick={(ch) => {
              setFormChannel(ch);
              setPicking(false);
            }}
            onCancel={reset}
          />
        )}

        {formChannel && (
          <AddContactForm
            role={role}
            channel={formChannel}
            heirLabel={heirLabel}
            askProfile={askProfile}
            adding={adding && addingChannel === formChannel}
            onAdd={onAdd}
            onCancel={reset}
          />
        )}
      </div>
    </div>
  );
}

// ─── Heir profile section ─────────────────────────────────────────

type HeirProfileSectionProps = {
  heir: HeirProfile | null;
  saving: boolean;
  onSave: (profile: HeirProfile) => Promise<void>;
};

function HeirProfileSection({ heir, saving, onSave }: HeirProfileSectionProps) {
  const { t } = useTranslation("app");
  const [draft, setDraft] = useState<HeirProfile>(heir ?? EMPTY_PROFILE);
  const [editing, setEditing] = useState(false);

  // From what's saved, not the draft: that's what the heir would get today.
  const showGenericWarning = !heir?.heirName?.trim() || !heir?.ownerName?.trim();
  const hasSavedData = !!(heir?.heirName || heir?.ownerName || heir?.note);

  const handleSave = async () => {
    // PUT replaces all three fields, so always send every one; blank clears.
    await onSave(cleanProfile(draft));
    setEditing(false);
  };

  const cancel = () => {
    setDraft(heir ?? EMPTY_PROFILE);
    setEditing(false);
  };

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t("notifications.heirProfileTitle")}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {t("notifications.heirProfileDesc")}
          </p>
        </div>
        {!editing && (
          <Button
            variant="flat-outline"
            size="sm"
            onClick={() => {
              setDraft(heir ?? EMPTY_PROFILE);
              setEditing(true);
            }}
          >
            {hasSavedData ? t("notifications.edit") : t("notifications.add")}
          </Button>
        )}
      </div>

      {showGenericWarning && (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          {t("notifications.genericMessageWarning")}
        </p>
      )}

      {!editing && hasSavedData && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-tile-line bg-tile-soft px-3.5 py-2.5">
          {heir?.heirName && (
            <ProfileRow label={t("notifications.heirNameLabel")} value={heir.heirName} />
          )}
          {heir?.ownerName && (
            <ProfileRow label={t("notifications.ownerNameLabel")} value={heir.ownerName} />
          )}
          {heir?.note && <ProfileRow label={t("notifications.noteLabel")} value={heir.note} />}
        </div>
      )}

      {editing && (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving) void handleSave().catch(() => undefined);
          }}
        >
          <ProfileFields idPrefix="settings" value={draft} onChange={setDraft} disabled={saving} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="flat-outline"
              size="sm"
              disabled={saving}
              onClick={cancel}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="flat" size="sm" disabled={saving}>
              {saving ? t("notifications.saving") : t("notifications.saveHeirProfile")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/** The three heir profile fields. Shared by the setup form and the settings section. */
function ProfileFields({
  idPrefix,
  value,
  onChange,
  disabled,
}: {
  idPrefix: string;
  value: HeirProfile;
  onChange: (next: HeirProfile) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation("app");
  const note = value.note ?? "";
  return (
    <div className="space-y-3">
      <ProfileInput
        id={`${idPrefix}-owner-name`}
        label={t("notifications.ownerNameLabel")}
        value={value.ownerName ?? ""}
        onChange={(ownerName) => onChange({ ...value, ownerName })}
        maxLength={HEIR_NAME_MAX}
        placeholder={t("notifications.ownerNamePlaceholder")}
        required
        disabled={disabled}
        hint={t("notifications.ownerNameHint")}
      />
      <ProfileInput
        id={`${idPrefix}-heir-name`}
        label={t("notifications.heirNameLabel")}
        value={value.heirName ?? ""}
        onChange={(heirName) => onChange({ ...value, heirName })}
        maxLength={HEIR_NAME_MAX}
        placeholder={t("notifications.heirNamePlaceholder")}
        disabled={disabled}
      />
      <div>
        <label className="ed-field-label" htmlFor={`${idPrefix}-note`}>
          {t("notifications.noteLabel")}
        </label>
        <textarea
          id={`${idPrefix}-note`}
          value={note}
          onChange={(e) => onChange({ ...value, note: e.target.value.slice(0, HEIR_NOTE_MAX) })}
          maxLength={HEIR_NOTE_MAX}
          rows={3}
          disabled={disabled}
          className="ed-input mt-1 resize-none"
          placeholder={t("notifications.notePlaceholder")}
        />
        <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
          {t("notifications.noteCharCount", { count: note.length, max: HEIR_NOTE_MAX })}
        </p>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="whitespace-pre-line break-words font-semibold">{value}</span>
    </p>
  );
}

type ProfileInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
};

function ProfileInput({
  id,
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  required,
  disabled,
  hint,
}: ProfileInputProps) {
  return (
    <div>
      <label className="ed-field-label" htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        maxLength={maxLength}
        disabled={disabled}
        className="ed-input mt-1"
        placeholder={placeholder}
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────

type Props = {
  open: boolean;
  heirLabel: string;
  recipients: RecipientResponse[];
  heir: HeirProfile | null;
  addingRole?: ReminderRole;
  addingChannel?: ReminderChannel;
  savingHeir: boolean;
  resendingId?: string;
  verifying: boolean;
  onAdd: AddHandler;
  onResend: (recipientId: string) => void;
  /** Resolves with an error message, or undefined once the code is accepted. */
  onVerify: (code: string) => Promise<string | undefined>;
  onSaveHeir: (profile: HeirProfile) => Promise<void>;
  onClose: () => void;
};

/** Reminder contacts and heir profile for one estate. Each contact saves on its own. */
const NotificationsDialog: React.FC<Props> = ({
  open,
  heirLabel,
  recipients,
  heir,
  addingRole,
  addingChannel,
  savingHeir,
  resendingId,
  verifying,
  onAdd,
  onResend,
  onVerify,
  onSaveHeir,
  onClose,
}) => {
  const { t } = useTranslation("app");
  // Remount on open so half-typed values don't linger between visits.
  const [session, setSession] = useState(0);
  useEffect(() => {
    if (open) setSession((n) => n + 1);
  }, [open]);

  // No contacts means no subscription yet: the first contact creates it, with the heir
  // profile, and the profile can't be saved on its own until then (PUT 404s).
  const hasSubscription = recipients.length > 0;
  const shared = {
    recipients,
    heirLabel,
    askProfile: !hasSubscription,
    addingRole,
    addingChannel,
    resendingId,
    verifying,
    onAdd,
    onResend,
    onVerify,
  };

  return (
    <Modal
      open={open}
      cap={t("notifications.title")}
      title={t("notifications.dialogTitle")}
      description={t("notifications.dialogLead")}
      size="lg"
      busy={addingRole !== undefined || savingHeir}
      onClose={onClose}
      footer={
        <Button variant="flat" className="flex-1 sm:flex-none" onClick={onClose}>
          {t("common.close")}
        </Button>
      }
    >
      <div key={session} className="divide-y divide-tile-line">
        <RoleSection
          role="checkInSigner"
          title={t("notifications.remindCheckIn")}
          description={t("notifications.remindCheckInDesc")}
          {...shared}
        />
        <RoleSection
          role="heir"
          title={t("notifications.notifyName", { name: heirLabel })}
          description={t("notifications.notifyWhenClaimable")}
          {...shared}
        />
        {hasSubscription && (
          <HeirProfileSection heir={heir} saving={savingHeir} onSave={onSaveHeir} />
        )}
      </div>
    </Modal>
  );
};

export default NotificationsDialog;
