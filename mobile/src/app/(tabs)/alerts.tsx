import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { TAB_BAR_CLEARANCE } from "@/components/FloatingTabBar";
import { Icon } from "@/components/Icon";
import { TopBar } from "@/components/TopBar";
import { Cap, Display, Lede, PrimaryButton, TickList } from "@/components/ui";
import { BACKEND_URL } from "@/config";
import { HEIR_ALERT_TIMING, REMINDER_SCHEDULE } from "@/constants/alerts";
import { useEstates, useRemindersFor, useSession } from "@/hooks";
import { estateName } from "@/lib";
import { contactState } from "@/lib/reminders";
import { colors, font, space } from "@/theme";
import type { RecipientResponse, RemindersStatus } from "@/types/reminders";

function Locked({ signing, onUnlock }: { signing: boolean; onUnlock: () => void }) {
  return (
    <View style={{ gap: 18 }}>
      <Cap>Alerts</Cap>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: space.radiusTile,
          borderWidth: space.rule,
          borderColor: colors.ink,
          backgroundColor: colors.yellow,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="lock" size={34} weight={2.2} />
      </View>
      <Display size={34}>Your alerts are private.</Display>
      <Lede>
        Who gets reminded, and which heirs get told, only shows once you prove this is your wallet.
      </Lede>
      <TickList
        boxed
        items={[
          "Sign a message, not a transaction. No fee.",
          "Stays signed in while you use the app",
          "Asks again after a while away",
        ]}
      />
      <PrimaryButton
        icon="unlock"
        label={signing ? "Check your wallet…" : "Sign to unlock"}
        disabled={signing}
        onPress={onUnlock}
      />
    </View>
  );
}

/** One line per estate: who's connected, or what's still to do. */
function summary(status: RemindersStatus, recipients: RecipientResponse[]): string {
  if (status === "loading") return "Loading…";
  if (status === "error") return "Couldn't load";
  const self = contactState(recipients, "check_in_signer");
  const heir = contactState(recipients, "heir");
  if (self.kind === "none" && heir.kind === "none") return "Off";
  if (self.kind === "waiting" || heir.kind === "waiting") return "Waiting for Telegram";
  const you = self.kind === "connected" ? "You: on" : "You: off";
  const them = heir.kind === "connected" ? "Heir: on" : "Heir: off";
  return `${you} · ${them}`;
}

/** Reminders across every estate this wallet owns. Each estate is set up on its own screen. */
export default function AlertsScreen() {
  const router = useRouter();
  const { rows } = useEstates("authority");
  const session = useSession();
  const reminders = useRemindersFor(rows.map((row) => String(row.address)));
  const locked = reminders.some((r) => r.status === "locked");

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.pad,
          paddingTop: 12,
          paddingBottom: TAB_BAR_CLEARANCE,
        }}
      >
        {BACKEND_URL === undefined ? (
          <Lede>Alerts aren't available in this build.</Lede>
        ) : locked ? (
          <Locked
            signing={session.signing}
            onUnlock={() => void session.signIn().catch(() => undefined)}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Cap>Reminders by estate</Cap>
            {rows.length === 0 ? (
              <Text style={{ fontFamily: font.regular, fontSize: 14, color: colors.mute }}>
                Create an estate to set up reminders.
              </Text>
            ) : (
              <View style={{ borderTopWidth: space.rule, borderTopColor: colors.line }}>
                {rows.map((row, i) => {
                  const r = reminders[i];
                  const line = summary(r?.status ?? "loading", r?.recipients ?? []);
                  return (
                    <Pressable
                      key={row.address}
                      onPress={() => router.push(`/estate/${row.address}`)}
                      accessibilityRole="button"
                      accessibilityHint="Opens the estate to set up reminders"
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
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.ink }}>
                          {estateName(row)}
                        </Text>
                        <Text
                          style={{
                            fontFamily: font.regular,
                            fontSize: 13,
                            color: line === "Waiting for Telegram" ? colors.claim : colors.mute,
                          }}
                        >
                          {line}
                        </Text>
                      </View>
                      <Icon name="chevronRight" size={18} weight={2} />
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={{ marginTop: 14 }}>
              <Cap>When reminders go out</Cap>
            </View>
            <TickList items={[...REMINDER_SCHEDULE, `Your heir: ${HEIR_ALERT_TIMING}`]} />
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.mute }}>
              Checking in resets them. A paused estate gets none.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
