import { Text, View } from "react-native";

import { CheckRow, EditLink } from "@/components/create/CheckRow";
import { DayRuler } from "@/components/DayRuler";
import { QuietRow, SectionLabel } from "@/components/Quiet";
import { StateSlab } from "@/components/StateSlab";
import { CARD_FEE_FLOAT_SOL } from "@/lib/constants";
import { dateShort } from "@/lib/estateTiming";
import { colors } from "@/theme";

function dayWord(n: number): string {
  return n === 1 ? "day" : "days";
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
  const claimOn = dateShort(heartbeatDays + graceDays);

  return (
    <View style={{ marginHorizontal: -20 }}>
      <StateSlab
        color={colors.yellow}
        eyebrow="Next check-in due in"
        value={String(heartbeatDays)}
        unit={dayWord(heartbeatDays)}
        leading={
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <EditLink onPress={onEditTiming} />
          </View>
        }
      >
        <DayRuler
          intervalDays={heartbeatDays}
          graceDays={graceDays}
          elapsedDays={0}
          legendFrom="Today"
          legendTo={`Heir can claim ${claimOn}`}
        />
      </StateSlab>

      <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <SectionLabel title="Named on this estate" />
          <EditLink onPress={onEditHeirs} />
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
          <QuietRow title="Label" desc={label} />
          <QuietRow title="Heir" desc={heirShort} />
          <QuietRow title="Guardian" desc={guardianShort ?? "Not set"} />
          <QuietRow title="Check-in signer" desc={signerShort ?? "Not set"} />
          {guardianShort !== undefined && pauseDays > 0 ? (
            <QuietRow title="Pause" desc={`${pauseDays} days`} />
          ) : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <SectionLabel title="In the vault" />
          <EditLink onPress={onEditAssets} />
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
          <QuietRow title="SOL" desc={hasSol ? solDisplay : "Nothing yet"} />
          {signerShort !== undefined ? (
            <QuietRow title="Signer gas" desc={`${CARD_FEE_FLOAT_SOL} SOL`} />
          ) : null}
        </View>
        <View style={{ marginTop: 16 }}>
          <CheckRow
            checked={fundHeir}
            onToggle={onToggleFundHeir}
            body="Fund a card heir"
            hint="0.02 SOL for a card to pay claim fees."
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
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
    </View>
  );
}
