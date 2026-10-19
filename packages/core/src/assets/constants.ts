/** Most assets one getAssetsByOwner page returns (the DAS maximum). */
export const DAS_PAGE_SIZE = 1000;
/** Most mints one getAssetBatch call takes (the DAS maximum). */
export const DAS_BATCH_SIZE = 1000;
/**
 * Pages read before giving up: 50,000 assets. Paging stops at the first short page; this only
 * guards against an endpoint that keeps returning full pages forever.
 */
export const DAS_MAX_PAGES = 50;
