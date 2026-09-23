import stocksEn from "./locales/stocks/en";
import { getI18n } from "./I18nProvider";
import type { StocksMessages } from "./messages";

export const STOCKS_NAMESPACE = "stocks";

/**
 * Adds the stocks namespace to the shared i18next instance.
 *
 * It is registered from here rather than listed in `resources`, so the app
 * bundle never carries stocks copy — the same reason the landing has an entry
 * point of its own. Call it once, before the first render.
 *
 * English only for now. i18next falls back to `en` key by key, so every other
 * locale renders the English copy until its translation lands.
 */
export function registerStocksMessages(): void {
  const i18n = getI18n();
  if (!i18n.hasResourceBundle("en", STOCKS_NAMESPACE)) {
    i18n.addResourceBundle("en", STOCKS_NAMESPACE, stocksEn);
  }
}

export type { StocksMessages };
