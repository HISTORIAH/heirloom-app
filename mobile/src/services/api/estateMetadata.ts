import { BACKEND_URL } from "@/config";
import { ApiError, requestRaw } from "@/services/api/request";
import type { EstateResponse, RegisterEstateRequest, UpdateEstateRequest } from "@/types/estate";

const API_BASE = `${BACKEND_URL}/v1/estates`;

// All estate endpoints return the resource directly — not wrapped in { data }.

/**
 * Register an estate after its create tx is finalized. The name is read by the
 * backend from the SPL Memo in that tx, so no session cookie is needed.
 */
export async function registerEstate(payload: RegisterEstateRequest): Promise<EstateResponse> {
  return requestRaw<EstateResponse>(API_BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** DB-only read. Resolves to null when the backend isn't tracking the estate (404). */
export async function fetchEstate(estateAddress: string): Promise<EstateResponse | null> {
  try {
    return await requestRaw<EstateResponse>(`${API_BASE}/${estateAddress}`);
  } catch (err) {
    if (err instanceof ApiError && err.code === "NOT_FOUND") return null;
    throw err;
  }
}

/** No batch endpoint — fans out to GET per estate; missing or failed lookups are omitted. */
export async function fetchEstateMetadata(
  estateAddresses: string[],
): Promise<Record<string, EstateResponse>> {
  const results = await Promise.allSettled(estateAddresses.map(fetchEstate));
  const byAddress: Record<string, EstateResponse> = {};
  results.forEach((res, i) => {
    if (res.status === "fulfilled" && res.value) byAddress[estateAddresses[i]] = res.value;
  });
  return byAddress;
}

/**
 * Rename / edit description. Requires the SIWS session cookie, and the session
 * wallet must be the estate's on-chain authority.
 * `description`: omitted or null keeps it, "" clears it.
 */
export async function updateEstate(
  estateAddress: string,
  payload: UpdateEstateRequest,
): Promise<EstateResponse> {
  return requestRaw<EstateResponse>(`${API_BASE}/${estateAddress}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
