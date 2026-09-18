import { Text, View } from "react-native";

import { EstateAssets } from "@/components/EstateAssets";
import { EstateManage } from "@/components/EstateManage";
import { EstatePeople } from "@/components/EstatePeople";
import { Cap, H2, Lede, PrimaryButton, Tile } from "@/components/ui";
import { useEstatePresentation } from "@/hooks/useEstatePresentation";
import { shortAddress } from "@/lib/address";
import type { EstateRow } from "@/lib/estates";
import { unwrapOption } from "@/lib/option";
import { padUnit } from "@/lib/presentEstate";
import { colors } from "@/theme";

interface EstateDetailProps {
  row: EstateRow;
  onCheckIn?: () => void;
  padded?: boolean;
}

function ProgressTrack({
  ratio,
  fill,
  caption,
}: {
  ratio: number;
  fill: string;
  caption: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <View style={{ marginTop: 16 }}>
      <View
        style={{
          height: 10,
          borderRadius: 999,
          backgroundColor: colors.line,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: fill,
            borderRadius: 999,
          }}
        />
      </View>
      <Text
        style={{
          marginTop: 8,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 13,
          color: colors.mute,
        }}
      >
        {caption}
      </Text>
    </View>
  );
}

export function EstateDetail({ row, onCheckIn, padded = true }: EstateDetailProps) {
  const presentation = useEstatePresentation(row.data, row.claimableLamports);
  const {
    state,
    statusLabel,
    description,
    countdown,
    checkInTone,
    checkInLabel,
    progress,
  } = presentation;
  const heir = String(row.data.heir);
  const hbRaw = unwrapOption(row.data.hbSigner);
  const guardianRaw = unwrapOption(row.data.delegate);
  const heartbeat = hbRaw === null ? undefined : hbRaw;
  const guardian = guardianRaw === null ? undefined : guardianRaw;
  const label = row.data.label.trim() || shortAddress(heir);

  return (
    <View
      style={{
        padding: padded ? 20 : 0,
        paddingBottom: padded ? 8 : 0,
        gap: 14,
      }}
    >
      <Tile claim={state === "claimable"}>
        <Cap>{label}</Cap>
        <H2>{statusLabel}</H2>
        <Lede>{description}</Lede>

        <ProgressTrack
          ratio={progress.ratio}
          fill={progress.fill}
          caption={progress.caption}
        />

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
                backgroundColor: colors.soft,
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

      <EstatePeople heir={heir} heartbeat={heartbeat} guardian={guardian} />

      <EstateAssets
        claimableLamports={row.claimableLamports}
        tokenAccounts={row.data.claimableAssets}
        distributed={state === "distributed"}
      />

      {state !== "distributed" ? <EstateManage /> : null}
    </View>
  );
}
