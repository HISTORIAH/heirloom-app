import landingEn from "./locales/landing/en";
import landingEs from "./locales/landing/es";
import landingZhCN from "./locales/landing/zh-CN";
import landingZhTW from "./locales/landing/zh-TW";
import landingKo from "./locales/landing/ko";
import landingJa from "./locales/landing/ja";
import landingPt from "./locales/landing/pt";
import landingVi from "./locales/landing/vi";
import landingTr from "./locales/landing/tr";

import commonEn from "./locales/common/en";
import commonEs from "./locales/common/es";
import commonZhCN from "./locales/common/zh-CN";
import commonZhTW from "./locales/common/zh-TW";
import commonKo from "./locales/common/ko";
import commonJa from "./locales/common/ja";
import commonPt from "./locales/common/pt";
import commonVi from "./locales/common/vi";
import commonTr from "./locales/common/tr";

import { DEFAULT_LANGUAGE, LANGUAGES, SUPPORTED_LOCALES } from "./languages";
import type { LandingMessages } from "./messages";

/**
 * The landing is a static Astro build with no React and no i18next: every
 * locale is prerendered to its own document, so translation is a build-time
 * lookup rather than a runtime one. These helpers are deliberately
 * framework-agnostic — the app keeps using the i18next entry points next door.
 */

export const landingMessages: Record<string, LandingMessages> = {
  en: landingEn,
  es: landingEs,
  "zh-CN": landingZhCN,
  "zh-TW": landingZhTW,
  ko: landingKo,
  ja: landingJa,
  pt: landingPt,
  vi: landingVi,
  tr: landingTr,
};

const commonMessages: Record<string, { language: string }> = {
  en: commonEn,
  es: commonEs,
  "zh-CN": commonZhCN,
  "zh-TW": commonZhTW,
  ko: commonKo,
  ja: commonJa,
  pt: commonPt,
  vi: commonVi,
  tr: commonTr,
};

/**
 * URL segment for a locale. English is served unprefixed at the root; the rest
 * sit under a lowercased BCP-47 code, so `zh-CN` is reachable at `/zh-cn/`.
 * Lowercase because paths are compared case-sensitively by most crawlers and a
 * mixed-case path invites duplicate URLs for one document.
 */
export function localePath(code: string): string {
  return code.toLowerCase();
}

/** The locale a path segment stands for, or undefined if it is not one. */
export function localeFromPath(segment: string): string | undefined {
  const lower = segment.toLowerCase();
  return SUPPORTED_LOCALES.find((code) => code.toLowerCase() === lower);
}

/** Every locale that gets its own prefixed route — i.e. all but the default. */
export const PREFIXED_LOCALES = SUPPORTED_LOCALES.filter((c) => c !== DEFAULT_LANGUAGE);

/** Site-root-relative href for a locale's landing page. */
export function localeHref(code: string): string {
  return code === DEFAULT_LANGUAGE ? "/" : `/${localePath(code)}/`;
}

type Dict = Record<string, unknown>;

function lookup(source: Dict, key: string): string | undefined {
  let node: unknown = source;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Dict)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export type LandingT = (key: string) => string;

/**
 * Translator for one locale, falling back to English key by key rather than
 * file by file — a locale that is only partly translated still renders every
 * string it does have. Missing on both sides returns the key, which is loud
 * enough to catch in review and harmless in production.
 */
export function createLandingT(code: string): LandingT {
  const primary = (landingMessages[code] ?? landingMessages[DEFAULT_LANGUAGE]) as unknown as Dict;
  const fallback = landingMessages[DEFAULT_LANGUAGE] as unknown as Dict;
  return (key: string) => lookup(primary, key) ?? lookup(fallback, key) ?? key;
}

/** The one shared string the landing needs outside its own namespace. */
export function languageLabel(code: string): string {
  return (commonMessages[code] ?? commonMessages[DEFAULT_LANGUAGE]!).language;
}

export { LANGUAGES, DEFAULT_LANGUAGE, SUPPORTED_LOCALES };
export type { LandingMessages };
