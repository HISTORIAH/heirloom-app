import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useRouter, type Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/Icon";
import { colors, floatShadow } from "@/theme";

const TABS: Array<{ name: string; label: string; icon: IconName }> = [
  { name: "index", label: "Estates", icon: "estate" },
  { name: "alerts", label: "Alerts", icon: "bell" },
];

// expo-router doesn't re-export BottomTabBarProps publicly; take it from Tabs' own tabBar prop.
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const HEIGHT = 64;

/** Clearance a scroll view leaves under its content for the floating bar. */
export const TAB_BAR_CLEARANCE = HEIGHT + 48;

const glass = {
  backgroundColor: "rgba(255,255,255,0.92)",
  borderWidth: 1,
  borderColor: "rgba(10,10,10,0.08)",
  ...floatShadow,
} as const;

/**
 * One capsule for Estates and Alerts, and a separate circle for Tap.
 * Hidden until a wallet is connected: the welcome screen has its own actions.
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { account } = useMobileWallet();
  if (!account) return null;

  const current = state.routes[state.index]?.name;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        bottom: Math.max(insets.bottom, 12) + 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          flex: 1,
          height: HEIGHT,
          flexDirection: "row",
          gap: 4,
          padding: 4,
          borderRadius: HEIGHT / 2,
          ...glass,
        }}
      >
        {TABS.map((tab) => {
          const route = state.routes.find((r: { name: string }) => r.name === tab.name);
          if (!route) return null;
          const active = current === tab.name;
          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) navigation.navigate(tab.name);
              }}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                borderRadius: (HEIGHT - 8) / 2,
                backgroundColor: active ? colors.yellow : "transparent",
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Icon name={tab.icon} size={22} weight={active ? 2.2 : 1.8} />
              <Text
                style={{
                  fontFamily: active ? "SpaceGrotesk_700Bold" : "SpaceGrotesk_500Medium",
                  fontSize: 11,
                  color: colors.ink,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push("/tap")}
        accessibilityRole="button"
        accessibilityLabel="Tap an Heirloom card, ring or band"
        style={({ pressed }) => ({
          width: HEIGHT,
          height: HEIGHT,
          borderRadius: HEIGHT / 2,
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          ...glass,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
      >
        <Icon name="tap" size={24} weight={2.2} />
        <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, color: colors.ink }}>
          Tap
        </Text>
      </Pressable>
    </View>
  );
}
