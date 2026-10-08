import { useEffect, useRef, useState, type ReactNode } from "react";
import { Linking, Share, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ModalSheet } from "@/components/ModalSheet";
import { CodeInput } from "@/components/reminders/CodeInput";
import { VerifiedSeal } from "@/components/reminders/VerifiedSeal";
import { Cap, Display, Lede, PrimaryButton, TextLink } from "@/components/ui";
import { VERIFY_CODE_LENGTH, VERIFY_CODE_PATTERN } from "@/constants/alerts";
import { useTick } from "@/hooks/useTick";
import { colors, font } from "@/theme";
import type { PendingVerification } from "@/types/reminders";

function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Rises in after the seal has popped. */
function Rise({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)} style={{ gap: 8 }}>
      {children}
    </Animated.View>
  );
}

/**
 * The owner's email: we sent a code and a link, and they type the code here. A full, well-formed
 * code checks itself; the button is there for a retry. The link opens the web app for now.
 * TODO(mobile): open /verify-email links in the app with Universal Links / App Links on
 * app.heirlm.xyz, so links already in inboxes keep working.
 */
function EmailVerify({
  pending,
  step,
  resending,
  verifying,
  error,
  onResend,
  onVerify,
  onClose,
}: {
  pending: PendingVerification;
  step?: string;
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
  const malformed = code.length === VERIFY_CODE_LENGTH && !valid;
  const left = pending.expiresAt === undefined ? undefined : pending.expiresAt - now;
  // Each full code is sent once by itself; editing it lets the next one go.
  const sentFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!valid || verifying || sentFor.current === code) return;
    sentFor.current = code;
    onVerify(code);
  }, [code, valid, verifying, onVerify]);

  let status: string | undefined;
  if (!pending.sent) status = "Couldn't send the email. Send it again.";
  else if (left !== undefined) {
    status = left > 0 ? `Code expires in ${countdown(left)}` : "This code has expired.";
  }

  return (
    <ModalSheet onClose={onClose}>
      <Cap>{step === undefined ? "Email" : `Email · ${step}`}</Cap>
      <Display size={26}>{pending.sent ? "Check your inbox" : "The email didn't go out"}</Display>
      <Lede size={15}>
        {`We sent an 8-character code to ${pending.destination}. Reminders start once you enter it.`}
      </Lede>
      <CodeInput
        value={code}
        onChange={setCode}
        error={malformed || error !== undefined}
        disabled={verifying}
      />
      {malformed ? (
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>
          Codes have no O, 0, I or 1. Check the email again.
        </Text>
      ) : null}
      {error !== undefined ? (
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>
          {error}
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
      <PrimaryButton
        icon="check"
        label={verifying ? "Checking…" : "Verify"}
        disabled={!valid || verifying}
        onPress={() => onVerify(code)}
      />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <TextLink
          label={resending ? "Sending…" : "Send a new code"}
          flush
          onPress={resending ? undefined : onResend}
        />
        <TextLink label="I'll do this later" quiet flush onPress={onClose} />
      </View>
    </ModalSheet>
  );
}

/**
 * Connects a contact. Telegram: the owner opens the link themselves; for the heir, the owner
 * shares it, since the bot only accepts a tap from the Telegram account that was entered.
 * Email: the owner types the code we sent. The parent polls reminders while this is open and
 * passes `verified` when it flips, which plays the seal. `step` ("1 of 2") is set when more
 * contacts wait after this one.
 */
export function VerifySheet({
  pending,
  verified,
  step,
  hasNext,
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
  step?: string;
  /** Another contact waits after this one. */
  hasNext?: boolean;
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
        <VerifiedSeal />
        <Rise delay={420}>
          <View style={{ alignItems: "center", gap: 8 }}>
            <Cap color={colors.ink}>{email ? "Email connected" : "Telegram connected"}</Cap>
            <Text
              accessibilityRole="header"
              style={{
                textAlign: "center",
                fontFamily: font.semibold,
                fontSize: 30,
                lineHeight: 32,
                letterSpacing: -1,
                color: colors.ink,
              }}
            >
              {self
                ? "You're all set."
                : `${heirLabel.charAt(0).toUpperCase()}${heirLabel.slice(1)} is covered.`}
            </Text>
            <Text
              style={{
                textAlign: "center",
                fontFamily: font.regular,
                fontSize: 15,
                lineHeight: 22,
                color: colors.mute,
              }}
            >
              {self
                ? `Reminders for “${estateName}” go to ${handle}. Checking in resets them.`
                : `If the grace period runs out, ${heirLabel} hears about it at ${handle}.`}
            </Text>
          </View>
        </Rise>
        <Rise delay={560}>
          <View style={{ marginTop: 8 }}>
            <PrimaryButton label={hasNext ? "Next" : "Done"} onPress={onClose} />
          </View>
        </Rise>
      </ModalSheet>
    );
  }

  if (email) {
    return (
      <EmailVerify
        pending={pending}
        step={step}
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
      <Cap>{step === undefined ? "Telegram" : `Telegram · ${step}`}</Cap>
      <Display size={26}>
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
