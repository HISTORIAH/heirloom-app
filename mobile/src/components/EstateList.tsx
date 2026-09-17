import { ScrollView } from "react-native";
import { Text, YStack } from "tamagui";

import { ScreenFrame } from "@/components/ScreenFrame";
import { type EstateRole, useEstates } from "@/hooks/useEstates";
import { shortAddress } from "@/lib/address";

interface EstateListProps {
  role: EstateRole;
  emptyTitle: string;
  emptyBody: string;
}

export function EstateList({ role, emptyTitle, emptyBody }: EstateListProps) {
  const { account, rows, loading, error } = useEstates(role);

  if (!account) {
    return (
      <ScreenFrame title={emptyTitle}>Connect a wallet on Dashboard first.</ScreenFrame>
    );
  }
  if (loading) {
    return <ScreenFrame title={emptyTitle}>Looking on chain…</ScreenFrame>;
  }
  if (error) {
    return <ScreenFrame title="Could not load">{error}</ScreenFrame>;
  }
  if (rows.length === 0) {
    return <ScreenFrame title={emptyTitle}>{emptyBody}</ScreenFrame>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <YStack padding={24} gap={16}>
        {rows.map((row) => (
          <YStack key={row.address} gap={4}>
            <Text fontSize={18} fontWeight="700" color="#0A0A0A">
              {row.data.label.trim() || shortAddress(row.address)}
            </Text>
            <Text color="#888888" fontSize={14}>
              {shortAddress(row.address)}
            </Text>
          </YStack>
        ))}
      </YStack>
    </ScrollView>
  );
}
