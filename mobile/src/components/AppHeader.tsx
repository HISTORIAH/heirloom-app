import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { Wordmark } from "@/components/Wordmark";
import { colors, space } from "@/theme";

function GearIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="3"
        stroke={colors.ink}
        strokeWidth="1.8"
      />
      <Path
        d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        stroke={colors.ink}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BackIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 6l-6 6 6 6"
        stroke={colors.ink}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AppHeader({ back }: { back?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={{
        paddingTop: Math.max(insets.top, 8),
        paddingHorizontal: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        backgroundColor: colors.bg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Wordmark height={22} />
      <Pressable
        onPress={() => {
          if (back) {
            if (router.canGoBack()) router.back();
            else router.replace("/");
            return;
          }
          router.push("/settings");
        }}
        accessibilityRole="button"
        accessibilityLabel={back ? "Back" : "Settings"}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderWidth: 1,
          borderColor: colors.ink,
          borderRadius: space.radiusBtn,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.72 : 1,
        })}
      >
        {back ? <BackIcon /> : <GearIcon />}
      </Pressable>
    </View>
  );
}
