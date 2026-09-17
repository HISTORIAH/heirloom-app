import { ScrollView } from "react-native";
import { Text, YStack } from "tamagui";

import { ScreenFrame } from "@/components/ScreenFrame";
import { type EstateRole, useEstates } from "@/hooks/useEstates";
import { useEstateStatusLine } from "@/hooks/useEstateStatusLine";
import { shortAddress } from "@/lib/address";
import { STATUS_COLOR } from "@/lib/estateState";
import type { EstateRow } from "@/lib/estates";

interface EstateListProps {
  role: EstateRole;
  emptyTitle: string;
  emptyBody: string;
}

function EstateRowItem({ row }: { row: EstateRow }) {
  const { state, line } = useEstateStatusLine(row.data);

  return (
    <YStack gap={4}>
      <Text fontSize={18} fontWeight="700" color="#0A0A0A">
        {row.data.label.trim() || shortAddress(row.address)}
      </Text>
      <Text color="#888888" fontSize={14}>
        {shortAddress(row.address)}
      </Text>
      <Text fontSize={14} style={{ color: STATUS_COLOR[state] }}>
        {line}
      </Text>
    </YStack>
  );
}

export function EstateList({ role, emptyTitle, emptyBody }: EstateListProps) {
  const { account, rows, loading, error } = useEstates(role);

  if (!account) {
    return (
      <ScreenFrame title={emptyTitle}>Connect a wallet on Dashboard first.</ScreenFrame>
    );
  }
  if (loading) {
    return <ScreenFrame title={emptyTitle}>Looking on chain…</ScreenFrame>
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
          <EstateRowItem key={row.address} row={row} />
        ))}
      </YStack>
    </ScrollView>
  );
}
