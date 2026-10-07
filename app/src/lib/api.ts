import type { ApiErrorBody, ApiSuccess } from "@/types/api";

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

/** No session, or it expired: sign the challenge again. */
export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.code === "unauthorized");
}

async function fetchJson(url: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, {
    ...options,
    credentials: "include", // session cookie is HttpOnly + Secure + SameSite=Strict
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      body && typeof body === "object" && "code" in body
        ? (body as ApiErrorBody)
        : { code: res.status === 401 ? "unauthorized" : "unknown", message: res.statusText },
      res.status,
    );
  }

  return body;
}

/**
 * Most backend services share one envelope — `{ data }` on success,
 * `{ code, message, details? }` on failure — so no endpoint can quietly
 * skip it or swap in a different casing convention.
 */
export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  return ((await fetchJson(url, options)) as ApiSuccess<T>).data;
}

/** For the few endpoints that return the resource directly instead of wrapping it in `{ data }`. */
export async function requestRaw<T>(url: string, options?: RequestInit): Promise<T> {
  return (await fetchJson(url, options)) as T;
}
