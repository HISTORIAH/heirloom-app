import { Text, View } from "react-native";

import { VaultMark } from "@/components/VaultMark";
import { PrimaryButton, TextLink } from "@/components/ui";
import { colors } from "@/theme";

export function ConnectWallet({
  body = "Connect your wallet.",
  busy,
  onConnect,
}: {
  body?: string;
  busy?: boolean;
  onConnect: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 28,
        paddingBottom: 72,
        backgroundColor: colors.bg,
      }}
    >
      <View style={{ alignItems: "center" }}>
        <VaultMark size={88} color={colors.line} />
      </View>
      <Text
        style={{
          marginTop: 28,
          textAlign: "center",
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 16,
          lineHeight: 24,
          color: colors.mute,
        }}
      >
        {body}
      </Text>
      <View style={{ marginTop: 28 }}>
        <PrimaryButton
          label={busy ? "Working…" : "Connect wallet"}
          disabled={busy}
          onPress={onConnect}
        />
      </View>
    </View>
  );
}

interface EmptyStateProps {
  title?: string;
  body?: string;
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
        backgroundColor: colors.soft,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 22,
      }}
    >
      {title !== undefined ? (
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 15,
            color: colors.ink,
          }}
        >
          {title}
        </Text>
      ) : null}
      {body !== undefined ? (
        <Text
          style={{
            marginTop: title !== undefined ? 14 : 0,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 16,
            lineHeight: 24,
            color: colors.ink,
            maxWidth: 300,
          }}
        >
          {body}
        </Text>
      ) : null}
      <View style={{ marginTop: 22 }}>
        <PrimaryButton label={primaryLabel} onPress={onPrimary} />
        {secondaryLabel !== undefined && onSecondary !== undefined ? (
          <TextLink label={secondaryLabel} align="left" onPress={onSecondary} />
        ) : null}
        {tertiaryLabel !== undefined && onTertiary !== undefined ? (
          <TextLink label={tertiaryLabel} quiet align="left" onPress={onTertiary} />
        ) : null}
      </View>
    </View>
  );
}
