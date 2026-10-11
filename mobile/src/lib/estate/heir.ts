import { SECONDS_PER_DAY } from "@/constants/time";
import { durationText } from "@/lib/estate/timing";
import { plural } from "@/lib/text";
import type { HeirStep } from "@/types/claim";

/** "16 Nov": the earliest a claim can open. */
export function claimDate(claimableAtSecs: number): string {
  return new Date(claimableAtSecs * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/**
 * The heir's badge. "Can open", not "opens": every check-in moves the date, so it's never a promise.
 * Under a day out it counts in hours or minutes.
 */
export function heirBadge(claimable: boolean, claimableAtSecs: number, nowSecs: number): string {
  if (claimable) return "Open now";
  const left = Math.max(0, claimableAtSecs - nowSecs);
  const when =
    left >= SECONDS_PER_DAY
      ? plural(Math.floor(left / SECONDS_PER_DAY), "day")
      : durationText(left);
  return `Can open in ${when}`;
}

/** "What happens next" for someone named as heir, from the estate's own timing. */
export function heirSteps(input: {
  intervalSecs: number;
  graceSecs: number;
  claimableAtSecs: number;
  claimable: boolean;
  viaCredential: boolean;
}): HeirStep[] {
  const open = input.claimable;
  return [
    {
      title: "Owner is checking in",
      body: `They check in every ${durationText(input.intervalSecs)}. Each check-in pushes the date back.`,
      state: open ? "done" : "current",
    },
    {
      title: "If they stop, it opens",
      body: `A missed check-in plus ${durationText(input.graceSecs)} of grace. Earliest date: ${claimDate(input.claimableAtSecs)}.`,
      state: open ? "done" : "next",
    },
    input.viaCredential
      ? {
          title: "You claim with your card",
          body: "Tap your heir card to this phone. Funds go to your wallet.",
          state: open ? "current" : "next",
        }
      : {
          title: "You claim with this wallet",
          body: "Come back here and claim. Funds go to this wallet.",
          state: open ? "current" : "next",
        },
  ];
}
