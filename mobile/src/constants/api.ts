/** Backend estate names are fresh enough for this long. */
export const ESTATE_METADATA_STALE_MS = 30_000;

/**
 * Default freshness for every query. Coming back to a screen inside this window reuses the cache
 * instead of refetching; pull-to-refresh and transactions still force a fetch.
 */
export const QUERY_STALE_MS = 30_000;
