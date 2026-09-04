import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, SUPPORTED_LOCALES, takeLocaleFromUrl } from "./languages";
import { resources } from "./resources";

export const STORAGE_KEY = "heirloom.locale";

/**
 * Resolution order: the locale the landing handed over, then the one the
 * visitor last chose here, then the browser's.
 *
 * The hand-off comes first and is written straight through to storage. The
 * landing is a separate origin, so a visitor reading `/ja/` and clicking
 * through would otherwise arrive at an English app with no way for either side
 * to know better; `?lang=ja` on the link is what carries the choice across.
 * `takeLocaleFromUrl` strips the parameter as it reads it, so it decides the
 * language once rather than pinning it on every later reload.
 */
export function getInitialLocale(): string {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  const handedOver = takeLocaleFromUrl();
  if (handedOver) {
    persistLocale(handedOver);
    return handedOver;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;

  const nav = window.navigator.language;
  if (SUPPORTED_LOCALES.includes(nav)) return nav;
  const base = nav.split("-")[0];
  const match = SUPPORTED_LOCALES.find((l) => l.split("-")[0] === base);
  return match ?? DEFAULT_LANGUAGE;
}

export function persistLocale(code: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, code);
}

export function createI18n() {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    resources,
    lng: getInitialLocale(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LOCALES,
    load: "currentOnly",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}