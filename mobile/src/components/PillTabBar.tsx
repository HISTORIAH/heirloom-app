import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { colors } from "@/theme";

const SIDE_TABS = ["index", "claim", "heartbeat", "guardian"] as const;

const LABELS: Record<(typeof SIDE_TABS)[number], string> = {
  index: "Dashboard",
  claim: "Claim",
  heartbeat: "Heartbeat",
  guardian: "Guardian",
};

const FAB_SIZE = 64;
const BAR_HEIGHT = 58;
/** How much of the yellow circle sits above the pill top. */
const FAB_OVERHANG = 32;

function DashboardIcon() {
  // Bento / masonry tiles — not equal 2×2.
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="8" height="10" rx="1.2" stroke={colors.white} strokeWidth="1.75" />
      <Rect x="13" y="3" width="8" height="5.5" rx="1.2" stroke={colors.white} strokeWidth="1.75" />
      <Rect x="13" y="10.5" width="8" height="10.5" rx="1.2" stroke={colors.white} strokeWidth="1.75" />
      <Rect x="3" y="15" width="8" height="6" rx="1.2" stroke={colors.white} strokeWidth="1.75" />
    </Svg>
  );
}

function ClaimIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M20 12v10H4V12" stroke={colors.white} strokeWidth="1.75" />
      <Path d="M2 7h20v5H2z" stroke={colors.white} strokeWidth="1.75" />
      <Path d="M12 22V7" stroke={colors.white} strokeWidth="1.75" />
      <Path
        d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"
        stroke={colors.white}
        strokeWidth="1.75"
      />
      <Path
        d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"
        stroke={colors.white}
        strokeWidth="1.75"
      />
    </Svg>
  );
}

function HeartbeatIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0012 5.1 5.5 5.5 0 002 8.5c0 2.3 1.5 4 3 5.5l7 7z"
        stroke={colors.white}
        strokeWidth="1.75"
      />
    </Svg>
  );
}

function GuardianIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="7.5" cy="10" r="2.1" stroke={colors.white} strokeWidth="1.6" />
      <Circle cx="16.5" cy="10" r="2.1" stroke={colors.white} strokeWidth="1.6" />
      <Path
        d="M3.8 18.5c.5-2.1 2-3.3 3.7-3.3 1.2 0 2.2.6 2.9 1.5"
        stroke={colors.white}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <Path
        d="M13.6 16.7c.7-.9 1.7-1.5 2.9-1.5 1.7 0 3.2 1.2 3.7 3.3"
        stroke={colors.white}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <Path
        d="M9.8 9.2H11.2"
        stroke={colors.white}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <Path
        d="M12.8 9.2H14.2"
        stroke={colors.white}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <Path
        d="M12 3.2l2.8 1.2v2.4c0 1.85-1.15 3.45-2.8 4-1.65-.55-2.8-2.15-2.8-4V4.4L12 3.2z"
        stroke={colors.white}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Path
        d="M12 6.1c.55-.55 1.35-.5 1.75.15.35.55.15 1.3-.45 1.7L12 9.05l-1.3-1.1c-.6-.4-.8-1.15-.45-1.7.4-.65 1.2-.7 1.75-.15z"
        fill={colors.white}
      />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={colors.ink}
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function SideIcon({ name }: { name: (typeof SIDE_TABS)[number] }) {
  if (name === "index") return <DashboardIcon />;
  if (name === "claim") return <ClaimIcon />;
  if (name === "heartbeat") return <HeartbeatIcon />;
  return <GuardianIcon />;
}

function navigateTo(
  navigation: BottomTabBarProps["navigation"],
  name: string,
  key: string,
) {
  const event = navigation.emit({
    type: "tabPress",
    target: key,
    canPreventDefault: true,
  });
  if (!event.defaultPrevented) {
    navigation.navigate(name);
  }
}

export function PillTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const createActive = current === "create";

  const left = SIDE_TABS.slice(0, 2);
  const right = SIDE_TABS.slice(2);
  const routeByName = Object.fromEntries(state.routes.map((r) => [r.name, r]));
  const wrapperHeight = BAR_HEIGHT + FAB_OVERHANG;

  function sideActive(name: string) {
    return current === name;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 10),
        height: wrapperHeight,
        justifyContent: "flex-end",
      }}
    >
      <View
        style={{
          height: BAR_HEIGHT,
          backgroundColor: colors.ink,
          borderRadius: 999,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 4,
        }}
      >
        {left.map((name) => {
          const route = routeByName[name];
          if (!route) return <View key={name} style={{ flex: 1 }} />;
          const active = sideActive(name);
          return (
            <Pressable
              key={route.key}
              onPress={() => navigateTo(navigation, name, route.key)}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                opacity: active ? 1 : 0.85,
                paddingVertical: 8,
              }}
            >
              <SideIcon name={name} />
              <Text
                style={{
                  color: colors.white,
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 10,
                  letterSpacing: 0.2,
                }}
                numberOfLines={1}
              >
                {LABELS[name]}
              </Text>
            </Pressable>
          );
        })}

        <View style={{ width: FAB_SIZE + 8 }} />

        {right.map((name) => {
          const route = routeByName[name];
          if (!route) return <View key={name} style={{ flex: 1 }} />;
          const active = sideActive(name);
          return (
            <Pressable
              key={route.key}
              onPress={() => navigateTo(navigation, name, route.key)}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                opacity: active ? 1 : 0.85,
                paddingVertical: 8,
              }}
            >
              <SideIcon name={name} />
              <Text
                style={{
                  color: colors.white,
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 10,
                  letterSpacing: 0.2,
                }}
                numberOfLines={1}
              >
                {LABELS[name]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => {
          const route = routeByName.create;
          if (route) navigateTo(navigation, "create", route.key);
        }}
        style={{
          position: "absolute",
          alignSelf: "center",
          top: 0,
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
          backgroundColor: colors.yellow,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 3,
          borderColor: createActive ? colors.ink : "transparent",
          shadowColor: colors.ink,
          shadowOpacity: 0.2,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
        accessibilityRole="button"
        accessibilityLabel="New estate"
      >
        <PlusIcon />
      </Pressable>
    </View>
  );
}
