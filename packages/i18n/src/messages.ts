import type appEn from "./locales/app/en";

type DeepStringify<T> = T extends string ? string : { [K in keyof T]: DeepStringify<T[K]> };

/* English is the source of truth. */
export type AppMessages = DeepStringify<typeof appEn>;
