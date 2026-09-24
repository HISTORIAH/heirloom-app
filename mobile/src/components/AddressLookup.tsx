import { TextInput, View } from "react-native";

import { Cap, PrimaryButton } from "@/components/ui";
import { colors, space } from "@/theme";

export type LookupField = {
  key: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

interface AddressLookupProps {
  fields: LookupField[];
  submitLabel: string;
  busy?: boolean;
  onSubmit: () => void;
}

export function AddressLookup({
  fields,
  submitLabel,
  busy,
  onSubmit,
}: AddressLookupProps) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 12,
        backgroundColor: colors.soft,
        padding: 14,
        gap: 12,
      }}
    >
      {fields.map((field) => (
        <View key={field.key}>
          <Cap>{field.label}</Cap>
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Solana address"
            placeholderTextColor={colors.mute}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            style={{
              marginTop: 8,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: space.radiusBtn,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 14,
              color: colors.ink,
              backgroundColor: colors.bg,
            }}
          />
        </View>
      ))}
      <PrimaryButton
        label={busy ? "Working…" : submitLabel}
        tone="ink"
        disabled={busy}
        onPress={onSubmit}
      />
    </View>
  );
}
