import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { Wordmark } from "@/components/Wordmark";
import { colors, space } from "@/theme";

function GearIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="3"
        stroke={color}
        strokeWidth="1.8"
      />
      <Path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 6l-6 6 6 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AppHeader({
  back,
  plain,
  light,
}: {
  back?: boolean;
  plain?: boolean;
  light?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fg = light ? colors.white : colors.ink;

  return (
    <View
      style={{
        paddingTop: plain ? 0 : Math.max(insets.top, 8),
        paddingHorizontal: plain ? 0 : 16,
        paddingBottom: plain ? 0 : 10,
        borderBottomWidth: plain ? 0 : 1,
        borderBottomColor: colors.line,
        backgroundColor: plain ? "transparent" : colors.bg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Wordmark height={22} color={fg} />
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
          borderColor: fg,
          borderRadius: space.radiusBtn,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.72 : 1,
        })}
      >
        {back ? <BackIcon color={fg} /> : <GearIcon color={fg} />}
      </Pressable>
    </View>
  );
}
