import { MobileWalletProvider } from "@wallet-ui/react-native-kit";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TamaguiProvider } from "tamagui";

import { solanaCluster, walletIdentity } from "@/config";
import { tamaguiConfig } from "../../tamagui.config";

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <MobileWalletProvider cluster={solanaCluster} identity={walletIdentity}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </MobileWalletProvider>
    </TamaguiProvider>
  );
}
