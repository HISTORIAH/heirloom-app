/**
 * PostHog, loaded only when it is configured and only in the browser. The
 * import is dynamic so a landing without analytics ships none of it — which is
 * most of the point of prerendering this page in the first place.
 *
 * `window.heirloomTrack` is the one entry point the page's islands use, and it
 * is safe to call before (or without) PostHog ever loading.
 */
const TOKEN = import.meta.env.PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() ?? "";
const ENABLED = import.meta.env.PUBLIC_ANALYTICS_ENABLED?.trim().toLowerCase() === "true";
const HOST = import.meta.env.PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

type Props = Record<string, unknown>;

declare global {
  interface Window {
    heirloomTrack?: (event: string, properties?: Props) => void;
  }
}

export function initAnalytics() {
  if (!ENABLED || !TOKEN) {
    window.heirloomTrack = () => undefined;
    return;
  }

  const queue: [string, Props | undefined][] = [];
  window.heirloomTrack = (event, properties) => queue.push([event, properties]);

  void import("posthog-js").then(({ default: posthog }) => {
    posthog.init(TOKEN, {
      api_host: HOST,
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

    window.heirloomTrack = (event, properties) => posthog.capture(event, properties);
    posthog.capture("$pageview", {
      $current_url: window.location.href,
      $pathname: window.location.pathname,
    });
    queue.forEach(([event, properties]) => posthog.capture(event, properties));
  });
}

/**
 * Anything carrying `data-track` reports a click under that name — the landing
 * has no state to describe beyond which hand-off was taken, so one delegated
 * listener replaces the per-component callbacks the React page had.
 */
export function bindTrackedClicks() {
  document.addEventListener("click", (e) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>("[data-track]");
    if (el?.dataset.track) window.heirloomTrack?.(el.dataset.track);
  });
}
