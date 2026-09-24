import { View } from "react-native";

import { CardScanButton } from "@/components/create/CardScanButton";
import { CreateField } from "@/components/create/CreateField";
import { H2, Lede } from "@/components/ui";
import { LABEL_MAX_LEN } from "@/lib/constants";

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
  scanning,
  onScanCard,
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
  scanning?: "heir" | "signer";
  onScanCard: (role: "heir" | "signer") => void;
  onLift?: (node: View) => void;
}) {
  return (
    <View>
      <H2>Who inherits</H2>
      <CreateField
        label="What to call this estate"
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
        value={heir}
        placeholder="Paste an address"
        error={heirError}
        trailing={
          <CardScanButton
            label="Scan a card for the heir"
            busy={scanning !== undefined}
            onPress={() => onScanCard("heir")}
          />
        }
        onChangeText={(v) => {
          clearHeirError();
          setHeir(v);
        }}
        onLift={onLift}
      />

      <View style={{ marginTop: 28 }}>
        <Lede>Optional. Cannot be changed later.</Lede>
        <CreateField
          label="Guardian"
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
          value={signer}
          placeholder="Leave blank to skip"
          error={signerError}
          trailing={
            <CardScanButton
              label="Scan a card for the check-in signer"
              busy={scanning !== undefined}
              onPress={() => onScanCard("signer")}
            />
          }
          onChangeText={(v) => {
            clearSignerError();
            setSigner(v);
          }}
          onLift={onLift}
        />
      </View>
    </View>
  );
}
