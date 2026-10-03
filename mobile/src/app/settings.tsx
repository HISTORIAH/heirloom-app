import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { QuietRow } from "@/components/Quiet";
import { Cap, IconButton } from "@/components/ui";
import { clusterLabel } from "@/config";
import { colors, space } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 12) + 8,
          paddingHorizontal: space.pad,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <IconButton
          icon="chevronLeft"
          label="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />
        <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 18, color: colors.ink }}>
          Settings
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.pad, paddingTop: 24, paddingBottom: 60 }}
      >
        <View style={{ marginBottom: 10 }}>
          <Cap>This device</Cap>
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
          <QuietRow title="Network" desc={clusterLabel()} />
          <QuietRow title="Language" desc="English for now" />
        </View>
      </ScrollView>
    </View>
  );
}
