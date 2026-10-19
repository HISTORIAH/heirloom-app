import type { ApiErrorBody } from "../types/api";

export class ApiError extends Error {
  code: string;
  /** HTTP status. 401 means the SIWS session is missing or expired. */
  status?: number;
  details?: Record<string, unknown>;

  constructor(body: ApiErrorBody, status?: number) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }
}

/** No session, or it expired: sign the challenge again. Accepts either casing of the code. */
export function isUnauthorized(err: unknown): boolean {
  return (
    err instanceof ApiError && (err.status === 401 || err.code.toLowerCase() === "unauthorized")
  );
}

/** True when the backend answered 404 for the thing asked about. */
export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.code === "NOT_FOUND";
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === "object" && body !== null && "code" in body;
}

/**
 * Sends a JSON request to the backend and returns the response body as `T`. `T` is the
 * backend's contract, not checked here. Failures throw `ApiError` with the backend's
 * `{ code, message, details? }`, or a generic code when the body isn't one.
 */
async function sendJson<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    // The SIWS session is an HttpOnly cookie that code never reads. The browser keeps it on
    // web; on mobile, native fetch keeps it in the platform cookie store. This flag is all it
    // takes for it to ride along.
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const responseBody: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const fallbackCode = res.status === 401 ? "unauthorized" : "unknown";
    throw new ApiError(
      isErrorBody(responseBody) ? responseBody : { code: fallbackCode, message: res.statusText },
      res.status,
    );
  }
  return responseBody as T;
}

export function getJson<T>(url: string): Promise<T> {
  return sendJson<T>("GET", url);
}

export function postJson<T>(url: string, body?: unknown): Promise<T> {
  return sendJson<T>("POST", url, body);
}

export function putJson<T>(url: string, body: unknown): Promise<T> {
  return sendJson<T>("PUT", url, body);
}

export function patchJson<T>(url: string, body: unknown): Promise<T> {
  return sendJson<T>("PATCH", url, body);
}

export function deleteJson<T>(url: string): Promise<T> {
  return sendJson<T>("DELETE", url);
}
