import { useMobileWallet } from "@wallet-ui/react-native-kit";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/Icon";
import { RouteSheet } from "@/components/Sheet";
import { WalletAvatar } from "@/components/TopBar";
import { Cap, IconButton, Pill, PrimaryButton } from "@/components/ui";
import { clusterLabel } from "@/config";
import { colors, font, space } from "@/theme";
import { useEstates, useRoles, useSolBalance } from "@/hooks";
import { lamportsToSolText, openExplorerAddress, shortAddress } from "@/lib";

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 12,
        borderTopWidth: space.rule,
        borderTopColor: colors.line,
      }}
    >
      <Text style={{ fontFamily: font.regular, fontSize: 14, color: colors.mute }}>{label}</Text>
      {children}
    </View>
  );
}

function LinkRow({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderTopWidth: space.rule,
        borderTopColor: colors.line,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontFamily: font.bold, fontSize: 14, color: colors.ink }}>{label}</Text>
      <Icon name={icon} size={18} />
    </Pressable>
  );
}

function Value({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: font.bold,
        fontSize: 15,
        fontVariant: ["tabular-nums"],
        color: colors.ink,
      }}
    >
      {children}
    </Text>
  );
}

export default function WalletSheet() {
  const router = useRouter();
  const { account, connect, disconnect } = useMobileWallet();
  const { lamports } = useSolBalance();
  const own = useEstates("authority");
  const roles = useRoles();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  if (!account) {
    return (
      <RouteSheet>
        <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.mute }}>
          No wallet connected.
        </Text>
      </RouteSheet>
    );
  }

  const addr = String(account.address);
  const cluster = clusterLabel();
  const tags = [
    { label: "Owner", n: own.rows.length },
    { label: "Heir", n: roles.heir.length },
    { label: "Guardian", n: roles.guardian.length },
    { label: "Check-in signer", n: roles.signer.length },
  ].filter((tag) => tag.n > 0);

  async function onCopy() {
    await Clipboard.setStringAsync(addr);
    setCopied(true);
  }

  async function onDisconnect() {
    if (busy) return;
    setBusy(true);
    try {
      await disconnect();
      router.dismissAll();
    } finally {
      setBusy(false);
    }
  }

  async function onSwitch() {
    if (busy) return;
    setBusy(true);
    try {
      await disconnect();
      await connect();
    } catch {
      // Back on the welcome screen; they can connect from there.
    } finally {
      setBusy(false);
      router.dismissAll();
    }
  }

  return (
    <RouteSheet>
      <View style={{ gap: 14 }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text
            accessibilityRole="header"
            style={{ fontFamily: font.bold, fontSize: 24, letterSpacing: -0.24, color: colors.ink }}
          >
            Connected wallet
          </Text>
          <IconButton icon="close" label="Close" onPress={() => router.back()} />
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 14,
            borderRadius: 18,
            borderWidth: space.rule,
            borderColor: colors.ink,
            backgroundColor: colors.paper,
          }}
        >
          <WalletAvatar label={account.label} address={addr} size={48} dot={false} />
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 17, color: colors.ink }}>
              {account.label ?? "Wallet"}
            </Text>
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 13,
                fontVariant: ["tabular-nums"],
                color: colors.ink,
              }}
            >
              {shortAddress(addr, 6)}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.mute }}>
              Mobile Wallet Adapter
            </Text>
          </View>
          <Pressable
            onPress={() => void onCopy()}
            accessibilityRole="button"
            accessibilityLabel={copied ? "Address copied" : "Copy address"}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: space.radiusBtn,
              borderWidth: space.rule,
              borderColor: colors.ink,
              backgroundColor: copied ? colors.lime : colors.bg,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Icon name={copied ? "check" : "copy"} size={18} weight={copied ? 3 : 2} />
          </Pressable>
        </View>

        <View>
          <InfoRow label="Network">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Value>{cluster}</Value>
              {cluster !== "Mainnet" ? (
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: colors.ink,
                    backgroundColor: colors.yellow,
                  }}
                >
                  <Text style={{ fontFamily: font.bold, fontSize: 10, color: colors.ink }}>
                    TEST
                  </Text>
                </View>
              ) : null}
            </View>
          </InfoRow>
          <InfoRow label="Balance">
            <Value>{lamports === undefined ? "…" : `${lamportsToSolText(lamports)} SOL`}</Value>
          </InfoRow>
          <LinkRow
            label="View on explorer"
            icon="external"
            onPress={() => openExplorerAddress(addr)}
          />
          <LinkRow
            label="Settings · language, network"
            icon="chevronRight"
            onPress={() => {
              router.back();
              router.push("/settings");
            }}
          />
        </View>

        {tags.length > 0 ? (
          <>
            <Cap>This wallet is</Cap>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {tags.map((tag) => (
                <Pill key={tag.label} label={`${tag.label} · ${tag.n}`} />
              ))}
            </View>
          </>
        ) : null}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              tone="paper"
              label="Switch wallet"
              disabled={busy}
              onPress={() => void onSwitch()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              tone="danger"
              label="Disconnect"
              disabled={busy}
              onPress={() => void onDisconnect()}
            />
          </View>
        </View>
      </View>
    </RouteSheet>
  );
}
