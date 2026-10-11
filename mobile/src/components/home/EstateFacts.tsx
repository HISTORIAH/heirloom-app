import { View } from "react-native";

import { FactRow } from "@/components/ui";
import { EstateRow } from "@/types/program";
import { assetsLine, cadenceLine, shortAddress, unwrapOption } from "@/lib";

/** Heir, assets, timing and helpers under the hero. */
export function EstateFacts({ row }: { row: EstateRow }) {
  const guardian = unwrapOption(row.data.delegate);
  const signer = unwrapOption(row.data.checkInSigner);

  return (
    <View>
      <FactRow label="Heir" value={shortAddress(String(row.data.heir))} />
      <FactRow label="Assets" value={assetsLine(row)} />
      <FactRow label="Check-in" value={cadenceLine(row.data.checkInIntervalSecs, row.data.gracePeriodSecs)} />
      <FactRow label="Check-in signer" value={signer ? shortAddress(String(signer)) : "You"} />
      <FactRow label="Guardian" value={guardian ? shortAddress(String(guardian)) : "None"} />
    </View>
  );
}
