import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MobileWalletProvider } from "@wallet-ui/react-native-kit";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StatusBar as NativeStatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { TamaguiProvider } from "tamagui";

import { solanaCluster, walletIdentity } from "@/config";
import { colors } from "@/theme";
import { tamaguiConfig } from "../../tamagui.config";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  useEffect(() => {
    NativeStatusBar.setBarStyle("dark-content");
    NativeStatusBar.setTranslucent(true);
    NativeStatusBar.setBackgroundColor("#00000000");
  }, []);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
          <MobileWalletProvider cluster={solanaCluster} identity={walletIdentity}>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen
                name="wallet"
                options={{ presentation: "transparentModal", animation: "fade" }}
              />
              <Stack.Screen
                name="tap"
                options={{ presentation: "transparentModal", animation: "fade" }}
              />
              <Stack.Screen name="create" options={{ gestureEnabled: false }} />
            </Stack>
          </MobileWalletProvider>
        </TamaguiProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
