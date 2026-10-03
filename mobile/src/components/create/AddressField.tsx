import * as Clipboard from "expo-clipboard";
import { Pressable, Text, TextInput, View } from "react-native";

import { ErrorLine } from "@/components/create/WizardChrome";
import { Icon, type IconName } from "@/components/Icon";
import { colors, font, space } from "@/theme";

function SmallAction({
  icon,
  label,
  dark,
  onPress,
}: {
  icon: IconName;
  label: string;
  dark?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        height: 44,
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: space.radiusBtn,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: dark ? colors.ink : colors.paper,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name={icon} size={18} color={dark ? colors.bg : colors.ink} />
      <Text style={{ fontFamily: font.bold, fontSize: 14, color: dark ? colors.bg : colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Pull a Solana address out of pasted or scanned text (`solana:` URIs included). */
export function addressFromText(text: string): string {
  const trimmed = text.trim();
  const uri = /^solana:([1-9A-HJ-NP-Za-km-z]{32,44})/.exec(trimmed);
  return uri?.[1] ?? trimmed;
}

/** Solana address input with Scan QR and Paste. */
export function AddressField({
  value,
  error,
  label = "Wallet address",
  onChange,
  onScan,
}: {
  value: string;
  error?: string;
  label?: string;
  onChange: (next: string) => void;
  onScan?: () => void;
}) {
  async function onPaste() {
    const text = await Clipboard.getStringAsync();
    if (text.trim().length > 0) onChange(addressFromText(text));
  }

  return (
    <View style={{ gap: 8 }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Solana address"
        placeholderTextColor={colors.mute}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
        style={{
          height: 48,
          paddingHorizontal: 12,
          borderRadius: space.radiusBtn,
          borderWidth: space.rule,
          borderColor: error ? colors.claim : colors.ink,
          backgroundColor: colors.bg,
          fontFamily: font.medium,
          fontSize: 15,
          fontVariant: ["tabular-nums"],
          color: colors.ink,
        }}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {onScan !== undefined ? (
          <SmallAction dark icon="qr" label="Scan QR" onPress={onScan} />
        ) : null}
        <SmallAction icon="paste" label="Paste" onPress={() => void onPaste()} />
      </View>
      <ErrorLine>{error}</ErrorLine>
    </View>
  );
}
