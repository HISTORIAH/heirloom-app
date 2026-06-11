import { createContext, useCallback, useContext, type ReactNode } from "react";
import { PostHogProvider, usePostHog } from "@posthog/react";
import posthog from "posthog-js";

export type AnalyticsEvent =
  | "launch_app_clicked"
  | "demo_opened"
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

type AnalyticsProperties = Record<string, boolean | number | string>;

interface AnalyticsContextValue {
  enabled: boolean;
  track: (event: AnalyticsEvent, properties?: AnalyticsProperties) => void;
  trackPageView: (path: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue>({
  enabled: false,
  track: () => undefined,
  trackPageView: () => undefined,
});

const projectToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();
const apiHost = import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

if (projectToken) {
  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: "2026-01-30",
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
    mask_all_text: true,
    autocapture: {
      dom_event_allowlist: ["click"],
      element_allowlist: ["a", "button"],
      capture_copied_text: false,
    },
    disable_session_recording: true,
  });
}

const AnalyticsBridge = ({ children }: { children: ReactNode }) => {
  const client = usePostHog();

  const track = useCallback(
    (event: AnalyticsEvent, properties?: AnalyticsProperties) => {
      client?.capture(event, properties);
    },
    [client],
  );

  const trackPageView = useCallback(
    (path: string) => {
      client?.capture("$pageview", {
        $current_url: `${window.location.origin}${path}`,
        $pathname: path,
      });
    },
    [client],
  );

  return (
    <AnalyticsContext.Provider value={{ enabled: Boolean(client), track, trackPageView }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
  if (!projectToken) {
    return (
      <AnalyticsContext.Provider
        value={{
          enabled: false,
          track: () => undefined,
          trackPageView: () => undefined,
        }}
      >
        {children}
      </AnalyticsContext.Provider>
    );
  }

  return (
    <PostHogProvider client={posthog}>
      <AnalyticsBridge>{children}</AnalyticsBridge>
    </PostHogProvider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAnalytics = () => useContext(AnalyticsContext);
