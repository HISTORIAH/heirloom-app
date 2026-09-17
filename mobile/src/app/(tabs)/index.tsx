import { ConnectWallet } from "@/components/ConnectWallet";
import { EstateList } from "@/components/EstateList";
import { YStack } from "tamagui";

export default function DashboardScreen() {
  return (
    <YStack flex={1} backgroundColor="#FFFFFF">
      <ConnectWallet />
      <EstateList
        role="authority"
        emptyTitle="No vault yet"
        emptyBody="Create Your Estate. Writes land in a later slice."
      />
    </YStack>
  );
}
