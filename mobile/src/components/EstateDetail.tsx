import { Text, View } from "react-native";

import { EstateAssets } from "@/components/EstateAssets";
import { EstateManage } from "@/components/EstateManage";
import { EstatePeople } from "@/components/EstatePeople";
import { EstatePicker } from "@/components/EstatePicker";
import { EstateSlab } from "@/components/EstateSlab";
import { useDashboardView } from "@/hooks/useEstatePresentation";
import { shortAddress } from "@/lib/address";
import type { EstateRow } from "@/lib/estates";
import { unwrapOption } from "@/lib/option";
import { colors } from "@/theme";
import type { Address, Rpc, SolanaRpcApi } from "@solana/kit";

interface EstateDetailProps {
  row: EstateRow;
  rows: EstateRow[];
  picked: number;
  onSelect: (index: number) => void;
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
  checkingIn?: boolean;
  onHoldingChange?: (holding: boolean) => void;
}

function SecHead({ title, aside }: { title: string; aside?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 14,
      }}
    >
      <Text
        style={{
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 13,
          color: colors.mute,
        }}
      >
        {title}
      </Text>
      {aside !== undefined ? (
        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            color: colors.mute,
          }}
        >
          {aside}
        </Text>
      ) : null}
    </View>
  );
}

export function EstateDetail({
  row,
  rows,
  picked,
  onSelect,
  rpc,
  onCheckIn,
  onAddSol,
  onReassign,
  onTiming,
  onAddAsset,
  onCloseEstate,
  adding,
  checkingIn,
  onHoldingChange,
}: EstateDetailProps) {
  const view = useDashboardView(row.data, row.claimableLamports);
  const heir = String(row.data.heir);
  const hbRaw = unwrapOption(row.data.hbSigner);
  const guardianRaw = unwrapOption(row.data.delegate);
  const heartbeat = hbRaw === null ? undefined : hbRaw;
  const guardian = guardianRaw === null ? undefined : guardianRaw;
  const label = row.data.label.trim() || shortAddress(heir);
  const live = view.state !== "distributed";
  const canManage =
    live &&
    onReassign !== undefined &&
    onTiming !== undefined &&
    onAddAsset !== undefined &&
    onCloseEstate !== undefined;

  return (
    <View>
      <EstateSlab
        key={row.address}
        view={view}
        label={label}
        switcher={
          rows.length > 1 ? (
            <EstatePicker rows={rows} selected={picked} onSelect={onSelect} />
          ) : undefined
        }
        busy={checkingIn}
        disabled={adding}
        onCheckIn={onCheckIn}
        onHoldingChange={onHoldingChange}
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
        <SecHead title="In the vault" />
        <EstateAssets
          claimableLamports={row.claimableLamports}
          tokenAccounts={row.data.claimableAssets}
          distributed={!live}
          onAddSol={onAddSol}
          adding={adding}
        />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
        <SecHead title="Named on this estate" />
        <EstatePeople heir={heir} heartbeat={heartbeat} guardian={guardian} />
      </View>

      {canManage ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
          <SecHead title="Manage" />
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
        </View>
      ) : null}

      <View style={{ height: 130 }} />
    </View>
  );
}
