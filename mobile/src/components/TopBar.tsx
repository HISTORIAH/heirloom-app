import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Wordmark } from "@/components/Wordmark";
import { Badge } from "@/components/ui";
import { clusterLabel } from "@/config";
import { colors, font, space } from "@/theme";
import { shortAddress } from "@/lib";

export function walletInitial(label: string | undefined, address: string): string {
  const source = label?.trim() || address;
  return source.charAt(0).toUpperCase();
}

/** Wallet identity disc. The lime dot means connected. */
export function WalletAvatar({
  label,
  address,
  size = 44,
  dot = true,
}: {
  label?: string;
  address: string;
  size?: number;
  dot?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: colors.sky,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: font.bold, fontSize: size * 0.4, color: colors.ink }}>
        {walletInitial(label, address)}
      </Text>
      {dot ? (
        <View
          style={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 15,
            height: 15,
            borderRadius: 8,
            backgroundColor: colors.lime,
            borderWidth: space.rule,
            borderColor: colors.ink,
          }}
        />
      ) : null}
    </View>
  );
}

/** Home and Alerts header: wallet avatar, wordmark, network. */
export function TopBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account } = useMobileWallet();

  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: space.pad,
        paddingBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        backgroundColor: colors.bg,
      }}
    >
      {/* The gap clears the status dot, which hangs 4pt past the avatar. */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {account ? (
          <Pressable
            onPress={() => router.push("/wallet")}
            accessibilityRole="button"
            accessibilityLabel={`Wallet: ${account.label ?? "connected"}, ${shortAddress(String(account.address))}. Open wallet and settings`}
            hitSlop={4}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
          >
            <WalletAvatar label={account.label} address={String(account.address)} />
          </Pressable>
        ) : null}
        <View style={{ marginLeft: account ? 0 : -14 }}>
          <Wordmark height={40} />
        </View>
      </View>
      <Badge label={clusterLabel()} />
    </View>
  );
}
