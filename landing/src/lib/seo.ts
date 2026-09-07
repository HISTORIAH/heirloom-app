import type { LandingT } from "@heirloom/i18n/landing";
import { SITE_URL, DOCS_URL, GITHUB_URL, TWITTER_URL, OG_IMAGE } from "./site";

/** og:locale wants a territory, which BCP-47 language codes do not carry. */
export const OG_LOCALES: Record<string, string> = {
  en: "en_US",
  es: "es_ES",
  pt: "pt_BR",
  ja: "ja_JP",
  ko: "ko_KR",
  vi: "vi_VN",
  tr: "tr_TR",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
};

/**
 * The site's structured data, built from the same locale files the page is
 * rendered from. It used to be hand-maintained JSON in index.html and had
 * already drifted from the FAQ it described — generating it is the only way
 * the two stay in step.
 *
 * Organization, WebSite and SoftwareApplication keep a stable @id across
 * locales so crawlers see one entity. Their copy is still per-document, from
 * the same locale files as the page.
 */
export function structuredData(t: LandingT, canonical: string) {
  const faqs = Array.from({ length: 11 }, (_, i) => ({
    "@type": "Question",
    name: t(`faq.q${i + 1}`),
    acceptedAnswer: {
      "@type": "Answer",
      text: t(i === 0 ? "faq.a1r" : `faq.a${i + 1}`),
    },
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Heirloom",
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/favicon.png`,
        description: t("seo.orgDescription"),
        sameAs: [TWITTER_URL, GITHUB_URL, DOCS_URL],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: "Heirloom",
        description: t("seo.websiteDescription"),
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: "Heirloom",
        url: `${SITE_URL}/`,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web, Solana",
        description: t("seo.appDescription"),
        keywords: t("seo.appKeywords"),
        publisher: { "@id": `${SITE_URL}/#organization` },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: t("seo.offerDescription"),
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${canonical}#faq`,
        mainEntity: faqs,
      },
    ],
  };
}

export { OG_IMAGE };
