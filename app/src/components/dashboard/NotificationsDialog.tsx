import { useState, type ReactNode } from "react";
import { Bell, Check, Mail, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/surface/Modal";
import AlertPreview from "@/components/reminders/AlertPreview";
import ContactFields from "@/components/reminders/ContactFields";
import ReminderTimeline from "@/components/reminders/ReminderTimeline";
import VerifyStage from "@/components/reminders/VerifyStage";
import { useToast } from "@/hooks/use-toast";
import {
  useReminders,
  useResendVerification,
  useSaveReminders,
  useVerifyEmail,
} from "@/hooks/useReminders";
import { ApiError, isUnauthorized } from "@/lib/api";
import { HEIR_NAME_MAX, HEIR_NOTE_MAX } from "@/lib/constants";
import {
  channelOf,
  draftBlank,
  draftProblem,
  normalizeDestination,
  pendingFrom,
  roleOf,
  verifyErrorKey,
} from "@/lib/reminders";
import { cn, errMsg } from "@/lib/utils";
import {
  cleanProfile,
  contactState,
  type AddRecipientRequest,
  type ContactDraft,
  type ContactState,
  type HeirProfile,
  type PendingVerification,
  type ReminderChannel,
  type ReminderRole,
  type RemindersStage,
} from "@/types/reminders";
import { useTranslation } from "@heirloom/i18n";

const ROLES: ReminderRole[] = ["checkInSigner", "heir"];
/** Channels a contact can be added on, in tab order. SMS isn't delivered yet. */
const OFFERED_CHANNELS: ReminderChannel[] = ["telegram", "email"];
const EMPTY_PROFILE: HeirProfile = { heirName: null, ownerName: null, note: null };

const blankDraft = (channel: ReminderChannel = "telegram"): ContactDraft => ({
  channel,
  value: "",
  again: "",
});

function sameProfile(a: HeirProfile, b: HeirProfile): boolean {
  const x = cleanProfile(a);
  const y = cleanProfile(b);
  return x.heirName === y.heirName && x.ownerName === y.ownerName && x.note === y.note;
}

const channelLabelKey = (channel: ReminderChannel) =>
  channel === "email" ? "notifications.channelEmail" : "notifications.channelTelegram";

// ─── Pieces ───────────────────────────────────────────────────────

/** One numbered card on the form. The badge turns lime with a check once the step is done. */
function Section({
  step,
  title,
  description,
  done,
  delay,
  children,
}: {
  step: number;
  title: string;
  description: string;
  done?: boolean;
  delay: number;
  children: ReactNode;
}) {
  return (
    <section
      className="seal-rise rounded-xl border border-tile-line bg-background p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-foreground text-xs font-bold transition-colors duration-300",
            done ? "bg-accent-lime" : "bg-foreground text-background",
          )}
        >
          {done ? <Check className="h-3.5 w-3.5" strokeWidth={3.2} /> : step}
        </span>
        <div className="min-w-0">
          <h4 className="text-base font-bold leading-tight">{title}</h4>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProfileFields({
  value,
  onChange,
  requireOwnerName,
  disabled,
}: {
  value: HeirProfile;
  onChange: (next: HeirProfile) => void;
  requireOwnerName: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation("app");
  const note = value.note ?? "";
  return (
    <div className="space-y-3">
      <div>
        <label className="ed-field-label" htmlFor="heir-alert-owner-name">
          {t("notifications.ownerNameLabel")}
          {requireOwnerName && <span className="text-destructive"> *</span>}
        </label>
        <input
          id="heir-alert-owner-name"
          type="text"
          value={value.ownerName ?? ""}
          onChange={(e) =>
            onChange({ ...value, ownerName: e.target.value.slice(0, HEIR_NAME_MAX) })
          }
          maxLength={HEIR_NAME_MAX}
          disabled={disabled}
          className="ed-input mt-1"
          placeholder={t("notifications.ownerNamePlaceholder")}
        />
        <p className="mt-1 text-xs text-muted-foreground">{t("notifications.ownerNameHint")}</p>
      </div>
      <div>
        <label className="ed-field-label" htmlFor="heir-alert-heir-name">
          {t("notifications.heirNameLabel")}
        </label>
        <input
          id="heir-alert-heir-name"
          type="text"
          value={value.heirName ?? ""}
          onChange={(e) => onChange({ ...value, heirName: e.target.value.slice(0, HEIR_NAME_MAX) })}
          maxLength={HEIR_NAME_MAX}
          disabled={disabled}
          className="ed-input mt-1"
          placeholder={t("notifications.heirNamePlaceholder")}
        />
      </div>
      <div>
        <label className="ed-field-label" htmlFor="heir-alert-note">
          {t("notifications.noteLabel")}
        </label>
        <textarea
          id="heir-alert-note"
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

/** The live preview and the schedule: the right column on desktop. */
function Aside({ profile }: { profile: HeirProfile }) {
  const { t } = useTranslation("app");
  return (
    <div className="space-y-6 md:sticky md:top-0">
      <div className="seal-rise space-y-3" style={{ animationDelay: "120ms" }}>
        <p className="ed-label">{t("notifications.previewTitle")}</p>
        <AlertPreview profile={profile} />
      </div>
      <div className="seal-rise space-y-3" style={{ animationDelay: "200ms" }}>
        <p className="ed-label">{t("notifications.timelineTitle")}</p>
        <ReminderTimeline />
      </div>
    </div>
  );
}

// ─── The dialog ───────────────────────────────────────────────────

type Props = {
  open: boolean;
  estateAddress: string;
  /** What to call the heir before they have a name: their truncated address. */
  heirFallback: string;
  /** A 401 mid-flow: the parent closes this and asks to sign in again. */
  onSessionExpired: () => void;
  onClose: () => void;
};

/**
 * One estate's reminders on one form: where to remind the owner, where to tell the heir, and how
 * the heir alert reads, with a live preview beside it. Everything saves with one button; new
 * contacts get one read-back first, since they can't be edited yet, then each is verified in
 * place and the seal plays. Mounted only while open, so half-typed values don't linger.
 */
const NotificationsDialog: React.FC<Props> = (props) =>
  props.open ? <RemindersDialog {...props} /> : null;

function RemindersDialog({
  estateAddress,
  heirFallback,
  onSessionExpired,
  onClose,
}: Omit<Props, "open">) {
  const { t } = useTranslation("app");
  const { toast } = useToast();
  const [stage, setStage] = useState<RemindersStage>("form");
  const [queue, setQueue] = useState<PendingVerification[]>([]);
  const [queued, setQueued] = useState(0);
  const pending = queue[0];

  const reminders = useReminders(estateAddress, { poll: stage === "verify" });
  const save = useSaveReminders(estateAddress);
  const resend = useResendVerification(estateAddress);
  const verifyEmail = useVerifyEmail(estateAddress);

  const [drafts, setDrafts] = useState<Record<ReminderRole, ContactDraft>>({
    checkInSigner: blankDraft(),
    heir: blankDraft(),
  });
  // "Add email as well" on a role that already has a contact.
  const [adding, setAdding] = useState<Record<ReminderRole, boolean>>({
    checkInSigner: false,
    heir: false,
  });
  const [profileDraft, setProfileDraft] = useState<HeirProfile | undefined>(undefined);

  const recipients = reminders.data?.recipients ?? [];
  const savedProfile = reminders.data?.heir ?? EMPTY_PROFILE;
  const profile = profileDraft ?? savedProfile;
  const heirName = profile.heirName?.trim();
  const heirLabel = heirName || heirFallback;
  const hasSubscription = recipients.length > 0;

  const contactsOf = (role: ReminderRole) =>
    OFFERED_CHANNELS.map((channel) => ({
      channel,
      state: contactState(recipients, role, channel),
    })).filter((c) => c.state.kind !== "none");
  const free = (role: ReminderRole) =>
    OFFERED_CHANNELS.filter((channel) => contactState(recipients, role, channel).kind === "none");
  /** A role's draft, if it's on screen. Its channel snaps to a free one once a contact is saved. */
  const draftOf = (role: ReminderRole): ContactDraft | undefined => {
    const channels = free(role);
    if (channels.length === 0) return undefined;
    if (contactsOf(role).length > 0 && !adding[role]) return undefined;
    const draft = drafts[role];
    return channels.includes(draft.channel) ? draft : blankDraft(channels[0]);
  };

  const typed = ROLES.flatMap((role) => {
    const draft = draftOf(role);
    return draft === undefined || draftBlank(draft) ? [] : [{ role, draft }];
  });
  const newContacts: AddRecipientRequest[] = typed.map(({ role, draft }) => ({
    role,
    channel: draft.channel,
    destination: draft.value,
  }));
  const invalid = typed.some(({ role, draft }) => draftProblem(draft, role) !== undefined);
  const addingOwner = typed.some((c) => c.role === "checkInSigner");
  const heirReachable = contactsOf("heir").length > 0 || typed.some((c) => c.role === "heir");
  const ownerNameMissing = heirReachable && !profile.ownerName?.trim();
  const profileDirty = profileDraft !== undefined && !sameProfile(profileDraft, savedProfile);

  let blocker: string | undefined;
  if (!hasSubscription && !addingOwner) blocker = t("notifications.blockerOwner");
  else if (invalid) blocker = t("notifications.blockerInvalid");
  else if (ownerNameMissing) blocker = t("notifications.blockerOwnerName");
  const changed = newContacts.length > 0 || profileDirty;
  const ready = changed && blocker === undefined;

  const verified =
    pending !== undefined &&
    recipients.some((r) => r.reminderRecipientId === pending.recipientId && r.verified);

  const failed = (err: unknown) => {
    if (isUnauthorized(err)) onSessionExpired();
  };

  const commit = () => {
    const heir = hasSubscription
      ? profileDirty
        ? profile
        : undefined
      : sameProfile(profile, EMPTY_PROFILE)
        ? undefined
        : profile;
    save.mutate(
      { hasSubscription, contacts: newContacts, heir },
      {
        onSuccess: (verifications) => {
          setDrafts({ checkInSigner: blankDraft(), heir: blankDraft() });
          setAdding({ checkInSigner: false, heir: false });
          setProfileDraft(undefined);
          save.reset();
          if (verifications.length > 0) {
            setQueue(verifications);
            setQueued(verifications.length);
            setStage("verify");
          } else {
            toast({
              title: hasSubscription
                ? t("notifications.savedToast")
                : t("notifications.remindersOn"),
            });
            setStage("form");
            onClose();
          }
        },
        onError: failed,
      },
    );
  };

  const submit = () => {
    if (!ready) return;
    if (newContacts.length > 0) setStage("review");
    else commit();
  };

  /** Opens verification for a saved contact that isn't connected yet. */
  const verify = (contact: ContactState) => {
    if (contact.kind !== "waiting") return;
    const target = {
      recipientId: contact.recipient.reminderRecipientId,
      role: roleOf(contact.recipient.role),
      channel: channelOf(contact.recipient.channel),
      destination: contact.recipient.destination,
    };
    // The email code is already in the inbox; the stage takes it, and resends from there.
    if (target.channel === "email") {
      setQueue([{ ...target, sent: true }]);
      setQueued(1);
      setStage("verify");
      return;
    }
    resend.mutate(
      { recipientId: target.recipientId },
      {
        onSuccess: (status) => {
          setQueue([pendingFrom(status, target)]);
          setQueued(1);
          setStage("verify");
        },
        onError: failed,
      },
    );
  };

  const next = () => {
    resend.reset();
    verifyEmail.reset();
    if (queue.length > 1) {
      setQueue((prev) => prev.slice(1));
      return;
    }
    setQueue([]);
    setStage("form");
    if (verified) onClose();
  };

  const busy = save.isPending;

  // ─── Frame: title and footer per stage ──────────────────────────

  const setupTitle = !hasSubscription && reminders.isSuccess;
  const saveError =
    save.isError && !isUnauthorized(save.error)
      ? errMsg(save.error, t("notifications.saveFailedDesc"))
      : undefined;

  let title = t(setupTitle ? "notifications.setupTitle" : "notifications.dialogTitle");
  let description: string | undefined = t(
    setupTitle ? "notifications.setupLead" : "notifications.dialogLead",
  );
  let footer: ReactNode = (
    <div className="flex w-full flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
      <p
        aria-live="polite"
        className={cn(
          "text-xs font-medium sm:mr-auto",
          saveError ? "font-semibold text-destructive" : "text-muted-foreground",
        )}
      >
        {saveError ?? (changed || !hasSubscription ? blocker : undefined)}
      </p>
      <Button variant="flat-outline" onClick={onClose} disabled={busy}>
        {t("common.close")}
      </Button>
      {(changed || !hasSubscription) && (
        <Button
          variant="flat-yellow"
          className="seal-rise"
          disabled={!ready || busy}
          onClick={submit}
        >
          <Bell className="h-4 w-4" />
          {busy
            ? t("notifications.saving")
            : hasSubscription
              ? t("notifications.save")
              : t("notifications.turnOn")}
        </Button>
      )}
    </div>
  );

  if (stage === "review") {
    title = t("notifications.reviewTitle");
    description = t("notifications.reviewDesc");
    footer = (
      <div className="flex w-full flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
        {saveError && (
          <p className="text-xs font-semibold text-destructive sm:mr-auto">{saveError}</p>
        )}
        <Button
          variant="flat-outline"
          className={cn(!saveError && "sm:ml-auto")}
          disabled={busy}
          onClick={() => {
            save.reset();
            setStage("form");
          }}
        >
          {t("notifications.reviewEdit")}
        </Button>
        <Button variant="flat" disabled={busy} onClick={commit}>
          {busy ? t("notifications.saving") : t("notifications.reviewConfirm")}
        </Button>
      </div>
    );
  } else if (stage === "verify") {
    title = t("notifications.dialogTitle");
    description = undefined;
    footer = undefined;
  }

  // ─── Body per stage ─────────────────────────────────────────────

  const frame = (content: ReactNode) => (
    <Modal
      open
      cap={t("notifications.title")}
      title={title}
      description={description}
      size="xl"
      busy={busy}
      onClose={onClose}
      footer={footer}
    >
      {content}
    </Modal>
  );

  if (reminders.isPending) {
    return frame(
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-xl bg-secondary" />
        <div className="h-32 animate-pulse rounded-xl bg-secondary" />
      </div>,
    );
  }

  if (stage === "verify" && pending !== undefined) {
    return frame(
      <VerifyStage
        key={pending.recipientId}
        pending={pending}
        verified={verified}
        step={queued > 1 ? `${queued - queue.length + 1} / ${queued}` : undefined}
        hasNext={queue.length > 1}
        heirLabel={heirLabel}
        resending={resend.isPending}
        verifying={verifyEmail.isPending}
        error={
          resend.isError
            ? errMsg(resend.error, t("notifications.resendFailedDesc"))
            : verifyEmail.isError
              ? t(verifyErrorKey(verifyEmail.error))
              : undefined
        }
        onResend={() => {
          verifyEmail.reset();
          resend.mutate(
            { recipientId: pending.recipientId },
            {
              onSuccess: (status) =>
                setQueue((prev) => [pendingFrom(status, pending), ...prev.slice(1)]),
              onError: (err) => {
                // 409: verified in the meantime; the poll shows it.
                if (!(err instanceof ApiError && err.code === "CONFLICT")) failed(err);
              },
            },
          );
        }}
        onVerify={(code) => {
          resend.reset();
          verifyEmail.mutate({ code }, { onError: failed });
        }}
        onDone={next}
      />,
    );
  }

  if (stage === "review") {
    const ownerName = heirReachable ? profile.ownerName?.trim() : undefined;
    return frame(
      <div className="mx-auto max-w-lg space-y-4">
        <ul className="divide-y divide-tile-line overflow-hidden rounded-xl border-2 border-foreground">
          {newContacts.map((c, i) => {
            const email = c.channel === "email";
            const Icon = email ? Mail : Send;
            return (
              <li
                key={`${c.role}-${c.channel}`}
                className="seal-rise flex items-center gap-4 bg-background p-4"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-foreground",
                    c.role === "heir" ? "bg-accent-orange/30" : "bg-accent-yellow",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {c.role === "heir"
                      ? t("notifications.reviewTells", { name: heirLabel })
                      : t("notifications.reviewRemindsYou")}
                  </p>
                  <p className="break-all text-lg font-bold leading-snug">
                    {email ? "" : "@"}
                    {normalizeDestination(c.channel, c.destination)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        {ownerName && (
          <p className="text-sm text-muted-foreground">
            {t("notifications.reviewOwnerLine", { name: ownerName })}
          </p>
        )}
      </div>,
    );
  }

  const ownerDone = contactsOf("checkInSigner").some((c) => c.state.kind === "connected");
  const heirDone = contactsOf("heir").some((c) => c.state.kind === "connected");

  const statusLine = (state: ContactState, role: ReminderRole, channel: ReminderChannel) => {
    if (state.kind === "connected") return t("notifications.connected");
    if (channel === "telegram") return t("notifications.statusWaitingTelegram");
    return role === "heir"
      ? t("notifications.heirEmailPending", { name: heirLabel })
      : t("notifications.statusCheckInbox");
  };

  const contactBlock = (role: ReminderRole) => {
    const contacts = contactsOf(role);
    const channels = free(role);
    const draft = draftOf(role);
    return (
      <div className="space-y-3">
        {contacts.map(({ channel, state }) => {
          if (state.kind === "none") return null;
          const Icon = channel === "email" ? Mail : Send;
          const heirEmail = role === "heir" && channel === "email";
          return (
            <div
              key={channel}
              className="flex items-center gap-3 rounded-lg border border-tile-line bg-tile-soft px-3.5 py-3"
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {channel === "telegram" && "@"}
                  {state.recipient.destination}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {statusLine(state, role, channel)}
                </p>
              </div>
              {state.kind === "connected" ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-foreground bg-accent-lime px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                  <Check className="h-3 w-3" strokeWidth={3} />
                  {t("notifications.connected")}
                </span>
              ) : heirEmail ? (
                <span className="shrink-0 rounded-md border-2 border-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                  {t("notifications.pendingBadge")}
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="flat"
                  disabled={resend.isPending}
                  onClick={() => verify(state)}
                >
                  {role === "heir" ? t("notifications.invite") : t("notifications.verifyCode")}
                </Button>
              )}
            </div>
          );
        })}

        {draft !== undefined ? (
          <div className="space-y-2">
            <ContactFields
              role={role}
              channels={channels}
              draft={draft}
              onChange={(nextDraft) => setDrafts((prev) => ({ ...prev, [role]: nextDraft }))}
              disabled={busy}
            />
            {contacts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAdding((prev) => ({ ...prev, [role]: false }));
                  setDrafts((prev) => ({ ...prev, [role]: blankDraft() }));
                }}
                className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {t("notifications.neverMind")}
              </button>
            )}
          </div>
        ) : (
          channels.length > 0 && (
            <button
              type="button"
              onClick={() => setAdding((prev) => ({ ...prev, [role]: true }))}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-dashed border-foreground/60 px-3.5 text-xs font-bold transition-colors hover:border-solid hover:border-foreground hover:bg-tile-soft"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t("notifications.addAsWell", { channel: t(channelLabelKey(channels[0])) })}
            </button>
          )
        )}
      </div>
    );
  };

  return frame(
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="space-y-4">
        <Section
          step={1}
          title={t("notifications.stepRemindTitle")}
          description={t("notifications.stepRemindDesc")}
          done={ownerDone}
          delay={0}
        >
          {contactBlock("checkInSigner")}
        </Section>
        <Section
          step={2}
          title={
            heirName
              ? t("notifications.stepHeirTitle", { name: heirName })
              : t("notifications.stepHeirTitleGeneric")
          }
          description={t("notifications.stepHeirDesc")}
          done={heirDone}
          delay={80}
        >
          {contactBlock("heir")}
        </Section>
        <Section
          step={3}
          title={t("notifications.stepAlertTitle")}
          description={t("notifications.stepAlertDesc")}
          done={
            hasSubscription &&
            !!savedProfile.ownerName?.trim() &&
            !!savedProfile.heirName?.trim() &&
            !profileDirty
          }
          delay={160}
        >
          {/* Small screens: the preview sits right above the fields it shows. */}
          <div className="mb-4 md:hidden">
            <AlertPreview profile={profile} />
          </div>
          <ProfileFields
            value={profile}
            onChange={setProfileDraft}
            requireOwnerName={heirReachable}
            disabled={busy}
          />
        </Section>
      </div>
      <div className="hidden md:block">
        <Aside profile={profile} />
      </div>
      <div className="md:hidden">
        <p className="ed-label mb-3">{t("notifications.timelineTitle")}</p>
        <ReminderTimeline />
      </div>
    </div>,
  );
}

export default NotificationsDialog;
