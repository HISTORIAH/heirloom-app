import posthog from "posthog-js";
import { ANALYTICS_ENABLED, POSTHOG_PROJECT_TOKEN } from "@/config";
import { POSTHOG_HOST } from "@/lib/constants";
import type { AnalyticsEvent, AnalyticsProperties } from "@/types";

let initialized = false;

export const initializeAnalytics = (): boolean => {
  if (!ANALYTICS_ENABLED || !POSTHOG_PROJECT_TOKEN) return false;
  if (initialized) return true;

  posthog.init(POSTHOG_PROJECT_TOKEN, {
    api_host: POSTHOG_HOST,
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

  initialized = true;
  return true;
};

export const trackAnalyticsEvent = (
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
) => {
  if (!initialized) return;
  posthog.capture(event, properties);
};

export const trackAnalyticsPageView = (path: string) => {
  if (!initialized) return;
  posthog.capture("$pageview", {
    $current_url: `${window.location.origin}${path}`,
    $pathname: path,
  });
};

export const posthogClient = posthog;
