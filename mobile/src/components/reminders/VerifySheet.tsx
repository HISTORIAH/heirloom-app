import { useState } from "react";
import { Linking, Share, Text } from "react-native";

import { ModalSheet } from "@/components/ModalSheet";
import { Cap, Display, Lede, PrimaryButton, TextField, TextLink } from "@/components/ui";
import { VERIFY_CODE_LENGTH, VERIFY_CODE_PATTERN } from "@/constants/alerts";
import { useTick } from "@/hooks/useTick";
import { normalizeCode } from "@/lib/reminders";
import { colors, font } from "@/theme";
import type { PendingVerification } from "@/types/reminders";

function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * The owner's email: we sent a code and a link, and they type the code here. The link opens the
 * web app for now.
 * TODO(mobile): open /verify-email links in the app with Universal Links / App Links on
 * app.heirlm.xyz, so links already in inboxes keep working.
 */
function EmailVerify({
  pending,
  resending,
  verifying,
  error,
  onResend,
  onVerify,
  onClose,
}: {
  pending: PendingVerification;
  resending?: boolean;
  verifying?: boolean;
  error?: string;
  onResend: () => void;
  onVerify: (code: string) => void;
  onClose: () => void;
}) {
  const now = useTick();
  const [code, setCode] = useState("");
  const valid = VERIFY_CODE_PATTERN.test(code);
  const left = pending.expiresAt === undefined ? undefined : pending.expiresAt - now;

  let status: string | undefined;
  if (!pending.sent) status = "Couldn't send the email. Send it again.";
  else if (left !== undefined) {
    status = left > 0 ? `Code expires in ${countdown(left)}` : "This code has expired.";
  }

  return (
    <ModalSheet onClose={onClose}>
      <Cap>Email</Cap>
      <Display size={24}>{pending.sent ? "Check your inbox" : "The email didn't go out"}</Display>
      <Lede size={15}>
        {`We sent a code to ${pending.destination}. Reminders start once you enter it.`}
      </Lede>
      <TextField
        label="Code"
        hint={`${VERIFY_CODE_LENGTH} characters`}
        value={code}
        onChangeText={(text) => setCode(normalizeCode(text).slice(0, VERIFY_CODE_LENGTH))}
        placeholder="XXXXXXXX"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="one-time-code"
        maxLength={VERIFY_CODE_LENGTH}
        error={code.length === VERIFY_CODE_LENGTH && !valid}
      />
      {code.length === VERIFY_CODE_LENGTH && !valid ? (
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>
          Codes have no O, 0, I or 1. Check the email again.
        </Text>
      ) : null}
      {status !== undefined ? (
        <Text
          style={{
            fontFamily: font.bold,
            fontSize: 13,
            fontVariant: ["tabular-nums"],
            color: pending.sent && (left === undefined || left > 0) ? colors.mute : colors.claim,
          }}
        >
          {status}
        </Text>
      ) : null}
      {error !== undefined ? (
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        icon="check"
        label={verifying ? "Checking…" : "Verify"}
        disabled={!valid || verifying}
        onPress={() => onVerify(code)}
      />
      <PrimaryButton
        tone="paper"
        icon="mail"
        label={resending ? "Sending…" : "Send a new code"}
        disabled={resending}
        onPress={onResend}
      />
      <TextLink label="I'll do this later" quiet flush onPress={onClose} />
    </ModalSheet>
  );
}

/**
 * Connects a contact. Telegram: the owner opens the link themselves; for the heir, the owner
 * shares it, since the bot only accepts a tap from the Telegram account that was entered.
 * Email: the owner types the code we sent. The parent polls reminders while this is open and
 * passes `verified` when it flips.
 */
export function VerifySheet({
  pending,
  verified,
  estateName,
  heirLabel,
  resending,
  verifying,
  error,
  onResend,
  onVerify,
  onClose,
}: {
  pending: PendingVerification;
  verified: boolean;
  estateName: string;
  heirLabel: string;
  resending?: boolean;
  verifying?: boolean;
  error?: string;
  onResend: () => void;
  onVerify: (code: string) => void;
  onClose: () => void;
}) {
  const now = useTick();
  const self = pending.role === "checkInSigner";
  const email = pending.channel === "email";
  const handle = email ? pending.destination : `@${pending.destination}`;
  const left = pending.expiresAt === undefined ? 0 : pending.expiresAt - now;
  const usable = pending.link !== undefined && left > 0;

  if (verified) {
    return (
      <ModalSheet onClose={onClose}>
        <Cap>{email ? "Email" : "Telegram"}</Cap>
        <Display size={24}>{`${handle} is connected`}</Display>
        <Lede size={15}>
          {self
            ? "You'll get check-in reminders there. Checking in resets them."
            : `${heirLabel} will be told there if the grace period runs out.`}
        </Lede>
        <PrimaryButton label="Done" onPress={onClose} />
      </ModalSheet>
    );
  }

  if (email) {
    return (
      <EmailVerify
        pending={pending}
        resending={resending}
        verifying={verifying}
        error={error}
        onResend={onResend}
        onVerify={onVerify}
        onClose={onClose}
      />
    );
  }

  function share() {
    if (pending.link === undefined) return;
    void Share.share({
      message: `Tap Start to get Heirloom alerts for "${estateName}": ${pending.link}`,
    });
  }

  return (
    <ModalSheet onClose={onClose}>
      <Cap>Telegram</Cap>
      <Display size={24}>
        {self ? "Open Telegram and tap Start" : `Send this link to ${heirLabel}`}
      </Display>
      <Lede size={15}>
        {self
          ? `Open it from ${handle}. Reminders start once Telegram says "connected".`
          : `They tap Start from ${handle}'s Telegram. Nothing reaches them until they do.`}
      </Lede>

      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 13,
          fontVariant: ["tabular-nums"],
          color: usable ? colors.mute : colors.claim,
        }}
      >
        {pending.link === undefined
          ? "Couldn't make a link. Get a new one."
          : usable
            ? `Works once · expires in ${countdown(left)}`
            : "This link has expired."}
      </Text>
      {error !== undefined ? (
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>
          {error}
        </Text>
      ) : null}

      {usable ? (
        <PrimaryButton
          icon={self ? "telegram" : "send"}
          label={self ? "Open Telegram" : "Share link"}
          onPress={() => (self ? void Linking.openURL(pending.link ?? "") : share())}
        />
      ) : (
        <PrimaryButton
          label={resending ? "Getting a link…" : "Get a new link"}
          disabled={resending}
          onPress={onResend}
        />
      )}

      <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.mute }}>
        {`If Telegram says the username didn't match, the contact isn't ${handle}. Contacts can't be edited yet.`}
      </Text>
      <TextLink label="I'll do this later" quiet flush onPress={onClose} />
    </ModalSheet>
  );
}
