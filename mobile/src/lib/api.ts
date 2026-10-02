export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(body: { code: string; message: string; details?: Record<string, unknown> }) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.details = body.details;
  }
}

async function fetchJson(url: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      body && typeof body === "object" && "code" in body
        ? (body as { code: string; message: string; details?: Record<string, unknown> })
        : { code: res.status === 401 ? "unauthorized" : "unknown", message: res.statusText },
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
  return ((await fetchJson(url, options)) as { data: T }).data;
}

/** For the few endpoints that return the resource directly instead of wrapping it in `{ data }`. */
export async function requestRaw<T>(url: string, options?: RequestInit): Promise<T> {
  return (await fetchJson(url, options)) as T;
}
