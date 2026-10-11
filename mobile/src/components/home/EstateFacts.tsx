import { View } from "react-native";

import { FactRow } from "@/components/ui";
import { EstateRow } from "@/types/program";
import { assetsLine, durationShort, shortAddress, unwrapOption } from "@/lib";

/** Heir, assets, timing and helpers under the hero. */
export function EstateFacts({ row }: { row: EstateRow }) {
  const guardian = unwrapOption(row.data.delegate);
  const signer = unwrapOption(row.data.checkInSigner);
  const every = durationShort(Number(row.data.checkInIntervalSecs));
  const wait = durationShort(Number(row.data.gracePeriodSecs));

  return (
    <View>
      <FactRow label="Heir" value={shortAddress(String(row.data.heir))} />
      <FactRow label="Assets" value={assetsLine(row)} />
      <FactRow label="Check-in" value={`Every ${every} · ${wait} wait`} />
      <FactRow label="Check-in signer" value={signer ? shortAddress(String(signer)) : "You"} />
      <FactRow label="Guardian" value={guardian ? shortAddress(String(guardian)) : "None"} />
    </View>
  );
}
