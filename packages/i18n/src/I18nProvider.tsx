import { I18nextProvider, useTranslation } from "react-i18next";
import { useEffect, type ReactNode } from "react";
import { createI18n } from "./init";

let instance: ReturnType<typeof createI18n> | undefined;

export function getI18n() {
  return (instance ??= createI18n());
}

function DocumentLang() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const i18n = getI18n();
  return (
    <I18nextProvider i18n={i18n}>
      <DocumentLang />
      {children}
    </I18nextProvider>
  );
}
