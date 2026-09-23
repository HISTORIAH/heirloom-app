import type appEn from "./locales/app/en";
import type landingEn from "./locales/landing/en";
import type stocksEn from "./locales/stocks/en";

type DeepStringify<T> = T extends string ? string : { [K in keyof T]: DeepStringify<T[K]> };

/* English is the source of truth. */
export type AppMessages = DeepStringify<typeof appEn>;

/* Landing copy is its own namespace: the marketing page is a separate Astro
   package and has no reason to carry the app's dashboard and wizard strings. */
export type LandingMessages = DeepStringify<typeof landingEn>;

/* The same holds for the stocks workspace at stocks.heirlm.xyz. */
export type StocksMessages = DeepStringify<typeof stocksEn>;
