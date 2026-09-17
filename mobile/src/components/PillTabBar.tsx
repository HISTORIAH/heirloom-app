import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

import { colors } from "@/theme";

const LABELS: Record<string, string> = {
  index: "Dashboard",
  claim: "Claim",
  heartbeat: "Heartbeat",
};

function TabIcon({ name }: { name: string }) {
  const stroke = colors.white;
  if (name === "index") {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="3" width="7" height="7" rx="1" stroke={stroke} strokeWidth="2" />
        <Rect x="14" y="3" width="7" height="7" rx="1" stroke={stroke} strokeWidth="2" />
        <Rect x="3" y="14" width="7" height="7" rx="1" stroke={stroke} strokeWidth="2" />
        <Rect x="14" y="14" width="7" height="7" rx="1" stroke={stroke} strokeWidth="2" />
      </Svg>
    );
  }
  if (name === "claim") {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M20 12v10H4V12" stroke={stroke} strokeWidth="2" />
        <Path d="M2 7h20v5H2z" stroke={stroke} strokeWidth="2" />
        <Path d="M12 22V7" stroke={stroke} strokeWidth="2" />
        <Path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" stroke={stroke} strokeWidth="2" />
        <Path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke={stroke} strokeWidth="2" />
      </Svg>
    );
  }
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0012 5.1 5.5 5.5 0 002 8.5c0 2.3 1.5 4 3 5.5l7 7z"
        stroke={stroke}
        strokeWidth="2"
      />
    </Svg>
  );
}

export function PillTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visible = state.routes.filter((r) => r.name !== "create");

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 28,
        right: 28,
        bottom: Math.max(insets.bottom, 12) + 6,
      }}
    >
      <View
        style={{
          height: 56,
          backgroundColor: colors.ink,
          borderRadius: 999,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {visible.map((route) => {
          const current = state.routes[state.index]?.name;
          const active =
            current === route.name || (route.name === "index" && current === "create");
          const label = LABELS[route.name] ?? route.name;
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                opacity: active ? 1 : 0.45,
              }}
            >
              <TabIcon name={route.name} />
              <Text
                style={{
                  color: colors.white,
                  fontFamily: "SpaceGrotesk_700Bold",
                  fontSize: 11,
                  letterSpacing: 1.54,
                  textTransform: "uppercase",
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
