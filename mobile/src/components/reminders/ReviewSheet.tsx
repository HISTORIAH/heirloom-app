import { Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { ModalSheet } from "@/components/ModalSheet";
import { Cap, Display, Lede, PrimaryButton } from "@/components/ui";
import { telegramHandle } from "@/lib/reminders";
import { colors, font, space } from "@/theme";
import type { AddRecipientRequest } from "@/types/reminders";

/**
 * The one check before saving: contacts can't be edited or removed yet, so each new one is read
 * back in large type. Profile-only saves skip this.
 */
export function ReviewSheet({
  contacts,
  heirLabel,
  ownerName,
  saving,
  error,
  onBack,
  onSave,
}: {
  contacts: AddRecipientRequest[];
  heirLabel: string;
  /** Set when the heir alert will carry it. */
  ownerName?: string;
  saving?: boolean;
  error?: string;
  onBack: () => void;
  onSave: () => void;
}) {
  return (
    <ModalSheet onClose={saving ? () => undefined : onBack}>
      <Cap>One last look</Cap>
      <Display size={26}>Check the spelling</Display>
      <Lede size={15}>You can’t change or remove these yet.</Lede>
      <View
        style={{
          borderRadius: space.radiusTile,
          borderWidth: space.rule,
          borderColor: colors.ink,
          backgroundColor: colors.paper,
        }}
      >
        {contacts.map((c, i) => {
          const email = c.channel === "email";
          return (
            <View
              key={`${c.role}-${c.channel}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 14,
                borderTopWidth: i === 0 ? 0 : space.rule,
                borderTopColor: colors.line,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: c.role === "heir" ? colors.orangeSoft : colors.yellow,
                  borderWidth: space.rule,
                  borderColor: colors.ink,
                }}
              >
                <Icon name={email ? "mail" : "telegram"} size={18} weight={2.4} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.mute }}>
                  {c.role === "heir" ? `Tells ${heirLabel}` : "Reminds you"}
                </Text>
                <Text
                  numberOfLines={2}
                  style={{ fontFamily: font.bold, fontSize: 17, color: colors.ink }}
                >
                  {email ? c.destination.trim().toLowerCase() : `@${telegramHandle(c.destination)}`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      {ownerName ? (
        <Text
          style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.mute }}
        >
          {`The heir alert will say it's from “${ownerName}”.`}
        </Text>
      ) : null}
      {error !== undefined ? (
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>
          {error}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Edit" tone="paper" disabled={saving} onPress={onBack} />
        </View>
        <View style={{ flex: 1.4 }}>
          <PrimaryButton
            label={saving ? "Saving…" : "Looks right"}
            tone="ink"
            disabled={saving}
            onPress={onSave}
          />
        </View>
      </View>
    </ModalSheet>
  );
}
