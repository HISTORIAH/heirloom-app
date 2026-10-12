import { useNow } from "@/hooks/useNow";
import { computeEstateState, type EstateSnapshot } from "@/services/heirloom";

/**
 * A snapshot's state re-derived every second, plus where the countdown sits in its window: the
 * check-in interval while active, the grace period (or pause) once a check-in is missed.
 * `progress` is the share of that window already used, 0 to 1.
 */
export function useLiveEstate(estate: EstateSnapshot) {
  const nowMs = useNow();
  const now = Math.floor(nowMs / 1000);
  const { state, secondsUntilGrace, secondsUntilClaimable } = computeEstateState({
    lastCheckInTs: estate.lastCheckInTs,
    checkInIntervalSecs: estate.checkInIntervalSecs,
    gracePeriodSecs: estate.gracePeriodSecs,
    delegatePauseExpiresAt: estate.delegatePauseExpiresAt,
    createdAt: estate.createdAt,
    vaultEmpty: estate.vaultState === "distributed",
  });

  const anchor = estate.lastCheckInTs > 0 ? estate.lastCheckInTs : estate.createdAt;
  const graceDeadline = anchor + estate.checkInIntervalSecs;
  const claimableAt = Math.max(graceDeadline + estate.gracePeriodSecs, estate.delegatePauseExpiresAt);

  const [windowStart, windowEnd] =
    state === "active" ? [anchor, graceDeadline] : [graceDeadline, claimableAt];
  const span = windowEnd - windowStart;
  const progress = span > 0 ? Math.min(1, Math.max(0, (now - windowStart) / span)) : 1;

  return {
    nowMs,
    state,
    secondsUntilGrace,
    secondsUntilClaimable,
    /** Seconds since the missed check-in was due; 0 while on track. */
    secondsOverdue: Math.max(0, now - graceDeadline),
    /** A pause that is still holding the estate closed. */
    pauseRunning: estate.delegatePauseExpiresAt > now,
    progress,
  };
}
