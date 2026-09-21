import { View } from "react-native";

import { DaysField } from "@/components/create/DaysField";
import { EstateTimeline } from "@/components/create/EstateTimeline";
import { Cap, H2, Lede, Tile } from "@/components/ui";
import {
  GRACE_MAX_DAYS,
  GRACE_MIN_DAYS,
  GRACE_PRESETS,
  HB_MAX_DAYS,
  HB_MIN_DAYS,
  HEARTBEAT_PRESETS,
  PAUSE_MAX_DAYS,
  PAUSE_MIN_DAYS,
  PAUSE_PRESETS,
  dateLong,
  dateShort,
} from "@/lib/estateTiming";

export function HeartbeatStep({
  heartbeatDays,
  graceDays,
  pauseDays,
  hasGuardian,
  heartbeatError,
  graceError,
  pauseError,
  onHeartbeat,
  onGrace,
  onPause,
  onLift,
}: {
  heartbeatDays: number;
  graceDays: number;
  pauseDays: number;
  hasGuardian: boolean;
  heartbeatError?: string;
  graceError?: string;
  pauseError?: string;
  onHeartbeat: (n: number) => void;
  onGrace: (n: number) => void;
  onPause: (n: number) => void;
  onLift?: (node: View) => void;
}) {
  const total = heartbeatDays + graceDays;
  const openDate = dateLong(total);

  return (
    <View>
      <H2>When your heir inherits</H2>
      <View style={{ marginTop: 20 }}>
        <Cap>If you never check in again</Cap>
        <H2 size={28}>{openDate}</H2>
        <Lede>
          {`That's ${total} days from today. Checking in once resets the clock.`}
        </Lede>
      </View>

      <View style={{ marginTop: 24 }}>
        <EstateTimeline heartbeatDays={heartbeatDays} graceDays={graceDays} />
      </View>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Tile paper>
          <Cap>You check in every</Cap>
          <View style={{ marginTop: 4 }}>
            <Lede>{`Heir notified ${dateShort(heartbeatDays)}`}</Lede>
          </View>
          <DaysField
            value={heartbeatDays}
            min={HB_MIN_DAYS}
            max={HB_MAX_DAYS}
            presets={HEARTBEAT_PRESETS}
            error={heartbeatError}
            onChange={onHeartbeat}
            onLift={onLift}
          />
        </Tile>
        <Tile paper>
          <Cap>Your heir then waits</Cap>
          <View style={{ marginTop: 4 }}>
            <Lede>
              They're notified at the start. You can stop it any time before it ends.
            </Lede>
          </View>
          <DaysField
            value={graceDays}
            min={GRACE_MIN_DAYS}
            max={GRACE_MAX_DAYS}
            presets={GRACE_PRESETS}
            error={graceError}
            onChange={onGrace}
            onLift={onLift}
          />
        </Tile>
        {hasGuardian ? (
          <Tile paper>
            <Cap>Guardian can hold</Cap>
            <View style={{ marginTop: 4 }}>
              <Lede>
                Once. They push the claim window by this many days. You can still check in and stop it.
              </Lede>
            </View>
            <DaysField
              value={pauseDays}
              min={PAUSE_MIN_DAYS}
              max={PAUSE_MAX_DAYS}
              presets={PAUSE_PRESETS}
              error={pauseError}
              onChange={onPause}
              onLift={onLift}
            />
          </Tile>
        ) : (
          <Tile>
            <Cap>Guardian</Cap>
            <View style={{ marginTop: 8 }}>
              <Lede>
                No guardian on this estate. Pause stays off. Add their address on Who inherits if someone should be able to hold the window.
              </Lede>
            </View>
          </Tile>
        )}
      </View>
    </View>
  );
}
