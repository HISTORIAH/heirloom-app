import { describe, expect, test } from "bun:test";

import { cardProblemMessage, isLostField } from "./messages";

class TagConnectionLost extends Error {}
class Timeout extends Error {}

describe("isLostField", () => {
  test("treats a dropped IsoDep session as a hunt, not a hard fail", () => {
    expect(isLostField(new TagConnectionLost())).toBe(true);
    expect(isLostField(new Timeout())).toBe(true);
    expect(isLostField(new Error("Tag was lost."))).toBe(true);
    expect(isLostField(new Error("transceive fail"))).toBe(true);
    expect(isLostField(new Error("not connected"))).toBe(true);
  });

  test("leaves applet errors alone", () => {
    expect(isLostField(new Error("This isn’t an Heirloom credential."))).toBe(false);
  });
});

describe("cardProblemMessage", () => {
  test("tells them to slide around the back after a lost field", () => {
    const text = cardProblemMessage(new TagConnectionLost(), "fallback");
    expect(text).toContain("Slide it slowly around the top of the back");
  });
});
