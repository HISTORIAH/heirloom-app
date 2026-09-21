import { Text, View } from "react-native";

import { CheckRow, EditLink } from "@/components/create/CheckRow";
import { EstateTimeline } from "@/components/create/EstateTimeline";
import { Cap, H2, Row, Tile } from "@/components/ui";
import { CARD_FEE_FLOAT_SOL } from "@/lib/constants";
import { dateLong } from "@/lib/estateTiming";
import { colors } from "@/theme";

function Head({
  cap,
  onEdit,
}: {
  cap: string;
  onEdit: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Cap>{cap}</Cap>
      <EditLink onPress={onEdit} />
    </View>
  );
}

export function ReviewStep({
  label,
  heirShort,
  guardianShort,
  signerShort,
  solDisplay,
  hasSol,
  fundHeir,
  heartbeatDays,
  graceDays,
  pauseDays,
  acked,
  onEditHeirs,
  onEditAssets,
  onEditTiming,
  onToggleFundHeir,
  onToggleAck,
}: {
  label: string;
  heirShort: string;
  guardianShort?: string;
  signerShort?: string;
  solDisplay: string;
  hasSol: boolean;
  fundHeir: boolean;
  heartbeatDays: number;
  graceDays: number;
  pauseDays: number;
  acked: boolean;
  onEditHeirs: () => void;
  onEditAssets: () => void;
  onEditTiming: () => void;
  onToggleFundHeir: () => void;
  onToggleAck: () => void;
}) {
  const total = heartbeatDays + graceDays;
  const hasSigner = signerShort !== undefined;

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Cap>Opens</Cap>
          <H2 size={28}>{dateLong(total)}</H2>
        </View>
        <View style={{ marginTop: 18 }}>
          <EditLink onPress={onEditTiming} />
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
        <EstateTimeline heartbeatDays={heartbeatDays} graceDays={graceDays} mini />
      </View>

      <Tile paper style={{ marginTop: 20 }}>
        <Head cap="People" onEdit={onEditHeirs} />
        <Row left={label} right={heirShort} />
        {guardianShort ? (
          <Row left="Guardian" right={guardianShort} muteLeft />
        ) : null}
        {guardianShort && pauseDays > 0 ? (
          <Row left="Hold" right={`${pauseDays}d`} muteLeft />
        ) : null}
        {hasSigner ? (
          <Row left="Signer" right={signerShort} muteLeft />
        ) : null}
      </Tile>

      <Tile style={{ marginTop: 12 }}>
        <Head cap="Estate" onEdit={onEditAssets} />
        {hasSol ? (
          <Row left="SOL" right={solDisplay} />
        ) : (
          <Row left="SOL" right="Nothing yet" />
        )}
        {hasSigner ? (
          <Row left="Signer gas" right={`${CARD_FEE_FLOAT_SOL} SOL`} />
        ) : null}
        <View
          style={{
            marginTop: 8,
            paddingTop: 12,
            borderTopWidth: 1,
            borderColor: colors.line,
          }}
        >
          <CheckRow
            checked={fundHeir}
            onToggle={onToggleFundHeir}
            body="Fund a card heir"
            hint="0.02 SOL so a physical card can pay to claim. Leave off for a normal wallet."
          />
        </View>
      </Tile>

      <CheckRow
        boxed
        checked={acked}
        onToggle={onToggleAck}
        body="If I miss check-in, the heir can claim."
      />
      <Text
        style={{
          marginTop: 12,
          textAlign: "right",
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 12,
          color: colors.mute,
        }}
      >
        Network ~0.002 SOL
      </Text>
    </View>
  );
}
