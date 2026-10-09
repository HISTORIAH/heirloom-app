import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { ErrorLine } from "@/components/create/WizardChrome";
import { ModalSheet } from "@/components/ModalSheet";
import { Cap, H2, PrimaryButton } from "@/components/ui";
import { colors, font, space } from "@/theme";

export function AmountSheet({
  symbol,
  maxLabel,
  error,
  busy,
  onClose,
  onMax,
  onContinue,
}: {
  symbol: string;
  maxLabel: string;
  error?: string;
  busy?: boolean;
  onClose: () => void;
  onMax: () => string;
  onContinue: (amount: string) => void;
}) {
  const [text, setText] = useState("");
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const issue = localError ?? error;
  const empty = text.trim().length === 0;

  return (
    <ModalSheet onClose={onClose}>
      <Cap>Send</Cap>
      <H2 size={22}>{`How much ${symbol}?`}</H2>
      <View>
        <TextInput
          value={text}
          onChangeText={(next) => {
            setLocalError(undefined);
            setText(next);
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.mute}
          editable={!busy}
          accessibilityLabel="Amount"
          style={{
            height: 52,
            paddingHorizontal: 14,
            borderRadius: space.radiusBtn,
            borderWidth: space.rule,
            borderColor: issue !== undefined ? colors.claim : colors.ink,
            backgroundColor: colors.paper,
            fontFamily: font.medium,
            fontSize: 16,
            color: colors.ink,
          }}
        />
        <Pressable
          onPress={() => {
            setLocalError(undefined);
            setText(onMax());
          }}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Max"
          style={{ marginTop: 8, alignSelf: "flex-start" }}
        >
          <Text style={{ fontFamily: font.bold, fontSize: 14, color: colors.ink }}>
            {`MAX · ${maxLabel}`}
          </Text>
        </Pressable>
        <View style={{ marginTop: 8 }}>
          <ErrorLine>{issue}</ErrorLine>
        </View>
      </View>
      <PrimaryButton
        label="Continue"
        disabled={busy || empty}
        onPress={() => onContinue(text)}
      />
    </ModalSheet>
  );
}
