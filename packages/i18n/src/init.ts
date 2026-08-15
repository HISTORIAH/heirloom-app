import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, SUPPORTED_LOCALES } from "./languages";
import { resources } from "./resources";

export const STORAGE_KEY = "heirloom.locale";

export function getInitialLocale(): string {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

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