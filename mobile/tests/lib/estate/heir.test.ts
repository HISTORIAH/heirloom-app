import { describe, expect, test } from "bun:test";

import { SECONDS_PER_DAY, SECONDS_PER_MINUTE } from "@/constants/time";
import { heirBadge, heirSteps } from "@/lib/estate/heir";

const NOW = 1_700_000_000;

describe("heirBadge", () => {
  test("counts days, then smaller units under a day", () => {
    expect(heirBadge(false, NOW + 36 * SECONDS_PER_DAY, NOW)).toBe("Can open in 36 days");
    expect(heirBadge(false, NOW + 2 * SECONDS_PER_MINUTE, NOW)).toBe("Can open in 2 minutes");
    expect(heirBadge(true, NOW, NOW)).toBe("Open now");
  });
});

describe("heirSteps", () => {
  const base = {
    intervalSecs: 30 * SECONDS_PER_DAY,
    graceSecs: 7 * SECONDS_PER_DAY,
    claimableAtSecs: NOW,
    viaCredential: true,
  };

  test("while the owner checks in, the first step is current", () => {
    const steps = heirSteps({ ...base, claimable: false });
    expect(steps.map((step) => step.state)).toEqual(["current", "next", "next"]);
    expect(steps[0].body).toBe("They check in every 30 days. Each check-in pushes the date back.");
    expect(steps[1].body).toContain("plus 7 days of grace");
  });

  test("once claimable, the first two are done and claiming is current", () => {
    expect(heirSteps({ ...base, claimable: true }).map((step) => step.state)).toEqual([
      "done",
      "done",
      "current",
    ]);
  });

  test("a wallet heir claims with the wallet, not a card", () => {
    expect(heirSteps({ ...base, claimable: false, viaCredential: false })[2].title).toBe(
      "You claim with this wallet",
    );
  });
});
