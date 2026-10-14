import { describe, expect, test } from "bun:test";

import { CONFIRM_POLL_TRIES } from "@/constants/solana";
import { waitForConfirmed } from "@/lib/solana/confirm";
import type { EstateRpc } from "@/types/program";

const SIGNATURE = "5".repeat(88);
const DNS_BLIP =
  'fetch failed: java.net.UnknownHostException: Unable to resolve host "devnet.helius-rpc.com"';

/** An RPC whose getSignatureStatuses answers from `replies` in order; an Error reply throws. */
function statusRpc(replies: (string | Error)[]): { rpc: EstateRpc; calls: () => number } {
  let calls = 0;
  const rpc = {
    getSignatureStatuses: () => ({
      send: async () => {
        const reply = replies[Math.min(calls++, replies.length - 1)];
        if (reply instanceof Error) throw reply;
        return { value: [{ err: null, confirmationStatus: reply }] };
      },
    }),
  } as unknown as EstateRpc;
  return { rpc, calls: () => calls };
}

describe("waitForConfirmed", () => {
  test("a DNS blip mid-poll doesn't abort the wait", async () => {
    const { rpc, calls } = statusRpc([new TypeError(DNS_BLIP), "confirmed"]);
    await waitForConfirmed(rpc, SIGNATURE);
    expect(calls()).toBe(2);
  });

  test("a non-network error still fails straight away", async () => {
    const { rpc, calls } = statusRpc([new Error("Invalid params")]);
    await expect(waitForConfirmed(rpc, SIGNATURE)).rejects.toThrow("Invalid params");
    expect(calls()).toBe(1);
  });

  test("still offline on the last poll fails", async () => {
    const { rpc, calls } = statusRpc([new TypeError(DNS_BLIP)]);
    await expect(waitForConfirmed(rpc, SIGNATURE)).rejects.toThrow("UnknownHostException");
    expect(calls()).toBe(CONFIRM_POLL_TRIES);
  }, 30_000);
});
