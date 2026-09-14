import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0A0A0A",
        tabBarInactiveTintColor: "#888888",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E5E5",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="claim" options={{ title: "Claim" }} />
      <Tabs.Screen name="heartbeat" options={{ title: "Heartbeat" }} />
    </Tabs>
  );
}
