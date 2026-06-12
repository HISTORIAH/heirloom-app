import { createContext, useCallback, useContext, type ReactNode } from "react";
import { PostHogProvider } from "@posthog/react";
import {
  initializeAnalytics,
  posthogClient,
  trackAnalyticsEvent,
  trackAnalyticsPageView,
} from "@/lib/analytics";
import type {
  AnalyticsContextValue,
  AnalyticsEvent,
  AnalyticsProperties,
} from "@/types";

const analyticsEnabled = initializeAnalytics();

const AnalyticsContext = createContext<AnalyticsContextValue>({
  enabled: false,
  track: () => undefined,
  trackPageView: () => undefined,
});

export const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
  const track = useCallback(
    (event: AnalyticsEvent, properties?: AnalyticsProperties) => {
      trackAnalyticsEvent(event, properties);
    },
    [],
  );

  const trackPageView = useCallback((path: string) => {
    trackAnalyticsPageView(path);
  }, []);

  const content = (
    <AnalyticsContext.Provider
      value={{ enabled: analyticsEnabled, track, trackPageView }}
    >
      {children}
    </AnalyticsContext.Provider>
  );

  if (!analyticsEnabled) return content;

  return <PostHogProvider client={posthogClient}>{content}</PostHogProvider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAnalytics = () => useContext(AnalyticsContext);
