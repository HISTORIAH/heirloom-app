export const SOLANA_RPC_ENDPOINT =
  import.meta.env.VITE_SOLANA_RPC_ENDPOINT || "http://127.0.0.1:8899";

export const SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT =
  import.meta.env.VITE_SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT || "ws://127.0.0.1:8900";

export const POSTHOG_PROJECT_TOKEN =
  import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim() || "";

export const ANALYTICS_ENABLED =
  import.meta.env.VITE_ANALYTICS_ENABLED?.trim().toLowerCase() === "true";
