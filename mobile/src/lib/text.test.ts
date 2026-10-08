import { describe, expect, test } from "bun:test";

import { isUserCancel } from "./text";

class UserCancel extends Error {}

describe("isUserCancel", () => {
  test("treats the NFC UserCancel class as a dismiss even with an empty message", () => {
    expect(isUserCancel(new UserCancel())).toBe(true);
  });

  test("treats a cancel sentence as a dismiss", () => {
    expect(isUserCancel(new Error("cancelled"))).toBe(true);
  });

  test("leaves a real failure alone", () => {
    expect(isUserCancel(new Error("Could not send from this credential."))).toBe(false);
  });
});
