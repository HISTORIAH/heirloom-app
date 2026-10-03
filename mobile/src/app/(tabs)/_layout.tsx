import { Tabs } from "expo-router";

import { FloatingTabBar } from "@/components/FloatingTabBar";
import { colors } from "@/theme";

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: "Estates" }} />
      <Tabs.Screen name="alerts" options={{ title: "Alerts" }} />
    </Tabs>
  );
}
