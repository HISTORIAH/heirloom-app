import { Text, View } from "react-native";

import { EstateAssets } from "@/components/EstateAssets";
import { EstateManage } from "@/components/EstateManage";
import { EstatePeople } from "@/components/EstatePeople";
import { Cap, H2, Lede, PrimaryButton, Tile } from "@/components/ui";
import { useEstatePresentation } from "@/hooks/useEstatePresentation";
import { shortAddress } from "@/lib/address";
import type { EstateUiState } from "@/lib/estateState";
import type { EstateRow } from "@/lib/estates";
import { unwrapOption } from "@/lib/option";
import { padUnit } from "@/lib/presentEstate";
import { colors } from "@/theme";
import type { Address, Rpc, SolanaRpcApi } from "@solana/kit";

interface EstateDetailProps {
  row: EstateRow;
  rpc: Rpc<SolanaRpcApi>;
  onCheckIn?: () => void;
  onAddSol?: (lamports: bigint) => void;
  onReassign?: (newHeir: Address) => void;
  onTiming?: (fields: {
    heartbeatInterval?: bigint;
    gracePeriod?: bigint;
    pauseDuration?: bigint;
    label?: string;
  }) => void;
  onAddAsset?: (mint: Address, amount: bigint) => void;
  onCloseEstate?: () => void;
  adding?: boolean;
  padded?: boolean;
}

function detailStatusChip(state: EstateUiState): {
  bg: string;
  border: string;
  fg: string;
} {
  if (state === "claimable") {
    return { bg: colors.yellow, border: colors.ink, fg: colors.ink };
  }
  if (state === "grace") {
    return { bg: colors.sage, border: colors.ink, fg: colors.ink };
  }
  if (state === "distributed") {
    return { bg: colors.soft, border: colors.line, fg: colors.mute };
  }
  return { bg: colors.yellow, border: colors.ink, fg: colors.ink };
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

export function EstateDetail({
  row,
  rpc,
  onCheckIn,
  onAddSol,
  onReassign,
  onTiming,
  onAddAsset,
  onCloseEstate,
  adding,
  padded = true,
}: EstateDetailProps) {
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
  const statusChip = detailStatusChip(state);

  return (
    <View
      style={{
        padding: padded ? 20 : 0,
        paddingBottom: padded ? 8 : 0,
        gap: 14,
      }}
    >
      <Tile claim={state === "claimable"}>
        <H2>{label}</H2>
        <View style={{ marginTop: 4, marginBottom: 8, alignSelf: "flex-start" }}>
          <View
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: statusChip.border,
              backgroundColor: statusChip.bg,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: statusChip.fg,
              }}
            >
              {statusLabel}
            </Text>
          </View>
        </View>
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
              disabled={adding}
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
        onAddSol={onAddSol}
        adding={adding}
      />

      {state !== "distributed" && onReassign && onTiming && onAddAsset && onCloseEstate ? (
        <EstateManage
          key={row.address}
          row={row}
          rpc={rpc}
          busy={adding}
          onReassign={onReassign}
          onTiming={onTiming}
          onAddAsset={onAddAsset}
          onClose={onCloseEstate}
        />
      ) : null}
    </View>
  );
}
