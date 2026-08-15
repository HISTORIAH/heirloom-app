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