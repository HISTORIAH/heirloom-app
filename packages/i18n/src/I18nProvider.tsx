import { I18nextProvider } from "react-i18next";
import type { ReactNode } from "react";
import { createI18n } from "./init";

let instance: ReturnType<typeof createI18n> | undefined;

export function I18nProvider({ children }: { children: ReactNode }) {
  const i18n = (instance ??= createI18n());
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}