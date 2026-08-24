import { useTranslation } from "@heirloom/i18n";

/**
 * Bounds and date formatting for the estate timeline. Separate from the
 * component file so fast refresh keeps working — a module that exports both
 * components and plain values loses its refresh boundary.
 */

export const HB_MIN_DAYS = 30;
export const HB_MAX_DAYS = 365;
export const GRACE_MIN_DAYS = 7;
export const GRACE_MAX_DAYS = 90;

/** The rule is drawn against a fixed span so one handle never rescales the other. */
export const HORIZON_DAYS = HB_MAX_DAYS + GRACE_MAX_DAYS;

export const clampDays = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const horizonPct = (days: number) => `${(days / HORIZON_DAYS) * 100}%`;

export const useEstateDates = () => {
  const { i18n } = useTranslation("app");
  const at = (days: number) => new Date(Date.now() + days * 864e5);
  return {
    long: (days: number) =>
      at(days).toLocaleDateString(i18n.language, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    short: (days: number) =>
      at(days).toLocaleDateString(i18n.language, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
  };
};
