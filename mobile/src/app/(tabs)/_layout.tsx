import { Tabs } from "expo-router";

import { PillTabBar } from "@/components/PillTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="claim" options={{ title: "Claim" }} />
      <Tabs.Screen name="heartbeat" options={{ title: "Heartbeat" }} />
      <Tabs.Screen name="create" options={{ href: null, title: "Create" }} />
    </Tabs>
  );
}
