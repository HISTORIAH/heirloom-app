import { ConnectWallet } from "@/components/ConnectWallet";
import { ScreenFrame } from "@/components/ScreenFrame";
import { YStack } from "tamagui";

export default function DashboardScreen() {
  return (
    <YStack flex={1} backgroundColor="#FFFFFF">
      <ConnectWallet />
      <ScreenFrame title="No vault yet">
        Create Your Estate. Wallet and chain reads land in later slices. TODO.
      </ScreenFrame>
    </YStack>
  );
}
