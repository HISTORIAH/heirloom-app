import { describe, expect, test } from "bun:test";

import { MAX_INTERVAL_DAYS, MAX_TIMING_MINUTES, TIMING_EDIT_UNIT } from "@/constants/estate";
import { SECONDS_PER_DAY, SECONDS_PER_MINUTE } from "@/constants/time";
import {
  changedTimingField,
  displayTiming,
  parseDayCount,
  parseMinuteCount,
} from "./timing";

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
