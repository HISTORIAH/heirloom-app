import type { ApiErrorBody, ApiSuccess } from "@/types/api";

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.details = body.details;
  }
}

/**
 * Every backend service shares one envelope — `{ data }` on success,
 * `{ code, message, details? }` on failure — so no endpoint can quietly
 * skip it or swap in a different casing convention.
 */
export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include", // session cookie is HttpOnly + Secure + SameSite=Strict
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = (await res.json().catch(() => null)) as ApiSuccess<T> | ApiErrorBody | null;

  if (!res.ok) {
    throw new ApiError(
      body && "code" in body
        ? body
        : { code: res.status === 401 ? "unauthorized" : "unknown", message: res.statusText },
    );
  }

  return (body as ApiSuccess<T>).data;
}
