import { Text, View } from "react-native";

import { Cap, H2, Lede, PrimaryButton, Row, Tile } from "@/components/ui";
import { useEstatePresentation } from "@/hooks/useEstatePresentation";
import { shortAddress } from "@/lib/address";
import type { EstateRow } from "@/lib/estates";
import { unwrapOption } from "@/lib/option";
import { formatSol, padUnit } from "@/lib/presentEstate";
import { colors } from "@/theme";

interface EstateDetailProps {
  row: EstateRow;
  onCheckIn?: () => void;
  padded?: boolean;
}

export function EstateDetail({ row, onCheckIn, padded = true }: EstateDetailProps) {
  const presentation = useEstatePresentation(row.data, row.claimableLamports);
  const { state, statusLabel, description, countdown, checkInTone, checkInLabel } =
    presentation;
  const heir = row.data.heir;
  const hb = unwrapOption(row.data.hbSigner);
  const label = row.data.label.trim() || shortAddress(String(heir));

  return (
    <View style={{ padding: padded ? 20 : 0, paddingBottom: padded ? 8 : 0, gap: 12 }}>
      <Tile claim={state === "claimable"}>
        <Cap>Vault status</Cap>
        <H2>{statusLabel}</H2>
        <Lede>{description}</Lede>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {(
            [
              ["Days", countdown.days],
              ["Hours", countdown.hours],
              ["Min", countdown.minutes],
              ["Sec", countdown.seconds],
            ] as const
          ).map(([unit, value]) => (
            <View
              key={unit}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 6,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_600SemiBold",
                  fontSize: 22,
                  fontVariant: ["tabular-nums"],
                  color: colors.ink,
                }}
              >
                {padUnit(value)}
              </Text>
              <Cap>{unit}</Cap>
            </View>
          ))}
        </View>
        {state !== "distributed" ? (
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label={checkInLabel}
              tone={checkInTone}
              onPress={onCheckIn}
            />
          </View>
        ) : null}
      </Tile>

      <Tile paper>
        <Cap>Heir</Cap>
        <Row left={label} right={shortAddress(String(heir))} />
        <Row
          left="Heartbeat signer"
          right={hb ? shortAddress(hb) : "Not set"}
          muteLeft
        />
      </Tile>

      <Tile>
        <Cap>Vault</Cap>
        <Row left="SOL" right={formatSol(row.claimableLamports)} />
        {row.data.claimableAssets > 0 ? (
          <Row
            left="Tokens"
            right={
              row.data.claimableAssets === 1
                ? "1 account"
                : `${row.data.claimableAssets} accounts`
            }
          />
        ) : null}
      </Tile>
    </View>
  );
}
