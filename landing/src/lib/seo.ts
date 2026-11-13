import type { LandingT } from "@heirloom/i18n/landing";
import { SITE_URL, GITHUB_URL, TWITTER_URL, OG_IMAGE, CONTACT_EMAIL } from "./site";

/** The document a set of structured data describes. */
type PageInfo = {
  /** BCP-47 code, as in <html lang>. */
  locale: string;
  title: string;
  description: string;
};

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
 * the same locale files as the page. The WebPage node is the one thing that is
 * per-locale by identity: it says which language this document is in and ties
 * it to the entities above.
 */
export function structuredData(t: LandingT, canonical: string, page: PageInfo) {
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
        alternateName: "heirlm",
        url: `${SITE_URL}/`,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/favicon.png`,
          width: 512,
          height: 512,
        },
        description: t("seo.orgDescription"),
        email: CONTACT_EMAIL,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: CONTACT_EMAIL,
          url: TWITTER_URL,
        },
        // External profiles of this same entity only. The docs used to be
        // listed here, but they are this site, not a profile of it. Add the
        // YouTube channel, LinkedIn and the dApp Store listing once their URLs
        // are settled.
        sameAs: [TWITTER_URL, GITHUB_URL],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        // "Heirloom" alone is shared with plenty of other things, and the
        // domain's spelling is what people type: it is the top query in
        // Search Console. alternateName ties both to this site. Google picks the
        // site name shown in results from this node, so the domain is here too.
        name: "Heirloom",
        alternateName: ["heirlm", "heirlm.xyz"],
        description: t("seo.websiteDescription"),
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: "Heirloom",
        url: `${SITE_URL}/`,
        applicationCategory: "FinanceApplication",
        // Where it runs, not the chain it runs on: the web app and the Android
        // app. Solana is in the description and keywords.
        operatingSystem: "Web, Android",
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
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: page.title,
        description: page.description,
        inLanguage: page.locale,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#app` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        primaryImageOfPage: { "@type": "ImageObject", url: OG_IMAGE },
      },
      {
        // Google shows FAQ rich results only for government and health sites,
        // so this earns no visual result. Bing and AI answer engines still use
        // it, and it can't drift from the page because both come from the
        // same locale keys.
        "@type": "FAQPage",
        "@id": `${canonical}#faq`,
        mainEntity: faqs,
      },
    ],
  };
}

export { OG_IMAGE };
