// TODO: Uncomment when backend is ready (unused while the calls below are stubbed)
// import { BACKEND_URL } from "@/config";
// import { request } from "@/lib/api";
//
// const API_BASE = `${BACKEND_URL}/v1/estates`;
import type { EstateMetadata, EstateResponse } from "@/types/estate";

// ---------------------------------------------------------------------------
// API stubs — TODO: Implement backend endpoints
// ---------------------------------------------------------------------------

/**
 * Register estate metadata after on-chain creation.
 * Called after the estate creation transaction is confirmed.
 *
 * TODO(backend): Implement POST /v1/estates/register
 * - Verify tx signature
 * - Extract memo instruction (name/description)
 * - Store in database
 */
export async function registerEstateMetadata(
  txSignature: string,
  metadata: EstateMetadata,
): Promise<EstateResponse> {
  // FIXME: Stub implementation — replace with actual API call
  console.warn("[estateMetadata] registerEstateMetadata: Stub implementation", {
    txSignature,
    metadata,
  });

  // TODO: Uncomment when backend is ready
  // return request<EstateResponse>(`${API_BASE}/register`, {
  //   method: "POST",
  //   body: JSON.stringify({ txSignature, ...metadata }),
  // });

  throw new Error("registerEstateMetadata: Not implemented — backend endpoint needed");
}

/**
 * Fetch metadata for a single estate.
 *
 * TODO(backend): Implement GET /v1/estates/:estatePda/metadata
 */
export async function fetchEstateMetadata(estatePda: string): Promise<EstateResponse | null> {
  // FIXME: Stub implementation — replace with actual API call
  console.warn("[estateMetadata] fetchEstateMetadata: Stub implementation", { estatePda });

  // TODO: Uncomment when backend is ready
  // return request<EstateResponse>(`${API_BASE}/${estatePda}/metadata`);

  return null; // No metadata until the backend exists
}

/**
 * Fetch metadata for multiple estates (batch).
 *
 * TODO(backend): Implement GET /v1/estates/metadata?estatePdas=...
 */
export async function fetchEstatesMetadata(
  estatePdas: string[],
): Promise<Record<string, EstateResponse>> {
  // FIXME: Stub implementation — replace with actual API call
  console.warn("[estateMetadata] fetchEstatesMetadata: Stub implementation", { estatePdas });

  // TODO: Uncomment when backend is ready
  // const params = new URLSearchParams({ estatePdas: estatePdas.join(",") });
  // return request<Record<string, EstateResponse>>(`${API_BASE}/metadata?${params}`);

  return {}; // No metadata until the backend exists
}

/**
 * Update estate metadata (name/description).
 * Requires SIWS authentication (cookie-based session).
 *
 * TODO(backend): Implement POST /v1/estates/:estatePda/metadata
 * - Verify SIWS session cookie
 * - Verify caller is the estate authority
 * - Update metadata in database
 */
export async function updateEstateMetadata(
  estatePda: string,
  metadata: EstateMetadata,
): Promise<EstateResponse> {
  // FIXME: Stub implementation — replace with actual API call
  console.warn("[estateMetadata] updateEstateMetadata: Stub implementation", {
    estatePda,
    metadata,
  });

  // TODO: Uncomment when backend is ready
  // return request<EstateResponse>(`${API_BASE}/${estatePda}/metadata`, {
  //   method: "POST",
  //   body: JSON.stringify(metadata),
  // });

  throw new Error("updateEstateMetadata: Not implemented — backend endpoint needed");
}
