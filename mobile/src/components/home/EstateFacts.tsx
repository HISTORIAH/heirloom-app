import { View } from "react-native";

import { FactRow } from "@/components/ui";
import { TIMING_EDIT_UNIT } from "@/constants/estate";
import { EstateRow } from "@/types/program";
import { assetsLine, displayTiming, shortAddress, unwrapOption } from "@/lib";

/** Heir, assets, timing and helpers under the hero. */
export function EstateFacts({ row }: { row: EstateRow }) {
  const guardian = unwrapOption(row.data.delegate);
  const signer = unwrapOption(row.data.checkInSigner);
  const every = displayTiming(row.data.checkInIntervalSecs);
  const wait = displayTiming(row.data.gracePeriodSecs);
  const unit = TIMING_EDIT_UNIT === "minutes" ? "m" : "d";

  return (
    <View>
      <FactRow label="Heir" value={shortAddress(String(row.data.heir))} />
      <FactRow label="Assets" value={assetsLine(row)} />
      <FactRow label="Check-in" value={`Every ${every}${unit} · ${wait}${unit} wait`} />
      <FactRow label="Check-in signer" value={signer ? shortAddress(String(signer)) : "You"} />
      <FactRow label="Guardian" value={guardian ? shortAddress(String(guardian)) : "None"} />
    </View>
  );
}
