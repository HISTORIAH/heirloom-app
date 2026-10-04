import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { EstateListRow } from "@/components/home/EstateList";
import { Cap, PrimaryButton } from "@/components/ui";
import { colors, font, space } from "@/theme";
import { EstateRow } from "@/types/program";
import { bySoonest, estateSpan, presentGuardian, shortAddress } from "@/lib";

function SignerCard({
  row,
  busy,
  disabled,
  onCheckIn,
}: {
  row: EstateRow;
  busy: boolean;
  disabled: boolean;
  onCheckIn: () => void;
}) {
  const span = estateSpan(row.data, row.claimableLamports);
  const grace = span.state === "grace";
  const days = grace ? span.daysUntilClaim : span.daysUntilCheckIn;
  const live = span.state === "active" || span.state === "grace";

  return (
    <View
      style={{
        backgroundColor: grace
          ? colors.orange
          : span.state === "claimable"
            ? colors.claim
            : colors.yellow,
        borderWidth: space.rule,
        borderColor: colors.ink,
        borderRadius: space.radiusHero,
        padding: 18,
        gap: 10,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.ink }}>
          You’re the check-in signer
        </Text>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 12,
            fontVariant: ["tabular-nums"],
            color: colors.ink,
          }}
        >
          for {shortAddress(String(row.data.authority))}
        </Text>
      </View>
      {live ? (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
          <Text
            style={{
              fontFamily: font.semibold,
              fontSize: 80,
              lineHeight: 80,
              letterSpacing: -3.6,
              fontVariant: ["tabular-nums"],
              color: colors.ink,
              marginBottom: -6,
            }}
          >
            {days}
          </Text>
          <Text
            style={{
              flex: 1,
              paddingBottom: 6,
              fontFamily: font.bold,
              fontSize: 18,
              lineHeight: 22,
              color: colors.ink,
            }}
          >
            {grace ? "days until their\nheir can claim" : days === 1 ? "day left" : "days left"}
          </Text>
        </View>
      ) : (
        <Text style={{ fontFamily: font.semibold, fontSize: 22, color: colors.ink }}>
          {span.state === "claimable"
            ? "Their heir can claim now."
            : "This estate has been claimed."}
        </Text>
      )}
      {span.state !== "distributed" ? (
        <PrimaryButton
          tone="ink"
          icon="check"
          label={busy ? "Confirm in wallet…" : "Check in for them"}
          disabled={busy || disabled}
          onPress={onCheckIn}
        />
      ) : null}
    </View>
  );
}

function GuardianRow({ row, onPress }: { row: EstateRow; onPress: () => void }) {
  const view = presentGuardian(row);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: space.radiusTile,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: colors.paper,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name="shield" size={22} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.ink }}>
          Estate from {shortAddress(String(row.data.authority))}
        </Text>
        <Text
          style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.mute }}
        >
          {view.canHold ? "Active. You can pause it once if it enters grace." : view.eyebrow}
        </Text>
      </View>
      <Icon name="chevronRight" size={18} />
    </Pressable>
  );
}

/** Roles this wallet holds on other people's estates. Hidden when there are none. */
export function RoleSections({
  heir,
  signer,
  guardian,
  signingFor,
  busy,
  onSignerCheckIn,
  onGuardian,
  onHeir,
}: {
  heir: EstateRow[];
  signer: EstateRow[];
  guardian: EstateRow[];
  signingFor?: string;
  busy: boolean;
  onSignerCheckIn: (row: EstateRow) => void;
  onGuardian: (row: EstateRow) => void;
  onHeir: (row: EstateRow) => void;
}) {
  const signers = bySoonest(signer);
  const heirs = bySoonest(heir);

  return (
    <View style={{ gap: 20 }}>
      {signers.length > 0 ? (
        <View style={{ gap: 14 }}>
          <Cap>Needs you</Cap>
          {signers.map((row) => (
            <SignerCard
              key={row.address}
              row={row}
              busy={signingFor === row.address}
              disabled={busy}
              onCheckIn={() => onSignerCheckIn(row)}
            />
          ))}
        </View>
      ) : null}

      {guardian.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Cap>Guardian on</Cap>
          {guardian.map((row) => (
            <GuardianRow key={row.address} row={row} onPress={() => onGuardian(row)} />
          ))}
        </View>
      ) : null}

      {heirs.length > 0 ? (
        <View>
          <View style={{ marginBottom: 6 }}>
            <Cap>Named as heir</Cap>
          </View>
          {heirs.map((row) => (
            <EstateListRow
              key={row.address}
              row={row}
              sub={`From ${shortAddress(String(row.data.authority))}`}
              onPress={() => onHeir(row)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
