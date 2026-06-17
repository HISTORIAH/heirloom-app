export type VaultTokenHolding = {
  mint: string;
  ata: string;
  rawAmount: bigint;
  decimals: number;
  tokenProgram: string;
};

export type SplTokenAsset = {
  mint: string;
  label: string;
  name?: string;
  symbol?: string;
  image?: string;
  decimals: number;
  uiAmount: number;
  amount: bigint;
  tokenProgram: string;
};

export type AnalyticsEvent =
  | "launch_app_clicked"
  | "demo_opened"
  | "hero_heartbeat_demo"
  | "docs_link_clicked"
  | "tour_started"
  | "tour_completed"
  | "tour_skipped"
  | "wallet_connect_attempted"
  | "wallet_connected"
  | "wallet_connect_failed"
  | "vault_creation_started"
  | "vault_created"
  | "vault_creation_failed"
  | "heartbeat_succeeded"
  | "heartbeat_failed"
  | "claim_succeeded"
  | "claim_failed"
  | "defer_succeeded"
  | "defer_failed"
  | "vault_top_up_succeeded"
  | "vault_top_up_failed"
  | "asset_added"
  | "asset_add_failed"
  | "heir_reassigned"
  | "heir_reassign_failed"
  | "emergency_withdraw_succeeded"
  | "emergency_withdraw_failed";

export type AnalyticsProperties = Record<string, boolean | number | string>;

export type AnalyticsContextValue = {
  enabled: boolean;
  track: (event: AnalyticsEvent, properties?: AnalyticsProperties) => void;
  trackPageView: (path: string) => void;
};
