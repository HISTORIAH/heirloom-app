import { describe, expect, test } from "bun:test";

import { MAX_INTERVAL_DAYS, MAX_TIMING_MINUTES, TIMING_EDIT_UNIT } from "@/constants/estate";
import { SECONDS_PER_DAY, SECONDS_PER_MINUTE } from "@/constants/time";
import {
  changedTimingField,
  displayTiming,
  durationAdjective,
  durationRangeError,
  cadenceLine,
  durationText,
  parseDayCount,
  parseMinuteCount,
} from "@/lib/estate/timing";

describe("parseDayCount", () => {
  test("turns whole days into seconds", () => {
    expect(parseDayCount("2", "check-in", false)).toBe(BigInt(2 * SECONDS_PER_DAY));
  });

  test("rejects zero unless allowed", () => {
    expect(() => parseDayCount("0", "check-in", false)).toThrow("at least 1 day");
    expect(parseDayCount("0", "pause", true)).toBe(0n);
  });
});

describe("parseMinuteCount", () => {
  test("turns whole minutes into seconds", () => {
    expect(parseMinuteCount("5", "check-in", false)).toBe(BigInt(5 * SECONDS_PER_MINUTE));
  });

  test("rejects zero unless allowed", () => {
    expect(() => parseMinuteCount("0", "grace", false)).toThrow("at least 1 minute");
    expect(parseMinuteCount("0", "pause", true)).toBe(0n);
  });

  test("caps at the same wall-clock as MAX_INTERVAL_DAYS", () => {
    expect(parseMinuteCount(String(MAX_TIMING_MINUTES), "check-in", false)).toBe(
      BigInt(MAX_INTERVAL_DAYS * SECONDS_PER_DAY),
    );
    expect(() => parseMinuteCount(String(MAX_TIMING_MINUTES + 1), "check-in", false)).toThrow(
      `cannot exceed ${MAX_TIMING_MINUTES} minutes`,
    );
  });
});

describe("displayTiming / changedTimingField", () => {
  test("follow TIMING_EDIT_UNIT", () => {
    if (TIMING_EDIT_UNIT === "minutes") {
      expect(displayTiming(5 * SECONDS_PER_MINUTE)).toBe("5");
      expect(changedTimingField("5", 5 * SECONDS_PER_MINUTE, "check-in", false)).toBeUndefined();
      expect(changedTimingField("3", 5 * SECONDS_PER_MINUTE, "check-in", false)).toBe(
        BigInt(3 * SECONDS_PER_MINUTE),
      );
    } else {
      expect(displayTiming(2 * SECONDS_PER_DAY)).toBe("2");
      expect(changedTimingField("2", 2 * SECONDS_PER_DAY, "check-in", false)).toBeUndefined();
      expect(changedTimingField("3", 2 * SECONDS_PER_DAY, "check-in", false)).toBe(
        BigInt(3 * SECONDS_PER_DAY),
      );
    }
  });
});

describe("duration helpers", () => {
  test("largest whole unit", () => {
    expect(durationText(30 * SECONDS_PER_DAY)).toBe("30 days");
    expect(durationText(SECONDS_PER_DAY)).toBe("1 day");
    expect(durationText(12 * 3_600)).toBe("12 hours");
    expect(durationText(45 * SECONDS_PER_MINUTE)).toBe("45 minutes");
    expect(durationText(SECONDS_PER_MINUTE)).toBe("1 minute");
  });

  test("mixes units only when it has to", () => {
    expect(durationText(SECONDS_PER_DAY + 6 * 3_600)).toBe("1 day 6 hours");
    expect(durationText(43_200 * SECONDS_PER_MINUTE)).toBe("30 days");
  });

  test("adjective form", () => {
    expect(durationAdjective(30 * SECONDS_PER_DAY)).toBe("30-day");
    expect(durationAdjective(SECONDS_PER_MINUTE)).toBe("1-minute");
  });

  test("cadence line", () => {
    expect(cadenceLine(30 * SECONDS_PER_DAY, 7 * SECONDS_PER_DAY)).toBe("Every 30 days · 7-day grace");
    expect(cadenceLine(43_200 * SECONDS_PER_MINUTE, 10_080 * SECONDS_PER_MINUTE)).toBe(
      "Every 30 days · 7-day grace",
    );
    expect(cadenceLine(SECONDS_PER_MINUTE, SECONDS_PER_DAY + 3_600)).toBe(
      "Every 1 minute · 1 day 1 hour of grace",
    );
  });

  test("range checks in days", () => {
    expect(durationRangeError(90 * SECONDS_PER_DAY, 30, 365, "Check-in")).toBeUndefined();
    expect(durationRangeError(7 * SECONDS_PER_DAY, 30, 365, "Check-in")).toBe(
      "Check-in must be 30 to 365 days.",
    );
  });
});
