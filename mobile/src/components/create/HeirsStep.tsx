import { View } from "react-native";

import { CreateField } from "@/components/create/CreateField";
import { Cap, H2, Lede, Tile } from "@/components/ui";
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
  return (
    <View>
      <H2>Who inherits</H2>
      <CreateField
        label="What to call this estate"
        hint="Visible to anyone named on this estate."
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
        hint="Assets go here and nowhere else."
        value={heir}
        placeholder="Paste an address"
        error={heirError}
        onChangeText={(v) => {
          clearHeirError();
          setHeir(v);
        }}
        onLift={onLift}
      />

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
            Addresses below cannot be changed later.
          </Lede>
        </View>
        <CreateField
          label="Guardian"
          hint="Someone you trust who can hold the claim window in your absence."
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
