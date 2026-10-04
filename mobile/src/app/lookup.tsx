import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EstateListRow } from "@/components/home/EstateList";
import { Display, Fine, IconButton, PrimaryButton, TextField } from "@/components/ui";
import { colors, font, space } from "@/theme";
import { EstateRow } from "@/types/program";
import { bySoonest, fetchEstatesByAuthority, parseAddress } from "@/lib";

/** Public read: every estate an owner address has opened. */
export default function LookupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { client } = useMobileWallet();
  const [owner, setOwner] = useState("");
  const [rows, setRows] = useState<EstateRow[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function onFind() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const found = await fetchEstatesByAuthority(client.rpc, parseAddress(owner, "owner address"));
      setRows(bySoonest(found));
    } catch (cause) {
      setRows(undefined);
      setError(cause instanceof Error ? cause.message : "Could not look that up");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: space.pad }}>
        <IconButton icon="chevronLeft" label="Back" onPress={() => router.back()} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: space.pad,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
          gap: 16,
        }}
      >
        <Display size={32}>Look up an estate</Display>
        <Fine>Paste the owner’s wallet address. You’ll see every estate it has opened.</Fine>
        <TextField
          value={owner}
          onChangeText={(next) => {
            setOwner(next);
            setError(undefined);
          }}
          placeholder="Owner’s Solana address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Owner address"
          error={error !== undefined}
        />
        {error !== undefined ? (
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton
          tone="ink"
          label={busy ? "Looking…" : "Find estates"}
          disabled={busy || owner.trim().length === 0}
          onPress={() => void onFind()}
        />
        {rows !== undefined ? (
          rows.length === 0 ? (
            <Fine>No estates for that address.</Fine>
          ) : (
            <View style={{ marginTop: 8 }}>
              {rows.map((row) => (
                <EstateListRow
                  key={row.address}
                  row={row}
                  onPress={() => router.push(`/claim?estate=${row.address}`)}
                />
              ))}
            </View>
          )
        ) : null}
      </ScrollView>
    </View>
  );
}
