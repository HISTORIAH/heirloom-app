import { BACKEND_URL } from "@/config";
import { deleteJson, getJson, isNotFound, patchJson, postJson } from "@heirloom/core/api";
import type { EstateResponse, RegisterEstateRequest, UpdateEstateRequest } from "@/types/estate";

const API_BASE = `${BACKEND_URL}/v1/estates`;

// All estate endpoints return the resource directly — not wrapped in { data }.

/**
 * Register an estate after its create tx is finalized. The name is read by the
 * backend from the SPL Memo in that tx, so no session cookie is needed.
 */
export async function registerEstate(payload: RegisterEstateRequest): Promise<EstateResponse> {
  return postJson<EstateResponse>(API_BASE, payload);
}

/** DB-only read. Resolves to null when the backend isn't tracking the estate (404). */
export async function fetchEstate(estateAddress: string): Promise<EstateResponse | null> {
  try {
    return await getJson<EstateResponse>(`${API_BASE}/${estateAddress}`);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/** No batch endpoint — fans out to GET per estate; missing or failed lookups are omitted. */
export async function fetchEstates(
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
  return patchJson<EstateResponse>(`${API_BASE}/${estateAddress}`, payload);
}

/**
 * Deletes everything the backend keeps for a closed estate: metadata, reminders, scheduled
 * events, deliveries, telegram links and sealed secrets. Requires the SIWS session cookie
 * and the estate's authority. An estate the backend never tracked (404) counts as deleted.
 */
export async function deleteEstate(estateAddress: string): Promise<void> {
  try {
    await deleteJson<null>(`${API_BASE}/${estateAddress}`);
  } catch (err) {
    if (isNotFound(err)) return;
    throw err;
  }
}
