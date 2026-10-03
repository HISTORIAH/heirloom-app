import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { TAB_BAR_CLEARANCE } from "@/components/FloatingTabBar";
import { Icon } from "@/components/Icon";
import { TopBar } from "@/components/TopBar";
import {
  ActionRow,
  Cap,
  Display,
  Lede,
  PrimaryButton,
  TickList,
  ToggleChip,
} from "@/components/ui";
import { colors, font, space } from "@/theme";
import { useEstates } from "@/hooks";
import {
  ALERTS_SESSION_MS,
  DEFAULT_REMINDER_LEAD_DAYS,
  REMINDER_LEAD_DAYS,
} from "@/constants/alerts";
import { estateName, shortAddress } from "@/lib";

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Locked({ onUnlock }: { onUnlock: () => void }) {
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
        Who gets reminded, how, and which heirs get told — only shown once you prove this is your
        wallet.
      </Lede>
      <TickList
        boxed
        items={[
          "Sign a message — not a transaction, no fee",
          "Stays open for 15 minutes on this phone",
          "Locks again by itself",
        ]}
      />
      <PrimaryButton icon="unlock" label="Sign to unlock" onPress={onUnlock} />
    </View>
  );
}

export default function AlertsScreen() {
  const { account } = useMobileWallet();
  const { rows } = useEstates("authority");
  const [until, setUntil] = useState<number | undefined>(undefined);
  const [now, setNow] = useState(Date.now());
  const [push, setPush] = useState(true);
  const [leads, setLeads] = useState<number[]>(DEFAULT_REMINDER_LEAD_DAYS);
  const { ask, notice, cancel, confirm, extra } = useConfirmSheet();

  const open = until !== undefined && until > now;

  useEffect(() => {
    if (until === undefined) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);

  useEffect(() => {
    if (until !== undefined && until <= now) setUntil(undefined);
  }, [until, now]);

  // A new wallet starts locked.
  useEffect(() => {
    setUntil(undefined);
  }, [account?.address]);

  function later(title: string) {
    notice({ cap: "Coming next", title, body: "Alerts are UI-only in this build." });
  }

  function onUnlock() {
    // TODO(alerts): sign the backend challenge (services/api/auth.ts) and keep the session.
    setNow(Date.now());
    setUntil(Date.now() + ALERTS_SESSION_MS);
  }

  function toggleLead(days: number) {
    setLeads((current) =>
      current.includes(days)
        ? current.filter((d) => d !== days)
        : [...current, days].sort((a, b) => b - a),
    );
  }

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
        {!open ? (
          <Locked onUnlock={onUnlock} />
        ) : (
          <View style={{ gap: 10 }}>
            <View
              accessibilityRole="text"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 8,
                paddingLeft: 14,
                paddingRight: 8,
                borderRadius: space.radiusBtn,
                borderWidth: space.rule,
                borderColor: colors.ink,
                backgroundColor: colors.lime,
              }}
            >
              <Icon name="unlock" size={18} weight={2.4} />
              <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 14, color: colors.ink }}>
                Unlocked ·{" "}
                <Text style={{ fontVariant: ["tabular-nums"] }}>{clock((until ?? now) - now)}</Text>{" "}
                left
              </Text>
              <PrimaryButton
                compact
                tone="paper"
                label="Lock now"
                onPress={() => setUntil(undefined)}
              />
            </View>

            <View style={{ marginTop: 6 }}>
              <Cap>Remind me</Cap>
            </View>
            <View>
              <ActionRow
                icon="telegram"
                title="Telegram"
                sub="Not connected"
                subTone="label-first"
                action={
                  <PrimaryButton
                    compact
                    tone="paper"
                    label="Add"
                    onPress={() => later("Telegram reminders come next")}
                  />
                }
              />
              <ActionRow
                icon="mail"
                title="Email"
                sub="Not set"
                subTone="label-first"
                action={
                  <PrimaryButton
                    compact
                    tone="paper"
                    label="Add"
                    onPress={() => later("Email reminders come next")}
                  />
                }
              />
              <ActionRow
                icon="phone"
                title="Push"
                sub="This phone"
                subTone="label-first"
                action={
                  <PrimaryButton
                    compact
                    tone="paper"
                    label={push ? "On" : "Off"}
                    onPress={() => setPush((on) => !on)}
                  />
                }
              />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <Text
                style={{
                  fontFamily: font.regular,
                  fontSize: 13,
                  color: colors.mute,
                  marginRight: 2,
                }}
              >
                Before a check-in is due:
              </Text>
              {REMINDER_LEAD_DAYS.map((days) => (
                <ToggleChip
                  key={days}
                  label={days === 1 ? "1 day" : `${days} days`}
                  on={leads.includes(days)}
                  onPress={() => toggleLead(days)}
                />
              ))}
            </View>

            <View style={{ marginTop: 14 }}>
              <Cap>Tell my heir</Cap>
            </View>
            <Text
              style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.mute }}
            >
              Only once an estate is claimable. Never before.
            </Text>
            {rows.length === 0 ? (
              <Text style={{ fontFamily: font.regular, fontSize: 14, color: colors.mute }}>
                Create an estate to add an heir contact.
              </Text>
            ) : (
              <View>
                {rows.map((row) => (
                  <ActionRow
                    key={row.address}
                    icon="send"
                    title={`${estateName(row)} · ${shortAddress(String(row.data.heir))}`}
                    sub="No contact yet"
                    subTone="warn"
                    action={
                      <PrimaryButton
                        compact
                        tone="paper"
                        label="Add"
                        onPress={() => later("Heir contacts come next")}
                      />
                    }
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={extra} />
    </View>
  );
}
