import { useState } from "react";
import { Text, View } from "react-native";

import { CreateField } from "@/components/create/CreateField";
import { Cap, H2, Lede, TextLink, Tile } from "@/components/ui";
import { LABEL_MAX_LEN } from "@/lib/constants";
import { colors } from "@/theme";

export function HeirsStep({
  label,
  heir,
  guardian,
  signer,
  labelError,
  heirError,
  guardianError,
  signerError,
  setLabel,
  setHeir,
  setGuardian,
  setSigner,
  clearLabelError,
  clearHeirError,
  clearGuardianError,
  clearSignerError,
  onLift,
}: {
  label: string;
  heir: string;
  guardian: string;
  signer: string;
  labelError?: string;
  heirError?: string;
  guardianError?: string;
  signerError?: string;
  setLabel: (v: string) => void;
  setHeir: (v: string) => void;
  setGuardian: (v: string) => void;
  setSigner: (v: string) => void;
  clearLabelError: () => void;
  clearHeirError: () => void;
  clearGuardianError: () => void;
  clearSignerError: () => void;
  onLift?: (node: View) => void;
}) {
  const [cardNote, setCardNote] = useState(false);

  return (
    <View>
      <H2>Who inherits</H2>
      <CreateField
        label="What to call this estate"
        hint="Only you see this. It keeps estates apart on your dashboard."
        value={label}
        placeholder="Mum's estate"
        maxLength={LABEL_MAX_LEN}
        showCounter
        error={labelError}
        onChangeText={(v) => {
          clearLabelError();
          setLabel(v);
        }}
        onLift={onLift}
      />
      <CreateField
        label="Their Solana wallet address"
        hint="Paste it from your heir's wallet. Assets go here and nowhere else."
        value={heir}
        placeholder="Paste an address"
        error={heirError}
        onChangeText={(v) => {
          clearHeirError();
          setHeir(v);
        }}
        onLift={onLift}
      />
      <TextLink
        label="Fill from a card"
        quiet
        align="left"
        onPress={() => setCardNote(true)}
      />
      {cardNote ? (
        <Text
          style={{
            marginTop: 8,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            color: colors.mute,
          }}
        >
          Coming next.
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginTop: 28,
          marginBottom: 8,
        }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        <Cap>Optional</Cap>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      </View>

      <Tile paper>
        <Cap>Set once</Cap>
        <View style={{ marginTop: 8 }}>
          <Lede>
            Guardian and check-in signer cannot be changed later. Leave either blank to skip. How long a guardian can hold is set with the clocks.
          </Lede>
        </View>
        <CreateField
          label="Guardian"
          hint="Someone you trust who can hold the claim window if they know you've died."
          value={guardian}
          placeholder="Leave blank to skip"
          error={guardianError}
          onChangeText={(v) => {
            clearGuardianError();
            setGuardian(v);
          }}
          onLift={onLift}
        />
        <CreateField
          label="Check-in signer"
          hint="A second wallet allowed to check in for you, if you'd rather not use this one."
          value={signer}
          placeholder="Leave blank to skip"
          error={signerError}
          onChangeText={(v) => {
            clearSignerError();
            setSigner(v);
          }}
          onLift={onLift}
        />
      </Tile>
    </View>
  );
}
