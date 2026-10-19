import { afterEach, describe, expect, mock, test } from "bun:test";

import { requestChallenge, verifyChallenge } from "@heirloom/core/api";

const BACKEND = "https://api.test";
const ADDRESS = "11111111111111111111111111111111";
const realFetch = globalThis.fetch;

function stubFetch(body: unknown) {
  const calls: Array<{ url: string; body: unknown }> = [];
  globalThis.fetch = mock(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init?.body)) });
    return Response.json(body);
  }) as unknown as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("auth", () => {
  test("requestChallenge posts the address and returns the message to sign", async () => {
    const calls = stubFetch({ data: { message: "Sign in to Heirloom" } });
    expect(await requestChallenge(BACKEND, ADDRESS)).toBe("Sign in to Heirloom");
    expect(calls[0]).toEqual({ url: `${BACKEND}/v1/auth/challenge`, body: { address: ADDRESS } });
  });

  test("verifyChallenge returns the address the backend verified", async () => {
    const calls = stubFetch({ data: { address: ADDRESS } });
    expect(await verifyChallenge(BACKEND, ADDRESS, "sig")).toBe(ADDRESS);
    expect(calls[0]).toEqual({
      url: `${BACKEND}/v1/auth/verify`,
      body: { address: ADDRESS, signature: "sig" },
    });
  });
});
