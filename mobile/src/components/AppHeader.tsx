import { Wordmark } from "@/components/Wordmark";
import { colors } from "@/theme";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function AppHeader() {
  const insets = useSafeAreaInsets();
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
      <View style={{ width: 40, height: 40 }} />
    </View>
  );
}
