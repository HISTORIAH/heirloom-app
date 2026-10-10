import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ConfirmSheet } from "@/components/ConfirmSheet";
import { TAB_BAR_CLEARANCE } from "@/components/FloatingTabBar";
import { Icon } from "@/components/Icon";
import { InkToast } from "@/components/InkToast";
import { ReminderTimeline } from "@/components/reminders/ReminderTimeline";
import { TopBar } from "@/components/TopBar";
import { Badge, Cap, Lede, PrimaryButton } from "@/components/ui";
import { BACKEND_URL } from "@/config";
import { useConfirmSheet, useEstates, useOwnerTx, useRemindersFor, useSession } from "@/hooks";
import { estateName, estateSpan } from "@/lib";
import { needsAttention } from "@/lib/attention";
import { channelLine, remindersOn } from "@/lib/reminders";
import { colors, font, space } from "@/theme";
import type { EstateRow } from "@/types/program";
import type { AttentionItem, EstateReminders } from "@/types/reminders";

function AttentionRow({
  item,
  busy,
  disabled,
  onPress,
}: {
  item: AttentionItem;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderWidth: space.rule,
        borderColor: colors.ink,
        borderRadius: space.radiusBtn,
        backgroundColor: item.fill,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: 15, color: colors.ink }}>
          {item.estateName}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.ink }}>
          {item.text}
        </Text>
      </View>
      <PrimaryButton
        compact
        tone="paper"
        label={busy ? "Confirm…" : item.actionLabel}
        disabled={disabled}
        onPress={onPress}
      />
    </View>
  );
}

function EstateRemindersRow({
  row,
  reminders,
  onPress,
}: {
  row: EstateRow;
  reminders?: EstateReminders;
  onPress: () => void;
}) {
  const status = reminders?.status ?? "loading";
  const ready = status === "ready" && reminders !== undefined;
  const line =
    status === "locked"
      ? "Private until you sign in"
      : status === "error"
        ? "Couldn't load"
        : ready
          ? channelLine(reminders.recipients)
          : "Loading…";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Opens this estate's reminders"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 48,
        paddingVertical: 12,
        borderBottomWidth: space.rule,
        borderBottomColor: colors.line,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{ flexShrink: 1, fontFamily: font.bold, fontSize: 16, color: colors.ink }}
          >
            {estateName(row)}
          </Text>
          {ready ? (
            remindersOn(reminders.recipients) ? (
              <Badge label="On" fill={colors.lime} />
            ) : (
              <Badge label="Off" />
            )
          ) : status === "locked" ? (
            <Icon name="lock" size={14} color={colors.mute} />
          ) : null}
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.mute }}>{line}</Text>
      </View>
      <Icon name="chevronRight" size={18} weight={2} />
    </Pressable>
  );
}

/**
 * What needs the owner across every estate, then each estate's reminders. Chain items show
 * straight away; reminder state (and the reminder gaps in "Needs attention") once signed in.
 * Contact values never show here, only on an estate's reminders screen.
 */
export default function AlertsScreen() {
  const router = useRouter();
  const { rows, reload } = useEstates("authority");
  const session = useSession();
  const { checkIn } = useOwnerTx();
  const { ask, fail, cancel, confirm, extra } = useConfirmSheet();
  const [working, setWorking] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<string | undefined>(undefined);

  const live = rows.filter(
    (row) => estateSpan(row.data, row.claimableLamports).state !== "distributed",
  );
  const reminders = useRemindersFor(live.map((row) => String(row.address)));
  const locked = reminders.some((r) => r.status === "locked");
  const attention = needsAttention(live, reminders);

  useEffect(() => {
    if (toast === undefined) return;
    const id = setTimeout(() => setToast(undefined), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const openReminders = (estateAddress: string) =>
    router.push(`/reminders?estate=${estateAddress}`);

  async function onCheckIn(item: AttentionItem) {
    const row = live.find((r) => String(r.address) === item.estateAddress);
    if (row === undefined || working !== undefined) return;
    setWorking(item.key);
    try {
      await checkIn(row.data.heir);
      await reload();
      setToast("Checked in.");
    } catch (cause) {
      fail("Check-in", cause);
    } finally {
      setWorking(undefined);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.pad,
          paddingTop: 16,
          paddingBottom: TAB_BAR_CLEARANCE,
          gap: 32,
        }}
      >
        {live.length === 0 ? (
          <Lede>Create an estate to set up reminders.</Lede>
        ) : (
          <>
            <View style={{ gap: 14 }}>
              <Cap>Needs attention</Cap>
              {attention.length === 0 ? (
                <Text style={{ fontFamily: font.regular, fontSize: 14, color: colors.mute }}>
                  {locked
                    ? "Nothing on-chain. Sign in to check reminders too."
                    : "Nothing right now."}
                </Text>
              ) : (
                attention.map((item) => (
                  <AttentionRow
                    key={item.key}
                    item={item}
                    busy={working === item.key}
                    disabled={working !== undefined}
                    onPress={() =>
                      item.action === "check-in"
                        ? void onCheckIn(item)
                        : openReminders(item.estateAddress)
                    }
                  />
                ))
              )}
            </View>

            {BACKEND_URL === undefined ? (
              <Lede>Reminders aren’t available in this build.</Lede>
            ) : (
              <>
                <View style={{ gap: 14 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Cap>Reminders by estate</Cap>
                    {locked ? (
                      <Pressable
                        onPress={() => void session.signIn().catch(() => undefined)}
                        disabled={session.signing}
                        accessibilityRole="button"
                        hitSlop={8}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          opacity: session.signing ? 0.45 : pressed ? 0.7 : 1,
                        })}
                      >
                        <Icon name="lock" size={14} weight={2.2} />
                        <Text
                          style={{
                            fontFamily: font.bold,
                            fontSize: 13,
                            color: colors.ink,
                            textDecorationLine: "underline",
                          }}
                        >
                          {session.signing ? "Check your wallet…" : "Sign in to see"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={{ borderTopWidth: space.rule, borderTopColor: colors.line }}>
                    {live.map((row, i) => (
                      <EstateRemindersRow
                        key={row.address}
                        row={row}
                        reminders={reminders[i]}
                        onPress={() => openReminders(String(row.address))}
                      />
                    ))}
                  </View>
                </View>

                <View style={{ gap: 14 }}>
                  <Cap>When reminders go out</Cap>
                  <ReminderTimeline />
                  <Text
                    style={{
                      fontFamily: font.regular,
                      fontSize: 13,
                      lineHeight: 18,
                      color: colors.mute,
                    }}
                  >
                    Checking in resets the clock. Paused estates get nothing.
                  </Text>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={extra} />
      <InkToast text={toast} />
    </View>
  );
}
