import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import type { Address } from "@solana/kit";

import { addressFromText } from "@/components/create/AddressField";
import { ErrorLine } from "@/components/create/WizardChrome";
import { Icon } from "@/components/Icon";
import { ModalSheet } from "@/components/ModalSheet";
import { Cap, H2, PrimaryButton } from "@/components/ui";
import { colors, font, space } from "@/theme";
import { errorMessage, parseAddress } from "@/lib";

export function DestSheet({
  cap = "Claim",
  title = "Send to a wallet I own",
  error,
  busy,
  onClose,
  onSend,
  onEdit,
}: {
  cap?: string;
  title?: string;
  error?: string;
  busy?: boolean;
  onClose: () => void;
  onSend: (destination: Address) => void;
  onEdit: () => void;
}) {
  const [text, setText] = useState("");
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const issue = localError ?? error;
  const empty = text.trim().length === 0;

  function clearIssues() {
    setLocalError(undefined);
    onEdit();
  }

  async function onPaste() {
    const clipped = await Clipboard.getStringAsync();
    if (clipped.trim().length === 0) return;
    clearIssues();
    setText(addressFromText(clipped));
  }

  function submit() {
    try {
      onSend(parseAddress(text, "destination"));
    } catch (cause) {
      setLocalError(errorMessage(cause, "Enter a valid address."));
    }
  }

  return (
    <ModalSheet onClose={onClose}>
      <Cap>{cap}</Cap>
      <H2 size={22}>{title}</H2>
      <View>
        <View style={{ justifyContent: "center" }}>
          <TextInput
            value={text}
            onChangeText={(next) => {
              clearIssues();
              setText(next);
            }}
            placeholder="Solana address"
            placeholderTextColor={colors.mute}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            accessibilityLabel="Destination address"
            style={{
              height: 52,
              paddingLeft: 14,
              paddingRight: 48,
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
            onPress={() => void onPaste()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Paste"
            hitSlop={8}
            style={{
              position: "absolute",
              right: 12,
              height: 52,
              justifyContent: "center",
            }}
          >
            <Icon name="paste" size={20} color={colors.quiet} />
          </Pressable>
        </View>
        <View style={{ marginTop: 8 }}>
          <ErrorLine>{issue}</ErrorLine>
        </View>
      </View>
      <PrimaryButton label="Send" disabled={busy || empty} onPress={submit} />
    </ModalSheet>
  );
}
