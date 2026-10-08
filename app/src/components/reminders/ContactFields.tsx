import { useState } from "react";
import ChannelTabs from "@/components/reminders/ChannelTabs";
import { cn } from "@/lib/utils";
import { draftBlank, draftProblem } from "@/lib/reminders";
import type { ContactDraft, ReminderChannel, ReminderRole } from "@/types/reminders";
import { useTranslation } from "@heirloom/i18n";

function hintKey(channel: ReminderChannel, self: boolean): string {
  if (channel === "email") {
    return self ? "notifications.hintEmailSelf" : "notifications.hintEmailHeir";
  }
  return self ? "notifications.hintTelegramSelf" : "notifications.hintTelegramHeir";
}

/**
 * One role's new contact, typed in place: channel tabs, then the field (twice for the heir's
 * email, which gets no code). Problems show once a field is left, not while typing.
 */
export default function ContactFields({
  role,
  channels,
  draft,
  onChange,
  disabled,
}: {
  role: ReminderRole;
  /** Channels this role has no contact on yet. */
  channels: ReminderChannel[];
  draft: ContactDraft;
  onChange: (next: ContactDraft) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation("app");
  const self = role === "checkInSigner";
  const [touched, setTouched] = useState(false);
  const [touchedAgain, setTouchedAgain] = useState(false);
  const problem = draftBlank(draft) ? undefined : draftProblem(draft, role);
  const mismatch = problem?.field === "again";
  const show = problem !== undefined && (mismatch ? touchedAgain : touched);
  const email = draft.channel === "email";

  const pick = (channel: ReminderChannel) => {
    if (channel === draft.channel) return;
    setTouched(false);
    setTouchedAgain(false);
    onChange({ channel, value: "", again: "" });
  };

  return (
    <div className="space-y-3">
      <ChannelTabs channels={channels} value={draft.channel} onChange={pick} disabled={disabled} />
      <input
        key={draft.channel}
        type={email ? "email" : "text"}
        value={draft.value}
        onChange={(e) => onChange({ ...draft, value: e.target.value })}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete={self && email ? "email" : "off"}
        spellCheck={false}
        placeholder={
          email
            ? t(self ? "notifications.placeholderEmail" : "notifications.placeholderEmailHeir")
            : t("notifications.placeholderTelegram")
        }
        aria-label={t(email ? "notifications.channelEmail" : "notifications.channelTelegram")}
        aria-invalid={show && !mismatch}
        className={cn("ed-input", show && !mismatch && "border-destructive")}
      />
      {email && !self && !draftBlank(draft) && (
        <input
          type="email"
          value={draft.again}
          onChange={(e) => onChange({ ...draft, again: e.target.value })}
          onBlur={() => setTouchedAgain(true)}
          // The point is typing it twice: no pasting the first field into the second.
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          disabled={disabled}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          placeholder={t("notifications.confirmEmailPlaceholder")}
          aria-label={t("notifications.confirmEmailPlaceholder")}
          aria-invalid={show && mismatch}
          className={cn("ed-input seal-rise", show && mismatch && "border-destructive")}
        />
      )}
      <p
        className={cn(
          "text-xs",
          show ? "font-semibold text-destructive" : "font-medium text-muted-foreground",
        )}
      >
        {show && problem ? t(problem.key) : t(hintKey(draft.channel, self))}
      </p>
    </div>
  );
}
