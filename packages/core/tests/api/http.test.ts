import { afterEach, describe, expect, mock, test } from "bun:test";

import {
  ApiError,
  getJson,
  isNotFound,
  isUnauthorized,
  patchJson,
  postJson,
} from "@heirloom/core/api";

const URL = "https://api.test/x";
const realFetch = globalThis.fetch;

/** Answers every call with `body` and `status`, and records each request's options. */
function stubFetch(body: unknown, status = 200) {
  const calls: RequestInit[] = [];
  globalThis.fetch = mock(async (_url: string, init?: RequestInit) => {
    calls.push(init ?? {});
    return Response.json(body, { status, statusText: status === 200 ? "OK" : "Error" });
  }) as unknown as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("JSON requests", () => {
  test("send the session cookie and return the body as is", async () => {
    const calls = stubFetch({ id: "estate" });
    expect(await getJson<{ id: string }>(URL)).toEqual({ id: "estate" });
    expect(calls[0]).toMatchObject({ method: "GET", credentials: "include", body: undefined });
  });

  test("encode the body as JSON", async () => {
    const calls = stubFetch({ data: null });
    await patchJson(URL, { name: "Savings" });
    expect(calls[0]).toMatchObject({ method: "PATCH", body: '{"name":"Savings"}' });
  });

  test("a POST without a body sends none", async () => {
    const calls = stubFetch({ data: null });
    await postJson(URL);
    expect(calls[0]).toMatchObject({ method: "POST", body: undefined });
  });
});

describe("errors", () => {
  test("the backend's error body becomes an ApiError", async () => {
    stubFetch({ code: "NOT_FOUND", message: "No such estate" }, 404);
    const error = await getJson(URL).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "NOT_FOUND", status: 404, message: "No such estate" });
    expect(isNotFound(error)).toBe(true);
  });

  test("an uppercase UNAUTHORIZED code reads as unauthorized", async () => {
    stubFetch({ code: "UNAUTHORIZED", message: "Session expired" }, 403);
    const error = await getJson(URL).catch((err: unknown) => err);
    expect(isUnauthorized(error)).toBe(true);
  });

  test("a bare 401 reads as unauthorized", async () => {
    stubFetch(null, 401);
    const error = await getJson(URL).catch((err: unknown) => err);
    expect(isUnauthorized(error)).toBe(true);
  });
});
