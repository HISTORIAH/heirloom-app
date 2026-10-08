import { useEffect, useRef, useState } from "react";
import { Check, Copy, Mail, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import CodeInput from "@/components/reminders/CodeInput";
import VerifiedSeal from "@/components/reminders/VerifiedSeal";
import { cn } from "@/lib/utils";
import { VERIFY_CODE_LENGTH, VERIFY_CODE_PATTERN } from "@/lib/constants";
import { countdown } from "@/lib/reminders";
import { useNow } from "@/hooks/useNow";
import type { PendingVerification } from "@/types/reminders";
import { useTranslation } from "@heirloom/i18n";

type Props = {
  pending: PendingVerification;
  verified: boolean;
  /** "1 of 2" when more than one contact waits. */
  step?: string;
  hasNext: boolean;
  heirLabel: string;
  resending: boolean;
  verifying: boolean;
  error?: string;
  onResend: () => void;
  onVerify: (code: string) => void;
  /** Next contact, or close once this was the last. */
  onDone: () => void;
};

/** "Email · 1 of 2" over a stage's title. */
function StageCap({ label, step }: { label: string; step?: string }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
      {step ? `${label} · ${step}` : label}
    </span>
  );
}

/**
 * Connecting one contact, inside the reminders dialog. Email: the owner types the code we sent, and
 * a full well-formed code checks itself. Telegram: the owner opens their link; the heir's link is
 * copied to send on, since the bot only accepts a tap from the heir's own account. The dialog polls
 * while this is up and passes `verified` when it flips, which plays the seal.
 */
export default function VerifyStage({
  pending,
  verified,
  step,
  hasNext,
  heirLabel,
  resending,
  verifying,
  error,
  onResend,
  onVerify,
  onDone,
}: Props) {
  const { t } = useTranslation("app");
  const now = useNow();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const self = pending.role === "checkInSigner";
  const email = pending.channel === "email";
  const handle = email ? pending.destination : `@${pending.destination}`;
  const left = pending.expiresAt === undefined ? undefined : pending.expiresAt - now;
  const valid = VERIFY_CODE_PATTERN.test(code);
  const malformed = code.length === VERIFY_CODE_LENGTH && !valid;

  // Each full code is sent once by itself; editing it lets the next one go.
  const sentFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!email || !valid || verifying || sentFor.current === code) return;
    sentFor.current = code;
    onVerify(code);
  }, [email, code, valid, verifying, onVerify]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  if (verified) {
    return (
      <div className="py-2 text-center">
        <VerifiedSeal />
        <div className="seal-rise" style={{ animationDelay: "0.42s" }}>
          <StageCap
            label={t(
              email ? "notifications.connectedEmailCap" : "notifications.connectedTelegramCap",
            )}
          />
          <h3 className="mt-2 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold leading-none tracking-[-0.035em]">
            {self
              ? t("notifications.allSetTitle")
              : t("notifications.heirCoveredTitle", { name: heirLabel })}
          </h3>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            {self
              ? t("notifications.allSetDesc", { handle })
              : t("notifications.heirCoveredDesc", { name: heirLabel, handle })}
          </p>
        </div>
        <div className="seal-rise mx-auto mt-6 max-w-xs" style={{ animationDelay: "0.52s" }}>
          <Button variant="flat-yellow" className="w-full" autoFocus onClick={onDone}>
            {hasNext ? t("notifications.next") : t("notifications.done")}
          </Button>
        </div>
      </div>
    );
  }

  const status = !pending.sent
    ? { text: t(email ? "notifications.emailSendFailed" : "notifications.linkFailed"), bad: true }
    : left === undefined
      ? undefined
      : left > 0
        ? {
            text: t(email ? "notifications.codeExpires" : "notifications.linkExpires", {
              time: countdown(left),
            }),
            bad: false,
          }
        : { text: t(email ? "notifications.codeExpired" : "notifications.linkExpired"), bad: true };
  const linkUsable = pending.link !== undefined && (left === undefined || left > 0);

  return (
    <div className="mx-auto max-w-md py-2">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground bg-accent-yellow">
        {email ? (
          <Mail className="h-6 w-6" strokeWidth={2} />
        ) : (
          <Send className="h-6 w-6" strokeWidth={2} />
        )}
      </span>
      <div className="mt-4">
        <StageCap
          label={t(email ? "notifications.channelEmail" : "notifications.channelTelegram")}
          step={step}
        />
      </div>
      <h3 className="mt-2 text-[clamp(1.5rem,3.5vw,1.875rem)] font-semibold leading-tight tracking-[-0.03em]">
        {email
          ? t("notifications.checkInbox")
          : self
            ? t("notifications.telegramOpenTitle")
            : t("notifications.telegramShareTitle", { name: heirLabel })}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {email
          ? t("notifications.codeSentTo", { email: pending.destination })
          : self
            ? t("notifications.telegramOpenDesc", { handle })
            : t("notifications.telegramShareDesc", { handle })}
      </p>

      {email ? (
        <div className="mt-6 space-y-2">
          <CodeInput
            value={code}
            onChange={setCode}
            label={t("notifications.codePlaceholder")}
            error={malformed || error !== undefined}
            disabled={verifying}
            autoFocus
          />
          <p
            aria-live="polite"
            className={cn(
              "min-h-4 text-xs font-semibold",
              malformed || error ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {verifying
              ? t("verifyEmail.verifying")
              : malformed
                ? t("verifyEmail.codeFormatHint")
                : (error ?? "")}
          </p>
        </div>
      ) : (
        <div className="mt-6">
          {linkUsable ? (
            self ? (
              <Button asChild variant="flat-yellow" className="w-full">
                <a href={pending.link} target="_blank" rel="noopener noreferrer">
                  <Send className="h-4 w-4" />
                  {t("notifications.telegramVerifyLink")}
                </a>
              </Button>
            ) : (
              <Button
                variant="flat-yellow"
                className="w-full"
                onClick={() => {
                  void navigator.clipboard.writeText(pending.link ?? "");
                  setCopied(true);
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t("common.copied") : t("notifications.copyHeirLink", { name: heirLabel })}
              </Button>
            )
          ) : (
            <Button variant="flat" className="w-full" disabled={resending} onClick={onResend}>
              {resending ? t("notifications.sending") : t("notifications.getNewLink")}
            </Button>
          )}
          {error && <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>}
          <p className="mt-3 text-xs text-muted-foreground">
            {t("notifications.telegramMismatch", { handle })}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {status ? (
          <span
            className={cn(
              "font-bold tabular-nums",
              status.bad ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {status.text}
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-4">
          {(email || linkUsable) && (
            <button
              type="button"
              onClick={onResend}
              disabled={resending}
              className="inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3 w-3", resending && "animate-spin")} strokeWidth={2.2} />
              {email ? t("notifications.sendNewCode") : t("notifications.getNewLink")}
            </button>
          )}
          <button
            type="button"
            onClick={onDone}
            className="font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("notifications.telegramVerifyLater")}
          </button>
        </div>
      </div>
    </div>
  );
}
