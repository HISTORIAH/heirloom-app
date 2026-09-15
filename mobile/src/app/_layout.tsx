import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TamaguiProvider } from "tamagui";

import { tamaguiConfig } from "../../tamagui.config";

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </TamaguiProvider>
  );
}
