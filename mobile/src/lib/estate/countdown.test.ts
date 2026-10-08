import { describe, expect, test } from "bun:test";

import { countdownFromSeconds, countdownNoun } from "./countdown";

describe("countdownFromSeconds", () => {
  test("uses days while a full day remains", () => {
    expect(countdownFromSeconds(86_400)).toEqual({ value: 1, unit: "days" });
    expect(countdownFromSeconds(172_800)).toEqual({ value: 2, unit: "days" });
  });

  test("switches to hours below one day", () => {
    expect(countdownFromSeconds(86_399)).toEqual({ value: 23, unit: "hours" });
    expect(countdownFromSeconds(3_600)).toEqual({ value: 1, unit: "hours" });
  });

  test("switches to minutes below one hour", () => {
    expect(countdownFromSeconds(3_599)).toEqual({ value: 59, unit: "minutes" });
    expect(countdownFromSeconds(60)).toEqual({ value: 1, unit: "minutes" });
  });

  test("switches to seconds below one minute", () => {
    expect(countdownFromSeconds(59)).toEqual({ value: 59, unit: "seconds" });
    expect(countdownFromSeconds(1)).toEqual({ value: 1, unit: "seconds" });
    expect(countdownFromSeconds(0)).toEqual({ value: 0, unit: "seconds" });
  });
});

describe("countdownNoun", () => {
  test("singular when the value is 1", () => {
    expect(countdownNoun("days", 1)).toBe("day");
    expect(countdownNoun("hours", 1)).toBe("hour");
    expect(countdownNoun("minutes", 1)).toBe("minute");
    expect(countdownNoun("seconds", 1)).toBe("second");
  });
});
