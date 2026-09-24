import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { Wordmark } from "@/components/Wordmark";
import { colors } from "@/theme";

function ScanIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 8.5a5 5 0 0 1 0 7"
        stroke={colors.ink}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M10 6a8.5 8.5 0 0 1 0 12"
        stroke={colors.ink}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M13.5 3.5a12 12 0 0 1 0 17"
        stroke={colors.ink}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function GearIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={colors.ink} strokeWidth="1.8" />
      <Path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        stroke={colors.ink}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconBtn({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderWidth: 1.5,
        borderColor: colors.ink,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      {children}
    </Pressable>
  );
}

export function DashboardHeader() {
  const router = useRouter();

  return (
    <View
      style={{
        height: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ marginLeft: -18 }}>
        <Wordmark height={46} />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <IconBtn label="Scan a card" onPress={() => router.push("/scan")}>
          <ScanIcon />
        </IconBtn>
        <IconBtn label="Settings" onPress={() => router.push("/settings")}>
          <GearIcon />
        </IconBtn>
      </View>
    </View>
  );
}
