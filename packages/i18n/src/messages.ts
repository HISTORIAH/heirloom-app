import type appEn from "./locales/app/en";
import type landingEn from "./locales/landing/en";

type DeepStringify<T> = T extends string ? string : { [K in keyof T]: DeepStringify<T[K]> };

/* English is the source of truth. */
export type AppMessages = DeepStringify<typeof appEn>;

/* Landing copy is its own namespace: the marketing page is a separate Astro
   package and has no reason to carry the app's dashboard and wizard strings. */
export type LandingMessages = DeepStringify<typeof landingEn>;
