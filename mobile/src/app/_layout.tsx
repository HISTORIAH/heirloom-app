import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { MobileWalletProvider } from "@wallet-ui/react-native-kit";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { TamaguiProvider } from "tamagui";

import { solanaCluster, walletIdentity } from "@/config";
import { tamaguiConfig } from "../../tamagui.config";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <MobileWalletProvider cluster={solanaCluster} identity={walletIdentity}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </MobileWalletProvider>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
