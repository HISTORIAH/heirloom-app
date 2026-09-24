import { View } from "react-native";

import { DaysField } from "@/components/create/DaysField";
import { DayRuler } from "@/components/DayRuler";
import { H2, Lede } from "@/components/ui";
import { colors } from "@/theme";
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
  const claimOn = dateShort(heartbeatDays + graceDays);

  return (
    <View>
      <H2>When your heir inherits</H2>
      <DayRuler
        key={`${heartbeatDays}-${graceDays}`}
        intervalDays={heartbeatDays}
        graceDays={graceDays}
        elapsedDays={0}
        legendFrom="Today"
        legendTo={`Heir can claim ${claimOn}`}
        graceColor={colors.yellow}
      />
      <View style={{ marginTop: 28 }}>
        <Lede>You check in every</Lede>
        <DaysField
          value={heartbeatDays}
          min={HB_MIN_DAYS}
          max={HB_MAX_DAYS}
          presets={HEARTBEAT_PRESETS}
          error={heartbeatError}
          onChange={onHeartbeat}
          onLift={onLift}
        />
      </View>
      <View style={{ marginTop: 24 }}>
        <Lede>Your heir then waits</Lede>
        <DaysField
          value={graceDays}
          min={GRACE_MIN_DAYS}
          max={GRACE_MAX_DAYS}
          presets={GRACE_PRESETS}
          error={graceError}
          onChange={onGrace}
          onLift={onLift}
        />
      </View>
      {hasGuardian ? (
        <View style={{ marginTop: 24 }}>
          <Lede>Guardian can hold, once</Lede>
          <DaysField
            value={pauseDays}
            min={PAUSE_MIN_DAYS}
            max={PAUSE_MAX_DAYS}
            presets={PAUSE_PRESETS}
            error={pauseError}
            onChange={onPause}
            onLift={onLift}
          />
        </View>
      ) : (
        <View style={{ marginTop: 24 }}>
          <Lede>
            No guardian. Pause stays off.
          </Lede>
        </View>
      )}
    </View>
  );
}
