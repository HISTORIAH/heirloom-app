import { View } from "react-native";

import { FactRow } from "@/components/ui";
import { SECONDS_PER_DAY } from "@/constants/time";
import { EstateRow } from "@/types/program";
import { assetsLine, shortAddress, unwrapOption } from "@/lib";

/** Heir, assets, timing and helpers under the hero. */
export function EstateFacts({ row }: { row: EstateRow }) {
  const guardian = unwrapOption(row.data.delegate);
  const signer = unwrapOption(row.data.checkInSigner);
  const every = Math.round(Number(row.data.checkInIntervalSecs) / SECONDS_PER_DAY);
  const wait = Math.round(Number(row.data.gracePeriodSecs) / SECONDS_PER_DAY);

  return (
    <View>
      <FactRow label="Heir" value={shortAddress(String(row.data.heir))} />
      <FactRow label="Assets" value={assetsLine(row)} />
      <FactRow label="Check-in" value={`Every ${every}d · ${wait}d wait`} />
      <FactRow label="Check-in signer" value={signer ? shortAddress(String(signer)) : "You"} />
      <FactRow label="Guardian" value={guardian ? shortAddress(String(guardian)) : "None"} />
    </View>
  );
}
