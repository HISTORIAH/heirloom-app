import { Linking, Share, Text } from "react-native";

import { ModalSheet } from "@/components/ModalSheet";
import { Cap, Display, Lede, PrimaryButton, TextLink } from "@/components/ui";
import { useTick } from "@/hooks/useTick";
import { colors, font } from "@/theme";
import type { PendingVerification } from "@/types/reminders";

function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Connects a Telegram contact. The owner opens the link themselves; for the heir, the owner
 * shares it, since the bot only accepts a tap from the Telegram account that was entered.
 * The parent polls reminders while this is open and passes `verified` when it flips.
 */
export function VerifySheet({
  pending,
  verified,
  estateName,
  heirLabel,
  resending,
  error,
  onResend,
  onClose,
}: {
  pending: PendingVerification;
  verified: boolean;
  estateName: string;
  heirLabel: string;
  resending?: boolean;
  error?: string;
  onResend: () => void;
  onClose: () => void;
}) {
  const now = useTick();
  const self = pending.role === "check_in_signer";
  const handle = `@${pending.destination}`;
  const left = pending.expiresAt === undefined ? 0 : pending.expiresAt - now;
  const usable = pending.link !== undefined && left > 0;

  if (verified) {
    return (
      <ModalSheet onClose={onClose}>
        <Cap>Telegram</Cap>
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
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>{error}</Text>
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
