import { address } from "@solana/kit";

export const TREASURY_ADDRESS = address("tr31o8FF9v2rEukh84ZwjRQgYa3x74PHssighePMP1Q");

/**
 * The only key allowed to curate the issuer registry, mirroring the program's
 * `ADMIN`. Currently the same key as the treasury.
 */
export const ADMIN_ADDRESS = address("tr31o8FF9v2rEukh84ZwjRQgYa3x74PHssighePMP1Q");

/** Plan mode discriminator, also the trailing byte of the plan PDA seeds. */
export const PLAN_MODE_BACKUP = 0;
export const PLAN_MODE_VAULT = 1;

/** Fee taken on a destination-triggered recovery, in basis points. */
export const RECOVERY_FEE_BPS = 75;
/** Fee taken when an owner withdraws out of a vault, in basis points. */
export const EXIT_FEE_BPS = 50;

/** Longest permitted check-in interval or grace period (365 days). */
export const MAX_INTERVAL_SECONDS = 31_536_000;

export const BPS_DENOMINATOR = 10_000;

/**
 * Mint authorities of the tokenized-equity issuers we curate. An
 * `IssuerRegistry` is keyed by these, so covering an asset requires its mint
 * authority to appear here.
 */
export const ISSUER_MINT_AUTHORITIES = {
  xstocks: address("7pt9tkctJPK7PPNQJ77GKg8ZffSF6QxoMiCFYHxrtaCj"),
  ondo: address("9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD"),
  remora: address("DQSTm2WtpKBdpKx9t2cYL9Ja8fe7v4yEVEtA7NnSsdqb"),
} as const;

export type IssuerKey = keyof typeof ISSUER_MINT_AUTHORITIES;
