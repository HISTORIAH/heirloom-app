export interface Language {
  /** BCP-47 locale code used by i18next */
  code: string;
  short: string;
  name: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", short: "En", name: "English" },
  { code: "zh-CN", short: "简", name: "简体中文" },
  { code: "zh-TW", short: "繁", name: "繁體中文" },
  { code: "ko", short: "Ko", name: "한국어" },
  { code: "ja", short: "Ja", name: "日本語" },
  { code: "es", short: "Es", name: "Español" },
  { code: "pt", short: "Pt", name: "Português" },
  { code: "vi", short: "Vi", name: "Tiếng Việt" },
  { code: "tr", short: "Tr", name: "Türkçe" },
];

export const DEFAULT_LANGUAGE = "en";

export const SUPPORTED_LOCALES = LANGUAGES.map((l) => l.code);

export const DEFAULT_LANG: Language = LANGUAGES[0]!;

export function findLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? DEFAULT_LANG;
}

export function shortFor(code: string): string {
  return findLanguage(code).short;
}

/** The locale if it is one we serve, otherwise undefined. */
export function supportedLocale(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const lower = code.toLowerCase();
  return SUPPORTED_LOCALES.find((c) => c.toLowerCase() === lower);
}

/* ------------------------------------------------------------------ routing
   The landing (heirlm.xyz) and the app (app.heirlm.xyz) are separate origins,
   so nothing about a visitor's language crosses between them on its own: the
   landing encodes it in the path, the app keeps it in localStorage, and
   neither can read the other's. These helpers are the contract that carries it
   over the boundary — a path prefix going one way, a `?lang=` query going the
   other. They live here, next to the language list, because both packages
   need them and neither should own them.                                    */

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
  return supportedLocale(segment);
}

/** Every locale that gets its own prefixed route — i.e. all but the default. */
export const PREFIXED_LOCALES = SUPPORTED_LOCALES.filter((c) => c !== DEFAULT_LANGUAGE);

/** Site-root-relative href for a locale's landing page. */
export function localeHref(code: string): string {
  return code === DEFAULT_LANGUAGE ? "/" : `/${localePath(code)}/`;
}

/**
 * The query parameter the landing hands the app its language in. The app reads
 * it once on boot, stores it, and strips it from the URL — see
 * `takeLocaleFromUrl`.
 */
export const LOCALE_PARAM = "lang";

/**
 * An app URL carrying the locale the visitor was reading in. English is left
 * bare: it is the app's own fallback, so the parameter would say nothing.
 */
export function appHref(appUrl: string, path: string, code: string): string {
  const base = `${appUrl}${path}`;
  if (code === DEFAULT_LANGUAGE || !supportedLocale(code)) return base;
  return `${base}${base.includes("?") ? "&" : "?"}${LOCALE_PARAM}=${encodeURIComponent(code)}`;
}

/**
 * Reads `?lang=` off the current URL and removes it, returning the locale if it
 * is one we serve. Stripping keeps a reload, a bookmark or a shared link from
 * pinning the language forever — the hand-off sets it once, the app's own
 * switcher owns it from then on. Every other parameter is preserved, `?tour=1`
 * included.
 */
export function takeLocaleFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const url = new URL(window.location.href);
  const raw = url.searchParams.get(LOCALE_PARAM);
  if (raw === null) return undefined;

  url.searchParams.delete(LOCALE_PARAM);
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);

  return supportedLocale(raw);
}
