import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useState } from "react";
import { Button, Text, YStack } from "tamagui";

function shortAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function ConnectWallet() {
  const { account, connect, disconnect } = useMobileWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (account) await disconnect();
      else await connect();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet request failed");
    } finally {
      setBusy(false);
    }
  }

  const label = account
    ? `Disconnect ${shortAddress(String(account.address))}`
    : "Connect wallet";

  return (
    <YStack padding={24} paddingBottom={0} gap={8}>
      <Button disabled={busy} onPress={onPress}>
        {busy ? "Working…" : label}
      </Button>
      {error ? (
        <Text color="#B00020" fontSize={14}>
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
