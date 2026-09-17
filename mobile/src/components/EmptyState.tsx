import { Text, View } from "react-native";

import { VaultMark } from "@/components/VaultMark";
import { PrimaryButton, TextLink } from "@/components/ui";
import { colors, space } from "@/theme";

interface EmptyStateProps {
  title?: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  tertiaryLabel?: string;
  onTertiary?: () => void;
}

export function EmptyState({
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  tertiaryLabel,
  onTertiary,
}: EmptyStateProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 28,
        paddingBottom: 24,
      }}
    >
      <View style={{ marginBottom: 28 }}>
        <VaultMark size={88} color={colors.line} />
      </View>
      {title ? (
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 34,
            letterSpacing: 34 * -0.035,
            lineHeight: 34 * 0.96,
            color: colors.ink,
            marginVertical: 8,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      ) : null}
      <Text
        style={{
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 16,
          lineHeight: 24,
          color: colors.mute,
          textAlign: "center",
        }}
      >
        {body}
      </Text>
      <View style={{ paddingTop: 28, width: "100%", paddingHorizontal: space.pad - 8 }}>
        <PrimaryButton label={primaryLabel} onPress={onPrimary} />
        {secondaryLabel && onSecondary ? (
          <TextLink label={secondaryLabel} onPress={onSecondary} />
        ) : null}
        {tertiaryLabel && onTertiary ? (
          <TextLink label={tertiaryLabel} onPress={onTertiary} />
        ) : null}
      </View>
    </View>
  );
}
